import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Image,
  Pressable,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { verifyJWT } from "../utils/verifyJWT"; // adjust path if needed

export default function QRScreen() {
  // ✅ ALWAYS call hooks at the top level
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();

  // Permission not yet loaded
  if (!permission) return null;

  // If permission not granted
  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Image
          source={require("../assets/Amazon-Logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.permissionText}>
          We need your camera permission to scan QR codes.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </Pressable>
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
        if (obj?.signedCoin) {
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

      const raw = await AsyncStorage.getItem("pendingOrders");
      const pending = raw ? JSON.parse(raw) : [];
      let valid = false,
        payload;

      for (const order of pending) {
        try {
          const verifiedPayload = verifyJWT(token, order.signature);
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
          console.error("JWT Verification failed:", e.message);
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

      Alert.alert("Verified", "Verification Successful", [
        { text: "OK", onPress: () => setScanned(false) },
      ]);
    } catch (err) {
      Alert.alert("Error", err.message || "Verification failed", [
        { text: "Scan Again", onPress: () => setScanned(false) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {isFocused && (
        <CameraView
          style={styles.camera}
          ref={cameraRef}
          onBarcodeScanned={handleBarCodeScanned}
          barCodeScannerSettings={{ barCodeTypes: ["qr"] }}
        />
      )}
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#FF9900" />
          <Text style={styles.loadingText}>Verifying QR Code...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#FF9900",
    fontSize: 18,
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#F6F6F6",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logo: {
    width: 140,
    height: 40,
    marginBottom: 20,
  },
  permissionText: {
    fontSize: 16,
    color: "#232F3E",
    textAlign: "center",
    marginBottom: 16,
  },
  permissionButton: {
    backgroundColor: "#FF9900",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
