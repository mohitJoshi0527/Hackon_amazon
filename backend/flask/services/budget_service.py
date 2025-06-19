import json
import os
import re 
from config import Config  # Changed from relative to absolute import
from groq import Groq 
import time

class BudgetService:
    def __init__(self):
        self.client = Groq(api_key=Config.GROQ_API_KEY)
        self.budget_file_path = 'budget_plan.json' # Relative to app root

        # Add file caching
        self._file_cache = None
        self._file_cache_timestamp = None
        self._file_cache_duration = 30  # Cache for 30 seconds

    def _clean_budget_response(self, response: str):
        """Clean and parse the budget response from API"""
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                lines = response.strip().split('\n')
                budget_dict = {}
                for line in lines:
                    if ':' in line:
                        category, amount = line.split(':', 1)
                        category = category.strip()
                        amount = re.sub(r'[^\d]', '', amount.strip())
                        if amount:
                            budget_dict[category] = int(amount)
                return budget_dict
        except Exception as e:
            print(f"Error parsing budget response: {e}")
            return {}

    def get_budget_recommendation(self, questionnaire_answers):
        """Get budget recommendation based on questionnaire answers"""
        prompt = f"""
        You are an Amazon shopping budget advisor with deep knowledge of Indian market prices. Based on the following questionnaire responses, create a REALISTIC monthly budget breakdown for Amazon shopping that reflects actual market prices and spending patterns.

        Questionnaire Responses:
        1. Age group: {questionnaire_answers.get('age_group')}
        2. Monthly budget: ₹{questionnaire_answers.get('monthly_budget')}
        3. Top categories: {questionnaire_answers.get('top_categories')}
        4. Shopping behavior: {questionnaire_answers.get('shopping_behavior')}
        5. Unplanned purchases: {questionnaire_answers.get('unplanned_purchases')}
        6. Primary goal: {questionnaire_answers.get('primary_goal')}

        IMPORTANT PRICING GUIDELINES for realistic budget allocation:
        - Electronics & Accessories: Typically 25-40% of budget (smartphones ₹15K+, laptops ₹30K+, earphones ₹1K+)
        - Groceries & Household Items: 15-25% of budget (monthly essentials, cleaning supplies)
        - Fashion & Beauty: 15-25% of budget (clothing ₹500-3K per item, beauty products ₹200-2K)
        - Books & Media: 3-8% of budget (books ₹200-800, subscriptions ₹200-500)
        - Home & Kitchen: 10-20% of budget (appliances ₹2K-20K, utensils ₹500-3K)
        - Emergency/Unplanned Budget: 10-15% of budget (deals, impulse purchases)

        Consider these factors:
        - Electronics have higher average transaction values but lower frequency
        - Groceries have lower per-item cost but higher frequency purchases
        - User's age group affects priorities (younger=electronics, older=home/kitchen)
        - Shopping behavior affects emergency budget allocation
        - Top categories mentioned should get higher allocation

        Create a budget breakdown for total budget of ₹{questionnaire_answers.get('monthly_budget')} that reflects realistic Indian market pricing and actual shopping patterns.

        Return response as JSON object with category names as keys and budget amounts in INR as values.
        Also include "total_budget" field and "recommendations" field with 2-3 practical tips.

        Example realistic format for ₹50,000 budget:
        {{
            "Electronics & Accessories": 18000,
            "Groceries & Household Items": 8000,
            "Fashion & Beauty": 10000,
            "Books & Media": 3000,
            "Home & Kitchen": 6000,
            "Emergency/Unplanned Budget": 5000,
            "total_budget": {questionnaire_answers.get('monthly_budget')},
            "recommendations": [
                "Electronics: Wait for sales like Big Billion Day for 20-30% savings",
                "Set price alerts for high-value electronics purchases",
                "Buy groceries monthly in bulk to optimize delivery costs"
            ]
        }}
        """
        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile", # Ensure this model is available or use a suitable one
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=1024,
            )
            raw_response = response.choices[0].message.content
            budget_data = self._clean_budget_response(raw_response)
            return budget_data
        except Exception as e:
            print(f"❌ Error getting budget recommendation: {e}")
            return {}

    def save_budget_plan(self, answers, budget_plan):
        """Saves the budget plan to a JSON file."""
        try:
            with open(self.budget_file_path, 'w') as f:
                json.dump({
                    'questionnaire_answers': answers,
                    'budget_plan': budget_plan
                }, f, indent=2)
            # Clear cache after successful save
            self._file_cache = None
            self._file_cache_timestamp = None
            return True
        except Exception as e:
            print(f"Error saving budget plan: {e}")
            return False

    def load_budget_plan(self, force_refresh=False):
        """Load budget plan from file with smart caching"""
        try:
            budget_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'budget_plan.json')
            current_time = time.time() if hasattr(time, 'time') else 0
            
            # Use cached data if available and not forcing refresh
            if (not force_refresh and self._file_cache and self._file_cache_timestamp and 
                current_time - self._file_cache_timestamp < self._file_cache_duration):
                return self._file_cache
            
            if os.path.exists(budget_file_path):
                # Check file modification time to see if it actually changed
                file_mtime = os.path.getmtime(budget_file_path)
                
                if (not force_refresh and self._file_cache and self._file_cache_timestamp and 
                    file_mtime <= self._file_cache_timestamp):
                    # File hasn't been modified, return cached data
                    return self._file_cache
                
                with open(budget_file_path, 'r', encoding='utf-8') as file:
                    data = json.load(file)
                    
                    # Update cache
                    self._file_cache = data
                    self._file_cache_timestamp = file_mtime
                    
                    if force_refresh:
                        print(f"🔄 Force loaded budget data from file")
                    
                    return data
            else:
                print(f"⚠️ Budget file not found at: {budget_file_path}")
                return None
        except Exception as e:
            print(f"❌ Error loading budget plan: {e}")
            return None

    def reset_budget_file(self):
        """Reset the budget plan JSON file"""
        try:
            if os.path.exists(self.budget_file_path):
                os.remove(self.budget_file_path)
            return True
        except Exception as e:
            print(f"❌ Error clearing previous data: {e}")
            return False

    def get_questionnaire_schema(self):
        """Returns the schema for the questionnaire."""
        return {
            "age_group": {
                "question": "What's your age group?",
                "options": ["A) 18-25", "B) 26-35", "C) 36-45", "D) 46+"],
                "type": "choice"
            },
            "monthly_budget": {
                "question": "What's your typical monthly budget for Amazon shopping (in ₹)?",
                "type": "number_input" # Changed for clarity
            },
            "top_categories": {
                "question": "Which TWO categories do you spend most on Amazon?",
                "options": ["A) Electronics & Accessories", "B) Groceries & Household Items",
                           "C) Fashion & Beauty", "D) Books & Media", "E) Home & Kitchen"],
                "type": "multiple_choice_text" # Changed for clarity
            },
            "shopping_behavior": {
                "question": "How would you describe your shopping behavior?",
                "options": ["A) I plan purchases and stick to budget", "B) I impulse buy when I see deals",
                           "C) I buy essentials first, then extras if budget allows"],
                "type": "choice"
            },
            "unplanned_purchases": {
                "question": "How many unplanned Amazon purchases do you make monthly?",
                "options": ["A) 0-1", "B) 2-4", "C) 5+"],
                "type": "choice"
            },
            "primary_goal": {
                "question": "What's your primary goal for budgeting your Amazon spending?",
                "options": ["A) Save money for other priorities", "B) Avoid overspending and debt",
                           "C) Better track where my money goes", "D) Plan for upcoming major purchases"],
                "type": "choice"
            }
        }
