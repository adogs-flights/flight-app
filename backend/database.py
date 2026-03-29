from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Get DATABASE_URL from environment variable, with a default for development
DATABASE_URL = os.environ.get("DATABASE_URL")

# If DATABASE_URL is not set, default to local SQLite DB
if DATABASE_URL is None:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, "data", "flight.db")
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

    # Create data directory if it doesn't exist for the local DB
    db_dir = os.path.dirname(DB_PATH)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
else:
    SQLALCHEMY_DATABASE_URL = DATABASE_URL


engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()