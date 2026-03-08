import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";
import { submitFeedback, checkFeedbackExists } from "@/services/feedback.service";

const QUESTIONS = [
  "How satisfied are you with the quality of service provided?",
  "How professional and courteous was the staff?",
  "Was the appointment process smooth and efficient?",
  "How satisfied are you with the facilities and cleanliness?",
  "Would you recommend our barangay services to others?",
];

function RadioOption({
  label,
  selected,
  onPress,
}: {
  label: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.radioWrap} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function RateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resident } = useAuth();

  const params = useLocalSearchParams<{ appointmentId?: string }>();
  const appointmentId = params.appointmentId ? Number(params.appointmentId) : undefined;

  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [overall, setOverall] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function validateExistingFeedback() {
      if (!appointmentId || Number.isNaN(appointmentId)) {
        setCheckingExisting(false);
        return;
      }

      try {
        const exists = await checkFeedbackExists(appointmentId);

        if (mounted && exists) {
          Alert.alert("Already Submitted", "Feedback for this appointment has already been submitted.", [
            {
              text: "OK",
              onPress: () =>
                router.replace({
                  pathname: "/(protected)/(tabs)/appointment",
                  params: { refresh: Date.now().toString() },
                }),
            },
          ]);
          return;
        }
      } catch (error: any) {
        if (mounted) {
          Alert.alert("Error", error?.message ?? "Failed to verify feedback status.");
        }
      } finally {
        if (mounted) {
          setCheckingExisting(false);
        }
      }
    }

    validateExistingFeedback();

    return () => {
      mounted = false;
    };
  }, [appointmentId, router]);

  const allAnswered = useMemo(() => {
    const questionsOk = QUESTIONS.every((_, idx) => !!ratings[idx]);
    const overallOk = overall > 0;
    const suggestionsOk = suggestions.trim().length >= 10;
    return questionsOk && overallOk && suggestionsOk;
  }, [ratings, overall, suggestions]);

  const handleSubmit = async () => {
    if (!allAnswered || submitting || checkingExisting) return;

    if (!resident?.id) {
      Alert.alert("Login Required", "You must be logged in to submit feedback.");
      return;
    }

    setSubmitting(true);

    try {
      if (appointmentId && !Number.isNaN(appointmentId)) {
        const exists = await checkFeedbackExists(appointmentId);
        if (exists) {
          Alert.alert("Already Submitted", "Feedback for this appointment has already been submitted.");
          router.replace({
            pathname: "/(protected)/(tabs)/appointment",
            params: { refresh: Date.now().toString() },
          });
          return;
        }
      }

      const totalRating = Object.values(ratings).reduce((sum, rating) => sum + rating, 0);
      const averageRating = Math.round(totalRating / QUESTIONS.length);

      await submitFeedback({
        residentId: resident.id,
        rating: averageRating,
        comments: suggestions.trim(),
        appointmentId: appointmentId && !Number.isNaN(appointmentId) ? appointmentId : undefined,
        individualRatings: ratings,
        category: "Feedback",
      });

      setSubmitted(true);
    } catch (e: any) {
      Alert.alert("Submission Failed", e?.message ?? "Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    setSubmitted(false);
    setRatings({});
    setOverall(0);
    setSuggestions("");

    router.replace({
      pathname: "/(protected)/(tabs)/appointment",
      params: { refresh: Date.now().toString() },
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <View style={{ height: insets.top, backgroundColor: COLORS.GREEN }} />
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={22} color={COLORS.TEXT} />
          <Text style={styles.backText}>Back to My Appointments</Text>
        </TouchableOpacity>

        <Text style={styles.pageTitle}>Client Satisfaction</Text>
        <Text style={styles.pageSubtitle}>We value your opinion. Help us improve our services</Text>

        <View style={styles.scaleCard}>
          <Text style={styles.scaleTitle}>Ratings</Text>
          <Text style={styles.scaleItem}>5 - Very Satisfied</Text>
          <Text style={styles.scaleItem}>4 - Satisfied</Text>
          <Text style={styles.scaleItem}>3 - Neutral</Text>
          <Text style={styles.scaleItem}>2 - Dissatisfied</Text>
          <Text style={styles.scaleItem}>1 - Very dissatisfied</Text>
        </View>

        {QUESTIONS.map((q, idx) => (
          <View key={q} style={styles.questionBlock}>
            <Text style={styles.questionText}>
              {idx + 1}. {q}
            </Text>

            <View style={styles.radioRow}>
              {[1, 2, 3, 4, 5].map((val) => (
                <RadioOption
                  key={val}
                  label={val}
                  selected={ratings[idx] === val}
                  onPress={() => setRatings((prev) => ({ ...prev, [idx]: val }))}
                />
              ))}
            </View>
          </View>
        ))}

        <View style={styles.overallBlock}>
          <Text style={styles.overallLabel}>
            How would you rate your overall experience? <Text style={{ color: "#EF4444" }}>*</Text>
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => {
              const filled = s <= overall;
              return (
                <TouchableOpacity key={s} onPress={() => setOverall(s)} activeOpacity={0.8}>
                  <Ionicons
                    name={filled ? "star" : "star-outline"}
                    size={30}
                    color={filled ? "#F59E0B" : COLORS.MUTED}
                    style={{ marginRight: 10 }}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.suggestionsBlock}>
          <Text style={styles.suggestionsLabel}>
            Suggestions <Text style={{ color: "#EF4444" }}>*</Text>
          </Text>

          <View style={styles.textAreaWrap}>
            <TextInput
              value={suggestions}
              onChangeText={setSuggestions}
              placeholder="Please share your thoughts, suggestions, or concerns..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={styles.textArea}
              editable={!submitting && !checkingExisting}
            />
          </View>

          <Text style={styles.charHint}>Minimum 10 characters ({suggestions.length}/10)</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Your feedback matters!</Text>
          <Text style={styles.infoText}>
            We review all feedback to continuously improve our services. Your input helps us serve the community better.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, (!allAnswered || submitting || checkingExisting) && { opacity: 0.55 }]}
          disabled={!allAnswered || submitting || checkingExisting}
          onPress={handleSubmit}
          activeOpacity={0.9}
        >
          <Text style={styles.submitText}>
            {checkingExisting ? "Checking..." : submitting ? "Submitting…" : "Submit Feedback"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={submitted} transparent animationType="fade" onRequestClose={() => setSubmitted(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="checkmark" size={28} color="#16A34A" />
            </View>

            <Text style={styles.modalTitle}>Feedback Submitted!</Text>
            <Text style={styles.modalBody}>
              Thank you for sharing your feedback. We appreciate your input and will use it to improve our services.
            </Text>

            <TouchableOpacity style={styles.modalBtn} onPress={handleDone} activeOpacity={0.9}>
              <Text style={styles.modalBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.BG },
  content: { paddingHorizontal: 18, paddingTop: 16 },

  backRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  backText: { color: COLORS.TEXT, fontSize: 15, fontFamily: "Manrope_600SemiBold" },

  pageTitle: { fontSize: 24, color: COLORS.TEXT, fontFamily: "Manrope_700Bold", marginBottom: 6 },
  pageSubtitle: { fontSize: 14, color: COLORS.MUTED, fontFamily: "Manrope_400Regular", marginBottom: 14 },

  scaleCard: {
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: 16,
    marginBottom: 18,
  },
  scaleTitle: { fontSize: 18, color: COLORS.TEXT, fontFamily: "Manrope_700Bold", marginBottom: 10 },
  scaleItem: { fontSize: 14, color: COLORS.TEXT, fontFamily: "Manrope_400Regular", marginBottom: 6 },

  questionBlock: { marginBottom: 18 },
  questionText: {
    fontSize: 16,
    color: COLORS.TEXT,
    fontFamily: "Manrope_600SemiBold",
    marginBottom: 10,
    lineHeight: 22,
  },

  radioRow: { flexDirection: "row", alignItems: "center", gap: 18, flexWrap: "wrap" },
  radioWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#6B7280",
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: { borderColor: "#2563EB" },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#2563EB" },
  radioLabel: { color: COLORS.TEXT, fontFamily: "Manrope_400Regular" },

  overallBlock: { marginTop: 4, marginBottom: 18 },
  overallLabel: { fontSize: 16, color: COLORS.TEXT, fontFamily: "Manrope_600SemiBold", marginBottom: 10 },
  starsRow: { flexDirection: "row", alignItems: "center" },

  suggestionsBlock: { marginBottom: 18 },
  suggestionsLabel: { fontSize: 16, color: COLORS.TEXT, fontFamily: "Manrope_600SemiBold", marginBottom: 10 },
  textAreaWrap: {
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: 12,
    minHeight: 140,
  },
  textArea: { fontSize: 14, color: COLORS.TEXT, fontFamily: "Manrope_400Regular", lineHeight: 20 },
  charHint: { marginTop: 8, color: COLORS.MUTED, fontSize: 12, fontFamily: "Manrope_400Regular" },

  infoBox: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  infoTitle: { color: "#1D4ED8", fontFamily: "Manrope_700Bold", marginBottom: 6 },
  infoText: { color: "#1D4ED8", fontFamily: "Manrope_400Regular", lineHeight: 20 },

  submitBtn: {
    backgroundColor: COLORS.GREEN,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 18,
  },
  submitText: { color: "#fff", fontSize: 16, fontFamily: "Manrope_700Bold" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.CARD,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignItems: "center",
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { color: COLORS.TEXT, fontSize: 18, fontFamily: "Manrope_700Bold", marginBottom: 8 },
  modalBody: {
    color: COLORS.MUTED,
    fontFamily: "Manrope_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 14,
  },
  modalBtn: {
    width: "100%",
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalBtnText: { color: "#fff", fontFamily: "Manrope_700Bold" },
});