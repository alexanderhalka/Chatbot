from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import openai
from datetime import datetime

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

# In-memory storage for conversation history
# In production, you'd want to use a database
conversation_history = {}

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = data.get('message', '')
        session_id = data.get('session_id', 'default')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        if session_id not in conversation_history:
            conversation_history[session_id] = [{
                "role": "system",
                "content": SYSTEM_PROMPT_TEXT  # paste the prompt above here
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
            'session_id': session_id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
