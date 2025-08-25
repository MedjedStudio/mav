from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from infrastructure.persistence.database import get_db
from infrastructure.persistence.models import UserModel, UserRole
from infrastructure.auth import verify_password, create_access_token, verify_token, ACCESS_TOKEN_EXPIRE_MINUTES
from presentation.schemas.auth_schemas import LoginRequest, LoginResponse, UserInfo
from presentation.schemas.user_profile_schemas import UserProfileUpdate, PasswordChange, UserProfile

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

@router.put("/profile", response_model=UserProfile)
def update_profile(
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # メールアドレスの重複チェック
    if profile_data.email and profile_data.email != current_user.email:
        existing_user = db.query(UserModel).filter(
            UserModel.email == profile_data.email,
            UserModel.deleted_at.is_(None),
            UserModel.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="このメールアドレスは既に使用されています"
            )
    
    # ユーザー名の重複チェック
    if profile_data.username and profile_data.username != current_user.username:
        existing_user = db.query(UserModel).filter(
            UserModel.username == profile_data.username,
            UserModel.deleted_at.is_(None),
            UserModel.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="このユーザー名は既に使用されています"
            )

    # プロファイル更新
    if profile_data.username is not None:
        current_user.username = profile_data.username
    if profile_data.email is not None:
        current_user.email = profile_data.email
    
    db.commit()
    db.refresh(current_user)
    
    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        role=current_user.role.value
    )

@router.put("/password")
def change_password(
    password_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from infrastructure.auth import verify_password, get_password_hash
    
    # 現在のパスワード確認
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="現在のパスワードが正しくありません"
        )
    
    # 新しいパスワードをハッシュ化して保存
    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()
    
    return {"message": "パスワードを変更しました"}