// components/layout/TabHeader.tsx
import React from "react";
import { View, Text, StyleSheet, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants/theme";

type Props = {
  title: string;
  subtitle?: string;

  /** color behind status bar/top area */
  topBarColor?: string; // default COLORS.GREEN
  /** header background (content area) */
  backgroundColor?: string; // default COLORS.CARD
};

export default function TabHeader({
  title,
  subtitle,
  topBarColor = COLORS.GREEN,
  backgroundColor = COLORS.CARD,
}: Props) {
  const insets = useSafeAreaInsets();
  const light = topBarColor !== "#fff";

  return (
    <View style={{ backgroundColor: topBarColor }}>
      {/* Status bar style */}
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={light ? "light-content" : "dark-content"}
      />

      {/* ✅ paint ONLY the status bar safe area */}
      <View style={{ height: insets.top, backgroundColor: topBarColor }} />

      {/* ✅ real header (no insets.top here anymore) */}
      <View style={[styles.header, { backgroundColor }]}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  title: {
    fontSize: 22,
    color: COLORS.TEXT,
    fontFamily: "Manrope_700Bold",
  },
  subtitle: {
    marginTop: 4,
    color: COLORS.MUTED,
    fontSize: 14,
    fontFamily: "Manrope_400Regular",
  },
});