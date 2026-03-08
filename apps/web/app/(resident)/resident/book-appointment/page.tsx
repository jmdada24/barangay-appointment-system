"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createAppointment, getServices, getAvailableSchedules } from "@/actions/appointments";
import { createClient } from "@/utils/supabase/client";

type BookingStep = "service" | "date" | "time" | "details" | "confirm";

type Service = {
  id: number;
  service_name: string;
  description: string;
  fee: number;
};

type Schedule = {
  id: number;
  date: string;
  morning_slots: number;
  morning_booked: number;
  afternoon_slots: number;
  afternoon_booked: number;
};

function normalizeDateOnly(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDaysInMonthGrid(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day));
  return days;
}

export default function ResidentBookAppointment() {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState<BookingStep>("service");
  const [formData, setFormData] = useState({
    serviceId: 0,
    serviceName: "",
    date: "",
    timeSlot: "",
    purpose: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ✅ NEW: warning modal before final create
  const [showConfirmWarning, setShowConfirmWarning] = useState(false);

  // ✅ NEW: conflict modal (already has appointment for this schedule)
  const [showScheduleConflictModal, setShowScheduleConflictModal] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [residentId, setResidentId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

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

      if (residentRecord) setResidentId(residentRecord.id);

      const servicesResult = await getServices();
      if (servicesResult.success && servicesResult.data) {
        setServices(servicesResult.data as Service[]);
      }

      const schedulesResult = await getAvailableSchedules();
      if (schedulesResult.success && schedulesResult.data) {
        setSchedules(schedulesResult.data as Schedule[]);
      }

      setLoading(false);
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const days = useMemo(() => getDaysInMonthGrid(currentMonth), [currentMonth]);
  const monthName = useMemo(
    () => currentMonth.toLocaleString("default", { month: "long", year: "numeric" }),
    [currentMonth]
  );

  const selectedSchedule = useMemo(
    () => schedules.find((s) => s.date === formData.date),
    [schedules, formData.date]
  );

  const morningAvailable = selectedSchedule
    ? selectedSchedule.morning_slots - selectedSchedule.morning_booked
    : 0;

  const afternoonAvailable = selectedSchedule
    ? selectedSchedule.afternoon_slots - selectedSchedule.afternoon_booked
    : 0;

  const steps = [
    { id: "service", label: "Services", number: 1 },
    { id: "date", label: "Date", number: 2 },
    { id: "time", label: "Time", number: 3 },
    { id: "details", label: "Details", number: 4 },
    { id: "confirm", label: "Confirm", number: 5 },
  ] as const;

  function getStepIndex(stepId: BookingStep) {
    return steps.findIndex((s) => s.id === stepId);
  }

  function previousMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  }

  function nextMonth() {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  }

  function handleServiceSelect(service: Service) {
    setFormData((prev) => ({
      ...prev,
      serviceId: service.id,
      serviceName: service.service_name,
    }));
    setCurrentStep("date");
  }

  function handleDateSelect(date: string) {
    setFormData((prev) => ({ ...prev, date, timeSlot: "" }));
    setCurrentStep("time");
  }

  function handleTimeSelect(timeSlot: string) {
    setFormData((prev) => ({ ...prev, timeSlot }));
    setCurrentStep("details");
  }

  function validatePurpose() {
    if (!formData.purpose.trim()) {
      setErrors({ purpose: "Purpose is required" });
      return false;
    }
    if (formData.purpose.trim().length < 10) {
      setErrors({ purpose: "Purpose must be at least 10 characters" });
      return false;
    }
    setErrors({});
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePurpose()) return;
    setCurrentStep("confirm");
  }

  // ✅ CHANGED: now we show a warning modal first
  function handleConfirmClick() {
    // Clear previous submit error if any
    if (errors.submit) setErrors((p) => ({ ...p, submit: "" }));

    setShowConfirmWarning(true);
  }

  // ✅ CHANGED: only called after user accepts warning
  async function handleConfirmFinal() {
    setShowConfirmWarning(false);

    if (!residentId) return;

    setLoading(true);

    const scheduleId = schedules.find((s) => s.date === formData.date)?.id || 0;

    const result = await createAppointment({
      residentId,
      serviceId: formData.serviceId,
      scheduleId,
      timeSlot: (formData.timeSlot.includes("Morning") ? "morning" : "afternoon") as "morning" | "afternoon",
      purpose: formData.purpose,
    });

    setLoading(false);

    if (!result.success) {
      const msg = result.error || "Failed to create appointment";

      // ✅ If duplicate schedule attempt, show modal at Step 5
      if (msg.toLowerCase().includes("already have an appointment for this schedule")) {
        setShowScheduleConflictModal(true);
        return;
      }

      setErrors({ submit: msg });
      return;
    }

    setShowSuccessModal(true);
  }

  function handleSuccessClose() {
    setShowSuccessModal(false);
    router.push("/resident/my-appointment");
  }

  if (loading && services.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center max-w-2xl mx-auto">
        {steps.map((step, index) => {
          const currentIndex = getStepIndex(currentStep);
          const isActive = currentStep === step.id;
          const isDone = getStepIndex(step.id as BookingStep) < currentIndex;

          return (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={[
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold",
                    isActive || isDone ? "bg-primary text-white" : "bg-gray-200 text-gray-500",
                  ].join(" ")}
                >
                  {step.number}
                </div>
                <span className="text-xs mt-1.5 text-gray-500">{step.label}</span>
              </div>

              {index < steps.length - 1 && (
                <div className={["w-20 h-0.5 mx-2 -mt-5", isDone ? "bg-primary" : "bg-gray-200"].join(" ")} />
              )}
            </div>
          );
        })}
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-6">
          {/* Step 1: Service Selection */}
          {currentStep === "service" && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Select Service Type</h2>
              <p className="text-sm text-gray-500 mb-6">Choose the barangay service you need</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className="group flex items-center gap-3 p-6 bg-white border border-gray-200 rounded-lg hover:bg-primary hover:border-primary transition-all text-left"
                  >
                    <FileText className="w-5 h-5 text-gray-400 group-hover:text-primary-foreground transition-colors" />
                    <div>
                      <span className="font-medium text-gray-900 group-hover:text-primary-foreground transition-colors block">
                        {service.service_name}
                      </span>
                      <span className="text-xs text-gray-500 group-hover:text-primary-foreground/80">₱{service.fee}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Date Selection */}
          {currentStep === "date" && (
            <div>
              <button
                onClick={() => setCurrentStep("service")}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Service Selection
              </button>

              <h2 className="text-lg font-semibold text-gray-900 mb-1">Select Date</h2>
              <p className="text-sm text-gray-500 mb-6">Choose your preferred appointment date</p>

              <div className="flex items-center justify-between mb-4">
                <Button variant="outline" size="sm" onClick={previousMonth} className="h-8 w-8 p-0">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-base font-medium text-gray-900">{monthName}</span>
                <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}

                {days.map((date, index) => {
                  if (!date) return <div key={`empty-${index}`} className="aspect-square" />;

                  const dateStr = formatDateYYYYMMDD(date);
                  const schedule = schedules.find((s) => s.date === dateStr);
                  const hasSlots =
                    !!schedule &&
                    (schedule.morning_booked < schedule.morning_slots ||
                      schedule.afternoon_booked < schedule.afternoon_slots);

                  const today = normalizeDateOnly(new Date());
                  const isTodayOrPast = normalizeDateOnly(date) <= today;
                  const isAvailable = hasSlots && !isTodayOrPast;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => isAvailable && handleDateSelect(dateStr)}
                      disabled={!isAvailable}
                      className={[
                        "aspect-square flex items-center justify-center rounded-lg text-sm border",
                        isAvailable
                          ? "bg-green-200 border-green-200 text-gray-900 hover:bg-green-300"
                          : "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed",
                      ].join(" ")}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Time Selection */}
          {currentStep === "time" && (
            <div>
              <button
                onClick={() => setCurrentStep("date")}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Date Selection
              </button>

              <h2 className="text-lg font-semibold text-gray-900 mb-1">Select Time Slot</h2>
              <p className="text-sm text-gray-500 mb-4">Choose your preferred time</p>

              <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm">
                  <span className="font-medium text-primary">Service:</span>{" "}
                  <span className="text-primary/80">{formData.serviceName}</span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-primary">Date:</span>{" "}
                  <span className="text-primary/80">
                    {new Date(formData.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">Morning Session</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {morningAvailable}/{selectedSchedule?.morning_slots || 10} slots
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">8:00 AM - 11:00 AM</p>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={morningAvailable === 0 || loading}
                    onClick={() => handleTimeSelect("8:00 AM - 11:00 AM")}
                    size="lg"
                  >
                    Select Morning
                  </Button>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="font-medium text-gray-900">Afternoon Session</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {afternoonAvailable}/{selectedSchedule?.afternoon_slots || 10} slots
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-3">1:00 PM - 4:00 PM</p>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={afternoonAvailable === 0 || loading}
                    onClick={() => handleTimeSelect("1:00 PM - 4:00 PM")}
                    size="lg"
                  >
                    Select Afternoon
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Details */}
          {currentStep === "details" && (
            <div>
              <button
                onClick={() => setCurrentStep("time")}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Time Selection
              </button>

              <h2 className="text-lg font-semibold text-gray-900 mb-1">Appointment Details</h2>
              <p className="text-sm text-gray-500 mb-4">Provide details about your appointment</p>

              <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm">
                  <span className="font-medium text-primary">Service:</span>{" "}
                  <span className="text-primary/80">{formData.serviceName}</span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-primary">Date:</span>{" "}
                  <span className="text-primary/80">
                    {new Date(formData.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="font-medium text-primary">Time:</span>{" "}
                  <span className="text-primary/80">{formData.timeSlot}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Purpose / Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.purpose}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, purpose: e.target.value }));
                      if (errors.purpose) setErrors({});
                    }}
                    rows={4}
                    className={[
                      "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50",
                      errors.purpose ? "border-red-500" : "border-gray-200",
                    ].join(" ")}
                    placeholder="Please provide details about why you need this service (minimum 10 characters)"
                  />
                  {errors.purpose && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {errors.purpose}
                    </p>
                  )}
                  <p
                    className={[
                      "mt-1 text-xs",
                      formData.purpose.length < 10 ? "text-gray-400" : "text-green-600",
                    ].join(" ")}
                  >
                    {formData.purpose.length}/10 minimum characters
                  </p>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm font-medium text-primary mb-2">Important Reminders:</p>
                  <ul className="text-sm text-primary/80 space-y-1 list-disc list-inside">
                    <li>Your appointment will be subject to admin approval</li>
                    <li>Please arrive 10 minutes before your scheduled time</li>
                    <li>Bring valid ID and required documents</li>
                    <li>You will receive a notification once your request is processed</li>
                  </ul>
                </div>

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Continue to Confirmation"
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* Step 5: Confirm */}
          {currentStep === "confirm" && (
            <div>
              <button
                onClick={() => setCurrentStep("details")}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Details
              </button>

              <h2 className="text-lg font-semibold text-gray-900 mb-1">Confirm Appointment</h2>
              <p className="text-sm text-gray-500 mb-6">Please review your appointment details</p>

              {errors.submit && (
                <div className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
                  {errors.submit}
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-5 mb-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Service Type</p>
                  <p className="text-sm font-medium text-gray-900">{formData.serviceName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(formData.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Time Slot</p>
                    <p className="text-sm font-medium text-gray-900">{formData.timeSlot}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Purpose</p>
                  <p className="text-sm font-medium text-gray-900">{formData.purpose}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setCurrentStep("details")} size="lg" disabled={loading}>
                  Edit Details
                </Button>

                <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleConfirmClick} size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ✅ Warning modal before final confirm */}
      {showConfirmWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Before you confirm</h3>
            <p className="text-sm text-gray-600 mb-5">
              Please make sure everything is correct. Once you submit, you <b>can’t create another appointment for this same schedule</b>
              while your request is pending or approved.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirmWarning(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleConfirmFinal}>
                Yes, Submit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Conflict modal (duplicate schedule) */}
      {showScheduleConflictModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Schedule Already Taken</h3>
            <p className="text-sm text-gray-600 mb-5">
              You already have an appointment for this schedule (pending or approved). Please choose another date.
            </p>

            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={() => {
                setShowScheduleConflictModal(false);
                setCurrentStep("date");
              }}
            >
              Choose another date
            </Button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Appointment Submitted!</h3>
              <p className="text-sm text-gray-500 mb-5">
                Your appointment request has been submitted successfully. You will receive a notification once it is reviewed.
              </p>
              <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleSuccessClose}>
                View My Appointments
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}