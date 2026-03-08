import { supabase } from "@/lib/supabase/client";

export async function submitFeedback(params: {
  residentId: number;
  rating: number; // 1-5
  comments: string;
  appointmentId?: number;
  individualRatings?: Record<number, number>;
  category?: string;
}) {
  const { data, error } = await supabase
    .from("feedback")
    .insert({
      resident_id: params.residentId,
      rating: params.rating,
      comments: params.comments,
      appointment_id: params.appointmentId ?? null,
      individual_ratings: params.individualRatings ?? null,
      category: params.category ?? "Feedback",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function checkFeedbackExists(appointmentId: number) {
  const { data, error } = await supabase
    .from("feedback")
    .select("id")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return !!data;
}

export async function getSubmittedFeedbackAppointmentIds(appointmentIds: number[]) {
  if (!appointmentIds.length) return [];

  const { data, error } = await supabase
    .from("feedback")
    .select("appointment_id")
    .in("appointment_id", appointmentIds);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((item) => item.appointment_id)
    .filter((id): id is number => typeof id === "number");
}