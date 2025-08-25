from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from infrastructure.persistence.database import get_db
from infrastructure.persistence.models import UserModel, UserRole
from infrastructure.auth import verify_password, create_access_token, verify_token, ACCESS_TOKEN_EXPIRE_MINUTES
from presentation.schemas.auth_schemas import LoginRequest, LoginResponse, UserInfo

router = APIRouter()
security = HTTPBearer()

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(
        UserModel.email == request.email,
        UserModel.deleted_at.is_(None)
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証情報が正しくありません"
        )
    
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証情報が正しくありません"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        username=user.username,
        role=user.role.value
    )

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> UserModel:
    token = credentials.credentials
    email = verify_token(token)
    
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証トークンが無効です"
        )
    
    user = db.query(UserModel).filter(
        UserModel.email == email,
        UserModel.deleted_at.is_(None)
    ).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザーが見つかりません"
        )
    
    return user

def require_admin(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者権限が必要です"
        )
    return current_user

@router.get("/me", response_model=UserInfo)
def get_me(current_user: UserModel = Depends(get_current_user)):
    return UserInfo(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role.value
    )