"""ファイル関連のビジネスロジック"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from pathlib import Path
import os
import uuid

from infrastructure.models import FileModel, AvatarModel, UserModel, UserRole


class FileService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_files_for_user(self, current_user: UserModel) -> List[FileModel]:
        """ユーザーの権限に応じたファイル一覧を取得"""
        if current_user.role == UserRole.ADMIN:
            # 管理者は全ファイル表示（新しい順）
            return self.db.query(FileModel).filter(
                FileModel.deleted_at.is_(None)
            ).order_by(FileModel.created_at.desc()).all()
        else:
            # メンバーは自分のファイルのみ表示（新しい順）
            return self.db.query(FileModel).filter(
                FileModel.deleted_at.is_(None),
                FileModel.uploaded_by == current_user.id
            ).order_by(FileModel.created_at.desc()).all()
    
    def save_file(
        self,
        filename: str,
        original_filename: str,
        file_size: int,
        mime_type: str,
        uploaded_by: int
    ) -> FileModel:
        """ファイル情報をデータベースに保存"""
        utc_now = datetime.now(timezone.utc)
        file_record = FileModel(
            filename=filename,
            original_filename=original_filename,
            file_size=file_size,
            mime_type=mime_type,
            uploaded_by=uploaded_by,
            created_at=utc_now
        )
        
        self.db.add(file_record)
        self.db.commit()
        self.db.refresh(file_record)
        
        return file_record
    
    def get_file_by_id(self, file_id: int) -> Optional[FileModel]:
        """IDでファイル記録を取得"""
        return self.db.query(FileModel).filter(
            FileModel.id == file_id,
            FileModel.deleted_at.is_(None)
        ).first()
    
    def get_file_by_filename(self, filename: str) -> Optional[FileModel]:
        """ファイル名でファイル記録を取得"""
        return self.db.query(FileModel).filter(
            FileModel.filename == filename,
            FileModel.deleted_at.is_(None)
        ).first()
    
    def delete_file(self, file_id: int, current_user: UserModel) -> bool:
        """ファイル削除（論理削除）"""
        file_record = self.get_file_by_id(file_id)
        if not file_record:
            return False
        
        # 権限チェック：管理者または作成者のみ削除可能
        if current_user.role != UserRole.ADMIN and file_record.uploaded_by != current_user.id:
            raise ValueError("このファイルを削除する権限がありません")
        
        file_record.deleted_at = datetime.now(timezone.utc)
        self.db.commit()
        
        return True
    
    def delete_file_by_filename(self, filename: str, current_user: UserModel) -> bool:
        """ファイル名によるファイル削除（論理削除）"""
        file_record = self.get_file_by_filename(filename)
        if not file_record:
            return False
        
        # 権限チェック：管理者または作成者のみ削除可能
        if current_user.role != UserRole.ADMIN and file_record.uploaded_by != current_user.id:
            raise ValueError("このファイルを削除する権限がありません")
        
        file_record.deleted_at = datetime.now(timezone.utc)
        self.db.commit()
        
        return True
    
    def get_user_avatar(self, user_id: int) -> Optional[AvatarModel]:
        """ユーザーのアバターを取得"""
        return self.db.query(AvatarModel).filter(
            AvatarModel.user_id == user_id,
            AvatarModel.deleted_at.is_(None)
        ).first()
    
    def save_avatar(
        self,
        user_id: int,
        filename: str,
        original_filename: str,
        file_size: int,
        mime_type: str
    ) -> AvatarModel:
        """アバターを保存または更新"""
        # 既存のアバターをチェック
        existing_avatar = self.get_user_avatar(user_id)
        
        if existing_avatar:
            # 既存のアバターを更新
            existing_avatar.filename = filename
            existing_avatar.original_filename = original_filename
            existing_avatar.file_size = file_size
            existing_avatar.mime_type = mime_type
            existing_avatar.updated_at = datetime.now(timezone.utc)
            
            self.db.commit()
            self.db.refresh(existing_avatar)
            
            return existing_avatar
        else:
            # 新しいアバターを作成
            avatar_record = AvatarModel(
                user_id=user_id,
                filename=filename,
                original_filename=original_filename,
                file_size=file_size,
                mime_type=mime_type
            )
            
            self.db.add(avatar_record)
            self.db.commit()
            self.db.refresh(avatar_record)
            
            return avatar_record
    
    @staticmethod
    def generate_unique_filename(original_filename: str) -> str:
        """ユニークなファイル名を生成"""
        suffix = Path(original_filename).suffix
        return f"{uuid.uuid4()}{suffix}"
    
    @staticmethod
    def get_mime_type(file_path: Path) -> str:
        """ファイル拡張子からMIMEタイプを取得"""
        extension = file_path.suffix.lower()
        mime_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg", 
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp"
        }
        return mime_types.get(extension, "application/octet-stream")
    
    @staticmethod
    def create_file_info_dict(file: FileModel) -> Dict[str, Any]:
        """ファイル情報を辞書形式に変換"""
        return {
            "id": file.id,
            "filename": file.filename,
            "original_filename": file.original_filename,
            "file_size": file.file_size,
            "mime_type": file.mime_type,
            "url": f"/uploads/files/{file.filename}",
            "created_at": file.created_at.isoformat(),
            "uploader": file.uploader.username if file.uploader else "Unknown"
        }