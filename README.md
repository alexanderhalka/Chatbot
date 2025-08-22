# ChatGPT Clone

A simple ChatGPT clone built with React frontend and Python Flask backend, integrated with OpenAI's GPT API.

## Features

- 🚀 Modern, responsive UI similar to ChatGPT
- 💬 Real-time chat interface with OpenAI GPT-3.5-turbo
- 🎨 Beautiful gradient design with smooth animations
- 📱 Mobile-responsive design
- ⚡ Fast and lightweight

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
- OpenAI API key

## Setup Instructions

### 1. Backend Setup

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

4. Set up environment variables:
   ```bash
   cp env.example .env
   ```
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   ```

5. Start the Flask server:
   ```bash
   python app.py
   ```
   The backend will run on `http://localhost:5000`

### 2. Frontend Setup

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

### OpenAI API
- Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- Add it to the `.env` file in the backend directory

### Model Settings
You can modify the AI model settings in `backend/app.py`:
- Model: Currently using `gpt-3.5-turbo`
- Max tokens: 1000
- Temperature: 0.7

## Security Notes

- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore`
- Keep your OpenAI API key secure

## Troubleshooting

### Common Issues

1. **CORS errors**: Make sure the backend is running on port 5000
2. **API key errors**: Verify your OpenAI API key is correct and has sufficient credits
3. **Port conflicts**: Change the port in `app.py` if port 5000 is in use

### Error Messages

- "No message provided": Make sure you're sending a message in the request
- "OpenAI API error": Check your API key and internet connection

## Technologies Used

- **Backend**: Python, Flask, OpenAI API
- **Frontend**: React, CSS3
- **Styling**: Modern CSS with gradients and animations

## License

This project is for educational purposes. Please respect OpenAI's terms of service.

## Contributing

Feel free to submit issues and enhancement requests!
