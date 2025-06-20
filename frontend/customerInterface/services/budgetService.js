import { FLASK_API } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";

class BudgetService {
  constructor() {
    this.cache = null;
    this.lastFetch = null;
    this.CACHE_DURATION = 60000;
    this.lastServerDataHash = null;
    this.isPolling = false;
    this.pollInterval = null;
    this.currentCallback = null;
    this.navigationCallback = null;
    this.lastFileCheck = null;

    if (typeof window !== "undefined") {
      window.budgetService = this;
    }
  }

  createDataHash(data) {
    try {
      const normalizedData = {
        budget_plan: data.budget_plan || data,
        questionnaire_answers: data.questionnaire_answers || {},
      };

      const sortedData = JSON.stringify(
        normalizedData,
        Object.keys(normalizedData).sort()
      );

      let hash = 0;
      for (let i = 0; i < sortedData.length; i++) {
        const char = sortedData.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }

      return hash.toString();
    } catch (error) {
      console.warn("⚠️ Error creating data hash:", error);
      return Math.random().toString();
    }
  }

  async fetchBudgetFromServer(notifyCallback = true) {
    try {
      const endpoints = [`${FLASK_API}/chatbot/current_budget`];

      let response = null;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying to fetch budget from: ${endpoint}`);
          response = await fetch(endpoint, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-cache",
            signal: AbortSignal.timeout(5000),
          });

          if (response.ok) {
            console.log(`✅ Successfully connected to: ${endpoint}`);
            break;
          } else {
            throw new Error(
              `Server responded with ${response.status}: ${response.statusText}`
            );
          }
        } catch (error) {
          console.warn(`⚠️ Failed to connect to ${endpoint}:`, error.message);
          lastError = error;
          response = null;
        }
      }

      if (!response || !response.ok) {
        throw lastError || new Error("All server endpoints failed");
      }

      const serverData = await response.json();

      const serverDataHash = this.createDataHash(serverData);

      const dataChanged = this.lastServerDataHash !== serverDataHash;

      if (!dataChanged) {
        return this.cache || this.getEmptyBudget();
      }

      console.log("🔄 Budget data changed on server, processing...");
      this.lastServerDataHash = serverDataHash;

      let budgetPlan = {};
      let questionnaireAnswers = {};

      if (serverData.budget_plan) {
        budgetPlan = this.normalizeBudgetPlan(serverData.budget_plan);
        questionnaireAnswers = serverData.questionnaire_answers || {};
      } else if (
        serverData["Books & Media"] ||
        serverData["Electronics & Accessories"] ||
        Object.keys(serverData).some((key) => key.includes("&"))
      ) {
        budgetPlan = this.normalizeBudgetPlan(serverData);
        questionnaireAnswers = {};
      } else {
        console.warn(
          "⚠️ Unexpected server response format, using local fallback"
        );
        return this.getLocalBudgetFallback();
      }

      if (Object.keys(budgetPlan).length > 0) {
        const budgetData = {
          total: budgetPlan.total_budget || 0,
          categories: budgetPlan,
          recommendations: budgetPlan.recommendations || [],
          questionnaire_answers: questionnaireAnswers,
        };

        const localStorageData = {
          budget_plan: budgetPlan,
          questionnaire_answers: questionnaireAnswers,
          total: budgetData.total,
          categories: budgetData.categories,
        };

        AsyncStorage.setItem("budget_plan", JSON.stringify(localStorageData));
        console.log("✅ Updated AsyncStorage with fresh server data");

        this.cache = budgetData;
        this.lastFetch = Date.now();

        if (notifyCallback && this.currentCallback && dataChanged) {
          console.log("📢 Notifying UI of budget changes");
          this.currentCallback(budgetData);
        }

        return budgetData;
      } else {
        console.warn("⚠️ No budget data found in server response");
        return this.getLocalBudgetFallback();
      }
    } catch (error) {
      console.error("❌ Error fetching budget from server:", error);
      return this.getLocalBudgetFallback();
    }
  }

  normalizeBudgetPlan(budgetPlan) {
    const normalized = {};

    for (const [key, value] of Object.entries(budgetPlan)) {
      if (key === "recommendations") {
        normalized[key] = Array.isArray(value) ? value : [];
      } else if (
        key === "total_budget" ||
        key.includes("&") ||
        key.includes("Budget") ||
        key.includes("Media") ||
        key.includes("Kitchen")
      ) {
        normalized[key] = Number(value) || 0;
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  async getBudget(forceRefresh = false) {
    const now = Date.now();

    if (
      forceRefresh ||
      !this.cache ||
      !this.lastFetch ||
      now - this.lastFetch > this.CACHE_DURATION
    ) {
      console.log("🔄 Cache miss or force refresh, fetching from server...");
      return await this.fetchBudgetFromServer(false);
    }

    console.log("📋 Using cached budget data");
    return this.cache;
  }

  clearCache() {
    this.cache = null;
    this.lastFetch = null;
    this.lastServerDataHash = null;
    console.log("🗑️ Budget cache cleared");
  }

  async startFileWatcher(callback, checkInterval = 30000) {
    return this.startChangeDetection(callback, checkInterval);
  }

  async startChangeDetection(callback, checkInterval = 30000) {
    if (this.isPolling) {
      this.stopChangeDetection();
    }

    this.isPolling = true;
    this.currentCallback = callback;
    console.log(
      `🔄 Starting budget change detection (every ${checkInterval / 1000}s)...`
    );

    const initialBudget = await this.fetchBudgetFromServer(false);
    if (initialBudget) {
      callback(initialBudget);
    }

    this.pollInterval = setInterval(async () => {
      if (!this.isPolling) return;

      try {
        await this.fetchBudgetFromServer(true);
      } catch (error) {
        console.warn("⚠️ Change detection error:", error.message);
      }
    }, checkInterval);

    return () => {
      this.stopChangeDetection();
    };
  }

  stopChangeDetection() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
    this.currentCallback = null;
    console.log("⏹️ Stopped budget change detection");
  }

  async forceFreshFetch() {
    console.log("🔄 Force fetching fresh budget data...");
    this.clearCache();
    return await this.fetchBudgetFromServer(true);
  }

  async resetBudget() {
    try {
      console.log("🔄 Resetting budget on server...");

      const endpoints = [`${FLASK_API}/budget/reset`];

      let resetSuccess = false;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(5000),
          });

          if (response.ok) {
            console.log("✅ Budget reset on server");
            resetSuccess = true;
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Reset failed for ${endpoint}:`, error.message);
        }
      }

      if (!resetSuccess) {
        console.warn(
          "⚠️ Server reset failed for all endpoints, continuing with local reset"
        );
      }

      AsyncStorage.removeItem("budget_plan");
      this.cache = null;
      this.lastFetch = null;
      this.lastServerDataHash = null;

      return this.getEmptyBudget();
    } catch (error) {
      console.error("❌ Error resetting budget:", error);

      AsyncStorage.removeItem("budget_plan");
      this.cache = null;
      this.lastFetch = null;
      this.lastServerDataHash = null;

      return this.getEmptyBudget();
    }
  }

  setNavigationCallback(callback) {
    this.navigationCallback = callback;
    console.log("📱 Navigation callback set for budget updates");
  }

  clearNavigationCallback() {
    this.navigationCallback = null;
    console.log("📱 Navigation callback cleared");
  }

  triggerBudgetUpdate(source = "unknown") {
    console.log(`🔄 Budget update triggered from: ${source}`);

    this.clearCache();

    if (this.navigationCallback) {
      console.log("📱 Calling navigation callback for budget update");
      this.navigationCallback({
        fromBudgetUpdate: true,
        source: source,
        timestamp: Date.now(),
      });
    }
  }

  async updateBudget(budgetData) {
    try {
      console.log("🔄 Updating budget on server...");

      const serverPayload = {
        budget_plan: {
          ...budgetData.categories,
          total_budget: budgetData.total,
        },
        questionnaire_answers: budgetData.questionnaire_answers || {},
      };

      const endpoints = [`${FLASK_API}/budget/update-file`];

      let updateSuccess = false;
      let result = null;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(serverPayload),
            signal: AbortSignal.timeout(10000),
          });

          if (response.ok) {
            result = await response.json();
            console.log("✅ Budget updated on server:", result);
            updateSuccess = true;
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Update failed for ${endpoint}:`, error.message);
        }
      }

      if (!updateSuccess) {
        throw new Error("Failed to update budget on all server endpoints");
      }

      this.cache = null;
      this.lastFetch = null;
      this.lastServerDataHash = null;

      this.triggerBudgetUpdate("manual_update");

      return await this.fetchBudgetFromServer(false);
    } catch (error) {
      console.error("❌ Error updating budget on server:", error);
      throw error;
    }
  }

  async updateBudgetFromChatbot(updateRequest) {
    try {
      console.log(
        "🤖 Processing chatbot budget update request:",
        updateRequest
      );

      const response = await fetch(`${FLASK_API}/api/chatbot/update-budget`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: updateRequest,
          current_budget: await this.getBudget(),
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Server responded with ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("✅ Chatbot budget update result:", result);

      if (result.updated_budget) {
        await this.updateBudgetFile(result.updated_budget);

        this.triggerBudgetUpdate("chatbot_complex_update");

        return {
          success: true,
          message: result.message || "Budget updated successfully",
          updatedBudget: result.updated_budget,
        };
      } else {
        throw new Error(
          result.error || "Failed to parse budget update request"
        );
      }
    } catch (error) {
      console.error("❌ Error updating budget from chatbot:", error);

      return await this.parseAndUpdateBudgetManually(updateRequest);
    }
  }

  async processChatbotBudgetUpdate(message) {
    try {
      console.log("🤖 Processing chatbot message for budget update:", message);

      const updateKeywords = [
        "update",
        "change",
        "increase",
        "decrease",
        "set",
        "allocate",
        "budget",
        "modify",
      ];
      const isUpdateRequest = updateKeywords.some((keyword) =>
        message.toLowerCase().includes(keyword)
      );

      if (!isUpdateRequest) {
        return {
          success: false,
          message: "This doesn't appear to be a budget update request.",
        };
      }

      const result = await this.updateBudgetFromChatbot(message);

      if (result.success) {
        await this.fetchBudgetFromServer(true);
      }

      return result;
    } catch (error) {
      console.error("❌ Error processing chatbot budget update:", error);
      return {
        success: false,
        message: "Failed to process budget update request.",
        error: error.message,
      };
    }
  }

  async parseAndUpdateBudgetManually(updateRequest) {
    try {
      console.log("🔄 Attempting manual parsing of budget update...");

      const currentBudget = await this.getBudget();
      const updatedCategories = { ...currentBudget.categories };
      let totalBudget = currentBudget.total;
      let updatesMade = false;
      const updateLog = [];

      const patterns = {
        increase:
          /(?:increase|add|boost|raise)\s+(?:the\s+)?([a-zA-Z\s&]+?)(?:\s+(?:by|with))?\s+(?:by\s+)?(?:rupees?\s+|₹\s*)?(\d+)/gi,

        decrease:
          /(?:decrease|reduce|cut|lower)\s+(?:the\s+)?([a-zA-Z\s&]+?)(?:\s+budget)?\s+(?:by\s+)?(?:rupees?\s+|₹\s*)?(\d+)/gi,

        set: /(?:set|make|change)\s+(?:the\s+)?([a-zA-Z\s&]+?)(?:\s+(?:to|budget\s+to))\s+(?:rupees?\s+|₹\s*)?(\d+)/gi,

        allocate:
          /(?:allocate|assign|give)\s+(?:rupees?\s+|₹\s*)?(\d+)\s+(?:for|to)\s+([a-zA-Z\s&]+)/gi,

        totalBudget:
          /(?:total|overall)\s+budget\s+(?:should\s+be|to|is)\s+(?:rupees?\s+|₹\s*)?(\d+)/gi,
      };

      let match;
      while ((match = patterns.totalBudget.exec(updateRequest)) !== null) {
        const newTotal = parseInt(match[1]);
        if (newTotal > 0) {
          totalBudget = newTotal;
          updatesMade = true;
          updateLog.push(`Total budget set to ₹${newTotal.toLocaleString()}`);
        }
      }

      const findCategory = (categoryName) => {
        const cleanName = categoryName.trim().toLowerCase();
        const categoryKeys = Object.keys(updatedCategories).filter(
          (key) => key !== "total_budget" && key !== "recommendations"
        );

        return categoryKeys.find((key) => {
          const keyLower = key.toLowerCase();
          return (
            keyLower.includes(cleanName) ||
            cleanName.includes(keyLower.split(/[&\s]+/)[0]) ||
            keyLower.split(/[&\s]+/).some((part) => cleanName.includes(part))
          );
        });
      };

      while ((match = patterns.increase.exec(updateRequest)) !== null) {
        const categoryName = match[1].trim();
        const amount = parseInt(match[2]);
        const foundCategory = findCategory(categoryName);

        if (foundCategory && amount > 0) {
          updatedCategories[foundCategory] =
            (updatedCategories[foundCategory] || 0) + amount;
          updatesMade = true;
          updateLog.push(
            `Increased ${foundCategory} by ₹${amount.toLocaleString()}`
          );
        }
      }

      while ((match = patterns.decrease.exec(updateRequest)) !== null) {
        const categoryName = match[1].trim();
        const amount = parseInt(match[2]);
        const foundCategory = findCategory(categoryName);

        if (foundCategory && amount > 0) {
          updatedCategories[foundCategory] = Math.max(
            0,
            (updatedCategories[foundCategory] || 0) - amount
          );
          updatesMade = true;
          updateLog.push(
            `Decreased ${foundCategory} by ₹${amount.toLocaleString()}`
          );
        }
      }

      while ((match = patterns.set.exec(updateRequest)) !== null) {
        const categoryName = match[1].trim();
        const amount = parseInt(match[2]);
        const foundCategory = findCategory(categoryName);

        if (foundCategory && amount >= 0) {
          updatedCategories[foundCategory] = amount;
          updatesMade = true;
          updateLog.push(`Set ${foundCategory} to ₹${amount.toLocaleString()}`);
        }
      }

      while ((match = patterns.allocate.exec(updateRequest)) !== null) {
        const amount = parseInt(match[1]);
        const categoryName = match[2].trim();
        const foundCategory = findCategory(categoryName);

        if (foundCategory && amount > 0) {
          updatedCategories[foundCategory] = amount;
          updatesMade = true;
          updateLog.push(
            `Allocated ₹${amount.toLocaleString()} to ${foundCategory}`
          );
        }
      }

      if (updatesMade) {
        const categoryTotal = Object.entries(updatedCategories)
          .filter(
            ([key]) => key !== "total_budget" && key !== "recommendations"
          )
          .reduce((sum, [, value]) => sum + (Number(value) || 0), 0);

        if (totalBudget === currentBudget.total) {
          totalBudget = categoryTotal;
        }

        const updatedBudgetData = {
          total: totalBudget,
          categories: {
            ...updatedCategories,
            total_budget: totalBudget,
          },
          questionnaire_answers: currentBudget.questionnaire_answers || {},
        };

        await this.updateBudget(updatedBudgetData);

        return {
          success: true,
          message: `Budget updated successfully:\n${updateLog.join("\n")}`,
          updatedBudget: updatedBudgetData,
        };
      } else {
        return {
          success: false,
          message:
            "Could not understand the budget update request. Please be more specific about categories and amounts.",
          suggestions: [
            'Try: "Increase Electronics by 5000"',
            'Try: "Set Food budget to 8000"',
            'Try: "Allocate 3000 for Books"',
            'Try: "Reduce Travel by 2000"',
          ],
        };
      }
    } catch (error) {
      console.error("❌ Error in manual budget parsing:", error);
      return {
        success: false,
        message: "Failed to parse budget update request.",
        error: error.message,
      };
    }
  }

  async updateBudgetFile(budgetData) {
    try {
      console.log("🔄 Updating budget file directly:", budgetData);

      const serverPayload = {
        budget_plan: budgetData.categories || budgetData,
        questionnaire_answers: budgetData.questionnaire_answers || {},
      };

      const response = await fetch(`${FLASK_API}/api/budget/update-file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serverPayload),
      });

      if (!response.ok) {
        throw new Error(`Failed to update budget file: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Budget file updated:", result);

      this.clearCache();

      return result;
    } catch (error) {
      console.error("❌ Error updating budget file:", error);
      throw error;
    }
  }

  async getLocalBudgetFallback() {
    try {
      const storedBudget = await AsyncStorage.getItem("budget_plan");
      if (storedBudget) {
        const budgetData = JSON.parse(storedBudget);

        let budgetCategories = {};
        let budgetTotal = 0;

        if (budgetData.budget_plan) {
          budgetCategories = budgetData.budget_plan;
          budgetTotal = budgetCategories.total_budget || 0;
        } else if (budgetData.total) {
          budgetTotal = budgetData.total;
          budgetCategories = budgetData.categories || {};
        }

        return {
          total: budgetTotal,
          categories: budgetCategories,
          recommendations: budgetCategories.recommendations || [],
          questionnaire_answers: budgetData.questionnaire_answers || {},
        };
      }
    } catch (error) {
      console.error("❌ Error reading AsyncStorage fallback:", error);
    }

    return this.getEmptyBudget();
  }

  getEmptyBudget() {
    return {
      total: 0,
      categories: {},
      recommendations: [],
      questionnaire_answers: {},
    };
  }

  hasDataChanged(oldData, newData) {
    if (!oldData || !newData) return true;

    try {
      if (oldData.total !== newData.total) {
        console.log(
          "💰 Budget total changed:",
          oldData.total,
          "->",
          newData.total
        );
        return true;
      }

      const oldCategories = this.getComparableCategories(oldData.categories);
      const newCategories = this.getComparableCategories(newData.categories);

      const oldCategoriesStr = JSON.stringify(
        oldCategories,
        Object.keys(oldCategories).sort()
      );
      const newCategoriesStr = JSON.stringify(
        newCategories,
        Object.keys(newCategories).sort()
      );

      if (oldCategoriesStr !== newCategoriesStr) {
        console.log("📊 Budget categories changed");
        console.log("Old:", oldCategories);
        console.log("New:", newCategories);
        return true;
      }

      const oldRecs = JSON.stringify(oldData.recommendations || []);
      const newRecs = JSON.stringify(newData.recommendations || []);

      if (oldRecs !== newRecs) {
        console.log("💡 Recommendations changed");
        return true;
      }

      return false;
    } catch (error) {
      console.warn("⚠️ Error comparing data changes:", error);
      return true;
    }
  }

  getComparableCategories(categories) {
    if (!categories) return {};

    const comparable = {};
    Object.entries(categories).forEach(([key, value]) => {
      if (
        key !== "recommendations" &&
        key !== "total_budget" &&
        !Array.isArray(value)
      ) {
        comparable[key] = value;
      }
    });

    return comparable;
  }
}

export default new BudgetService();
