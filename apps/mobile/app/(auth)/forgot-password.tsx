import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { COLORS } from "@/constants/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const openWebsite = () => {
    Linking.openURL("https://barangaybayabas.com"); // change to your real website
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Forgot Password</Text>

      <View style={styles.card}>
        <Text style={styles.messageTitle}>Need to reset your password?</Text>

        <Text style={styles.message}>
          Password recovery is currently handled through the official
          Barangay Bayabas website for security purposes.
        </Text>

        <Text style={styles.message}>
          Please visit the website and select{" "}
          <Text style={styles.bold}>Forgot Password</Text> on the login page.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={openWebsite}
        activeOpacity={0.9}
      >
        <Text style={styles.buttonText}>Open Barangay Website</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.back}>
          Back to Login
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: COLORS.CARD,
  },

  title: {
    fontSize: 22,
    marginBottom: 30,
    textAlign: "center",
    color: COLORS.TEXT,
    fontFamily: "Manrope_700Bold",
  },

  card: {
    backgroundColor: "#F6F8FA",
    padding: 20,
    borderRadius: 12,
    marginBottom: 25,
  },

  messageTitle: {
    fontSize: 16,
    marginBottom: 10,
    color: COLORS.TEXT,
    fontFamily: "Manrope_700Bold",
  },

  message: {
    fontSize: 14,
    color: COLORS.MUTED,
    marginBottom: 8,
    fontFamily: "Manrope_400Regular",
  },

  bold: {
    fontFamily: "Manrope_700Bold",
    color: COLORS.TEXT,
  },

  button: {
    height: 50,
    backgroundColor: COLORS.GREEN,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },

  buttonText: {
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
  },

  back: {
    marginTop: 20,
    textAlign: "center",
    color: COLORS.GREEN,
    fontFamily: "Manrope_600SemiBold",
  },

});