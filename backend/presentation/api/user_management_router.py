"""ユーザー管理API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from infrastructure.database import get_db
from infrastructure.models import UserModel, UserRole
from presentation.schemas.auth_schemas import UserResponse, UserCreate, UserUpdate
from presentation.api.auth_router import get_current_user, require_admin
from services.user_service import UserService
from utils.auth_utils import hash_password
from utils.response_utils import create_error_response

router = APIRouter(prefix="/users", tags=["user-management"])

@router.get("/")
async def list_users(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """
    全ユーザーの一覧を取得します。
    
    Admin権限が必要です。
    """
    users = db.query(UserModel).filter(UserModel.deleted_at.is_(None)).all()
    result = []
    for user in users:
        # 強制的にroleを含める
        user_dict = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": "admin" if user.role == 1 else "member",  # UserRole.ADMINは1
            "created_at": user.created_at.isoformat(),
            "updated_at": user.updated_at.isoformat()
        }
        result.append(user_dict)
    return result

@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """
    新しいユーザーを作成します。
    
    Admin権限が必要です。
    """
    # ロールの値をチェック
    if user_data.role not in ["admin", "member"]:
        raise create_error_response(
            status.HTTP_400_BAD_REQUEST,
            "Role must be 'admin' or 'member'"
        )
    
    # メールアドレスの重複チェック
    existing_user = db.query(UserModel).filter(
        UserModel.email == user_data.email,
        UserModel.deleted_at.is_(None)
    ).first()
    if existing_user:
        raise create_error_response(
            status.HTTP_400_BAD_REQUEST,
            "Email address is already in use"
        )
    
    # ユーザー名の重複チェック
    existing_user = db.query(UserModel).filter(
        UserModel.username == user_data.username,
        UserModel.deleted_at.is_(None)
    ).first()
    if existing_user:
        raise create_error_response(
            status.HTTP_400_BAD_REQUEST,
            "Username is already in use"
        )
    
    # 新しいユーザーを作成
    user = UserModel(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=UserRole.ADMIN if user_data.role == "admin" else UserRole.MEMBER
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role="admin" if user.role == UserRole.ADMIN else "member",
        created_at=user.created_at,
        updated_at=user.updated_at
    )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """
    特定のユーザーの情報を取得します。
    
    Admin権限が必要です。
    """
    user = db.query(UserModel).filter(
        UserModel.id == user_id,
        UserModel.deleted_at.is_(None)
    ).first()
    
    if not user:
        raise create_error_response(
            status.HTTP_404_NOT_FOUND,
            "User not found"
        )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role="admin" if user.role == UserRole.ADMIN else "member",
        created_at=user.created_at,
        updated_at=user.updated_at
    )

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """
    ユーザー情報を更新します。
    
    最後のAdminのロール変更は禁止されています。
    Admin権限が必要です。
    """
    user = db.query(UserModel).filter(
        UserModel.id == user_id,
        UserModel.deleted_at.is_(None)
    ).first()
    
    if not user:
        raise create_error_response(
            status.HTTP_404_NOT_FOUND,
            "User not found"
        )
    
    # 最後のAdminのロール変更チェック
    if user.role == UserRole.ADMIN and user_data.role and user_data.role != "admin":
        admin_count = db.query(UserModel).filter(
            UserModel.role == UserRole.ADMIN,
            UserModel.deleted_at.is_(None)
        ).count()
        
        if admin_count <= 1:
            raise create_error_response(
                status.HTTP_400_BAD_REQUEST,
                "Cannot change role of the last admin user"
            )
    
    # ロールの値をチェック
    if user_data.role and user_data.role not in ["admin", "member"]:
        raise create_error_response(
            status.HTTP_400_BAD_REQUEST,
            "Role must be 'admin' or 'member'"
        )
    
    user_service = UserService(db)
    
    try:
        # ユーザー情報を更新
        user = user_service.update_user(
            user_id=user_id,
            username=user_data.username,
            email=user_data.email,
            role=UserRole.ADMIN if user_data.role == "admin" else UserRole.MEMBER if user_data.role else None
        )
        
        # パスワード更新は別途処理
        if user_data.password is not None:
            user.password_hash = hash_password(user_data.password)
            db.commit()
            db.refresh(user)
            
    except ValueError as e:
        raise create_error_response(
            status.HTTP_400_BAD_REQUEST,
            str(e)
        )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role="admin" if user.role == UserRole.ADMIN else "member",
        created_at=user.created_at,
        updated_at=user.updated_at
    )

@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """
    ユーザーを削除します（論理削除）。
    
    最後のAdminの削除は禁止されています。
    Admin権限が必要です。
    """
    user = db.query(UserModel).filter(
        UserModel.id == user_id,
        UserModel.deleted_at.is_(None)
    ).first()
    
    if not user:
        raise create_error_response(
            status.HTTP_404_NOT_FOUND,
            "User not found"
        )
    
    # 最後のAdminの削除チェック
    if user.role == UserRole.ADMIN:
        admin_count = db.query(UserModel).filter(
            UserModel.role == UserRole.ADMIN,
            UserModel.deleted_at.is_(None)
        ).count()
        
        if admin_count <= 1:
            raise create_error_response(
                status.HTTP_400_BAD_REQUEST,
                "Cannot delete the last admin user"
            )
    
    # 論理削除
    success = user_service.delete_user(user_id)
    if not success:
        raise create_error_response(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Failed to delete user"
        )
    
    return {"message": "User deleted successfully"}