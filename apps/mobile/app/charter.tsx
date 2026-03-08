import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Asset } from "expo-asset";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "@/constants/theme";

export default function CharterScreen() {
  const router = useRouter();

  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const WebView = Platform.OS === "web" ? null : require("react-native-webview").WebView;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const asset = await Asset.loadAsync(
          require("@/assets/documents/barangay-bayabas-citizens-charter.pdf")
        );

        const uri = asset?.[0]?.localUri || asset?.[0]?.uri;
        if (!uri) throw new Error("PDF uri not found");

        if (mounted) setPdfUri(uri);
      } catch (e) {
        console.error(e);
        Alert.alert("PDF Missing", "Make sure the PDF exists inside assets/documents.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(protected)/(tabs)/home");
  };

  const handleDownload = async () => {
    if (!pdfUri) return;

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert("Not supported", "Sharing is not available on this device.");
      return;
    }

    await Sharing.shareAsync(pdfUri, {
      mimeType: "application/pdf",
      dialogTitle: "Download Citizen Charter",
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>

      <StatusBar barStyle="light-content" backgroundColor={COLORS.GREEN} translucent={false} />

      {/* Header (now safely below status bar) */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Citizen’s Charter
        </Text>

        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload} activeOpacity={0.75}>
          <Ionicons name="download-outline" size={18} color="#fff" />
          <Text style={styles.downloadText}>PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading document…</Text>
          </View>
        ) : !pdfUri ? (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>PDF not found.</Text>
          </View>
        ) : Platform.OS === "web" ? (
          <iframe
            title="Citizen Charter PDF"
            src={pdfUri}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              background: "#fff",
            }}
          />
        ) : (
          <WebView
            originWhitelist={["*"]}
            source={{ uri: pdfUri }}
            startInLoadingState
            allowFileAccess
            javaScriptEnabled
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.CARD },

  header: {
    height: 56,
    backgroundColor: COLORS.GREEN,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  backBtn: { flexDirection: "row", alignItems: "center", width: 80 },
  backText: { color: "#fff", fontFamily: "Manrope_700Bold" },

  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 16,
    fontFamily: "Manrope_700Bold",
  },

  downloadBtn: { flexDirection: "row", alignItems: "center", width: 80, justifyContent: "flex-end" },
  downloadText: { color: "#fff", marginLeft: 6, fontFamily: "Manrope_700Bold" },

  content: { flex: 1, backgroundColor: COLORS.CARD },

  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, color: COLORS.TEXT, fontFamily: "Manrope_700Bold" },
});