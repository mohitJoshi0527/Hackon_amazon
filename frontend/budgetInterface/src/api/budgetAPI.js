// src/api/budgetAPI.js
import API from './index';

export const getBudgetPlan = async () => {
  try {
    const response = await API.get('/api/budget/plan');
    return response.data;
  } catch (error) {
    console.error('Error fetching budget plan:', error);
    throw error;
  }
};

export const createBudgetPlan = async (budgetData) => {
  try {
    const response = await API.post('/api/budget/plan', budgetData);
    return response.data;
  } catch (error) {
    console.error('Error creating budget plan:', error);
    throw error;
  }
};

export const resetBudgetPlan = async () => {
  try {
    const response = await API.delete('/api/budget/plan');
    return response.data;
  } catch (error) {
    console.error('Error resetting budget plan:', error);
    throw error;
  }
};

export const fetchQuestionnaire = async () => {
  try {
    console.log('Fetching questionnaire from API...');
    
    // Try localhost first, then fallback to IP
    const endpoints = [
      'http://localhost:5000/api/budget/questionnaire',
      'http://192.168.29.40:5000/api/budget/questionnaire'
    ];
    
    let data = null;
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          data = await response.json();
          console.log('Questionnaire response:', data);
          return data;
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } catch (error) {
        console.warn(`Failed to fetch from ${endpoint}:`, error.message);
        lastError = error;
      }
    }
    
    throw lastError;
  } catch (error) {
    console.error('Error fetching questionnaire from all servers:', error.message);
    console.log('🔄 Using fallback questionnaire data due to network error...');
    
    // Return comprehensive fallback questionnaire that works offline
    return {
      monthly_budget: {
        question: "What is your monthly budget in rupees?",
        type: "number_input"
      },
      financial_goal: {
        question: "What is your primary financial goal?",
        type: "choice",
        options: ["Save for future", "Manage current expenses", "Reduce debt", "Build emergency fund"]
      },
      top_categories: {
        question: "What are your top spending categories? (Select multiple)",
        type: "multiple_choice_text",
        options: [
          "Books & Media",
          "Electronics & Accessories", 
          "Fashion & Clothing",
          "Home & Kitchen",
          "Sports & Fitness",
          "Beauty & Personal Care",
          "Food & Beverages",
          "Travel & Entertainment"
        ]
      }
    };
  }
};

export const submitBudgetPlan = async (answers) => {
  try {
    console.log('Submitting budget plan:', answers);
    
    // Try localhost first, then fallback to IP
    const endpoints = [
      'http://localhost:5000/api/budget/create-from-questionnaire',
      'http://192.168.29.40:5000/api/budget/create-from-questionnaire'
    ];
    
    let result = null;
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(answers),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          result = await response.json();
          console.log('Budget plan response:', result);
          return result;
        } else {
          const errorText = await response.text();
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
      } catch (error) {
        console.warn(`Failed to submit to ${endpoint}:`, error.message);
        lastError = error;
      }
    }
    
    throw lastError;
  } catch (error) {
    console.error('Error creating budget plan on all servers:', error.message);
    console.log('🔄 Creating offline budget plan...');
    
    // Create offline budget plan when server fails
    const monthlyBudget = Number(answers.monthly_budget) || 10000;
    const categories = {};
    
    // Distribute budget based on selected categories
    if (answers.top_categories && Array.isArray(answers.top_categories)) {
      const selectedCategories = answers.top_categories;
      const budgetPerCategory = Math.floor(monthlyBudget / selectedCategories.length);
      
      selectedCategories.forEach(category => {
        categories[category] = budgetPerCategory;
      });
    } else {
      // Default distribution if no categories selected
      categories["Books & Media"] = Math.round(monthlyBudget * 0.1);
      categories["Electronics & Accessories"] = Math.round(monthlyBudget * 0.15);
      categories["Fashion & Clothing"] = Math.round(monthlyBudget * 0.12);
      categories["Home & Kitchen"] = Math.round(monthlyBudget * 0.18);
      categories["Food & Beverages"] = Math.round(monthlyBudget * 0.25);
      categories["Travel & Entertainment"] = Math.round(monthlyBudget * 0.20);
    }
    
    return {
      budget_plan: {
        ...categories,
        total_budget: monthlyBudget,
        recommendations: [
          "Budget created offline - sync with server when connection is available.",
          "Consider the 50/30/20 rule: 50% needs, 30% wants, 20% savings.",
          "Review and adjust your budget monthly based on actual spending."
        ]
      }
    };
  }
};

export const resetBudget = async () => {
  try {
    console.log('Resetting budget...');
    const response = await API.post('/api/budget/reset');
    console.log('Reset budget response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error resetting budget:', error);
    throw error;
  }
};

export const syncBudgetWithChatbot = async (budgetData) => {
  try {
    console.log('Syncing budget with chatbot:', budgetData);
    
    // Try localhost first, then fallback to IP
    const endpoints = [
      'http://localhost:5000/api/budget/update-file',
      'http://192.168.29.40:5000/api/budget/update-file'
    ];
    
    let result = null;
    let lastError = null;
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(budgetData),
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          result = await response.json();
          console.log('Budget sync response:', result);
          return result;
        } else {
          const errorText = await response.text();
          throw new Error(`Failed to update budget file: ${errorText}`);
        }
      } catch (error) {
        console.warn(`Failed to sync with ${endpoint}:`, error.message);
        lastError = error;
      }
    }
    
    throw lastError;
  } catch (error) {
    console.error('Error syncing budget with chatbot on all servers:', error);
    throw error;
  }
};