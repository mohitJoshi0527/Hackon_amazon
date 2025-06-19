// src/components/BudgetCard.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform 
} from 'react-native';
import { Card, ProgressBar } from 'react-native-paper';

const { width: screenWidth } = Dimensions.get('window');

// Icons for different categories
const categoryIcons = {
  food: '🍔',
  transport: '🚗',
  entertainment: '🎮',
  shopping: '🛍️',
  health: '💊',
  education: '📚',
  utilities: '⚡',
  rent: '🏠',
  savings: '💰',
  other: '💡',
};

const getCategoryIcon = (categoryName) => {
  const name = categoryName.toLowerCase();
  if (name.includes('food') || name.includes('grocery')) return categoryIcons.food;
  if (name.includes('transport') || name.includes('car') || name.includes('fuel')) return categoryIcons.transport;
  if (name.includes('entertainment') || name.includes('fun')) return categoryIcons.entertainment;
  if (name.includes('shop') || name.includes('cloth')) return categoryIcons.shopping;
  if (name.includes('health') || name.includes('medical')) return categoryIcons.health;
  if (name.includes('edu') || name.includes('book')) return categoryIcons.education;
  if (name.includes('util') || name.includes('electric') || name.includes('bill')) return categoryIcons.utilities;
  if (name.includes('rent') || name.includes('house')) return categoryIcons.rent;
  if (name.includes('sav')) return categoryIcons.savings;
  return categoryIcons.other;
};

const BudgetCard = ({ total = 0, spent = 0, categories = {}, theme }) => {
  const [animationValue] = useState(new Animated.Value(0));
  const [expandedCategories, setExpandedCategories] = useState(false);
  const [prevTotal, setPrevTotal] = useState(total);
  const [prevCategories, setPrevCategories] = useState(categories);
  const [dataVersion, setDataVersion] = useState(0);

  // Responsive calculations
  const isTablet = screenWidth > 768;
  const isSmallScreen = screenWidth < 375;

  // Ensure numbers are handled properly
  const totalAmount = Number(total) || 0;
  const spentAmount = Number(spent) || 0;
  
  // Calculate remaining and progress
  const remaining = Math.max(0, totalAmount - spentAmount);
  const progress = totalAmount > 0 ? Math.min(1, spentAmount / totalAmount) : 0;
  
  // Determine color based on spending level
  const getProgressColor = (progress) => {
    if (progress > 0.9) return theme?.error || '#F44336';
    if (progress > 0.7) return theme?.warning || '#FF9800';
    return theme?.success || '#4CAF50';
  };

  const progressColor = getProgressColor(progress);

  // Convert categories to array for rendering
  const categoryItems = Object.entries(categories || {})
    .filter(([name]) => name !== 'total_budget' && name !== 'recommendations')
    .map(([name, amount]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      originalName: name,
      amount: Number(amount) || 0,
      spent: Math.round((Number(amount) || 0) * (0.2 + Math.random() * 0.5)),
      icon: getCategoryIcon(name),
    }))
    .sort((a, b) => b.amount - a.amount);

  // Animation effect - trigger when data changes from server
  useEffect(() => {
    const totalChanged = prevTotal !== total;
    const categoriesChanged = JSON.stringify(prevCategories) !== JSON.stringify(categories);
    
    if (totalChanged || categoriesChanged) {
      console.log('📊 BudgetCard: Server data changed, updating display');
      console.log('Previous total:', prevTotal, 'New total:', total);
      console.log('Categories changed:', categoriesChanged);
      
      setPrevTotal(total);
      setPrevCategories(categories);
      setDataVersion(prev => prev + 1);
      
      // Reset and restart animation for fresh server data
      animationValue.setValue(0);
      Animated.timing(animationValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false, // Explicitly set to false for web compatibility
      }).start();
    }
  }, [total, categories, prevTotal, prevCategories]);

  useEffect(() => {
    Animated.timing(animationValue, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false, // Explicitly set to false for web compatibility
    }).start();
  }, []);

  const toggleCategoriesExpansion = () => {
    setExpandedCategories(!expandedCategories);
  };

  const renderAmountBox = (label, amount, color, icon) => (
    <Animated.View style={[
      styles.amountBox,
      {
        backgroundColor: theme?.cardBackground || '#ffffff',
        borderColor: color + '30',
        opacity: animationValue, // Use opacity instead of transform for web compatibility
        padding: isSmallScreen ? 12 : isTablet ? 20 : 16,
      }
    ]}>
      <View style={[styles.amountIconContainer, { backgroundColor: color + '15' }]}>
        <Text style={[styles.amountIcon, { fontSize: isSmallScreen ? 16 : isTablet ? 24 : 20 }]}>
          {icon}
        </Text>
      </View>
      <Text style={[
        styles.amountLabel,
        {
          color: theme?.textSecondary || '#757575',
          fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
        }
      ]}>
        {label}
      </Text>
      <Text style={[
        styles.amountValue,
        {
          color: color,
          fontSize: isSmallScreen ? 16 : isTablet ? 22 : 18,
        }
      ]}>
        ₹{amount.toLocaleString()}
      </Text>
    </Animated.View>
  );

  const renderCategoryItem = (category, index) => {
    const categoryProgress = category.amount > 0 ? Math.min(1, category.spent / category.amount) : 0;
    const categoryColor = getProgressColor(categoryProgress);
    const isOverBudget = category.spent > category.amount;

    return (
      <Animated.View
        key={category.originalName}
        style={[
          styles.categoryItem,
          {
            backgroundColor: theme?.background || '#f8f9fa',
            borderColor: theme?.border || '#e9ecef',
            opacity: animationValue, // Use opacity instead of complex transforms
            marginBottom: isSmallScreen ? 8 : 12,
            padding: isSmallScreen ? 12 : 16,
          }
        ]}
      >
        <View style={styles.categoryHeader}>
          <View style={styles.categoryLeft}>
            <Text style={[
              styles.categoryIcon,
              { fontSize: isSmallScreen ? 16 : isTablet ? 22 : 20 }
            ]}>
              {category.icon}
            </Text>
            <View style={styles.categoryInfo}>
              <Text style={[
                styles.categoryName,
                {
                  color: theme?.text || '#333',
                  fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
                }
              ]}>
                {category.name}
              </Text>
              <Text style={[
                styles.categorySubtext,
                {
                  color: theme?.textSecondary || '#666',
                  fontSize: isSmallScreen ? 11 : isTablet ? 14 : 12,
                }
              ]}>
                {Math.round(categoryProgress * 100)}% used
                {isOverBudget && ' - Over Budget!'}
              </Text>
            </View>
          </View>
          
          <View style={styles.categoryRight}>
            <Text style={[
              styles.categoryAmount,
              {
                color: categoryColor,
                fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
              }
            ]}>
              ₹{category.spent.toLocaleString()}
            </Text>
            <Text style={[
              styles.categoryTotal,
              {
                color: theme?.textSecondary || '#666',
                fontSize: isSmallScreen ? 10 : isTablet ? 14 : 12,
              }
            ]}>
              of ₹{category.amount.toLocaleString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.categoryProgressContainer}>
          <ProgressBar 
            progress={categoryProgress}
            color={categoryColor}
            style={[
              styles.categoryProgress,
              {
                height: isSmallScreen ? 6 : 8,
                backgroundColor: theme?.border || '#e9ecef',
              }
            ]}
          />
          {isOverBudget && (
            <View style={[styles.overBudgetIndicator, { backgroundColor: theme?.error || '#F44336' }]}>
              <Text style={styles.overBudgetText}>!</Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <Card style={[
      styles.card,
      {
        backgroundColor: theme?.cardBackground || '#ffffff',
        borderColor: theme?.border || '#e9ecef',
      }
    ]}>
      <Card.Content style={[
        styles.cardContent,
        { padding: isSmallScreen ? 16 : isTablet ? 24 : 20 }
      ]}>
        {/* Header */}
        <Animated.View style={[
          styles.header,
          {
            opacity: animationValue, // Simplified animation for web compatibility
          }
        ]}>
          <View style={styles.headerContent}>
            <Text style={styles.headerIcon}>💰</Text>
            <Text style={[
              styles.title,
              {
                color: theme?.text || '#333',
                fontSize: isSmallScreen ? 18 : isTablet ? 24 : 20,
              }
            ]}>
              Monthly Budget
            </Text>
          </View>
          <View style={[
            styles.statusBadge,
            {
              backgroundColor: progressColor + '15',
              borderColor: progressColor,
            }
          ]}>
            <Text style={[styles.statusText, { color: progressColor }]}>
              {progress > 0.9 ? 'Critical' : progress > 0.7 ? 'Warning' : 'Good'}
            </Text>
          </View>
        </Animated.View>
        
        {/* Amount Cards */}
        <View style={[
          styles.amountContainer,
          {
            flexDirection: isTablet ? 'row' : (isSmallScreen ? 'column' : 'row'),
            marginBottom: isSmallScreen ? 16 : 20,
          }
        ]}>
          {renderAmountBox('Total', totalAmount, theme?.primary || '#007bff', '🎯')}
          {renderAmountBox('Spent', spentAmount, theme?.error || '#FF5722', '💸')}
          {renderAmountBox('Remaining', remaining, theme?.success || '#4CAF50', '💵')}
        </View>
        
        {/* Progress Section */}
        <Animated.View style={[
          styles.progressSection,
          {
            opacity: animationValue,
            backgroundColor: theme?.background || '#f8f9fa',
            padding: isSmallScreen ? 12 : 16,
            borderRadius: 12,
            marginBottom: 20,
          }
        ]}>
          <View style={styles.progressHeader}>
            <Text style={[
              styles.progressLabel,
              {
                color: theme?.text || '#333',
                fontSize: isSmallScreen ? 14 : isTablet ? 18 : 16,
              }
            ]}>
              Budget Usage
            </Text>
            <Text style={[
              styles.progressPercentage,
              {
                color: progressColor,
                fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
              }
            ]}>
              {Math.round(progress * 100)}%
            </Text>
          </View>
          
          <View style={styles.progressBarContainer}>
            <ProgressBar 
              progress={progress} 
              color={progressColor} 
              style={[
                styles.progressBar,
                {
                  height: isSmallScreen ? 10 : 12,
                  backgroundColor: theme?.border || '#e9ecef',
                }
              ]} 
            />
          </View>
          
          <Text style={[
            styles.progressDescription,
            {
              color: theme?.textSecondary || '#666',
              fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14,
            }
          ]}>
            {progress === 0 
              ? 'No spending recorded yet' 
              : `You've used ${Math.round(progress * 100)}% of your monthly budget`}
          </Text>
        </Animated.View>
        
        {/* Categories Section */}
        {categoryItems.length > 0 && (
          <View style={styles.categoriesContainer}>
            <TouchableOpacity
              style={styles.categoriesHeader}
              onPress={toggleCategoriesExpansion}
              activeOpacity={0.7}
            >
              <View style={styles.categoriesHeaderLeft}>
                <Text style={styles.categoriesIcon}>📊</Text>
                <Text style={[
                  styles.categoriesTitle,
                  {
                    color: theme?.text || '#333',
                    fontSize: isSmallScreen ? 16 : isTablet ? 20 : 18,
                  }
                ]}>
                  Budget Categories
                </Text>
              </View>
              <Text style={[
                styles.expandIcon,
                {
                  color: theme?.primary || '#007bff',
                  transform: [{ rotate: expandedCategories ? '180deg' : '0deg' }],
                }
              ]}>
                ▼
              </Text>
            </TouchableOpacity>
            
            <View style={styles.categoriesList}>
              {(expandedCategories ? categoryItems : categoryItems.slice(0, 3))
                .map((category, index) => renderCategoryItem(category, index))}
            </View>
            
            {!expandedCategories && categoryItems.length > 3 && (
              <TouchableOpacity
                style={[
                  styles.showMoreButton,
                  {
                    backgroundColor: theme?.primary || '#007bff',
                    marginTop: 12,
                    paddingVertical: isSmallScreen ? 8 : 12,
                  }
                ]}
                onPress={toggleCategoriesExpansion}
              >
                <Text style={[
                  styles.showMoreText,
                  { fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14 }
                ]}>
                  Show {categoryItems.length - 3} more categories
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      }
    }),
  },
  cardContent: {
    // Padding handled responsively in component
  },
  header: {
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  amountContainer: {
    justifyContent: 'space-between',
    gap: 12,
  },
  amountBox: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 2,
      }
    }),
  },
  amountIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountIcon: {
    // Font size handled responsively
  },
  amountLabel: {
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  amountValue: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  progressSection: {
    borderRadius: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontWeight: 'bold',
  },
  progressPercentage: {
    fontWeight: 'bold',
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBar: {
    borderRadius: 6,
  },
  progressDescription: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  categoriesContainer: {
    // No additional styling needed
  },
  categoriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  categoriesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoriesIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  categoriesTitle: {
    fontWeight: 'bold',
  },
  expandIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoriesList: {
    // No additional styling needed
  },
  categoryItem: {
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  categorySubtext: {
    fontWeight: '500',
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontWeight: 'bold',
  },
  categoryTotal: {
    fontWeight: '500',
    marginTop: 2,
  },
  categoryProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryProgress: {
    flex: 1,
    borderRadius: 4,
  },
  overBudgetIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  overBudgetText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  showMoreButton: {
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  showMoreText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default BudgetCard;