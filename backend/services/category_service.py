"""カテゴリ関連のビジネスロジック"""
from typing import List, Optional
from sqlalchemy.orm import Session, selectinload
from datetime import datetime

from infrastructure.models import CategoryModel, ContentModel, UserModel


class CategoryService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_category(self, name: str, description: Optional[str] = None) -> CategoryModel:
        """新規カテゴリ作成"""
        # カテゴリ名の重複チェック
        existing_category = self.db.query(CategoryModel).filter(
            CategoryModel.name == name,
            CategoryModel.deleted_at.is_(None)
        ).first()
        if existing_category:
            raise ValueError("このカテゴリ名は既に存在します")
        
        category = CategoryModel(
            name=name,
            description=description
        )
        
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        
        return category
    
    def get_category_by_id(self, category_id: int) -> Optional[CategoryModel]:
        """IDでカテゴリを取得"""
        return self.db.query(CategoryModel).filter(
            CategoryModel.id == category_id,
            CategoryModel.deleted_at.is_(None)
        ).first()
    
    def update_category(
        self, 
        category_id: int, 
        name: Optional[str] = None, 
        description: Optional[str] = None
    ) -> CategoryModel:
        """カテゴリ更新"""
        category = self.get_category_by_id(category_id)
        if not category:
            raise ValueError("カテゴリが見つかりません")
        
        # カテゴリ名の重複チェック（自分以外）
        if name and name != category.name:
            existing_category = self.db.query(CategoryModel).filter(
                CategoryModel.name == name,
                CategoryModel.deleted_at.is_(None),
                CategoryModel.id != category_id
            ).first()
            if existing_category:
                raise ValueError("このカテゴリ名は既に存在します")
        
        # 更新処理
        if name is not None:
            category.name = name
        if description is not None:
            category.description = description
        
        self.db.commit()
        self.db.refresh(category)
        
        return category
    
    def delete_category(self, category_id: int) -> bool:
        """カテゴリ削除（論理削除）"""
        category = self.get_category_by_id(category_id)
        if not category:
            return False
        
        # このカテゴリを使用している記事から関連付けを削除（未分類になる）
        for content in category.contents:
            content.categories.remove(category)
        
        category.deleted_at = datetime.utcnow()
        self.db.commit()
        
        return True
    
    def get_all_categories(self) -> List[CategoryModel]:
        """全カテゴリ一覧取得"""
        return self.db.query(CategoryModel).filter(
            CategoryModel.deleted_at.is_(None)
        ).order_by(CategoryModel.name).all()
    
    def get_category_contents(self, category_id: int) -> List[tuple]:
        """特定カテゴリのコンテンツ一覧取得"""
        # カテゴリが存在するかチェック
        category = self.get_category_by_id(category_id)
        if not category:
            raise ValueError("カテゴリが見つかりません")
        
        # カテゴリに属する公開コンテンツを取得
        results = self.db.query(ContentModel, UserModel.username).join(
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
        
        return results