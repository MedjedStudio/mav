"""File upload and management API endpoints."""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
import os
from pathlib import Path
from typing import List, Dict, Any

from config import settings
from presentation.api.auth_router import require_admin
from infrastructure.persistence.models import UserModel, FileModel
from infrastructure.persistence.database import get_db
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from utils.file_utils import (
    generate_unique_filename,
    extract_original_filename, 
    is_allowed_file,
    find_file_by_name
)

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def list_files(
    current_user: UserModel = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get list of uploaded files from database."""
    try:
        files = db.query(FileModel).filter(FileModel.deleted_at.is_(None)).all()
        file_list = []
        
        for file in files:
            file_info = {
                "id": file.id,
                "filename": file.filename,
                "original_filename": file.original_filename,
                "file_size": file.file_size,
                "mime_type": file.mime_type,
                "url": f"/uploads/{file.filename}",
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
    current_user: UserModel = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Upload an image file."""
    
    # Validate file
    _validate_file(file)
    
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
    unique_filename = generate_unique_filename(file.filename)
    file_path = settings.UPLOAD_DIR / unique_filename
    
    try:
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        # Save file info to database
        file_record = FileModel(
            filename=unique_filename,
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
            "url": f"/uploads/{unique_filename}",
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

@router.delete("/{filename}")
async def delete_file(
    filename: str,
    current_user: UserModel = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete uploaded file."""
    # Find file record in database
    file_record = db.query(FileModel).filter(FileModel.filename == filename).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found in database")
    
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