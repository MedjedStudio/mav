from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from presentation.api.auth_router import router as auth_router
from presentation.api.content_router import router as content_router
from presentation.api.category_router import router as category_router
from presentation.api.upload_router import router as upload_router
from presentation.api.backup_router import router as backup_router
from presentation.api.user_management_router import router as user_management_router
from config import settings

app = FastAPI(title="mav API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["content-disposition"],
)

app.include_router(auth_router, prefix="/auth", tags=["認証"])
app.include_router(content_router, prefix="/contents", tags=["コンテンツ"])
app.include_router(category_router, prefix="/categories", tags=["カテゴリ"])
app.include_router(upload_router, prefix="/uploads", tags=["アップロード"])
app.include_router(backup_router, tags=["バックアップ"])
app.include_router(user_management_router, tags=["ユーザー管理"])

# Static files are served through upload_router endpoints

if __name__ == "__main__":
    import uvicorn
    import os
    
    host = os.getenv("HOST")
    port = int(os.getenv("PORT") or 0)
    
    if not host:
        raise ValueError("HOST environment variable is required")
    if not port:
        raise ValueError("PORT environment variable is required")
    
    uvicorn.run(app, host=host, port=port)