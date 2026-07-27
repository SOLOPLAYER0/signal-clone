from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from .. import models, schemas, auth
from ..database import get_db
from ..ws_manager import manager

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _member_ids(db: Session, conversation_id: int):
    rows = db.query(models.ConversationMember.user_id).filter(
        models.ConversationMember.conversation_id == conversation_id
    ).all()
    return [r[0] for r in rows]


def _require_member(db: Session, conversation_id: int, user_id: int) -> models.ConversationMember:
    member = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == conversation_id,
        models.ConversationMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")
    return member


def _serialize_conversation(db: Session, conv: models.Conversation, user_id: int) -> schemas.ConversationOut:
    last_msg = db.query(models.Message).filter(
        models.Message.conversation_id == conv.id
    ).order_by(desc(models.Message.created_at)).first()

    my_member = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == conv.id,
        models.ConversationMember.user_id == user_id,
    ).first()
    last_read_id = my_member.last_read_message_id or 0

    unread = db.query(models.Message).filter(
        models.Message.conversation_id == conv.id,
        models.Message.id > last_read_id,
        models.Message.sender_id != user_id,
    ).count()

    for m in conv.members:
        m.user.is_online = manager.is_online(m.user.id)

    out = schemas.ConversationOut(
        id=conv.id,
        type=conv.type.value if hasattr(conv.type, "value") else conv.type,
        name=conv.name,
        avatar_color=conv.avatar_color,
        members=conv.members,
        last_message=last_msg,
        unread_count=unread,
    )
    return out


@router.get("", response_model=list[schemas.ConversationOut])
def list_conversations(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    conv_ids = _member_ids_for_user(db, current_user.id)
    convs = db.query(models.Conversation).options(
        joinedload(models.Conversation.members).joinedload(models.ConversationMember.user)
    ).filter(models.Conversation.id.in_(conv_ids)).all()

    serialized = [_serialize_conversation(db, c, current_user.id) for c in convs]
    serialized.sort(key=lambda c: c.last_message.created_at if c.last_message else datetime.min, reverse=True)
    return serialized


def _member_ids_for_user(db: Session, user_id: int):
    rows = db.query(models.ConversationMember.conversation_id).filter(
        models.ConversationMember.user_id == user_id
    ).all()
    return [r[0] for r in rows]


@router.post("/direct", response_model=schemas.ConversationOut)
def create_direct(payload: schemas.ConversationCreateDirect, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    target = db.query(models.User).filter(models.User.username == payload.username).first()
    if not target:
        raise HTTPException(status_code=404, detail="No user with that username")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")

    # Check for existing direct conversation between the two
    my_convs = set(_member_ids_for_user(db, current_user.id))
    their_convs = set(_member_ids_for_user(db, target.id))
    shared = my_convs & their_convs
    for cid in shared:
        conv = db.query(models.Conversation).filter(models.Conversation.id == cid).first()
        if conv and conv.type == models.ConversationType.direct:
            return _serialize_conversation(db, conv, current_user.id)

    conv = models.Conversation(type=models.ConversationType.direct, created_by=current_user.id)
    db.add(conv)
    db.flush()
    db.add(models.ConversationMember(conversation_id=conv.id, user_id=current_user.id, role=models.MemberRole.member))
    db.add(models.ConversationMember(conversation_id=conv.id, user_id=target.id, role=models.MemberRole.member))
    db.commit()
    db.refresh(conv)
    return _serialize_conversation(db, conv, current_user.id)


@router.post("/group", response_model=schemas.ConversationOut)
def create_group(payload: schemas.ConversationCreateGroup, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    members = db.query(models.User).filter(models.User.username.in_(payload.member_usernames)).all()
    if not members:
        raise HTTPException(status_code=400, detail="Add at least one valid member")

    conv = models.Conversation(type=models.ConversationType.group, name=payload.name, created_by=current_user.id)
    db.add(conv)
    db.flush()
    db.add(models.ConversationMember(conversation_id=conv.id, user_id=current_user.id, role=models.MemberRole.admin))
    for m in members:
        if m.id != current_user.id:
            db.add(models.ConversationMember(conversation_id=conv.id, user_id=m.id, role=models.MemberRole.member))
    db.commit()
    db.refresh(conv)
    return _serialize_conversation(db, conv, current_user.id)


@router.get("/{conversation_id}/messages", response_model=list[schemas.MessageOut])
def get_messages(conversation_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    _require_member(db, conversation_id, current_user.id)
    messages = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id
    ).order_by(models.Message.created_at).all()
    return messages


@router.post("/{conversation_id}/read")
async def mark_read(conversation_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    member = _require_member(db, conversation_id, current_user.id)
    last_msg = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id
    ).order_by(desc(models.Message.created_at)).first()

    if last_msg:
        member.last_read_message_id = last_msg.id
        unread_msgs = db.query(models.Message).filter(
            models.Message.conversation_id == conversation_id,
            models.Message.sender_id != current_user.id,
        ).all()
        for msg in unread_msgs:
            receipt = db.query(models.MessageReceipt).filter(
                models.MessageReceipt.message_id == msg.id,
                models.MessageReceipt.user_id == current_user.id,
            ).first()
            if receipt:
                receipt.status = models.ReceiptStatus.read
            else:
                db.add(models.MessageReceipt(message_id=msg.id, user_id=current_user.id, status=models.ReceiptStatus.read))
            msg.status = models.MessageStatus.read
        db.commit()

        other_ids = [uid for uid in _member_ids(db, conversation_id) if uid != current_user.id]
        await manager.send_to_users(other_ids, {
            "type": "read_receipt",
            "conversation_id": conversation_id,
            "reader_id": current_user.id,
            "up_to_message_id": last_msg.id,
        })
    return {"ok": True}


@router.post("/{conversation_id}/messages", response_model=schemas.MessageOut)
async def send_message(conversation_id: int, payload: schemas.MessageCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    _require_member(db, conversation_id, current_user.id)
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    other_ids = [uid for uid in _member_ids(db, conversation_id) if uid != current_user.id]
    any_online = any(manager.is_online(uid) for uid in other_ids)

    message = models.Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=payload.content.strip(),
        status=models.MessageStatus.delivered if any_online else models.MessageStatus.sent,
    )
    db.add(message)
    db.flush()

    for uid in other_ids:
        status = models.ReceiptStatus.delivered if manager.is_online(uid) else None
        if status:
            db.add(models.MessageReceipt(message_id=message.id, user_id=uid, status=status))

    db.commit()
    db.refresh(message)

    await manager.send_to_users(other_ids, {
        "type": "new_message",
        "message": schemas.MessageOut.model_validate(message).model_dump(mode="json"),
    })
    await manager.send_to_users(other_ids, {"type": "conversation_updated", "conversation_id": conversation_id})

    return message


@router.post("/{conversation_id}/members")
async def add_members(conversation_id: int, payload: schemas.AddMembers, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    conv = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conv or conv.type != models.ConversationType.group:
        raise HTTPException(status_code=400, detail="Not a group conversation")
    _require_member(db, conversation_id, current_user.id)

    added = []
    for username in payload.usernames:
        user = db.query(models.User).filter(models.User.username == username).first()
        if not user:
            continue
        exists = db.query(models.ConversationMember).filter(
            models.ConversationMember.conversation_id == conversation_id,
            models.ConversationMember.user_id == user.id,
        ).first()
        if not exists:
            db.add(models.ConversationMember(conversation_id=conversation_id, user_id=user.id, role=models.MemberRole.member))
            added.append(user.id)
    db.commit()

    all_ids = _member_ids(db, conversation_id)
    await manager.send_to_users(all_ids, {"type": "conversation_updated", "conversation_id": conversation_id})
    return {"added": added}


@router.delete("/{conversation_id}/members/{user_id}")
async def remove_member(conversation_id: int, user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    conv = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conv or conv.type != models.ConversationType.group:
        raise HTTPException(status_code=400, detail="Not a group conversation")

    requester = _require_member(db, conversation_id, current_user.id)
    if requester.role != models.MemberRole.admin and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Only admins can remove other members")

    member = db.query(models.ConversationMember).filter(
        models.ConversationMember.conversation_id == conversation_id,
        models.ConversationMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()

    remaining_ids = _member_ids(db, conversation_id)
    await manager.send_to_users(remaining_ids + [user_id], {"type": "conversation_updated", "conversation_id": conversation_id})
    return {"ok": True}
