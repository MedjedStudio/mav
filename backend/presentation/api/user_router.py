from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from infrastructure.persistence.database import get_db
from application.services import UserService
from ..schemas import UserCreateRequest, UserResponse

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=UserResponse)
async def create_user(request: UserCreateRequest, db: Session = Depends(get_db)):
    try:
        user_service = UserService(db)
        user_dto = user_service.create_user(
            username=request.username, 
            email=request.email
        )
        return UserResponse.from_dto(user_dto)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[UserResponse])
async def get_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    try:
        user_service = UserService(db)
        user_dtos = user_service.get_users(skip=skip, limit=limit)
        return [UserResponse.from_dto(dto) for dto in user_dtos]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: Session = Depends(get_db)):
    try:
        user_service = UserService(db)
        user_dto = user_service.get_user_by_id(user_id)
        if not user_dto:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse.from_dto(user_dto)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))