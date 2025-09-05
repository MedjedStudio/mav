from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ContentCreate(BaseModel):
    title: str
    content: str
    category_ids: List[int] = []
    is_published: Optional[bool] = False

class ContentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category_ids: Optional[List[int]] = None
    is_published: Optional[bool] = None

class ContentResponse(BaseModel):
    id: int
    title: str
    content: str
    categories: List[str] = []
    is_published: bool
    author_name: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True