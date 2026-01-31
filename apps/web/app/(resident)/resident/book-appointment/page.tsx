"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ScheduleDate = {
    date: string;
    morningSlots: number;
    morningBooked: number;
    afternoonSlots: number;
    afternoonBooked: number;
};

type BookingStep = "service" | "date" | "time" | "details" | "confirm";

const serviceTypes = [
    "Barangay Clearance",
    "Barangay Certificate",
    "Business Clearance",
    "Blotter Report",
    "Cedula",
] as const;

const mockSchedules: ScheduleDate[] = [
    { date: "2026-01-29", morningSlots: 10, morningBooked: 0, afternoonSlots: 10, afternoonBooked: 0 },
    { date: "2026-01-30", morningSlots: 10, morningBooked: 8, afternoonSlots: 10, afternoonBooked: 10 },
    { date: "2026-02-03", morningSlots: 10, morningBooked: 2, afternoonSlots: 10, afternoonBooked: 4 },
];

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
    const schedules = mockSchedules;

    const [currentStep, setCurrentStep] = useState<BookingStep>("service");
    const [formData, setFormData] = useState({
        serviceType: "",
        date: "",
        timeSlot: "",
        purpose: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

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
        ? selectedSchedule.morningSlots - selectedSchedule.morningBooked
        : 0;

    const afternoonAvailable = selectedSchedule
        ? selectedSchedule.afternoonSlots - selectedSchedule.afternoonBooked
        : 0;

    const steps = [
        { id: "service", label: "Services", number: 1 },
        { id: "date", label: "Date", number: 2 },
        { id: "time", label: "Time", number: 3 },
        { id: "details", label: "Details", number: 4 },
        { id: "confirm", label: "Confirm", number: 5 },
    ] as const;

    function stepDone(stepId: BookingStep) {
        if (stepId === "service") return !!formData.serviceType;
        if (stepId === "date") return !!formData.date;
        if (stepId === "time") return !!formData.timeSlot;
        if (stepId === "details") return !!formData.purpose.trim();
        return false;
    }

    function getStepIndex(stepId: BookingStep) {
        return steps.findIndex((s) => s.id === stepId);
    }

    function previousMonth() {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    }

    function nextMonth() {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    }

    function handleServiceSelect(service: string) {
        setFormData((prev) => ({ ...prev, serviceType: service }));
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

    function handleConfirm() {
        console.log("Create appointment:", formData);
        setShowSuccessModal(true);
    }

    function handleSuccessClose() {
        setShowSuccessModal(false);
        router.push("/resident/my-appointment");
    }

    return (
        <div className="space-y-6">
        
            {/* Progress Steps - Matching Figma exactly */}
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
                                        isActive || isDone
                                            ? "bg-primary text-white"
                                            : "bg-gray-200 text-gray-500",
                                    ].join(" ")}
                                >
                                    {step.number}
                                </div>
                                <span className="text-xs mt-1.5 text-gray-500">{step.label}</span>
                            </div>

                            {index < steps.length - 1 && (
                                <div
                                    className={[
                                        "w-20 h-0.5 mx-2 -mt-5",
                                        isDone ? "bg-primary" : "bg-gray-200",
                                    ].join(" ")}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Card Content */}
            <Card className="border border-gray-200 shadow-sm">
                <CardContent className="p-6">
                    {/* Step 1: Service Selection */}
                    {currentStep === "service" && (
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-1">Select Service Type</h2>
                            <p className="text-sm text-gray-500 mb-6">Choose the barangay service you need</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {serviceTypes.map((service) => (
                                    <button
                                        key={service}
                                        onClick={() => handleServiceSelect(service)}
                                        className="group flex items-center gap-3 p-6 bg-white border border-gray-200 rounded-lg hover:bg-primary hover:border-primary transition-all text-left"
                                    >
                                        <FileText className="w-5 h-5 text-gray-400 group-hover:text-primary-foreground transition-colors" />
                                        <span className="font-medium text-gray-900 group-hover:text-primary-foreground transition-colors">
                                            {service}
                                        </span>
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

                            {/* Month Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <Button variant="outline" size="sm" onClick={previousMonth} className="h-8 w-8 p-0">
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-base font-medium text-gray-900">{monthName}</span>
                                <Button variant="outline" size="sm" onClick={nextMonth} className="h-8 w-8 p-0">
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>

                            {/* Calendar Grid */}
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
                                        (schedule.morningBooked < schedule.morningSlots ||
                                            schedule.afternoonBooked < schedule.afternoonSlots);
                                    const today = normalizeDateOnly(new Date());
                                    const isPast = normalizeDateOnly(date) < today;
                                    const isAvailable = hasSlots && !isPast;

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
                                Back to Service Selection
                            </button>

                            <h2 className="text-lg font-semibold text-gray-900 mb-1">Select Time Slot</h2>
                            <p className="text-sm text-gray-500 mb-4">Choose your preferred time</p>

                            {/* Selection Summary */}
                            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                <p className="text-sm">
                                    <span className="font-medium text-primary">Service:</span>{" "}
                                    <span className="text-primary/80">{formData.serviceType}</span>
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

                            {/* Time Slots */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border border-gray-200 rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-500" />
                                            <span className="font-medium text-gray-900">Morning Session</span>
                                        </div>
                                        <span className="text-sm text-gray-500">
                                            {selectedSchedule ? `${morningAvailable}/${selectedSchedule.morningSlots}` : "10/10"} slots
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-3">8:00 AM - 11:00 AM</p>
                                    <Button
                                        className="w-full bg-primary hover:bg-primary/90"
                                        disabled={morningAvailable === 0}
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
                                            {selectedSchedule ? `${afternoonAvailable}/${selectedSchedule.afternoonSlots}` : "10/10"} slots
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-3">1:00 PM - 4:00 PM</p>
                                    <Button
                                        className="w-full bg-primary hover:bg-primary/90"
                                        disabled={afternoonAvailable === 0}
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

                            <h2 className="text-lg font-semibold text-gray-900 mb-1">Select Service Type</h2>
                            <p className="text-sm text-gray-500 mb-4">Choose the barangay service you need</p>

                            {/* Selection Summary */}
                            <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                <p className="text-sm">
                                    <span className="font-medium text-primary">Service:</span>{" "}
                                    <span className="text-primary/80">{formData.serviceType}</span>
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
                                    <p className="mt-1 text-xs text-gray-400">
                                        {formData.purpose.length}/10 minimum characters
                                    </p>
                                </div>

                                {/* Important Reminders */}
                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                    <p className="text-sm font-medium text-primary mb-2">
                                        Important Reminders:Important Reminders:
                                    </p>
                                    <ul className="text-sm text-primary/80 space-y-1 list-disc list-inside">
                                        <li>Your appointment will be subject to admin approval</li>
                                        <li>Please arrive 10 minutes before your scheduled time</li>
                                        <li>Bring valid ID and required documents</li>
                                        <li>You will receive a notification once your request is processed</li>
                                    </ul>
                                </div>

                                <Button type="submit" className="w-full bg-primary hover:bg-primary/90" size="lg">
                                    Continue to Confirmation
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
                                Back to Time Selection
                            </button>

                            <h2 className="text-lg font-semibold text-gray-900 mb-1">Confirm Appointment</h2>
                            <p className="text-sm text-gray-500 mb-6">Please review your appointment details</p>

                            {/* Confirmation Details */}
                            <div className="bg-gray-50 rounded-lg p-5 mb-6 space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Service Type</p>
                                    <p className="text-sm font-medium text-gray-900">{formData.serviceType}</p>
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

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setCurrentStep("details")}
                                    size="lg"
                                >
                                    Edit Details
                                </Button>
                                <Button
                                    className="flex-1 bg-primary hover:bg-primary/90"
                                    onClick={handleConfirm}
                                    size="lg"
                                >
                                    Confirm Booking
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

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
                                Your appointment request has been submitted successfully. You will receive a
                                notification once it is reviewed.
                            </p>
                            <Button
                                className="w-full bg-primary hover:bg-primary/90"
                                onClick={handleSuccessClose}

                            >
                                View My Appointments
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}