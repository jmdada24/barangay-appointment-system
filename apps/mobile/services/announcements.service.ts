import { supabase } from "@/lib/supabase/client";

export type Announcement = {
  id: number;
  title: string;
  content: string;
  type: "info" | "warning" | "urgent";
  image_url: string | null;
  posted_date: string;
  is_active?: boolean;
};

export async function getAnnouncements(limit = 10) {
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, content, type, image_url, posted_date, is_active")
    .eq("is_active", true) // you added this column later
    .order("posted_date", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Announcement[];
}