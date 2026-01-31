"use client";

import { ArrowRight, Calendar, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type AppointmentStatus = "pending" | "approved" | "rejected" | "completed" | "cancelled";

type Appointment = {
  id: string;
  serviceType: string;
  date: string;
  time: string;
  purpose: string;
  status: AppointmentStatus;
  bookedDate: string;
};

const mockAppointments: Appointment[] = [
  {
    id: "1",
    serviceType: "Cedula",
    date: "Thursday, January 22, 2026",
    time: "10:00 AM",
    purpose: "Government transaction",
    status: "pending",
    bookedDate: "1/15/2026",
  },
  {
    id: "2",
    serviceType: "Barangay Clearance",
    date: "Thursday, January 22, 2026",
    time: "10:00 AM",
    purpose: "Government transaction",
    status: "approved",
    bookedDate: "1/15/2026",
  },
  {
    id: "3",
    serviceType: "Barangay Clearance",
    date: "Thursday, January 22, 2026",
    time: "10:00 AM",
    purpose: "Government transaction",
    status: "pending",
    bookedDate: "1/15/2026",
  },
  {
    id: "4",
    serviceType: "Business Clearance",
    date: "Friday, January 23, 2026",
    time: "2:00 PM",
    purpose: "Business permit application",
    status: "rejected",
    bookedDate: "1/16/2026",
  },
  {
    id: "5",
    serviceType: "Blotter Report",
    date: "Monday, January 26, 2026",
    time: "9:00 AM",
    purpose: "Incident report",
    status: "completed",
    bookedDate: "1/18/2026",
  },
];

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

export default function ResidentAppointment() {
  return (
    <div className="space-y-6">
    
      {/* Appointments List */}
      <div className="space-y-4">
        {mockAppointments.map((appointment) => {
          const statusStyles = getStatusStyles(appointment.status);

          return (
            <Card key={appointment.id} className="border border-gray-200 shadow-sm">
              <CardContent className="p-8">
                {/* Service Type & Status Row */}
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-2xl font-bold text-gray-900">{appointment.serviceType}</h2>
                  <div className="flex flex-col items-end gap-1">
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${statusStyles.bg} ${statusStyles.border}`}
                    >
                      <Clock className={`w-3.5 h-3.5 ${statusStyles.icon}`} />
                      <span className={`text-xs font-medium ${statusStyles.text}`}>
                        {capitalizeFirst(appointment.status)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">Booked: {appointment.bookedDate}</span>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{appointment.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{appointment.time}</span>
                  </div>
                </div>

                {/* Purpose */}
                <p className="text-sm text-gray-600 mb-4">
                  <span className="font-medium text-gray-700">Purpose:</span> {appointment.purpose}
                </p>

                {/* Divider */}
                <div className="border-t border-gray-100 pt-3">
                  <button className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-primary ml-auto transition-colors">
                    View Details
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State (if needed) */}
      {mockAppointments.length === 0 && (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-10 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No appointments yet</h3>
            <p className="text-sm text-gray-500">
              You haven't booked any appointments. Start by booking one!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}