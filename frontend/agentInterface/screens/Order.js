import React, { useEffect, useState } from "react";
import { StatusBar, Platform } from "react-native";

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  Image,
  SafeAreaView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { EXPRESS_API } from "@env";

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
      const response = await fetch(`${EXPRESS_API}/order`);
      if (!response.ok) throw new Error(`Error ${response.status}`);

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
      <Text style={styles.cardTitle}>
        Order ID:{" "}
        <Text style={styles.bold}>{String(item.orderId).split("-")[0]}</Text>
      </Text>
      <View style={styles.divider} />
      <Text style={styles.itemText}>
        Value: <Text style={styles.value}>₹{item.value}</Text>
      </Text>
      <Text style={styles.itemText}>
        Status: <Text style={styles.value}>{item.deliveryStatus}</Text>
      </Text>
      <Text style={styles.itemText}>
        Payment: <Text style={styles.value}>{item.paymentMode}</Text>
      </Text>
      <Text style={styles.itemText}>
        Delivery:{" "}
        <Text style={styles.value}>{formatDate(item.deliveryDate)}</Text>
      </Text>
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
        <Text style={styles.headerTitle}>Pending Orders</Text>
      </View>

      <View style={styles.container}>
        <Pressable
          style={({ pressed }) => [
            styles.fetchButton,
            pressed && { opacity: 0.8 },
          ]}
          onPress={fetchPendingOrders}
        >
          <Text style={styles.fetchButtonText}>Fetch Pending Orders</Text>
        </Pressable>

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F2F3F5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    elevation: 3,
    borderBottomColor: "#ddd",
    borderBottomWidth: 1,
    marginTop: Platform.OS === "android" ? StatusBar.currentHeight : 0, // ← added line
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
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  fetchButton: {
    backgroundColor: "#FF9900",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    elevation: 2,
  },
  fetchButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#232F3E",
    marginBottom: 6,
  },
  itemText: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  value: {
    fontWeight: "500",
    color: "#111",
  },
  divider: {
    height: 1,
    backgroundColor: "#EAEAEA",
    marginVertical: 10,
  },
  bold: {
    fontWeight: "700",
    color: "#000",
  },
});

export default Orders;
