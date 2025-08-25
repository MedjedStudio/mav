from typing import List, Optional
from domain.entities import User
from domain.repositories import UserRepositoryInterface
from domain.value_objects import Username, Email
from ..dto import CreateUserDTO, UserResponseDTO

class CreateUserUseCase:
    def __init__(self, user_repository: UserRepositoryInterface):
        self.user_repository = user_repository

    def execute(self, dto: CreateUserDTO) -> UserResponseDTO:
        # ビジネスルール: ユーザー名の重複チェック
        username = Username(dto.username)
        if self.user_repository.exists_by_username(username):
            raise ValueError(f"Username '{dto.username}' already exists")
        
        # メールアドレスの重複チェック
        if dto.email:
            email = Email(dto.email)
            if self.user_repository.exists_by_email(email):
                raise ValueError(f"Email '{dto.email}' already exists")
        
        # ユーザー作成
        user = User.create(username=dto.username, email=dto.email)
        saved_user = self.user_repository.save(user)
        
        return UserResponseDTO.from_domain(saved_user)

class GetUsersUseCase:
    def __init__(self, user_repository: UserRepositoryInterface):
        self.user_repository = user_repository

    def execute(self, skip: int = 0, limit: int = 100) -> List[UserResponseDTO]:
        users = self.user_repository.find_all(skip=skip, limit=limit)
        return [UserResponseDTO.from_domain(user) for user in users]

class GetUserByIdUseCase:
    def __init__(self, user_repository: UserRepositoryInterface):
        self.user_repository = user_repository

    def execute(self, user_id: int) -> Optional[UserResponseDTO]:
        user = self.user_repository.find_by_id(user_id)
        return UserResponseDTO.from_domain(user) if user else None