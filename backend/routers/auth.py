from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import bcrypt # ✨ passlib 대신 bcrypt를 직접 import 합니다.
import jwt
import datetime

import models, schemas
from database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = "super-secret-key-mvp" 

@router.post("/signup")
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
    
    # ✨ bcrypt를 사용한 안전한 암호화 (문자열을 byte로 변환 후 해싱)
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), salt).decode('utf-8')
    
    db_user = models.User(
        username=user.username, 
        password_hash=hashed_password, 
        org_name=user.org_name,
        phone_number=user.phone_number 
    )
    db.add(db_user)
    db.commit()
    return {"message": "회원가입 성공!"}

@router.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    
    # ✨ bcrypt를 사용한 비밀번호 검증
    if not db_user or not bcrypt.checkpw(user.password.encode('utf-8'), db_user.password_hash.encode('utf-8')):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 틀렸습니다.")
    
    payload = {
        "sub": db_user.username,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    
    return {
        "access_token": token, 
        "org_name": db_user.org_name,
        "phone_number": db_user.phone_number 
    }