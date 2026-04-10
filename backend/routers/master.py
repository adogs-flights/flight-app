from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from routers.auth import AdminUser

router = APIRouter(
    prefix="/api/master",
    tags=["master"]
)

# --- Airport API ---

@router.get("/airports", response_model=List[schemas.Airport])
def get_airports(db: Session = Depends(get_db)):
    return db.query(models.Airport).order_by(models.Airport.code).all()

@router.post("/airports", response_model=schemas.Airport)
def create_airport(
    airport: schemas.AirportCreate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = None
):
    db_airport = models.Airport(**airport.model_dump())
    db.add(db_airport)
    try:
        db.commit()
        db.refresh(db_airport)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="이미 존재하는 공항 코드입니다.")
    return db_airport

@router.put("/airports/{airport_id}", response_model=schemas.Airport)
def update_airport(
    airport_id: int,
    airport_update: schemas.AirportUpdate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = None
):
    db_airport = db.query(models.Airport).filter(models.Airport.id == airport_id).first()
    if not db_airport:
        raise HTTPException(status_code=404, detail="공항을 찾을 수 없습니다.")
    
    update_data = airport_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_airport, key, value)
    
    db.commit()
    db.refresh(db_airport)
    return db_airport

@router.delete("/airports/{airport_id}")
def delete_airport(
    airport_id: int,
    db: Session = Depends(get_db),
    current_admin: AdminUser = None
):
    db_airport = db.query(models.Airport).filter(models.Airport.id == airport_id).first()
    if not db_airport:
        raise HTTPException(status_code=404, detail="공항을 찾을 수 없습니다.")
    db.delete(db_airport)
    db.commit()
    return {"detail": "공항이 삭제되었습니다."}

# --- Airline API ---

@router.get("/airlines", response_model=List[schemas.Airline])
def get_airlines(db: Session = Depends(get_db)):
    return db.query(models.Airline).order_by(models.Airline.name).all()

@router.post("/airlines", response_model=schemas.Airline)
def create_airline(
    airline: schemas.AirlineCreate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = None
):
    db_airline = models.Airline(**airline.model_dump())
    db.add(db_airline)
    try:
        db.commit()
        db.refresh(db_airline)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="이미 존재하는 항공사 코드입니다.")
    return db_airline

@router.put("/airlines/{airline_id}", response_model=schemas.Airline)
def update_airline(
    airline_id: int,
    airline_update: schemas.AirlineUpdate,
    db: Session = Depends(get_db),
    current_admin: AdminUser = None
):
    db_airline = db.query(models.Airline).filter(models.Airline.id == airline_id).first()
    if not db_airline:
        raise HTTPException(status_code=404, detail="항공사를 찾을 수 없습니다.")
    
    update_data = airline_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_airline, key, value)
    
    db.commit()
    db.refresh(db_airline)
    return db_airline

@router.delete("/airlines/{airline_id}")
def delete_airline(
    airline_id: int,
    db: Session = Depends(get_db),
    current_admin: AdminUser = None
):
    db_airline = db.query(models.Airline).filter(models.Airline.id == airline_id).first()
    if not db_airline:
        raise HTTPException(status_code=404, detail="항공사를 찾을 수 없습니다.")
    db.delete(db_airline)
    db.commit()
    return {"detail": "항공사가 삭제되었습니다."}
