from pydantic import BaseModel
from typing import Optional

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