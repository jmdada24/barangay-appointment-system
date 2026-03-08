import { Stack } from "expo-router";
import { useFonts, Manrope_400Regular, Manrope_600SemiBold, Manrope_700Bold } from "@expo-google-fonts/manrope";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { Platform, Text, TextInput } from "react-native";
import FloatingChatbot from "@/components/chatbot/FloatingChatbot";
import { AuthProvider } from "@/providers/AuthProvider";
import * as NavigationBar from "expo-navigation-bar";
import { COLORS } from "@/constants/theme";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    Manrope_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;

    const TextAny = Text as any;
    const TextInputAny = TextInput as any;

    TextAny.defaultProps = TextAny.defaultProps || {};
    TextAny.defaultProps.style = [{ fontFamily: "Manrope_400Regular" }, TextAny.defaultProps.style];

    TextInputAny.defaultProps = TextInputAny.defaultProps || {};
    TextInputAny.defaultProps.style = [{ fontFamily: "Manrope_400Regular" }, TextInputAny.defaultProps.style];
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (Platform.OS !== "android") return;

    (async () => {
      await NavigationBar.setBackgroundColorAsync(COLORS.CARD);
      await NavigationBar.setButtonStyleAsync("dark");
    })();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(protected)" />
            <Stack.Screen name="booking" />
            <Stack.Screen name="charter" />
          </Stack>

          <FloatingChatbot />
        </>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}