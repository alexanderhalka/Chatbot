import os
import sys
from unittest.mock import Mock

import pytest


# Allow importing backend/app.py as module `app`
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_DIR)

import app as backend_app  # noqa: E402


@pytest.fixture(autouse=True)
def clear_conversation_history():
    backend_app.conversation_history.clear()
    yield
    backend_app.conversation_history.clear()


def test_chat_success(monkeypatch):
    def fake_generate(_messages):
        return "AI response"

    monkeypatch.setattr(backend_app, "_generate_ollama_response", fake_generate)

    with backend_app.app.test_client() as client:
        resp = client.post(
            "/chat",
            json={"message": "Hi", "session_id": "s1", "personality": "assistant"},
            headers={"x-user": "test-user"},
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "success"
        assert data["response"] == "AI response"

        history = backend_app.conversation_history["s1"]
        assert history[0]["role"] == "system"
        assert history[1]["role"] == "user"
        assert history[2]["role"] == "assistant"


def test_chat_requires_message_when_not_regenerating():
    with backend_app.app.test_client() as client:
        resp = client.post("/chat", json={"session_id": "s1"}, headers={"x-user": "test-user"})
        assert resp.status_code == 400
        data = resp.get_json()
        assert "error" in data


def test_regenerate_success(monkeypatch):
    def fake_generate(_messages):
        return "New AI response"

    monkeypatch.setattr(backend_app, "_generate_ollama_response", fake_generate)

    # conversation ends with a user, with an assistant message at index 2
    backend_app.conversation_history["s1"] = [
        {"role": "system", "content": "sys"},
        {"role": "user", "content": "u1"},
        {"role": "assistant", "content": "a1"},
    ]

    with backend_app.app.test_client() as client:
        resp = client.post(
            "/chat/regenerate",
            json={"session_id": "s1", "message_index": 2},
            headers={"x-user": "test-user"},
        )

        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "success"
        assert data["response"] == "New AI response"

        history = backend_app.conversation_history["s1"]
        assert history[-1]["role"] == "assistant"
        assert history[-1]["content"] == "New AI response"


def test_regenerate_rejects_non_assistant_index():
    backend_app.conversation_history["s1"] = [
        {"role": "system", "content": "sys"},
        {"role": "user", "content": "u1"},
        {"role": "assistant", "content": "a1"},
    ]

    with backend_app.app.test_client() as client:
        resp = client.post(
            "/chat/regenerate",
            json={"session_id": "s1", "message_index": 1},
            headers={"x-user": "test-user"},
        )
        assert resp.status_code == 400


def test_suggest_title_success(monkeypatch):
    monkeypatch.setattr(backend_app, "_generate_ollama_response", lambda _messages: "Trip Planning\nExtra text")

    with backend_app.app.test_client() as client:
        resp = client.post(
            "/chat/suggest-title",
            json={"user_message": "Plan a trip to Rome", "ai_message": "Sure here's a plan"},
            headers={"x-user": "test-user"},
        )
        assert resp.status_code == 200
        data = resp.get_json()
        assert "title" in data
        assert data["title"] == "Trip Planning"


def test_edit_message_success_truncates_history():
    # conversation_history indices: 0=system, 1=user, 2=assistant
    backend_app.conversation_history["s1"] = [
        {"role": "system", "content": "sys"},
        {"role": "user", "content": "original user"},
        {"role": "assistant", "content": "old ai"},
    ]

    with backend_app.app.test_client() as client:
        resp = client.put(
            "/message/edit",
            json={
                "session_id": "s1",
                "message_index": 1,  # index in conversation_history
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

        history = backend_app.conversation_history["s1"]
        assert len(history) == 2  # system + edited user (assistant truncated)
        assert history[-1]["content"] == "edited user"


def test_edit_message_rejects_non_user_role():
    backend_app.conversation_history["s1"] = [
        {"role": "system", "content": "sys"},
        {"role": "user", "content": "u1"},
        {"role": "assistant", "content": "a1"},
    ]

    with backend_app.app.test_client() as client:
        resp = client.put(
            "/message/edit",
            json={
                "session_id": "s1",
                "message_index": 2,  # assistant index
                "new_content": "should fail",
                "role": "assistant",
            },
            headers={"x-user": "test-user"},
        )

        assert resp.status_code == 403


def test_delete_message_success_truncates_history():
    backend_app.conversation_history["s1"] = [
        {"role": "system", "content": "sys"},
        {"role": "user", "content": "u1"},
        {"role": "assistant", "content": "a1"},
    ]

    with backend_app.app.test_client() as client:
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

        history = backend_app.conversation_history["s1"]
        assert len(history) == 1  # only system remains
        assert history[0]["role"] == "system"


def test_delete_message_rejects_non_user_index():
    backend_app.conversation_history["s1"] = [
        {"role": "system", "content": "sys"},
        {"role": "user", "content": "u1"},
        {"role": "assistant", "content": "a1"},
    ]

    with backend_app.app.test_client() as client:
        resp = client.delete(
            "/message/delete",
            json={"session_id": "s1", "message_index": 2},
            headers={"x-user": "test-user"},
        )

        assert resp.status_code == 403

