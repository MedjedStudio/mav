from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from presentation.api import user_router
from presentation.api.auth_router import router as auth_router
from presentation.api.content_router import router as content_router
from presentation.api.category_router import router as category_router

app = FastAPI(title="MAV CMS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(user_router)
app.include_router(auth_router, prefix="/auth", tags=["認証"])
app.include_router(content_router, prefix="/contents", tags=["コンテンツ"])
app.include_router(category_router, prefix="/categories", tags=["カテゴリ"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)