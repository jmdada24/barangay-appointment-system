// services/appointments.service.ts
import { supabase } from "@/lib/supabase/client";

export type TimeSlot = "morning" | "afternoon";

export type AppointmentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

export type Appointment = {
  id: number;
  resident_id: number;
  service_id: number;
  schedule_id: number;
  time_slot: TimeSlot;
  status: AppointmentStatus;
  purpose: string | null;
  admin_remarks: string | null;
  created_at: string;

  services?: { service_name: string } | null;
  schedules?: { date: string } | null;
};

/**
 * Get resident appointments (latest first)
 */
export async function getMyAppointments(residentId: number): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      resident_id,
      service_id,
      schedule_id,
      time_slot,
      status,
      purpose,
      admin_remarks,
      created_at,
      services:services(service_name),
      schedules:schedules(date)
    `
    )
    .eq("resident_id", residentId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Appointment[];
}

/**
 * ✅ NEW: Paginated appointments fetch (10 per page)
 * - page starts at 0
 * - statusFilter: "all" or an actual db status (pending/approved/rejected/completed/cancelled)
 */
export async function getMyAppointmentsPaged(input: {
  residentId: number;
  page: number;
  pageSize?: number;
  statusFilter?: "all" | AppointmentStatus;
}): Promise<{ items: Appointment[]; hasMore: boolean }> {
  const pageSize = input.pageSize ?? 10;
  const from = input.page * pageSize;
  const to = from + pageSize - 1;

  let q = supabase
    .from("appointments")
    .select(
      `
      id,
      resident_id,
      service_id,
      schedule_id,
      time_slot,
      status,
      purpose,
      admin_remarks,
      created_at,
      services:services(service_name),
      schedules:schedules(date)
    `
    , { count: "exact" })
    .eq("resident_id", input.residentId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (input.statusFilter && input.statusFilter !== "all") {
    q = q.eq("status", input.statusFilter);
  }

  const { data, error } = await q;

  if (error) throw new Error(error.message);

  const items = (data ?? []) as Appointment[];
  // if we got less than pageSize, there are no more pages
  const hasMore = items.length === pageSize;

  return { items, hasMore };
}

/**
 * Create appointment
 */
export async function createAppointment(input: {
  residentId: number;
  serviceId: number;
  scheduleId: number;
  timeSlot: TimeSlot;
  purpose: string;
}): Promise<{ id: number }> {
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      resident_id: input.residentId,
      service_id: input.serviceId,
      schedule_id: input.scheduleId,
      time_slot: input.timeSlot,
      purpose: input.purpose,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Appointment was not created.");
  return { id: data.id };
}

/**
 * Cancel appointment
 */
export async function cancelAppointment(input: {
  appointmentId: number;
  residentId: number;
}): Promise<{ id: number; status: AppointmentStatus }> {
  const { data, error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", input.appointmentId)
    .eq("resident_id", input.residentId)
    .select("id, status")
    .single();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Cancel failed. Appointment not found.");
  return data as { id: number; status: AppointmentStatus };
}
