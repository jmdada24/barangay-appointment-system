"use server";

import { createClient } from "@/utils/supabase/server";

export async function getSchedules() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching schedules:", error);
    return { success: false, data: null, error: error.message };
  }

  return { success: true, data, error: null };
}

export async function addSchedule(date: string, morningSlots: number, afternoonSlots: number) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("schedules")
    .insert([
      {
        date,
        morning_slots: morningSlots,
        afternoon_slots: afternoonSlots,
        morning_booked: 0,
        afternoon_booked: 0,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error adding schedule:", error);
    return { success: false, data: null, error: error.message };
  }

  return { success: true, data, error: null };
}

export async function updateSchedule(
  id: number,
  morningSlots: number,
  afternoonSlots: number
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("schedules")
    .update({
      morning_slots: morningSlots,
      afternoon_slots: afternoonSlots,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating schedule:", error);
    return { success: false, data: null, error: error.message };
  }

  return { success: true, data, error: null };
}

export async function deleteSchedule(id: number) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting schedule:", error);
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function archiveSchedule(id: number) {
  // For now, same as delete (you can add an archived_at column later if needed)
  return deleteSchedule(id);
}