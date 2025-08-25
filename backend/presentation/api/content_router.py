from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from infrastructure.persistence.database import get_db
from infrastructure.persistence.models import ContentModel, UserModel, CategoryModel
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
    
    # カテゴリを関連付け
    if request.category_ids:
        categories = db.query(CategoryModel).filter(
            CategoryModel.id.in_(request.category_ids),
            CategoryModel.deleted_at.is_(None)
        ).all()
        content.categories = categories
    else:
        # デフォルトカテゴリ（未分類）を設定
        default_category = db.query(CategoryModel).filter(
            CategoryModel.name == "未分類",
            CategoryModel.deleted_at.is_(None)
        ).first()
        if default_category:
            content.categories = [default_category]
    
    db.commit()
    db.refresh(content)
    
    # カテゴリ名を含むレスポンスを生成
    category_names = [cat.name for cat in content.categories if cat.deleted_at is None]
    
    return ContentResponse(
        id=content.id,
        title=content.title,
        content=content.content,
        categories=category_names,
        created_at=content.created_at,
        updated_at=content.updated_at
    )

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
    if request.category_ids is not None:
        # カテゴリを更新
        if request.category_ids:
            categories = db.query(CategoryModel).filter(
                CategoryModel.id.in_(request.category_ids),
                CategoryModel.deleted_at.is_(None)
            ).all()
            content.categories = categories
        else:
            content.categories = []
    
    db.commit()
    db.refresh(content)
    
    # カテゴリ名を含むレスポンスを生成
    category_names = [cat.name for cat in content.categories if cat.deleted_at is None]
    
    return ContentResponse(
        id=content.id,
        title=content.title,
        content=content.content,
        categories=category_names,
        created_at=content.created_at,
        updated_at=content.updated_at
    )

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
    contents = db.query(ContentModel).options(
        selectinload(ContentModel.categories)
    ).filter(
        ContentModel.deleted_at.is_(None)
    ).order_by(ContentModel.created_at.desc()).all()
    
    # カテゴリ名を含むレスポンスを生成
    result = []
    for content in contents:
        category_names = [cat.name for cat in content.categories if cat.deleted_at is None]
        
        result.append(ContentResponse(
            id=content.id,
            title=content.title,
            content=content.content,
            categories=category_names,
            created_at=content.created_at,
            updated_at=content.updated_at
        ))
    
    return result

# 公開: カテゴリ一覧
@router.get("/categories", response_model=List[str])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(CategoryModel.name).filter(
        CategoryModel.deleted_at.is_(None)
    ).all()
    return [cat[0] for cat in categories]

# 公開: コンテンツ一覧（一般ユーザー用）
@router.get("/", response_model=List[ContentResponse])
def get_contents(
    category: Optional[str] = Query(None, description="カテゴリでフィルタ"), 
    db: Session = Depends(get_db)
):
    query = db.query(ContentModel).options(
        selectinload(ContentModel.categories)
    ).filter(
        ContentModel.deleted_at.is_(None)
    )
    
    if category:
        # カテゴリ名でフィルタ（多対多関係）
        category_obj = db.query(CategoryModel).filter(
            CategoryModel.name == category,
            CategoryModel.deleted_at.is_(None)
        ).first()
        if category_obj:
            query = query.join(ContentModel.categories).filter(
                CategoryModel.id == category_obj.id
            )
    
    contents = query.order_by(ContentModel.created_at.desc()).all()
    
    # カテゴリ名を含むレスポンスを生成
    result = []
    for content in contents:
        category_names = [cat.name for cat in content.categories if cat.deleted_at is None]
        
        result.append(ContentResponse(
            id=content.id,
            title=content.title,
            content=content.content,
            categories=category_names,
            created_at=content.created_at,
            updated_at=content.updated_at
        ))
    
    return result

# 公開: 個別コンテンツ取得
@router.get("/{content_id}", response_model=ContentResponse)
def get_content(content_id: int, db: Session = Depends(get_db)):
    content = db.query(ContentModel).options(
        selectinload(ContentModel.categories)
    ).filter(
        ContentModel.id == content_id,
        ContentModel.deleted_at.is_(None)
    ).first()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="コンテンツが見つかりません"
        )
    
    category_names = [cat.name for cat in content.categories if cat.deleted_at is None]
    
    return ContentResponse(
        id=content.id,
        title=content.title,
        content=content.content,
        categories=category_names,
        created_at=content.created_at,
        updated_at=content.updated_at
    )