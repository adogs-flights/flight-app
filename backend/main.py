import os
import sys

from alembic.config import Config
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from alembic import command
from database import Base, engine, get_db
from routers import auth, need_posts, ticket_applications, tickets, master
import models
from sqlalchemy.orm import Session

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

# --- ✨ 초기 데이터 시딩 (Initial Seeding) ---
def seed_data(db: Session):
    # 항공사 시딩
    from static_data import AIRLINES
    for air in AIRLINES:
        exists = db.query(models.Airline).filter(models.Airline.code == air["value"]).first()
        if not exists:
            # "대한항공 (Korean Air)" -> "대한항공"
            name = air["label"].split(" (")[0]
            db.add(models.Airline(code=air["value"], name=name))
    
    # 공항 시딩
    from static_data import AIRPORTS
    # airportUtils.js의 색상 및 국가 정보 반영
    AIRPORT_EXTRA = {
        'JFK': {'country': '미국', 'bg': '#e0f2fe', 'text': '#0369a1'},
        'LAX': {'country': '미국', 'bg': '#fef3c7', 'text': '#92400e'},
        'ORD': {'country': '미국', 'bg': '#ede9fe', 'text': '#7c3aed'},
        'YVR': {'country': '캐나다', 'bg': '#fee2e2', 'text': '#dc2626'},
        'YYZ': {'country': '캐나다', 'bg': '#dcfce7', 'text': '#16a34a'}
    }
    
    for port in AIRPORTS:
        code = port["value"]
        exists = db.query(models.Airport).filter(models.Airport.code == code).first()
        if not exists:
            extra = AIRPORT_EXTRA.get(code, {'country': '기타', 'bg': '#f1f5f9', 'text': '#475569'})
            db.add(models.Airport(
                code=code,
                name=port["label"],
                country=extra['country'],
                bg_color=extra['bg'],
                text_color=extra['text']
            ))
    db.commit()

# --- ✨ Alembic 마이그레이션 자동 실행 ---
def run_migrations() -> None:
    try:
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")
            
        print("Database schema verified and migrations synced successfully.")
    except Exception as e:
        print(f"Error during database initialization: {e}")

# 마이그레이션 실행
run_migrations()

# 초기 데이터 시딩 실행
with Session(engine) as db:
    seed_data(db)

app = FastAPI(
    title="해봉티켓 API",
    description="보안이 강화된 이동봉사 일정 관리 API",
    version="1.4.0"
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
app.include_router(master.router)

@app.get("/api/static/airlines")
async def get_airlines(db: Session = Depends(get_db)):
    airlines = db.query(models.Airline).filter(models.Airline.is_active == True).all()
    return [{"value": a.code, "label": a.name} for a in airlines]

@app.get("/api/static/airports")
async def get_airports(db: Session = Depends(get_db)):
    airports = db.query(models.Airport).filter(models.Airport.is_active == True).all()
    return [{"value": a.code, "label": a.name} for a in airports]

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
