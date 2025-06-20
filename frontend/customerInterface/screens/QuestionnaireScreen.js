// src/screens/QuestionnaireScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { Button, Card, FAB } from "react-native-paper";
import budgetService from "../services/budgetService";

// Web-compatible icons (using Unicode emojis and simple symbols)
const Icons = {
  "weather-sunny": "☀️",
  "weather-night": "🌙",
  loading: "⟳",
  "wallet-plus": "💰",
  "plus-circle": "➕",
  chat: "💬",
  tag: "🏷️",
  pencil: "✏️",
  lightbulb: "💡",
  "chevron-right": "›",
  bug: "🐛",
  refresh: "🔄",
  close: "✕",
  plus: "+",
  food: "🍎",
  book: "📖",
  star: "⭐",
  target: "🎯",
  "chart-line": "📈",
};

const Icon = ({ name, size = 24, color = "#000", style }) => (
  <Text style={[{ fontSize: size, color }, style]}>{Icons[name] || "•"}</Text>
);

const { width, height } = Dimensions.get("window");

// Add the missing API base URL
const FLASK_API = "http://192.168.29.40:5000";

const QuestionnaireScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleQuestionnaireSubmit = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      console.log("📋 Submitting questionnaire data:", formData);

      // Use fetch with timeout instead of relying on server
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `${FLASK_API}/api/budget/create-from-questionnaire`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Failed to create budget: ${response.status} - ${errorData}`
        );
      }

      const result = await response.json();
      console.log("✅ Budget created successfully:", result);

      // Clear any cached budget data to force fresh load
      if (typeof budgetService?.clearCache === "function") {
        budgetService.clearCache();
      }

      // Trigger budget update notification
      if (typeof budgetService?.triggerBudgetUpdate === "function") {
        budgetService.triggerBudgetUpdate("questionnaire_completion");
      }

      setLoading(false);

      // Navigate to HomeScreen with parameters to trigger refresh
      navigation.navigate("HomeScreen", {
        fromQuestionnaire: true,
        budgetCreated: true,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("❌ Error creating budget:", error);

      // Create offline budget if server fails
      console.log("🔄 Creating offline budget due to network error...");

      try {
        // Create a basic offline budget
        const offlineBudget = {
          budget_plan: {
            "General Shopping": Math.round(
              Number(formData.budget || 10000) * 0.8
            ),
            Savings: Math.round(Number(formData.budget || 10000) * 0.2),
            total_budget: Number(formData.budget || 10000),
            recommendations: [
              "Budget created offline due to connection issues.",
              "Sync with server when connection is restored.",
            ],
          },
        };

        localStorage.setItem("budget_plan", JSON.stringify(offlineBudget));

        // Clear budget service cache
        if (typeof budgetService?.clearCache === "function") {
          budgetService.clearCache();
        }

        // Navigate to home with offline flag
        navigation.navigate("HomeScreen", {
          fromQuestionnaire: true,
          budgetCreated: true,
          offline: true,
          timestamp: Date.now(),
        });
      } catch (offlineError) {
        console.error("Failed to create offline budget:", offlineError);
        setError(
          "Failed to create budget. Please check your connection and try again."
        );
      }

      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Budget Questionnaire</Text>
        <Text style={styles.subtitle}>
          Help us understand your budgeting needs
        </Text>
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
      {error && <Text style={styles.errorMessage}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  formContainer: {
    flex: 1,
    marginBottom: 20,
  },
  actions: {
    alignItems: "center",
    marginTop: 16,
  },
  submitButton: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorMessage: {
    color: "#dc3545",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
});

export default QuestionnaireScreen;
