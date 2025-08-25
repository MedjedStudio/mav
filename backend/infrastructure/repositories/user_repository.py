from typing import List, Optional
from sqlalchemy.orm import Session
from domain.repositories import UserRepositoryInterface
from domain.entities import User
from domain.value_objects import Username, Email
from ..persistence.models import UserModel

class SqlAlchemyUserRepository(UserRepositoryInterface):
    def __init__(self, db: Session):
        self.db = db

    def save(self, user: User) -> User:
        if user.is_persisted():
            # Update existing user
            db_user = self.db.query(UserModel).filter(UserModel.id == user.id).first()
            if db_user:
                db_user.username = str(user.username)
                db_user.email = str(user.email) if user.email else None
                self.db.commit()
                self.db.refresh(db_user)
                return self._to_domain(db_user)
        else:
            # Create new user
            db_user = UserModel(
                username=str(user.username),
                email=str(user.email) if user.email else None
            )
            self.db.add(db_user)
            self.db.commit()
            self.db.refresh(db_user)
            return self._to_domain(db_user)
        
        return user

    def find_by_id(self, user_id: int) -> Optional[User]:
        db_user = self.db.query(UserModel).filter(UserModel.id == user_id).first()
        return self._to_domain(db_user) if db_user else None

    def find_by_username(self, username: Username) -> Optional[User]:
        db_user = self.db.query(UserModel).filter(UserModel.username == str(username)).first()
        return self._to_domain(db_user) if db_user else None

    def find_by_email(self, email: Email) -> Optional[User]:
        db_user = self.db.query(UserModel).filter(UserModel.email == str(email)).first()
        return self._to_domain(db_user) if db_user else None

    def find_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        db_users = self.db.query(UserModel).offset(skip).limit(limit).all()
        return [self._to_domain(db_user) for db_user in db_users]

    def delete(self, user_id: int) -> bool:
        db_user = self.db.query(UserModel).filter(UserModel.id == user_id).first()
        if db_user:
            self.db.delete(db_user)
            self.db.commit()
            return True
        return False

    def exists_by_username(self, username: Username) -> bool:
        return self.db.query(UserModel).filter(UserModel.username == str(username)).first() is not None

    def exists_by_email(self, email: Email) -> bool:
        return self.db.query(UserModel).filter(UserModel.email == str(email)).first() is not None

    def _to_domain(self, db_user: UserModel) -> User:
        """SQLAlchemyモデルからドメインエンティティに変換"""
        return User(
            id=db_user.id,
            username=Username(db_user.username),
            email=Email.create(db_user.email),
            created_at=db_user.created_at,
            updated_at=db_user.updated_at
        )