// lib/supabase/bootstrap.ts
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

/**
 * Ensures public.users + public.residents exist for the given auth user.
 * Call this after you already have a valid session/user.
 */
export async function ensureResidentProfileForUser(user: User) {
  const authId = user.id;
  const email = user.email ?? "";

  // 1) ensure public.users exists
  let { data: userRow, error: userReadErr } = await supabase
    .from("users")
    .select("id, auth_id, email, role")
    .eq("auth_id", authId)
    .maybeSingle();

  if (userReadErr) throw new Error(userReadErr.message);

  if (!userRow) {
    const { data: insertedUser, error: userInsErr } = await supabase
      .from("users")
      .insert({ auth_id: authId, email, role: "resident" })
      .select("id, auth_id, email, role")
      .single();

    if (userInsErr) throw new Error(`Failed to create users row: ${userInsErr.message}`);
    userRow = insertedUser;
  }

  // 2) ensure residents exists
  let { data: residentRow, error: residentReadErr } = await supabase
    .from("residents")
    .select("id, user_id, name, verification_status, address, phone_number, birthdate, created_at")
    .eq("user_id", userRow.id)
    .maybeSingle();

  if (residentReadErr) throw new Error(residentReadErr.message);

  if (!residentRow) {
    const nameGuess = email ? email.split("@")[0] : "Resident";

    const { data: insertedResident, error: resInsErr } = await supabase
      .from("residents")
      .insert({
        user_id: userRow.id,
        name: nameGuess,
        verification_status: "pending",
      })
      .select("id, user_id, name, verification_status, address, phone_number, birthdate, created_at")
      .single();

    if (resInsErr) throw new Error(`Failed to create residents row: ${resInsErr.message}`);
    residentRow = insertedResident;
  }

  return { userRow, residentRow };
}