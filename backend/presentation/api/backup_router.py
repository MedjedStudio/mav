"""バックアップ・復元機能のAPIエンドポイント"""

import tempfile
from pathlib import Path
from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from infrastructure.database import get_db
from infrastructure.models import UserModel
from presentation.api.auth_router import get_current_user
from services.backup_service import BackupService

router = APIRouter(prefix="/backup", tags=["backup"])



@router.get("/download")
async def download_backup(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """バックアップファイルをダウンロード"""
    backup_service = BackupService(db)
    
    try:
        from config import settings
        upload_dir = Path(settings.UPLOAD_DIR)
        
        # バックアップファイルを作成
        zip_path = backup_service.create_backup(upload_dir)
        zip_filename = zip_path.name
        
        return FileResponse(
            path=str(zip_path),
            filename=zip_filename,
            media_type='application/zip'
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"バックアップの作成に失敗しました: {str(e)}")


@router.post("/restore")
async def restore_backup(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """バックアップファイルから復元"""
    backup_service = BackupService(db)
    
    try:
        # アップロードされたファイルがZIPかチェック
        if not file.filename.endswith('.zip'):
            raise HTTPException(status_code=400, detail="ZIPファイルをアップロードしてください")
        
        from config import settings
        upload_dir = Path(settings.UPLOAD_DIR)
        
        # 一時ディレクトリを作成
        with tempfile.TemporaryDirectory() as temp_dir:
            # ZIPファイルを保存
            zip_path = Path(temp_dir) / file.filename
            with open(zip_path, 'wb') as f:
                content = await file.read()
                f.write(content)
            
            # バックアップから復元
            backup_service.restore_from_zip(zip_path, upload_dir)
        
        return {"message": "バックアップから正常に復元されました"}
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"復元に失敗しました: {str(e)}")

@router.get("/info")
async def get_backup_info(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """バックアップ情報を取得"""
    backup_service = BackupService(db)
    
    try:
        from config import settings
        upload_dir = Path(settings.UPLOAD_DIR)
        
        return backup_service.get_backup_info(upload_dir)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"バックアップ情報の取得に失敗しました: {str(e)}")