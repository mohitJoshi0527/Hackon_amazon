import React, { useEffect, useState } from "react";
import { StatusBar, Platform } from "react-native";
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
import { EXPRESS_API } from "@env";

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
      const response = await fetch(`${EXPRESS_API}/order`, {
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
      <View style={styles.header}>
        <Image
          source={require("../assets/Amazon-Logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>Transaction Log</Text>
      </View>

      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isOnline ? "#4CAF50" : "#F44336" },
          ]}
        >
          <Text style={styles.statusText}>
            {isOnline ? "Online" : "Offline"}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        {logData.length === 0 ? (
          <Text style={styles.emptyText}>No transaction log found.</Text>
        ) : (
          <>
            <View style={styles.logCounter}>
              <Text style={styles.logCountLabel}>Logs to Send:</Text>
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
                <Text style={styles.buttonText}>
                  Send Logs to Amazon Server
                </Text>
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
    backgroundColor: "#F2F3F5",
    gap: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#232F3E",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 100,
    height: 30,
    marginRight: 10,
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
