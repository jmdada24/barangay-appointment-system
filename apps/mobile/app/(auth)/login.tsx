import React, { useMemo, useState } from "react";
import {
  View,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { COLORS } from "@/constants/theme";
import { supabase } from "@/lib/supabase/client";
import ForceChangePasswordModal from "@/components/auth/ForceChangePasswordModal";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [authLocked, setAuthLocked] = useState(false);

  // force password state
  const [showForceModal, setShowForceModal] = useState(false);
  const [forceResidentId, setForceResidentId] = useState<number | null>(null);



  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !loading && !authLocked;
  }, [email, password, loading, authLocked]);

  async function onLogin(emailArg: string, passwordArg: string) {
    if (loading || authLocked) return;

    const e = emailArg.trim();
    const p = passwordArg;

    if (!e || !p) return;

    setAuthLocked(true);
    setLoading(true);

    try {
      // 1) Sign in to Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: e,
        password: p,
      });

      if (error || !data?.user?.id) {
        Alert.alert("Login Failed", error?.message ?? "Invalid credentials.");
        setAuthLocked(false);
        return;
      }

      // 2) Load app user record (public.users)
      const { data: userData, error: userErr } = await supabase
        .from("users")
        .select("id, role")
        .eq("auth_id", data.user.id)
        .single();

      if (userErr || !userData?.id) {
        await supabase.auth.signOut();
        Alert.alert("Error", "Your account setup is incomplete. Please contact support.");
        setAuthLocked(false);
        return;
      }

      if ((userData.role || "resident") !== "resident") {
        await supabase.auth.signOut();
        Alert.alert("Error", "Invalid login credentials");
        setAuthLocked(false);
        return;
      }

      // 3) Resident checks (verification + must_change_password)
      const { data: residentData, error: residentErr } = await supabase
        .from("residents")
        .select("id, verification_status, must_change_password")
        .eq("user_id", userData.id)
        .single();

      if (residentErr || !residentData?.id) {
        await supabase.auth.signOut();
        Alert.alert("Error", "Resident profile not found. Please contact the barangay office.");
        setAuthLocked(false);
        return;
      }

      if (residentData.verification_status === "pending") {
        await supabase.auth.signOut();
        Alert.alert("Pending", "Your account is pending admin verification. Please wait for approval.");
        setAuthLocked(false);
        return;
      }

      if (residentData.verification_status === "rejected") {
        await supabase.auth.signOut();
        Alert.alert("Rejected", "Your account has been rejected. Please contact the barangay office.");
        setAuthLocked(false);
        return;
      }

      // 4) Force password change — allow skip (matches web behavior)
      if (residentData.must_change_password === true) {
        setForceResidentId(residentData.id);
        setLoading(false);

        setTimeout(() => {
          setShowForceModal(true);
        }, 0);

        return;
      }

      // 5) Normal success -> allow navigation
      setAuthLocked(false);
      router.replace("/(protected)/(tabs)/home");
    } catch (e: any) {
      Alert.alert("Login Failed", e?.message ?? "Login failed");
      setAuthLocked(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} keyboardShouldPersistTaps="handled">
          <View style={styles.topSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/logo/barangay-bayabasLogo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.appTitle}>Barangay Appointment System</Text>
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.dragHandleCenter}>
              <View style={styles.dragHandle} />
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputWrapper, (loading || authLocked) && styles.inputWrapperDisabled]}>
                <Feather name="mail" size={20} color={stylesTokens.placeholderText} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="johndoe@example.com"
                  placeholderTextColor={stylesTokens.placeholderText}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!(loading || authLocked)}
                  selectTextOnFocus={!(loading || authLocked)}
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>

              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrapper, (loading || authLocked) && styles.inputWrapperDisabled]}>
                <Feather name="lock" size={20} color={stylesTokens.placeholderText} style={styles.inputIcon} />

                <TextInput
                  style={styles.textInput}
                  placeholder="*********"
                  placeholderTextColor={stylesTokens.placeholderText}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!(loading || authLocked)}
                  selectTextOnFocus={!(loading || authLocked)}
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => onLogin(email, password)}
                />

                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading || authLocked}
                >
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={stylesTokens.placeholderText}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.forgotPasswordContainer}
                onPress={() => router.push("/(auth)/forgot-password")}
                activeOpacity={0.85}
                disabled={loading || authLocked}
              >
                <Text style={[styles.forgotPasswordText, (loading || authLocked) && styles.disabledLinkText]}>
                  Forgot Password?
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.signInButton, !canSubmit && styles.signInButtonDisabled]}
                onPress={() => onLogin(email, password)}
                activeOpacity={0.9}
                disabled={!canSubmit}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#FFFFFF" />
                    <Text style={styles.signInButtonText}>Signing in…</Text>
                  </View>
                ) : (
                  <Text style={styles.signInButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Bottom-sheet force password change — allowSkip=true to match web */}
            <ForceChangePasswordModal
              visible={showForceModal}
              residentId={forceResidentId}
              allowSkip={true}
              onSkip={() => {
                // Skip: close modal and let user into dashboard (flag stays true)
                setShowForceModal(false);
                setAuthLocked(false);
                router.replace("/(protected)/(tabs)/home");
              }}
              onSuccess={() => {
                // Success: password changed, flag set to false
                setShowForceModal(false);
                setAuthLocked(false);
                router.replace("/(protected)/(tabs)/home");
              }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const stylesTokens = {
  inputBg: "#F2F3F7",
  placeholderText: "#C1C1C1",
  handle: "#E0E0E0",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.GREEN },

  topSection: {
    flex: 2.5,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 30,
  },
  logoContainer: { marginBottom: 20 },
  logo: { width: 140, height: 144 },

  appTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Manrope_600SemiBold",
  },

  bottomSection: {
    flex: 4,
    backgroundColor: COLORS.CARD,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    paddingHorizontal: 25,
    paddingTop: 15,
  },

  dragHandleCenter: { alignItems: "center", marginBottom: 20 },
  dragHandle: { width: 40, height: 4, backgroundColor: stylesTokens.handle, borderRadius: 10 },

  formContainer: { flex: 1 },

  label: {
    color: COLORS.TEXT,
    fontSize: 16,
    marginBottom: 8,
    marginTop: 10,
    fontFamily: "Manrope_600SemiBold",
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: stylesTokens.inputBg,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
  },
  inputWrapperDisabled: {
    opacity: 0.7,
  },

  inputIcon: { marginRight: 10 },

  textInput: {
    flex: 1,
    color: COLORS.TEXT,
    fontSize: 16,
    height: "100%",
    fontFamily: "Manrope_400Regular",
  },

  forgotPasswordContainer: { alignItems: "flex-end", marginTop: 15, marginBottom: 30 },
  forgotPasswordText: { color: COLORS.GREEN, fontFamily: "Manrope_600SemiBold" },
  disabledLinkText: { opacity: 0.6 },

  signInButton: {
    backgroundColor: COLORS.GREEN,
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  signInButtonText: { color: "#FFFFFF", fontSize: 18, fontFamily: "Manrope_700Bold" },
});