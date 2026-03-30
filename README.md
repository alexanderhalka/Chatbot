# Chatbot

A chat application with a React frontend and Flask backend, using **Ollama** for local, private AI inference. Multiple chats, personalities, message edit/delete/redo, and auto-generated chat titles.

**Data:** Conversations are stored in **PostgreSQL** (recommended) or **SQLite** (default, zero setup). The frontend keeps only your username and last-open chat id in the browser.

## Features

- **Local AI** – Ollama runs on your machine; no API keys or usage limits
- **Multiple chats** – Separate conversations with per-chat draft messages
- **Auto chat names** – New chats start as "New Chat"; after the first exchange, the app suggests a title from context
- **Personalities** – Built-in (Assistant, Coach, Therapist, Study Buddy, Bestie, etc.) and custom personalities
- **Message actions** – Edit and delete your messages; redo AI replies. Three-dot menu per message (Copy, Edit, Delete for user; Redo, Copy for AI)
- **Theme** – Light/dark mode toggle
- **Responsive UI** – Works on desktop and mobile; chat list with truncation and tooltips
- **Persistence** – Chats, messages, and custom personalities in Postgres/SQLite via the Flask API; username + active chat id in localStorage

## Project structure

```
Chatbot/
├── backend/
│   ├── app.py              # Flask app factory + routes
│   ├── run.py              # Dev server entry (python run.py)
│   ├── models.py           # SQLAlchemy: User, Chat, Message, CustomPersonality
│   ├── extensions.py       # db
│   ├── conversation_store.py
│   └── tests/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/     # ChatInterface, ChatSidebar, PersonalityPicker, etc.
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── requirements.txt
├── .env.example            # Template env vars (copy to backend/.env)
├── docker-compose.yml      # Optional: Postgres 16
├── start_chatbot.py        # One-command runner: installs deps, starts backend + frontend
├── start-chatbot.bat       # Windows
├── start-chatbot.sh        # Mac/Linux
└── README.md
```

## Prerequisites

- **Python 3.10+** (3.9 may work; type hints use modern syntax in places)
- **Node.js 14+**
- **Ollama** – [Install](https://ollama.ai) and have it running (e.g. `ollama serve`). Default model: `llama3.2`.

## Setup

### 1. Ollama (required)

1. Install from [ollama.ai](https://ollama.ai).
2. Start Ollama (often automatic after install):
   ```bash
   ollama serve
   ```
3. Pull a model (default is `llama3.2`):
   ```bash
   ollama pull llama3.2
   ```

### 2. Database (optional)

**Default:** SQLite file at `backend/instance/chatbot.db` (created automatically).

**PostgreSQL with Docker:**

```bash
docker compose up -d
```

Create `backend/.env` and set:

```
DATABASE_URL=postgresql+psycopg2://chatbot:chatbot@localhost:5432/chatbot
```

Optional Ollama overrides: `OLLAMA_API_URL`, `OLLAMA_MODEL` (defaults match `.env.example`). See `.env.example` at the repo root.

### 3. Run the app (one command)

From the **project root** (the folder that contains `backend/` and `frontend/`):

```bash
python start_chatbot.py
```

On Windows you can run `start-chatbot.bat`. On Mac/Linux: `./start-chatbot.sh` (first time: `chmod +x start-chatbot.sh`).

The script installs Python and frontend dependencies on first run, then starts the backend (`backend/run.py`) and frontend. Open `http://localhost:3000`. Press `Ctrl+C` to stop both.

## Configuration

- **Ollama model**: `OLLAMA_MODEL` in `backend/.env`. Pull with `ollama pull <name>`.
- **Ollama URL**: `OLLAMA_API_URL` in `backend/.env` if not using the default chat endpoint.
- **Database**: `DATABASE_URL` in `backend/.env` (Postgres or SQLite). If unset, defaults to SQLite under `backend/instance/chatbot.db`.
- **Backend tuning** (temperature, max tokens): `backend/app.py` in `_generate_ollama_response`.

## API (Flask)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/chat` | Send message (`session_id`, `message`, `personality`, optional `regenerate_only`) |
| POST | `/chat/regenerate` | Redo AI reply (`session_id`, optional `message_index`) |
| POST | `/chat/suggest-title` | Suggest title from first user + AI messages |
| PUT | `/message/edit` | Edit user message (`session_id`, `message_index`, `new_content`) |
| DELETE | `/message/delete` | Delete user message and following (`session_id`, `message_index`) |
| POST | `/update-personality` | Update system prompt for session (legacy; prefer PATCH on chat) |
| POST | `/clear-memory` | Clear session (deletes chat row for that id) |
| GET | `/personalities` | List personalities |
| POST | `/personalities` | Create custom personality |
| PUT/DELETE | `/personalities/<key>` | Update/delete custom personality |
| GET | `/api/users/<username>/chats` | List chats (header `x-user: test-<username>`) |
| POST | `/api/users/<username>/chats` | Create chat (`id`, `title`, `personality`) |
| GET | `/api/chats/<chat_id>/messages` | List messages for UI |
| PATCH | `/api/chats/<chat_id>` | Update `title` and/or `personality` |
| DELETE | `/api/chats/<chat_id>` | Delete chat |

Auth is simplified: the frontend sends `x-user: test-<username>`; the backend maps that to a `User` row and scopes chats.

## Usage

1. Open `http://localhost:3000`.
2. Enter a username.
3. Start or select a chat; pick a personality from the header if you like.
4. Type in the message box and send. The first user + AI exchange is used to suggest a chat title if it’s still "New Chat".
5. Use the three-dot menu on messages to edit, delete, redo (AI), or copy.

## Tests

Backend (from project root, with venv activated):

```bash
python -m pytest backend/tests -q
```

Frontend:

```bash
cd frontend
npm test
```

(PowerShell: `$env:CI="true"; npm test -- --watchAll=false`.)

## License

MIT (or your choice).
