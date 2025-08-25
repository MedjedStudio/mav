from abc import ABC, abstractmethod
from typing import List, Optional
from ..entities import User
from ..value_objects import Username, Email

class UserRepositoryInterface(ABC):
    
    @abstractmethod
    def save(self, user: User) -> User:
        """ユーザーを保存（作成または更新）"""
        pass
    
    @abstractmethod
    def find_by_id(self, user_id: int) -> Optional[User]:
        """IDでユーザーを検索"""
        pass
    
    @abstractmethod
    def find_by_username(self, username: Username) -> Optional[User]:
        """ユーザー名でユーザーを検索"""
        pass
    
    @abstractmethod
    def find_by_email(self, email: Email) -> Optional[User]:
        """メールアドレスでユーザーを検索"""
        pass
    
    @abstractmethod
    def find_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        """全ユーザーを取得"""
        pass
    
    @abstractmethod
    def delete(self, user_id: int) -> bool:
        """ユーザーを削除"""
        pass
    
    @abstractmethod
    def exists_by_username(self, username: Username) -> bool:
        """ユーザー名が存在するかチェック"""
        pass
    
    @abstractmethod
    def exists_by_email(self, email: Email) -> bool:
        """メールアドレスが存在するかチェック"""
        pass