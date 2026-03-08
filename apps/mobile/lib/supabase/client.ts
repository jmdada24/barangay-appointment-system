import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !/^https?:\/\//i.test(supabaseUrl)) {
  throw new Error(`Missing/invalid EXPO_PUBLIC_SUPABASE_URL. Got: "${supabaseUrl}"`);
}
if (!supabaseAnonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_ANON_KEY.");
}

/**
 * Storage adapter for Supabase Auth
 * - Web: localStorage (SSR safe)
 * - Native: AsyncStorage (recommended by Supabase for RN)
 */
const storage =
  Platform.OS === "web"
    ? {
        getItem: async (key: string) => {
          if (typeof window === "undefined") return null;
          return window.localStorage.getItem(key);
        },
        setItem: async (key: string, value: string) => {
          if (typeof window === "undefined") return;
          window.localStorage.setItem(key, value);
        },
        removeItem: async (key: string) => {
          if (typeof window === "undefined") return;
          window.localStorage.removeItem(key);
        },
      }
    : {
        getItem: (key: string) => AsyncStorage.getItem(key),
        setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
        removeItem: (key: string) => AsyncStorage.removeItem(key),
      };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    storageKey: "barangay-appointment-system-auth",
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});