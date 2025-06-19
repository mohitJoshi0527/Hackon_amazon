import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useRef, useState } from "react";
import { Alert, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verifyJWT } from "../utils/verifyJWT"; // adjust if in different folder

export default function QRScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          Allow camera access to scan QR codes.
        </Text>
        <Text style={styles.link} onPress={requestPermission}>
          Grant Permission
        </Text>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);

    try {
      let token;
      try {
        const obj = JSON.parse(data);
        if (obj && typeof obj.signedCoin === "string") {
          token = obj.signedCoin;
        } else {
          throw new Error("Missing signedCoin");
        }
      } catch {
        if (typeof data === "string" && data.split(".").length === 3) {
          token = data;
        } else {
          throw new Error("QR does not contain a valid JWT");
        }
      }

      if (typeof token !== "string") throw new Error("Invalid QR");

      const raw = await AsyncStorage.getItem("pendingOrders");
      const pending = raw ? JSON.parse(raw) : [];
      console.log(pending);
      let valid = false,
        payload;

      for (const order of pending) {
        console.log("🧾 Trying order:", order.orderId);
        console.log("🔐 Using key (order.signature):", order.signature);
        try {
          const verifiedPayload = verifyJWT(token, order.signature);
          console.log("✅ Verified payload:", verifiedPayload);

          if (
            verifiedPayload.orderId === order.orderId &&
            verifiedPayload.userId === order.userId &&
            verifiedPayload.assignedAgentId === order.assignedAgentId &&
            verifiedPayload.coinId
          ) {
            payload = verifiedPayload;
            valid = true;
            break;
          }
        } catch (e) {
          console.error("❌ JWT Verification failed:", e.message);
        }
      }

      if (!valid) throw new Error("QR invalid/unverified");

      const newLog = {
        orderId: payload.orderId,
        userId: payload.userId,
        assignedAgentId: payload.assignedAgentId,
        coinId: payload.coinId,
      };
      const rawLog = await AsyncStorage.getItem("log");
      const logArr = rawLog ? JSON.parse(rawLog) : [];
      logArr.push(newLog);
      await AsyncStorage.setItem("log", JSON.stringify(logArr));

      Alert.alert(
        "✅ Verified",
        `Order: ${payload.orderId}\nCoin: ${payload.coinId}`,
        [{ text: "OK", onPress: () => setScanned(false) }]
      );
    } catch (err) {
      Alert.alert("❌ Error", err.message || "Verification failed", [
        { text: "Scan Again", onPress: () => setScanned(false) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        onBarcodeScanned={handleBarCodeScanned}
        barCodeScannerSettings={{ barCodeTypes: ["qr"] }}
      />
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Verifying...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: { color: "#fff", marginBottom: 10, textAlign: "center" },
  link: { color: "#0af", fontSize: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000aa",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#fff", marginTop: 10, fontSize: 16 },
});
