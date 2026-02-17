# ChatGPT Clone

A simple ChatGPT clone built with React frontend and Python Flask backend, integrated with **Ollama for local, private, and free AI inference**.

## Features

- Modern, responsive UI similar to ChatGPT
- Real-time chat interface with **local Ollama LLM**
- **100% Private**: All AI processing happens locally on your machine
- **Completely Free**: No API costs, no usage limits
- Beautiful gradient design with smooth animations
- Mobile-responsive design
- Fast and lightweight
- Multiple AI personalities with custom personality creation
- Message persistence with multiple chat sessions

## Project Structure

```
Chatbot/
├── backend/           # Python Flask API
│   ├── app.py        # Main Flask application
│   ├── requirements.txt
│   └── env.example   # Environment variables template
├── frontend/         # React application
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── README.md
```

## Prerequisites

- Python 3.7+
- Node.js 14+
- **Ollama** installed on your machine
- A local LLM model (default: `llama3.2`)

## Setup Instructions

### 1. Install Ollama

1. **Download and install Ollama** from [https://ollama.ai]

2. **Start Ollama service** (usually runs automatically after installation):
   ```bash
   ollama serve
   ```
   The service runs on `http://localhost:11434` by default

3. **Download a model** (default is `llama3.2`, but you can choose any):
   ```bash
   ollama pull llama3.2
   ```
   
   Other popular models:
   - `llama3.2` (default, ~2GB, good balance)
   - `llama3.2:3b` (smaller, faster)
   - `mistral` (excellent quality)
   - `phi3` (small and efficient)

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. (Optional) Set up environment variables:
   Create a `.env` file if you want to customize:
   ```
   OLLAMA_API_URL=http://localhost:11434/api/chat
   OLLAMA_MODEL=llama3.2
   ```
   These are the defaults, so you can skip this step if you're happy with them.

5. Start the Flask server:
   ```bash
   python app.py
   ```
   The backend will run on `http://localhost:5000`

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```
   The frontend will run on `http://localhost:3000`

## Usage

1. Open your browser and go to `http://localhost:3000`
2. Type your message in the input box
3. Press Enter or click the send button
4. Wait for the AI response
5. Continue the conversation!

## API Endpoints

- `POST /chat` - Send a message and get AI response
- `GET /health` - Health check endpoint

## Configuration

### Ollama Settings
You can customize Ollama settings in `backend/app.py` or via environment variables:
- **Model**: Default is `llama3.2` (set via `OLLAMA_MODEL` env var)
- **API URL**: Default is `http://localhost:11434/api/chat` (set via `OLLAMA_API_URL` env var)
- **Temperature**: 0.5 (lower = follows instructions better)
- **Max tokens**: 600 (maximum response length)

To change the model, either:
1. Set `OLLAMA_MODEL` in your `.env` file
2. Or modify `OLLAMA_MODEL` directly in `backend/app.py`
3. Make sure you've downloaded the model: `ollama pull <model-name>`
