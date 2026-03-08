import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "@/constants/theme";

const ACTIVE = COLORS.GREEN;
const INACTIVE = "#8F8F8F";
const HIDDEN_TABS = new Set(["rate"]);

function TabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  const visibleRoutes = state.routes.filter((r: any) => !HIDDEN_TABS.has(r.name));

  return (
    <View
      style={[
        styles.tabBar,
        {
          // ✅ ONLY use insets.bottom here (no Math.max, no double height math)
          paddingBottom: insets.bottom,
          height: 58 + insets.bottom,
        },
      ]}
    >
      {visibleRoutes.map((route: any) => {
        const { options } = descriptors[route.key];
        const isFocused = state.routes[state.index].key === route.key;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const icon = options.tabBarIcon?.({
          focused: isFocused,
          color: isFocused ? ACTIVE : INACTIVE,
          size: 24,
        });

        const label = options.title ?? route.name;

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            activeOpacity={0.85}
            style={styles.tabItem}
          >
            {icon}
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]} numberOfLines={1}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: "Book",
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="appointment"
        options={{
          title: "Appointments",
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: "News",
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />

      <Tabs.Screen name="rate" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: COLORS.CARD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 8,
  },
  tabLabel: {
    fontSize: 12,
    color: INACTIVE,
    fontFamily: "Manrope_600SemiBold",
  },
  tabLabelActive: {
    color: ACTIVE,
    fontFamily: "Manrope_700Bold",
  },
});