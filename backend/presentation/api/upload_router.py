"""File upload and management API endpoints."""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
import os
import uuid
from pathlib import Path
from typing import List, Dict, Any

from config import settings
from presentation.api.auth_router import require_admin, require_authenticated
from infrastructure.persistence.models import UserModel, FileModel, AvatarModel
from infrastructure.persistence.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from utils.file_utils import (
    generate_unique_filename,
    generate_unique_filename_with_path,
    extract_original_filename, 
    is_allowed_file,
    find_file_by_name,
    ensure_upload_directories
)

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def list_files(
    current_user: UserModel = Depends(require_authenticated),
    db: Session = Depends(get_db)
):
    """Get list of uploaded files from database."""
    try:
        from infrastructure.persistence.models import UserRole
        
        # 管理者は全ファイル表示、メンバーは自分のファイルのみ表示（アバター画像は別テーブルなので自動除外）
        if current_user.role == UserRole.ADMIN:
            files = db.query(FileModel).filter(FileModel.deleted_at.is_(None)).all()
        else:
            files = db.query(FileModel).filter(
                FileModel.deleted_at.is_(None),
                FileModel.uploaded_by == current_user.id
            ).all()
        file_list = []
        
        for file in files:
            file_info = {
                "id": file.id,
                "filename": file.filename,
                "original_filename": file.original_filename,
                "file_size": file.file_size,
                "mime_type": file.mime_type,
                "url": f"/uploads/files/{file.filename}",
                "created_at": file.created_at.isoformat(),
                "uploader": file.uploader.username if file.uploader else "Unknown"
            }
            file_list.append(file_info)
        
        return sorted(file_list, key=lambda x: x["created_at"], reverse=True)
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


def _get_mime_type(file_path: Path) -> str:
    """Get MIME type based on file extension."""
    extension = file_path.suffix.lower()
    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg", 
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp"
    }
    return mime_types.get(extension, "application/octet-stream")

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
    unique_filename = f"{uuid.uuid4()}{Path(file.filename).suffix}"
    file_path = settings.UPLOAD_DIR / "avatars" / unique_filename
    
    try:
        # Ensure parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Check if user already has an avatar
        existing_avatar = db.query(AvatarModel).filter(
            AvatarModel.user_id == current_user.id,
            AvatarModel.deleted_at.is_(None)
        ).first()
        
        if existing_avatar:
            # Remove old file before updating record
            old_file_path = settings.UPLOAD_DIR / "avatars" / existing_avatar.filename
            if old_file_path.exists():
                old_file_path.unlink()
            
            # Update existing avatar record
            existing_avatar.filename = unique_filename
            existing_avatar.original_filename = file.filename
            existing_avatar.file_size = file_size
            existing_avatar.mime_type = _get_mime_type(file_path)
            existing_avatar.updated_at = func.now()
        else:
            # Create new avatar record
            avatar_record = AvatarModel(
                user_id=current_user.id,
                filename=unique_filename,
                original_filename=file.filename,
                file_size=file_size,
                mime_type=_get_mime_type(file_path)
            )
            db.add(avatar_record)
        
        db.commit()
        
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
    
    avatar = db.query(AvatarModel).filter(
        AvatarModel.user_id == user_id,
        AvatarModel.deleted_at.is_(None)
    ).first()
    
    if not avatar:
        return {"avatar_url": None}
    
    return {
        "avatar_url": f"/uploads/avatars/{avatar.filename}",
        "original_filename": avatar.original_filename,
        "file_size": avatar.file_size,
        "updated_at": avatar.updated_at.isoformat()
    }


async def _upload_file(
    file: UploadFile,
    current_user: UserModel,
    db: Session,
    file_type: str = "files"
):
    """Common file upload logic."""
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
    
    # Generate unique filename (without path)
    unique_filename = f"{uuid.uuid4()}{Path(file.filename).suffix}"
    file_path = settings.UPLOAD_DIR / "files" / unique_filename
    
    try:
        # Ensure parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Save file info to database
        file_record = FileModel(
            filename=unique_filename,  # Store filename only, no path
            original_filename=file.filename,
            file_size=file_size,
            mime_type=_get_mime_type(file_path),
            uploaded_by=current_user.id
        )
        db.add(file_record)
        db.commit()
        
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
    # Find file record in database by ID
    file_record = db.query(FileModel).filter(
        FileModel.id == file_id,
        FileModel.deleted_at.is_(None)
    ).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found in database")
    
    # 権限チェック: 管理者または作成者のみ削除可能
    from infrastructure.persistence.models import UserRole
    if current_user.role != UserRole.ADMIN and file_record.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="このファイルを削除する権限がありません"
        )
    
    file_path = find_file_by_name(settings.UPLOAD_DIR, file_record.filename)
    
    try:
        # Delete from filesystem if exists (ignore if not found)
        if file_path:
            try:
                os.remove(file_path)
            except FileNotFoundError:
                pass  # File already deleted, continue with database deletion
        
        # Delete from database (logical delete)
        from datetime import datetime
        file_record.deleted_at = datetime.utcnow()
        db.commit()
        
        return {"message": "File deleted successfully"}
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
    # セキュリティチェック: パス区切り文字を拒否
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # Find file record in database
    file_record = db.query(FileModel).filter(
        FileModel.filename == filename,
        FileModel.deleted_at.is_(None)
    ).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found in database")
    
    # 権限チェック: 管理者または作成者のみ削除可能
    from infrastructure.persistence.models import UserRole
    if current_user.role != UserRole.ADMIN and file_record.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="このファイルを削除する権限がありません"
        )
    
    file_path = find_file_by_name(settings.UPLOAD_DIR, filename)
    
    try:
        # Delete from filesystem if exists (ignore if not found)
        if file_path:
            try:
                os.remove(file_path)
            except FileNotFoundError:
                pass  # File already deleted, continue with database deletion
        
        # Delete from database (logical delete)
        from datetime import datetime
        file_record.deleted_at = datetime.utcnow()
        db.commit()
        
        return {"message": "File deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to delete file: {str(e)}"
        )