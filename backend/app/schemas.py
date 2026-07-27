from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class RequestOTP(BaseModel):
    phone: str


class VerifyOTP(BaseModel):
    phone: str
    otp: str
    username: Optional[str] = None
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    phone: str
    password: str
    display_name: str
    otp: str


class UserOut(BaseModel):
    id: int
    username: str
    phone: Optional[str]
    display_name: str
    avatar_url: Optional[str]
    avatar_color: str
    is_online: bool
    last_seen: datetime

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ContactCreate(BaseModel):
    username: str


class ContactOut(BaseModel):
    id: int
    contact_user: UserOut

    class Config:
        from_attributes = True


class ConversationCreateDirect(BaseModel):
    username: str


class ConversationCreateGroup(BaseModel):
    name: str
    member_usernames: List[str]


class MemberOut(BaseModel):
    user: UserOut
    role: str

    class Config:
        from_attributes = True


class MessagePreview(BaseModel):
    content: str
    created_at: datetime
    sender_id: int
    status: str

    class Config:
        from_attributes = True


class ConversationOut(BaseModel):
    id: int
    type: str
    name: Optional[str]
    avatar_color: str
    members: List[MemberOut]
    last_message: Optional[MessagePreview] = None
    unread_count: int = 0

    class Config:
        from_attributes = True


class ReactionOut(BaseModel):
    emoji: str
    user_id: int

    class Config:
        from_attributes = True


class ReactionToggle(BaseModel):
    emoji: str


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    status: str
    created_at: datetime
    reactions: List[ReactionOut] = []

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    content: str


class AddMembers(BaseModel):
    usernames: List[str]


class RemoveMember(BaseModel):
    user_id: int
