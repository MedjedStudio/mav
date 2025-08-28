"""Authentication API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from config import settings
from infrastructure.database import get_db
from infrastructure.models import UserModel, UserRole
from presentation.schemas.auth_schemas import LoginRequest, SetupRequest, LoginResponse, UserInfo
from presentation.schemas.user_profile_schemas import UserProfileUpdate, PasswordChange, UserProfile
from utils.auth_utils import verify_password, create_access_token, verify_token, hash_password
from utils.response_utils import create_error_response
from services.user_service import UserService

router = APIRouter()
security = HTTPBearer()

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user_service = UserService(db)
    user = user_service.authenticate_user(request.email, request.password)
    
    if not user:
        raise create_error_response(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid credentials"
        )
    
    access_token = create_access_token(data={"sub": user.email})
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        username=user.username,
        role="admin" if user.role == UserRole.ADMIN else "member"
    )

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> UserModel:
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise create_error_response(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid authentication token"
        )
    
    email = payload.get("sub")
    if email is None:
        raise create_error_response(
            status.HTTP_401_UNAUTHORIZED,
            "Invalid token payload"
        )
    
    user_service = UserService(db)
    user = user_service.get_user_by_email(email)
    if user is None:
        raise create_error_response(
            status.HTTP_401_UNAUTHORIZED,
            "User not found"
        )
    
    return user

def require_admin(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    if current_user.role != UserRole.ADMIN:
        raise create_error_response(
            status.HTTP_403_FORBIDDEN,
            "Admin privileges required"
        )
    return current_user

def require_authenticated(current_user: UserModel = Depends(get_current_user)) -> UserModel:
    """認証されたユーザー（admin or member）のみアクセス可能"""
    if current_user.role not in [UserRole.ADMIN, UserRole.MEMBER]:
        raise create_error_response(
            status.HTTP_403_FORBIDDEN,
            "Authentication required"
        )
    return current_user

@router.get("/me", response_model=UserInfo)
def get_me(current_user: UserModel = Depends(get_current_user)):
    return UserInfo(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role="admin" if current_user.role == UserRole.ADMIN else "member",
        profile=current_user.profile,
        timezone=current_user.timezone
    )

@router.put("/profile")
def update_profile(
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    user_service = UserService(db)
    email_changed = False
    
    try:
        # メールアドレス変更チェック
        if profile_data.email and profile_data.email != current_user.email:
            email_changed = True
        
        # プロファイル更新（重複チェック含む）
        updated_user = user_service.update_user(
            user_id=current_user.id,
            username=profile_data.username,
            email=profile_data.email,
            role=None
        )
        
        # プロファイルとタイムゾーン更新
        updated_user = user_service.update_profile(
            user_id=current_user.id,
            profile=profile_data.profile
        )
        
        # タイムゾーン更新（直接DB操作）
        if profile_data.timezone is not None:
            updated_user.timezone = profile_data.timezone
            db.commit()
            db.refresh(updated_user)
        
        current_user = updated_user
        
    except ValueError as e:
        raise create_error_response(
            status.HTTP_400_BAD_REQUEST,
            str(e)
        )
    
    # メールアドレスが変更された場合は新しいトークンを発行
    response_data = {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": "admin" if current_user.role == UserRole.ADMIN else "member",
        "profile": current_user.profile,
        "timezone": current_user.timezone
    }
    
    if email_changed:
        access_token = create_access_token(data={"sub": current_user.email})
        response_data["access_token"] = access_token
    
    return response_data

@router.put("/password")
def change_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    user_service = UserService(db)
    
    try:
        user_service.change_password(
            user_id=current_user.id,
            current_password=password_data.current_password,
            new_password=password_data.new_password
        )
        return {"message": "Password changed successfully"}
    except ValueError as e:
        raise create_error_response(
            status.HTTP_400_BAD_REQUEST,
            str(e)
        )

@router.get("/setup-status")
def check_setup_status(db: Session = Depends(get_db)):
    """初期セットアップが必要かどうかをチェック"""
    user_service = UserService(db)
    return {"needs_setup": user_service.is_initial_setup_needed()}

@router.post("/initial-setup")
def initial_setup(request: SetupRequest, db: Session = Depends(get_db)):
    """初期管理者ユーザーのセットアップ"""
    user_service = UserService(db)
    
    # 既に管理者がいる場合はエラー
    if not user_service.is_initial_setup_needed():
        raise create_error_response(
            status.HTTP_400_BAD_REQUEST,
            "Admin account already exists"
        )
    
    try:
        # 初期管理者ユーザーを作成
        admin_user = user_service.create_user(
            username=request.username,
            email=request.email,
            password=request.password,
            role=UserRole.ADMIN
        )
    except ValueError as e:
        raise create_error_response(
            status.HTTP_400_BAD_REQUEST,
            str(e)
        )
    
    # Generate login token
    access_token = create_access_token(data={"sub": admin_user.email})
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        username=admin_user.username,
        role="admin"
    )