// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import HomeScreen from '../screens/HomeScreen';
import BudgetScreen from '../screens/BudgetScreen';
import ChatbotScreen from '../screens/ChatbotScreen';
import RecommendationsScreen from '../screens/RecommendationsScreen';
import QuestionnairePage from '../screens/QuestionnairePage';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Budget" 
        component={BudgetScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="wallet" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen 
        name="Chatbot" 
        component={ChatbotScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="chat" color={color} size={size} />
          ),
          title: 'Budget Assistant'
        }}
      />
      <Tab.Screen 
        name="Recommendations" 
        component={RecommendationsScreen} 
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="tag" color={color} size={size} />
          ),
          title: 'Deals'
        }}
      />
    </Tab.Navigator>
  );
};

function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="HomeScreen"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen 
          name="HomeScreen" 
          component={HomeScreen} 
          options={{ title: 'Home' }}
        />
        <Stack.Screen 
          name="Questionnaire" 
          component={QuestionnairePage}
          options={{ title: 'Budget Questionnaire' }} 
        />
        <Stack.Screen 
          name="ChatbotScreen" 
          component={require('../screens/ChatbotScreen').default} 
          options={{ title: 'Budget Assistant' }}
        />
        <Stack.Screen 
          name="RecommendationsScreen" 
          component={RecommendationsScreen} 
          options={{ title: 'Budget Deals' }}
        />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;