import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Orders from "./screens/Order";
import LogScreen from "./screens/Log";
import QRScreen from "./screens/Qr";
const Tab = createBottomTabNavigator();

export default function MyTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Orders" component={Orders} />
      <Tab.Screen name="QR" component={QRScreen} />
      <Tab.Screen name="History" component={LogScreen} />
    </Tab.Navigator>
  );
}
