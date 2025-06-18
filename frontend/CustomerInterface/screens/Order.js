import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { EXPRESS_API } from "@env";

const OrderScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Authentication Error", "No token found");
        return;
      }

      const headersList = {
        Accept: "*/*",
        "User-Agent": "React Native App",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const response = await fetch(`${EXPRESS_API}/order`, {
        method: "GET",
        headers: headersList,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error("Error fetching orders:", error);
      Alert.alert("Error", "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toDateString() + " " + date.toLocaleTimeString();
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>Order ID:</Text>
      <Text selectable>{item.orderId}</Text>

      <Text style={styles.label}>Value: ₹{item.value}</Text>
      <Text style={styles.label}>Payment Mode: {item.paymentMode}</Text>
      <Text style={styles.label}>Delivery Status: {item.deliveryStatus}</Text>
      <Text style={styles.label}>
        Delivery Date: {formatDate(item.deliveryDate)}
      </Text>
      <Text style={styles.label}>User ID: {item.userId}</Text>
      <Text style={styles.label}>
        Agent ID: {item.assignedAgentId ?? "Not assigned"}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Orders</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.orderId}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 10 },
  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
  },
  title: { fontWeight: "bold", fontSize: 16, marginBottom: 5 },
  label: { marginTop: 4, fontSize: 14 },
});

export default OrderScreen;
