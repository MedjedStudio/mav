"""コンテンツ関連のビジネスロジック"""
from typing import List, Optional
from sqlalchemy.orm import Session, selectinload
from datetime import datetime

from infrastructure.models import ContentModel, CategoryModel, UserModel, UserRole


class ContentService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_content(
        self, 
        title: str, 
        content: str, 
        author_id: int, 
        category_ids: Optional[List[int]] = None, 
        is_published: bool = False
    ) -> ContentModel:
        """新規コンテンツ作成"""
        content_model = ContentModel(
            title=title,
            content=content,
            is_published=is_published,
            author_id=author_id
        )
        
        self.db.add(content_model)
        self.db.commit()
        self.db.refresh(content_model)
        
        # カテゴリを関連付け
        if category_ids:
            categories = self.db.query(CategoryModel).filter(
                CategoryModel.id.in_(category_ids),
                CategoryModel.deleted_at.is_(None)
            ).all()
            content_model.categories = categories
            self.db.commit()
            self.db.refresh(content_model)
        
        return content_model
    
    def get_content_by_id(self, content_id: int) -> Optional[ContentModel]:
        """IDでコンテンツを取得"""
        return self.db.query(ContentModel).options(
            selectinload(ContentModel.categories)
        ).filter(
            ContentModel.id == content_id,
            ContentModel.deleted_at.is_(None)
        ).first()
    
    def get_published_content_by_id(self, content_id: int) -> Optional[ContentModel]:
        """公開されたコンテンツをIDで取得"""
        return self.db.query(ContentModel).options(
            selectinload(ContentModel.categories)
        ).filter(
            ContentModel.id == content_id,
            ContentModel.deleted_at.is_(None),
            ContentModel.is_published == True
        ).first()
    
    def update_content(
        self,
        content_id: int,
        title: Optional[str] = None,
        content: Optional[str] = None,
        category_ids: Optional[List[int]] = None,
        is_published: Optional[bool] = None,
        current_user: UserModel = None
    ) -> ContentModel:
        """コンテンツ更新"""
        content_model = self.get_content_by_id(content_id)
        if not content_model:
            raise ValueError("コンテンツが見つかりません")
        
        # 権限チェック：管理者か作成者のみ編集可能
        if current_user.role != UserRole.ADMIN and content_model.author_id != current_user.id:
            raise ValueError("このコンテンツを編集する権限がありません")
        
        # 更新処理
        if title is not None:
            content_model.title = title
        if content is not None:
            content_model.content = content
        if is_published is not None:
            content_model.is_published = is_published
        
        # カテゴリ更新
        if category_ids is not None:
            if category_ids:
                categories = self.db.query(CategoryModel).filter(
                    CategoryModel.id.in_(category_ids),
                    CategoryModel.deleted_at.is_(None)
                ).all()
                content_model.categories = categories
            else:
                content_model.categories = []
        
        self.db.commit()
        self.db.refresh(content_model)
        
        return content_model
    
    def delete_content(self, content_id: int, current_user: UserModel) -> bool:
        """コンテンツ削除（論理削除）"""
        content_model = self.get_content_by_id(content_id)
        if not content_model:
            return False
        
        # 権限チェック：管理者か作成者のみ削除可能
        if current_user.role != UserRole.ADMIN and content_model.author_id != current_user.id:
            raise ValueError("このコンテンツを削除する権限がありません")
        
        content_model.deleted_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def get_all_contents_for_admin(self, current_user: UserModel) -> List[tuple]:
        """管理画面用コンテンツ一覧（権限に応じてフィルタリング）"""
        query = self.db.query(ContentModel, UserModel.username).join(
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
        
        return results
    
    def get_published_contents(self) -> List[tuple]:
        """公開コンテンツ一覧（一般ユーザー用）"""
        results = self.db.query(ContentModel, UserModel.username).join(
            UserModel, ContentModel.author_id == UserModel.id
        ).options(
            selectinload(ContentModel.categories)
        ).filter(
            ContentModel.deleted_at.is_(None),
            ContentModel.is_published == True
        ).order_by(ContentModel.created_at.desc()).all()
        
        return results
    
    def get_published_content_with_author(self, content_id: int) -> Optional[tuple]:
        """公開コンテンツを作者名付きで取得"""
        result = self.db.query(ContentModel, UserModel.username).join(
            UserModel, ContentModel.author_id == UserModel.id
        ).options(
            selectinload(ContentModel.categories)
        ).filter(
            ContentModel.id == content_id,
            ContentModel.deleted_at.is_(None),
            ContentModel.is_published == True
        ).first()
        
        return result
    
    def get_categories(self) -> List[str]:
        """カテゴリ一覧"""
        categories = self.db.query(CategoryModel.name).filter(
            CategoryModel.deleted_at.is_(None)
        ).all()
        return [cat[0] for cat in categories]
    
    @staticmethod
    def get_category_names(content_model: ContentModel) -> List[str]:
        """コンテンツのカテゴリ名を取得し、空の場合は「未分類」を返す"""
        category_names = [cat.name for cat in content_model.categories if cat.deleted_at is None]
        if not category_names:
            category_names = ["未分類"]
        return category_names