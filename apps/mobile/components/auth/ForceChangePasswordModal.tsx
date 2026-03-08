import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "@/constants/theme";
import { forceChangePasswordMobile } from "@/services/password.service";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  visible: boolean;
  residentId: number | null;
  allowSkip?: boolean;
  onSkip: () => void;
  onSuccess: () => void;
};

export default function ForceChangePasswordModal({
  visible,
  residentId,
  allowSkip = true,
  onSkip,
  onSuccess,
}: Props) {
  // form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset state every time the modal becomes visible
  useEffect(() => {
    if (visible) {
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setLoading(false);
      setSkipping(false);
      setError(null);
      setFieldErrors({});
      setShowSuccess(false);
    }
  }, [visible]);

  const validate = (): boolean => {
    const errs: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword.trim()) {
      errs.newPassword = "New password is required.";
    } else if (newPassword.length < 8) {
      errs.newPassword = "Password must be at least 8 characters.";
    } else if (!/[A-Z]/.test(newPassword)) {
      errs.newPassword = "Must contain at least one uppercase letter (A-Z).";
    } else if (!/[a-z]/.test(newPassword)) {
      errs.newPassword = "Must contain at least one lowercase letter (a-z).";
    } else if (!/[0-9]/.test(newPassword)) {
      errs.newPassword = "Must contain at least one number (0-9).";
    }

    if (!confirmPassword.trim()) {
      errs.confirmPassword = "Please confirm your password.";
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    setError(null);
    if (!validate()) return;

    setLoading(true);

    try {
      const result = await forceChangePasswordMobile(newPassword);

      if (!result.success) {
        setError(result.error || "Failed to change password.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setShowSuccess(true);

      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setSkipping(true);
    onSkip();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={() => {
        if (allowSkip && !loading) handleSkip();
      }}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.sheetContainer}>
            {/* Drag handle indicator (decorative) */}
            <View style={styles.handleRow}>
              <View style={styles.handleIndicator} />
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              {showSuccess ? (
                <View style={styles.successContainer}>
                  <View style={styles.successIconCircle}>
                    <Ionicons name="checkmark-circle-outline" size={56} color="#16a34a" />
                  </View>
                  <Text style={styles.successTitle}>Password Changed Successfully!</Text>
                  <Text style={styles.successDescription}>
                    Your password has been updated. You'll be redirected shortly.
                  </Text>
                  <View style={styles.redirectRow}>
                    <ActivityIndicator size="small" color={COLORS.MUTED} />
                    <Text style={styles.redirectText}>Redirecting...</Text>
                  </View>
                </View>
              ) : (
                <>
                  {/* Header */}
                  <View style={styles.headerContainer}>
                    <View style={styles.headerIconCircle}>
                      <Ionicons name="shield-checkmark-outline" size={32} color="#d97706" />
                    </View>
                    <Text style={styles.title}>Change Your Password</Text>
                    <Text style={styles.description}>
                      Your account was created with a temporary password. Please set a secure password that only you know.
                    </Text>
                  </View>

                  {/* Error banner */}
                  {error && (
                    <View style={styles.errorBanner}>
                      <Text style={styles.errorBannerText}>{error}</Text>
                    </View>
                  )}

                  {/* New Password */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                      New Password <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Enter new password"
                        placeholderTextColor="#C1C1C1"
                        secureTextEntry={!showNewPassword}
                        value={newPassword}
                        onChangeText={(t) => {
                          setNewPassword(t);
                          if (fieldErrors.newPassword)
                            setFieldErrors((p) => ({ ...p, newPassword: undefined }));
                        }}
                        editable={!loading && !skipping}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword((v) => !v)}
                        disabled={loading || skipping}
                        style={styles.eyeButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                          size={22}
                          color="#8F8F8F"
                        />
                      </TouchableOpacity>
                    </View>
                    {fieldErrors.newPassword && (
                      <Text style={styles.fieldError}>{fieldErrors.newPassword}</Text>
                    )}
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.label}>
                      Confirm Password <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Confirm new password"
                        placeholderTextColor="#C1C1C1"
                        secureTextEntry={!showConfirmPassword}
                        value={confirmPassword}
                        onChangeText={(t) => {
                          setConfirmPassword(t);
                          if (fieldErrors.confirmPassword)
                            setFieldErrors((p) => ({ ...p, confirmPassword: undefined }));
                        }}
                        editable={!loading && !skipping}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword((v) => !v)}
                        disabled={loading || skipping}
                        style={styles.eyeButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                          size={22}
                          color="#8F8F8F"
                        />
                      </TouchableOpacity>
                    </View>
                    {fieldErrors.confirmPassword && (
                      <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>
                    )}
                  </View>

                  {/* Requirements box */}
                  <View style={styles.requirementsBox}>
                    <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                    <Text style={styles.requirementItem}>• At least 8 characters long</Text>
                    <Text style={styles.requirementItem}>• At least one uppercase letter (A-Z)</Text>
                    <Text style={styles.requirementItem}>• At least one lowercase letter (a-z)</Text>
                    <Text style={styles.requirementItem}>• At least one number (0-9)</Text>
                  </View>

                  {/* Buttons */}
                  <View style={styles.buttonsRow}>
                    <TouchableOpacity
                      style={[styles.primaryButton, (loading || skipping) && styles.buttonDisabled]}
                      onPress={handleSubmit}
                      disabled={loading || skipping}
                      activeOpacity={0.85}
                    >
                      {loading ? (
                        <View style={styles.buttonLoadingRow}>
                          <ActivityIndicator color="#FFFFFF" size="small" />
                          <Text style={styles.primaryButtonText}>Updating...</Text>
                        </View>
                      ) : (
                        <View style={styles.buttonLoadingRow}>
                          <Ionicons name="key-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.primaryButtonText}>Set New Password</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {allowSkip && (
                      <TouchableOpacity
                        style={[styles.skipButton, (loading || skipping) && styles.buttonDisabled]}
                        onPress={handleSkip}
                        disabled={loading || skipping}
                        activeOpacity={0.85}
                      >
                        {skipping ? (
                          <View style={styles.buttonLoadingRow}>
                            <ActivityIndicator color={COLORS.GREEN} size="small" />
                            <Text style={styles.skipButtonText}>Skipping...</Text>
                          </View>
                        ) : (
                          <Text style={styles.skipButtonText}>Skip for Now</Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.footerHint}>
                    You can always change your password later in your account settings.
                  </Text>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  keyboardView: {
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: COLORS.CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.88,
    minHeight: SCREEN_HEIGHT * 0.5,
  },
  handleRow: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 8,
  },
  headerIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: "Manrope_700Bold",
    color: COLORS.TEXT,
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontFamily: "Manrope_400Regular",
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    fontFamily: "Manrope_400Regular",
    color: "#B91C1C",
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: "Manrope_600SemiBold",
    color: COLORS.TEXT,
    marginBottom: 6,
  },
  required: {
    color: "#EF4444",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Manrope_400Regular",
    color: COLORS.TEXT,
    height: "100%",
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  fieldError: {
    fontSize: 12,
    fontFamily: "Manrope_400Regular",
    color: "#DC2626",
    marginTop: 4,
  },
  requirementsBox: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 13,
    fontFamily: "Manrope_700Bold",
    color: COLORS.TEXT,
    marginBottom: 6,
  },
  requirementItem: {
    fontSize: 12,
    fontFamily: "Manrope_400Regular",
    color: "#6B7280",
    lineHeight: 20,
  },
  buttonsRow: {
    gap: 10,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.GREEN,
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Manrope_700Bold",
  },
  skipButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  skipButtonText: {
    color: COLORS.TEXT,
    fontSize: 16,
    fontFamily: "Manrope_600SemiBold",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerHint: {
    fontSize: 12,
    fontFamily: "Manrope_400Regular",
    color: "#9CA3AF",
    textAlign: "center",
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: "Manrope_700Bold",
    color: COLORS.TEXT,
    textAlign: "center",
    marginBottom: 8,
  },
  successDescription: {
    fontSize: 14,
    fontFamily: "Manrope_400Regular",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  redirectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  redirectText: {
    fontSize: 13,
    fontFamily: "Manrope_400Regular",
    color: "#9CA3AF",
  },
});