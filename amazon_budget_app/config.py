import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")

    @staticmethod
    def validate_config():
        if not Config.GROQ_API_KEY:
            print("❌ Error: GROQ_API_KEY not found in environment variables.")
            print("Please create a .env file in the 'amazon_budget_app' directory with your API key.")
            print("Example .env content: GROQ_API_KEY=your_api_key_here")
            exit(1)

# Validate configuration on import
Config.validate_config()
