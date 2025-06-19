const BUDGET_API_BASE = 'http://localhost:5000/api'; // Changed from 192.168.29.40 to localhost

class BudgetService {
  constructor() {
    this.cache = null;
    this.lastFetch = null;
    this.CACHE_DURATION = 60000; // Increased to 60 seconds
    this.lastServerDataHash = null;
    this.isPolling = false;
    this.pollInterval = null;
    this.currentCallback = null;
    this.navigationCallback = null;
    this.lastFileCheck = null;
    
    // Make service globally accessible for debugging
    if (typeof window !== 'undefined') {
      window.budgetService = this;
    }
  }

  // Create a consistent hash for data comparison
  createDataHash(data) {
    try {
      const normalizedData = {
        budget_plan: data.budget_plan || data,
        questionnaire_answers: data.questionnaire_answers || {}
      };
      
      const sortedData = JSON.stringify(normalizedData, Object.keys(normalizedData).sort());
      
      let hash = 0;
      for (let i = 0; i < sortedData.length; i++) {
        const char = sortedData.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      return hash.toString();
    } catch (error) {
      console.warn('⚠️ Error creating data hash:', error);
      return Math.random().toString();
    }
  }

  // Always fetch fresh data from server budget_plan.json
  async fetchBudgetFromServer(notifyCallback = true) {
    try {
      // Try localhost first, then fallback to IP if needed
      const endpoints = [
        `${BUDGET_API_BASE}/chatbot/current_budget`,
        'http://192.168.29.40:5000/api/chatbot/current_budget'
      ];
      
      let response = null;
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying to fetch budget from: ${endpoint}`);
          response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'no-cache',
            signal: AbortSignal.timeout(5000) // 5 second timeout
          });
          
          if (response.ok) {
            console.log(`✅ Successfully connected to: ${endpoint}`);
            break;
          } else {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to connect to ${endpoint}:`, error.message);
          lastError = error;
          response = null;
        }
      }

      if (!response || !response.ok) {
        throw lastError || new Error('All server endpoints failed');
      }

      const serverData = await response.json();
      
      // Create a consistent hash of the server data for change detection
      const serverDataHash = this.createDataHash(serverData);
      
      // Check if data actually changed
      const dataChanged = this.lastServerDataHash !== serverDataHash;
      
      if (!dataChanged) {
        // Data hasn't changed, return cached data without notification
        return this.cache || this.getEmptyBudget();
      }
      
      // Data has changed, process and notify
      console.log('🔄 Budget data changed on server, processing...');
      this.lastServerDataHash = serverDataHash;

      // Handle the actual server response format
      let budgetPlan = {};
      let questionnaireAnswers = {};
      
      if (serverData.budget_plan) {
        budgetPlan = this.normalizeBudgetPlan(serverData.budget_plan);
        questionnaireAnswers = serverData.questionnaire_answers || {};
      } else if (serverData['Books & Media'] || serverData['Electronics & Accessories'] || Object.keys(serverData).some(key => key.includes('&'))) {
        budgetPlan = this.normalizeBudgetPlan(serverData);
        questionnaireAnswers = {};
      } else {
        console.warn('⚠️ Unexpected server response format, using local fallback');
        return this.getLocalBudgetFallback();
      }

      if (Object.keys(budgetPlan).length > 0) {
        const budgetData = {
          total: budgetPlan.total_budget || 0,
          categories: budgetPlan,
          recommendations: budgetPlan.recommendations || [],
          questionnaire_answers: questionnaireAnswers
        };

        // Update local storage with fresh data
        const localStorageData = {
          budget_plan: budgetPlan,
          questionnaire_answers: questionnaireAnswers,
          total: budgetData.total,
          categories: budgetData.categories
        };
        
        localStorage.setItem('budget_plan', JSON.stringify(localStorageData));
        console.log('✅ Updated localStorage with fresh server data');

        this.cache = budgetData;
        this.lastFetch = Date.now();
        
        // Notify callback if there's an active listener and data changed
        if (notifyCallback && this.currentCallback && dataChanged) {
          console.log('📢 Notifying UI of budget changes');
          this.currentCallback(budgetData);
        }
        
        return budgetData;
      } else {
        console.warn('⚠️ No budget data found in server response');
        return this.getLocalBudgetFallback();
      }
    } catch (error) {
      console.error('❌ Error fetching budget from server:', error);
      return this.getLocalBudgetFallback();
    }
  }

  // Normalize budget plan to ensure consistent data types
  normalizeBudgetPlan(budgetPlan) {
    const normalized = {};
    
    for (const [key, value] of Object.entries(budgetPlan)) {
      if (key === 'recommendations') {
        normalized[key] = Array.isArray(value) ? value : [];
      } else if (key === 'total_budget' || (key.includes('&') || key.includes('Budget') || key.includes('Media') || key.includes('Kitchen'))) {
        // Convert string numbers to actual numbers
        normalized[key] = Number(value) || 0;
      } else {
        normalized[key] = value;
      }
    }
    
    return normalized;
  }

  // Get budget with server-first approach
  async getBudget(forceRefresh = false) {
    const now = Date.now();
    
    // Always force refresh if explicitly requested or cache is stale
    if (forceRefresh || !this.cache || !this.lastFetch || (now - this.lastFetch > this.CACHE_DURATION)) {
      console.log('🔄 Cache miss or force refresh, fetching from server...');
      return await this.fetchBudgetFromServer(false);
    }

    console.log('📋 Using cached budget data');
    return this.cache;
  }

  // Add clearCache method for forced refreshes
  clearCache() {
    this.cache = null;
    this.lastFetch = null;
    this.lastServerDataHash = null;
    console.log('🗑️ Budget cache cleared');
  }

  // File watcher method with longer intervals
  async startFileWatcher(callback, checkInterval = 30000) { // Increased to 30 seconds
    return this.startChangeDetection(callback, checkInterval);
  }

  // Efficient change detection with longer intervals
  async startChangeDetection(callback, checkInterval = 30000) { // Increased to 30 seconds
    if (this.isPolling) {
      this.stopChangeDetection();
    }
    
    this.isPolling = true;
    this.currentCallback = callback;
    console.log(`🔄 Starting budget change detection (every ${checkInterval/1000}s)...`);
    
    // Initial load
    const initialBudget = await this.fetchBudgetFromServer(false);
    if (initialBudget) {
      callback(initialBudget);
    }
    
    // Set up less frequent polling
    this.pollInterval = setInterval(async () => {
      if (!this.isPolling) return;
      
      try {
        await this.fetchBudgetFromServer(true);
      } catch (error) {
        console.warn('⚠️ Change detection error:', error.message);
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
    console.log('⏹️ Stopped budget change detection');
  }

  // Force a fresh fetch bypassing all caches
  async forceFreshFetch() {
    console.log('🔄 Force fetching fresh budget data...');
    this.clearCache();
    return await this.fetchBudgetFromServer(true);
  }

  // Reset budget on server
  async resetBudget() {
    try {
      console.log('🔄 Resetting budget on server...');
      
      // Try both endpoints for reset
      const endpoints = [
        `${BUDGET_API_BASE}/budget/reset`,
        'http://192.168.29.40:5000/api/budget/reset'
      ];
      
      let resetSuccess = false;
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000)
          });

          if (response.ok) {
            console.log('✅ Budget reset on server');
            resetSuccess = true;
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Reset failed for ${endpoint}:`, error.message);
        }
      }
      
      if (!resetSuccess) {
        console.warn('⚠️ Server reset failed for all endpoints, continuing with local reset');
      }

      // Clear local data and hash
      localStorage.removeItem('budget_plan');
      this.cache = null;
      this.lastFetch = null;
      this.lastServerDataHash = null;

      return this.getEmptyBudget();
    } catch (error) {
      console.error('❌ Error resetting budget:', error);
      
      // Clear local data even if server fails
      localStorage.removeItem('budget_plan');
      this.cache = null;
      this.lastFetch = null;
      this.lastServerDataHash = null;
      
      return this.getEmptyBudget();
    }
  }

  // Add method to set navigation callback
  setNavigationCallback(callback) {
    this.navigationCallback = callback;
    console.log('📱 Navigation callback set for budget updates');
  }

  // Clear navigation callback
  clearNavigationCallback() {
    this.navigationCallback = null;
    console.log('📱 Navigation callback cleared');
  }

  // Method to trigger navigation after budget creation/update
  triggerBudgetUpdate(source = 'unknown') {
    console.log(`🔄 Budget update triggered from: ${source}`);
    
    // Clear cache to force fresh data
    this.clearCache();
    
    // Trigger navigation callback if available
    if (this.navigationCallback) {
      console.log('📱 Calling navigation callback for budget update');
      this.navigationCallback({
        fromBudgetUpdate: true,
        source: source,
        timestamp: Date.now()
      });
    }
  }

  // Update budget on server and sync locally
  async updateBudget(budgetData) {
    try {
      console.log('🔄 Updating budget on server...');
      
      const serverPayload = {
        budget_plan: {
          ...budgetData.categories,
          total_budget: budgetData.total
        },
        questionnaire_answers: budgetData.questionnaire_answers || {}
      };

      // Try both endpoints for update
      const endpoints = [
        `${BUDGET_API_BASE}/budget/update-file`,
        'http://192.168.29.40:5000/api/budget/update-file'
      ];
      
      let updateSuccess = false;
      let result = null;
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(serverPayload),
            signal: AbortSignal.timeout(10000) // 10 second timeout for updates
          });

          if (response.ok) {
            result = await response.json();
            console.log('✅ Budget updated on server:', result);
            updateSuccess = true;
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Update failed for ${endpoint}:`, error.message);
        }
      }

      if (!updateSuccess) {
        throw new Error('Failed to update budget on all server endpoints');
      }

      // Clear cache and hash to force fresh fetch
      this.cache = null;
      this.lastFetch = null;
      this.lastServerDataHash = null;

      // Trigger navigation update
      this.triggerBudgetUpdate('manual_update');

      // Return fresh data from server
      return await this.fetchBudgetFromServer(false);
    } catch (error) {
      console.error('❌ Error updating budget on server:', error);
      throw error;
    }
  }

  // Enhanced budget update method that can handle complex language
  async updateBudgetFromChatbot(updateRequest) {
    try {
      console.log('🤖 Processing chatbot budget update request:', updateRequest);
      
      // Send the complex request to a new backend endpoint that can parse natural language
      const response = await fetch(`${BUDGET_API_BASE}/api/chatbot/update-budget`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: updateRequest,
          current_budget: await this.getBudget()
        })
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Chatbot budget update result:', result);

      if (result.updated_budget) {
        // Update the budget file directly
        await this.updateBudgetFile(result.updated_budget);
        
        // Trigger UI refresh
        this.triggerBudgetUpdate('chatbot_complex_update');
        
        return {
          success: true,
          message: result.message || 'Budget updated successfully',
          updatedBudget: result.updated_budget
        };
      } else {
        throw new Error(result.error || 'Failed to parse budget update request');
      }
    } catch (error) {
      console.error('❌ Error updating budget from chatbot:', error);
      
      // Fallback to manual parsing if server fails
      return await this.parseAndUpdateBudgetManually(updateRequest);
    }
  }

  // Method that can be called from ChatbotScreen
  async processChatbotBudgetUpdate(message) {
    try {
      console.log('🤖 Processing chatbot message for budget update:', message);
      
      // Check if the message is requesting a budget update
      const updateKeywords = ['update', 'change', 'increase', 'decrease', 'set', 'allocate', 'budget', 'modify'];
      const isUpdateRequest = updateKeywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      );

      if (!isUpdateRequest) {
        return {
          success: false,
          message: 'This doesn\'t appear to be a budget update request.'
        };
      }

      // Process the update
      const result = await this.updateBudgetFromChatbot(message);
      
      if (result.success) {
        // Force refresh the budget data
        await this.fetchBudgetFromServer(true);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error processing chatbot budget update:', error);
      return {
        success: false,
        message: 'Failed to process budget update request.',
        error: error.message
      };
    }
  }

  // Fallback manual parsing for complex budget updates
  async parseAndUpdateBudgetManually(updateRequest) {
    try {
      console.log('🔄 Attempting manual parsing of budget update...');
      
      const currentBudget = await this.getBudget();
      const updatedCategories = { ...currentBudget.categories };
      let totalBudget = currentBudget.total;
      let updatesMade = false;
      const updateLog = [];

      // Enhanced regex patterns for different update types
      const patterns = {
        // "increase electronics by 5000" or "add 5000 to electronics"
        increase: /(?:increase|add|boost|raise)\s+(?:the\s+)?([a-zA-Z\s&]+?)(?:\s+(?:by|with))?\s+(?:by\s+)?(?:rupees?\s+|₹\s*)?(\d+)/gi,
        
        // "decrease food by 2000" or "reduce food budget by 2000"
        decrease: /(?:decrease|reduce|cut|lower)\s+(?:the\s+)?([a-zA-Z\s&]+?)(?:\s+budget)?\s+(?:by\s+)?(?:rupees?\s+|₹\s*)?(\d+)/gi,
        
        // "set electronics to 8000" or "make electronics 8000"
        set: /(?:set|make|change)\s+(?:the\s+)?([a-zA-Z\s&]+?)(?:\s+(?:to|budget\s+to))\s+(?:rupees?\s+|₹\s*)?(\d+)/gi,
        
        // "allocate 10000 for travel" or "assign 5000 to books"
        allocate: /(?:allocate|assign|give)\s+(?:rupees?\s+|₹\s*)?(\d+)\s+(?:for|to)\s+([a-zA-Z\s&]+)/gi,
        
        // "total budget should be 50000"
        totalBudget: /(?:total|overall)\s+budget\s+(?:should\s+be|to|is)\s+(?:rupees?\s+|₹\s*)?(\d+)/gi
      };

      // Process total budget changes first
      let match;
      while ((match = patterns.totalBudget.exec(updateRequest)) !== null) {
        const newTotal = parseInt(match[1]);
        if (newTotal > 0) {
          totalBudget = newTotal;
          updatesMade = true;
          updateLog.push(`Total budget set to ₹${newTotal.toLocaleString()}`);
        }
      }

      // Helper function to find matching category
      const findCategory = (categoryName) => {
        const cleanName = categoryName.trim().toLowerCase();
        const categoryKeys = Object.keys(updatedCategories).filter(key => 
          key !== 'total_budget' && key !== 'recommendations'
        );
        
        return categoryKeys.find(key => {
          const keyLower = key.toLowerCase();
          return keyLower.includes(cleanName) || 
                 cleanName.includes(keyLower.split(/[&\s]+/)[0]) ||
                 keyLower.split(/[&\s]+/).some(part => cleanName.includes(part));
        });
      };

      // Process increase operations
      while ((match = patterns.increase.exec(updateRequest)) !== null) {
        const categoryName = match[1].trim();
        const amount = parseInt(match[2]);
        const foundCategory = findCategory(categoryName);
        
        if (foundCategory && amount > 0) {
          updatedCategories[foundCategory] = (updatedCategories[foundCategory] || 0) + amount;
          updatesMade = true;
          updateLog.push(`Increased ${foundCategory} by ₹${amount.toLocaleString()}`);
        }
      }

      // Process decrease operations
      while ((match = patterns.decrease.exec(updateRequest)) !== null) {
        const categoryName = match[1].trim();
        const amount = parseInt(match[2]);
        const foundCategory = findCategory(categoryName);
        
        if (foundCategory && amount > 0) {
          updatedCategories[foundCategory] = Math.max(0, (updatedCategories[foundCategory] || 0) - amount);
          updatesMade = true;
          updateLog.push(`Decreased ${foundCategory} by ₹${amount.toLocaleString()}`);
        }
      }

      // Process set operations
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

      // Process allocate operations
      while ((match = patterns.allocate.exec(updateRequest)) !== null) {
        const amount = parseInt(match[1]);
        const categoryName = match[2].trim();
        const foundCategory = findCategory(categoryName);
        
        if (foundCategory && amount > 0) {
          updatedCategories[foundCategory] = amount;
          updatesMade = true;
          updateLog.push(`Allocated ₹${amount.toLocaleString()} to ${foundCategory}`);
        }
      }

      if (updatesMade) {
        // Recalculate total if category changes were made
        const categoryTotal = Object.entries(updatedCategories)
          .filter(([key]) => key !== 'total_budget' && key !== 'recommendations')
          .reduce((sum, [, value]) => sum + (Number(value) || 0), 0);
        
        if (totalBudget === currentBudget.total) {
          totalBudget = categoryTotal;
        }

        const updatedBudgetData = {
          total: totalBudget,
          categories: {
            ...updatedCategories,
            total_budget: totalBudget
          },
          questionnaire_answers: currentBudget.questionnaire_answers || {}
        };

        await this.updateBudget(updatedBudgetData);
        
        return {
          success: true,
          message: `Budget updated successfully:\n${updateLog.join('\n')}`,
          updatedBudget: updatedBudgetData
        };
      } else {
        return {
          success: false,
          message: 'Could not understand the budget update request. Please be more specific about categories and amounts.',
          suggestions: [
            'Try: "Increase Electronics by 5000"',
            'Try: "Set Food budget to 8000"', 
            'Try: "Allocate 3000 for Books"',
            'Try: "Reduce Travel by 2000"'
          ]
        };
      }
    } catch (error) {
      console.error('❌ Error in manual budget parsing:', error);
      return {
        success: false,
        message: 'Failed to parse budget update request.',
        error: error.message
      };
    }
  }

  // Direct budget file update method
  async updateBudgetFile(budgetData) {
    try {
      console.log('🔄 Updating budget file directly:', budgetData);
      
      const serverPayload = {
        budget_plan: budgetData.categories || budgetData,
        questionnaire_answers: budgetData.questionnaire_answers || {}
      };

      const response = await fetch(`${BUDGET_API_BASE}/api/budget/update-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverPayload)
      });

      if (!response.ok) {
        throw new Error(`Failed to update budget file: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Budget file updated:', result);

      // Clear cache to force refresh
      this.clearCache();
      
      return result;
    } catch (error) {
      console.error('❌ Error updating budget file:', error);
      throw error;
    }
  }

  // Fallback to localStorage when server is unavailable
  getLocalBudgetFallback() {
    try {
      const storedBudget = localStorage.getItem('budget_plan');
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
          questionnaire_answers: budgetData.questionnaire_answers || {}
        };
      }
    } catch (error) {
      console.error('❌ Error reading localStorage fallback:', error);
    }
    
    return this.getEmptyBudget();
  }

// Get empty budget structure
getEmptyBudget() {
  return {
    total: 0,
    categories: {},
    recommendations: [],
    questionnaire_answers: {}
  };
}

// Helper method to detect actual data changes
  hasDataChanged(oldData, newData) {
    if (!oldData || !newData) return true;
    
    try {
      // Compare totals
      if (oldData.total !== newData.total) {
        console.log('💰 Budget total changed:', oldData.total, '->', newData.total);
        return true;
      }
      
      // Compare categories (excluding recommendations and metadata)
      const oldCategories = this.getComparableCategories(oldData.categories);
      const newCategories = this.getComparableCategories(newData.categories);
      
      const oldCategoriesStr = JSON.stringify(oldCategories, Object.keys(oldCategories).sort());
      const newCategoriesStr = JSON.stringify(newCategories, Object.keys(newCategories).sort());
      
      if (oldCategoriesStr !== newCategoriesStr) {
        console.log('📊 Budget categories changed');
        console.log('Old:', oldCategories);
        console.log('New:', newCategories);
        return true;
      }
      
      // Compare recommendations
      const oldRecs = JSON.stringify(oldData.recommendations || []);
      const newRecs = JSON.stringify(newData.recommendations || []);
      
      if (oldRecs !== newRecs) {
        console.log('💡 Recommendations changed');
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('⚠️ Error comparing data changes:', error);
      return true; // Assume changed if comparison fails
    }
  }

  // Get comparable categories (exclude metadata)
  getComparableCategories(categories) {
    if (!categories) return {};
    
    const comparable = {};
    Object.entries(categories).forEach(([key, value]) => {
      if (key !== 'recommendations' && key !== 'total_budget' && !Array.isArray(value)) {
        comparable[key] = value;
      }
    });
    
    return comparable;
  }
}

// Export singleton instance
export default new BudgetService();