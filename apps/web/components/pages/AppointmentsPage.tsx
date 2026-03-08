"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Filter,
  Plus,
  Archive,
  Loader2,
  AlertCircle,
  Check,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
} from "lucide-react";
import {
  getAppointments,
  updateAppointmentStatus,
  deleteAppointment,
} from "@/actions/appointments";

type UserRole = "admin" | "staff";

type AppointmentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "completed"
  | "cancelled";

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

const ITEMS_PER_PAGE = 10;

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
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function formatDate(dateISO: string) {
  try {
    const dateString = dateISO.split("T")[0];
    const d = new Date(dateString + "T00:00:00Z");

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }).format(d);
  } catch (error) {
    return dateISO;
  }
}

function formatTime(timeSlot: "morning" | "afternoon") {
  return timeSlot === "morning"
    ? "8:00 AM - 11:00 AM"
    : "1:00 PM - 4:00 PM";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Appointment Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 transition-colors hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">
              Resident Name
            </p>
            <p className="text-sm font-medium text-gray-900">
              {appointment.residents.name}
            </p>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Email</p>
            <p className="text-sm font-medium text-gray-900">
              {appointment.residents.users.email}
            </p>
          </div>

          {appointment.residents.phone_number && (
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">
                Phone Number
              </p>
              <p className="text-sm font-medium text-gray-900">
                {appointment.residents.phone_number}
              </p>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">
                Service Type
              </p>
              <p className="text-sm font-medium text-gray-900">
                {appointment.services.service_name}
              </p>
            </div>

            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-gray-500">
                Appointment Date
              </p>
              <p className="text-sm font-medium text-gray-900">
                {formatFullDate(appointment.schedules.date)}
              </p>
            </div>

            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-gray-500">
                Time Slot
              </p>
              <p className="text-sm font-medium text-gray-900">
                {formatTime(appointment.time_slot)}
              </p>
            </div>

            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-gray-500">Status</p>
              <div className="mt-1">
                <StatusPill status={appointment.status} />
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-gray-500">
                Booked On
              </p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(appointment.created_at)}
              </p>
            </div>

            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-gray-500">Purpose</p>
              <p className="text-sm font-medium text-gray-900">
                {appointment.purpose}
              </p>
            </div>

            {appointment.admin_remarks && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="mb-1 text-xs font-medium text-blue-600">
                  Admin Remarks
                </p>
                <p className="text-sm text-blue-700">
                  {appointment.admin_remarks}
                </p>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={onClose}
          className="mt-6 w-full bg-primary hover:bg-primary/90"
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
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>(
    "all"
  );
  const [dateFilter, setDateFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState<
    "all" | "morning" | "afternoon"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionType, setActionType] = useState<
    "approve" | "reject" | "complete" | null
  >(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState<AppointmentRow | null>(null);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminRemarks, setAdminRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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

      const matchesStatus =
        statusFilter === "all" ? true : a.status === statusFilter;

      const matchesDate = !dateFilter || a.schedules.date === dateFilter;

      const matchesTime = timeFilter === "all" ? true : a.time_slot === timeFilter;

      return matchesQuery && matchesStatus && matchesDate && matchesTime;
    });
  }, [query, statusFilter, dateFilter, timeFilter, appointments]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, dateFilter, timeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function handleActionClick(
    appointment: AppointmentRow,
    action: "approve" | "reject" | "complete"
  ) {
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

    const statusMap: Record<
      "approve" | "reject" | "complete",
      "approved" | "rejected" | "completed"
    > = {
      approve: "approved",
      reject: "rejected",
      complete: "completed",
    };

    const actualStatus = statusMap[actionType];

    const result = await updateAppointmentStatus(
      selectedAppointment.id,
      actualStatus,
      adminRemarks || undefined
    );

    if (result.success) {
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === selectedAppointment.id
            ? {
                ...apt,
                status: actualStatus,
                admin_remarks: adminRemarks || apt.admin_remarks,
              }
            : apt
        )
      );

      if (actualStatus === "approved") {
        toast.success("Appointment approved successfully.");
      }

      if (actualStatus === "rejected") {
        toast.success("Appointment rejected successfully.");
      }

      if (actualStatus === "completed") {
        toast.success("Appointment marked as completed.");
      }

      setShowActionModal(false);
      setSelectedAppointment(null);
      setActionType(null);
      setAdminRemarks("");
    } else {
      toast.error(result.error || "Failed to update appointment.");
    }

    setActionLoading(false);
  }

  async function handleArchiveConfirm() {
    if (!selectedAppointment) return;
    setShowArchiveModal(false);
    setSelectedAppointment(null);
  }

  async function handleDeleteConfirm() {
    if (!selectedAppointment) return;

    setActionLoading(true);
    const result = await deleteAppointment(selectedAppointment.id);

    if (result.success) {
      setAppointments((prev) =>
        prev.filter((apt) => apt.id !== selectedAppointment.id)
      );
      toast.success("Appointment archived successfully.");
      setShowDeleteModal(false);
      setSelectedAppointment(null);
    } else {
      toast.error(result.error || "Failed to archive appointment.");
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
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <h3 className="font-medium text-red-900">
                Error Loading Appointments
              </h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={fetchAppointments}
                className="mt-3 text-sm font-medium text-red-600 underline hover:text-red-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const startItem =
    filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);

  return (
    <div className="space-y-6">
      <Card className="rounded-xl bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-3">
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

            </div>

            <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
              <div className="relative min-w-[180px]">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as "all" | AppointmentStatus)
                  }
                  className="h-12 w-full rounded-lg border bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="relative min-w-[180px]">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="h-12 w-full rounded-lg border bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="relative min-w-[180px]">
                <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={timeFilter}
                  onChange={(e) =>
                    setTimeFilter(
                      e.target.value as "all" | "morning" | "afternoon"
                    )
                  }
                  className="h-12 w-full rounded-lg border bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">All Time Slots</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {startItem}-{endItem} of {filtered.length} appointments
            </span>
          </div>

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
              {paginatedAppointments.length > 0 ? (
                paginatedAppointments.map((a) => (
                  <div
                    key={a.id}
                    className="grid grid-cols-12 items-center bg-white p-3"
                  >
                    <div className="col-span-3">
                      <div className="font-medium text-gray-900">
                        {a.residents.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {a.residents.users.email}
                      </div>
                    </div>
                    <div className="col-span-2 text-sm text-gray-900">
                      {a.services.service_name}
                    </div>
                    <div className="col-span-2 text-sm text-gray-900">
                      {formatDate(a.schedules.date)}
                    </div>
                    <div className="col-span-2 text-sm text-gray-900">
                      {formatTime(a.time_slot)}
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <StatusPill status={a.status} />
                    </div>
                    <div className="col-span-2 flex justify-center gap-2">
                      <button
                        className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-gray-100"
                        title="View Details"
                        onClick={() => handleViewDetails(a)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {a.status === "pending" && (
                        <>
                          <button
                            className="rounded-md p-1.5 text-green-600 transition-colors hover:bg-green-50"
                            title="Approve"
                            onClick={() => handleActionClick(a, "approve")}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            className="rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50"
                            title="Reject"
                            onClick={() => handleActionClick(a, "reject")}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}

                      {a.status === "approved" && (
                        <button
                          className="rounded-md p-1.5 text-blue-600 transition-colors hover:bg-blue-50"
                          title="Complete"
                          onClick={() => handleActionClick(a, "complete")}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        className="rounded-md p-1.5 text-yellow-600 transition-colors hover:bg-yellow-50"
                        title="Archive"
                        onClick={() => handleRemoveClick(a)}
                      >
                        <Archive className="h-4 w-4" />
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

          {filtered.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                  
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ViewDetailsModal
        appointment={selectedAppointment}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedAppointment(null);
        }}
      />

      {showActionModal && selectedAppointment && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <div className="mb-4 text-center">
              <h3 className="mb-1 text-lg font-semibold text-gray-900">
                {actionType === "approve" && "Approve Appointment?"}
                {actionType === "reject" && "Reject Appointment?"}
                {actionType === "complete" && "Mark as Complete?"}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedAppointment.residents.name}
              </p>
            </div>

            {actionType === "reject" && (
              <div className="mb-4">
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Admin Remarks (Optional)
                </label>
                <textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                {actionLoading && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {actionType === "approve" && "Approve"}
                {actionType === "reject" && "Reject"}
                {actionType === "complete" && "Complete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showArchiveModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
                <Archive className="h-7 w-7 text-yellow-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Archive Appointment?
              </h3>
              <p className="mb-5 text-sm text-gray-500">
                This appointment will be moved to the archive. An admin can
                restore it later.
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

      {showDeleteModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
                <Archive className="h-7 w-7 text-yellow-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Archive Appointment?
              </h3>
              <p className="mb-5 text-sm text-gray-500">
                Are you sure you want to archive this appointment? It will be
                removed from the active appointment list and can be restored
                later from the archive.
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
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                  onClick={handleDeleteConfirm}
                  disabled={actionLoading}
                >
                  {actionLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Archive
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}