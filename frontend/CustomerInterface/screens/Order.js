import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
  Button,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { EXPRESS_API } from "@env";

const OrderScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoin, setSelectedCoin] = useState(null);

  const fetchOrders = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        Alert.alert("Authentication Error", "No token found");
        return;
      }

      const response = await fetch(`${EXPRESS_API}/order`, {
        method: "GET",
        headers: {
          Accept: "*/*",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
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

      {item.coin && (
        <Button
          title="Show Coin QR"
          onPress={() => setSelectedCoin(item.coin)}
          color="#007bff"
        />
      )}
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

      <Modal visible={!!selectedCoin} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.qrLabel}>Coin QR Code</Text>
            <QRCode value={selectedCoin || ""} size={250} />
            <Button title="Close" onPress={() => setSelectedCoin(null)} />
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 10,
    alignItems: "center",
    elevation: 5,
  },
  qrLabel: {
    fontSize: 18,
    marginBottom: 15,
    fontWeight: "bold",
  },
});

export default OrderScreen;
