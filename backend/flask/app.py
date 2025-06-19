from flask import Flask, jsonify
from flask_cors import CORS
import os # For session key

# Import blueprints
from routes.budget_routes import budget_bp
from routes.chatbot_routes import chatbot_bp
from routes.recommendation_routes import recommendation_bp
from config import Config # To ensure config is loaded and validated

def create_app():
    app = Flask(__name__)
    CORS(app)  # Enable CORS for all routes
    
    # Load configuration
    app.config.from_object(Config) # Though GROQ_API_KEY is used directly by services via Config class
    
    # Secret key for session management (important for chatbot session)
    # In a production app, use a strong, randomly generated key and store it securely.
    app.secret_key = os.urandom(24) 

    # Register blueprints
    app.register_blueprint(budget_bp)
    app.register_blueprint(chatbot_bp)
    app.register_blueprint(recommendation_bp)

    @app.route('/')
    def home():
        return jsonify(message="Welcome to the Amazon Budget App API!",
                       endpoints={
                           "budget_questionnaire": "/api/budget/questionnaire (GET)",
                           "budget_plan_create": "/api/budget/plan (POST)",
                           "budget_plan_view": "/api/budget/plan (GET)",
                           "budget_plan_reset": "/api/budget/plan (DELETE)",
                           "chatbot_chat": "/api/chatbot/chat (POST)",
                           "chatbot_reset": "/api/chatbot/reset (POST)",
                           "chatbot_current_budget": "/api/chatbot/current_budget (GET)",
                           "recommendations": "/api/recommendations/?product=<product_name>&city=<user_city> (GET)"
                       })

    return app

if __name__ == '__main__':
    app = create_app()
    # When running app.py directly, ensure the FLASK_APP environment variable is not strictly needed by Flask's auto-discovery
    # For development, Flask's built-in server is fine.
    # The host='0.0.0.0' makes it accessible from your network, not just localhost.
    app.run(debug=True, host='0.0.0.0', port=5000)
