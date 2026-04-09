import os
import sys

from alembic.config import Config
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from alembic import command
from database import Base, engine
from routers import auth, need_posts, ticket_applications, tickets

# --- 🔒 필수 환경변수 검증 ---
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    if os.environ.get("ENV") == "production":
        print("CRITICAL: SECRET_KEY environment variable is NOT SET in production!")
        sys.exit(1)
    else:
        print("WARNING: SECRET_KEY is not set. Using default for development.")
        SECRET_KEY = "super-secret-key-for-dev"

# CORS 허용 도메인 설정
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*").split(",")

# --- ✨ Alembic 마이그레이션 자동 실행 ---
def run_migrations() -> None:
    try:
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
        print("Database migrations applied successfully via Alembic.")
    except Exception as e:
        print(f"Error applying migrations via Alembic: {e}")

# 기존 테이블 생성 (Alembic이 관리하지 않는 초기 생성용)
Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(
    title="해봉티켓 API",
    description="보안이 강화된 이동봉사 일정 관리 API",
    version="1.3.0"
)

# --- 🔒 전역 에러 핸들러 (보안 강화) ---
if os.environ.get("ENV") == "production":
    @app.exception_handler(Exception)
    async def global_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={"detail": "서버 내부 오류가 발생했습니다. 관리자에게 문의하세요."},
        )

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tickets.router)
app.include_router(ticket_applications.router)
app.include_router(need_posts.router)

@app.get("/api/static/airlines")
async def get_airlines() -> list[str]:
    from static_data import AIRLINES
    return AIRLINES

@app.get("/api/static/airports")
async def get_airports() -> list[dict[str, str]]:
    from static_data import AIRPORTS
    return AIRPORTS

# --- ✨ 배포용 프론트엔드 정적 파일 서빙 ---
if os.path.exists("static/assets"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

@app.get("/{full_path:path}", response_model=None)
async def serve_spa(full_path: str) -> FileResponse | dict[str, str]:
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")

    file_path = os.path.join("static", full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)

    index_file = os.path.join("static", "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)

    return {"detail": "Frontend not built yet."}
