import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function StaffGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect("/admin/login");

  return children;
}