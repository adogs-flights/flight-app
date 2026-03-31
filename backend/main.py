import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse 
from fastapi.staticfiles import StaticFiles 
from database import engine, Base
from routers import auth, tickets, ticket_applications, need_posts
from alembic.config import Config
from alembic import command

# --- ✨ Alembic 마이그레이션 자동 실행 ---
def run_migrations():
    try:
        # backend/alembic.ini 경로 설정
        # 현재 실행 위치가 backend 폴더이므로 'alembic.ini'를 찾음
        alembic_cfg = Config("alembic.ini")
        # 마이그레이션 실행 (최신 버전인 head로 업그레이드)
        command.upgrade(alembic_cfg, "head")
        print("Database migrations applied successfully via Alembic.")
    except Exception as e:
        print(f"Error applying migrations via Alembic: {e}")
        # 마이그레이션 실패 시에도 서비스는 띄울 수 있게 예외 처리

# 기존 테이블 생성 (Alembic이 관리하지 않는 초기 생성용)
Base.metadata.create_all(bind=engine)
# Alembic 마이그레이션 자동 실행
run_manual_migration_backup = False # 이전 방식 방지용 플래그 (옵션)
run_migrations()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(ticket_applications.router)
app.include_router(need_posts.router)

@app.get("/api/static/airlines")
async def get_airlines():
    from static_data import AIRLINES
    return AIRLINES

@app.get("/api/static/airports")
async def get_airports():
    from static_data import AIRPORTS
    return AIRPORTS

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