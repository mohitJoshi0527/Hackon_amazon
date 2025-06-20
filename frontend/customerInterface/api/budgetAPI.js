import API from "./index";
import { FLASK_API } from "@env";
export const getBudgetPlan = async () => {
  try {
    const response = await API.get("/budget/plan");
    return response.data;
  } catch (error) {
    console.error("Error fetching budget plan:", error);
    throw error;
  }
};

export const createBudgetPlan = async (budgetData) => {
  try {
    const response = await API.post("/budget/plan", budgetData);
    return response.data;
  } catch (error) {
    console.error("Error creating budget plan:", error);
    throw error;
  }
};

export const resetBudgetPlan = async () => {
  try {
    const response = await API.delete("/budget/plan");
    return response.data;
  } catch (error) {
    console.error("Error resetting budget plan:", error);
    throw error;
  }
};

export const fetchQuestionnaire = async () => {
  try {
    const response = await API.get("/budget/questionnaire");
    console.log("Questionnaire response:", response.data);
    return response.data;
  } catch (error) {
    console.warn(`Failed to fetch from ${FLASK_API}:`, error.message);
    throw error;
  }
};

export const submitBudgetPlan = async (answers) => {
  try {
    const response = await API.post(
      "/budget/create-from-questionnaire",
      answers
    );
    console.log("Budget plan response:", response.data);
    return response.data;
  } catch (error) {
    console.warn(`Failed to submit to ${FLASK_API}:`, error.message);
    throw error;
  }
};

export const resetBudget = async () => {
  try {
    console.log("Resetting budget...");
    const response = await API.post("/budget/reset");
    console.log("Reset budget response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error resetting budget:", error);
    throw error;
  }
};

export const syncBudgetWithChatbot = async (budgetData) => {
  try {
    const response = await API.post("/budget/update-file", budgetData);
    console.log("Budget sync response:", response.data);
    return response.data;
  } catch (error) {
    console.warn(`Failed to sync with ${FLASK_API}:`, error.message);
    throw error;
  }
};
