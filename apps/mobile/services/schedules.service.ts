import { supabase } from "@/lib/supabase/client";

export type Schedule = {
  id: number;
  date: string; // YYYY-MM-DD
  morning_slots: number;
  afternoon_slots: number;
  morning_booked: number;
  afternoon_booked: number;
  created_at: string;
};

export type ScheduleWithAvailability = Schedule & {
  morning_available: number;
  afternoon_available: number;
};

export async function getAvailableSchedules(limit = 90) {
  // ✅ local YYYY-MM-DD (safer on mobile)
  const todayStr = new Date().toLocaleDateString("en-CA"); // "2026-03-01"

  const { data, error } = await supabase
    .from("schedules")
    .select("id, date, morning_slots, afternoon_slots, morning_booked, afternoon_booked, created_at")
    .gte("date", todayStr)
    .order("date", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Schedule[];

  return rows.map((s) => ({
    ...s,
    morning_available: Math.max(0, (s.morning_slots ?? 0) - (s.morning_booked ?? 0)),
    afternoon_available: Math.max(0, (s.afternoon_slots ?? 0) - (s.afternoon_booked ?? 0)),
  })) as ScheduleWithAvailability[];
}

export async function getScheduleById(scheduleId: number) {
  const { data, error } = await supabase
    .from("schedules")
    .select("id, date, morning_slots, afternoon_slots, morning_booked, afternoon_booked, created_at")
    .eq("id", scheduleId)
    .single();

  if (error) throw new Error(error.message);

  const s = data as Schedule;

  return {
    ...s,
    morning_available: Math.max(0, (s.morning_slots ?? 0) - (s.morning_booked ?? 0)),
    afternoon_available: Math.max(0, (s.afternoon_slots ?? 0) - (s.afternoon_booked ?? 0)),
  } as ScheduleWithAvailability;
}