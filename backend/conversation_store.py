"""Persist conversation turns for Ollama in PostgreSQL/SQLite via SQLAlchemy."""

from __future__ import annotations

from typing import List

from extensions import db
from models import Chat, Message, User


def get_or_create_user(username: str) -> User:
    user = User.query.filter_by(username=username).first()
    if user is None:
        user = User(username=username)
        db.session.add(user)
        db.session.commit()
    return user


def get_chat_for_user(session_id: str, user_id: int):
    chat = Chat.query.get(session_id)
    if chat is None or chat.user_id != user_id:
        return None
    return chat


def ensure_chat(user: User, session_id: str, personality: str) -> Chat:
    chat = Chat.query.get(session_id)
    if chat is not None:
        if chat.user_id != user.id:
            raise PermissionError("Chat belongs to another user")
        if chat.personality != personality:
            chat.personality = personality
            db.session.commit()
        return chat
    chat = Chat(id=session_id, user_id=user.id, personality=personality)
    db.session.add(chat)
    db.session.commit()
    return chat


def get_conversation_messages(session_id: str, system_prompt: str) -> List[dict]:
    """Return messages in Ollama format (list of {role, content})."""
    chat = Chat.query.get(session_id)
    if chat is None:
        return [{"role": "system", "content": system_prompt}]
    rows = (
        Message.query.filter_by(chat_id=session_id).order_by(Message.sequence).all()
    )
    if not rows:
        return [{"role": "system", "content": system_prompt}]
    out = [{"role": m.role, "content": m.content} for m in rows]
    if out and out[0]["role"] == "system":
        out[0]["content"] = system_prompt
    else:
        out.insert(0, {"role": "system", "content": system_prompt})
    return out


def save_conversation_messages(session_id: str, messages: List[dict]) -> None:
    """Replace all messages for a chat with the given list."""
    chat = Chat.query.get(session_id)
    if chat is None:
        return
    Message.query.filter_by(chat_id=session_id).delete()
    for i, m in enumerate(messages):
        db.session.add(
            Message(
                chat_id=session_id,
                sequence=i,
                role=m["role"],
                content=m["content"],
            )
        )
    db.session.commit()


def clear_conversation(session_id: str) -> None:
    chat = Chat.query.get(session_id)
    if chat is None:
        return
    Message.query.filter_by(chat_id=session_id).delete()
    db.session.delete(chat)
    db.session.commit()


def update_system_prompt_only(session_id: str, system_prompt: str) -> None:
    chat = Chat.query.get(session_id)
    if chat is None:
        return
    first = (
        Message.query.filter_by(chat_id=session_id)
        .order_by(Message.sequence)
        .first()
    )
    if first and first.sequence == 0 and first.role == "system":
        first.content = system_prompt
    else:
        # No rows or first is not system — rebuild with single system message
        Message.query.filter_by(chat_id=session_id).delete()
        db.session.add(
            Message(
                chat_id=session_id,
                sequence=0,
                role="system",
                content=system_prompt,
            )
        )
    db.session.commit()


def messages_to_frontend_format(rows: List[Message]) -> List[dict]:
    """DB messages -> ChatInterface shape (skip system)."""
    out = []
    for m in rows:
        if m.role == "system":
            continue
        sender = "ai" if m.role == "assistant" else "user"
        out.append(
            {
                "id": m.id,
                "text": m.content,
                "sender": sender,
                "timestamp": m.created_at.isoformat() if m.created_at else "",
            }
        )
    return out


def chat_title_and_meta(chat: Chat) -> dict:
    last = (
        Message.query.filter_by(chat_id=chat.id)
        .filter(Message.role != "system")
        .order_by(Message.sequence.desc())
        .first()
    )
    last_message = None
    if last:
        last_message = last.content[:120] + ("..." if len(last.content) > 120 else "")
    count = Message.query.filter_by(chat_id=chat.id).filter(Message.role != "system").count()
    return {
        "id": chat.id,
        "title": chat.title,
        "personality": chat.personality,
        "lastMessage": last_message,
        "messageCount": count,
        "createdAt": chat.created_at.isoformat() if chat.created_at else None,
        "updatedAt": chat.updated_at.isoformat() if chat.updated_at else None,
    }
