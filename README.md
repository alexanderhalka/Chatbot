# Chatbot

A chat application with a React frontend and Flask backend, using **Ollama** for local, private AI inference. Multiple chats, personalities, message edit/delete/redo, and auto-generated chat titles.

## Features

- **Local AI** – Ollama runs on your machine; no API keys or usage limits
- **Multiple chats** – Separate conversations with per-chat draft messages
- **Auto chat names** – New chats start as "New Chat"; after the first exchange, the app suggests a title from context
- **Personalities** – Built-in (Assistant, Coach, Therapist, Study Buddy, Bestie, etc.) and custom personalities
- **Message actions** – Edit and delete your messages; redo AI replies. Three-dot menu per message (Copy, Edit, Delete for user; Redo, Copy for AI)
- **Theme** – Light/dark mode toggle
- **Responsive UI** – Works on desktop and mobile; chat list with truncation and tooltips
- **Persistence** – Chats and settings stored in the browser (localStorage)

## Project structure

```
Chatbot/
├── backend/
│   └── app.py              # Flask API (chat, personalities, suggest-title, etc.)
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/     # ChatInterface, ChatSidebar, PersonalityPicker, etc.
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── requirements.txt       # Python dependencies (Flask, CORS, dotenv, requests)
└── README.md
```

## Prerequisites

- **Python 3.7+**
- **Node.js 14+**
- **Ollama** – [Install](https://ollama.ai) and have it running (e.g. `ollama serve`). Default model: `llama3.2`.

## Setup

### 1. Ollama

1. Install from [ollama.ai](https://ollama.ai).
2. Start Ollama (often automatic after install):
   ```bash
   ollama serve
   ```
3. Pull a model (default is `llama3.2`):
   ```bash
   ollama pull llama3.2
   ```

### 2. Backend

From the **project root**:

```bash
pip install -r requirements.txt
cd backend
python app.py
```

Backend runs at `http://localhost:5000`.

Optional: create `backend/.env` to override defaults:

```
OLLAMA_API_URL=http://localhost:11434/api/chat
OLLAMA_MODEL=llama3.2
```

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000` and proxies API requests to the backend.

## Usage

1. Open `http://localhost:3000`.
2. Enter a username.
3. Start or select a chat; pick a personality from the header if you like.
4. Type in the message box and send. The first user + AI exchange is used to suggest a chat title if it’s still "New Chat".
5. Use the three-dot menu on messages to edit, delete, redo (AI), or copy.

## Configuration

- **Ollama model**: set `OLLAMA_MODEL` in `backend/.env` (e.g. `llama3.2`, `mistral`, `phi3`). Ensure the model is pulled: `ollama pull <model-name>`.
- **Ollama URL**: set `OLLAMA_API_URL` in `backend/.env` if Ollama is not on `http://localhost:11434/api/chat`.
- **Backend**: model and request options (temperature, max tokens) are in `backend/app.py`.
