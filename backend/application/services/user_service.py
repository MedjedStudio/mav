from typing import List, Optional
from sqlalchemy.orm import Session
from infrastructure.repositories import SqlAlchemyUserRepository
from ..use_cases import CreateUserUseCase, GetUsersUseCase, GetUserByIdUseCase
from ..dto import CreateUserDTO, UserResponseDTO

class UserService:
    def __init__(self, db: Session):
        self.user_repository = SqlAlchemyUserRepository(db)
        self.create_user_use_case = CreateUserUseCase(self.user_repository)
        self.get_users_use_case = GetUsersUseCase(self.user_repository)
        self.get_user_by_id_use_case = GetUserByIdUseCase(self.user_repository)

    def create_user(self, username: str, email: Optional[str] = None) -> UserResponseDTO:
        dto = CreateUserDTO(username=username, email=email)
        return self.create_user_use_case.execute(dto)

    def get_users(self, skip: int = 0, limit: int = 100) -> List[UserResponseDTO]:
        return self.get_users_use_case.execute(skip=skip, limit=limit)

    def get_user_by_id(self, user_id: int) -> Optional[UserResponseDTO]:
        return self.get_user_by_id_use_case.execute(user_id)