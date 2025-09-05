from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from infrastructure.database import get_db
from infrastructure.models import UserModel
from presentation.api.auth_router import require_admin
from presentation.schemas.category_schemas import CategoryCreate, CategoryUpdate, CategoryResponse
from presentation.schemas.content_schemas import ContentResponse
from services.category_service import CategoryService

router = APIRouter()

# 管理者専用: カテゴリ作成
@router.post("/", response_model=CategoryResponse)
def create_category(
    request: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    category_service = CategoryService(db)
    
    try:
        category = category_service.create_category(
            name=request.name,
            description=request.description
        )
        return category
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# 管理者: カテゴリ並び順変更（パスパラメーターより前に定義）
@router.put("/sort-order", dependencies=[Depends(require_admin)])
async def update_category_sort_orders(
    orders: List[dict],
    db: Session = Depends(get_db)
):
    """カテゴリの並び順を変更"""
    category_service = CategoryService(db)
    
    try:
        result = category_service.update_category_sort_orders(orders)
        if result:
            return {"message": "並び順を更新しました"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="並び順の更新に失敗しました"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"並び順更新エラー: {str(e)}"
        )

# 管理者専用: カテゴリ更新
@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    request: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    category_service = CategoryService(db)
    
    try:
        category = category_service.update_category(
            category_id=category_id,
            name=request.name,
            description=request.description
        )
        return category
    except ValueError as e:
        if "見つかりません" in str(e):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )

# 管理者専用: カテゴリ削除（論理削除）
@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    category_service = CategoryService(db)
    
    try:
        result = category_service.delete_category(category_id)
        if result:
            return {"message": "カテゴリを削除しました"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="カテゴリが見つかりません"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# 公開: カテゴリ一覧
@router.get("/", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    category_service = CategoryService(db)
    categories = category_service.get_all_categories()
    return categories

# 公開: 特定カテゴリのコンテンツ一覧
@router.get("/{category_id}/contents", response_model=List[ContentResponse])
def get_category_contents(
    category_id: int,
    db: Session = Depends(get_db)
):
    from services.content_service import ContentService
    
    category_service = CategoryService(db)
    content_service = ContentService(db)
    
    try:
        # カテゴリの存在確認とコンテンツ取得
        results = category_service.get_category_contents(category_id)
        
        # レスポンスを生成
        content_list = []
        for content, author_name in results:
            category_names = ContentService.get_category_names(content)
            
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
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )