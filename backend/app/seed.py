"""Populate the database with sample users, conversations and messages
so the app is immediately usable. Run with: python -m app.seed
"""
import os
from datetime import datetime, timedelta

from .database import Base, engine, SessionLocal
from . import models, auth

if os.path.exists(os.path.join(os.path.dirname(__file__), "..", "signal_clone.db")):
    os.remove(os.path.join(os.path.dirname(__file__), "..", "signal_clone.db"))

Base.metadata.create_all(bind=engine)
db = SessionLocal()

USERS = [
    ("shashank", "+919990000001", "Shashank", "#2C6BED"),
    ("aarav", "+919990000002", "Aarav Mehta", "#5151F6"),
    ("priya", "+919990000003", "Priya Nair", "#D24B4B"),
    ("kabir", "+919990000004", "Kabir Singh", "#3AA76D"),
    ("neha", "+919990000005", "Neha Verma", "#B5651D"),
]

users = {}
for username, phone, display_name, color in USERS:
    u = models.User(
        username=username,
        phone=phone,
        display_name=display_name,
        password_hash=auth.hash_password("password123"),
        avatar_color=color,
        last_seen=datetime.utcnow(),
    )
    db.add(u)
    db.flush()
    users[username] = u

# Mutual contacts among everyone
for a in users.values():
    for b in users.values():
        if a.id != b.id:
            db.add(models.Contact(user_id=a.id, contact_user_id=b.id))

db.commit()

# --- Direct conversation: shashank <-> aarav ---
conv1 = models.Conversation(type=models.ConversationType.direct, created_by=users["shashank"].id)
db.add(conv1)
db.flush()
db.add(models.ConversationMember(conversation_id=conv1.id, user_id=users["shashank"].id))
db.add(models.ConversationMember(conversation_id=conv1.id, user_id=users["aarav"].id))
db.flush()

now = datetime.utcnow()
msgs1 = [
    (users["aarav"], "Hey! Did you finish the assignment brief?", now - timedelta(minutes=40)),
    (users["shashank"], "Working on it right now, backend's mostly done", now - timedelta(minutes=35)),
    (users["aarav"], "Nice, how's the WebSocket layer going?", now - timedelta(minutes=30)),
    (users["shashank"], "Solid - typing indicators and receipts both work", now - timedelta(minutes=28)),
    (users["aarav"], "Send me the repo link once it's up", now - timedelta(minutes=5)),
]
for sender, content, ts in msgs1:
    db.add(models.Message(conversation_id=conv1.id, sender_id=sender.id, content=content, created_at=ts, status=models.MessageStatus.read))

# --- Direct conversation: shashank <-> priya ---
conv2 = models.Conversation(type=models.ConversationType.direct, created_by=users["priya"].id)
db.add(conv2)
db.flush()
db.add(models.ConversationMember(conversation_id=conv2.id, user_id=users["shashank"].id))
db.add(models.ConversationMember(conversation_id=conv2.id, user_id=users["priya"].id))
db.flush()

msgs2 = [
    (users["priya"], "Are we still on for the SIH prep call?", now - timedelta(hours=2)),
    (users["shashank"], "Yep, 7pm works for me", now - timedelta(hours=1, minutes=55)),
    (users["priya"], "Perfect, see you then", now - timedelta(hours=1, minutes=50)),
]
for sender, content, ts in msgs2:
    db.add(models.Message(conversation_id=conv2.id, sender_id=sender.id, content=content, created_at=ts, status=models.MessageStatus.delivered))

# --- Group conversation ---
group = models.Conversation(type=models.ConversationType.group, name="Placement Squad", created_by=users["shashank"].id)
db.add(group)
db.flush()
db.add(models.ConversationMember(conversation_id=group.id, user_id=users["shashank"].id, role=models.MemberRole.admin))
for uname in ["aarav", "priya", "kabir", "neha"]:
    db.add(models.ConversationMember(conversation_id=group.id, user_id=users[uname].id, role=models.MemberRole.member))
db.flush()

msgs3 = [
    (users["kabir"], "Anyone started the fullstack assignment yet?", now - timedelta(minutes=90)),
    (users["neha"], "Just started, the group messaging part is tricky", now - timedelta(minutes=85)),
    (users["shashank"], "I'm using WebSockets for everything real-time", now - timedelta(minutes=80)),
    (users["aarav"], "Same, way cleaner than polling", now - timedelta(minutes=75)),
    (users["priya"], "Good luck everyone, deadline's tight", now - timedelta(minutes=10)),
]
for sender, content, ts in msgs3:
    db.add(models.Message(conversation_id=group.id, sender_id=sender.id, content=content, created_at=ts, status=models.MessageStatus.sent))

db.commit()
db.close()

print("Seed complete. Sample login -> username: shashank | password: password123")
print("Other users: aarav, priya, kabir, neha (same password: password123)")
