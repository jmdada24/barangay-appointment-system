import { supabase } from "@/lib/supabase/client";

export type Service = {
  id: number;
  service_name: string;
  description: string | null;
  fee: number | null;
  is_active: boolean;
  created_at: string;
};

export async function getActiveServices() {
  const { data, error } = await supabase
    .from("services")
    .select("id, service_name, description, fee, is_active, created_at")
    .eq("is_active", true)
    .order("service_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Service[];
}