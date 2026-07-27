import json
from typing import Dict, Set
from fastapi import WebSocket


class ConnectionManager:
    """Tracks live WebSocket connections keyed by user_id and broadcasts
    events to whichever of those users are currently online."""

    def __init__(self):
        self.active: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, set()).add(ws)

    def disconnect(self, user_id: int, ws: WebSocket):
        if user_id in self.active:
            self.active[user_id].discard(ws)
            if not self.active[user_id]:
                del self.active[user_id]

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active and len(self.active[user_id]) > 0

    async def send_to_user(self, user_id: int, payload: dict):
        for ws in list(self.active.get(user_id, set())):
            try:
                await ws.send_text(json.dumps(payload, default=str))
            except Exception:
                pass

    async def send_to_users(self, user_ids, payload: dict):
        for uid in user_ids:
            await self.send_to_user(uid, payload)


manager = ConnectionManager()
