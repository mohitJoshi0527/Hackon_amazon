# This file can be empty
from groq import Groq
import os
from config import Config

# services/budget_service.py - Update the __init__ method
def __init__(self):
    self.client = Groq(api_key=Config.GROQ_API_KEY)
    # Use absolute path instead of relative path
    self.budget_file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'budget_plan.json')
    print(f"Budget file will be saved at: {self.budget_file_path}")
