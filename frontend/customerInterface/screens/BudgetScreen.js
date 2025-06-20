// src/screens/BudgetScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Card, Title, Button, Divider } from 'react-native-paper';
import { getBudgetPlan, resetBudgetPlan } from '../api/budgetAPI';
import BudgetCard from '../components/BudgetCard';

const BudgetScreen = ({ navigation }) => {
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchBudget();
  }, []);

  const fetchBudget = async () => {
    try {
      setLoading(true);
      const data = await getBudgetPlan();
      setBudget(data);
    } catch (error) {
      console.error('Error fetching budget', error);
      Alert.alert('Error', 'Failed to load budget information');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBudget();
    setRefreshing(false);
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Budget Plan',
      'Are you sure you want to reset your budget plan? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            try {
              await resetBudgetPlan();
              Alert.alert('Success', 'Budget plan has been reset');
              navigation.replace('Home');
            } catch (error) {
              console.error('Error resetting budget', error);
              Alert.alert('Error', 'Failed to reset budget plan');
            }
          }
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centeredContainer}>
        <Text>Loading budget information...</Text>
      </View>
    );
  }

  if (!budget || (budget.message && budget.message.includes("No budget"))) {
    return (
      <View style={styles.centeredContainer}>
        <Text>No budget plan found</Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.navigate('Questionnaire')}
          style={styles.button}
        >
          Create Budget Plan
        </Button>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Title style={styles.title}>Monthly Budget Summary</Title>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Budget:</Text>
            <Text style={styles.totalAmount}>₹{budget.total_budget || budget.monthly_budget || 0}</Text>
          </View>
          
          {budget.savings_goal && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Savings Goal:</Text>
              <Text style={styles.totalAmount}>₹{budget.savings_goal}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Title style={styles.categoriesTitle}>Category Breakdown</Title>
      
      {budget.categories && Object.keys(budget.categories).length > 0 ? (
        Object.entries(budget.categories).map(([category, amount]) => (
          <BudgetCard 
            key={category}
            category={category}
            amount={amount}
            total={budget.total_budget || budget.monthly_budget || 0}
            spent={Math.floor(Math.random() * amount)} // Simulated spent amount
          />
        ))
      ) : (
        <Text style={styles.emptyText}>No category breakdown available</Text>
      )}

      <Button 
        mode="outlined" 
        onPress={() => navigation.navigate('Chatbot')}
        style={styles.chatButton}
        icon="chat"
      >
        Discuss Your Budget
      </Button>

      <Button 
        mode="outlined" 
        onPress={handleReset}
        style={styles.resetButton}
        color="#f44336"
      >
        Reset Budget Plan
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  summaryCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 3,
    backgroundColor: '#e8f5e9',
  },
  title: {
    fontSize: 20,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  categoriesTitle: {
    marginTop: 8,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 24,
    color: '#757575',
  },
  button: {
    marginTop: 16,
  },
  chatButton: {
    marginTop: 24,
  },
  resetButton: {
    marginTop: 16,
    marginBottom: 24,
  },
});

export default BudgetScreen;