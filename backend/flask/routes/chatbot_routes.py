from flask import Blueprint, request, jsonify, session
from services.chatbot_service import ChatbotService  # Changed from relative to absolute import

chatbot_bp = Blueprint('chatbot_bp', __name__, url_prefix='/api/chatbot')
chatbot_service = ChatbotService()

@chatbot_bp.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('message')
    session_id = session.get('session_id', 'default_session') # Using Flask session for simple session management

    if not user_input:
        return jsonify({"error": "No message provided"}), 400

    response = chatbot_service.get_chat_response(user_input, session_id)
    session['session_id'] = session_id # Ensure session_id is stored
    return jsonify({"reply": response})

@chatbot_bp.route('/reset', methods=['POST'])
def reset_chat():
    session_id = session.get('session_id', 'default_session')
    message = chatbot_service.reset_conversation(session_id)
    return jsonify({"message": message})

@chatbot_bp.route('/current_budget', methods=['GET'])
def get_current_budget_for_chatbot():
    budget_info = chatbot_service.get_current_budget_info()
    if budget_info:
        # Return the full budget structure that the frontend expects
        full_budget_data = chatbot_service._load_user_budget()
        if full_budget_data:
            return jsonify(full_budget_data), 200
        else:
            # Fallback to just the budget_plan if full data not available
            return jsonify({"budget_plan": budget_info}), 200
    return jsonify({"message": "No budget plan found for chatbot context."}), 404
