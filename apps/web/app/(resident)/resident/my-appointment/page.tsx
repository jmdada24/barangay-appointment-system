"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Calendar, Clock, Loader2, AlertCircle, X, Star, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getResidentAppointments, cancelAppointment } from "@/actions/appointments";
import { checkFeedbackExists } from "@/actions/feedback";
import { createClient } from "@/utils/supabase/client";

type AppointmentStatus = "pending" | "approved" | "rejected" | "completed" | "cancelled";

type Appointment = {
  id: number;
  resident_id: number;
  service_id: number;
  schedule_id: number;
  time_slot: "morning" | "afternoon";
  status: AppointmentStatus;
  purpose: string;
  admin_remarks?: string;
  created_at: string;
  services: {
    service_name: string;
  };
  schedules: {
    date: string;
  };
};

function getStatusStyles(status: AppointmentStatus) {
  switch (status) {
    case "pending":
      return {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-700",
        icon: "text-yellow-500",
      };
    case "approved":
      return {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        icon: "text-green-500",
      };
    case "rejected":
      return {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        icon: "text-red-500",
      };
    case "completed":
      return {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
        icon: "text-blue-500",
      };
    case "cancelled":
      return {
        bg: "bg-gray-50",
        border: "border-gray-200",
        text: "text-gray-700",
        icon: "text-gray-500",
      };
    default:
      return {
        bg: "bg-gray-50",
        border: "border-gray-200",
        text: "text-gray-700",
        icon: "text-gray-500",
      };
  }
}

function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatAppointmentDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeSlot: "morning" | "afternoon") {
  return timeSlot === "morning" ? "8:00 AM - 11:00 AM" : "1:00 PM - 4:00 PM";
}

function formatBookedDate(dateStr: string) {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

interface ViewDetailsModalProps {
  appointment: Appointment | null;
  onClose: () => void;
  onCancelAppointment: (appointmentId: number) => Promise<void>;
  cancelling: number | null;
  onRateClick: (appointmentId: number) => void;
}

function ViewDetailsModal({
  appointment,
  onClose,
  onCancelAppointment,
  cancelling,
  onRateClick,
}: ViewDetailsModalProps) {
  if (!appointment) return null;

  const canCancel = appointment.status === "pending";
  const canRate = appointment.status === "completed";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Appointment Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Service</p>
            <p className="text-sm font-medium text-gray-900">
              {appointment.services.service_name}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Date</p>
            <p className="text-sm font-medium text-gray-900">
              {formatAppointmentDate(appointment.schedules.date)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Time Slot</p>
            <p className="text-sm font-medium text-gray-900">
              {formatTime(appointment.time_slot)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Purpose</p>
            <p className="text-sm font-medium text-gray-900">{appointment.purpose}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Status</p>
            <div className="inline-flex">
              <span
                className={`text-xs font-medium px-3 py-1 rounded-full border ${getStatusStyles(appointment.status as AppointmentStatus).bg
                  } ${getStatusStyles(appointment.status as AppointmentStatus).border} ${getStatusStyles(appointment.status as AppointmentStatus).text
                  }`}
              >
                {capitalizeFirst(appointment.status)}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Booked Date</p>
            <p className="text-sm font-medium text-gray-900">
              {formatBookedDate(appointment.created_at)}
            </p>
          </div>

          {appointment.admin_remarks && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600 font-medium mb-1">Admin Remarks</p>
              <p className="text-sm text-blue-700">{appointment.admin_remarks}</p>
            </div>
          )}

          {appointment.status === "rejected" && !appointment.admin_remarks && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">No reason provided for rejection.</p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4 mt-6 flex gap-2 flex-wrap">
          {canCancel && (
            <Button
              variant="outline"
              className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => onCancelAppointment(appointment.id)}
              disabled={cancelling === appointment.id}
            >
              {cancelling === appointment.id ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                  Cancelling...
                </>
              ) : (
                "Cancel Appointment"
              )}
            </Button>
          )}
          {canRate && (
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => {
                onRateClick(appointment.id);
                onClose();
              }}
            >
              <Star className="w-4 h-4 mr-2" />
              Rate Us
            </Button>
          )}
          <Button
            onClick={onClose}
            className="flex-1 bg-primary hover:bg-primary/90"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ResidentAppointment() {
  const router = useRouter();
  const supabase = createClient();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [residentId, setResidentId] = useState<number | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/");
        return;
      }

      const { data: userRecord } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", userData.user.id)
        .single();

      const { data: residentRecord } = await supabase
        .from("residents")
        .select("id")
        .eq("user_id", userRecord?.id)
        .single();

      if (!residentRecord) {
        setError("Resident profile not found");
        setLoading(false);
        return;
      }

      setResidentId(residentRecord.id);

      const result = await getResidentAppointments(residentRecord.id);

      if (result.success && result.data) {
        const appointmentsList = result.data as Appointment[];
        setAppointments(appointmentsList);

        // ✅ NEW: Check which completed appointments already have feedback
        const feedbackCheckResults = new Set<number>();
        for (const apt of appointmentsList) {
          if (apt.status === "completed") {
            const feedbackCheck = await checkFeedbackExists(apt.id);
            if (feedbackCheck.exists) {
              feedbackCheckResults.add(apt.id);
            }
          }
        }
        setFeedbackSubmitted(feedbackCheckResults);
      } else {
        setError(result.error || "Failed to load appointments");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelAppointment(appointmentId: number) {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }

    if (!residentId) return;

    setCancelling(appointmentId);

    try {
      const result = await cancelAppointment(appointmentId, residentId);

      if (result.success) {
        setAppointments((prev) =>
          prev.map((apt) =>
            apt.id === appointmentId ? { ...apt, status: "cancelled" as AppointmentStatus } : apt
          )
        );
        setSelectedAppointment(null);
      } else {
        alert(result.error || "Failed to cancel appointment");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCancelling(null);
    }
  }

  function handleRateClick(appointmentId: number) {
    sessionStorage.setItem("feedbackAppointmentId", appointmentId.toString());
    router.push("/resident/feedback");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border border-red-200 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Error Loading Appointments</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchAppointments}
                className="mt-3 text-sm font-medium text-red-600 hover:text-red-700 underline"
              >
                Try Again
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Appointments List */}
      <div className="space-y-4">
        {appointments.length > 0 ? (
          appointments.map((appointment) => {
            const statusStyles = getStatusStyles(appointment.status);
            const canRate = appointment.status === "completed";
            const alreadyRated = feedbackSubmitted.has(appointment.id);

            return (
              <Card key={appointment.id} className="border border-gray-200 shadow-sm">
                <CardContent className="p-8">
                  {/* Service Type & Status Row */}
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {appointment.services.service_name}
                    </h2>
                    <div className="flex flex-col items-end gap-1">
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${statusStyles.bg} ${statusStyles.border}`}
                      >
                        <Clock className={`w-3.5 h-3.5 ${statusStyles.icon}`} />
                        <span className={`text-xs font-medium ${statusStyles.text}`}>
                          {capitalizeFirst(appointment.status)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        Booked: {formatBookedDate(appointment.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{formatAppointmentDate(appointment.schedules.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{formatTime(appointment.time_slot)}</span>
                    </div>
                  </div>

                  {/* Purpose */}
                  <p className="text-sm text-gray-600 mb-4">
                    <span className="font-medium text-gray-700">Purpose:</span> {appointment.purpose}
                  </p>

                  {/* Admin Remarks if exists */}
                  {appointment.admin_remarks && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-600 font-medium mb-1">Admin Remarks</p>
                      <p className="text-sm text-blue-700">{appointment.admin_remarks}</p>
                    </div>
                  )}

                  {/* Divider & Bottom Actions */}
                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setSelectedAppointment(appointment)}
                      className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-primary transition-colors"
                    >
                      View Details
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {/* ✅ UPDATED: Rate Us Button - Only for completed, and disabled if already rated */}
                    {canRate && (
                      <Button
                        size="sm"
                        className={alreadyRated ? "bg-gray-400 hover:bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}
                        onClick={() => !alreadyRated && handleRateClick(appointment.id)}
                        disabled={alreadyRated}
                      >
                        {alreadyRated ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1.5" />
                            Feedback Submitted
                          </>
                        ) : (
                          <>
                            <Star className="w-4 h-4 mr-1.5" />
                            Rate Us
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-10 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No appointments yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                You haven't booked any appointments. Start by booking one!
              </p>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => router.push("/resident/book-appointment")}
              >
                Book an Appointment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* View Details Modal */}
      <ViewDetailsModal
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onCancelAppointment={handleCancelAppointment}
        cancelling={cancelling}
        onRateClick={handleRateClick}
      />
    </div>
  );
}