import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";

// Your screen imports
import LoginScreen from "../screens/Login";
import SignUpScreen from "../screens/SignUp";
import ProfileScreen from "../screens/Profile";
import OrderScreen from "../screens/Order";

const Tab = createBottomTabNavigator();

const AuthTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarShowLabel: true,
      tabBarStyle: {
        backgroundColor: "#fff",
        height: 60,
      },
    }}
  >
    <Tab.Screen
      name="Login"
      component={LoginScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Icon name="login" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Sign Up"
      component={SignUpScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Icon name="person-add" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

const AppTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarShowLabel: true,
      tabBarStyle: {
        backgroundColor: "#fff",
        height: 60,
      },
    }}
  >
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Icon name="person" size={size} color={color} />
        ),
      }}
    />
    <Tab.Screen
      name="Orders"
      component={OrderScreen}
      options={{
        tabBarIcon: ({ color, size }) => (
          <Icon name="list-alt" size={size} color={color} />
        ),
      }}
    />
  </Tab.Navigator>
);

const Tabs = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem("token");
    setIsAuthenticated(!!token);
  };

  useEffect(() => {
    checkAuth();
    const interval = setInterval(checkAuth, 1000); // Optional: keep checking token
    return () => clearInterval(interval);
  }, []);

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#FF9900" />
      </View>
    );
  }

  return isAuthenticated ? <AppTabs /> : <AuthTabs />;
};

export default Tabs;
