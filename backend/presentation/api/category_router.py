from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from infrastructure.persistence.database import get_db
from infrastructure.persistence.models import CategoryModel, UserModel
from presentation.api.auth_router import require_admin
from presentation.schemas.category_schemas import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter()

# 管理者専用: カテゴリ作成
@router.post("/", response_model=CategoryResponse)
def create_category(
    request: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    # カテゴリ名の重複チェック
    existing_category = db.query(CategoryModel).filter(
        CategoryModel.name == request.name,
        CategoryModel.deleted_at.is_(None)
    ).first()
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このカテゴリ名は既に存在します"
        )
    
    category = CategoryModel(
        name=request.name,
        description=request.description
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

# 管理者専用: カテゴリ更新
@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    request: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    category = db.query(CategoryModel).filter(
        CategoryModel.id == category_id,
        CategoryModel.deleted_at.is_(None)
    ).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="カテゴリが見つかりません"
        )
    
    # カテゴリ名の重複チェック（自分以外）
    if request.name and request.name != category.name:
        existing_category = db.query(CategoryModel).filter(
            CategoryModel.name == request.name,
            CategoryModel.deleted_at.is_(None),
            CategoryModel.id != category_id
        ).first()
        if existing_category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="このカテゴリ名は既に存在します"
            )
    
    if request.name is not None:
        category.name = request.name
    if request.description is not None:
        category.description = request.description
    
    db.commit()
    db.refresh(category)
    return category

# 管理者専用: カテゴリ削除（論理削除）
@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    category = db.query(CategoryModel).filter(
        CategoryModel.id == category_id,
        CategoryModel.deleted_at.is_(None)
    ).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="カテゴリが見つかりません"
        )
    
    # デフォルトカテゴリ（未分類）は削除不可
    if category.name == "未分類":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="デフォルトカテゴリ（未分類）は削除できません"
        )
    
    # このカテゴリを使用している記事を未分類に移動
    from infrastructure.persistence.models import ContentModel
    uncategorized = db.query(CategoryModel).filter(
        CategoryModel.name == "未分類",
        CategoryModel.deleted_at.is_(None)
    ).first()
    
    if uncategorized:
        db.query(ContentModel).filter(
            ContentModel.category_id == category_id,
            ContentModel.deleted_at.is_(None)
        ).update({"category_id": uncategorized.id})
    
    category.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "カテゴリを削除しました"}

# 公開: カテゴリ一覧
@router.get("/", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(CategoryModel).filter(
        CategoryModel.deleted_at.is_(None)
    ).order_by(CategoryModel.name).all()
    return categories