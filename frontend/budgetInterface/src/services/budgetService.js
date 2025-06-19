const BUDGET_API_BASE = 'http://192.168.29.40:5000/api';

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
      const response = await fetch(`${BUDGET_API_BASE}/chatbot/current_budget`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache'
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
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
        console.warn('⚠️ Unexpected server response format:', serverData);
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
      
      const response = await fetch(`${BUDGET_API_BASE}/budget/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        console.log('✅ Budget reset on server');
      } else {
        console.warn('⚠️ Server reset failed, continuing with local reset');
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

      const response = await fetch(`${BUDGET_API_BASE}/budget/update-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serverPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server update failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Budget updated on server:', result);

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