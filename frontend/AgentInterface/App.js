import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import MyTabs from "./Tab"; // Your tab layout

export default function App() {
  return (
    <NavigationContainer>
      <MyTabs />
    </NavigationContainer>
  );
}
