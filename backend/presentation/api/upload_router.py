from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
import os
import uuid
from pathlib import Path
from presentation.api.auth_router import require_admin
from infrastructure.persistence.models import UserModel

router = APIRouter()

# アップロード先ディレクトリ
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# 許可する画像ファイル形式
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@router.get("/")
async def list_files(current_user: UserModel = Depends(require_admin)):
    """アップロードされたファイル一覧を取得"""
    try:
        files = []
        if UPLOAD_DIR.exists():
            for file_path in UPLOAD_DIR.iterdir():
                if file_path.is_file():
                    stat = file_path.stat()
                    # 元のファイル名を推測（UUID部分を除去）
                    filename = file_path.name
                    if "_" in filename:
                        # UUID_元ファイル名.拡張子 の形式から元ファイル名を抽出
                        original_name_part = filename.split("_", 1)[1] if "_" in filename else filename
                        # URLデコードして元のファイル名を取得
                        import urllib.parse
                        try:
                            original_filename = urllib.parse.unquote(original_name_part)
                        except:
                            original_filename = original_name_part
                    else:
                        original_filename = filename
                    
                    files.append({
                        "id": hash(file_path.name) % 10000,
                        "filename": filename,
                        "original_filename": original_filename,
                        "file_size": stat.st_size,
                        "mime_type": "image/jpeg",
                        "url": f"/uploads/{filename}",
                        "created_at": "2025-08-25T12:00:00",
                        "uploader": current_user.username
                    })
        return sorted(files, key=lambda x: x["filename"], reverse=True)
    except Exception as e:
        print(f"Error in list_files: {e}")
        return []

@router.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(require_admin)
):
    """画像ファイルをアップロード"""
    
    # ファイル拡張子チェック
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"サポートされていないファイル形式です。許可される形式: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # ファイルサイズチェック
    file_size = 0
    content = await file.read()
    file_size = len(content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"ファイルサイズが大きすぎます。最大サイズ: {MAX_FILE_SIZE / (1024 * 1024):.1f}MB"
        )
    
    # ユニークなファイル名を生成（元ファイル名を保持）
    import urllib.parse
    safe_original_name = urllib.parse.quote(Path(file.filename).stem, safe='')
    unique_filename = f"{uuid.uuid4()}_{safe_original_name}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    try:
        # ファイルを保存
        with open(file_path, "wb") as buffer:
            buffer.write(content)
        
        return {
            "filename": unique_filename,
            "original_filename": file.filename,
            "url": f"/uploads/{unique_filename}",
            "size": file_size
        }
    
    except Exception as e:
        # ファイル保存に失敗した場合、物理ファイルも削除
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"ファイル保存に失敗しました: {str(e)}")

@router.get("/{filename:path}")
async def get_image(filename: str):
    """アップロードされた画像を取得"""
    import urllib.parse
    
    # ディレクトリトラバーサル攻撃を防ぐ
    if ".." in filename:
        raise HTTPException(status_code=400, detail="不正なファイル名です")
    
    # まず、ファイル名をそのまま試す
    file_path = UPLOAD_DIR / filename
    
    # ファイルが存在しない場合、URLデコードを試す
    if not file_path.exists():
        try:
            decoded_filename = urllib.parse.unquote(filename)
            file_path = UPLOAD_DIR / decoded_filename
        except:
            pass
    
    # それでも見つからない場合、アップロードディレクトリ内の全ファイルから検索
    if not file_path.exists():
        if UPLOAD_DIR.exists():
            for existing_file in UPLOAD_DIR.iterdir():
                if existing_file.name == filename:
                    file_path = existing_file
                    break
                # URLエンコードされたファイル名との一致も確認
                try:
                    if urllib.parse.quote(existing_file.name) == filename:
                        file_path = existing_file
                        break
                    if urllib.parse.unquote(existing_file.name) == filename:
                        file_path = existing_file
                        break
                except:
                    continue
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")
    
    return FileResponse(file_path)

@router.delete("/{filename}")
async def delete_file(
    filename: str,
    current_user: UserModel = Depends(require_admin)
):
    """アップロードされたファイルを削除"""
    import urllib.parse
    
    # まず、ファイル名をそのまま試す
    file_path = UPLOAD_DIR / filename
    
    # ファイルが存在しない場合、URLデコードを試す
    if not file_path.exists():
        try:
            decoded_filename = urllib.parse.unquote(filename)
            file_path = UPLOAD_DIR / decoded_filename
        except:
            pass
    
    # それでも見つからない場合、アップロードディレクトリ内の全ファイルから検索
    if not file_path.exists():
        if UPLOAD_DIR.exists():
            for existing_file in UPLOAD_DIR.iterdir():
                if existing_file.name == filename:
                    file_path = existing_file
                    break
                # URLエンコードされたファイル名との一致も確認
                try:
                    if urllib.parse.quote(existing_file.name) == filename:
                        file_path = existing_file
                        break
                    if urllib.parse.unquote(existing_file.name) == filename:
                        file_path = existing_file
                        break
                except:
                    continue
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")
    
    try:
        os.remove(file_path)
        return {"message": "ファイルを削除しました"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ファイル削除に失敗しました: {str(e)}")