import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const API_URL = "http://192.168.185.59:8000/api/a/order";

export default function LogScreen() {
  const [logData, setLogData] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load logs and check network status
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: logData }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

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
    <View style={styles.container}>
      <Text style={styles.header}>Transaction Log</Text>
      <Text style={styles.status}>{isOnline ? "✅ Online" : "❌ Offline"}</Text>

      {logData.length === 0 ? (
        <Text style={styles.empty}>No transaction log found.</Text>
      ) : (
        <>
          <Text style={styles.logCount}>Logs to send: {logData.length}</Text>
          <Button
            title="Send Log to Server"
            onPress={sendLog}
            disabled={loading || !isOnline}
          />
          {loading && (
            <ActivityIndicator size="large" style={{ marginTop: 20 }} />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  status: { textAlign: "center", marginBottom: 10 },
  empty: { textAlign: "center", marginTop: 20, color: "gray" },
  logCount: { textAlign: "center", marginBottom: 20, fontSize: 16 },
});
