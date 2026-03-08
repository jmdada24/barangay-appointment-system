import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  LayoutAnimation,
  Platform,
  UIManager,
  TextInput,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import StepIndicator from "react-native-step-indicator";

import TabHeader from "@/components/layout/TabHeader";
import { COLORS } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";

import { getActiveServices, type Service } from "@/services/services.service";
import { getAvailableSchedules, type ScheduleWithAvailability } from "@/services/schedules.service";
import { createAppointment, type TimeSlot } from "@/services/appointments.service";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STEPS = ["Services", "Date", "Time", "Details", "Confirm"];

/** Theme-based StepIndicator styles */
const stepIndicatorStyles = {
  stepIndicatorSize: 34,
  currentStepIndicatorSize: 34,
  separatorStrokeWidth: 4,
  currentStepStrokeWidth: 0,
  stepStrokeWidth: 0,

  stepIndicatorFinishedColor: COLORS.GREEN,
  stepIndicatorCurrentColor: COLORS.GREEN,
  stepIndicatorUnFinishedColor: COLORS.BORDER,

  separatorFinishedColor: COLORS.GREEN,
  separatorUnFinishedColor: "#D1D5DB",

  stepIndicatorLabelFontSize: 13,
  currentStepIndicatorLabelFontSize: 13,
  stepIndicatorLabelCurrentColor: "#FFFFFF",
  stepIndicatorLabelFinishedColor: "#FFFFFF",
  stepIndicatorLabelUnFinishedColor: COLORS.MUTED,

  labelColor: COLORS.MUTED,
  currentStepLabelColor: COLORS.GREEN,
  labelSize: 12,

  labelAlign: "center" as const,
};

function formatFullDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTodayIsoLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function BookingFlow() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { width } = useWindowDimensions();
  const { residentId, residentLoading, refreshResident } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);

  // backend data
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithAvailability[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(true);

  // ✅ pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);

  // selections
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleWithAvailability | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(null);

  const [purpose, setPurpose] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ✅ confirm warning + duplicate modal
  const [showFinalWarning, setShowFinalWarning] = useState(false);
  const [showAlreadyBooked, setShowAlreadyBooked] = useState(false);

  const nextStep = (step: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCurrentStep(step);
  };

  // ✅ FULL RESET so after booking (or leaving flow) user starts again at Services
  const resetFlow = useCallback((opts?: { keepData?: boolean }) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    setCurrentStep(1);

    setSelectedService(null);
    setSelectedSchedule(null);
    setSelectedTimeSlot(null);
    setPurpose("");

    setShowFinalWarning(false);
    setShowAlreadyBooked(false);
    setShowSuccess(false);
    setSubmitting(false);

    // keepData=false would clear lists too (not needed usually)
    if (!opts?.keepData) {
      setServices([]);
      setSchedules([]);
      setLoadingServices(true);
      setLoadingSchedules(true);
    }
  }, []);

  // ✅ responsive calendar sizing (measure container width)
  const [calendarInnerWidth, setCalendarInnerWidth] = useState<number | null>(null);
  const CELL_GAP = 6;

  const daySize = useMemo(() => {
    const fallback = width - 40;
    const w = calendarInnerWidth ?? fallback;
    const totalGaps = CELL_GAP * 6; // 7 columns => 6 gaps
    const cell = Math.floor((w - totalGaps) / 7);
    return Math.max(34, Math.min(cell, 56));
  }, [calendarInnerWidth, width]);

  const todayIso = useMemo(() => getTodayIsoLocal(), []);

  const loadSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const sch = await getAvailableSchedules();
      setSchedules(sch);

      // ✅ keep selectedSchedule in sync WITHOUT capturing selectedSchedule in deps
      setSelectedSchedule((prev) => {
        if (!prev) return prev;

        const updated = sch.find((x) => x.id === prev.id) ?? null;

        // if removed or now full, clear selection
        if (!updated || updated.date <= todayIso || (updated.morning_available <= 0 && updated.afternoon_available <= 0)) {
          setSelectedTimeSlot(null);
          return null;
        }

        return updated;
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load schedules.");
    } finally {
      setLoadingSchedules(false);
    }
  }, [todayIso]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSchedules();
    } finally {
      setRefreshing(false);
    }
  }, [loadSchedules]);

  // Load services
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoadingServices(true);
        const s = await getActiveServices();
        if (mounted) setServices(s);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Failed to load services.");
      } finally {
        if (mounted) setLoadingServices(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Load schedules on mount (no realtime)
  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // calendar view
  const calendar = useMemo(() => {
    const base = schedules[0]?.date ?? new Date().toISOString().slice(0, 10);
    const [yy, mm] = base.split("-").map(Number);
    const year = yy;
    const monthIndex = mm - 1;

    const first = new Date(year, monthIndex, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const startDow = first.getDay();

    return { year, monthIndex, daysInMonth, startDow };
  }, [schedules]);

  const monthLabel = useMemo(() => {
    const dt = new Date(calendar.year, calendar.monthIndex, 1);
    return dt.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }, [calendar]);

  // ✅ actual submit (called after final warning modal "Proceed")
  const submitAppointment = async () => {
    if (residentLoading) {
      Alert.alert("Loading profile...", "Please wait while we load your resident profile.");
      return;
    }

    let rid = residentId;
    if (!rid) {
      const r = await refreshResident();
      rid = r?.id ?? null;
    }

    if (!rid) {
      Alert.alert(
        "Resident profile not found",
        "Your account is logged in but no resident profile was loaded. Please log out and log in again."
      );
      return;
    }

    if (!selectedService || !selectedSchedule || !selectedTimeSlot) {
      Alert.alert("Missing info", "Please complete the steps first.");
      return;
    }

    if (selectedSchedule.date <= todayIso) {
      Alert.alert("Invalid date", "Same-day and past-date bookings are not allowed. Please choose a future date.");
      setSelectedSchedule(null);
      setSelectedTimeSlot(null);
      nextStep(2);
      return;
    }

    // prevent confirming if schedule got updated to full
    if (
      (selectedTimeSlot === "morning" && selectedSchedule.morning_available <= 0) ||
      (selectedTimeSlot === "afternoon" && selectedSchedule.afternoon_available <= 0)
    ) {
      Alert.alert("Slot no longer available", "That time slot was just taken. Please choose another slot.");
      setSelectedTimeSlot(null);
      nextStep(3);
      return;
    }

    if (purpose.trim().length < 10) {
      Alert.alert("Purpose too short", "Purpose must be at least 10 characters.");
      return;
    }

    try {
      setSubmitting(true);

      await createAppointment({
        residentId: rid,
        serviceId: selectedService.id,
        scheduleId: selectedSchedule.id,
        timeSlot: selectedTimeSlot,
        purpose: purpose.trim(),
      });

      setShowSuccess(true);
    } catch (e: any) {
      const msg = e?.message ?? "Unable to create appointment.";

      if (typeof msg === "string" && msg.toLowerCase().includes("already have an appointment for this schedule")) {
        setShowAlreadyBooked(true);
      } else {
        Alert.alert("Booking failed", msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Select Service Type</Text>
      <Text style={styles.sectionSubtitle}>Choose the barangay service you need</Text>

      {loadingServices ? (
        <View style={{ paddingVertical: 22 }}>
          <ActivityIndicator />
        </View>
      ) : (
        services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[styles.serviceCard, selectedService?.id === service.id && styles.activeCard]}
            onPress={() => {
              setSelectedService(service);
              setSelectedSchedule(null);
              setSelectedTimeSlot(null);
              setPurpose("");
              nextStep(2);
            }}
            activeOpacity={0.9}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="document-text-outline" size={24} color={COLORS.TEXT} />
            </View>

            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>{service.service_name}</Text>
              <Text style={styles.cardPrice}>₱{Number(service.fee ?? 0).toFixed(0)}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => nextStep(1)} activeOpacity={0.85}>
        <Ionicons name="arrow-back" size={20} color={COLORS.TEXT} />
        <Text style={styles.backButtonText}>Back to Service Selection</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Select Date</Text>
      <Text style={styles.sectionSubtitle}>Choose your preferred appointment date</Text>

      {loadingSchedules ? (
        <View style={{ paddingVertical: 22 }}>
          <ActivityIndicator />
        </View>
      ) : (
        <View
          style={styles.calendarWrapper}
          onLayout={(e) => {
            const outer = e.nativeEvent.layout.width;
            const inner = Math.max(0, outer - 28);
            setCalendarInnerWidth((prev) => (prev === inner ? prev : inner));
          }}
        >
          <View style={styles.calendarHeader}>
            <View style={styles.arrowBtnDisabled}>
              <Ionicons name="chevron-back" size={20} color={COLORS.MUTED} />
            </View>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <View style={styles.arrowBtnDisabled}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.MUTED} />
            </View>
          </View>

          <View style={styles.weekHeader}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <Text key={d} style={styles.weekText}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {Array.from({ length: calendar.startDow }).map((_, i) => {
              const col = i % 7;
              return (
                <View
                  key={`blank-${i}`}
                  style={{
                    width: daySize,
                    height: daySize,
                    marginBottom: CELL_GAP,
                    marginRight: col === 6 ? 0 : CELL_GAP,
                  }}
                />
              );
            })}

            {Array.from({ length: calendar.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateIso = `${calendar.year}-${String(calendar.monthIndex + 1).padStart(2, "0")}-${String(day).padStart(
                2,
                "0"
              )}`;

              const sched = schedules.find((s) => s.date === dateIso) ?? null;
              const isTodayOrPast = dateIso <= todayIso;
              const hasAnySlot = !!sched && (sched.morning_available > 0 || sched.afternoon_available > 0);
              const isSelectable = !isTodayOrPast && hasAnySlot;
              const selected = selectedSchedule?.date === dateIso;

              const col = (calendar.startDow + i) % 7;

              return (
                <TouchableOpacity
                  key={dateIso}
                  disabled={!isSelectable}
                  style={[
                    styles.dayCell,
                    {
                      width: daySize,
                      height: daySize,
                      marginBottom: CELL_GAP,
                      marginRight: col === 6 ? 0 : CELL_GAP,
                    },
                    isSelectable && styles.availableDayCell,
                    selected && styles.selectedDayCell,
                    !isSelectable && { opacity: 0.35 },
                  ]}
                  onPress={() => {
                    if (!sched || !isSelectable) return;
                    setSelectedSchedule(sched);
                    setSelectedTimeSlot(null);
                  }}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.dayText, isSelectable && styles.availableDayText, selected && styles.selectedDayText]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, !selectedSchedule && { opacity: 0.6 }]}
        disabled={!selectedSchedule}
        onPress={() => nextStep(3)}
        activeOpacity={0.9}
      >
        <Text style={styles.primaryButtonText}>Next: Select Time</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep3 = () => {
    const sched = selectedSchedule;
    const morningLeft = sched?.morning_available ?? 0;
    const afternoonLeft = sched?.afternoon_available ?? 0;

    return (
      <View style={styles.stepContainer}>
        <TouchableOpacity style={styles.backButton} onPress={() => nextStep(2)} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={20} color={COLORS.TEXT} />
          <Text style={styles.backButtonText}>Back to Date Selection</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Select Time Slot</Text>
        <Text style={styles.sectionSubtitle}>Choose your preferred time</Text>

        <View style={styles.miniCalendarCard}>
          <Text style={styles.dateDetailText}>
            Service: {selectedService?.service_name ?? "—"}{"\n"}
            Date: {selectedSchedule ? formatFullDate(selectedSchedule.date) : "—"}
          </Text>
        </View>

        <View style={styles.sessionCard}>
          <View style={styles.sessionHeaderRow}>
            <View style={styles.row}>
              <Ionicons name="time-outline" size={24} color={COLORS.TEXT} />
              <View style={styles.sessionTextGap}>
                <Text style={styles.sessionTitleText}>Morning Session</Text>
                <Text style={styles.sessionSubText}>8:00 AM - 11:00 AM</Text>
              </View>
            </View>

            <Text style={styles.slotsText}>
              {morningLeft}/{selectedSchedule?.morning_slots ?? 0} slots
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.sessionButton, morningLeft === 0 && { opacity: 0.55 }]}
            disabled={morningLeft === 0}
            onPress={() => {
              setSelectedTimeSlot("morning");
              nextStep(4);
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.sessionButtonText}>Select Morning</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sessionCard}>
          <View style={styles.sessionHeaderRow}>
            <View style={styles.row}>
              <Ionicons name="sunny-outline" size={24} color={COLORS.TEXT} />
              <View style={styles.sessionTextGap}>
                <Text style={styles.sessionTitleText}>Afternoon Session</Text>
                <Text style={styles.sessionSubText}>1:00 PM - 4:00 PM</Text>
              </View>
            </View>

            <Text style={styles.slotsText}>
              {afternoonLeft}/{selectedSchedule?.afternoon_slots ?? 0} slots
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.sessionButton, afternoonLeft === 0 && { opacity: 0.55 }]}
            disabled={afternoonLeft === 0}
            onPress={() => {
              setSelectedTimeSlot("afternoon");
              nextStep(4);
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.sessionButtonText}>Select Afternoon</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => nextStep(3)} activeOpacity={0.85}>
        <Ionicons name="arrow-back" size={22} color={COLORS.TEXT} />
        <Text style={styles.backButtonText}>Back to Time Selection</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Appointment Details</Text>
      <Text style={styles.sectionSubtitle}>Provide additional information</Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryLabel}>Service: </Text>
          {selectedService?.service_name ?? "—"}
        </Text>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryLabel}>Date: </Text>
          {selectedSchedule ? formatFullDate(selectedSchedule.date) : "—"}
        </Text>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryLabel}>Time: </Text>
          {selectedTimeSlot === "morning" ? "Morning Session" : "Afternoon Session"}
        </Text>
      </View>

      <Text style={styles.inputLabel}>
        Purpose / Description <Text style={{ color: "red" }}>*</Text>
      </Text>

      <View style={styles.textAreaContainer}>
        <TextInput
          style={styles.textArea}
          placeholder="Please provide details about why you need this service (minimum 10 characters)"
          placeholderTextColor="#999"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={purpose}
          onChangeText={setPurpose}
        />
      </View>

      <Text style={styles.charCount}>{purpose.length}/10 minimum characters</Text>

      <TouchableOpacity
        style={[styles.primaryButton, purpose.trim().length < 10 && { opacity: 0.6 }]}
        disabled={purpose.trim().length < 10}
        onPress={() => nextStep(5)}
        activeOpacity={0.9}
      >
        <Text style={styles.primaryButtonText}>Continue to Confirmation</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => nextStep(4)} activeOpacity={0.85}>
        <Ionicons name="arrow-back" size={22} color={COLORS.TEXT} />
        <Text style={styles.backButtonText}>Back to Details</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Confirm Appointment</Text>
      <Text style={styles.sectionSubtitle}>Please review your appointment details</Text>

      <View style={styles.confirmationBox}>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Service:</Text>
          <Text style={styles.confirmValue}>{selectedService?.service_name ?? "—"}</Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Date:</Text>
          <Text style={styles.confirmValue}>
            {selectedSchedule ? formatFullDate(selectedSchedule.date) : "—"}
          </Text>
        </View>
        <View style={styles.confirmRow}>
          <Text style={styles.confirmLabel}>Time:</Text>
          <Text style={styles.confirmValue}>
            {selectedTimeSlot === "morning" ? "Morning Session" : "Afternoon Session"}
          </Text>
        </View>
        <View style={[styles.confirmRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.confirmLabel}>Purpose:</Text>
          <Text style={styles.confirmValue}>{purpose || "Not specified"}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.editButton} onPress={() => nextStep(4)} activeOpacity={0.9}>
          <Text style={styles.editButtonText}>Edit Details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmButton, submitting && { opacity: 0.65 }]}
          onPress={() => setShowFinalWarning(true)}
          activeOpacity={0.9}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Confirm Booking</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <TabHeader
        title="Book an Appointment"
        subtitle="Schedule your barangay service request"
        topBarColor={COLORS.GREEN}
        backgroundColor={COLORS.CARD}
      />

      <View style={styles.stepperWrap}>
        <StepIndicator
          customStyles={stepIndicatorStyles}
          currentPosition={currentStep - 1}
          labels={STEPS}
          stepCount={STEPS.length}
        />
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.BG }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </ScrollView>

      {/* Final warning modal */}
      <Modal transparent animationType="fade" visible={showFinalWarning} onRequestClose={() => setShowFinalWarning(false)}>
        <View style={styles.bottomSheetOverlay}>
          <View style={[styles.bottomSheetContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />

            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Ionicons name="warning-outline" size={40} color={COLORS.WARNING} />
            </View>

            <Text style={styles.bottomSheetTitle}>Before you confirm</Text>
            <Text style={styles.bottomSheetSubtitle}>
              Please make sure everything is correct. If you already have a pending/approved appointment on this schedule,
              you won’t be able to book again for the same date.
            </Text>

            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={() => {
                setShowFinalWarning(false);
                submitAppointment();
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.actionButtonPrimaryText}>Proceed & Confirm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() => setShowFinalWarning(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.actionButtonSecondaryText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Already booked modal */}
      <Modal transparent animationType="fade" visible={showAlreadyBooked} onRequestClose={() => setShowAlreadyBooked(false)}>
        <View style={styles.bottomSheetOverlay}>
          <View style={[styles.bottomSheetContainer, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHandle} />

            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <Ionicons name="information-circle-outline" size={42} color={COLORS.GREEN} />
            </View>

            <Text style={styles.bottomSheetTitle}>You already have a booking</Text>
            <Text style={styles.bottomSheetSubtitle}>
              You already have a pending or approved appointment for this schedule. Please check your appointments list.
            </Text>

            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={() => {
                resetFlow({ keepData: true });
                setShowAlreadyBooked(false);
                router.replace("/(protected)/(tabs)/appointment");
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.actionButtonPrimaryText}>View my Appointments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() => {
                resetFlow({ keepData: true });
                setShowAlreadyBooked(false);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.actionButtonSecondaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success modal */}
      <Modal animationType="slide" transparent visible={showSuccess} onRequestClose={() => setShowSuccess(false)}>
        <View style={styles.bottomSheetOverlay}>
          <View style={[styles.bottomSheetContainer, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.successCircleLarge}>
              <Ionicons name="checkmark" size={50} color={COLORS.GREEN} />
            </View>

            <Text style={styles.bottomSheetTitle}>Appointment Submitted!</Text>
            <Text style={styles.bottomSheetSubtitle}>
              Your appointment request has been submitted successfully. You will receive a notification once it is
              reviewed by the barangay staff.
            </Text>

            <TouchableOpacity
              style={styles.actionButtonPrimary}
              onPress={() => {
                resetFlow({ keepData: true });
                setShowSuccess(false);
                router.replace("/(protected)/(tabs)/appointment");
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.actionButtonPrimaryText}>View my Appointments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButtonSecondary}
              onPress={() => {
                resetFlow({ keepData: true });
                setShowSuccess(false);
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.actionButtonSecondaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG },

  stepperWrap: {
    backgroundColor: COLORS.CARD,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },

  scrollContent: { padding: 20, paddingTop: 22 },
  stepContainer: { width: "100%" },

  sectionTitle: { fontSize: 20, color: COLORS.TEXT, fontFamily: "Manrope_700Bold", marginBottom: 5 },
  sectionSubtitle: { fontSize: 14, color: COLORS.MUTED, fontFamily: "Manrope_400Regular", marginBottom: 20 },

  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: 12,
    backgroundColor: COLORS.CARD,
  },
  activeCard: { borderColor: COLORS.GREEN, backgroundColor: "#F0F9F6" },
  cardIcon: { marginRight: 15 },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 16, color: COLORS.TEXT, fontFamily: "Manrope_600SemiBold" },
  cardPrice: { fontSize: 12, color: COLORS.MUTED, fontFamily: "Manrope_400Regular", marginTop: 2 },

  backButton: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backButtonText: { marginLeft: 10, fontSize: 15, color: COLORS.TEXT, fontFamily: "Manrope_600SemiBold" },

  calendarWrapper: {
    marginTop: 10,
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: 14,
  },
  calendarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  monthLabel: { fontSize: 18, color: COLORS.TEXT, fontFamily: "Manrope_700Bold" },
  arrowBtnDisabled: { padding: 8, borderWidth: 1, borderColor: COLORS.BORDER, borderRadius: 8, opacity: 0.5 },

  weekHeader: { flexDirection: "row", justifyContent: "space-around", marginBottom: 10 },
  weekText: { flex: 1, textAlign: "center", color: COLORS.GREEN, fontFamily: "Manrope_700Bold" },

  daysGrid: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start" },
  dayCell: { justifyContent: "center", alignItems: "center" },
  dayText: { fontSize: 16, color: "#333", fontFamily: "Manrope_600SemiBold" },

  availableDayCell: { backgroundColor: "#DCFCE7", borderRadius: 10 },
  availableDayText: { color: COLORS.GREEN, fontFamily: "Manrope_700Bold" },

  selectedDayCell: { backgroundColor: COLORS.GREEN, borderRadius: 10 },
  selectedDayText: { color: "#fff", fontFamily: "Manrope_700Bold" },

  miniCalendarCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    marginBottom: 20,
  },
  dateDetailText: { fontSize: 14, color: "#1E40AF", fontFamily: "Manrope_600SemiBold", lineHeight: 20 },

  sessionCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: 15,
  },
  sessionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  row: { flexDirection: "row", alignItems: "center" },
  sessionTextGap: { marginLeft: 15 },
  sessionTitleText: { fontSize: 18, color: COLORS.TEXT, fontFamily: "Manrope_700Bold" },
  sessionSubText: { fontSize: 14, color: COLORS.MUTED, fontFamily: "Manrope_400Regular", marginTop: 4 },
  slotsText: { fontSize: 16, color: COLORS.TEXT, fontFamily: "Manrope_700Bold" },

  sessionButton: { backgroundColor: COLORS.GREEN, paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  sessionButtonText: { color: "#fff", fontFamily: "Manrope_700Bold", fontSize: 15 },

  summaryBox: {
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: "#C7D2FE",
    marginBottom: 25,
  },
  summaryText: { fontSize: 15, color: "#3730A3", fontFamily: "Manrope_400Regular", marginBottom: 4 },
  summaryLabel: { fontFamily: "Manrope_700Bold" },

  inputLabel: { fontSize: 16, color: COLORS.GREEN, fontFamily: "Manrope_700Bold", marginBottom: 10 },
  textAreaContainer: {
    backgroundColor: COLORS.CARD,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    padding: 12,
    minHeight: 120,
  },
  textArea: { fontSize: 14, color: "#333", lineHeight: 20, fontFamily: "Manrope_400Regular" },
  charCount: { fontSize: 12, color: COLORS.MUTED, fontFamily: "Manrope_400Regular", marginTop: 6, marginBottom: 20 },

  confirmationBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: 20,
    elevation: 1,
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  confirmLabel: { fontSize: 15, color: COLORS.MUTED, fontFamily: "Manrope_600SemiBold" },
  confirmValue: {
    fontSize: 15,
    color: COLORS.TEXT,
    fontFamily: "Manrope_700Bold",
    textAlign: "right",
    flex: 1,
    marginLeft: 20,
  },

  buttonRow: { flexDirection: "row", justifyContent: "space-between" },
  editButton: {
    flex: 1,
    backgroundColor: COLORS.CARD,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    marginRight: 10,
    alignItems: "center",
  },
  editButtonText: { color: "#374151", fontFamily: "Manrope_700Bold", fontSize: 16 },
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.GREEN,
    paddingVertical: 16,
    borderRadius: 12,
    marginLeft: 10,
    alignItems: "center",
  },
  confirmButtonText: { color: "#fff", fontFamily: "Manrope_700Bold", fontSize: 16 },

  primaryButton: { backgroundColor: COLORS.GREEN, padding: 18, borderRadius: 12, marginTop: 22, alignItems: "center" },
  primaryButtonText: { color: "#fff", fontFamily: "Manrope_700Bold", fontSize: 16 },

  bottomSheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  bottomSheetContainer: {
    backgroundColor: COLORS.CARD,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    alignItems: "center",
    elevation: 10,
  },
  sheetHandle: { width: 40, height: 5, backgroundColor: COLORS.BORDER, borderRadius: 10, marginBottom: 20 },
  successCircleLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: COLORS.GREEN,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  bottomSheetTitle: { fontSize: 22, color: COLORS.TEXT, fontFamily: "Manrope_700Bold", marginBottom: 10 },
  bottomSheetSubtitle: {
    fontSize: 14,
    color: COLORS.MUTED,
    fontFamily: "Manrope_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 30,
    paddingHorizontal: 15,
  },

  actionButtonPrimary: {
    backgroundColor: COLORS.GREEN,
    width: "100%",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  actionButtonPrimaryText: { color: "#fff", fontFamily: "Manrope_700Bold", fontSize: 16 },
  actionButtonSecondary: { width: "100%", padding: 15, alignItems: "center" },
  actionButtonSecondaryText: { color: COLORS.GREEN, fontFamily: "Manrope_600SemiBold", fontSize: 15 },
});