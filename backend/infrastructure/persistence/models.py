from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, UniqueConstraint, ForeignKey, Table, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


# 中間テーブル（コンテンツとカテゴリの多対多関係）
content_categories = Table(
    'content_categories', Base.metadata,
    Column('content_id', Integer, ForeignKey('contents.id'), primary_key=True),
    Column('category_id', Integer, ForeignKey('categories.id'), primary_key=True),
    Column('created_at', DateTime(timezone=True), server_default=func.now())
)

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"

class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), index=True, nullable=False)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint('email', 'deleted_at', name='uq_email_deleted_at'),
    )

class CategoryModel(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # リレーション（多対多）
    contents = relationship("ContentModel", secondary=content_categories, back_populates="categories")

class ContentModel(Base):
    __tablename__ = "contents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    is_published = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # リレーション（多対多）
    categories = relationship("CategoryModel", secondary=content_categories, back_populates="contents")

class FileModel(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    uploaded_by = Column(Integer, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # リレーション
    uploader = relationship("UserModel")