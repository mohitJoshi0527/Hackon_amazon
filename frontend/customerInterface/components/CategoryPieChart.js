// src/components/CategoryPieChart.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform 
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { Card } from 'react-native-paper';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Enhanced color palette with gradients
const colorPalette = [
  { main: '#FF6B6B', gradient: ['#FF6B6B', '#FF8E8E'], icon: '🛒' },
  { main: '#4ECDC4', gradient: ['#4ECDC4', '#6FEDE6'], icon: '🏠' },
  { main: '#45B7D1', gradient: ['#45B7D1', '#6BC7E1'], icon: '🚗' },
  { main: '#FFA07A', gradient: ['#FFA07A', '#FFB399'], icon: '🍔' },
  { main: '#98D8C8', gradient: ['#98D8C8', '#A8E6D4'], icon: '💡' },
  { main: '#F7DC6F', gradient: ['#F7DC6F', '#F9E79F'], icon: '🎮' },
  { main: '#BB8FCE', gradient: ['#BB8FCE', '#C8A2D8'], icon: '👕' },
  { main: '#85C1E9', gradient: ['#85C1E9', '#A3D5F0'], icon: '📚' },
  { main: '#F8C471', gradient: ['#F8C471', '#FADAA3'], icon: '⚡' },
  { main: '#82E0AA', gradient: ['#82E0AA', '#A2EBC0'], icon: '💊' },
];

// Category icons mapping
const getCategoryIcon = (categoryName) => {
  const name = categoryName.toLowerCase();
  if (name.includes('food') || name.includes('grocery') || name.includes('restaurant')) return '🍔';
  if (name.includes('transport') || name.includes('car') || name.includes('fuel')) return '🚗';
  if (name.includes('home') || name.includes('rent') || name.includes('housing')) return '🏠';
  if (name.includes('entertainment') || name.includes('fun') || name.includes('game')) return '🎮';
  if (name.includes('cloth') || name.includes('fashion') || name.includes('apparel')) return '👕';
  if (name.includes('health') || name.includes('medical') || name.includes('medicine')) return '💊';
  if (name.includes('education') || name.includes('book') || name.includes('study')) return '📚';
  if (name.includes('utility') || name.includes('electric') || name.includes('bill')) return '⚡';
  if (name.includes('other') || name.includes('misc')) return '💡';
  return '🛒'; // Default
};

const CategoryPieChart = ({ categories, theme }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [animationValue] = useState(new Animated.Value(0));
  const [chartAnimation] = useState(new Animated.Value(0));
  const [prevCategories, setPrevCategories] = useState(categories);
  const [dataVersion, setDataVersion] = useState(0);

  // Responsive calculations
  const isTablet = screenWidth > 768;
  const isSmallScreen = screenWidth < 375;
  const isLandscape = screenWidth > screenHeight;

  const chartSize = Math.min(
    screenWidth * (isTablet ? 0.5 : 0.8),
    isLandscape ? screenHeight * 0.6 : 300
  );

  // Filter and prepare category data
  const filteredCategories = Object.entries(categories || {})
    .filter(([key]) => 
      key !== 'total_budget' && 
      key !== 'recommendations' &&
      !Array.isArray(categories[key])
    )
    .map(([key, value]) => ({
      name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      amount: Number(value) || 0,
      originalKey: key,
    }))
    .filter(category => category.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  // Calculate total for percentages
  const totalAmount = filteredCategories.reduce((sum, cat) => sum + cat.amount, 0);

  // Generate enhanced chart data
  const chartData = filteredCategories.map((category, index) => {
    const colorSet = colorPalette[index % colorPalette.length];
    const percentage = ((category.amount / totalAmount) * 100).toFixed(1);
    
    return {
      name: category.name,
      amount: category.amount,
      color: colorSet.main,
      gradientColors: colorSet.gradient,
      icon: getCategoryIcon(category.name),
      percentage: parseFloat(percentage),
      legendFontColor: theme?.textSecondary || '#7F7F7F',
      legendFontSize: isSmallScreen ? 10 : isTablet ? 14 : 12
    };
  });

  // Animation effects - trigger when server data changes
  useEffect(() => {
    const categoriesChanged = JSON.stringify(prevCategories) !== JSON.stringify(categories);
    
    if (categoriesChanged) {
      console.log('📈 CategoryPieChart: Server data changed, updating chart');
      console.log('Previous categories keys:', Object.keys(prevCategories || {}));
      console.log('New categories keys:', Object.keys(categories || {}));
      
      setPrevCategories(categories);
      setDataVersion(prev => prev + 1);
      
      // Reset and restart animations for fresh server data
      animationValue.setValue(0);
      chartAnimation.setValue(0);
      
      Animated.parallel([
        Animated.timing(animationValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false, // Explicitly set to false for web compatibility
        }),
        Animated.timing(chartAnimation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false, // Explicitly set to false for web compatibility
        }),
      ]).start();
    }
  }, [categories, prevCategories]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animationValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false, // Explicitly set to false for web compatibility
      }),
      Animated.timing(chartAnimation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false, // Explicitly set to false for web compatibility
      }),
    ]).start();
  }, []);

  // Handle category selection
  const handleCategoryPress = (category) => {
    setSelectedCategory(selectedCategory?.name === category.name ? null : category);
  };

  // No data state
  if (chartData.length === 0) {
    return (
      <Card style={[
        styles.container,
        { 
          backgroundColor: theme?.cardBackground || '#ffffff',
          borderColor: theme?.border || '#e0e0e0'
        }
      ]}>
        <Card.Content style={styles.noDataContainer}>
          <Animated.View style={[
            styles.noDataContent,
            {
              opacity: animationValue, // Simplified animation for web compatibility
            }
          ]}>
            <Text style={styles.noDataIcon}>📊</Text>
            <Text style={[styles.title, { color: theme?.text || '#333' }]}>
              Category Breakdown
            </Text>
            <Text style={[styles.noDataText, { color: theme?.textSecondary || '#666' }]}>
              No budget categories available yet
            </Text>
            <Text style={[styles.noDataSubtext, { color: theme?.textSecondary || '#999' }]}>
              Create your first budget to see the breakdown
            </Text>
          </Animated.View>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={[
      styles.container,
      { 
        backgroundColor: theme?.cardBackground || '#ffffff',
        borderColor: theme?.border || '#e0e0e0'
      }
    ]}>
      <Card.Content style={styles.cardContent}>
        {/* Enhanced Header */}
        <Animated.View style={[
          styles.header,
          {
            opacity: animationValue, // Simplified animation for web compatibility
          }
        ]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerIcon]}>📊</Text>
            <View style={styles.headerText}>
              <Text style={[
                styles.title,
                { 
                  color: theme?.text || '#333',
                  fontSize: isSmallScreen ? 18 : isTablet ? 24 : 20
                }
              ]}>
                Category Breakdown
              </Text>
              <Text style={[
                styles.subtitle,
                { 
                  color: theme?.textSecondary || '#666',
                  fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14
                }
              ]}>
                Total Budget: ₹{totalAmount.toLocaleString()}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Chart Container */}
        <Animated.View style={[
          styles.chartContainer,
          {
            opacity: chartAnimation, // Simplified animation for web compatibility
          }
        ]}>
          <View style={[
            styles.chartWrapper,
            {
              flexDirection: isTablet && isLandscape ? 'row' : 'column',
              alignItems: 'center'
            }
          ]}>
            {/* Pie Chart */}
            <View style={styles.pieChartContainer}>
              <PieChart
                data={chartData}
                width={chartSize}
                height={chartSize * 0.7}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: 'transparent',
                  backgroundGradientTo: 'transparent',
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  strokeWidth: 2,
                  barPercentage: 0.8,
                }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft={isSmallScreen ? "10" : "15"}
                absolute
                hasLegend={false}
              />
            </View>

            {/* Enhanced Legend */}
            <ScrollView 
              style={[
                styles.legend,
                {
                  maxHeight: isTablet && isLandscape ? undefined : 200,
                  flex: isTablet && isLandscape ? 1 : undefined,
                  marginLeft: isTablet && isLandscape ? 20 : 0,
                  marginTop: isTablet && isLandscape ? 0 : 20,
                }
              ]}
              showsVerticalScrollIndicator={false}
            >
              {chartData.map((category, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.legendItem,
                    {
                      backgroundColor: selectedCategory?.name === category.name 
                        ? category.color + '20' 
                        : 'transparent',
                      borderColor: selectedCategory?.name === category.name 
                        ? category.color 
                        : 'transparent',
                      marginBottom: isSmallScreen ? 8 : 12,
                      paddingVertical: isSmallScreen ? 8 : 12,
                      paddingHorizontal: isSmallScreen ? 12 : 16,
                    }
                  ]}
                  onPress={() => handleCategoryPress(category)}
                  activeOpacity={0.7}
                >
                  <View style={styles.legendItemContent}>
                    <View style={styles.legendLeft}>
                      <View style={[
                        styles.legendColorIndicator,
                        { 
                          backgroundColor: category.color,
                          width: isSmallScreen ? 12 : isTablet ? 18 : 16,
                          height: isSmallScreen ? 12 : isTablet ? 18 : 16,
                        }
                      ]} />
                      <Text style={[
                        styles.legendIcon,
                        { fontSize: isSmallScreen ? 16 : isTablet ? 22 : 20 }
                      ]}>
                        {category.icon}
                      </Text>
                      <View style={styles.legendTextContainer}>
                        <Text style={[
                          styles.legendName,
                          { 
                            color: theme?.text || '#333',
                            fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14
                          }
                        ]}>
                          {category.name}
                        </Text>
                        <Text style={[
                          styles.legendPercentage,
                          { 
                            color: theme?.textSecondary || '#666',
                            fontSize: isSmallScreen ? 10 : isTablet ? 14 : 12
                          }
                        ]}>
                          {category.percentage}%
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.legendRight}>
                      <Text style={[
                        styles.legendAmount,
                        { 
                          color: category.color,
                          fontSize: isSmallScreen ? 12 : isTablet ? 16 : 14
                        }
                      ]}>
                        ₹{category.amount.toLocaleString()}
                      </Text>
                    </View>
                  </View>

                  {/* Expanded Details */}
                  {selectedCategory?.name === category.name && (
                    <Animated.View style={[
                      styles.expandedDetails,
                      {
                        backgroundColor: category.color + '10',
                        marginTop: 8,
                        padding: isSmallScreen ? 8 : 12,
                        borderRadius: 8,
                      }
                    ]}>
                      <Text style={[
                        styles.expandedText,
                        { 
                          color: theme?.textSecondary || '#666',
                          fontSize: isSmallScreen ? 10 : isTablet ? 14 : 12
                        }
                      ]}>
                        This category represents {category.percentage}% of your total budget.
                        Consider tracking expenses in this area for better budget management.
                      </Text>
                    </Animated.View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Animated.View>

        {/* Summary Stats */}
        <Animated.View style={[
          styles.summaryStats,
          {
            opacity: animationValue,
            backgroundColor: theme?.background || '#f8f9fa',
            marginTop: 20,
            padding: isSmallScreen ? 12 : 16,
            borderRadius: 12,
          }
        ]}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[
                styles.statNumber,
                { 
                  color: theme?.primary || '#007bff',
                  fontSize: isSmallScreen ? 16 : isTablet ? 22 : 18
                }
              ]}>
                {chartData.length}
              </Text>
              <Text style={[
                styles.statLabel,
                { 
                  color: theme?.textSecondary || '#666',
                  fontSize: isSmallScreen ? 10 : isTablet ? 14 : 12
                }
              ]}>
                Categories
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[
                styles.statNumber,
                { 
                  color: theme?.success || '#28a745',
                  fontSize: isSmallScreen ? 16 : isTablet ? 22 : 18
                }
              ]}>
                {chartData[0]?.percentage || 0}%
              </Text>
              <Text style={[
                styles.statLabel,
                { 
                  color: theme?.textSecondary || '#666',
                  fontSize: isSmallScreen ? 10 : isTablet ? 14 : 12
                }
              ]}>
                Largest Category
              </Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={[
                styles.statNumber,
                { 
                  color: theme?.warning || '#ffc107',
                  fontSize: isSmallScreen ? 16 : isTablet ? 22 : 18
                }
              ]}>
                ₹{Math.round(totalAmount / chartData.length).toLocaleString()}
              </Text>
              <Text style={[
                styles.statLabel,
                { 
                  color: theme?.textSecondary || '#666',
                  fontSize: isSmallScreen ? 10 : isTablet ? 14 : 12
                }
              ]}>
                Average
              </Text>
            </View>
          </View>
        </Animated.View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
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
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartWrapper: {
    width: '100%',
  },
  pieChartContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  legend: {
    width: '100%',
  },
  legendItem: {
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  legendItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendColorIndicator: {
    borderRadius: 8,
    marginRight: 12,
  },
  legendIcon: {
    marginRight: 8,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  legendPercentage: {
    fontWeight: '500',
  },
  legendRight: {
    alignItems: 'flex-end',
  },
  legendAmount: {
    fontWeight: 'bold',
  },
  expandedDetails: {
    borderRadius: 8,
  },
  expandedText: {
    lineHeight: 18,
    fontStyle: 'italic',
  },
  summaryStats: {
    borderRadius: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontWeight: '500',
    textAlign: 'center',
  },
  noDataContainer: {
    padding: 40,
  },
  noDataContent: {
    alignItems: 'center',
  },
  noDataIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  noDataSubtext: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default CategoryPieChart;