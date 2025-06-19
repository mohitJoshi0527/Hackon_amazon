// src/screens/QuestionnaireScreen.js
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

const QuestionnaireScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleQuestionnaireSubmit = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      console.log('📋 Submitting questionnaire data:', formData);
      
      const response = await fetch(`${API_BASE_URL}/budget/create-from-questionnaire`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create budget: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log('✅ Budget created successfully:', result);

      // Clear any cached budget data to force fresh load
      if (typeof budgetService?.clearCache === 'function') {
        budgetService.clearCache();
      }

      // Trigger budget update notification
      if (typeof budgetService?.triggerBudgetUpdate === 'function') {
        budgetService.triggerBudgetUpdate('questionnaire_completion');
      }

      setLoading(false);
      
      // Navigate to HomeScreen with parameters to trigger refresh
      navigation.navigate('Home', {
        fromQuestionnaire: true,
        budgetCreated: true,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Error creating budget:', error);
      setError(error.message || 'Failed to create budget. Please try again.');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Budget Questionnaire</Text>
        <Text style={styles.subtitle}>Help us understand your budgeting needs</Text>
      </View>

      {/* Questionnaire Form - Simplified for brevity */}
      <ScrollView style={styles.formContainer}>
        {/* Form fields go here */}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button 
          mode="contained" 
          onPress={handleQuestionnaireSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
        >
          Submit
        </Button>
      </View>

      {/* Error Message */}
      {error && (
        <Text style={styles.errorMessage}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    flex: 1,
    marginBottom: 20,
  },
  actions: {
    alignItems: 'center',
    marginTop: 16,
  },
  submitButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorMessage: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default QuestionnaireScreen;