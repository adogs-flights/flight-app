import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse # ✨ 추가
from fastapi.staticfiles import StaticFiles # ✨ 추가
from database import engine, Base
from routers import schedules, auth

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(schedules.router)

# --- ✨ 배포용 프론트엔드 정적 파일 서빙 ---
# 1. Vite가 빌드한 js, css 파일이 담긴 assets 폴더 마운트
if os.path.exists("static/assets"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

# 2. SPA(Single Page Application) 라우팅 처리
@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    # API 경로는 무시 (프론트엔드로 넘기지 않음)
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")
    
    # 루트에 있는 정적 파일(favicon.svg 등) 요청 시 반환
    file_path = os.path.join("static", full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    
    # 그 외 모든 요청은 React의 index.html로 연결
    index_file = os.path.join("static", "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    
    return {"detail": "Frontend not built yet."}