import pandas as pd
import re
from groq import Groq
import os
from dotenv import load_dotenv
import json

# Load API key from environment
load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    print("❌ Error: GROQ_API_KEY not found in environment variables.")
    print("Please create a .env file with your API key.")
    exit(1)

client = Groq(api_key=api_key)

def clean_budget_response(response: str):
    """Clean and parse the budget response from API"""
    try:
        # Try to extract JSON if present
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        else:
            # Fallback parsing
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
    except:
        return {}

def get_budget_recommendation(questionnaire_answers):
    """Get budget recommendation based on questionnaire answers"""
    
    # Prepare the prompt with questionnaire answers
    prompt = f"""
     You are an Amazon shopping budget advisor with deep knowledge of Indian market prices. Based on the following questionnaire responses, create a REALISTIC monthly budget breakdown for Amazon shopping that reflects actual market prices and spending patterns.

    Questionnaire Responses:
    1. Age group: {questionnaire_answers['age_group']}
    2. Monthly budget: ₹{questionnaire_answers['monthly_budget']}
    3. Top categories: {questionnaire_answers['top_categories']}
    4. Shopping behavior: {questionnaire_answers['shopping_behavior']}
    5. Unplanned purchases: {questionnaire_answers['unplanned_purchases']}
    6. Primary goal: {questionnaire_answers['primary_goal']}

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

    Create a budget breakdown for total budget of ₹{questionnaire_answers['monthly_budget']} that reflects realistic Indian market pricing and actual shopping patterns.

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
        "total_budget": {questionnaire_answers['monthly_budget']},
        "recommendations": [
            "Electronics: Wait for sales like Big Billion Day for 20-30% savings",
            "Set price alerts for high-value electronics purchases",
            "Buy groceries monthly in bulk to optimize delivery costs"
        ]
    }}
    """

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=1024,
        )
        
        raw_response = response.choices[0].message.content
        budget_data = clean_budget_response(raw_response)
        return budget_data
        
    except Exception as e:
        print(f"❌ Error getting budget recommendation: {e}")
        return {}

def collect_questionnaire_answers():
    """Collect answers from user for the questionnaire"""
    
    questions = {
        "age_group": {
            "question": "What's your age group?",
            "options": ["A) 18-25", "B) 26-35", "C) 36-45", "D) 46+"],
            "type": "choice"
        },
        "monthly_budget": {
            "question": "What's your typical monthly budget for Amazon shopping?",
            "type": "input"
        },
        "top_categories": {
            "question": "Which TWO categories do you spend most on Amazon?",
            "options": ["A) Electronics & Accessories", "B) Groceries & Household Items", 
                       "C) Fashion & Beauty", "D) Books & Media", "E) Home & Kitchen"],
            "type": "multiple"
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
    
    answers = {}
    
    print("🛒 Amazon Budget Planner - Questionnaire\n")
    print("=" * 50)
    
    for key, q_data in questions.items():
        print(f"\n{q_data['question']}")
        
        if q_data['type'] == 'input':
            if key == 'monthly_budget':
                print("💰 Enter your monthly budget amount (in ₹):")
                while True:
                    try:
                        user_input = int(input("Your budget: ₹").strip())
                        if user_input > 0:
                            answers[key] = user_input
                            break
                        else:
                            print("Please enter a positive amount.")
                    except ValueError:
                        print("Please enter a valid number.")
        
        elif q_data['type'] == 'multiple':
            for option in q_data['options']:
                print(f"   {option}")
            print("\n📝 Enter TWO letters (e.g., A B):")
            user_input = input("Your answer: ").strip().upper()
            answers[key] = user_input
        
        else:  # choice type
            for option in q_data['options']:
                print(f"   {option}")
            print("\n📝 Enter your choice (A/B/C/D/E):")
            user_input = input("Your answer: ").strip().upper()
            answers[key] = user_input
    
    return answers

def reset_budget_file():
    """Reset the budget plan JSON file"""
    try:
        if os.path.exists('budget_plan.json'):
            os.remove('budget_plan.json')
            print("✅ Previous budget plan cleared.")
        return True
    except Exception as e:
        print(f"❌ Error clearing previous data: {e}")
        return False

def main():
    """Main function to run the budget planner"""
    
    print("🎯 Welcome to Amazon Smart Budget Planner!")
    
    # Ask if user wants to reset previous data
    if os.path.exists('budget_plan.json'):
        print("\n📁 Previous budget plan found.")
        reset_choice = input("Do you want to create a new plan? (y/n): ").strip().lower()
        if reset_choice in ['y', 'yes']:
            reset_budget_file()
        else:
            print("Using existing budget plan. Delete 'budget_plan.json' to start fresh.")
            return
    
    print("Answer a few questions to get your personalized budget plan.\n")
    
    # Collect questionnaire answers
    answers = collect_questionnaire_answers()
    
    print("\n" + "=" * 50)
    print("🔄 Processing your responses...")
    
    # Get budget recommendation
    budget_plan = get_budget_recommendation(answers)
    
    if budget_plan:
        print("\n🎉 Your Personalized Amazon Budget Plan:")
        print("=" * 50)
        
        for category, amount in budget_plan.items():
            if category not in ['total_budget', 'recommendations']:
                print(f"💰 {category}: ₹{amount:,}")
        
        if 'total_budget' in budget_plan:
            print(f"\n📊 Total Monthly Budget: ₹{budget_plan['total_budget']:,}")
        
        if 'recommendations' in budget_plan:
            print("\n💡 Key Recommendations:")
            for i, rec in enumerate(budget_plan['recommendations'], 1):
                print(f"   {i}. {rec}")
        
        # Save to file (overwrites existing)
        with open('budget_plan.json', 'w') as f:
            json.dump({
                'questionnaire_answers': answers,
                'budget_plan': budget_plan
            }, f, indent=2)
        
        print(f"\n📁 Budget plan saved to 'budget_plan.json'")
        
    else:
        print("❌ Unable to generate budget plan. Please try again.")

if __name__ == "__main__":
    main()