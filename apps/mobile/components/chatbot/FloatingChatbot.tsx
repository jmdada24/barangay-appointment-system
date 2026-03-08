import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  PanResponder,
  Dimensions,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getChatbotGreetingMobile,
  sendChatMessageMobile,
} from "@/services/chatbot.service";

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const GREEN = "#062E24";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Session limiter (user questions per chat session)
const MAX_USER_TURNS = 10;

export default function FloatingChatbot() {
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  // count only user questions
  const userTurns = messages.filter((m) => m.role === "user").length;
  const limitReached = userTurns >= MAX_USER_TURNS;

  function closeChat() {
    // close + reset so reopening starts a fresh session
    setOpen(false);
    setMessages([]);
    setInput("");
    setErr(null);
    setLoading(false);
  }

  /*
  ========================
  FLOATING ICON DRAGGING
  ========================
  */
  const fabPan = useRef(
    new Animated.ValueXY({
      x: SCREEN_WIDTH - 80,
      y: SCREEN_HEIGHT - 220,
    })
  ).current;

  const fabResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,

      onPanResponderGrant: () => {
        fabPan.setOffset({
          x: (fabPan.x as any)._value,
          y: (fabPan.y as any)._value,
        });
        fabPan.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: Animated.event(
        [null, { dx: fabPan.x, dy: fabPan.y }],
        { useNativeDriver: false }
      ),

      onPanResponderRelease: () => {
        fabPan.flattenOffset();

        let x = (fabPan.x as any)._value;
        let y = (fabPan.y as any)._value;

        const snapX = x < SCREEN_WIDTH / 2 ? 10 : SCREEN_WIDTH - 70;

        if (y < 50) y = 50;
        if (y > SCREEN_HEIGHT - 150) y = SCREEN_HEIGHT - 150;

        Animated.spring(fabPan, {
          toValue: { x: snapX, y },
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  /*
  ========================
  LOAD GREETING
  ========================
  */
  useEffect(() => {
    if (!open) return;
    if (messages.length > 0) return;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await getChatbotGreetingMobile();
        if (res.success && res.data?.response) {
          setMessages([
            {
              id: "greeting",
              role: "assistant",
              content: res.data.response,
              ts: Date.now(),
            },
          ]);
        } else {
          setErr(res.error ?? "Failed to load greeting");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open, messages.length]);

  /*
  ========================
  AUTO SCROLL
  ========================
  */
  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);
    return () => clearTimeout(t);
  }, [messages, loading, err]);

  /*
  ========================
  SEND MESSAGE
  ========================
  */
  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    // limiter: stop after MAX_USER_TURNS
    if (limitReached) {
      setErr(
        "You reached the maximum number of questions for this session. Close and reopen the chat to start again."
      );
      return;
    }

    setInput("");
    setErr(null);

    const userMsg: Msg = {
      id: uid(),
      role: "user",
      content: text,
      ts: Date.now(),
    };

    setMessages((p) => [...p, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("model" as const),
        content: m.content,
      }));

      const res = await sendChatMessageMobile(text, history);

      if (res.success && res.data?.response) {
        const botMsg: Msg = {
          id: uid(),
          role: "assistant",
          content: res.data.response,
          ts: Date.now(),
        };

        setMessages((p) => [...p, botMsg]);
      } else {
        setErr(res.error ?? "Failed response");
      }
    } catch (e: any) {
      setErr(e?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }

  /*
  ========================
  FLOATING ICON
  ========================
  */
  if (!open) {
    return (
      <Animated.View
        style={[
          styles.fabWrap,
          {
            transform: [{ translateX: fabPan.x }, { translateY: fabPan.y }],
          },
        ]}
        {...fabResponder.panHandlers}
      >
        <Pressable onPress={() => setOpen(true)} style={styles.fab}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={26}
            color="#fff"
          />
        </Pressable>
      </Animated.View>
    );
  }

  /*
  ========================
  CHAT PANEL
  ========================
  */
  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={closeChat}>
      <Pressable style={styles.backdrop} onPress={closeChat} />

      <KeyboardAvoidingView
        style={styles.keyboardOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={10}
      >
        <View style={styles.panel}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Barangay Assistant</Text>
              <Text style={styles.headerSub}>Ask about our services</Text>
            </View>

            <Pressable onPress={closeChat} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color="#fff" />
            </Pressable>
          </View>

          <SafeAreaView style={styles.body}>
            <ScrollView
              ref={scrollRef}
              style={styles.scrollView}
              contentContainerStyle={styles.msgList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Optional limiter notice */}
              {limitReached && (
                <View style={styles.notice}>
                  <Text style={styles.noticeText}>
                    Session limit reached ({MAX_USER_TURNS} questions). Close and reopen the chat to start again.
                  </Text>
                </View>
              )}

              {messages.map((m) => (
                <View
                  key={m.id}
                  style={[
                    styles.bubbleRow,
                    m.role === "user" ? styles.rowRight : styles.rowLeft,
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      m.role === "user" ? styles.userBubble : styles.botBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.bubbleText,
                        m.role === "user" ? styles.userText : styles.botText,
                      ]}
                    >
                      {m.content}
                    </Text>
                  </View>
                </View>
              ))}

              {loading && (
                <View style={[styles.bubbleRow, styles.rowLeft]}>
                  <View style={[styles.bubble, styles.botBubble]}>
                    <ActivityIndicator />
                  </View>
                </View>
              )}

              {err && (
                <View style={[styles.bubbleRow, styles.rowLeft]}>
                  <View style={[styles.bubble, styles.botBubble]}>
                    <Text style={[styles.bubbleText, styles.botText]}>{err}</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View
              style={[
                styles.inputRow,
                { paddingBottom: Math.max(12, insets.bottom) },
              ]}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask a question..."
                placeholderTextColor="#6B7280"
                style={styles.input}
                onSubmitEditing={send}
                editable={!loading && !limitReached}
                returnKeyType="send"
                blurOnSubmit={false}
              />
              <Pressable
                onPress={send}
                style={[
                  styles.sendBtn,
                  (loading || limitReached) && { opacity: 0.6 },
                ]}
                disabled={loading || limitReached}
              >
                <Ionicons name="send" size={16} color="#fff" />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/*
================
STYLES
================
*/
const styles = StyleSheet.create({
  fabWrap: { position: "absolute", zIndex: 999 },

  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },

  keyboardOverlay: {
    flex: 1,
    justifyContent: "center",
  },

  panel: {
    position: "absolute",
    top: "10%",
    left: "2.5%",
    width: "95%",
    height: "80%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    elevation: 10,
  },

  header: {
    backgroundColor: GREEN,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  headerTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  headerSub: {
    color: "#D1FAE5",
    fontSize: 12,
  },

  closeBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  body: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  scrollView: {
    flex: 1,
  },

  msgList: {
    padding: 12,
    paddingBottom: 12,
    flexGrow: 1,
  },

  notice: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },

  noticeText: {
    color: "#92400E",
    fontSize: 12,
  },

  bubbleRow: {
    marginBottom: 10,
    flexDirection: "row",
    width: "100%",
  },

  rowLeft: {
    justifyContent: "flex-start",
  },

  rowRight: {
    justifyContent: "flex-end",
  },

  bubble: {
    maxWidth: "82%",
    borderRadius: 14,
    padding: 10,
    flexShrink: 1,
  },

  userBubble: {
    backgroundColor: GREEN,
  },

  botBubble: {
    backgroundColor: "#E5E7EB",
  },

  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },

  userText: {
    color: "#fff",
  },

  botText: {
    color: "#111",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#fff",
    color: "#111",
    fontSize: 16,
  },

  sendBtn: {
    width: 40,
    height: 40,
    marginLeft: 10,
    borderRadius: 12,
    backgroundColor: GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
});