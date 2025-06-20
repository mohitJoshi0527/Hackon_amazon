import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Orders from "./screens/Order";
import LogScreen from "./screens/Log";
import QRScreen from "./screens/Qr";
import { Image } from "react-native";

const Tab = createBottomTabNavigator();

export default function MyTabs() {
  return (
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
        name="Orders"
        component={Orders}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("./assets/parcel.png")}
              style={{
                width: 24,
                height: 24,
                tintColor: focused ? "#007AFF" : "#888",
              }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="QR"
        component={QRScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("./assets/qr-code.png")}
              style={{
                width: 24,
                height: 24,
                tintColor: focused ? "#007AFF" : "#888",
              }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={LogScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Image
              source={require("./assets/transaction.png")}
              style={{
                width: 24,
                height: 24,
                tintColor: focused ? "#007AFF" : "#888",
              }}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
