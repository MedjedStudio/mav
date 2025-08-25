from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, UniqueConstraint
from sqlalchemy.sql import func
from .database import Base
import enum

# Export Base for Alembic

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

class ContentModel(Base):
    __tablename__ = "contents"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)