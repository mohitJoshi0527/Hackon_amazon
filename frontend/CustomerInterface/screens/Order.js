import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  Image,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { EXPRESS_API } from "@env";

const OrderScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const ORDERS_KEY = "cached_orders";

  const loadOrdersFromStorage = async () => {
    try {
      const cached = await AsyncStorage.getItem(ORDERS_KEY);
      if (cached) {
        setOrders(JSON.parse(cached));
        console.log("Loaded orders from local storage");
      }
    } catch (error) {
      console.error("Failed to load cached orders:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        Alert.alert("Offline", "No internet connection. Showing cached data.");
        await loadOrdersFromStorage();
        setLoading(false);
        return;
      }

      const token = await AsyncStorage.getItem("token");
      const userString = await AsyncStorage.getItem("user");
      const user = userString ? JSON.parse(userString) : null;
      const userId = user?.id;

      if (!token || !userId) {
        Alert.alert("Error", "Authentication or user data is missing");
        return;
      }

      const response = await fetch(`${EXPRESS_API}/order?userId=${userId}`, {
        method: "GET",
        headers: {
          Accept: "*/*",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error(`Server responded with ${response.status}`);

      const data = await response.json();
      setOrders(data);
      await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(data));
      console.log("Fetched and cached orders from API");
    } catch (error) {
      console.error("Error fetching orders:", error);
      Alert.alert("Error", "Failed to load orders");
      await loadOrdersFromStorage();
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
      <Text style={styles.cardTitle}>Order ID</Text>
      <Text selectable style={styles.cardValue}>{item.orderId}</Text>

      <Text style={styles.label}>Value: <Text style={styles.value}>₹{item.value}</Text></Text>
      <Text style={styles.label}>Payment Mode: <Text style={styles.value}>{item.paymentMode}</Text></Text>
      <Text style={styles.label}>Delivery Status: <Text style={styles.value}>{item.deliveryStatus}</Text></Text>
      <Text style={styles.label}>Delivery Date: <Text style={styles.value}>{formatDate(item.deliveryDate)}</Text></Text>
      <Text style={styles.label}>Agent ID: <Text style={styles.value}>{item.assignedAgentId ?? "Not assigned"}</Text></Text>

      {item.coin && (
        <Pressable style={styles.qrButton} onPress={() => setSelectedCoin(item.coin)}>
          <Text style={styles.qrButtonText}>Show Coin QR</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Image
          source={require("../assets/Amazon-Logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Your Orders</Text>
      </View>

      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#FF9900" />
        ) : (
          <FlatList
            data={orders}
            keyExtractor={(item) => item.orderId}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>

      <Modal visible={!!selectedCoin} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.qrLabel}>🪙 Coin QR Code</Text>
            <QRCode value={selectedCoin || ""} size={250} />
            <Pressable style={styles.closeBtn} onPress={() => setSelectedCoin(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F8FA",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFF",
    elevation: 2,
  },
  logo: {
    width: 100,
    height: 30,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#232F3E",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#232F3E",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 14,
    color: "#000",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  value: {
    fontWeight: "500",
    color: "#111",
  },
  qrButton: {
    marginTop: 12,
    backgroundColor: "#FF9900",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  qrButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },
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
    fontSize: 20,
    marginBottom: 20,
    fontWeight: "700",
    color: "#444",
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: "#232F3E",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  closeBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default OrderScreen;
