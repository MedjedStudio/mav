"""ユーザー関連のビジネスロジック"""
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime

from infrastructure.models import UserModel, UserRole
from utils.auth_utils import hash_password, verify_password


class UserService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_user_by_email(self, email: str) -> Optional[UserModel]:
        """メールアドレスでユーザーを取得"""
        return self.db.query(UserModel).filter(
            UserModel.email == email,
            UserModel.deleted_at.is_(None)
        ).first()
    
    def get_user_by_id(self, user_id: int) -> Optional[UserModel]:
        """IDでユーザーを取得"""
        return self.db.query(UserModel).filter(
            UserModel.id == user_id,
            UserModel.deleted_at.is_(None)
        ).first()
    
    def authenticate_user(self, email: str, password: str) -> Optional[UserModel]:
        """ユーザー認証"""
        user = self.get_user_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            return None
        return user
    
    def create_user(self, username: str, email: str, password: str, role: UserRole = UserRole.MEMBER) -> UserModel:
        """新規ユーザー作成"""
        # 重複チェック
        existing_user = self.get_user_by_email(email)
        if existing_user:
            raise ValueError("このメールアドレスは既に使用されています")
        
        # ユーザー名重複チェック
        existing_username = self.db.query(UserModel).filter(
            UserModel.username == username,
            UserModel.deleted_at.is_(None)
        ).first()
        if existing_username:
            raise ValueError("このユーザー名は既に使用されています")
        
        # パスワードハッシュ化
        password_hash = hash_password(password)
        
        # ユーザー作成
        user = UserModel(
            username=username,
            email=email,
            password_hash=password_hash,
            role=role
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def get_all_users(self) -> List[UserModel]:
        """全ユーザー一覧取得（管理者用）"""
        return self.db.query(UserModel).filter(
            UserModel.deleted_at.is_(None)
        ).order_by(UserModel.created_at.desc()).all()
    
    def update_user(self, user_id: int, username: Optional[str] = None, 
                   email: Optional[str] = None, role: Optional[UserRole] = None) -> UserModel:
        """ユーザー情報更新"""
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError("ユーザーが見つかりません")
        
        # ユーザー名更新チェック
        if username and username != user.username:
            existing = self.db.query(UserModel).filter(
                UserModel.username == username,
                UserModel.deleted_at.is_(None),
                UserModel.id != user_id
            ).first()
            if existing:
                raise ValueError("このユーザー名は既に使用されています")
            user.username = username
        
        # メールアドレス更新チェック
        if email and email != user.email:
            existing = self.db.query(UserModel).filter(
                UserModel.email == email,
                UserModel.deleted_at.is_(None),
                UserModel.id != user_id
            ).first()
            if existing:
                raise ValueError("このメールアドレスは既に使用されています")
            user.email = email
        
        # ロール更新
        if role is not None:
            user.role = role
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def change_password(self, user_id: int, current_password: str, new_password: str) -> bool:
        """パスワード変更"""
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError("ユーザーが見つかりません")
        
        # 現在のパスワード確認
        if not verify_password(current_password, user.password_hash):
            raise ValueError("現在のパスワードが正しくありません")
        
        # 新しいパスワードをハッシュ化して保存
        user.password_hash = hash_password(new_password)
        self.db.commit()
        
        return True
    
    def update_profile(self, user_id: int, profile: Optional[str] = None) -> UserModel:
        """プロフィール更新"""
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError("ユーザーが見つかりません")
        
        if profile is not None:
            user.profile = profile
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def delete_user(self, user_id: int) -> bool:
        """ユーザー削除（論理削除）"""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        user.deleted_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def is_initial_setup_needed(self) -> bool:
        """初期セットアップが必要かチェック"""
        admin_count = self.db.query(UserModel).filter(
            UserModel.role == UserRole.ADMIN,
            UserModel.deleted_at.is_(None)
        ).count()
        return admin_count == 0