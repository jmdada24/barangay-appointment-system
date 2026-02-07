"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Plus, Trash2, Archive, Loader2, AlertCircle, Check, X, Eye } from "lucide-react";
import { getAppointments, updateAppointmentStatus, deleteAppointment } from "@/actions/appointments";

type UserRole = "admin" | "staff";

type AppointmentStatus = "pending" | "approved" | "rejected" | "completed" | "cancelled";

type AppointmentRow = {
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
  residents: {
    id: number;
    name: string;
    phone_number?: string;
    user_id: number;
    users: {
      email: string;
    };
  };
};

interface AppointmentsPageProps {
  role: UserRole;
}

function StatusPill({ status }: { status: AppointmentStatus }) {
  const styles: Record<AppointmentStatus, string> = {
    pending: "bg-yellow-50 text-yellow-700",
    approved: "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-700",
    completed: "bg-blue-50 text-blue-700",
    cancelled: "bg-gray-50 text-gray-700",
  };

  const labels: Record<AppointmentStatus, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function formatDate(dateISO: string) {
  try {
    // Handle both date-only and datetime formats
    const dateString = dateISO.split("T")[0]; // Get just the date part
    const d = new Date(dateString + "T00:00:00Z");
    
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(d);
  } catch (error) {
    return dateISO; // Fallback to original if parsing fails
  }
}

function formatTime(timeSlot: "morning" | "afternoon") {
  return timeSlot === "morning" ? "8:00 AM - 11:00 AM" : "1:00 PM - 4:00 PM";
}

function formatFullDate(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

interface ViewDetailsModalProps {
  appointment: AppointmentRow | null;
  onClose: () => void;
}

function ViewDetailsModal({ appointment, onClose }: ViewDetailsModalProps) {
  if (!appointment) return null;

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
          {/* Resident Information */}
          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Resident Name</p>
            <p className="text-sm font-medium text-gray-900">{appointment.residents.name}</p>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-medium mb-1">Email</p>
            <p className="text-sm font-medium text-gray-900">{appointment.residents.users.email}</p>
          </div>

          {appointment.residents.phone_number && (
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Phone Number</p>
              <p className="text-sm font-medium text-gray-900">{appointment.residents.phone_number}</p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            {/* Appointment Information */}
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Service Type</p>
              <p className="text-sm font-medium text-gray-900">{appointment.services.service_name}</p>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Appointment Date</p>
              <p className="text-sm font-medium text-gray-900">
                {formatFullDate(appointment.schedules.date)}
              </p>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Time Slot</p>
              <p className="text-sm font-medium text-gray-900">{formatTime(appointment.time_slot)}</p>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Status</p>
              <div className="mt-1">
                <StatusPill status={appointment.status} />
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Booked On</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(appointment.created_at)}</p>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-500 font-medium mb-1">Purpose</p>
              <p className="text-sm font-medium text-gray-900">{appointment.purpose}</p>
            </div>

            {appointment.admin_remarks && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-600 font-medium mb-1">Admin Remarks</p>
                <p className="text-sm text-blue-700">{appointment.admin_remarks}</p>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={onClose}
          className="w-full mt-6 bg-primary hover:bg-primary/90"
        >
          Close
        </Button>
      </div>
    </div>
  );
}

export default function AppointmentsPage({ role }: AppointmentsPageProps) {
  const router = useRouter();
  const basePath = role === "admin" ? "/admin" : "/staff";

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | "complete" | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRow | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminRemarks, setAdminRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch appointments on mount
  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    setLoading(true);
    setError(null);

    const result = await getAppointments();
    if (result.success && result.data) {
      setAppointments(result.data as AppointmentRow[]);
    } else {
      setError(result.error || "Failed to load appointments");
    }

    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments.filter((a) => {
      const matchesQuery =
        !q ||
        a.residents.name.toLowerCase().includes(q) ||
        a.residents.users.email.toLowerCase().includes(q) ||
        (a.residents.phone_number || "").toLowerCase().includes(q) ||
        a.services.service_name.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" ? true : a.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter, appointments]);

  function handleActionClick(appointment: AppointmentRow, action: "approve" | "reject" | "complete") {
    setSelectedAppointment(appointment);
    setActionType(action);
    setAdminRemarks("");
    setShowActionModal(true);
  }

  function handleViewDetails(appointment: AppointmentRow) {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  }

  function handleRemoveClick(appointment: AppointmentRow) {
    setSelectedAppointment(appointment);
    if (role === "staff") {
      setShowArchiveModal(true);
    } else {
      setShowDeleteModal(true);
    }
  }

  async function handleActionConfirm() {
  if (!selectedAppointment || !actionType) return;

  setActionLoading(true);

  // Map action types to actual status values
  const statusMap: Record<string, AppointmentStatus> = {
    approve: "approved",
    reject: "rejected",
    complete: "completed",
  };

  const actualStatus = statusMap[actionType] as AppointmentStatus;

  const result = await updateAppointmentStatus(
    selectedAppointment.id,
    actualStatus,
    adminRemarks || undefined
  );

  if (result.success) {
    // Update local state
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === selectedAppointment.id
          ? { ...apt, status: actualStatus, admin_remarks: adminRemarks || apt.admin_remarks }
          : apt
      )
    );
    setShowActionModal(false);
    setSelectedAppointment(null);
  } else {
    alert(result.error || "Failed to update appointment");
  }

  setActionLoading(false);
}

  async function handleArchiveConfirm() {
    if (!selectedAppointment) return;
    console.log("Archive appointment:", selectedAppointment.id);
    setShowArchiveModal(false);
    setSelectedAppointment(null);
  }

  async function handleDeleteConfirm() {
    if (!selectedAppointment) return;

    setActionLoading(true);
    const result = await deleteAppointment(selectedAppointment.id);

    if (result.success) {
      // Remove from local state
      setAppointments((prev) => prev.filter((apt) => apt.id !== selectedAppointment.id));
      setShowDeleteModal(false);
      setSelectedAppointment(null);
    } else {
      alert(result.error || "Failed to delete appointment");
    }

    setActionLoading(false);
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
      <Card className="rounded-xl bg-white shadow-sm">
        <CardContent className="p-6">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, or contact number..."
                className="h-12 w-full rounded-lg border bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="lg"
                variant="outline"
                className="rounded-lg py-6"
                onClick={() =>
                  setStatusFilter((s) =>
                    s === "all"
                      ? "pending"
                      : s === "pending"
                        ? "approved"
                        : s === "approved"
                          ? "rejected"
                          : s === "rejected"
                            ? "completed"
                            : "all"
                  )
                }
              >
                <Filter className="mr-2 h-4 w-4" />
                {statusFilter === "all"
                  ? "All Status"
                  : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              </Button>

              <Button
                size="lg"
                className="rounded-lg bg-primary hover:bg-primary/90 py-6"
                onClick={() => router.push(`${basePath}/appointment/new`)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Appointment
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-8 overflow-hidden rounded-lg">
            <div className="grid grid-cols-12 bg-white text-sm font-semibold text-muted-foreground">
              <div className="col-span-3">RESIDENT</div>
              <div className="col-span-2">SERVICE TYPE</div>
              <div className="col-span-2">DATE</div>
              <div className="col-span-2">TIME</div>
              <div className="col-span-1 text-center">STATUS</div>
              <div className="col-span-2 text-center">ACTION</div>
            </div>

            <div className="divide-y">
              {filtered.length > 0 ? (
                filtered.map((a) => (
                  <div key={a.id} className="grid grid-cols-12 items-center bg-white p-3">
                    <div className="col-span-3">
                      <div className="font-medium text-gray-900">{a.residents.name}</div>
                      <div className="text-xs text-muted-foreground">{a.residents.users.email}</div>
                    </div>
                    <div className="col-span-2 text-sm text-gray-900">{a.services.service_name}</div>
                    <div className="col-span-2 text-sm text-gray-900">{formatDate(a.schedules.date)}</div>
                    <div className="col-span-2 text-sm text-gray-900">{formatTime(a.time_slot)}</div>
                    <div className="col-span-1 flex justify-center">
                      <StatusPill status={a.status} />
                    </div>
                    <div className="col-span-2 flex justify-center gap-2">
                      <button
                        className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 transition-colors"
                        title="View Details"
                        onClick={() => handleViewDetails(a)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {a.status === "pending" && (
                        <>
                          <button
                            className="rounded-md p-1.5 text-green-600 hover:bg-green-50 transition-colors"
                            title="Approve"
                            onClick={() => handleActionClick(a, "approve")}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-md p-1.5 text-red-600 hover:bg-red-50 transition-colors"
                            title="Reject"
                            onClick={() => handleActionClick(a, "reject")}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}

                      {a.status === "approved" && (
                        <button
                          className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Complete"
                          onClick={() => handleActionClick(a, "complete")}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        className={`rounded-md p-1.5 transition-colors ${
                          role === "staff"
                            ? "text-yellow-600 hover:bg-yellow-50"
                            : "text-red-600 hover:bg-red-50"
                        }`}
                        title={role === "staff" ? "Archive" : "Delete"}
                        onClick={() => handleRemoveClick(a)}
                      >
                        {role === "staff" ? (
                          <Archive className="h-4 w-4" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white px-5 py-10 text-center text-sm text-muted-foreground">
                  No appointments found.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View Details Modal */}
      <ViewDetailsModal
        appointment={selectedAppointment}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedAppointment(null);
        }}
      />

      {/* Action Modal (Approve/Reject/Complete) */}
      {showActionModal && selectedAppointment && actionType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {actionType === "approve" && "Approve Appointment?"}
                {actionType === "reject" && "Reject Appointment?"}
                {actionType === "complete" && "Mark as Complete?"}
              </h3>
              <p className="text-sm text-gray-500">{selectedAppointment.residents.name}</p>
            </div>

            {actionType === "reject" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Admin Remarks (Optional)
                </label>
                <textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Provide reason for rejection..."
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowActionModal(false);
                  setSelectedAppointment(null);
                  setActionType(null);
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                className={`flex-1 ${
                  actionType === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : actionType === "complete"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-green-600 hover:bg-green-700"
                }`}
                onClick={handleActionConfirm}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {actionType === "approve" && "Approve"}
                {actionType === "reject" && "Reject"}
                {actionType === "complete" && "Complete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal (Staff only) */}
      {showArchiveModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Archive className="w-7 h-7 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Archive Appointment?</h3>
              <p className="text-sm text-gray-500 mb-5">
                This appointment will be moved to the archive. An admin can restore it later.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowArchiveModal(false);
                    setSelectedAppointment(null);
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                  onClick={handleArchiveConfirm}
                  disabled={actionLoading}
                >
                  Archive
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal (Admin only) */}
      {showDeleteModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Appointment?</h3>
              <p className="text-sm text-gray-500 mb-5">
                Are you sure you want to delete this appointment? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedAppointment(null);
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteConfirm}
                  disabled={actionLoading}
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}