from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from dependencies import get_db, get_current_user
from schemas.auth import LoginRequest, TokenResponse, UserOut
from services import auth_service

router = APIRouter(prefix="/auth", tags=["인증"])

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    return auth_service.login(db, body.username, body.password)

@router.get("/me", response_model=UserOut)
def me(current_user=Depends(get_current_user)):
    return current_user
