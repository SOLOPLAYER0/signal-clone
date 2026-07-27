from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from . import models
from .routers import auth, contacts, conversations, ws

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Signal Clone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(contacts.router)
app.include_router(conversations.router)
app.include_router(ws.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "signal-clone-api"}
