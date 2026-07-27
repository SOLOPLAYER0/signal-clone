import json
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from .. import models, auth
from ..database import SessionLocal
from ..ws_manager import manager
from .conversations import _member_ids

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user_id = auth.decode_token(token)
    if user_id is None:
        await websocket.close(code=4401)
        return

    db: Session = SessionLocal()
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        await websocket.close(code=4401)
        db.close()
        return

    await manager.connect(user_id, websocket)
    user.is_online = True
    user.last_seen = datetime.utcnow()
    db.commit()

    # Tell this user's contacts/conversation-mates they're now online
    conv_ids = [r[0] for r in db.query(models.ConversationMember.conversation_id).filter(
        models.ConversationMember.user_id == user_id).all()]
    peer_ids = set()
    for cid in conv_ids:
        for uid in _member_ids(db, cid):
            if uid != user_id:
                peer_ids.add(uid)
    await manager.send_to_users(peer_ids, {"type": "presence", "user_id": user_id, "online": True})

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if data.get("type") == "typing":
                conversation_id = data.get("conversation_id")
                is_typing = data.get("is_typing", True)
                others = [uid for uid in _member_ids(db, conversation_id) if uid != user_id]
                await manager.send_to_users(others, {
                    "type": "typing",
                    "conversation_id": conversation_id,
                    "user_id": user_id,
                    "is_typing": is_typing,
                })
            elif data.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id, websocket)
        if not manager.is_online(user_id):
            user.is_online = False
            user.last_seen = datetime.utcnow()
            db.commit()
            await manager.send_to_users(peer_ids, {"type": "presence", "user_id": user_id, "online": False, "last_seen": user.last_seen.isoformat()})
        db.close()
