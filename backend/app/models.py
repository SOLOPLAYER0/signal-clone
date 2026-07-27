import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Enum, Boolean, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from .database import Base


class ConversationType(str, enum.Enum):
    direct = "direct"
    group = "group"


class MemberRole(str, enum.Enum):
    member = "member"
    admin = "admin"


class MessageStatus(str, enum.Enum):
    sending = "sending"
    sent = "sent"
    delivered = "delivered"
    read = "read"


class ReceiptStatus(str, enum.Enum):
    delivered = "delivered"
    read = "read"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=True)
    display_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    avatar_color = Column(String, default="#2C6BED")
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    is_online = Column(Boolean, default=False)


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contact_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("user_id", "contact_user_id", name="uq_contact_pair"),)

    user = relationship("User", foreign_keys=[user_id])
    contact_user = relationship("User", foreign_keys=[contact_user_id])


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(ConversationType), nullable=False)
    name = Column(String, nullable=True)  # only for groups
    avatar_color = Column(String, default="#3A76F0")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("ConversationMember", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class ConversationMember(Base):
    __tablename__ = "conversation_members"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(Enum(MemberRole), default=MemberRole.member)
    joined_at = Column(DateTime, default=datetime.utcnow)
    last_read_message_id = Column(Integer, nullable=True)

    __table_args__ = (UniqueConstraint("conversation_id", "user_id", name="uq_member_pair"),)

    conversation = relationship("Conversation", back_populates="members")
    user = relationship("User")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(Enum(MessageStatus), default=MessageStatus.sent)
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User")
    receipts = relationship("MessageReceipt", back_populates="message", cascade="all, delete-orphan")


class MessageReceipt(Base):
    __tablename__ = "message_receipts"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ReceiptStatus), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("message_id", "user_id", name="uq_receipt_pair"),)

    message = relationship("Message", back_populates="receipts")
    user = relationship("User")
