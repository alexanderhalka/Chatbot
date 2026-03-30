from datetime import datetime

from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    chats = db.relationship(
        "Chat",
        backref="user",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )


class Chat(db.Model):
    __tablename__ = "chats"

    id = db.Column(db.String(64), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(512), default="New Chat")
    personality = db.Column(db.String(128), default="assistant")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    messages = db.relationship(
        "Message",
        backref="chat",
        lazy="dynamic",
        cascade="all, delete-orphan",
        order_by="Message.sequence",
    )


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    chat_id = db.Column(db.String(64), db.ForeignKey("chats.id"), nullable=False, index=True)
    sequence = db.Column(db.Integer, nullable=False)
    role = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("chat_id", "sequence", name="uq_message_chat_seq"),)


class CustomPersonality(db.Model):
    __tablename__ = "custom_personalities"

    key = db.Column(db.String(128), primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=False)
    system_prompt = db.Column(db.Text, nullable=False)
    icon = db.Column(db.String(32), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
