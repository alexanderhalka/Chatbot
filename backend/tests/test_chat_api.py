import os
import sys

import pytest

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_DIR)

import app as app_module  # noqa: E402
from app import create_app  # noqa: E402
from extensions import db  # noqa: E402
from models import Chat, Message, User  # noqa: E402


@pytest.fixture
def app():
    application = create_app(
        {"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"}
    )
    with application.app_context():
        db.create_all()
    yield application
    with application.app_context():
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def seed_conversation(app, session_id="s1", messages=None):
    if messages is None:
        messages = [
            (0, "system", "sys"),
            (1, "user", "u1"),
            (2, "assistant", "a1"),
        ]
    with app.app_context():
        user = User.query.filter_by(username="user").first()
        if not user:
            user = User(username="user")
            db.session.add(user)
            db.session.commit()
        if not Chat.query.get(session_id):
            chat = Chat(id=session_id, user_id=user.id, personality="assistant")
            db.session.add(chat)
            db.session.commit()
        Message.query.filter_by(chat_id=session_id).delete()
        for seq, role, content in messages:
            db.session.add(
                Message(
                    chat_id=session_id, sequence=seq, role=role, content=content
                )
            )
        db.session.commit()


def test_chat_success(client, app, monkeypatch):
    def fake_generate(_messages):
        return "AI response"

    monkeypatch.setattr(app_module, "_generate_ollama_response", fake_generate)

    resp = client.post(
        "/chat",
        json={"message": "Hi", "session_id": "s1", "personality": "assistant"},
        headers={"x-user": "test-user"},
    )

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["response"] == "AI response"

    with app.app_context():
        rows = (
            Message.query.filter_by(chat_id="s1").order_by(Message.sequence).all()
        )
        assert rows[0].role == "system"
        assert rows[1].role == "user"
        assert rows[2].role == "assistant"


def test_chat_requires_message_when_not_regenerating(client):
    resp = client.post("/chat", json={"session_id": "s1"}, headers={"x-user": "test-user"})
    assert resp.status_code == 400
    data = resp.get_json()
    assert "error" in data


def test_regenerate_success(client, app, monkeypatch):
    def fake_generate(_messages):
        return "New AI response"

    monkeypatch.setattr(app_module, "_generate_ollama_response", fake_generate)

    seed_conversation(app)

    resp = client.post(
        "/chat/regenerate",
        json={"session_id": "s1", "message_index": 2},
        headers={"x-user": "test-user"},
    )

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["response"] == "New AI response"

    with app.app_context():
        rows = (
            Message.query.filter_by(chat_id="s1").order_by(Message.sequence).all()
        )
        assert rows[-1].role == "assistant"
        assert rows[-1].content == "New AI response"


def test_regenerate_rejects_non_assistant_index(client, app):
    seed_conversation(app)

    resp = client.post(
        "/chat/regenerate",
        json={"session_id": "s1", "message_index": 1},
        headers={"x-user": "test-user"},
    )
    assert resp.status_code == 400


def test_suggest_title_success(client, monkeypatch):
    monkeypatch.setattr(
        app_module,
        "_generate_ollama_response",
        lambda _messages: "Trip Planning\nExtra text",
    )

    resp = client.post(
        "/chat/suggest-title",
        json={"user_message": "Plan a trip to Rome", "ai_message": "Sure here's a plan"},
        headers={"x-user": "test-user"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert "title" in data
    assert data["title"] == "Trip Planning"


def test_edit_message_success_truncates_history(client, app):
    seed_conversation(app)

    resp = client.put(
        "/message/edit",
        json={
            "session_id": "s1",
            "message_index": 1,
            "new_content": "edited user",
            "role": "user",
        },
        headers={"x-user": "test-user"},
    )

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["updated_message"]["role"] == "user"
    assert data["updated_message"]["content"] == "edited user"
    assert data["truncated"] is True

    with app.app_context():
        rows = (
            Message.query.filter_by(chat_id="s1").order_by(Message.sequence).all()
        )
        assert len(rows) == 2
        assert rows[-1].content == "edited user"


def test_edit_message_rejects_non_user_role(client, app):
    seed_conversation(app)

    resp = client.put(
        "/message/edit",
        json={
            "session_id": "s1",
            "message_index": 2,
            "new_content": "should fail",
            "role": "assistant",
        },
        headers={"x-user": "test-user"},
    )

    assert resp.status_code == 403


def test_delete_message_success_truncates_history(client, app):
    seed_conversation(app)

    resp = client.delete(
        "/message/delete",
        json={"session_id": "s1", "message_index": 1},
        headers={"x-user": "test-user"},
    )

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["deleted_message"]["role"] == "user"
    assert data["deleted_message"]["content"] == "u1"

    with app.app_context():
        rows = (
            Message.query.filter_by(chat_id="s1").order_by(Message.sequence).all()
        )
        assert len(rows) == 1
        assert rows[0].role == "system"


def test_delete_message_rejects_non_user_index(client, app):
    seed_conversation(app)

    resp = client.delete(
        "/message/delete",
        json={"session_id": "s1", "message_index": 2},
        headers={"x-user": "test-user"},
    )

    assert resp.status_code == 403
