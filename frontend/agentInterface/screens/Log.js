import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const API_URL = "http://localhost:8000/api/a/order";

export default function LogScreen() {
  const [logData, setLogData] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const storedLog = await AsyncStorage.getItem("log");
        if (storedLog) {
          setLogData(JSON.parse(storedLog));
        }
      } catch (err) {
        console.error("Failed to load log data", err);
      }
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected);
    });

    load();
    return () => unsubscribe();
  }, []);

  const sendLog = async () => {
    if (!isOnline) {
      Alert.alert("No Internet", "You are currently offline.");
      return;
    }
    if (logData.length === 0) {
      Alert.alert("No Logs", "Nothing to send.");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: logData }),
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      await AsyncStorage.removeItem("log");
      setLogData([]);
      Alert.alert("Success", "Transaction log sent and cleared.");
    } catch (err) {
      console.error("Send failed:", err);
      Alert.alert("Error", "Failed to send transaction log.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.headerContainer}>
        <Image
          source={require("../assets/Amazon-Logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.header}>Transaction Log</Text>
      </View>

      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isOnline ? "#4CAF50" : "#F44336" },
          ]}
        >
          <Text style={styles.statusText}>{isOnline ? "Online" : "Offline"}</Text>
        </View>
      </View>

      <View style={styles.card}>
        {logData.length === 0 ? (
          <Text style={styles.emptyText}>No transaction log found.</Text>
        ) : (
          <>
            <View style={styles.logCounter}>
              <Text style={styles.logCountLabel}>📝 Logs to Send:</Text>
              <View style={styles.logBadge}>
                <Text style={styles.logBadgeText}>{logData.length}</Text>
              </View>
            </View>

            <Pressable
              style={[
                styles.button,
                (!isOnline || loading) && styles.buttonDisabled,
              ]}
              onPress={sendLog}
              disabled={!isOnline || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Send Logs to Amazon Server</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 120,
    height: 35,
    marginBottom: 8,
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#232F3E",
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: "#fff",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
    fontSize: 16,
    textAlign: "center",
    marginVertical: 30,
  },
  logCounter: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  logCountLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#444",
  },
  logBadge: {
    backgroundColor: "#FF9900",
    marginLeft: 10,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  logBadgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#FF9900",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: "100%",
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#FFCC80",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
