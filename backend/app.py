from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from presentation.api import user_router
from presentation.api.auth_router import router as auth_router
from presentation.api.content_router import router as content_router
from presentation.api.category_router import router as category_router
from presentation.api.upload_router import router as upload_router
from presentation.api.backup_router_simple import router as backup_router
from config import settings

app = FastAPI(title="MAV API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|192\.168\.1\.\d+):(3000|5173|8000)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["content-disposition"],
)

app.include_router(user_router)
app.include_router(auth_router, prefix="/auth", tags=["認証"])
app.include_router(content_router, prefix="/contents", tags=["コンテンツ"])
app.include_router(category_router, prefix="/categories", tags=["カテゴリ"])
app.include_router(upload_router, prefix="/uploads", tags=["アップロード"])
app.include_router(backup_router, prefix="/backup", tags=["バックアップ"])

# Static files are served through upload_router endpoints

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)