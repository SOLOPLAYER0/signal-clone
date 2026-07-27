from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/request-otp")
def request_otp(payload: schemas.RequestOTP):
    # Mocked: in a real app this would trigger an SMS provider.
    # The OTP is always fixed per the assignment spec.
    return {"message": f"OTP sent to {payload.phone}", "hint": auth.FIXED_OTP}


@router.post("/register", response_model=schemas.TokenOut)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    if payload.otp != auth.FIXED_OTP:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(models.User).filter(models.User.phone == payload.phone).first():
        raise HTTPException(status_code=400, detail="Phone already registered")

    colors = ["#2C6BED", "#5151F6", "#D24B4B", "#3AA76D", "#B5651D", "#8E44AD"]
    color = colors[db.query(models.User).count() % len(colors)]

    user = models.User(
        username=payload.username,
        phone=payload.phone,
        display_name=payload.display_name,
        password_hash=auth.hash_password(payload.password),
        avatar_color=color,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = auth.create_access_token(user.id)
    return schemas.TokenOut(access_token=token, user=user)


@router.post("/login", response_model=schemas.TokenOut)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = auth.create_access_token(user.id)
    return schemas.TokenOut(access_token=token, user=user)


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user
