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
    const response = await API.get('/api/budget/questionnaire');
    console.log('Questionnaire response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching questionnaire:', error);
    // Return a default questionnaire in case of API failure
    return {
      questions: [
        {
          id: 1,
          text: "What's your monthly income?",
          type: "number",
          placeholder: "Enter amount in rupees"
        },
        {
          id: 2,
          text: "What's your primary expense category?",
          type: "select",
          options: ["Housing", "Food", "Transportation", "Entertainment", "Shopping"]
        },
        {
          id: 3,
          text: "How much do you want to save monthly?",
          type: "number",
          placeholder: "Enter amount in rupees"
        }
      ]
    };
  }
};

export const submitBudgetPlan = async (answers) => {
  try {
    console.log('Submitting budget plan:', answers);
    
    // Try different request format - send answers directly without nesting
    const response = await API.post('/api/budget/plan', answers);
    
    console.log('Budget plan response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating budget plan:', error);
    throw error;
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
    
    // Send a direct request to update the budget_plan.json file
    const response = await fetch('http://192.168.29.40:5000/api/budget/update-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(budgetData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update budget file: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Budget sync response:', result);
    return result;
  } catch (error) {
    console.error('Error syncing budget with chatbot:', error);
    throw error;
  }
};