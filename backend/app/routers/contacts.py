from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from .. import models, schemas, auth
from ..database import get_db
from ..ws_manager import manager

router = APIRouter(prefix="/contacts", tags=["contacts"])


@router.get("", response_model=list[schemas.ContactOut])
def list_contacts(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    contacts = db.query(models.Contact).filter(models.Contact.user_id == current_user.id).all()
    for c in contacts:
        c.contact_user.is_online = manager.is_online(c.contact_user.id)
    return contacts


@router.post("", response_model=schemas.ContactOut)
def add_contact(payload: schemas.ContactCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    target = db.query(models.User).filter(models.User.username == payload.username).first()
    if not target:
        raise HTTPException(status_code=404, detail="No user with that username")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself")

    existing = db.query(models.Contact).filter(
        models.Contact.user_id == current_user.id,
        models.Contact.contact_user_id == target.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already in contacts")

    contact = models.Contact(user_id=current_user.id, contact_user_id=target.id)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("/search", response_model=list[schemas.UserOut])
def search_users(q: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not q:
        return []
    results = db.query(models.User).filter(
        models.User.id != current_user.id,
        or_(models.User.username.ilike(f"%{q}%"), models.User.display_name.ilike(f"%{q}%")),
    ).limit(20).all()
    return results
