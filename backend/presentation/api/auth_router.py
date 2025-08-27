"""Authentication API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from config import settings
from infrastructure.persistence.database import get_db
from infrastructure.persistence.models import UserModel, UserRole
from presentation.schemas.auth_schemas import LoginRequest, SetupRequest, LoginResponse, UserInfo
from presentation.schemas.user_profile_schemas import UserProfileUpdate, PasswordChange, UserProfile
from utils.auth_utils import verify_password, create_access_token, verify_token, hash_password
from utils.response_utils import create_error_response

router = APIRouter()
security = HTTPBearer()

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(
        UserModel.email == request.email,
        UserModel.deleted_at.is_(None)
    ).first()
    
    if not user or not verify_password(request.password, user.password_hash):
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
    
    user = db.query(UserModel).filter(
        UserModel.email == email,
        UserModel.deleted_at.is_(None)
    ).first()
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
    # メールアドレスの重複チェック
    email_changed = False
    if profile_data.email and profile_data.email != current_user.email:
        existing_user = db.query(UserModel).filter(
            UserModel.email == profile_data.email,
            UserModel.deleted_at.is_(None),
            UserModel.id != current_user.id
        ).first()
        if existing_user:
            raise create_error_response(
                status.HTTP_400_BAD_REQUEST,
                "Email address is already in use"
            )
        email_changed = True
    
    # ユーザー名の重複チェック
    if profile_data.username and profile_data.username != current_user.username:
        existing_user = db.query(UserModel).filter(
            UserModel.username == profile_data.username,
            UserModel.deleted_at.is_(None),
            UserModel.id != current_user.id
        ).first()
        if existing_user:
            raise create_error_response(
                status.HTTP_400_BAD_REQUEST,
                "Username is already in use"
            )

    # プロファイル更新
    if profile_data.username is not None:
        current_user.username = profile_data.username
    if profile_data.email is not None:
        current_user.email = profile_data.email
    if profile_data.profile is not None:
        current_user.profile = profile_data.profile
    if profile_data.timezone is not None:
        current_user.timezone = profile_data.timezone
    
    db.commit()
    db.refresh(current_user)
    
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
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise create_error_response(
            status.HTTP_400_BAD_REQUEST,
            "Current password is incorrect"
        )
    
    # Hash and save new password
    current_user.password_hash = hash_password(password_data.new_password)
    db.commit()
    
    return {"message": "Password changed successfully"}

@router.get("/setup-status")
def check_setup_status(db: Session = Depends(get_db)):
    """初期セットアップが必要かどうかをチェック"""
    admin_count = db.query(UserModel).filter(
        UserModel.role == UserRole.ADMIN,
        UserModel.deleted_at.is_(None)
    ).count()
    
    return {"needs_setup": admin_count == 0}

@router.post("/initial-setup")
def initial_setup(request: SetupRequest, db: Session = Depends(get_db)):
    """初期管理者ユーザーのセットアップ"""
    # 既に管理者がいる場合はエラー
    admin_count = db.query(UserModel).filter(
        UserModel.role == UserRole.ADMIN,
        UserModel.deleted_at.is_(None)
    ).count()
    
    if admin_count > 0:
        raise create_error_response(
            status.HTTP_400_BAD_REQUEST,
            "Admin account already exists"
        )
    
    
    # メールアドレスの重複チェック
    existing_user = db.query(UserModel).filter(
        UserModel.email == request.email,
        UserModel.deleted_at.is_(None)
    ).first()
    if existing_user:
        raise create_error_response(
            status.HTTP_400_BAD_REQUEST,
            "Email address is already in use"
        )
    
    # 初期管理者ユーザーを作成
    admin_user = UserModel(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password),
        role=UserRole.ADMIN
    )
    
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    
    # Generate login token
    access_token = create_access_token(data={"sub": admin_user.email})
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        username=admin_user.username,
        role="admin"
    )