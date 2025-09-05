from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class LoginRequest(BaseModel):
    email: str
    password: str

class SetupRequest(BaseModel):
    email: str
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str

class UserInfo(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role: str
    profile: Optional[str] = None
    timezone: int

class UserResponse(BaseModel):
    id: int = Field(description="ユーザーID")
    username: str = Field(description="ユーザー名")
    email: str = Field(description="メールアドレス")
    role: str = Field(description="ロール（admin または member）")
    created_at: datetime = Field(description="作成日時")
    updated_at: datetime = Field(description="更新日時")

class UserCreate(BaseModel):
    username: str = Field(..., description="ユーザー名", example="user123")
    email: str = Field(..., description="メールアドレス", example="user@example.com")
    password: str = Field(..., description="パスワード", example="password123")
    role: str = Field(..., description="ロール（admin または member）", example="member")

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, description="ユーザー名")
    email: Optional[str] = Field(None, description="メールアドレス")
    password: Optional[str] = Field(None, description="パスワード")
    role: Optional[str] = Field(None, description="ロール（admin または member）")