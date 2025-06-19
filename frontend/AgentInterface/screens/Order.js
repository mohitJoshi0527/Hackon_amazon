import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "http://192.168.185.59:8000/api/a/order";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadOrders = async () => {
      const stored = await AsyncStorage.getItem("pendingOrders");
      if (stored) {
        setOrders(JSON.parse(stored));
      }
    };
    loadOrders();
  }, []);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const data = await response.json();
      await AsyncStorage.setItem("pendingOrders", JSON.stringify(data));
      setOrders(data);
      Alert.alert("Success", "Pending orders fetched and saved.");
    } catch (err) {
      console.error("Fetch failed:", err);
      Alert.alert("Error", "Unable to fetch pending orders.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toDateString() + " " + date.toLocaleTimeString();
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>Order ID: {item.orderId}</Text>
      <Text>Value: ₹{item.value}</Text>
      <Text>Status: {item.deliveryStatus}</Text>
      <Text>Payment Mode: {item.paymentMode}</Text>
      <Text>Delivery Date: {formatDate(item.deliveryDate)}</Text>
      <Text>User ID: {item.userId}</Text>
      <Text>Agent ID: {item.assignedAgentId ?? "Not assigned"}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Pending Orders</Text>
      <Button title="Fetch Pending Orders" onPress={fetchPendingOrders} />
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
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
});

export default Orders;
