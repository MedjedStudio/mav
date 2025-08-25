from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class CreateUserDTO:
    username: str
    email: Optional[str] = None

@dataclass
class UserResponseDTO:
    id: int
    username: str
    email: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime] = None

    @classmethod
    def from_domain(cls, user) -> 'UserResponseDTO':
        """ドメインエンティティからDTOを作成"""
        return cls(
            id=user.id,
            username=str(user.username),
            email=str(user.email) if user.email else None,
            created_at=user.created_at,
            updated_at=user.updated_at
        )