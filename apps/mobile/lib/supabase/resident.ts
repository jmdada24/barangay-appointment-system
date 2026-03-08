import { supabase } from "./client";

export type UserRow = {
  id: number;
  auth_id: string;
  email: string;
  role: "admin" | "staff" | "resident";
};

export type ResidentRow = {
  id: number;
  user_id: number;
  name: string;
  address: string | null;
  phone_number: string | null;
  verification_status: "verified" | "pending" | "rejected";
  birthdate: string | null;
  valid_id_url: string | null;
  sex?: "male" | "female" | null;
  face_photo_url?: string | null;
  must_change_password?: boolean;
  created_at?: string;
};

export async function getUserRowByAuthId(authId: string): Promise<UserRow> {
  const { data, error } = await supabase
    .from("users")
    .select("id, auth_id, email, role")
    .eq("auth_id", authId)
    .single();

  if (error) throw new Error(error.message);
  return data as UserRow;
}

export async function getResidentRowByAuthId(authId: string): Promise<ResidentRow> {
  const userRow = await getUserRowByAuthId(authId);

  const { data, error } = await supabase
    .from("residents")
    .select(
      "id, user_id, name, address, phone_number, verification_status, birthdate, valid_id_url, sex, face_photo_url, must_change_password, created_at"
    )
    .eq("user_id", userRow.id)
    .single();

  if (error) throw new Error(error.message);
  return data as ResidentRow;
}