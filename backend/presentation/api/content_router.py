from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from infrastructure.persistence.database import get_db
from infrastructure.persistence.models import ContentModel, UserModel
from presentation.api.auth_router import get_current_user, require_admin
from presentation.schemas.content_schemas import ContentCreate, ContentUpdate, ContentResponse

router = APIRouter()

# 管理者専用: コンテンツ作成
@router.post("/", response_model=ContentResponse)
def create_content(
    request: ContentCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    content = ContentModel(
        title=request.title,
        content=request.content
    )
    db.add(content)
    db.commit()
    db.refresh(content)
    return content

# 管理者専用: コンテンツ更新
@router.put("/{content_id}", response_model=ContentResponse)
def update_content(
    content_id: int,
    request: ContentUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    content = db.query(ContentModel).filter(
        ContentModel.id == content_id,
        ContentModel.deleted_at.is_(None)
    ).first()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="コンテンツが見つかりません"
        )
    
    if request.title is not None:
        content.title = request.title
    if request.content is not None:
        content.content = request.content
    
    db.commit()
    db.refresh(content)
    return content

# 管理者専用: コンテンツ削除（論理削除）
@router.delete("/{content_id}")
def delete_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    content = db.query(ContentModel).filter(
        ContentModel.id == content_id,
        ContentModel.deleted_at.is_(None)
    ).first()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="コンテンツが見つかりません"
        )
    
    from datetime import datetime
    content.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "コンテンツを削除しました"}

# 管理者専用: 全コンテンツ一覧（管理画面用）
@router.get("/admin", response_model=List[ContentResponse])
def get_all_contents_admin(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    contents = db.query(ContentModel).filter(
        ContentModel.deleted_at.is_(None)
    ).order_by(ContentModel.created_at.desc()).all()
    return contents

# 公開: コンテンツ一覧（一般ユーザー用）
@router.get("/", response_model=List[ContentResponse])
def get_contents(db: Session = Depends(get_db)):
    contents = db.query(ContentModel).filter(
        ContentModel.deleted_at.is_(None)
    ).order_by(ContentModel.created_at.desc()).all()
    return contents

# 公開: 個別コンテンツ取得
@router.get("/{content_id}", response_model=ContentResponse)
def get_content(content_id: int, db: Session = Depends(get_db)):
    content = db.query(ContentModel).filter(
        ContentModel.id == content_id,
        ContentModel.deleted_at.is_(None)
    ).first()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="コンテンツが見つかりません"
        )
    return content