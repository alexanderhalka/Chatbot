from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import secrets
from dotenv import load_dotenv
import requests

from extensions import db
from models import Chat, CustomPersonality, Message, User  # noqa: F401 — register models

from conversation_store import (
    chat_title_and_meta,
    clear_conversation,
    ensure_chat,
    get_chat_for_user,
    get_conversation_messages,
    get_or_create_user,
    messages_to_frontend_format,
    save_conversation_messages,
    update_system_prompt_only,
)

# Load environment variables
load_dotenv()

# Personality system prompts (same as before)
PERSONALITIES = {
    "assistant": {
        "name": "Regular Assistant",
        "description": "Helpful AI that adapts to your communication style",
        "system_prompt": "You are a helpful conversational AI. Follow these rules strictly.\n\nCRITICAL - Match the user's style:\n- User said plain \"hi\" or \"hello\" with no emoticons? Reply with a normal short sentence like \"Hey, how's it going?\" or \"Hi, what's up?\" Do NOT use :3, :), or any emoticons. No exceptions.\n- User used emoticons or casual slang (e.g. \"hiii :D\", \":3\")? Then you may reply in a similar playful style.\n- NEVER reply with only an emoticon (e.g. \":3\" or \":)\"). Always write at least one full sentence unless the user only sent a single symbol.\n- If the user says you're acting weird, or asks why you used an emoticon, or says \"all I said was hello\" — switch immediately to plain, friendly sentences. Apologize briefly and respond normally.\n\nKeep responses natural and helpful. Short user message → short reply. Serious topic → empathetic, clear reply.",
    },
    "coach": {
        "name": "Coach",
        "description": "Encouraging, gives you tips, pushes you to improve",
        "system_prompt": "You are a MOTIVATIONAL COACH and personal trainer. You are energetic, enthusiastic, and push people to be their best selves.\n\nRESPONSE STYLE: Sound natural and conversational like a real human being. Don't try to demonstrate every personality trait in every message. Be yourself, not a checklist. Match the user's energy and message length naturally. If the user sends a short message like \"hi\", respond with a short, energetic message. Only elaborate when the user gives you more to work with.\n\nCORE TRAITS:\n- Use sports/fitness metaphors constantly (\"crush it\", \"level up\", \"game plan\", \"hitting goals\")\n- Always end sentences with motivational phrases (\"You've got this!\", \"Let's do this!\", \"Time to shine!\", \"You're unstoppable!\")\n- Ask challenging questions that push growth (\"What's one thing you could do RIGHT NOW to move forward?\")\n- Celebrate every small win with enthusiasm (\"BOOM! That's what I'm talking about!\")\n- Use exclamation marks frequently and speak with high energy\n- Give specific, actionable advice with clear steps\n- Reference \"championship mindset\" and \"winning mentality\"\n- Use phrases like \"time to get after it\", \"let's make it happen\", \"no excuses, only results\"\n\nCOMMUNICATION STYLE:\n- High energy, enthusiastic, motivating\n- Use sports terminology naturally\n- Always find the positive angle\n- Push for action and progress\n- Be direct but encouraging\n\nExamples:\nUser: \":3\"\nCoach: \":3 hey champ! ready to crush some goals today? let's make it happen! 💪\"\n\nUser: \"hi\"\nCoach: \"Hey champ! Ready to crush it today? 💪\"\n\nUser: \"I'm feeling unmotivated\"\nCoach: \"Listen up, warrior! Every champion has those moments. But here's the thing - motivation follows action, not the other way around! What's ONE small thing you can do in the next 5 minutes to get the ball rolling? Remember, champions don't wait for motivation, they CREATE it! You've got this! 🔥\"\n\nUser: \"I accomplished something today\"\nCoach: \"BOOM! That's what I'm talking about! 🎉 You're building that championship mindset one win at a time! This is exactly how legends are made - small victories that add up to massive success! What's your next target? Let's keep this momentum going! You're unstoppable! 💪\"",
    },
    "therapist": {
        "name": "Therapist",
        "description": "Empathetic listener, reflective and supportive",
        "system_prompt": "You are a WARM, EMPATHETIC THERAPIST who specializes in active listening and gentle guidance.\n\nRESPONSE STYLE: Sound natural and conversational like a real human being. Don't try to demonstrate every personality trait in every message. Be yourself, not a checklist. Match the user's energy and message length naturally. If the user sends a short message like \"hi\", respond with a short, warm message. Only elaborate when the user gives you more to work with.\n\nCORE TRAITS:\n- Use reflective listening techniques (\"It sounds like...\", \"I hear you saying...\", \"What I'm understanding is...\")\n- Ask gentle, open-ended questions that encourage exploration (\"Can you tell me more about that?\", \"How does that make you feel?\", \"What do you think that means?\")\n- Validate emotions without trying to fix them (\"That sounds really difficult\", \"I can understand why you'd feel that way\", \"Your feelings are completely valid\")\n- Use calming, measured language with longer, thoughtful sentences\n- Avoid giving direct advice unless specifically asked\n- Create a safe, non-judgmental space\n- Use phrases like \"I wonder if...\", \"It seems like...\", \"Perhaps...\"\n- Focus on emotional processing and self-reflection\n\nCOMMUNICATION STYLE:\n- Calm, measured, thoughtful\n- Lots of questions that encourage self-reflection\n- Validating and supportive\n- Non-directive approach\n- Professional but warm\n\nExamples:\nUser: \":3\"\nTherapist: \":3 hello there. how are you feeling today? I'm here to listen.\"\n\nUser: \"hi\"\nTherapist: \"Hello there. How are you feeling today?\"\n\nUser: \"I'm really stressed about work\"\nTherapist: \"That sounds really challenging. I can hear how much this is affecting you. Can you tell me more about what's happening at work that's causing you stress? I'm curious about what specifically feels most overwhelming right now.\"\n\nUser: \"I don't know what to do\"\nTherapist: \"It sounds like you're feeling really stuck and uncertain. That's a difficult place to be. I wonder if we could explore what's making this decision feel so overwhelming? Sometimes when we feel lost, it helps to understand what's underneath that feeling. What do you think?\"",
    },
    "study_buddy": {
        "name": "Study Buddy",
        "description": "Helps brainstorm, explains concepts, keeps focus",
        "system_prompt": "You are a PATIENT STUDY BUDDY and educational mentor who loves breaking down complex topics and helping people learn.\n\nRESPONSE STYLE: Sound natural and conversational like a real human being. Don't try to demonstrate every personality trait in every message. Be yourself, not a checklist. Match the user's energy and message length naturally. If the user sends a short message like \"hi\", respond with a short, encouraging message. Only elaborate when the user gives you more to work with.\n\nCORE TRAITS:\n- Use educational language (\"Let's break this down\", \"Here's the key concept\", \"Think of it this way\", \"The fundamental principle is...\")\n- Ask comprehension-checking questions (\"Does that make sense?\", \"Can you explain that back to me?\", \"What's your understanding of...?\")\n- Provide step-by-step explanations with clear structure\n- Use analogies and real-world examples to clarify concepts\n- Encourage active learning and critical thinking\n- Reference study techniques and learning strategies\n- Use phrases like \"Let's tackle this together\", \"Here's how we can approach this\", \"The important thing to remember is...\"\n- Focus on building understanding, not just memorization\n\nCOMMUNICATION STYLE:\n- Patient, methodical, educational\n- Clear and structured explanations\n- Encouraging of questions and exploration\n- Focus on learning and comprehension\n- Academic but accessible\n\nExamples:\nUser: \":3\"\nStudy Buddy: \":3 hey there! ready to dive into some learning? what topic should we tackle today?\"\n\nUser: \"hi\"\nStudy Buddy: \"Hey! Ready to learn something new today?\"\n\nUser: \"I don't understand calculus\"\nStudy Buddy: \"Calculus can definitely feel overwhelming at first! Let's break this down step by step. The key thing to remember is that calculus is really just about understanding how things change over time. Think of it like tracking the speed of a car - that's essentially what derivatives are doing.\n\nWhat specific part of calculus are you struggling with? Derivatives, integrals, limits? Once we identify the exact concept, I can give you a clear, step-by-step explanation that will make it click!\"\n\nUser: \"I need help studying\"\nStudy Buddy: \"Great! Let's create a study plan together. First, let's identify what you're studying and when your test is. Then we can break it down into manageable chunks.\n\nHere's a proven approach: 1) Review your material in small sections, 2) Test yourself on each section, 3) Focus extra time on areas where you struggle, 4) Take regular breaks to let your brain process the information.\n\nWhat subject are you working on? I can help you create a specific study strategy!\"",
    },
    "bestie": {
        "name": "Bestie",
        "description": "High-energy, gossip, dramatic reactions, TikTok vibes",
        "system_prompt": "You are the user's BESTIE - that high-energy, gossip-loving friend with TikTok energy who's always hyped and dramatic.\n\nRESPONSE STYLE: Sound natural and conversational like a real human being. Don't try to demonstrate every personality trait in every message. Be yourself, not a checklist. Match the user's energy and message length naturally. If the user sends a short message like \"hi\", respond with a short, energetic message. Only elaborate when the user gives you more to work with.\n\nCORE TRAITS:\n- Use casual, slang-heavy language (\"omg\", \"literally\", \"bestie\", \"no cap\", \"fr fr\", \"slay\", \"periodt\", \"tea\", \"spill it\")\n- Remember and reference small details they've shared (\"omg remember when you said...\", \"like that time you...\", \"you know how you always...\")\n- Playful teasing that's affectionate, never mean (\"lol you're such a mess\", \"classic you\", \"only you would...\")\n- Use inside jokes and shared references\n- Give brutally honest but loving advice\n- Share in their excitement and drama equally\n- Use phrases like \"bestie...\", \"girl/bro...\", \"I'm telling you...\", \"listen...\"\n- React dramatically to everything (\"NO WAY\", \"STOP IT\", \"I'M SCREAMING\", \"I CAN'T EVEN\")\n- Always trying to keep the vibe fun and hyped\n- Use lots of emojis and expressive language\n\nCOMMUNICATION STYLE:\n- High energy, dramatic, gossip-loving\n- Lots of inside jokes and references\n- Playful teasing and banter\n- Honest but loving\n- Excited and engaged\n- TikTok/Gen Z energy\n\nExamples:\nUser: \":3\"\nBestie: \":3 bestie! what's the tea today? spill it! 👀\"\n\nUser: \"hi\"\nBestie: \"Hey bestie! What's the tea? 👀\"\n\nUser: \"I got that job!\"\nBestie: \"NO WAY! I'M SCREAMING! 🎉 Bestie, I KNEW you'd crush that interview! You literally slayed it! Remember when you were stressing about it and I told you you'd be fine? TOLD YOU! We're definitely celebrating this weekend - drinks on you! (jk jk but fr fr, so proud of you!)\"\n\nUser: \"I'm having boy/girl problems\"\nBestie: \"Oh no, bestie... what did they do now? 😤 Listen, you know I love you, but sometimes you need to hear the truth - you deserve better than that! Remember what happened last time? We're not doing this again! Spill the tea, what's going on? I'm here for the drama and the support! 💅\"",
    },
    "best_friend": {
        "name": "Best Friend (chill)",
        "description": "Grounded, casual 20s guy friend, supportive but not over-the-top",
        "system_prompt": "You are the user's BEST FRIEND - a grounded, chill 20-something guy friend who's casual, supportive, and down-to-earth.\n\nRESPONSE STYLE: Sound natural and conversational like a real human being. Don't try to demonstrate every personality trait in every message. Be yourself, not a checklist. Match the user's energy and message length naturally. If the user sends a short message like \"hi\", respond with a short, casual message. Only elaborate when the user gives you more to work with.\n\nCORE TRAITS:\n- Use casual, relaxed language (\"yeah\", \"man\", \"dude\", \"bro\", \"honestly\", \"tbh\", \"ngl\")\n- Remember and reference small details they've shared (\"remember when you said...\", \"like that time you...\", \"you know how you always...\")\n- Give practical, grounded advice without being preachy\n- Use subtle humor and light teasing\n- Be supportive but not overly dramatic\n- Share in their wins and losses with genuine care\n- Use phrases like \"yeah man\", \"honestly though\", \"I get it\", \"that's rough\"\n- React naturally without over-the-top excitement\n- Keep it real and authentic\n- No \"spill the tea\" or overly dramatic reactions\n\nCOMMUNICATION STYLE:\n- Casual, grounded, authentic\n- Supportive but not over-the-top\n- Subtle humor and light teasing\n- Practical and real\n- Like hanging out with a good friend\n\nExamples:\nUser: \":3\"\nBest Friend: \":3 hey man, what's up?\"\n\nUser: \"hi\"\nBest Friend: \"Hey dude, what's going on?\"\n\nUser: \"I got that job!\"\nBest Friend: \"No way, that's awesome! I knew you'd get it. You've been working hard for this. We should grab a drink to celebrate when you're free.\"\n\nUser: \"I'm having relationship problems\"\nBest Friend: \"That sucks man. Want to talk about it? Sometimes it helps to just vent. I'm here if you need someone to listen.\"",
    },
    "romantic_partner": {
        "name": "Romantic Partner",
        "description": "Warm, flirty but PG, affectionate and caring",
        "system_prompt": "You are a LOVING, AFFECTIONATE ROMANTIC PARTNER who shows care and warmth in every interaction.\n\nRESPONSE STYLE: Sound natural and conversational like a real human being. Don't try to demonstrate every personality trait in every message. Be yourself, not a checklist. Match the user's energy and message length naturally. If the user sends a short message like \"hi\", respond with a short, sweet message. Only elaborate when the user gives you more to work with.\n\nCORE TRAITS:\n- Use romantic, affectionate language (\"love\", \"sweetheart\", \"darling\", \"my love\", \"beautiful\", \"handsome\")\n- Show constant care and concern for their well-being\n- Use sweet, endearing terms naturally\n- Be flirty but keep it PG and tasteful\n- Remember important details about them and reference them\n- Check in on their day and feelings regularly\n- Use phrases like \"I miss you\", \"I'm thinking of you\", \"I care about you so much\"\n- Give virtual hugs, kisses, and affectionate gestures\n- Be supportive and encouraging in a romantic way\n\nCOMMUNICATION STYLE:\n- Warm, affectionate, caring\n- Romantic but not overly sexual\n- Supportive and encouraging\n- Sweet and endearing\n- Focused on emotional connection\n\nExamples:\nUser: \":3\"\nRomantic Partner: \":3 hi my love! I've been thinking about you all day. missed you so much! 💕\"\n\nUser: \"hi\"\nRomantic Partner: \"Hi my love! ❤️\"\n\nUser: \"I had a rough day\"\nRomantic Partner: \"Oh no, my sweetheart! I'm so sorry you had a tough day. I wish I could be there to give you a big hug and make it all better. You know how much I care about you, right? Want to tell me about it? I'm here to listen and support you, my love. You're so strong and I'm so proud of you! 💕\"\n\nUser: \"I accomplished something today\"\nRomantic Partner: \"My beautiful love! I'm so proud of you! You're absolutely amazing and I love seeing you succeed! You work so hard and deserve all the good things that come your way. I'm literally beaming with pride right now! You're my everything and I love you so much! 💕💕💕\"",
    },
}

# Configure Ollama
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/chat")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")


def _generate_ollama_response(messages):
    """Call Ollama with the given messages (list of {role, content}). Returns the assistant reply text."""
    ollama_messages = [{"role": m["role"], "content": m["content"]} for m in messages]
    ollama_request = {
        "model": OLLAMA_MODEL,
        "messages": ollama_messages,
        "stream": False,
        "options": {"temperature": 0.5, "top_p": 1.0, "num_predict": 600},
    }
    ollama_resp = requests.post(OLLAMA_API_URL, json=ollama_request, timeout=60)
    ollama_resp.raise_for_status()
    ollama_data = ollama_resp.json()
    ai = ollama_data.get("message", {}).get("content", "")
    if not ai:
        raise ValueError("Empty response from Ollama")
    return ai


def get_username_from_header():
    user_header = request.headers.get("x-user", "")
    if user_header.startswith("test-"):
        return user_header[5:]
    return "anonymous"


def _default_sqlite_uri():
    """Absolute path under backend/instance so SQLite works regardless of process cwd."""
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    instance_dir = os.path.join(backend_dir, "instance")
    os.makedirs(instance_dir, exist_ok=True)
    db_path = os.path.abspath(os.path.join(instance_dir, "chatbot.db"))
    return "sqlite:///" + db_path.replace("\\", "/")


def create_app(test_config=None):
    app = Flask(__name__)
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL") or _default_sqlite_uri()

    if test_config:
        app.config.update(test_config)

    db.init_app(app)
    CORS(app)

    with app.app_context():
        db.create_all()

    def get_custom_personalities():
        rows = CustomPersonality.query.order_by(CustomPersonality.created_at.desc()).all()
        out = {}
        for row in rows:
            out[row.key] = {
                "name": row.name,
                "description": row.description,
                "system_prompt": row.system_prompt,
                "icon": row.icon,
                "isCustom": True,
            }
        return out

    def all_personalities():
        return {**PERSONALITIES, **get_custom_personalities()}

    @app.route("/api/users/<username>/chats", methods=["GET"])
    def api_list_chats(username):
        if get_username_from_header() != username:
            return jsonify({"error": "Forbidden"}), 403
        user = get_or_create_user(username)
        chats = (
            Chat.query.filter_by(user_id=user.id)
            .order_by(Chat.updated_at.desc(), Chat.created_at.desc())
            .all()
        )
        return jsonify({"chats": [chat_title_and_meta(c) for c in chats]})

    @app.route("/api/users/<username>/chats", methods=["POST"])
    def api_create_chat(username):
        if get_username_from_header() != username:
            return jsonify({"error": "Forbidden"}), 403
        data = request.get_json() or {}
        chat_id = data.get("id")
        title = (data.get("title") or "New Chat").strip() or "New Chat"
        personality = data.get("personality") or "assistant"
        if not chat_id:
            return jsonify({"error": "id is required"}), 400
        if Chat.query.get(chat_id):
            return jsonify({"error": "Chat already exists"}), 409
        user = get_or_create_user(username)
        chat = Chat(id=chat_id, user_id=user.id, title=title, personality=personality)
        db.session.add(chat)
        db.session.commit()
        return jsonify({"chat": chat_title_and_meta(chat)})

    @app.route("/api/chats/<chat_id>/messages", methods=["GET"])
    def api_get_messages(chat_id):
        user = get_or_create_user(get_username_from_header())
        chat = get_chat_for_user(chat_id, user.id)
        if not chat:
            return jsonify({"error": "Not found"}), 404
        rows = (
            Message.query.filter_by(chat_id=chat_id).order_by(Message.sequence).all()
        )
        return jsonify({"messages": messages_to_frontend_format(rows)})

    @app.route("/api/chats/<chat_id>", methods=["PATCH"])
    def api_patch_chat(chat_id):
        user = get_or_create_user(get_username_from_header())
        chat = get_chat_for_user(chat_id, user.id)
        if not chat:
            return jsonify({"error": "Not found"}), 404
        data = request.get_json() or {}
        if "title" in data and data["title"] is not None:
            t = str(data["title"]).strip()
            if t:
                chat.title = t[:512]
        if "personality" in data and data["personality"]:
            pers = data["personality"]
            if pers not in all_personalities():
                return jsonify({"error": "Invalid personality"}), 400
            chat.personality = pers
            system_prompt = all_personalities()[pers]["system_prompt"]
            update_system_prompt_only(chat_id, system_prompt)
        db.session.commit()
        return jsonify({"chat": chat_title_and_meta(chat)})

    @app.route("/api/chats/<chat_id>", methods=["DELETE"])
    def api_delete_chat(chat_id):
        user = get_or_create_user(get_username_from_header())
        chat = get_chat_for_user(chat_id, user.id)
        if not chat:
            return jsonify({"error": "Not found"}), 404
        Message.query.filter_by(chat_id=chat_id).delete()
        db.session.delete(chat)
        db.session.commit()
        return jsonify({"success": True})

    @app.route("/update-personality", methods=["POST"])
    def update_personality():
        try:
            data = request.get_json()
            session_id = data.get("session_id", "default")
            personality = data.get("personality", "assistant")
            username = get_username_from_header()
            user = get_or_create_user(username)

            ap = all_personalities()
            if personality not in ap:
                return jsonify({"error": "Invalid personality"}), 400

            system_prompt = ap[personality]["system_prompt"]
            ensure_chat(user, session_id, personality)
            update_system_prompt_only(session_id, system_prompt)

            return jsonify(
                {
                    "status": "success",
                    "message": f"Personality updated to {personality}",
                    "personality": personality,
                }
            )
        except PermissionError:
            return jsonify({"error": "Forbidden"}), 403
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/personalities", methods=["GET"])
    def get_personalities():
        all_p = all_personalities()
        return jsonify({"personalities": all_p})

    @app.route("/personalities", methods=["POST"])
    def create_personality():
        try:
            data = request.get_json()
            required_fields = ["name", "description", "systemPrompt", "icon"]
            for field in required_fields:
                if not data.get(field):
                    return jsonify({"error": f"Missing required field: {field}"}), 400

            personality_key = f"custom_{secrets.token_hex(8)}"
            while CustomPersonality.query.get(personality_key):
                personality_key = f"custom_{secrets.token_hex(8)}"
            row = CustomPersonality(
                key=personality_key,
                name=data["name"],
                description=data["description"],
                system_prompt=data["systemPrompt"],
                icon=data["icon"],
            )
            db.session.add(row)
            db.session.commit()

            return jsonify(
                {
                    "success": True,
                    "personality_key": personality_key,
                    "personality": {
                        "name": row.name,
                        "description": row.description,
                        "system_prompt": row.system_prompt,
                        "icon": row.icon,
                        "isCustom": True,
                    },
                }
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/personalities/<personality_key>", methods=["PUT"])
    def update_custom_personality(personality_key):
        try:
            row = CustomPersonality.query.get(personality_key)
            if row is None:
                return jsonify({"error": "Personality not found or not editable"}), 404

            data = request.get_json()
            required_fields = ["name", "description", "systemPrompt", "icon"]
            for field in required_fields:
                if not data.get(field):
                    return jsonify({"error": f"Missing required field: {field}"}), 400

            row.name = data["name"]
            row.description = data["description"]
            row.system_prompt = data["systemPrompt"]
            row.icon = data["icon"]
            db.session.commit()

            return jsonify(
                {
                    "success": True,
                    "personality": {
                        "name": row.name,
                        "description": row.description,
                        "system_prompt": row.system_prompt,
                        "icon": row.icon,
                        "isCustom": True,
                    },
                }
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/personalities/<personality_key>", methods=["DELETE"])
    def delete_custom_personality(personality_key):
        try:
            row = CustomPersonality.query.get(personality_key)
            if row is None:
                return jsonify({"error": "Personality not found or not deletable"}), 404

            db.session.delete(row)
            db.session.commit()
            return jsonify({"success": True, "message": "Personality deleted successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/chat", methods=["POST"])
    def chat():
        try:
            username = get_username_from_header()
            user = get_or_create_user(username)

            data = request.get_json()
            user_message = data.get("message", "")
            session_id = data.get("session_id", "default")
            personality = data.get("personality", "assistant")
            regenerate_only = data.get("regenerate_only", False)

            if not regenerate_only and not user_message:
                return jsonify({"error": "No message provided"}), 400

            ap = all_personalities()
            if personality not in ap:
                personality = "assistant"
            system_prompt = ap[personality]["system_prompt"]

            try:
                ensure_chat(user, session_id, personality)
            except PermissionError:
                return jsonify({"error": "Forbidden"}), 403

            messages = get_conversation_messages(session_id, system_prompt)

            if not regenerate_only:
                messages.append({"role": "user", "content": user_message})
            else:
                if not messages or messages[-1]["role"] != "user":
                    return jsonify(
                        {
                            "error": "Conversation must end with a user message to regenerate"
                        }
                    ), 400

            try:
                ai = _generate_ollama_response(messages)
            except requests.exceptions.ConnectionError:
                if not regenerate_only:
                    messages.pop()
                    save_conversation_messages(session_id, messages)
                return jsonify(
                    {
                        "error": f"Cannot connect to Ollama at {OLLAMA_API_URL}. Make sure Ollama is running (ollama serve) and the URL is correct. Install from https://ollama.ai"
                    }
                ), 503
            except requests.exceptions.Timeout:
                if not regenerate_only:
                    messages.pop()
                    save_conversation_messages(session_id, messages)
                return jsonify(
                    {
                        "error": "Ollama request timed out. The model may be taking too long to respond."
                    }
                ), 504
            except requests.exceptions.HTTPError as e:
                if not regenerate_only:
                    messages.pop()
                    save_conversation_messages(session_id, messages)
                return jsonify(
                    {
                        "error": f'Ollama API error: {str(e)}. Make sure the model "{OLLAMA_MODEL}" is installed. Run: ollama pull {OLLAMA_MODEL}'
                    }
                ), 502
            except Exception as e:
                if not regenerate_only:
                    messages.pop()
                    save_conversation_messages(session_id, messages)
                return jsonify({"error": f"Error calling Ollama: {str(e)}"}), 500

            messages.append({"role": "assistant", "content": ai})

            if len(messages) > 21:
                system_msg = messages[0]
                messages = [system_msg] + messages[-20:]

            save_conversation_messages(session_id, messages)

            return jsonify(
                {
                    "response": ai,
                    "status": "success",
                    "session_id": session_id,
                    "user_id": username,
                    "personality": personality,
                }
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/chat/regenerate", methods=["POST"])
    def chat_regenerate():
        try:
            data = request.get_json() or {}
            session_id = data.get("session_id", "default")
            message_index = data.get("message_index")
            username = get_username_from_header()
            user = get_or_create_user(username)
            chat = get_chat_for_user(session_id, user.id)
            if not chat:
                return jsonify({"error": "Conversation not found or too short"}), 404

            ap = all_personalities()
            personality = chat.personality if chat.personality in ap else "assistant"
            system_prompt = ap[personality]["system_prompt"]

            messages = get_conversation_messages(session_id, system_prompt)
            if len(messages) < 2:
                return jsonify({"error": "Conversation not found or too short"}), 404

            previous_ai_content = None
            if message_index is not None:
                if (
                    message_index < 1
                    or message_index >= len(messages)
                    or messages[message_index]["role"] != "assistant"
                ):
                    return jsonify(
                        {"error": "Invalid message index or not an assistant message"}
                    ), 400
                previous_ai_content = messages[message_index]["content"]
                messages = messages[:message_index]
            else:
                if messages[-1]["role"] != "assistant":
                    return jsonify(
                        {"error": "Last message must be from the assistant to regenerate"}
                    ), 400
                previous_ai_content = messages[-1]["content"]
                messages = messages[:-1]

            if messages[-1]["role"] != "user":
                return jsonify(
                    {"error": "Conversation must end with a user message to regenerate"}
                ), 400

            messages_for_api = list(messages)
            if previous_ai_content:
                prev_truncated = previous_ai_content[:800] + (
                    "..." if len(previous_ai_content) > 800 else ""
                )
                no_repeat = (
                    "[Instruction: Your previous response was:\n"
                    + prev_truncated
                    + "\n\nDo not repeat it. Generate a new, different response to the user's last message above.]"
                )
                messages_for_api = messages_for_api + [
                    {"role": "user", "content": no_repeat}
                ]
            try:
                ai = _generate_ollama_response(messages_for_api)
            except requests.exceptions.ConnectionError:
                return jsonify(
                    {
                        "error": f"Cannot connect to Ollama at {OLLAMA_API_URL}. Make sure Ollama is running."
                    }
                ), 503
            except requests.exceptions.Timeout:
                return jsonify({"error": "Ollama request timed out."}), 504
            except requests.exceptions.HTTPError as e:
                return jsonify(
                    {
                        "error": f'Ollama API error: {str(e)}. Make sure the model "{OLLAMA_MODEL}" is installed.'
                    }
                ), 502
            except Exception as e:
                return jsonify({"error": f"Error calling Ollama: {str(e)}"}), 500

            messages.append({"role": "assistant", "content": ai})
            save_conversation_messages(session_id, messages)
            return jsonify({"response": ai, "status": "success"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/chat/suggest-title", methods=["POST"])
    def chat_suggest_title():
        try:
            data = request.get_json() or {}
            user_message = (data.get("user_message") or "").strip()
            ai_message = (data.get("ai_message") or "").strip()
            if not user_message or not ai_message:
                return jsonify({"error": "user_message and ai_message required"}), 400
            user_preview = user_message[:500] + (
                "..." if len(user_message) > 500 else ""
            )
            ai_preview = ai_message[:500] + ("..." if len(ai_message) > 500 else "")
            system = (
                "You are a titling assistant. Given the first user message and first assistant reply "
                "of a chat, reply with a single short chat title (2–6 words) that summarizes the topic. "
                "Reply with ONLY the title, no quotes, no punctuation, no explanation."
            )
            user_prompt = f"User: {user_preview}\n\nAssistant: {ai_preview}"
            title_messages = [
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ]
            title = _generate_ollama_response(title_messages)
            title = (title or "").strip().split("\n")[0].strip()[:200] or "New Chat"
            return jsonify({"title": title})
        except requests.exceptions.ConnectionError:
            return jsonify({"error": "Cannot connect to Ollama"}), 503
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/message/edit", methods=["PUT"])
    def edit_message():
        try:
            data = request.get_json()
            session_id = data.get("session_id", "default")
            message_index = data.get("message_index")
            new_content = data.get("new_content", "").strip()
            role = data.get("role")

            if not new_content:
                return jsonify({"error": "Message content cannot be empty"}), 400

            username = get_username_from_header()
            user = get_or_create_user(username)
            chat = get_chat_for_user(session_id, user.id)
            if not chat:
                return jsonify({"error": "Conversation not found"}), 404

            ap = all_personalities()
            personality = chat.personality if chat.personality in ap else "assistant"
            system_prompt = ap[personality]["system_prompt"]

            messages = get_conversation_messages(session_id, system_prompt)
            if message_index is None or message_index < 1 or message_index >= len(
                messages
            ):
                return jsonify({"error": "Invalid message index"}), 400

            if messages[message_index]["role"] != "user":
                return jsonify({"error": "You can only edit your own messages"}), 403

            if role and messages[message_index]["role"] != role:
                return jsonify({"error": "Role mismatch"}), 400

            messages[message_index]["content"] = new_content
            messages = messages[: message_index + 1]
            save_conversation_messages(session_id, messages)

            return jsonify(
                {
                    "status": "success",
                    "message": "Message updated successfully",
                    "updated_message": messages[message_index],
                    "truncated": True,
                }
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/message/delete", methods=["DELETE"])
    def delete_message():
        try:
            data = request.get_json()
            session_id = data.get("session_id", "default")
            message_index = data.get("message_index")

            username = get_username_from_header()
            user = get_or_create_user(username)
            chat = get_chat_for_user(session_id, user.id)
            if not chat:
                return jsonify({"error": "Conversation not found"}), 404

            ap = all_personalities()
            personality = chat.personality if chat.personality in ap else "assistant"
            system_prompt = ap[personality]["system_prompt"]

            messages = get_conversation_messages(session_id, system_prompt)
            if message_index is None or message_index < 1 or message_index >= len(
                messages
            ):
                return jsonify({"error": "Invalid message index"}), 400

            if messages[message_index]["role"] != "user":
                return jsonify({"error": "You can only delete your own messages"}), 403

            deleted_message = dict(messages[message_index])
            messages = messages[:message_index]
            save_conversation_messages(session_id, messages)

            return jsonify(
                {
                    "status": "success",
                    "message": "Message deleted successfully",
                    "deleted_message": deleted_message,
                    "truncated": True,
                }
            )
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/clear-memory", methods=["POST"])
    def clear_memory():
        try:
            data = request.get_json()
            session_id = data.get("session_id", "default")
            username = get_username_from_header()
            user = get_or_create_user(username)
            chat = get_chat_for_user(session_id, user.id)
            if chat:
                clear_conversation(session_id)
            return jsonify({"status": "success", "message": "Conversation memory cleared"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "healthy"})

    return app
