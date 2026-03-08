import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, StatusBar, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { COLORS } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatDateShort(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit", year: "numeric" });
}

function formatSince(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resident, user, signOut, loading: authLoading, residentLoading, refreshResident } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const displayName = resident?.name || user?.email?.split("@")[0] || "Resident";
  const email = user?.email ?? "—";

  const verificationStatus = useMemo(() => {
    const v = resident?.verification_status;
    if (!v) return "—";
    return v.charAt(0).toUpperCase() + v.slice(1);
  }, [resident?.verification_status]);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await signOut();
      router.replace("/(auth)/login");
    } finally {
      // If router replace happens, screen unmounts anyway,
      // but keeping finally prevents "stuck" state if anything throws.
      setLoggingOut(false);
    }
  };
  React.useEffect(() => {
    if (authLoading) return;
    if (residentLoading) return;
    if (!resident?.id) refreshResident();
  }, [authLoading, residentLoading, resident?.id, refreshResident]);
  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* ✅ paint status bar area */}
      <View style={{ height: insets.top, backgroundColor: COLORS.GREEN }} />

      <View style={styles.header}>
        <Ionicons name="person-circle-outline" size={92} color="#FFFFFF" />
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <InfoRow label="Address" value={resident?.address || "—"} />
          <InfoRow label="Phone Number" value={resident?.phone_number || "—"} />
          <InfoRow label="Birth Date" value={formatDateShort(resident?.birthdate)} />
          <InfoRow label="Verification Status" value={verificationStatus} />
          <InfoRow label="Member Since" value={formatSince(resident?.created_at as any)} />
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, loggingOut && styles.logoutBtnDisabled]}
          onPress={handleLogout}
          activeOpacity={0.85}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <View style={styles.logoutLoadingRow}>
              <ActivityIndicator color="#EF4444" />
              <Text style={styles.logoutText}>Logging out…</Text>
            </View>
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.logoutText}>Logout</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG },

  header: {
    backgroundColor: COLORS.GREEN,
    paddingTop: 28,
    paddingBottom: 34,
    alignItems: "center",
  },
  name: {
    marginTop: 10,
    fontSize: 22,
    color: "#FFFFFF",
    fontFamily: "Manrope_700Bold",
  },
  email: {
    marginTop: 6,
    fontSize: 13,
    color: "#D1D5DB",
    fontFamily: "Manrope_400Regular",
  },

  body: { paddingHorizontal: 20, paddingTop: 18 },

  card: {
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  infoLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    fontFamily: "Manrope_400Regular",
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.TEXT,
    fontFamily: "Manrope_600SemiBold",
  },

  logoutBtn: {
    marginTop: 22,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  logoutBtnDisabled: {
    opacity: 0.7,
  },

  logoutLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  logoutText: {
    color: "#EF4444",
    fontSize: 16,
    fontFamily: "Manrope_700Bold",
  },
});