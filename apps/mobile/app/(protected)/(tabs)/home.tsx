import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { Asset } from "expo-asset";
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import TabSafeScroll from "@/components/layout/TabSafeScroll";
import { COLORS } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";
import { getAnnouncements, type Announcement } from "@/services/announcements.service";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { resident, user } = useAuth();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);

  // ✅ pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    setLoadingAnnouncements(true);
    try {
      const data = await getAnnouncements(3);
      setAnnouncements(data);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!mounted) return;
      setLoadingAnnouncements(true);
      try {
        const data = await getAnnouncements(3);
        if (mounted) setAnnouncements(data);
      } catch {
        if (mounted) setAnnouncements([]);
      } finally {
        if (mounted) setLoadingAnnouncements(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // ✅ pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAnnouncements();
    } finally {
      setRefreshing(false);
    }
  }, [loadAnnouncements]);

  const handleDownloadPDF = async () => {
    try {
      const pdfAsset = await Asset.loadAsync(require("@/assets/documents/barangay-bayabas-citizens-charter.pdf"));

      const localUri = pdfAsset[0]?.localUri;
      if (!localUri) return;

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri, {
          mimeType: "application/pdf",
          dialogTitle: "Download Citizen Charter",
        });
      }
    } catch (e) {
      console.error("PDF download/share error:", e);
    }
  };

  const displayName = resident?.name || user?.email?.split("@")[0] || "Resident";

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      {/* ✅ Paint the status-bar SAFE AREA green (important on iOS) */}
      <View style={{ height: insets.top, backgroundColor: COLORS.GREEN }} />

      {/* ✅ Make status bar text/icons white */}
      <StatusBar barStyle="light-content" backgroundColor={COLORS.GREEN} />

      <TabSafeScroll
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person-outline" size={26} color="#fff" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeText}>Welcome, {displayName}!</Text>
              <Text style={styles.residentText}>Barangay Bayabas Resident</Text>
            </View>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.bookNowButton}
              activeOpacity={0.85}
              onPress={() => router.push("/(protected)/(tabs)/book")}
            >
              <View style={styles.iconCircleWhite}>
                <Ionicons name="add" size={24} color={COLORS.GREEN} />
              </View>
              <Text style={styles.bookNowText}>Book Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.myRequestsButton}
              activeOpacity={0.85}
              onPress={() => router.push("/(protected)/(tabs)/appointment")}
            >
              <View style={styles.iconCircleOutline}>
                <Ionicons name="document-text-outline" size={24} color={COLORS.TEXT} />
              </View>
              <Text style={styles.myRequestsText}>My Requests</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Citizen’s Charter</Text>

          <View style={styles.charterCard}>
            <View style={styles.charterHeaderRow}>
              <View style={styles.charterIconBox}>
                <Ionicons name="person-outline" size={18} color={COLORS.TEXT} />
                <View style={styles.charterIconLine} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.charterTitle}>Citizen’s Charter</Text>
                <Text style={styles.charterDesc}>
                  Learn about our commitment to quality service and your rights as a resident
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.charterViewBtn} activeOpacity={0.85} onPress={() => router.push("/charter")}>
              <Ionicons name="document-text-outline" size={18} color={COLORS.TEXT} />
              <Text style={styles.charterViewText}>View Document</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.charterDownloadBtn} activeOpacity={0.9} onPress={handleDownloadPDF}>
              <Ionicons name="download-outline" size={18} color="#fff" />
              <Text style={styles.charterDownloadText}>Download PDF</Text>
            </TouchableOpacity>
          </View>

          {/* ✅ RECENT ANNOUNCEMENTS (kept) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Recent Announcements</Text>
            <TouchableOpacity onPress={() => router.push("/(protected)/(tabs)/news")} activeOpacity={0.8}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 15 }} />

          {loadingAnnouncements ? (
            <View style={styles.card}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="megaphone-outline" size={26} color={COLORS.TEXT} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>Loading…</Text>
                <Text style={styles.cardSubtitle}>Wait for a while...</Text>
              </View>
            </View>
          ) : announcements.length === 0 ? (
            <View style={styles.card}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="megaphone-outline" size={26} color={COLORS.TEXT} />
              </View>
              <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle}>No announcements</Text>
                <Text style={styles.cardSubtitle}>Check back later for updates</Text>
              </View>
            </View>
          ) : (
            announcements.map((a) => (
              <View key={a.id} style={styles.card}>
                <View style={styles.cardIconContainer}>
                  <Ionicons name="megaphone-outline" size={26} color={COLORS.TEXT} />
                </View>
                <View style={styles.cardTextContainer}>
                  <Text style={styles.cardTitle}>{a.title}</Text>
                  <Text style={styles.cardSubtitle} numberOfLines={2}>
                    {a.content}
                  </Text>
                  <Text style={styles.timestampText}>
                    {new Date(a.posted_date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </TabSafeScroll>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG },

  header: { backgroundColor: COLORS.GREEN, paddingBottom: 22, paddingHorizontal: 20 },
  headerRow: { flexDirection: "row", alignItems: "center", paddingTop: 14 },

  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  welcomeText: { color: "#fff", fontSize: 20, fontFamily: "Manrope_700Bold" },
  residentText: { color: "#D1D5DB", fontSize: 14, marginTop: 4, fontFamily: "Manrope_400Regular" },

  contentContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  sectionTitle: { fontSize: 18, color: COLORS.TEXT, marginBottom: 15, fontFamily: "Manrope_700Bold" },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  viewAllText: { color: COLORS.GREEN, fontSize: 14, fontFamily: "Manrope_700Bold" },

  actionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 25 },

  bookNowButton: {
    flex: 0.48,
    backgroundColor: COLORS.GREEN,
    borderRadius: 12,
    paddingVertical: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.GREEN,
  },

  myRequestsButton: {
    flex: 0.48,
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    paddingVertical: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },

  iconCircleWhite: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.CARD,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  iconCircleOutline: { width: 40, height: 40, justifyContent: "center", alignItems: "center", marginBottom: 10 },

  bookNowText: { color: "#fff", fontSize: 16, fontFamily: "Manrope_700Bold" },
  myRequestsText: { color: COLORS.TEXT, fontSize: 16, fontFamily: "Manrope_700Bold" },

  charterCard: {
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginBottom: 15,
  },

  charterHeaderRow: { flexDirection: "row", gap: 12, marginBottom: 14 },

  charterIconBox: {
    width: 34,
    height: 44,
    borderWidth: 1.5,
    borderColor: COLORS.TEXT,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 2,
  },
  charterIconLine: { width: 14, height: 1.5, backgroundColor: COLORS.TEXT, marginTop: 2 },

  charterTitle: { fontSize: 16, color: COLORS.TEXT, fontFamily: "Manrope_700Bold" },
  charterDesc: { marginTop: 4, fontSize: 13, lineHeight: 18, color: "#4B5563", fontFamily: "Manrope_400Regular" },

  charterViewBtn: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 10,
  },
  charterViewText: { fontFamily: "Manrope_700Bold", color: COLORS.TEXT },

  charterDownloadBtn: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B63F6",
    borderRadius: 10,
    paddingVertical: 12,
  },
  charterDownloadText: { fontFamily: "Manrope_700Bold", color: "#fff" },

  card: {
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  cardIconContainer: { marginRight: 15, marginTop: 2 },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontSize: 16, color: COLORS.TEXT, marginBottom: 4, fontFamily: "Manrope_700Bold" },
  cardSubtitle: { fontSize: 13, color: COLORS.MUTED, lineHeight: 18, fontFamily: "Manrope_400Regular" },
  timestampText: { fontSize: 12, color: COLORS.MUTED, marginTop: 8, fontFamily: "Manrope_400Regular" },
});