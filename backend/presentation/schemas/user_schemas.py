from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserCreateRequest(BaseModel):
    username: str
    email: Optional[EmailStr] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_dto(cls, dto) -> 'UserResponse':
        return cls(
            id=dto.id,
            username=dto.username,
            email=dto.email,
            created_at=dto.created_at,
            updated_at=dto.updated_at
        )