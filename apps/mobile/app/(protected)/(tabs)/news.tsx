import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import TabHeader from "@/components/layout/TabHeader";
import { COLORS } from "@/constants/theme";
import { getAnnouncements, type Announcement } from "@/services/announcements.service";

// ❌ realtime removed
// import { useAnnouncementsRealtime } from "@/hooks/realtime/useAnnouncementsRealtime";

type NewsItem = {
  id: string;
  title: string;
  summary: string;
  fullContent: string;
  formattedDate: string;
  type?: string;
};

function NewsDetailsModal({
  visible,
  item,
  onClose,
}: {
  visible: boolean;
  item: NewsItem | null;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.dragHandle} />
            <TouchableOpacity onPress={onClose} style={styles.closeIcon} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={COLORS.MUTED} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalTitleRow}>
              <Ionicons name="megaphone-outline" size={22} color={COLORS.TEXT} style={{ marginTop: 2 }} />
              <Text style={styles.modalTitle}>{item.title}</Text>
            </View>

            <View style={styles.modalDateRow}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.MUTED} />
              <Text style={styles.modalDateText}>{item.formattedDate}</Text>
            </View>

            <View style={styles.divider} />
            <Text style={styles.modalBodyText}>{item.fullContent}</Text>
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.closeButtonText}>Close Article</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function NewsCard({ item, onPress }: { item: NewsItem; onPress: (i: NewsItem) => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="megaphone-outline" size={22} color={COLORS.TEXT} style={styles.cardIcon} />
          <Text style={styles.cardTitle}>{item.title}</Text>
        </View>

        <Text style={styles.cardSummary}>{item.summary}</Text>

        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={16} color={COLORS.MUTED} />
          <Text style={styles.dateText}>{item.formattedDate}</Text>
        </View>

        <TouchableOpacity style={styles.readMoreContainer} onPress={() => onPress(item)} activeOpacity={0.7}>
          <Text style={styles.readMoreText}>Read More</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function NewsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState<NewsItem | null>(null);

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAnnouncements(50);
      setItems(data);
    } catch (e: any) {
      setItems([]);
      alert(e?.message ?? "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const NEWS_DATA: NewsItem[] = useMemo(() => {
    function formatPostedDate(d: string) {
      const date = new Date(d);
      return `Posted on ${date.toLocaleDateString(undefined, {
        month: "long",
        day: "2-digit",
        year: "numeric",
      })}`;
    }

    function summarize(text: string, maxLen = 140) {
      const t = (text || "").replace(/\s+/g, " ").trim();
      if (t.length <= maxLen) return t;
      return t.slice(0, maxLen).trim() + "…";
    }

    return items.map((a) => ({
      id: String(a.id),
      title: a.title,
      summary: summarize(a.content),
      fullContent: a.content,
      formattedDate: formatPostedDate(a.posted_date),
      type: a.type,
    }));
  }, [items]);

  const open = (item: NewsItem) => {
    setSelected(item);
    setModalVisible(true);
  };

  const close = () => {
    setModalVisible(false);
    setSelected(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <TabHeader
        title="Announcements"
        subtitle="Stay updated with barangay news"
        topBarColor={COLORS.GREEN}
        backgroundColor={COLORS.CARD}
      />

      <FlatList
        data={NEWS_DATA}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <NewsCard item={item} onPress={open} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator />
              <Text style={styles.emptyText}>Loading announcements…</Text>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No announcements yet.</Text>
            </View>
          )
        }
        // ✅ Pull-to-refresh
        refreshing={loading}
        onRefresh={load}
      />

      <NewsDetailsModal visible={modalVisible} item={selected} onClose={close} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG },

  listContent: {
    padding: 16,
    paddingBottom: 140,
  },

  emptyWrap: { paddingTop: 30, alignItems: "center" },
  emptyText: {
    color: COLORS.MUTED,
    textAlign: "center",
    marginTop: 10,
    fontFamily: "Manrope_400Regular",
  },

  card: {
    backgroundColor: COLORS.CARD,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    overflow: "hidden",
  },
  cardContent: { padding: 16 },

  cardHeaderRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  cardIcon: { marginRight: 12, marginTop: 2 },

  cardTitle: {
    flex: 1,
    fontSize: 16,
    color: COLORS.TEXT,
    lineHeight: 22,
    fontFamily: "Manrope_700Bold",
  },

  cardSummary: {
    fontSize: 14,
    color: COLORS.MUTED,
    lineHeight: 20,
    marginBottom: 14,
    fontFamily: "Manrope_400Regular",
  },

  dateRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  dateText: { fontSize: 12, color: COLORS.MUTED, marginLeft: 6, fontFamily: "Manrope_400Regular" },

  readMoreContainer: { alignItems: "flex-end", marginTop: 6 },
  readMoreText: { fontSize: 14, color: COLORS.TEXT, fontFamily: "Manrope_600SemiBold" },

  // Modal
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalBackdrop: { flex: 1 },
  modalContent: {
    backgroundColor: COLORS.CARD,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 34,
    maxHeight: "85%",
  },
  modalHeader: { alignItems: "center", marginBottom: 14, position: "relative" },
  dragHandle: { width: 48, height: 5, backgroundColor: COLORS.BORDER, borderRadius: 3 },
  closeIcon: { position: "absolute", right: 0, top: -6, padding: 6 },

  modalTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  modalTitle: { flex: 1, fontSize: 18, color: COLORS.TEXT, fontFamily: "Manrope_700Bold" },

  modalDateRow: { flexDirection: "row", alignItems: "center", marginTop: 10, marginBottom: 14 },
  modalDateText: { fontSize: 13, color: COLORS.MUTED, marginLeft: 6, fontFamily: "Manrope_400Regular" },

  divider: { height: 1, backgroundColor: COLORS.BORDER, marginBottom: 14 },

  modalBodyText: { fontSize: 15, color: "#374151", lineHeight: 24, fontFamily: "Manrope_400Regular" },

  closeButton: {
    backgroundColor: COLORS.GREEN,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 14,
  },
  closeButtonText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Manrope_700Bold" },
});