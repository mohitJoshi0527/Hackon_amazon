// src/screens/QuestionnairePage.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, RadioButton } from 'react-native-paper';
import { fetchQuestionnaire, submitBudgetPlan, syncBudgetWithChatbot } from '../api/budgetAPI';
import CustomCheckbox from '../components/CustomCheckbox';

const QuestionnairePage = ({ navigation }) => {
  const [questionnaire, setQuestionnaire] = useState({});
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    const getQuestionnaire = async () => {
      try {
        setLoading(true);
        const data = await fetchQuestionnaire();
        console.log('Loaded questionnaire:', data);
        
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setQuestionnaire(data);
          
          // Initialize answers with empty values
          const initialAnswers = {};
          Object.keys(data).forEach(key => {
            initialAnswers[key] = data[key].type === 'multiple_choice_text' ? [] : '';
          });
          setAnswers(initialAnswers);
        } else {
          setError('Invalid questionnaire data received');
        }
      } catch (err) {
        console.error('Failed to load questionnaire:', err);
        setError('Failed to load budget questionnaire');
      } finally {
        setLoading(false);
      }
    };

    getQuestionnaire();
  }, []);

  const handleInputChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Clear validation error when user starts typing
    if (validationErrors[questionId]) {
      setValidationErrors(prev => ({
        ...prev,
        [questionId]: null
      }));
    }
  };

  const handleMultipleChoiceChange = (questionId, option, isSelected) => {
    setAnswers(prev => {
      const currentSelections = Array.isArray(prev[questionId]) ? [...prev[questionId]] : [];
      
      if (isSelected) {
        if (!currentSelections.includes(option)) {
          const newSelections = [...currentSelections, option];
          // Clear validation error when user makes selection
          if (validationErrors[questionId]) {
            setValidationErrors(prevErrors => ({
              ...prevErrors,
              [questionId]: null
            }));
          }
          return {
            ...prev,
            [questionId]: newSelections
          };
        }
      } else {
        return {
          ...prev,
          [questionId]: currentSelections.filter(item => item !== option)
        };
      }
      
      return prev;
    });
  };

  // Validation function
  const validateForm = () => {
    const errors = {};
    const questionKeys = Object.keys(questionnaire);
    
    questionKeys.forEach(key => {
      const question = questionnaire[key];
      const answer = answers[key];
      
      if (question.type === 'number_input') {
        if (!answer || answer.trim() === '') {
          errors[key] = 'This field is required';
        } else if (isNaN(Number(answer)) || Number(answer) <= 0) {
          errors[key] = 'Please enter a valid positive number';
        }
      } else if (question.type === 'choice') {
        if (!answer || answer === '') {
          errors[key] = 'Please select an option';
        }
      } else if (question.type === 'multiple_choice_text') {
        if (!Array.isArray(answer) || answer.length === 0) {
          errors[key] = 'Please select at least one option';
        }
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    // Validate form first
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fill in all required fields correctly.');
      return;
    }

    try {
      setSubmitting(true);
      
      // Format data
      const formattedData = {...answers};
      if (Array.isArray(formattedData.top_categories)) {
        formattedData.top_categories = formattedData.top_categories.join(', ');
      }
      
      // Submit the plan
      const result = await submitBudgetPlan(formattedData);
      console.log('Budget plan created:', result);
      
      // Sync with chatbot
      if (result && result.budget_plan) {
        try {
          await syncBudgetWithChatbot({
            budget_plan: result.budget_plan,
            questionnaire_answers: formattedData
          });
          console.log('Budget synced with chatbot successfully');
        } catch (syncError) {
          console.error('Failed to sync budget with chatbot:', syncError);
        }
      }
      
      // Store the budget
      if (result) {
        const budgetToStore = {
          total: Number(formattedData.monthly_budget),
          categories: result.budget_plan || {}
        };
        
        console.log('Storing budget with correct total:', budgetToStore);
        localStorage.setItem('budget_plan', JSON.stringify(budgetToStore));
      }
      
      setSuccess(true);
      setSubmitting(false);
      
      setTimeout(() => {
        navigation.replace('HomeScreen');
      }, 1500);
      
    } catch (err) {
      console.error('Failed to submit questionnaire:', err);
      setSubmitting(false);
      setError('Failed to submit budget plan. Please try again.');
    }
  };

  // Handle back navigation with confirmation
  const handleBackToHome = () => {
    const hasAnswers = Object.values(answers).some(answer => 
      Array.isArray(answer) ? answer.length > 0 : answer !== ''
    );
    
    if (hasAnswers) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to go back to home?',
        [
          { text: 'Stay Here', style: 'cancel' },
          { 
            text: 'Go to Home', 
            style: 'destructive',
            onPress: () => navigation.replace('HomeScreen')
          }
        ]
      );
    } else {
      navigation.replace('HomeScreen');
    }
  };
  
  // Show success screen if successful
  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successTitle}>🎉 Budget Plan Created!</Text>
        <Text style={styles.successMessage}>Your personalized budget plan has been created successfully.</Text>
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => navigation.replace('HomeScreen')}
        >
          <Text style={styles.homeButtonText}>Go to Home Screen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading budget questionnaire...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.replace('HomeScreen')}
          style={styles.button}
        >
          Go to Home
        </Button>
      </View>
    );
  }

  const questionKeys = Object.keys(questionnaire);

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            console.log('Back button pressed - navigating to HomeScreen');
            navigation.replace('HomeScreen');
          }}
        >
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Budget Questionnaire</Text>
        
        {/* Empty view for spacing */}
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Budget Planning Questionnaire</Text>
          <Text style={styles.subtitle}>Let's create your personalized budget plan</Text>
          <Text style={styles.requiredNote}>* All fields are required</Text>
        </View>

        {questionKeys.length === 0 ? (
          <Text style={styles.noQuestionsText}>No questions available. Please try again later.</Text>
        ) : (
          questionKeys.map((key, index) => {
            const question = questionnaire[key];
            const hasError = validationErrors[key];
            
            return (
              <View key={key} style={[styles.questionContainer, hasError && styles.questionContainerError]}>
                <Text style={styles.questionNumber}>Question {index + 1}</Text>
                <Text style={styles.questionText}>
                  {question.question} <Text style={styles.required}>*</Text>
                </Text>
                
                {question.type === 'number_input' && (
                  <View>
                    <TextInput
                      style={[styles.input, hasError && styles.inputError]}
                      keyboardType="numeric"
                      value={answers[key]}
                      onChangeText={(value) => handleInputChange(key, value)}
                      placeholder="Enter amount in rupees"
                      mode="outlined"
                      error={hasError}
                    />
                    {hasError && <Text style={styles.errorMessage}>{hasError}</Text>}
                  </View>
                )}
                
                {question.type === 'choice' && question.options && (
                  <View>
                    <RadioButton.Group
                      onValueChange={(value) => handleInputChange(key, value)}
                      value={answers[key]}
                    >
                      {question.options.map((option) => (
                        <TouchableOpacity 
                          key={option} 
                          style={styles.radioOption}
                          onPress={() => handleInputChange(key, option)}
                        >
                          <RadioButton value={option} />
                          <Text style={styles.radioText}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </RadioButton.Group>
                    {hasError && <Text style={styles.errorMessage}>{hasError}</Text>}
                  </View>
                )}
                
                {question.type === 'multiple_choice_text' && question.options && (
                  <View>
                    {question.options.map((option) => {
                      const isSelected = Array.isArray(answers[key]) && answers[key].includes(option);
                      return (
                        <CustomCheckbox
                          key={option}
                          label={option}
                          checked={isSelected}
                          onPress={() => handleMultipleChoiceChange(key, option, !isSelected)}
                        />
                      );
                    })}
                    {hasError && <Text style={styles.errorMessage}>{hasError}</Text>}
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            loading={submitting}
            disabled={submitting || questionKeys.length === 0}
            contentStyle={styles.submitButtonContent}
          >
            {submitting ? 'Creating Budget Plan...' : 'Create Budget Plan'}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F0F8FF',
  },
  backButtonText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 60, // Same width as back button for centering
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  titleContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2196F3',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 8,
    color: '#666',
    textAlign: 'center',
  },
  requiredNote: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  questionContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  questionContainerError: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  questionNumber: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
    lineHeight: 24,
  },
  required: {
    color: '#FF6B6B',
    fontSize: 16,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    paddingVertical: 4,
  },
  radioText: {
    fontSize: 15,
    marginLeft: 8,
    flex: 1,
    color: '#333',
  },
  errorMessage: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  buttonContainer: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  submitButton: {
    paddingVertical: 4,
    borderRadius: 25,
    elevation: 3,
  },
  submitButtonContent: {
    paddingVertical: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 16,
  },
  noQuestionsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },
  button: {
    marginTop: 20,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f0f9ff',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
    lineHeight: 26,
  },
  homeButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  homeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default QuestionnairePage;