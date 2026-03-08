import { Redirect } from "expo-router";
import { useAuth } from "@/providers/AuthProvider";

export default function Index() {
  const { user, loading, residentLoading, resident } = useAuth();

  if (loading || residentLoading) return null;

  if (!user) return <Redirect href="/(auth)/login" />;

  if (!resident) return <Redirect href="/(auth)/login" />;

  // Don't hard-redirect for mustChangePassword — the gate in (protected) layout handles it
  return <Redirect href="/(protected)/(tabs)/home" />;
}