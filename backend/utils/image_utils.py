"""Image processing utilities for thumbnail generation."""
from PIL import Image
import os
from pathlib import Path
from typing import Dict, Optional, Tuple

# サムネイルサイズ設定
THUMBNAIL_SIZES = {
    'small': (150, 150),    # 小サイズ (_s)
    'medium': (400, 400),   # 中サイズ (_m)
    'large': None,          # 大サイズ (_l) - 原寸、JPG高画質圧縮
}

# サポートする画像形式
SUPPORTED_IMAGE_FORMATS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}


def is_image_file(filename: str) -> bool:
    """画像ファイルかどうかを判定"""
    return Path(filename).suffix.lower() in SUPPORTED_IMAGE_FORMATS


def generate_thumbnail_filename(original_filename: str, size_suffix: str) -> str:
    """サムネイルファイル名を生成（大サイズはJPG拡張子に統一）"""
    path = Path(original_filename)
    name = path.stem
    
    # 大サイズは常にJPG拡張子
    if size_suffix == 'l':
        return f"{name}_{size_suffix}.jpg"
    else:
        # 小・中サイズは元の拡張子を保持
        extension = path.suffix
        return f"{name}_{size_suffix}{extension}"


def create_thumbnails(image_path: Path, output_dir: Path) -> Dict[str, str]:
    """
    画像から複数サイズのサムネイルを生成
    
    Args:
        image_path: 元画像のパス
        output_dir: サムネイル保存先ディレクトリ
    
    Returns:
        生成されたサムネイルファイルのパス辞書
    """
    if not is_image_file(image_path.name):
        raise ValueError(f"Unsupported image format: {image_path}")
    
    try:
        with Image.open(image_path) as img:
            # 画像の向き情報を適用
            img = _fix_image_orientation(img)
            
            thumbnails = {}
            original_filename = image_path.name
            
            for size_name, dimensions in THUMBNAIL_SIZES.items():
                size_suffix = size_name[0]  # s, m, l
                thumbnail_filename = generate_thumbnail_filename(original_filename, size_suffix)
                thumbnail_path = output_dir / thumbnail_filename
                
                if size_name == 'large':
                    # 大サイズ: 原寸でJPG高画質圧縮
                    thumbnail = _create_large_thumbnail(img)
                    thumbnail.save(thumbnail_path, 'JPEG', optimize=True, quality=90)
                else:
                    # 小・中サイズ: リサイズ
                    width, height = dimensions
                    thumbnail = _create_thumbnail(img, width, height)
                    
                    # 元の形式を保持して保存
                    if img.format == 'PNG' or 'transparency' in img.info:
                        thumbnail.save(thumbnail_path, 'PNG', optimize=True)
                    else:
                        thumbnail.save(thumbnail_path, 'JPEG', optimize=True, quality=85)
                
                thumbnails[size_name] = thumbnail_filename
            
            return thumbnails
    
    except Exception as e:
        raise Exception(f"Failed to create thumbnails for {image_path}: {str(e)}")


def _fix_image_orientation(img: Image.Image) -> Image.Image:
    """EXIF情報に基づいて画像の向きを修正"""
    try:
        from PIL.ExifTags import ORIENTATION
        
        if hasattr(img, '_getexif'):
            exif = img._getexif()
            if exif is not None:
                orientation = exif.get(ORIENTATION)
                if orientation == 3:
                    img = img.rotate(180, expand=True)
                elif orientation == 6:
                    img = img.rotate(270, expand=True)
                elif orientation == 8:
                    img = img.rotate(90, expand=True)
    except Exception:
        # EXIF処理でエラーが発生した場合は元画像をそのまま使用
        pass
    
    return img


def _create_thumbnail(img: Image.Image, width: int, height: int) -> Image.Image:
    """アスペクト比を保持してサムネイル作成"""
    # 元画像のサイズ
    original_width, original_height = img.size
    
    # 指定サイズより小さい場合はそのまま
    if original_width <= width and original_height <= height:
        return img.copy()
    
    # アスペクト比を保持してリサイズ
    img_copy = img.copy()
    img_copy.thumbnail((width, height), Image.Resampling.LANCZOS)
    
    return img_copy


def _create_large_thumbnail(img: Image.Image) -> Image.Image:
    """大サイズサムネイル作成（原寸、RGB変換）"""
    # RGB変換（JPG保存のため）
    if img.mode in ('RGBA', 'LA', 'P'):
        # 透明度がある場合は白背景に合成
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
        return background
    elif img.mode != 'RGB':
        return img.convert('RGB')
    else:
        return img.copy()


def get_thumbnail_path(original_filename: str, size: str, base_dir: Path) -> Optional[Path]:
    """
    サムネイルのパスを取得
    
    Args:
        original_filename: 元ファイル名
        size: サムネイルサイズ ('small', 'medium', 'large')
        base_dir: ベースディレクトリ
    
    Returns:
        サムネイルのパス（存在しない場合はNone）
    """
    if size not in THUMBNAIL_SIZES:
        return None
    
    size_suffix = size[0]  # s, m, l
    thumbnail_filename = generate_thumbnail_filename(original_filename, size_suffix)
    thumbnail_path = base_dir / thumbnail_filename
    
    return thumbnail_path if thumbnail_path.exists() else None


def cleanup_thumbnails(original_filename: str, base_dir: Path) -> None:
    """元画像に関連するサムネイルを削除"""
    for size_name in THUMBNAIL_SIZES.keys():
        size_suffix = size_name[0]
        thumbnail_filename = generate_thumbnail_filename(original_filename, size_suffix)
        thumbnail_path = base_dir / thumbnail_filename
        
        if thumbnail_path.exists():
            try:
                thumbnail_path.unlink()
            except Exception:
                pass  # 削除に失敗しても継続