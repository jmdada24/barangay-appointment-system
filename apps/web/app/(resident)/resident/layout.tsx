import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ResidentLayoutClient from "./ResidentLayoutClient";

export default async function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: resident } = await supabase
    .from("residents")
    .select(
      `
      id,
      name,
      must_change_password,
      verification_status,
      users!inner (
        auth_id
      )
    `
    )
    .eq("users.auth_id", user.id)
    .single();

  if (!resident) {
    redirect("/");
  }

  return (
    <ResidentLayoutClient
      residentId={resident.id}
      residentName={resident.name}
      mustChangePassword={resident.must_change_password}
      verificationStatus={resident.verification_status}
    >
      {children}
    </ResidentLayoutClient>
  );
}