import json
import os
from groq import Groq
from dotenv import load_dotenv
import datetime

# Load API key from environment
load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    print("❌ Error: GROQ_API_KEY not found in environment variables.")
    print("Please create a .env file with your API key.")
    exit(1)

client = Groq(api_key=api_key)

def load_user_budget():
    """Load user's budget plan if exists"""
    try:
        if os.path.exists('budget_plan.json'):
            with open('budget_plan.json', 'r') as f:
                return json.load(f)
        return None
    except:
        return None

def get_base_prompt():
    """Get the base prompt for the Amazon budgeting chatbot"""
    
    user_budget = load_user_budget()
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
- User has budget planning system in place: {'Yes' if user_budget else 'No'}

"""

    if user_budget:
        budget_info = user_budget.get('budget_plan', {})
        base_prompt += f"""
User's Current Budget Plan:
- Total Monthly Budget: ₹{budget_info.get('total_budget', 'Not set')}
- Electronics & Accessories: ₹{budget_info.get('Electronics & Accessories', 0)}
- Groceries & Household Items: ₹{budget_info.get('Groceries & Household Items', 0)}
- Fashion & Beauty: ₹{budget_info.get('Fashion & Beauty', 0)}
- Books & Media: ₹{budget_info.get('Books & Media', 0)}
- Home & Kitchen: ₹{budget_info.get('Home & Kitchen', 0)}
- Emergency/Unplanned Budget: ₹{budget_info.get('Emergency/Unplanned Budget', 0)}

User Preferences:
- Age Group: {user_budget.get('questionnaire_answers', {}).get('age_group', 'Not specified')}
- Shopping Behavior: {user_budget.get('questionnaire_answers', {}).get('shopping_behavior', 'Not specified')}
- Top Categories: {user_budget.get('questionnaire_answers', {}).get('top_categories', 'Not specified')}

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

def format_ai_response(response):
    """Format AI response for better readability"""
    
    # Split response into sentences
    sentences = response.split('. ')
    
    # If response is too long, format it with line breaks
    if len(response) > 150:
        formatted = ""
        current_line = ""
        
        for sentence in sentences:
            # Add period back if it was removed by split
            if not sentence.endswith('.') and not sentence.endswith('!') and not sentence.endswith('?'):
                sentence += '.'
            
            # If adding this sentence would make line too long, start new line
            if len(current_line + sentence) > 80:
                if current_line:
                    formatted += current_line.strip() + "\n"
                current_line = sentence + " "
            else:
                current_line += sentence + " "
        
        # Add remaining text
        if current_line:
            formatted += current_line.strip()
        
        return formatted
    
    # For shorter responses, check for common patterns and add breaks
    formatted_response = response
    
    # Add line breaks after common patterns
    patterns = [
        ('Here are ', 'Here are \n• '),
        ('1. ', '\n1. '),
        ('2. ', '\n2. '),
        ('3. ', '\n3. '),
        ('• ', '\n• '),
        ('- ', '\n- '),
        ('Recommendations:', 'Recommendations:\n'),
        ('Tips:', 'Tips:\n'),
        ('Options:', 'Options:\n'),
        ('Consider:', 'Consider:\n'),
        ('Remember:', 'Remember:\n'),
    ]
    
    for old, new in patterns:
        formatted_response = formatted_response.replace(old, new)
    
    return formatted_response

def amazon_budget_chatbot():
    """Main chatbot function"""
    
    print("🤖 Amazon Budget Assistant")
    print("=" * 40)
    print("Hi! I'm your Amazon Budget Assistant! 💰")
    print("I can help you shop smart, stay within budget, and find great deals.")
    print("Type 'quit' to exit, 'budget' to see your current plan, or 'help' for commands.\n")
    
    # Initialize conversation with base prompt
    base_prompt = get_base_prompt()
    conversation_history = [{"role": "system", "content": base_prompt}]
    
    while True:
        user_input = input("You: ").strip()
        
        if user_input.lower() in ['quit', 'exit', 'bye']:
            print("🤖 Budget Assistant: Happy shopping! Remember to stick to your budget! 💰✨")
            break
            
        if user_input.lower() == 'budget':
            display_current_budget()
            continue
            
        if user_input.lower() == 'help':
            display_help()
            continue
            
        if user_input.lower() == 'reset':
            conversation_history = [{"role": "system", "content": base_prompt}]
            print("🤖 Budget Assistant: Conversation reset! How can I help you with your Amazon shopping today?")
            continue
        
        if not user_input:
            continue
            
        # Add user message to conversation
        conversation_history.append({"role": "user", "content": user_input})
        
        try:
            # Get response from AI
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=conversation_history,
                temperature=0.7,
                max_tokens=256,
            )
            ai_response = response.choices[0].message.content
            
            # Format the response for better readability
            formatted_response = format_ai_response(ai_response)
            print(f"🤖 Budget Assistant: {formatted_response}\n")
            
            # Add AI response to conversation history
            conversation_history.append({"role": "assistant", "content": ai_response})
            
            # Keep conversation history manageable (last 10 exchanges)
            if len(conversation_history) > 21:  # 1 system + 20 messages
                conversation_history = [conversation_history[0]] + conversation_history[-20:]
                
        except Exception as e:
            print(f"🤖 Budget Assistant: Sorry, I'm having trouble connecting right now. Please try again! 😅")
            print(f"Error: {e}")

def display_current_budget():
    """Display user's current budget plan"""
    user_budget = load_user_budget()
    
    if user_budget:
        budget_info = user_budget.get('budget_plan', {})
        print("\n💰 Your Current Budget Plan:")
        print("=" * 30)
        
        for category, amount in budget_info.items():
            if category not in ['total_budget', 'recommendations']:
                print(f"📦 {category}: ₹{amount:,}")
        
        if 'total_budget' in budget_info:
            print(f"\n📊 Total: ₹{budget_info['total_budget']:,}")
        print()
    else:
        print("\n❌ No budget plan found. Run 'python budget.py' to create one!\n")

def display_help():
    """Display available commands"""
    print("\n🔧 Available Commands:")
    print("=" * 25)
    print("💬 Just chat - Ask me anything about Amazon shopping!")
    print("💰 'budget' - View your current budget plan")
    print("🔄 'reset' - Start a fresh conversation")
    print("❓ 'help' - Show this help menu")
    print("👋 'quit' - Exit the assistant")
    print("\n💡 Example questions:")
    print("- 'Should I buy this ₹5000 laptop?'")
    print("- 'Find me budget headphones under ₹2000'")
    print("- 'How much have I allocated for groceries?'")
    print("- 'When is the next Amazon sale?'\n")

if __name__ == "__main__":
    amazon_budget_chatbot()
