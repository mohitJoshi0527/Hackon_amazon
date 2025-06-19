import json
import os
import datetime
import re
from groq import Groq
from config import Config
from services.budget_service import BudgetService

class ChatbotService:
    def __init__(self):
        self.client = Groq(api_key=Config.GROQ_API_KEY)
        self.budget_service = BudgetService()
        self.conversation_history_store = {}
        self.pending_budget_updates = {}
        # Add caching for budget data
        self._cached_budget = None
        self._cache_timestamp = None
        self._cache_duration = 30  # Cache for 30 seconds

    def _load_user_budget(self):
        """Load user's budget plan with smart caching"""
        current_time = datetime.datetime.now().timestamp()
        
        # Use cached data if it's still fresh
        if (self._cached_budget and self._cache_timestamp and 
            current_time - self._cache_timestamp < self._cache_duration):
            return self._cached_budget
        
        # Load fresh data only when cache is expired
        budget_data = self.budget_service.load_budget_plan(force_refresh=False)
        
        # Update cache
        if budget_data:
            self._cached_budget = budget_data
            self._cache_timestamp = current_time
            print(f"🔄 Refreshed budget cache at {datetime.datetime.now().strftime('%H:%M:%S')}")
        
        return budget_data

    def _clear_budget_cache(self):
        """Clear the budget cache to force fresh load"""
        self._cached_budget = None
        self._cache_timestamp = None
        print("🗑️ Budget cache cleared")

    def _parse_budget_update_request(self, user_input):
        """Parse budget update requests from user input"""
        # Common patterns for budget updates
        patterns = [
            r'(?:reduce|decrease|lower|cut)\s+(?:my\s+)?(.+?)\s+(?:budget\s+)?(?:to|by)\s+(?:₹|rs\.?\s*)?(\d+)',
            r'(?:increase|raise|boost|up)\s+(?:my\s+)?(.+?)\s+(?:budget\s+)?(?:to|by)\s+(?:₹|rs\.?\s*)?(\d+)',
            r'(?:set|change|update|make)\s+(?:my\s+)?(.+?)\s+(?:budget\s+)?(?:to|at)\s+(?:₹|rs\.?\s*)?(\d+)',
            r'(?:allocate|assign)\s+(?:₹|rs\.?\s*)?(\d+)\s+(?:to|for)\s+(.+?)(?:\s+budget)?',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, user_input.lower())
            if match:
                if 'allocate' in pattern or 'assign' in pattern:
                    amount, category = match.groups()
                else:
                    category, amount = match.groups()
                
                # Clean category name
                category = category.strip()
                category_mappings = {
                    'books': 'Books & Media',
                    'book': 'Books & Media',
                    'media': 'Books & Media',
                    'electronics': 'Electronics & Accessories',
                    'electronic': 'Electronics & Accessories',
                    'accessories': 'Electronics & Accessories',
                    'grocery': 'Groceries & Household Items',
                    'groceries': 'Groceries & Household Items',
                    'household': 'Groceries & Household Items',
                    'fashion': 'Fashion & Beauty',
                    'beauty': 'Fashion & Beauty',
                    'home': 'Home & Kitchen',
                    'kitchen': 'Home & Kitchen',
                    'emergency': 'Emergency/Unplanned Budget',
                    'unplanned': 'Emergency/Unplanned Budget'
                }
                
                # Find matching category
                matched_category = None
                for key, value in category_mappings.items():
                    if key in category.lower():
                        matched_category = value
                        break
                
                if not matched_category:
                    # Try partial matching with existing categories
                    current_budget = self._load_user_budget()
                    if current_budget and 'budget_plan' in current_budget:
                        for cat in current_budget['budget_plan'].keys():
                            if cat.lower() != 'total_budget' and cat.lower() != 'recommendations':
                                if any(word in cat.lower() for word in category.split()):
                                    matched_category = cat
                                    break
                
                return {
                    'category': matched_category or category,
                    'amount': int(amount),
                    'action': 'reduce' if any(word in user_input.lower() for word in ['reduce', 'decrease', 'lower', 'cut']) else 'set'
                }
        
        return None

    def _confirm_budget_update(self, session_id, update_request):
        """Store pending budget update and ask for confirmation"""
        self.pending_budget_updates[session_id] = update_request
        
        current_budget = self._load_user_budget()
        current_amount = 0
        
        if current_budget and 'budget_plan' in current_budget:
            current_amount = current_budget['budget_plan'].get(update_request['category'], 0)
        
        confirmation_message = f"""
I understand you want to {update_request['action']} your {update_request['category']} budget to ₹{update_request['amount']:,}.

Current {update_request['category']} budget: ₹{current_amount:,}
New {update_request['category']} budget: ₹{update_request['amount']:,}

Would you like me to proceed with this change? Please reply with:
• "yes" or "confirm" to proceed
• "no" or "cancel" to cancel
        """
        
        return confirmation_message

    def _process_budget_confirmation(self, user_input, session_id):
        """Process user confirmation for budget updates"""
        if session_id not in self.pending_budget_updates:
            return None
        
        user_input_lower = user_input.lower().strip()
        
        if any(word in user_input_lower for word in ['yes', 'confirm', 'proceed', 'ok', 'sure']):
            # User confirmed - proceed with update
            update_request = self.pending_budget_updates[session_id]
            success = self._execute_budget_update(update_request)
            
            # Clear pending update
            del self.pending_budget_updates[session_id]
            
            if success:
                return f"✅ Successfully updated your {update_request['category']} budget to ₹{update_request['amount']:,}!\n\nYour budget has been saved and updated. You can see the changes in your budget overview."
            else:
                return "❌ Sorry, I couldn't update your budget. Please try again or adjust your budget manually from the home screen."
        
        elif any(word in user_input_lower for word in ['no', 'cancel', 'abort', 'stop']):
            # User cancelled
            del self.pending_budget_updates[session_id]
            return "Budget update cancelled. Your current budget remains unchanged."
        
        else:
            # Invalid response
            return "Please respond with 'yes' to confirm the budget update or 'no' to cancel."

    def _execute_budget_update(self, update_request):
        """Execute the actual budget update"""
        try:
            # Load current budget data
            current_data = self._load_user_budget()
            if not current_data or 'budget_plan' not in current_data:
                return False
            
            # Update the specific category
            current_data['budget_plan'][update_request['category']] = update_request['amount']
            
            # Recalculate total budget
            new_total = 0
            for key, value in current_data['budget_plan'].items():
                if key not in ['total_budget', 'recommendations']:
                    new_total += int(value)
            
            current_data['budget_plan']['total_budget'] = new_total
            
            # Save to server (budget_plan.json)
            success = self.budget_service.save_budget_plan(
                current_data.get('questionnaire_answers', {}),
                current_data['budget_plan']
            )
            
            if success:
                # Clear cache to force fresh load on next request
                self._clear_budget_cache()
                print(f"Budget updated successfully: {update_request['category']} = ₹{update_request['amount']}")
                
            return success
            
        except Exception as e:
            print(f"Error executing budget update: {e}")
            return False

    def _get_base_prompt(self):
        """Get the base prompt for the Amazon budgeting chatbot"""
        # Load budget data with caching
        user_budget_data = self._load_user_budget()
        current_date = datetime.datetime.now().strftime("%B %Y")
        
        base_prompt = f"""
You are Amazon Budget Assistant, a helpful AI chatbot specialized in Amazon shopping budget management and smart spending advice.

Your primary role is to help users:
- Stay within their Amazon shopping budget
- Make informed purchasing decisions
- Find the best deals and alternatives
- Track their spending across categories
- Provide personalized shopping recommendations
- UPDATE AND MODIFY USER BUDGETS when requested

Current Context:
- Current Month: {current_date}
- User has budget planning system in place: {'Yes' if user_budget_data else 'No'}

BUDGET UPDATE CAPABILITIES:
You can help users update their budget categories when they request changes like:
- "reduce my Books & Media budget to 299"
- "increase electronics budget to 5000"
- "set groceries budget to 2000"

When users request budget changes:
1. Parse their request to identify the category and new amount
2. Ask for confirmation showing current vs new amounts
3. Process the update when confirmed
4. Provide success confirmation

Available budget categories:
- Electronics & Accessories
- Groceries & Household Items  
- Fashion & Beauty
- Books & Media
- Home & Kitchen
- Emergency/Unplanned Budget
"""

        if user_budget_data and 'budget_plan' in user_budget_data:
            budget_info = user_budget_data['budget_plan']
            
            # Ensure all values are properly converted to numbers for display
            def safe_int(value, default=0):
                try:
                    return int(float(str(value))) if value else default
                except (ValueError, TypeError):
                    return default
            
            total_budget = safe_int(budget_info.get('total_budget', 0))
            electronics = safe_int(budget_info.get('Electronics & Accessories', 0))
            groceries = safe_int(budget_info.get('Groceries & Household Items', 0))
            fashion = safe_int(budget_info.get('Fashion & Beauty', 0))
            books = safe_int(budget_info.get('Books & Media', 0))
            home = safe_int(budget_info.get('Home & Kitchen', 0))
            emergency = safe_int(budget_info.get('Emergency/Unplanned Budget', 0))
            
            base_prompt += f"""
User's Current Budget Plan (Latest Data):
- Total Monthly Budget: ₹{total_budget:,}
- Electronics & Accessories: ₹{electronics:,}
- Groceries & Household Items: ₹{groceries:,}
- Fashion & Beauty: ₹{fashion:,}
- Books & Media: ₹{books:,}
- Home & Kitchen: ₹{home:,}
- Emergency/Unplanned Budget: ₹{emergency:,}

DEBUG INFO: Raw budget data loaded at {datetime.datetime.now().strftime('%H:%M:%S')}
Raw values: Electronics={budget_info.get('Electronics & Accessories')}, Books={budget_info.get('Books & Media')}, Home={budget_info.get('Home & Kitchen')}, Groceries={budget_info.get('Groceries & Household Items')}, Emergency={budget_info.get('Emergency/Unplanned Budget')}
"""
            
        if user_budget_data and 'questionnaire_answers' in user_budget_data:
            q_answers = user_budget_data['questionnaire_answers']
            base_prompt += f"""
User Preferences:
- Age Group: {q_answers.get('age_group', 'Not specified')}
- Shopping Behavior: {q_answers.get('shopping_behavior', 'Not specified')}
- Top Categories: {q_answers.get('top_categories', 'Not specified')}
"""

        base_prompt += """
Key Guidelines:
1. Always use the LATEST budget data shown above when discussing budgets
2. Always consider the user's budget constraints when giving advice
3. Suggest budget-friendly alternatives when items are expensive
4. Remind users about their spending limits politely
5. Provide specific Amazon shopping tips (deals, prime benefits, etc.)
6. Help track spending across different categories
7. Be encouraging and supportive about budget management
8. Offer seasonal shopping advice and sale alerts
9. Suggest ways to maximize value for money
10. ACTIVELY HELP WITH BUDGET UPDATES when requested

Response Style:
- Be friendly, helpful, and encouraging
- Use emojis occasionally to make conversations engaging
- Provide specific, actionable advice
- Keep responses concise but informative (2-4 sentences max)
- Always relate advice back to their budget goals
- Use bullet points or numbered lists when giving multiple suggestions
- Break long responses into readable chunks
- Use clear formatting with line breaks for better readability
- Start recommendations with "Here are some options:" or similar phrases

You can help with:
✅ Product recommendations within budget
✅ Price comparison and alternatives
✅ Spending tracking and analysis  
✅ Deal hunting and sale timing
✅ Budget optimization tips
✅ Category-wise spending advice
✅ Prime membership benefits
✅ Return and refund guidance
✅ BUDGET UPDATES AND MODIFICATIONS

If asked about topics unrelated to Amazon shopping or budgeting, politely redirect the conversation back to your expertise area.
"""
        return base_prompt

    def _format_ai_response(self, response):
        """Format AI response for better readability"""
        sentences = response.split('. ')
        if len(response) > 150:
            formatted = ""
            current_line = ""
            for sentence in sentences:
                if not sentence.endswith('.') and not sentence.endswith('!') and not sentence.endswith('?'):
                    sentence += '.'
                if len(current_line + sentence) > 80:
                    if current_line:
                        formatted += current_line.strip() + "\n"
                    current_line = sentence + " "
                else:
                    current_line += sentence + " "
            if current_line:
                formatted += current_line.strip()
            return formatted
        
        formatted_response = response
        patterns = [
            ('Here are ', 'Here are \n• '), ('1. ', '\n1. '), ('2. ', '\n2. '), ('3. ', '\n3. '),
            ('• ', '\n• '), ('- ', '\n- '), ('Recommendations:', 'Recommendations:\n'),
            ('Tips:', 'Tips:\n'), ('Options:', 'Options:\n'), ('Consider:', 'Consider:\n'),
            ('Remember:', 'Remember:\n'),
        ]
        for old, new in patterns:
            formatted_response = formatted_response.replace(old, new)
        return formatted_response

    def get_chat_response(self, user_input: str, session_id: str = "default_session"):
        """Handles a single chat interaction."""
        
        # Check if user is confirming a pending budget update
        if session_id in self.pending_budget_updates:
            confirmation_response = self._process_budget_confirmation(user_input, session_id)
            if confirmation_response:
                return confirmation_response
        
        # Check if user is requesting a budget update
        budget_update_request = self._parse_budget_update_request(user_input)
        if budget_update_request:
            return self._confirm_budget_update(session_id, budget_update_request)
        
        # Only refresh system prompt if cache is expired
        base_prompt = self._get_base_prompt()
        
        if session_id not in self.conversation_history_store:
            self.conversation_history_store[session_id] = [{"role": "system", "content": base_prompt}]
        else:
            # Only update system prompt if we have fresh data
            if self._cache_timestamp and datetime.datetime.now().timestamp() - self._cache_timestamp < 5:
                self.conversation_history_store[session_id][0] = {"role": "system", "content": base_prompt}

        conversation_history = self.conversation_history_store[session_id]
        
        # Add user message to conversation
        conversation_history.append({"role": "user", "content": user_input})
        
        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile", # Ensure this model is available
                messages=conversation_history,
                temperature=0.7,
                max_tokens=256,
            )
            ai_response_content = response.choices[0].message.content
            
            # Add AI response to conversation history
            conversation_history.append({"role": "assistant", "content": ai_response_content})
            
            # Keep conversation history manageable
            if len(conversation_history) > 21:  # 1 system + 10 exchanges (20 messages)
                self.conversation_history_store[session_id] = [conversation_history[0]] + conversation_history[-20:]
            else:
                self.conversation_history_store[session_id] = conversation_history
            
            return self._format_ai_response(ai_response_content)
            
        except Exception as e:
            print(f"Chatbot API Error: {e}")
            # Optionally remove the last user message if API call failed
            if conversation_history and conversation_history[-1]["role"] == "user":
                conversation_history.pop()
            return "Sorry, I'm having trouble connecting right now. Please try again! 😅"

    def reset_conversation(self, session_id: str = "default_session"):
        base_prompt = self._get_base_prompt()
        self.conversation_history_store[session_id] = [{"role": "system", "content": base_prompt}]
        return "Conversation reset! How can I help you with your Amazon shopping today?"

    def get_current_budget_info(self):
        """Get current budget info with caching"""
        return self._load_user_budget()
