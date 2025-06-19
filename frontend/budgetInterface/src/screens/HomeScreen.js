// src/screens/HomeScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform
} from 'react-native';
import { Button, Card, FAB } from 'react-native-paper';
import BudgetCard from '../components/BudgetCard';
import CategoryPieChart from '../components/CategoryPieChart';
import budgetService from '../services/budgetService';

// Web-compatible icons (using Unicode emojis and simple symbols)
const Icons = {
  'weather-sunny': '☀️',
  'weather-night': '🌙',
  'loading': '⟳',
  'wallet-plus': '💰',
  'plus-circle': '➕',
  'chat': '💬',
  'tag': '🏷️',
  'pencil': '✏️',
  'lightbulb': '💡',
  'chevron-right': '›',
  'bug': '🐛',
  'refresh': '🔄',
  'close': '✕',
  'plus': '+',
  'food': '🍎',
  'book': '📖',
  'star': '⭐',
  'target': '🎯',
  'chart-line': '📈'
};

const Icon = ({ name, size = 24, color = '#000', style }) => (
  <Text style={[{ fontSize: size, color }, style]}>
    {Icons[name] || '•'}
  </Text>
);

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation, route }) => { // Add route parameter
  const [budget, setBudget] = useState({
    total: 0,
    categories: {}
  });
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState({});
  const [adjustmentError, setAdjustmentError] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [pollInterval, setPollInterval] = useState(null);
  const [lastKnownBudget, setLastKnownBudget] = useState(null); // Add this to track last known state
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Default recommendations as fallback
  const defaultRecommendations = [
    {
      title: 'Create your first budget',
      description: 'Set up a budget to get personalized recommendations',
      icon: 'plus-circle',
      action: 'Go to the Create New Budget page',
      color: '#4CAF50'
    },
    {
      title: 'Start tracking expenses',
      description: 'Monitor your spending patterns',
      icon: 'chart-line',
      action: 'Keep track of your daily expenses',
      color: '#2196F3'
    },
    {
      title: 'Set financial goals',
      description: 'Define clear savings targets',
      icon: 'target',
      action: 'Decide what you want to save for',
      color: '#FF9800'
    }
  ];

  useEffect(() => {
    // Animation on component mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();

    // Load initial budget data
    loadBudget();
    
    // Set up navigation callback for budget service
    budgetService.setNavigationCallback((params) => {
      console.log('📱 Received navigation callback from budget service:', params);
      
      // Force refresh when budget is updated from anywhere
      setTimeout(() => {
        console.log('🔄 Auto-refreshing due to budget update...');
        budgetService.clearCache();
        loadBudget(true);
      }, 500);
    });
    
    // Initialize watcher with proper cleanup handling
    let cleanupFunction = null;
    let isComponentMounted = true;
    
    const initializeWatcher = async () => {
      try {
        console.log('🔧 Initializing budget watcher...');
        const stopFunction = await budgetService.startFileWatcher((freshBudget) => {
          // Only update if component is still mounted
          if (!isComponentMounted) return;
          
          console.log('📡 Received budget update from file watcher:', freshBudget);
          
          // More robust change detection - check actual values
          const hasActualChanges = 
            budget.total !== freshBudget.total ||
            Object.keys(budget.categories).length !== Object.keys(freshBudget.categories).length ||
            Object.entries(budget.categories).some(([key, value]) => 
              freshBudget.categories[key] !== value
            );
          
          if (freshBudget && hasActualChanges) {
            console.log('📁 Budget file changed, updating UI...');
            console.log('Previous total:', budget.total, 'New total:', freshBudget.total);
            
            // Force update by setting budget state
            setBudget(prevBudget => {
              console.log('🔄 Updating budget state from', prevBudget.total, 'to', freshBudget.total);
              return {
                total: freshBudget.total,
                categories: freshBudget.categories
              };
            });
            
            // Update the last known budget to prevent false positives
            setLastKnownBudget({
              total: freshBudget.total,
              categories: freshBudget.categories
            });
            
            setRecommendations(formatRecommendations(freshBudget.recommendations));
            setLastSyncTime(Date.now());
            
            console.log('✅ UI updated with fresh budget data');
          } else {
            console.log('📋 No meaningful changes detected in budget data');
          }
        }, 30000); // Increased to 30 seconds interval
        
        // Store the cleanup function
        cleanupFunction = stopFunction;
        console.log('✅ Budget watcher initialized successfully');
        
      } catch (error) {
        console.error('❌ Error initializing budget watcher:', error);
        // Set a dummy cleanup function to prevent errors
        cleanupFunction = () => {
          console.log('🔧 Dummy cleanup function called');
        };
      }
    };
    
    // Start initialization
    initializeWatcher();
    
    // Enhanced navigation focus listener
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('HomeScreen focused - checking for budget updates...');
      
      // Check various navigation parameters
      const fromChatbot = route?.params?.fromChatbot;
      const fromBudgetUpdate = route?.params?.fromBudgetUpdate;
      const fromQuestionnaire = route?.params?.fromQuestionnaire;
      const source = route?.params?.source;
      const timestamp = route?.params?.timestamp;
      
      // Handle different sources of navigation
      if (fromChatbot) {
        console.log('🤖 Coming from ChatbotScreen, forcing budget refresh...');
        navigation.setParams({ fromChatbot: false, timestamp: null });
        budgetService.clearCache();
        loadBudget(true);
      } else if (fromBudgetUpdate) {
        console.log('💰 Coming from budget update, forcing refresh...');
        navigation.setParams({ fromBudgetUpdate: false, source: null, timestamp: null });
        budgetService.clearCache();
        loadBudget(true);
      } else if (fromQuestionnaire) {
        console.log('📋 Coming from Questionnaire, budget created - forcing refresh...');
        navigation.setParams({ fromQuestionnaire: false, timestamp: null });
        budgetService.clearCache();
        loadBudget(true);
        
        // Show success message for new budget creation
        setTimeout(() => {
          if (Platform.OS === 'web') {
            window.alert('🎉 Budget created successfully!\n\nYour new budget is now available and synced across all screens.');
          }
        }, 1000);
      } else {
        // Normal focus refresh with delay
        setTimeout(() => {
          console.log('🔄 Regular focus refresh...');
          loadBudget(true);
        }, 100);
      }
    });

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up HomeScreen...');
      
      // Clear navigation callback
      budgetService.clearNavigationCallback();
      
      // Mark component as unmounted
      isComponentMounted = false;
      
      // Safe cleanup of watcher
      if (cleanupFunction && typeof cleanupFunction === 'function') {
        try {
          cleanupFunction();
          console.log('✅ Budget watcher stopped successfully');
        } catch (error) {
          console.warn('⚠️ Error stopping watcher:', error);
        }
      }
      
      // Clean up navigation listener
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [navigation, route?.params]); // Add route.params to dependency array

  const startBudgetPolling = async () => {
    console.log('👁️ Starting budget file watcher...');
    
    try {
      const stopFunction = await budgetService.startFileWatcher((freshBudget) => {
        console.log('📡 Received budget update from file watcher:', freshBudget);
        
        // More robust change detection - check actual values
        const hasActualChanges = 
          budget.total !== freshBudget.total ||
          Object.keys(budget.categories).length !== Object.keys(freshBudget.categories).length ||
          Object.entries(budget.categories).some(([key, value]) => 
            freshBudget.categories[key] !== value
          );
        
        if (freshBudget && hasActualChanges) {
          console.log('📁 Budget file changed, updating UI...');
          console.log('Previous total:', budget.total, 'New total:', freshBudget.total);
          console.log('Categories changed:', Object.keys(budget.categories).length !== Object.keys(freshBudget.categories).length);
          
          // Force update by setting budget state
          setBudget(prevBudget => {
            console.log('🔄 Updating budget state from', prevBudget.total, 'to', freshBudget.total);
            return {
              total: freshBudget.total,
              categories: freshBudget.categories
            };
          });
          
          // Update the last known budget to prevent false positives
          setLastKnownBudget({
            total: freshBudget.total,
            categories: freshBudget.categories
          });
          
          setRecommendations(formatRecommendations(freshBudget.recommendations));
          setLastSyncTime(Date.now());
          
          console.log('✅ UI updated with fresh budget data');
        } else {
          console.log('📋 No meaningful changes detected in budget data');
        }
      }, 5000); // 5 seconds interval
      
      return stopFunction;
    } catch (error) {
      console.error('❌ Error starting budget polling:', error);
      // Return a dummy function to prevent "not a function" errors
      return () => {
        console.log('🔧 Dummy cleanup function called');
      };
    }
  };

  const loadBudget = async (forceRefresh = false) => {
    setLoading(true);
    try {
      console.log(`🔄 Loading budget from server (forceRefresh: ${forceRefresh})...`);
      
      const budgetData = await budgetService.getBudget(forceRefresh);
      console.log('📊 Loaded budget data:', budgetData);
      
      setBudget({
        total: budgetData.total,
        categories: budgetData.categories
      });
      
      // Also update lastKnownBudget to prevent false changes on first load
      setLastKnownBudget({
        total: budgetData.total,
        categories: budgetData.categories
      });
      
      setRecommendations(formatRecommendations(budgetData.recommendations));
      setLastSyncTime(Date.now());
      
      console.log('✅ Budget state updated successfully');
      
    } catch (error) {
      console.error('❌ Error loading budget:', error);
      setRecommendations(defaultRecommendations);
    } finally {
      setLoading(false);
    }
  };

  const formatRecommendations = (recommendations) => {
    if (Array.isArray(recommendations) && recommendations.length > 0) {
      return recommendations.map((rec, index) => ({
        title: typeof rec === 'string' ? rec.split('.')[0] : `Tip ${index+1}`,
        description: rec,
        icon: rec.toLowerCase().includes('groceries') ? 'food' :
              rec.toLowerCase().includes('wish list') ? 'book' : 
              rec.toLowerCase().includes('prime') ? 'tag' : 'star',
        action: rec,
        color: ['#4CAF50', '#2196F3', '#FF9800'][index % 3]
      }));
    }
    return defaultRecommendations;
  };

  const handleResetBudget = async () => {
    console.log('Reset budget button clicked');
    
    const confirmReset = window.confirm('Are you sure you want to reset your budget? This cannot be undone.');
    
    if (confirmReset) {
      try {
        setLoading(true);
        console.log('🔄 Starting budget reset process...');
        
        const emptyBudget = await budgetService.resetBudget();
        
        setBudget({
          total: emptyBudget.total,
          categories: emptyBudget.categories
        });
        
        // Reset lastKnownBudget too
        setLastKnownBudget({
          total: emptyBudget.total,
          categories: emptyBudget.categories
        });
        
        setRecommendations(defaultRecommendations);
        setLastSyncTime(Date.now());
        
        window.alert('✅ Your budget has been reset successfully.');
        
      } catch (error) {
        console.error('❌ Error resetting budget:', error);
        window.alert('Failed to reset budget. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAdjustBudget = () => {
    console.log('Adjust budget button clicked');
    
    const currentCategories = { ...budget.categories };
    delete currentCategories.total_budget;
    delete currentCategories.recommendations;
    
    setEditingBudget(currentCategories);
    setShowAdjustModal(true);
    setAdjustmentError('');
  };

  const handleSaveAdjustedBudget = async () => {
    try {
      setLoading(true);
      
      const categories = Object.entries(editingBudget);
      let hasError = false;
      
      for (const [category, amount] of categories) {
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount < 0) {
          setAdjustmentError(`Invalid amount for ${category}. Please enter a positive number.`);
          hasError = true;
          break;
        }
      }
      
      if (hasError) {
        setLoading(false);
        return;
      }
      
      const newTotal = categories.reduce((sum, [_, amount]) => sum + Number(amount), 0);
      
      const updatedBudgetData = {
        total: newTotal,
        categories: {
          ...editingBudget,
          total_budget: newTotal,
          recommendations: budget.categories.recommendations || []
        },
        questionnaire_answers: budget.questionnaire_answers || {}
      };
      
      console.log('🔄 Updating budget via service...');
      
      const updatedBudget = await budgetService.updateBudget(updatedBudgetData);
      
      setBudget({
        total: updatedBudget.total,
        categories: updatedBudget.categories
      });
      
      // Update lastKnownBudget when manually updating
      setLastKnownBudget({
        total: updatedBudget.total,
        categories: updatedBudget.categories
      });
      
      setLastSyncTime(Date.now());
      setShowAdjustModal(false);
      
      window.alert('✅ Budget updated successfully!\n\n' +
                  '• Your budget overview and pie chart have been updated\n' +
                  '• The chatbot can now see your adjusted budget\n' +
                  '• Changes are synced with server');
      
    } catch (error) {
      console.error('❌ Error updating budget:', error);
      setAdjustmentError('Failed to update budget on server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryAmountChange = (category, value) => {
    setEditingBudget(prev => ({
      ...prev,
      [category]: value
    }));
    
    if (adjustmentError) {
      setAdjustmentError('');
    }
  };

  const testChatbotSync = async () => {
    try {
      console.log('🔧 Testing chatbot sync...');
      const freshBudget = await budgetService.getBudget(true);
      console.log('📊 Current server budget:', freshBudget);
      
      window.alert(`Current server budget total: ₹${freshBudget.total.toLocaleString()}\nCategories: ${Object.keys(freshBudget.categories).length}`);
    } catch (error) {
      console.error('❌ Error testing sync:', error);
      window.alert('Failed to sync with server. Check console for details.');
    }
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const currentTheme = isDarkMode ? darkTheme : lightTheme;

  // Simplified animated style for web compatibility
  const animatedStyle = {
    opacity: fadeAnim,
    // Remove transform for web compatibility
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Header with CSS gradient */}
      <View 
        style={[
          styles.header,
          {
            backgroundColor: currentTheme.primary,
            background: Platform.OS === 'web' ? (isDarkMode 
              ? 'linear-gradient(135deg, #1a237e 0%, #303f9f 100%)'
              : 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)') : undefined
          }
        ]}
      >
        <Animated.View style={[styles.headerContent, animatedStyle]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.welcomeText, { color: currentTheme.headerText }]}>
                Welcome back! 👋
              </Text>
              <Text style={[styles.headerTitle, { color: currentTheme.headerText }]}>
                Budget Dashboard
              </Text>
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.darkModeToggle, { backgroundColor: currentTheme.cardBackground }]}
                onPress={toggleDarkMode}
              >
                <Icon 
                  name={isDarkMode ? 'weather-sunny' : 'weather-night'} 
                  size={24} 
                  color={currentTheme.primary}
                />
              </TouchableOpacity>
            </View>
          </View>
          
          {budget.total > 0 && (
            <View style={styles.quickStats}>
              <View style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[styles.statValue, { color: currentTheme.headerText }]}>
                  ₹{budget.total.toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, { color: currentTheme.headerText }]}>
                  Total Budget
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={[styles.statValue, { color: currentTheme.headerText }]}>
                  {Object.keys(budget.categories || {}).filter(key => 
                    key !== 'total_budget' && key !== 'recommendations'
                  ).length}
                </Text>
                <Text style={[styles.statLabel, { color: currentTheme.headerText }]}>
                  Categories
                </Text>
              </View>
            </View>
          )}
        </Animated.View>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={animatedStyle}>
          {loading ? (
            <Card style={[styles.loadingCard, { backgroundColor: currentTheme.cardBackground }]}>
              <Card.Content style={styles.loadingContent}>
                <View style={styles.loadingIndicator}>
                  <Icon name="loading" size={40} color={currentTheme.primary} />
                </View>
                <Text style={[styles.loadingText, { color: currentTheme.text }]}>
                  Loading your budget data...
                </Text>
              </Card.Content>
            </Card>
          ) : (
            <>
              {budget.total > 0 ? (
                <>
                  <BudgetCard 
                    total={budget.total} 
                    spent={Math.round(budget.total * 0.4)}
                    categories={budget.categories}
                    theme={currentTheme}
                    key={`budgetcard-${lastSyncTime}-${budget.total}`}
                  />
                  
                  <CategoryPieChart 
                    categories={budget.categories || {}} 
                    key={`piechart-${lastSyncTime}-${budget.total}-${Object.keys(budget.categories || {}).length}`}
                    theme={currentTheme}
                  />
                </>
              ) : (
                <Card style={[styles.emptyStateCard, { backgroundColor: currentTheme.cardBackground }]}>
                  <Card.Content style={styles.emptyStateContent}>
                    <Icon name="wallet-plus" size={80} color={currentTheme.primary} />
                    <Text style={[styles.emptyStateTitle, { color: currentTheme.text }]}>
                      No Budget Yet
                    </Text>
                    <Text style={[styles.emptyStateMessage, { color: currentTheme.textSecondary }]}>
                      Create your first budget to get started with smart financial planning
                    </Text>
                  </Card.Content>
                </Card>
              )}
            </>
          )}

          {/* Action Cards */}
          <View style={styles.actionCardsContainer}>
            <TouchableOpacity
              style={[styles.actionCard, styles.primaryAction, { backgroundColor: currentTheme.primary }]}
              onPress={() => navigation.navigate('Questionnaire')}
              activeOpacity={0.8}
            >
              <Icon name="plus-circle" size={30} color="#FFFFFF" />
              <Text style={styles.actionCardTitle}>Create Budget</Text>
              <Text style={styles.actionCardSubtitle}>Start planning</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, styles.secondaryAction, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]
            }
              onPress={() => navigation.navigate('ChatbotScreen')}
              activeOpacity={0.8}
            >
              <Icon name="chat" size={30} color={currentTheme.primary} />
              <Text style={[styles.actionCardTitle, { color: currentTheme.text }]}>AI Assistant</Text>
              <Text style={[styles.actionCardSubtitle, { color: currentTheme.textSecondary }]}>Get help</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, styles.secondaryAction, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}
              onPress={() => navigation.navigate('RecommendationsScreen')}
              activeOpacity={0.8}
            >
              <Icon name="tag" size={30} color={currentTheme.success} />
              <Text style={[styles.actionCardTitle, { color: currentTheme.text }]}>Find Deals</Text>
              <Text style={[styles.actionCardSubtitle, { color: currentTheme.textSecondary }]}>Save money</Text>
            </TouchableOpacity>

            {budget.total > 0 && (
              <TouchableOpacity
                style={[styles.actionCard, styles.secondaryAction, { backgroundColor: currentTheme.cardBackground, borderColor: currentTheme.border }]}
                onPress={handleAdjustBudget}
                activeOpacity={0.8}
              >
                <Icon name="pencil" size={30} color={currentTheme.warning} />
                <Text style={[styles.actionCardTitle, { color: currentTheme.text }]}>Adjust Budget</Text>
                <Text style={[styles.actionCardSubtitle, { color: currentTheme.textSecondary }]}>Customize</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Recommendations Card */}
          <Card style={[styles.recommendationsCard, { backgroundColor: currentTheme.cardBackground }]}>
            <Card.Content>
              <View style={styles.recommendationsHeader}>
                <Icon name="lightbulb" size={24} color={currentTheme.primary} />
                <Text style={[styles.recommendationsTitle, { color: currentTheme.text }]}>
                  Smart Recommendations
                </Text>
              </View>
              
              {recommendations.map((rec, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.recommendationItem, { borderColor: currentTheme.border }]}
                  onPress={() => {
                    window.alert(rec.action);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.recommendationIcon, { backgroundColor: rec.color + '20' }]}>
                    <Icon name={rec.icon} size={24} color={rec.color} />
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={[styles.recommendationTitle, { color: currentTheme.text }]}>
                      {rec.title}
                    </Text>
                    <Text style={[styles.recommendationDescription, { color: currentTheme.textSecondary }]}>
                      {rec.description}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={currentTheme.textSecondary} />
                </TouchableOpacity>
              ))}
            </Card.Content>
          </Card>

          {/* Debug Section */}
          {budget.total > 0 && (
            <Card style={[styles.debugCard, { backgroundColor: currentTheme.cardBackground }]}>
              <Card.Content>
                <Text style={[styles.debugTitle, { color: currentTheme.text }]}>
                  Developer Tools
                </Text>
                <View style={styles.debugButtons}>
                  <Button
                    mode="outlined"
                    onPress={testChatbotSync}
                    style={styles.debugButton}
                    icon={({ size, color }) => <Icon name="bug" size={size} color={color} />}
                  >
                    Test Sync
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={handleResetBudget}
                    style={styles.debugButton}
                    icon={({ size, color }) => <Icon name="refresh" size={size} color={color} />}
                    buttonColor={currentTheme.error + '20'}
                  >
                    Reset Budget
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}
        </Animated.View>
      </ScrollView>

      {/* Manual Budget Adjustment Modal */}
      {showAdjustModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.cardBackground }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: currentTheme.text }]}>
                Adjust Your Budget
              </Text>
              <TouchableOpacity
                onPress={() => setShowAdjustModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={currentTheme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalSubtitle, { color: currentTheme.textSecondary }]}>
              Modify your budget categories as needed
            </Text>
            
            {adjustmentError ? (
              <Text style={styles.errorText}>{adjustmentError}</Text>
            ) : null}
            
            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              {Object.entries(editingBudget).map(([category, amount]) => (
                <View key={category} style={[styles.adjustmentItem, { backgroundColor: currentTheme.background }]}>
                  <Text style={[styles.categoryLabel, { color: currentTheme.text }]}>
                    {category}
                  </Text>
                  <View style={[styles.inputContainer, { borderColor: currentTheme.border, backgroundColor: currentTheme.cardBackground }]}
                  >
                    <Text style={[styles.currencySymbol, { color: currentTheme.textSecondary }]}>₹</Text>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => handleCategoryAmountChange(category, e.target.value)}
                      style={{
                        flex: 1,
                        padding: 12,
                        fontSize: 16,
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        color: currentTheme.text
                      }}
                      min="0"
                      step="1"
                    />
                  </View>
                </View>
              ))}
              
              <View style={[styles.totalContainer, { backgroundColor: currentTheme.success + '20' }]}>
                <Text style={[styles.totalLabel, { color: currentTheme.text }]}>New Total: </Text>
                <Text style={[styles.totalAmount, { color: currentTheme.success }]}>
                  ₹{Object.values(editingBudget).reduce((sum, val) => sum + (Number(val) || 0), 0).toLocaleString()}
                </Text>
              </View>
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <Button 
                mode="outlined" 
                onPress={() => setShowAdjustModal(false)}
                style={styles.modalButton}
              >
                Cancel
              </Button>
              <Button 
                mode="contained"
                onPress={handleSaveAdjustedBudget}
                style={[styles.modalButton, { backgroundColor: currentTheme.primary }]}
                loading={loading}
                disabled={loading}
              >
                Save Changes
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

// Theme configurations
const lightTheme = {
  background: '#f8f9fa',
  cardBackground: '#ffffff',
  text: '#212529',
  textSecondary: '#6c757d',
  primary: '#007bff',
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  border: '#e9ecef',
  headerText: '#ffffff',
  statusBar: '#007bff'
};

const darkTheme = {
  background: '#121212',
  cardBackground: '#1e1e1e',
  text: '#ffffff',
  textSecondary: '#b3b3b3',
  primary: '#4fc3f7',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  border: '#333333',
  headerText: '#ffffff',
  statusBar: '#1a237e'
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    marginBottom: 4,
    opacity: 0.9,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerActions: {
    alignItems: 'flex-end',
  },
  darkModeToggle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }
    }),
  },
  quickStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingCard: {
    marginVertical: 16,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 4,
      }
    }),
  },
  loadingContent: {
    padding: 40,
    alignItems: 'center',
  },
  loadingIndicator: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyStateCard: {
    marginVertical: 20,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 4,
      }
    }),
  },
  emptyStateContent: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  actionCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginVertical: 20,
  },
  actionCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
        cursor: 'pointer',
      },
      default: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }
    }),
  },
  primaryAction: {
    minWidth: width - 40,
  },
  secondaryAction: {
    borderWidth: 1,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
    color: '#ffffff',
  },
  actionCardSubtitle: {
    fontSize: 12,
    opacity: 0.8,
    color: '#ffffff',
  },
  recommendationsCard: {
    marginVertical: 16,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 4,
      }
    }),
  },
  recommendationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  recommendationsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  recommendationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  debugCard: {
    marginTop: 20,
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 2,
      }
    }),
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  debugButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  debugButton: {
    flex: 1,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: height * 0.8,
    borderRadius: 20,
    padding: 0,
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 24px rgba(0,0,0,0.3)',
      },
      default: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      }
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    marginHorizontal: 20,
  },
  modalCloseButton: {
    padding: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  modalScrollView: {
    maxHeight: 300,
    marginHorizontal: 20,
  },
  adjustmentItem: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modalButton: {
    flex: 1,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    textAlign: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
  },
});

export default HomeScreen;