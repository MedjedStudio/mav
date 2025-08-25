from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ContentCreate(BaseModel):
    title: str
    content: str

class ContentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class ContentResponse(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True