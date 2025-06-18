import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, ActivityIndicator } from "react-native";

import LoginScreen from "../screens/Login";
import SignUpScreen from "../screens/SignUp";
import ProfileScreen from "../screens/Profile";
import OrderScreen from "../screens/Order";
import HomeScreen from "../screens/Home";
const Tab = createBottomTabNavigator();

const AuthTabs = () => (
  <Tab.Navigator>
    <Tab.Screen name="Login" component={LoginScreen} />
    <Tab.Screen name="Sign Up" component={SignUpScreen} />
  </Tab.Navigator>
);

const AppTabs = () => (
  <Tab.Navigator>
    <Tab.Screen name="Profile" component={ProfileScreen} />
    <Tab.Screen name="Orders" component={OrderScreen} />
    <Tab.Screen name="Home" component={HomeScreen} />
  </Tab.Navigator>
);

const Tabs = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // ✅ Corrected line

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem("token");
    setIsAuthenticated(!!token);
  };

  useEffect(() => {
    checkAuth();
    const interval = setInterval(checkAuth, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return isAuthenticated ? <AppTabs /> : <AuthTabs />;
};

export default Tabs;
