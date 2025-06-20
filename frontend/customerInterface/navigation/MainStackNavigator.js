import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Screens
import HomeScreen from "../screens/HomeScreen";
import BudgetScreen from "../screens/BudgetScreen";
import ChatbotScreen from "../screens/ChatbotScreen";
import RecommendationsScreen from "../screens/RecommendationsScreen";
import QuestionnairePage from "../screens/QuestionnairePage";

const Stack = createNativeStackNavigator();

const MainStackNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="Budget" component={BudgetScreen} />
    <Stack.Screen name="ChatbotScreen" component={ChatbotScreen} />
    <Stack.Screen name="RecommendationsScreen" component={RecommendationsScreen} />
    <Stack.Screen name="Questionnaire" component={QuestionnairePage} />
  </Stack.Navigator>
);

export default MainStackNavigator;
