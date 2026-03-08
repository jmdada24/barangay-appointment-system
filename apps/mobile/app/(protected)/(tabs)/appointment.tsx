import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import TabHeader from "@/components/layout/TabHeader";
import { COLORS } from "@/constants/theme";
import { useAuth } from "@/providers/AuthProvider";
import {
  cancelAppointment,
  type Appointment as DbAppointment,
  type AppointmentStatus as DbStatus,
  getMyAppointmentsPaged,
} from "@/services/appointments.service";
import { getSubmittedFeedbackAppointmentIds } from "@/services/feedback.service";

type AppointmentStatus = "Pending" | "Complete" | "Cancelled";

type Appointment = {
  id: string;
  dbId: number;
  serviceName: string;
  referenceNumber: string;
  date: string;
  fullDate: string;
  timeRange: string;
  status: AppointmentStatus;
  purpose: string;
  bookedDate: string;
};

function statusColor(s: AppointmentStatus) {
  if (s === "Pending") return COLORS.WARNING;
  if (s === "Complete") return "#2563EB";
  return COLORS.MUTED;
}

const DetailsModal = React.memo(function DetailsModal({
  visible,
  appointment,
  onClose,
  onCancel,
}: {
  visible: boolean;
  appointment: Appointment | null;
  onClose: () => void;
  onCancel: () => void;
}) {
  if (!appointment) return null;

  const rows: Array<[string, string]> = [
    ["Service", appointment.serviceName],
    ["Date", appointment.fullDate],
    ["Time Slot", appointment.timeRange],
    ["Purpose", appointment.purpose],
    ["Status", appointment.status],
    ["Booked Date", appointment.bookedDate],
  ];

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Appointment Details</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {rows.map(([k, v]) => (
              <View key={k} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{k}</Text>
                <Text style={[styles.detailValue, k === "Status" && { color: statusColor(appointment.status) }]}>
                  {v}
                </Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.modalBtnRow}>
            {appointment.status === "Pending" && (
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.9}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.9}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

const AppointmentCard = React.memo(function AppointmentCard({
  item,
  onView,
  onRate,
  isFeedbackSubmitted,
}: {
  item: Appointment;
  onView: () => void;
  onRate: () => void;
  isFeedbackSubmitted: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{item.serviceName}</Text>
        <Text style={[styles.status, { color: statusColor(item.status) }]}>{item.status}</Text>
      </View>

      <Text style={styles.ref}>Ref: {item.referenceNumber}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.MUTED} />
          <Text style={styles.metaText}>{item.date}</Text>
        </View>

        <View style={[styles.metaItem, { marginLeft: 14 }]}>
          <Ionicons name="time-outline" size={16} color={COLORS.MUTED} />
          <Text style={styles.metaText}>{item.timeRange}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.viewBtn} onPress={onView} activeOpacity={0.9}>
        <Text style={styles.viewBtnText}>View Details</Text>
      </TouchableOpacity>

      {item.status === "Complete" && (
        <View style={{ alignItems: "flex-end", marginTop: 12 }}>
          <TouchableOpacity
            style={[styles.rateBtn, isFeedbackSubmitted && styles.rateBtnDisabled]}
            onPress={onRate}
            activeOpacity={isFeedbackSubmitted ? 1 : 0.9}
            disabled={isFeedbackSubmitted}
          >
            <Text style={[styles.rateBtnText, isFeedbackSubmitted && styles.rateBtnTextDisabled]}>
              {isFeedbackSubmitted ? "Feedback Submitted!" : "Rate Us"}
            </Text>
            <Ionicons
              name={isFeedbackSubmitted ? "checkmark-circle-outline" : "star-outline"}
              size={16}
              color={isFeedbackSubmitted ? "#6B7280" : "#fff"}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

type FilterKey = "all" | "pending" | "completed" | "cancelled";

function toDbStatus(filter: FilterKey): "all" | DbStatus {
  if (filter === "all") return "all";
  if (filter === "pending") return "pending";
  if (filter === "completed") return "completed";
  return "cancelled";
}

export default function AppointmentTab() {
  const router = useRouter();
  const params = useLocalSearchParams<{ refresh?: string }>();
  const { resident, residentLoading, loading: authLoading, refreshResident } = useAuth();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);

  const PAGE_SIZE = 10;

  const [pages, setPages] = useState<Record<number, DbAppointment[]>>({});
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [submittedFeedbackIds, setSubmittedFeedbackIds] = useState<number[]>([]);

  const inFlightRef = useRef(false);

  const resetPaging = useCallback(() => {
    setPages({});
    setPage(0);
    setHasMore(true);
    setSubmittedFeedbackIds([]);
  }, []);

  const loadFeedbackStatusForAppointments = useCallback(async (appointments: DbAppointment[]) => {
    const completedIds = appointments
      .filter((item) => item.status === "completed")
      .map((item) => item.id);

    if (!completedIds.length) {
      setSubmittedFeedbackIds([]);
      return;
    }

    const ids = await getSubmittedFeedbackAppointmentIds(completedIds);
    setSubmittedFeedbackIds(ids);
  }, []);

  const loadPage = useCallback(
    async (targetPage: number, opts?: { force?: boolean }) => {
      if (!resident?.id) {
        setPages({});
        setLoading(false);
        setHasMore(false);
        setPage(0);
        setSubmittedFeedbackIds([]);
        return;
      }

      const force = !!opts?.force;

      if (!force && pages[targetPage]) {
        setPage(targetPage);
        await loadFeedbackStatusForAppointments(pages[targetPage]);
        return;
      }

      if (inFlightRef.current) return;
      inFlightRef.current = true;

      setLoadingPage(true);
      try {
        const res = await getMyAppointmentsPaged({
          residentId: resident.id,
          page: targetPage,
          pageSize: PAGE_SIZE,
          statusFilter: toDbStatus(filter),
        });

        setPages((prev) => ({ ...prev, [targetPage]: res.items }));
        setHasMore(res.hasMore);
        setPage(targetPage);
        await loadFeedbackStatusForAppointments(res.items);
      } catch (e: any) {
        Alert.alert("Error", e?.message ?? "Failed to load appointments");
      } finally {
        setLoadingPage(false);
        inFlightRef.current = false;
      }
    },
    [resident?.id, filter, pages, loadFeedbackStatusForAppointments]
  );

  const loadFirstPage = useCallback(async () => {
    if (!resident?.id) {
      setPages({});
      setLoading(false);
      setHasMore(false);
      setPage(0);
      setSubmittedFeedbackIds([]);
      return;
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    setLoading(true);
    try {
      const res = await getMyAppointmentsPaged({
        residentId: resident.id,
        page: 0,
        pageSize: PAGE_SIZE,
        statusFilter: toDbStatus(filter),
      });

      setPages({ 0: res.items });
      setHasMore(res.hasMore);
      setPage(0);
      await loadFeedbackStatusForAppointments(res.items);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load appointments");
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [resident?.id, filter, loadFeedbackStatusForAppointments]);

  useEffect(() => {
    if (authLoading) return;
    if (residentLoading) return;

    if (!resident?.id) {
      refreshResident();
    }
  }, [authLoading, residentLoading, resident?.id, refreshResident]);

  useEffect(() => {
    if (residentLoading) return;
    loadFirstPage();
  }, [residentLoading, loadFirstPage, params.refresh]);

  useEffect(() => {
    if (residentLoading) return;
    resetPaging();
    loadFirstPage();
  }, [filter, residentLoading, resetPaging, loadFirstPage]);

  const dbItems = pages[page] ?? [];

  const DATA: Appointment[] = useMemo(() => {
    function mapStatus(s: DbAppointment["status"]): AppointmentStatus {
      if (s === "completed") return "Complete";
      if (s === "cancelled" || s === "rejected") return "Cancelled";
      return "Pending";
    }

    function timeRangeFromSlot(slot: DbAppointment["time_slot"]) {
      return slot === "morning" ? "8:00 AM - 11:00 AM" : "1:00 PM - 4:00 PM";
    }

    function formatShortDate(dateStr?: string | null) {
      if (!dateStr) return "—";
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
    }

    function formatFullDate(dateStr?: string | null) {
      if (!dateStr) return "—";
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    }

    return dbItems.map((x) => {
      const scheduleDate = (x as any).schedules?.date ?? null;

      return {
        id: String(x.id),
        dbId: x.id,
        serviceName: (x as any).services?.service_name ?? "Service",
        referenceNumber: `APT-${x.id}`,
        date: formatShortDate(scheduleDate),
        fullDate: formatFullDate(scheduleDate),
        timeRange: timeRangeFromSlot(x.time_slot),
        status: mapStatus(x.status),
        purpose: x.purpose ?? "—",
        bookedDate: formatShortDate(x.created_at),
      };
    });
  }, [dbItems]);

  const handleCancel = async () => {
    if (!resident?.id || !selected) return;

    Alert.alert("Cancel Appointment", "Are you sure you want to cancel this appointment?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelAppointment({
              appointmentId: selected.dbId,
              residentId: resident.id,
            });

            setOpen(false);
            setSelected(null);
            await loadFirstPage();
          } catch (e: any) {
            Alert.alert("Cancel failed", e?.message ?? "Unable to cancel appointment.");
          }
        },
      },
    ]);
  };

  const onView = useCallback((item: Appointment) => {
    setSelected(item);
    setOpen(true);
  }, []);

  const onRate = useCallback(
    (item: Appointment) => {
      router.push({
        pathname: "/(protected)/(tabs)/rate",
        params: { appointmentId: String(item.dbId) },
      });
    },
    [router]
  );

  const maxLoadedPage = useMemo(() => {
    const keys = Object.keys(pages).map((k) => Number(k)).filter((n) => Number.isFinite(n));
    return keys.length ? Math.max(...keys) : 0;
  }, [pages]);

  const totalKnownPages = useMemo(() => {
    return hasMore ? maxLoadedPage + 2 : maxLoadedPage + 1;
  }, [hasMore, maxLoadedPage]);

  const pageNumbers = useMemo(() => {
    const window = 5;
    const half = Math.floor(window / 2);

    let start = Math.max(0, page - half);
    let end = Math.min(totalKnownPages - 1, start + window - 1);
    start = Math.max(0, end - window + 1);

    const arr: number[] = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  }, [page, totalKnownPages]);

  const canPrev = page > 0 && !loading && !loadingPage;
  const canNext = (hasMore || page < maxLoadedPage) && !loading && !loadingPage;

  const goPrev = useCallback(() => {
    if (!canPrev) return;
    loadPage(page - 1);
  }, [canPrev, loadPage, page]);

  const goNext = useCallback(() => {
    if (!canNext) return;
    loadPage(page + 1);
  }, [canNext, loadPage, page]);

  return (
    <SafeAreaView style={styles.screen} edges={["left", "right", "bottom"]}>
      <TabHeader
        title="My Appointments"
        subtitle="Track your service requests"
        topBarColor={COLORS.GREEN}
        backgroundColor={COLORS.CARD}
      />

      <View style={styles.filterBar}>
        {([
          { key: "all", label: "All" },
          { key: "pending", label: "Pending" },
          { key: "completed", label: "Complete" },
          { key: "cancelled", label: "Cancelled" },
        ] as const).map((x) => {
          const active = filter === x.key;
          return (
            <TouchableOpacity
              key={x.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(x.key)}
              activeOpacity={0.9}
              disabled={loading || loadingPage}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{x.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.pagerBar}>
        <TouchableOpacity
          style={[styles.pagerBtn, !canPrev && styles.pagerBtnDisabled]}
          onPress={goPrev}
          disabled={!canPrev}
        >
          <Ionicons name="chevron-back" size={18} color={!canPrev ? COLORS.MUTED : COLORS.GREEN} />
        </TouchableOpacity>

        <View style={styles.pageNumsRow}>
          {pageNumbers[0] > 0 && (
            <>
              <PageNumBtn pageNum={0} current={page} onPress={loadPage} disabled={loading || loadingPage} />
              {pageNumbers[0] > 1 && <Text style={styles.ellipsis}>…</Text>}
            </>
          )}

          {pageNumbers.map((p) => (
            <PageNumBtn key={p} pageNum={p} current={page} onPress={loadPage} disabled={loading || loadingPage} />
          ))}

          {pageNumbers[pageNumbers.length - 1] < totalKnownPages - 1 && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalKnownPages - 2 && <Text style={styles.ellipsis}>…</Text>}
              <PageNumBtn
                pageNum={totalKnownPages - 1}
                current={page}
                onPress={loadPage}
                disabled={loading || loadingPage}
              />
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.pagerBtn, !canNext && styles.pagerBtnDisabled]}
          onPress={goNext}
          disabled={!canNext}
        >
          <Ionicons name="chevron-forward" size={18} color={!canNext ? COLORS.MUTED : COLORS.GREEN} />
        </TouchableOpacity>
      </View>

      <Text style={styles.pageMeta}>
        Page {page + 1} of {totalKnownPages}
        {loadingPage ? "  •  Loading…" : ""}
      </Text>

      <FlatList
        data={DATA}
        keyExtractor={(x) => x.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <AppointmentCard
            item={item}
            onView={() => onView(item)}
            onRate={() => onRate(item)}
            isFeedbackSubmitted={submittedFeedbackIds.includes(item.dbId)}
          />
        )}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator />
              <Text style={styles.emptyText}>Loading appointments…</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No appointments yet.</Text>
            </View>
          )
        }
        refreshing={loading}
        onRefresh={loadFirstPage}
      />

      <DetailsModal
        visible={open}
        appointment={selected}
        onClose={() => {
          setOpen(false);
          setSelected(null);
        }}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  );
}

const PageNumBtn = React.memo(function PageNumBtn({
  pageNum,
  current,
  onPress,
  disabled,
}: {
  pageNum: number;
  current: number;
  onPress: (p: number, opts?: { force?: boolean }) => void;
  disabled: boolean;
}) {
  const active = pageNum === current;
  return (
    <TouchableOpacity
      style={[styles.pageNumBtn, active && styles.pageNumBtnActive, disabled && styles.pageNumBtnDisabled]}
      onPress={() => onPress(pageNum)}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <Text style={[styles.pageNumText, active && styles.pageNumTextActive]}>{pageNum + 1}</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.BG },
  listContent: { padding: 18, paddingBottom: 140 },

  filterBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 2,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.CARD,
  },
  filterChipActive: {
    borderColor: COLORS.GREEN,
    backgroundColor: "#F0F9F6",
  },
  filterChipText: {
    color: COLORS.MUTED,
    fontFamily: "Manrope_700Bold",
    fontSize: 12,
  },
  filterChipTextActive: { color: COLORS.GREEN },

  pagerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 10,
  },
  pagerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    justifyContent: "center",
    alignItems: "center",
  },
  pagerBtnDisabled: { opacity: 0.5 },
  pageNumsRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  pageNumBtn: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    justifyContent: "center",
    alignItems: "center",
  },
  pageNumBtnActive: { borderColor: COLORS.GREEN, backgroundColor: "#F0F9F6" },
  pageNumBtnDisabled: { opacity: 0.6 },
  pageNumText: { color: COLORS.MUTED, fontFamily: "Manrope_700Bold", fontSize: 12 },
  pageNumTextActive: { color: COLORS.GREEN },

  ellipsis: { color: COLORS.MUTED, fontFamily: "Manrope_700Bold", paddingHorizontal: 2 },
  pageMeta: {
    textAlign: "center",
    color: COLORS.MUTED,
    fontFamily: "Manrope_600SemiBold",
    paddingBottom: 6,
  },

  emptyWrap: { paddingTop: 30, alignItems: "center" },
  emptyText: { color: COLORS.MUTED, textAlign: "center", marginTop: 10, fontFamily: "Manrope_600SemiBold" },

  card: {
    backgroundColor: COLORS.CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 16, color: COLORS.TEXT, fontFamily: "Manrope_700Bold" },
  status: { fontSize: 12, fontFamily: "Manrope_700Bold" },

  ref: { marginTop: 6, color: COLORS.MUTED, fontFamily: "Manrope_600SemiBold" },

  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 14 },
  metaItem: { flexDirection: "row", alignItems: "center" },
  metaText: { marginLeft: 6, color: "#374151", fontFamily: "Manrope_600SemiBold" },

  viewBtn: {
    borderWidth: 1,
    borderColor: COLORS.GREEN,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  viewBtnText: { color: COLORS.GREEN, fontFamily: "Manrope_700Bold" },

  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.GREEN,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  rateBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },
  rateBtnText: { color: "#fff", fontFamily: "Manrope_700Bold" },
  rateBtnTextDisabled: { color: "#6B7280" },

  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.35)" },
  modalBackdrop: { flex: 1 },

  modalSheet: {
    backgroundColor: COLORS.CARD,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 28,
    maxHeight: "80%",
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.BORDER,
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, color: COLORS.TEXT, fontFamily: "Manrope_700Bold", marginBottom: 10 },

  detailRow: { marginBottom: 12 },
  detailLabel: { color: "#9CA3AF", fontSize: 12, marginBottom: 4, fontFamily: "Manrope_600SemiBold" },
  detailValue: { color: COLORS.TEXT, fontFamily: "Manrope_700Bold" },

  modalBtnRow: { flexDirection: "row", gap: 12, marginTop: 16 },

  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.ERROR,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelBtnText: { color: COLORS.ERROR, fontFamily: "Manrope_700Bold" },

  closeBtn: {
    flex: 1,
    backgroundColor: COLORS.GREEN,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontFamily: "Manrope_700Bold" },
});