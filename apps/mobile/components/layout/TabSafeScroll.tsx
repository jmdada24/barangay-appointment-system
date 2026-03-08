import React from "react";
import { ScrollView, ScrollViewProps } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

type Props = ScrollViewProps;

export default function TabSafeScroll({ children, contentContainerStyle, ...rest }: Props) {
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <ScrollView
      {...rest}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        { paddingBottom: tabBarHeight }, // ✅ ONLY this
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}