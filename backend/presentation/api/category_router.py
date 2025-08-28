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
    
    # このカテゴリを使用している記事から関連付けを削除（未分類になる）
    for content in category.contents:
        content.categories.remove(category)
    
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

# 公開: 特定カテゴリのコンテンツ一覧
@router.get("/{category_id}/contents")
def get_category_contents(
    category_id: int,
    db: Session = Depends(get_db)
):
    from infrastructure.persistence.models import ContentModel, UserModel
    from sqlalchemy.orm import selectinload
    from presentation.schemas.content_schemas import ContentResponse

    # カテゴリが存在するかチェック
    category = db.query(CategoryModel).filter(
        CategoryModel.id == category_id,
        CategoryModel.deleted_at.is_(None)
    ).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="カテゴリが見つかりません"
        )

    # カテゴリに属する公開コンテンツを取得
    results = db.query(ContentModel, UserModel.username).join(
        UserModel, ContentModel.author_id == UserModel.id
    ).join(
        ContentModel.categories
    ).options(
        selectinload(ContentModel.categories)
    ).filter(
        CategoryModel.id == category_id,
        ContentModel.deleted_at.is_(None),
        ContentModel.is_published == True
    ).order_by(ContentModel.created_at.desc()).all()

    # レスポンスを生成
    content_list = []
    for content, author_name in results:
        category_names = [cat.name for cat in content.categories if cat.deleted_at is None]
        if not category_names:
            category_names = ["未分類"]
        
        content_list.append(ContentResponse(
            id=content.id,
            title=content.title,
            content=content.content,
            categories=category_names,
            is_published=content.is_published,
            author_name=author_name,
            created_at=content.created_at,
            updated_at=content.updated_at
        ))
    
    return content_list