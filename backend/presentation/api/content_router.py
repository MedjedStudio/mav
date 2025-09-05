from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from infrastructure.database import get_db
from infrastructure.models import UserModel
from presentation.api.auth_router import get_current_user, require_admin, require_authenticated
from presentation.schemas.content_schemas import ContentCreate, ContentUpdate, ContentResponse
from services.content_service import ContentService

router = APIRouter()

# 認証済みユーザー: コンテンツ作成
@router.post("/", response_model=ContentResponse)
def create_content(
    request: ContentCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_authenticated)
):
    content_service = ContentService(db)
    
    try:
        content = content_service.create_content(
            title=request.title,
            content=request.content,
            author_id=current_user.id,
            category_ids=request.category_ids,
            is_published=getattr(request, 'is_published', False)
        )
        
        # カテゴリ名を取得
        category_names = ContentService.get_category_names(content)
        
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
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="コンテンツの作成に失敗しました"
        )

# 認証済みユーザー: コンテンツ更新
@router.put("/{content_id}", response_model=ContentResponse)
def update_content(
    content_id: int,
    request: ContentUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_authenticated)
):
    content_service = ContentService(db)
    
    try:
        content = content_service.update_content(
            content_id=content_id,
            title=request.title,
            content=request.content,
            category_ids=request.category_ids,
            is_published=getattr(request, 'is_published', None),
            current_user=current_user
        )
        
        # カテゴリ名を取得
        category_names = ContentService.get_category_names(content)
        
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
        
    except ValueError as e:
        # ビジネスルール違反やデータ不整合
        if "権限" in str(e):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e)
            )
        elif "見つかりません" in str(e):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="コンテンツの更新に失敗しました"
        )

# 認証済みユーザー: コンテンツ削除（論理削除）
@router.delete("/{content_id}")
def delete_content(
    content_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_authenticated)
):
    content_service = ContentService(db)
    
    try:
        result = content_service.delete_content(content_id, current_user)
        
        if result:
            return {"message": "コンテンツを削除しました"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="コンテンツが見つかりません"
            )
            
    except ValueError as e:
        # ビジネスルール違反やデータ不整合
        if "権限" in str(e):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e)
            )
        elif "見つかりません" in str(e):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="コンテンツの削除に失敗しました"
        )

# 認証済みユーザー: 全コンテンツ一覧（管理画面用）
@router.get("/admin", response_model=List[ContentResponse])
def get_all_contents_admin(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_authenticated)
):
    content_service = ContentService(db)
    
    try:
        # コンテンツ一覧を取得（権限に応じてフィルタリング）
        results = content_service.get_all_contents_for_admin(current_user)
        
        # エンティティをレスポンスに変換
        result_list = []
        for content, author_name in results:
            # カテゴリ名を取得
            category_names = ContentService.get_category_names(content)
            # レスポンスに変換
            content_response = ContentResponse(
                id=content.id,
                title=content.title,
                content=content.content,
                categories=category_names,
                is_published=content.is_published,
                author_name=author_name,
                created_at=content.created_at,
                updated_at=content.updated_at
            )
            result_list.append(content_response)
        
        return result_list
        
    except ValueError as e:
        if "アクセス" in str(e):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="コンテンツ一覧の取得に失敗しました"
        )

# 公開: カテゴリ一覧
@router.get("/categories", response_model=List[str])
def get_categories(db: Session = Depends(get_db)):
    content_service = ContentService(db)
    
    try:
        return content_service.get_categories()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="カテゴリ一覧の取得に失敗しました"
        )

# 公開: 全コンテンツ一覧（一般ユーザー用）
@router.get("/", response_model=List[ContentResponse])
def get_contents(db: Session = Depends(get_db)):
    content_service = ContentService(db)
    
    try:
        # 公開されたコンテンツ一覧を取得
        results = content_service.get_published_contents()
        
        # エンティティをレスポンスに変換
        result_list = []
        for content, author_name in results:
            # カテゴリ名を取得
            category_names = ContentService.get_category_names(content)
            # レスポンスに変換
            content_response = ContentResponse(
                id=content.id,
                title=content.title,
                content=content.content,
                categories=category_names,
                is_published=content.is_published,
                author_name=author_name,
                created_at=content.created_at,
                updated_at=content.updated_at
            )
            result_list.append(content_response)
        
        return result_list
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="コンテンツ一覧の取得に失敗しました"
        )

# 公開: 個別コンテンツ取得
@router.get("/{content_id}", response_model=ContentResponse)
def get_content(content_id: int, db: Session = Depends(get_db)):
    content_service = ContentService(db)
    
    try:
        # 公開されたコンテンツを取得
        result = content_service.get_published_content_with_author(content_id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="コンテンツが見つかりません"
            )
        
        content, author_name = result
        
        # カテゴリ名を取得
        category_names = ContentService.get_category_names(content)
        
        # エンティティをレスポンスに変換
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
        
    except HTTPException:
        # HTTPExceptionは再スロー
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="コンテンツの取得に失敗しました"
        )