"""バックアップ・復元関連のビジネスロジック"""
import os
import json
import zipfile
import shutil
import tempfile
from datetime import datetime
from typing import Any, Dict
from pathlib import Path
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import text

from infrastructure.models import ContentModel, CategoryModel, UserModel, UserRole, UserTimezone, FileModel, AvatarModel


class BackupService:
    def __init__(self, db: Session):
        self.db = db
    
    def export_database_data(self) -> Dict[str, Any]:
        """データベースのデータをエクスポート"""
        # ユーザーデータ（削除されたものも含む）
        users = self.db.query(UserModel).all()
        users_data = []
        for user in users:
            users_data.append({
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "password_hash": user.password_hash,
                "role": user.role.value if hasattr(user.role, 'value') else user.role,
                "profile": user.profile,
                "timezone": user.timezone.value if hasattr(user.timezone, 'value') else user.timezone,
                "created_at": user.created_at.isoformat(),
                "updated_at": user.updated_at.isoformat(),
                "deleted_at": user.deleted_at.isoformat() if user.deleted_at else None
            })
        
        # カテゴリデータ（削除されたものも含む）
        categories = self.db.query(CategoryModel).all()
        categories_data = []
        for category in categories:
            categories_data.append({
                "id": category.id,
                "name": category.name,
                "description": category.description,
                "sort_order": category.sort_order,
                "created_at": category.created_at.isoformat(),
                "updated_at": category.updated_at.isoformat(),
                "deleted_at": category.deleted_at.isoformat() if category.deleted_at else None
            })
        
        # コンテンツデータ（削除されたものも含む）
        contents = self.db.query(ContentModel).options(selectinload(ContentModel.categories)).all()
        contents_data = []
        for content in contents:
            content_categories = [cat.name for cat in content.categories]
            contents_data.append({
                "id": content.id,
                "title": content.title,
                "content": content.content,
                "categories": content_categories,
                "is_published": content.is_published,
                "author_id": content.author_id,
                "created_at": content.created_at.isoformat(),
                "updated_at": content.updated_at.isoformat(),
                "deleted_at": content.deleted_at.isoformat() if content.deleted_at else None
            })
        
        # ファイルデータ（削除されたものも含む）
        files = self.db.query(FileModel).all()
        files_data = []
        for file in files:
            files_data.append({
                "id": file.id,
                "filename": file.filename,
                "original_filename": file.original_filename,
                "file_size": file.file_size,
                "mime_type": file.mime_type,
                "uploaded_by": file.uploaded_by,
                "created_at": file.created_at.isoformat(),
                "deleted_at": file.deleted_at.isoformat() if file.deleted_at else None
            })
        
        # アバターデータ（削除されたものも含む）
        avatars = self.db.query(AvatarModel).all()
        avatars_data = []
        for avatar in avatars:
            avatars_data.append({
                "id": avatar.id,
                "user_id": avatar.user_id,
                "filename": avatar.filename,
                "original_filename": avatar.original_filename,
                "file_size": avatar.file_size,
                "mime_type": avatar.mime_type,
                "created_at": avatar.created_at.isoformat(),
                "updated_at": avatar.updated_at.isoformat(),
                "deleted_at": avatar.deleted_at.isoformat() if avatar.deleted_at else None
            })
        
        return {
            "users": users_data,
            "categories": categories_data,
            "contents": contents_data,
            "files": files_data,
            "avatars": avatars_data,
            "exported_at": datetime.now().isoformat()
        }
    
    def create_backup(self, upload_dir: Path) -> Path:
        """バックアップファイルを作成"""
        # 一時ディレクトリを作成
        temp_dir = tempfile.mkdtemp()
        backup_dir = Path(temp_dir) / "backup"
        backup_dir.mkdir()
        
        # データベースデータをエクスポート
        db_data = self.export_database_data()
        
        # データベースデータをJSONファイルに保存
        db_file = backup_dir / "database.json"
        with open(db_file, 'w', encoding='utf-8') as f:
            json.dump(db_data, f, ensure_ascii=False, indent=2)
        
        # アップロードファイルをコピー（.gitkeepファイルを除外）
        if upload_dir.exists():
            uploads_backup_dir = backup_dir / "uploads"
            
            def ignore_gitkeep(dir, files):
                return [f for f in files if f.startswith('.')]
            
            shutil.copytree(upload_dir, uploads_backup_dir, ignore=ignore_gitkeep)
        
        # ZIPファイルを作成
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        zip_filename = f"mav_backup_{timestamp}.zip"
        zip_path = Path(temp_dir) / zip_filename
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(backup_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(backup_dir)
                    zipf.write(file_path, arcname)
        
        return zip_path
    
    def import_database_data(self, data: Dict[str, Any]) -> None:
        """データベースにデータをインポート"""
        # 既存のデータをクリア（外部キー制約を考慮した正しい順序）
        # MySQLタイムアウト対策のため個別にコミット
        try:
            # 1. 中間テーブルを直接削除
            self.db.execute(text("DELETE FROM content_categories"))
            self.db.commit()
            
            # 2. 外部キーを持つ子テーブルから削除
            self.db.query(AvatarModel).delete()  # avatars（users.idを参照）
            self.db.commit()
            
            self.db.query(FileModel).delete()  # files（users.idを参照）
            self.db.commit()
            
            self.db.query(ContentModel).delete()  # contents
            self.db.commit()
            
            # 3. 参照される側のテーブル
            self.db.query(CategoryModel).delete()  # categories
            self.db.commit()
            
            self.db.query(UserModel).delete()  # users
            self.db.commit()
        except Exception as e:
            self.db.rollback()
            raise e
        
        # ユーザーデータを復元
        for user_data in data.get("users", []):
            user = UserModel(
                id=user_data["id"],
                username=user_data["username"],
                email=user_data["email"],
                password_hash=user_data["password_hash"],
                role=UserRole(user_data["role"]),
                profile=user_data.get("profile"),
                timezone=UserTimezone(user_data.get("timezone", UserTimezone.UTC.value)),
                created_at=datetime.fromisoformat(user_data["created_at"]),
                updated_at=datetime.fromisoformat(user_data["updated_at"]),
                deleted_at=datetime.fromisoformat(user_data["deleted_at"]) if user_data.get("deleted_at") else None
            )
            self.db.add(user)
        
        # カテゴリデータを復元
        categories_map = {}
        for category_data in data.get("categories", []):
            category = CategoryModel(
                id=category_data["id"],
                name=category_data["name"],
                description=category_data["description"],
                sort_order=category_data.get("sort_order", 0),
                created_at=datetime.fromisoformat(category_data["created_at"]),
                updated_at=datetime.fromisoformat(category_data["updated_at"]),
                deleted_at=datetime.fromisoformat(category_data["deleted_at"]) if category_data.get("deleted_at") else None
            )
            self.db.add(category)
            categories_map[category_data["name"]] = category
        
        self.db.commit()  # カテゴリをコミットしてからコンテンツを作成
        
        # コンテンツデータを復元
        for content_data in data.get("contents", []):
            content = ContentModel(
                id=content_data["id"],
                title=content_data["title"],
                content=content_data["content"],
                is_published=content_data.get("is_published", False),
                author_id=content_data["author_id"],
                created_at=datetime.fromisoformat(content_data["created_at"]),
                updated_at=datetime.fromisoformat(content_data["updated_at"]),
                deleted_at=datetime.fromisoformat(content_data["deleted_at"]) if content_data.get("deleted_at") else None
            )
            
            # カテゴリを関連付け
            for cat_name in content_data.get("categories", []):
                if cat_name in categories_map:
                    content.categories.append(categories_map[cat_name])
            
            self.db.add(content)
        
        # ファイルデータを復元
        for file_data in data.get("files", []):
            file_record = FileModel(
                id=file_data["id"],
                filename=file_data["filename"],
                original_filename=file_data["original_filename"],
                file_size=file_data["file_size"],
                mime_type=file_data["mime_type"],
                uploaded_by=file_data["uploaded_by"],
                created_at=datetime.fromisoformat(file_data["created_at"]),
                deleted_at=datetime.fromisoformat(file_data["deleted_at"]) if file_data.get("deleted_at") else None
            )
            self.db.add(file_record)
        
        # アバターデータを復元
        for avatar_data in data.get("avatars", []):
            avatar_record = AvatarModel(
                id=avatar_data["id"],
                user_id=avatar_data["user_id"],
                filename=avatar_data["filename"],
                original_filename=avatar_data["original_filename"],
                file_size=avatar_data["file_size"],
                mime_type=avatar_data["mime_type"],
                created_at=datetime.fromisoformat(avatar_data["created_at"]),
                updated_at=datetime.fromisoformat(avatar_data["updated_at"]),
                deleted_at=datetime.fromisoformat(avatar_data["deleted_at"]) if avatar_data.get("deleted_at") else None
            )
            self.db.add(avatar_record)
        
        self.db.commit()
    
    def restore_files(self, backup_zip_path: Path, upload_dir: Path) -> None:
        """バックアップからファイルを復元"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # ZIPファイルを展開
            extract_dir = Path(temp_dir) / "extracted"
            with zipfile.ZipFile(backup_zip_path, 'r') as zipf:
                zipf.extractall(extract_dir)
            
            # アップロードファイルを復元
            uploads_backup_dir = extract_dir / "uploads"
            
            # アップロードディレクトリを作成（存在しない場合）
            if not upload_dir.exists():
                upload_dir.mkdir(parents=True, exist_ok=True)
            
            # バックアップからファイルを復元（階層構造を保持）
            if uploads_backup_dir.exists():
                # 必要なディレクトリ構造を確保
                (upload_dir / "files").mkdir(exist_ok=True)
                (upload_dir / "avatars").mkdir(exist_ok=True)
                
                # バックアップディレクトリ全体を復元
                for root, dirs, files in os.walk(uploads_backup_dir):
                    # 現在の相対パスを取得
                    rel_path = Path(root).relative_to(uploads_backup_dir)
                    target_dir = upload_dir / rel_path
                    
                    # ターゲットディレクトリを作成
                    target_dir.mkdir(parents=True, exist_ok=True)
                    
                    # ファイルをコピー
                    for file in files:
                        if not file.startswith('.'):  # .gitkeepなどの隠しファイルは除外
                            src_file = Path(root) / file
                            target_file = target_dir / file
                            if not target_file.exists():
                                shutil.copy2(src_file, target_file)
    
    def restore_from_zip(self, zip_file_path: Path, upload_dir: Path) -> None:
        """ZIPファイルからデータベースとファイルを復元"""
        with tempfile.TemporaryDirectory() as temp_dir:
            # ZIPファイルを展開
            extract_dir = Path(temp_dir) / "extracted"
            with zipfile.ZipFile(zip_file_path, 'r') as zipf:
                zipf.extractall(extract_dir)
            
            # データベースファイルを読み込み
            db_file = extract_dir / "database.json"
            if not db_file.exists():
                raise ValueError("バックアップファイルが不正です（database.jsonが見つかりません）")
            
            with open(db_file, 'r', encoding='utf-8') as f:
                db_data = json.load(f)
            
            # データベースを復元
            self.import_database_data(db_data)
            
            # ファイルを復元
            self.restore_files(zip_file_path, upload_dir)
    
    def get_backup_info(self, upload_dir: Path) -> Dict[str, Any]:
        """バックアップ情報を取得"""
        # データベース統計
        user_count = self.db.query(UserModel).count()
        category_count = self.db.query(CategoryModel).count()
        content_count = self.db.query(ContentModel).count()
        
        # アップロードファイル統計
        file_count = 0
        total_size = 0
        
        if upload_dir.exists():
            for file_path in upload_dir.rglob('*'):
                if file_path.is_file() and not file_path.name.startswith('.'):
                    file_count += 1
                    total_size += file_path.stat().st_size
        
        return {
            "database": {
                "users": user_count,
                "categories": category_count,
                "contents": content_count
            },
            "files": {
                "count": file_count,
                "total_size": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2)
            }
        }