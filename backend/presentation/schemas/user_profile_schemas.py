from pydantic import BaseModel, EmailStr
from typing import Optional

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    profile: Optional[str] = None
    timezone: Optional[int] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserProfile(BaseModel):
    id: int
    username: str
    email: str
    role: str
    profile: Optional[str] = None
    timezone: int

    class Config:
        from_attributes = True