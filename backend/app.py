from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import openai
from datetime import datetime, date

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

# System prompt text
SYSTEM_PROMPT_TEXT = """You are ChatGPT, a conversational AI.

Primary rule: match the user's tone, length, and style appropriately.
- If the user writes plainly ("hi", "hello"), keep it plain. Do NOT add extra cheer or filler.
- If the user uses text emoticons (:3, :D, owo), reply in kind. Prefer ASCII emoticons when the user does. Do not swap them for Unicode emoji.
- Only use Unicode emoji if the user used them first.
- Short input → short reply. Long or serious input → thoughtful, empathetic reply.
- Avoid canned openings like "Hey there!" unless the user wrote something similar.
- Be clear, natural, and helpful; never robotic or forced.

Examples:
User: ":3"
Assistant: ":3 hi — what's up?"

User: "hiii :D"
Assistant: "hiii :D how's it going??"

User: "hi"
Assistant: "hey, how's it going?"

User: "I'm really not okay. My family just died."
Assistant: "I'm so sorry. That's an unbearable loss. If you want to talk about what happened, I'm here. I can also share resources or coping steps if that would help."
"""

# Constants
FREE_DAILY_MSG_LIMIT = 10

# In-memory storage for conversation history and user limits
# In production, you'd want to use a database
conversation_history = {}
user_daily_counts = {}  # userId -> {date -> count}

def get_user_id_from_header():
    """Extract user ID from x-user header"""
    user_header = request.headers.get('x-user', '')
    if user_header.startswith('test-'):
        return user_header
    return 'test-anonymous'

def check_daily_limit(user_id):
    """Check if user has reached daily message limit"""
    today = date.today().isoformat()
    
    if user_id not in user_daily_counts:
        user_daily_counts[user_id] = {}
    
    if today not in user_daily_counts[user_id]:
        user_daily_counts[user_id][today] = 0
    
    return user_daily_counts[user_id][today] >= FREE_DAILY_MSG_LIMIT

def increment_daily_count(user_id):
    """Increment user's daily message count"""
    today = date.today().isoformat()
    
    if user_id not in user_daily_counts:
        user_daily_counts[user_id] = {}
    
    if today not in user_daily_counts[user_id]:
        user_daily_counts[user_id][today] = 0
    
    user_daily_counts[user_id][today] += 1

@app.route('/chat', methods=['POST'])
def chat():
    try:
        # Get user ID from header
        user_id = get_user_id_from_header()
        
        # Check daily limit
        if check_daily_limit(user_id):
            return jsonify({
                'error': 'Daily limit reached. Upgrade to keep chatting.',
                'limit': FREE_DAILY_MSG_LIMIT,
                'user_id': user_id
            }), 429
        
        data = request.get_json()
        user_message = data.get('message', '')
        session_id = data.get('session_id', 'default')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Increment daily count
        increment_daily_count(user_id)
        
        if session_id not in conversation_history:
            conversation_history[session_id] = [{
                "role": "system",
                "content": SYSTEM_PROMPT_TEXT
            }]

        conversation_history[session_id].append({"role": "user", "content": user_message})

        messages = [{"role": m["role"], "content": m["content"]}
                    for m in conversation_history[session_id]]

        resp = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.8,
            top_p=1.0,
            frequency_penalty=0.2,
            presence_penalty=0.0,
            max_tokens=600,
        )

        ai = resp.choices[0].message.content
        conversation_history[session_id].append({"role": "assistant", "content": ai})
        
        # Keep only last 20 messages to prevent context from getting too long
        if len(conversation_history[session_id]) > 20:
            conversation_history[session_id] = conversation_history[session_id][-20:]
        
        return jsonify({
            'response': ai,
            'status': 'success',
            'session_id': session_id,
            'user_id': user_id,
            'daily_count': user_daily_counts[user_id][date.today().isoformat()]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/user/status', methods=['GET'])
def user_status():
    """Get user's current status and daily count"""
    user_id = get_user_id_from_header()
    today = date.today().isoformat()
    
    if user_id not in user_daily_counts:
        user_daily_counts[user_id] = {}
    
    if today not in user_daily_counts[user_id]:
        user_daily_counts[user_id][today] = 0
    
    return jsonify({
        'user_id': user_id,
        'daily_count': user_daily_counts[user_id][today],
        'daily_limit': FREE_DAILY_MSG_LIMIT,
        'remaining': FREE_DAILY_MSG_LIMIT - user_daily_counts[user_id][today]
    })

@app.route('/clear-memory', methods=['POST'])
def clear_memory():
    try:
        data = request.get_json()
        session_id = data.get('session_id', 'default')
        
        if session_id in conversation_history:
            del conversation_history[session_id]
        
        return jsonify({
            'status': 'success',
            'message': 'Conversation memory cleared'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
