from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from ..value_objects import Email, Username

@dataclass
class User:
    id: Optional[int]
    username: Username
    email: Optional[Email]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @classmethod
    def create(cls, username: str, email: Optional[str] = None) -> 'User':
        """新しいUserエンティティを作成"""
        return cls(
            id=None,
            username=Username(username),
            email=Email.create(email),
            created_at=None,
            updated_at=None
        )

    def update_email(self, new_email: Optional[str]) -> None:
        """メールアドレスを更新"""
        self.email = Email.create(new_email)

    def update_username(self, new_username: str) -> None:
        """ユーザー名を更新"""
        self.username = Username(new_username)

    def is_persisted(self) -> bool:
        """永続化されているかどうかを確認"""
        return self.id is not None