"""File upload and management API endpoints."""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
import os
from pathlib import Path
from typing import List, Dict, Any

from config import settings
from presentation.api.auth_router import require_admin, require_authenticated
from infrastructure.models import UserModel
from infrastructure.database import get_db
from sqlalchemy.orm import Session
from services.file_service import FileService
from utils.file_utils import (
    extract_original_filename, 
    is_allowed_file,
    find_file_by_name,
    ensure_upload_directories
)
from utils.image_utils import (
    is_image_file,
    create_thumbnails,
    cleanup_thumbnails
)

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def list_files(
    current_user: UserModel = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """Get list of uploaded files from database."""
    file_service = FileService(db)
    
    try:
        files = file_service.get_files_for_user(current_user)
        file_list = []
        
        for file in files:
            file_info = FileService.create_file_info_dict(file)
            file_list.append(file_info)
        
        # UTC時刻でソート（タイムゾーンの問題を回避）
        from datetime import datetime
        
        def parse_datetime(dt_str):
            try:
                return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
            except:
                return datetime.min
        
        return sorted(file_list, key=lambda x: (parse_datetime(x["created_at"]), x["id"]), reverse=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")


def _create_file_info(file_path: Path, uploader_name: str) -> Dict[str, Any]:
    """Create file information dictionary."""
    stat = file_path.stat()
    filename = file_path.name
    original_filename = extract_original_filename(filename)
    
    return {
        "id": hash(filename) % 10000,
        "filename": filename,
        "original_filename": original_filename,
        "file_size": stat.st_size,
        "mime_type": _get_mime_type(file_path),
        "url": f"/uploads/{filename}",
        "created_at": "2025-08-25T12:00:00",
        "uploader": uploader_name
    }



@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """Upload a general image file."""
    return await _upload_file(file, current_user, db, file_type="files")


@router.post("/upload/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """Upload an avatar image file."""
    file_service = FileService(db)
    
    # Validate file
    _validate_file(file)
    
    # Ensure upload directories exist
    ensure_upload_directories(settings.UPLOAD_DIR)
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Check file size
    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File size too large. Maximum: {settings.MAX_FILE_SIZE / (1024 * 1024):.1f}MB"
        )
    
    # Generate unique filename for avatar
    unique_filename = FileService.generate_unique_filename(file.filename)
    file_path = settings.UPLOAD_DIR / "avatars" / unique_filename
    
    try:
        # Ensure parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Generate thumbnails for avatar
        thumbnails_generated = []
        if is_image_file(file.filename):
            try:
                thumbnails = create_thumbnails(file_path, file_path.parent)
                thumbnails_generated = list(thumbnails.values())
            except Exception as e:
                print(f"Failed to generate thumbnails for avatar {unique_filename}: {str(e)}")
        
        # Remove old avatar file and thumbnails if exists
        existing_avatar = file_service.get_user_avatar(current_user.id)
        if existing_avatar:
            old_file_path = settings.UPLOAD_DIR / "avatars" / existing_avatar.filename
            if old_file_path.exists():
                old_file_path.unlink()
            # Remove old thumbnails
            cleanup_thumbnails(existing_avatar.filename, settings.UPLOAD_DIR / "avatars")
        
        # Save avatar info to database
        mime_type = FileService.get_mime_type(file_path)
        avatar_record = file_service.save_avatar(
            user_id=current_user.id,
            filename=unique_filename,
            original_filename=file.filename,
            file_size=file_size,
            mime_type=mime_type
        )
        
        return {
            "filename": unique_filename,
            "original_filename": file.filename,
            "url": f"/uploads/avatars/{unique_filename}",
            "size": file_size
        }
    
    except Exception as e:
        db.rollback()
        # Remove file if it was saved
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload avatar: {str(e)}"
        )


@router.get("/avatar/{user_id}")
async def get_user_avatar(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get user's avatar information (public access)."""
    file_service = FileService(db)
    
    avatar = file_service.get_user_avatar(user_id)
    
    if not avatar:
        return {"avatar_url": None}
    
    return {
        "avatar_url": f"/uploads/avatars/{avatar.filename}",
        "original_filename": avatar.original_filename,
        "file_size": avatar.file_size,
        "updated_at": avatar.updated_at.isoformat()
    }


@router.delete("/avatar")
async def delete_avatar(
    current_user: UserModel = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """Delete user's avatar."""
    file_service = FileService(db)
    
    try:
        # 現在のアバターを取得
        avatar = file_service.get_user_avatar(current_user.id)
        
        if not avatar:
            raise HTTPException(
                status_code=404,
                detail="Avatar not found"
            )
        
        # ファイルシステムからファイルを削除
        avatar_path = settings.UPLOAD_DIR / "avatars" / avatar.filename
        if avatar_path.exists():
            avatar_path.unlink()
        
        # サムネイルも削除
        cleanup_thumbnails(avatar.filename, settings.UPLOAD_DIR / "avatars")
        
        # データベースから削除（論理削除）
        from datetime import datetime, timezone
        avatar.deleted_at = datetime.now(timezone.utc)
        db.commit()
        
        return {"message": "Avatar deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete avatar: {str(e)}"
        )


async def _upload_file(
    file: UploadFile,
    current_user: UserModel,
    db: Session,
    file_type: str = "files"
):
    """Common file upload logic."""
    file_service = FileService(db)
    
    # Validate file
    _validate_file(file)
    
    # Ensure upload directories exist
    ensure_upload_directories(settings.UPLOAD_DIR)
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Check file size
    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size too large. Maximum: {settings.MAX_FILE_SIZE / (1024 * 1024):.1f}MB"
        )
    
    # Generate unique filename
    unique_filename = FileService.generate_unique_filename(file.filename)
    file_path = settings.UPLOAD_DIR / "files" / unique_filename
    
    try:
        # Ensure parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Generate thumbnails for image files
        thumbnails_generated = []
        if is_image_file(file.filename):
            try:
                thumbnails = create_thumbnails(file_path, file_path.parent)
                thumbnails_generated = list(thumbnails.values())
            except Exception as e:
                # サムネイル生成失敗時はログに記録するが処理は継続
                print(f"Failed to generate thumbnails for {unique_filename}: {str(e)}")
        
        # Save file info to database
        mime_type = FileService.get_mime_type(file_path)
        file_record = file_service.save_file(
            filename=unique_filename,
            original_filename=file.filename,
            file_size=file_size,
            mime_type=mime_type,
            uploaded_by=current_user.id
        )
        
        return {
            "filename": unique_filename,
            "original_filename": file.filename,
            "url": f"/uploads/files/{unique_filename}",
            "size": file_size
        }
    
    except Exception as e:
        # Clean up on failure
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to save file: {str(e)}"
        )


def _validate_file(file: UploadFile) -> None:
    """Validate uploaded file."""
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file provided"
        )
    
    if not is_allowed_file(file.filename, settings.ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )

@router.get("/{filename:path}")
async def get_image(filename: str):
    """Get uploaded image file."""
    if ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = find_file_by_name(settings.UPLOAD_DIR, filename)
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

@router.delete("/id/{file_id}")
async def delete_file_by_id(
    file_id: int,
    current_user: UserModel = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """Delete uploaded file by ID (secure method)."""
    file_service = FileService(db)
    
    try:
        file_record = file_service.get_file_by_id(file_id)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found in database")
        
        # Delete from filesystem if exists (ignore if not found)
        file_path = find_file_by_name(settings.UPLOAD_DIR, file_record.filename)
        if file_path:
            try:
                os.remove(file_path)
                # Delete thumbnails if it's an image file
                if is_image_file(file_record.filename):
                    cleanup_thumbnails(file_record.filename, Path(file_path).parent)
            except FileNotFoundError:
                pass  # File already deleted, continue with database deletion
        
        # Delete from database (logical delete)
        result = file_service.delete_file(file_id, current_user)
        
        if result:
            return {"message": "File deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
            
    except ValueError as e:
        raise HTTPException(
            status_code=403,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to delete file: {str(e)}"
        )

@router.delete("/{filename}")
async def delete_file_by_name(
    filename: str,
    current_user: UserModel = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """Delete uploaded file by filename (legacy method - deprecated)."""
    file_service = FileService(db)
    
    # セキュリティチェック: パス区切り文字を拒否
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    try:
        file_record = file_service.get_file_by_filename(filename)
        if not file_record:
            raise HTTPException(status_code=404, detail="File not found in database")
        
        # Delete from filesystem if exists (ignore if not found)
        file_path = find_file_by_name(settings.UPLOAD_DIR, filename)
        if file_path:
            try:
                os.remove(file_path)
                # Delete thumbnails if it's an image file
                if is_image_file(filename):
                    cleanup_thumbnails(filename, Path(file_path).parent)
            except FileNotFoundError:
                pass  # File already deleted, continue with database deletion
        
        # Delete from database (logical delete)
        result = file_service.delete_file_by_filename(filename, current_user)
        
        if result:
            return {"message": "File deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
            
    except ValueError as e:
        raise HTTPException(
            status_code=403,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to delete file: {str(e)}"
        )