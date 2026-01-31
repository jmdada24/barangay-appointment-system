"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Plus, Pencil, Trash2, Archive } from "lucide-react";

type UserRole = "admin" | "staff";

type AppointmentStatus = "verify" | "pending" | "rejected";

type AppointmentRow = {
  id: string;
  residentName: string;
  residentEmail: string;
  serviceType: string;
  contact: string;
  dateISO: string;
  timeRange: string;
  status: AppointmentStatus;
};

interface AppointmentsPageProps {
  role: UserRole;
}

function StatusPill({ status }: { status: AppointmentStatus }) {
  if (status === "verify") {
    return (
      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
        Verify
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
      Rejected
    </span>
  );
}

function formatDate(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00");
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

// Mock data
const mockAppointments: AppointmentRow[] = [
  {
    id: "1",
    residentName: "Juan Dela Cruz",
    residentEmail: "juan.delacruz@email.com",
    serviceType: "Barangay Clearance",
    contact: "09171234567",
    dateISO: "2026-01-22",
    timeRange: "8:00 AM - 11:00 AM",
    status: "verify",
  },
  {
    id: "2",
    residentName: "Wade Warren",
    residentEmail: "wade.warren@email.com",
    serviceType: "Certificate of Residency",
    contact: "09171234567",
    dateISO: "2026-01-22",
    timeRange: "8:00 AM - 11:00 AM",
    status: "pending",
  },
  {
    id: "3",
    residentName: "Esther Howard",
    residentEmail: "esther.howard@email.com",
    serviceType: "Barangay Indigency",
    contact: "09171234567",
    dateISO: "2026-01-22",
    timeRange: "8:00 AM - 11:00 AM",
    status: "rejected",
  },
];

export default function AppointmentsPage({ role }: AppointmentsPageProps) {
  const router = useRouter();
  const basePath = role === "admin" ? "/admin" : "/staff";

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRow | null>(null);

  const appointments = mockAppointments;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appointments.filter((a) => {
      const matchesQuery =
        !q ||
        a.residentName.toLowerCase().includes(q) ||
        a.residentEmail.toLowerCase().includes(q) ||
        a.contact.toLowerCase().includes(q) ||
        a.serviceType.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" ? true : a.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter, appointments]);

  function handleDeleteClick(appointment: AppointmentRow) {
    setSelectedAppointment(appointment);
    // Staff archives instead of deleting
    if (role === "staff") {
      setShowArchiveModal(true);
    } else {
      setShowDeleteModal(true);
    }
  }

  function handleArchiveConfirm() {
    if (!selectedAppointment) return;
    // TODO: Move to archive in Supabase
    console.log("Archive appointment:", selectedAppointment.id);
    setShowArchiveModal(false);
    setSelectedAppointment(null);
  }

  function handleDeleteConfirm() {
    if (!selectedAppointment) return;
    // TODO: Delete permanently in Supabase
    console.log("Delete appointment:", selectedAppointment.id);
    setShowDeleteModal(false);
    setSelectedAppointment(null);
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
                        ? "verify"
                        : s === "verify"
                          ? "rejected"
                          : "all"
                  )
                }
              >
                <Filter className="mr-2 h-4 w-4" />
                {statusFilter === "all"
                  ? "All Status"
                  : statusFilter === "pending"
                    ? "Pending"
                    : statusFilter === "verify"
                      ? "Verified"
                      : "Rejected"}
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
              {filtered.map((a) => (
                <div key={a.id} className="grid grid-cols-12 items-center bg-white p-3">
                  <div className="col-span-3">
                    <div className="font-medium text-gray-900">{a.residentName}</div>
                    <div className="text-xs text-muted-foreground">{a.residentEmail}</div>
                  </div>
                  <div className="col-span-2 text-sm text-gray-900">{a.serviceType}</div>
                  <div className="col-span-2 text-sm text-gray-900">{formatDate(a.dateISO)}</div>
                  <div className="col-span-2 text-sm text-gray-900">{a.timeRange}</div>
                  <div className="col-span-1 flex justify-center">
                    <StatusPill status={a.status} />
                  </div>
                  <div className="col-span-2 flex justify-center gap-3">
                    <button
                      className="rounded-md p-1 text-gray-600 hover:bg-gray-100"
                      title="Edit"
                      onClick={() => router.push(`${basePath}/appointment/${a.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className={`rounded-md p-1 ${
                        role === "staff"
                          ? "text-yellow-600 hover:bg-yellow-50"
                          : "text-red-600 hover:bg-red-50"
                      }`}
                      title={role === "staff" ? "Archive" : "Delete"}
                      onClick={() => handleDeleteClick(a)}
                    >
                      {role === "staff" ? (
                        <Archive className="h-4 w-4" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="bg-white px-5 py-10 text-center text-sm text-muted-foreground">
                  No appointments found.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                  onClick={handleArchiveConfirm}
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
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleDeleteConfirm}
                >
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