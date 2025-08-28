from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func
from infrastructure.persistence.database import get_db
from infrastructure.persistence.models import ContentModel, UserModel, CategoryModel
from presentation.api.auth_router import get_current_user, require_admin, require_authenticated
from presentation.schemas.content_schemas import ContentCreate, ContentUpdate, ContentResponse

router = APIRouter()

def get_category_names(content):
    """コンテンツのカテゴリ名を取得し、空の場合は「未分類」を返す"""
    category_names = [cat.name for cat in content.categories if cat.deleted_at is None]
    if not category_names:
        category_names = ["未分類"]
    return category_names

# 認証済みユーザー: コンテンツ作成
@router.post("/", response_model=ContentResponse)
def create_content(
    request: ContentCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_authenticated)
):
    content = ContentModel(
        title=request.title,
        content=request.content,
        is_published=getattr(request, 'is_published', False),
        author_id=current_user.id
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
    # カテゴリが指定されていない場合は何もしない（未分類として扱う）
    
    db.commit()
    db.refresh(content)
    
    # カテゴリ名を含むレスポンスを生成
    category_names = get_category_names(content)
    
    return ContentResponse(
        id=content.id,
        title=content.title,
        content=content.content,
        categories=category_names,
        is_published=content.is_published,
        author_name=current_user.username,
        created_at=content.created_at,
        updated_at=content.updated_at
    )

# 認証済みユーザー: コンテンツ更新
@router.put("/{content_id}", response_model=ContentResponse)
def update_content(
    content_id: int,
    request: ContentUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_authenticated)
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
    
    # 権限チェック：管理者か作成者のみ編集可能
    from infrastructure.persistence.models import UserRole
    if current_user.role != UserRole.ADMIN and content.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このコンテンツを編集する権限がありません"
        )
    
    if request.title is not None:
        content.title = request.title
    if request.content is not None:
        content.content = request.content
    if hasattr(request, 'is_published') and request.is_published is not None:
        content.is_published = request.is_published
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
    category_names = get_category_names(content)
    
    return ContentResponse(
        id=content.id,
        title=content.title,
        content=content.content,
        categories=category_names,
        is_published=content.is_published,
        author_name=current_user.username,
        created_at=content.created_at,
        updated_at=content.updated_at
    )

# 認証済みユーザー: コンテンツ削除（論理削除）
@router.delete("/{content_id}")
def delete_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_authenticated)
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
    
    # 権限チェック：管理者か作成者のみ削除可能
    from infrastructure.persistence.models import UserRole
    if current_user.role != UserRole.ADMIN and content.author_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このコンテンツを削除する権限がありません"
        )
    
    from datetime import datetime
    content.deleted_at = datetime.utcnow()
    db.commit()
    return {"message": "コンテンツを削除しました"}

# 認証済みユーザー: 全コンテンツ一覧（管理画面用）
@router.get("/admin", response_model=List[ContentResponse])
def get_all_contents_admin(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_authenticated)
):
    from infrastructure.persistence.models import UserRole
    
    query = db.query(ContentModel, UserModel.username).join(
        UserModel, ContentModel.author_id == UserModel.id
    ).options(
        selectinload(ContentModel.categories)
    ).filter(
        ContentModel.deleted_at.is_(None)
    )
    
    # 権限に応じたフィルタリング
    if current_user.role == UserRole.ADMIN:
        # 管理者は全てのコンテンツを表示
        results = query.order_by(ContentModel.created_at.desc()).all()
    else:
        # メンバーは自分のコンテンツのみ表示
        results = query.filter(
            ContentModel.author_id == current_user.id
        ).order_by(ContentModel.created_at.desc()).all()
    
    # カテゴリ名を含むレスポンスを生成
    result = []
    for content, author_name in results:
        category_names = get_category_names(content)
        
        result.append(ContentResponse(
            id=content.id,
            title=content.title,
            content=content.content,
            categories=category_names,
            is_published=content.is_published,
            author_name=author_name,
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

# 公開: 全コンテンツ一覧（一般ユーザー用）
@router.get("/", response_model=List[ContentResponse])
def get_contents(db: Session = Depends(get_db)):
    results = db.query(ContentModel, UserModel.username).join(
        UserModel, ContentModel.author_id == UserModel.id
    ).options(
        selectinload(ContentModel.categories)
    ).filter(
        ContentModel.deleted_at.is_(None),
        ContentModel.is_published == True
    ).order_by(ContentModel.created_at.desc()).all()
    
    # カテゴリ名を含むレスポンスを生成
    result = []
    for content, author_name in results:
        category_names = get_category_names(content)
        
        result.append(ContentResponse(
            id=content.id,
            title=content.title,
            content=content.content,
            categories=category_names,
            is_published=content.is_published,
            author_name=author_name,
            created_at=content.created_at,
            updated_at=content.updated_at
        ))
    
    return result

# 公開: 個別コンテンツ取得
@router.get("/{content_id}", response_model=ContentResponse)
def get_content(content_id: int, db: Session = Depends(get_db)):
    result = db.query(ContentModel, UserModel.username).join(
        UserModel, ContentModel.author_id == UserModel.id
    ).options(
        selectinload(ContentModel.categories)
    ).filter(
        ContentModel.id == content_id,
        ContentModel.deleted_at.is_(None),
        ContentModel.is_published == True
    ).first()
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="コンテンツが見つかりません"
        )
    
    content, author_name = result
    category_names = [cat.name for cat in content.categories if cat.deleted_at is None]
    
    return ContentResponse(
        id=content.id,
        title=content.title,
        content=content.content,
        categories=category_names,
        is_published=content.is_published,
        author_name=author_name,
        created_at=content.created_at,
        updated_at=content.updated_at
    )