import json
import os
import datetime
from groq import Groq
from config import Config  # Changed from relative to absolute import
from services.budget_service import BudgetService  # Changed from relative to absolute import

class ChatbotService:
    def __init__(self):
        self.client = Groq(api_key=Config.GROQ_API_KEY)
        self.budget_service = BudgetService() # For accessing budget info
        self.conversation_history_store = {} # In-memory store for conversation history by session/user

    def _load_user_budget(self):
        """Load user's budget plan if exists"""
        return self.budget_service.load_budget_plan()

    def _get_base_prompt(self):
        """Get the base prompt for the Amazon budgeting chatbot"""
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

Current Context:
- Current Month: {current_date}
- User has budget planning system in place: {'Yes' if user_budget_data else 'No'}
"""

        if user_budget_data and 'budget_plan' in user_budget_data:
            budget_info = user_budget_data['budget_plan']
            base_prompt += f"""
User's Current Budget Plan:
- Total Monthly Budget: ₹{budget_info.get('total_budget', 'Not set')}
- Electronics & Accessories: ₹{budget_info.get('Electronics & Accessories', 0)}
- Groceries & Household Items: ₹{budget_info.get('Groceries & Household Items', 0)}
- Fashion & Beauty: ₹{budget_info.get('Fashion & Beauty', 0)}
- Books & Media: ₹{budget_info.get('Books & Media', 0)}
- Home & Kitchen: ₹{budget_info.get('Home & Kitchen', 0)}
- Emergency/Unplanned Budget: ₹{budget_info.get('Emergency/Unplanned Budget', 0)}
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
1. Always consider the user's budget constraints when giving advice
2. Suggest budget-friendly alternatives when items are expensive
3. Remind users about their spending limits politely
4. Provide specific Amazon shopping tips (deals, prime benefits, etc.)
5. Help track spending across different categories
6. Be encouraging and supportive about budget management
7. Offer seasonal shopping advice and sale alerts
8. Suggest ways to maximize value for money

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
        if session_id not in self.conversation_history_store:
            base_prompt = self._get_base_prompt()
            self.conversation_history_store[session_id] = [{"role": "system", "content": base_prompt}]

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
        user_budget_data = self._load_user_budget()
        if user_budget_data and 'budget_plan' in user_budget_data:
            return user_budget_data['budget_plan']
        return None
