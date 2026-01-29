"use client";

// Folder: apps/web/app/(admin)/admin/appointments

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Plus, Pencil, Trash2 } from "lucide-react";

type AppointmentStatus = "verify" | "pending" | "rejected";

type AppointmentRow = {
  id: string;
  residentName: string;
  residentEmail: string;
  serviceType: string;
  contact: string;
  dateISO: string; // e.g. "2026-01-22"
  timeRange: string; // e.g. "8:00 AM - 11:00 AM"
  status: AppointmentStatus;
};

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

export default function AdminAppointmentPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AppointmentStatus>("all");

  // Mock data (replace with Supabase later)
  const appointments: AppointmentRow[] = [
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

  return (
    <div className="space-y-6">
      {/* Table container (same structure as Residents) */}
      <Card className="rounded-xl bg-white shadow-sm">
        <CardContent className="p-6">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative w-full lg:max-w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Select by name, email, or contact number..."
                className="h-12 w-full rounded-lg border bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#062E24]/20"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                type="button"
                variant="outline"
                className="rounded-lg py-6"
                onClick={() =>
                  setStatusFilter((s) =>
                    s === "all" ? "pending" : s === "pending" ? "verify" : s === "verify" ? "rejected" : "all",
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
                type="button"
                className="rounded-lg bg-[#062E24] hover:bg-[#062E24]/90 py-6"
                onClick={() => router.push("/admin/appointment/new")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Appointment
              </Button>
            </div>
          </div>

          {/* Table (same structure, adjusted columns for appointments) */}
          <div className="mt-8 overflow-hidden rounded-lg">
            <div className="grid grid-cols-12 bg-white  text-sm font-semibold text-muted-foreground">
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
                    <div className="font-medium text-[#1b1b1b]">{a.residentName}</div>
                    <div className="text-xs text-muted-foreground">{a.residentEmail}</div>
                  </div>

                  <div className="col-span-2 text-sm text-[#1b1b1b]">{a.serviceType}</div>

                  <div className="col-span-2 text-sm text-[#1b1b1b]">{formatDate(a.dateISO)}</div>

                  <div className="col-span-2 text-sm text-[#1b1b1b]">{a.timeRange}</div>

                  <div className="col-span-1 flex justify-center">
                    <StatusPill status={a.status} />
                  </div>

                  <div className="col-span-2 flex justify-center gap-3">
                    <button
                      type="button"
                      className="rounded-md p-1 text-[#1b1b1b] hover:bg-black/5"
                      title="Edit"
                      onClick={() => router.push(`/admin/appointment/${a.id}`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      className="rounded-md p-1 text-red-600 hover:bg-red-50"
                      title="Delete"
                      onClick={() => alert(`Delete appointment #${a.id} (hook up later)`)}
                    >
                      <Trash2 className="h-4 w-4" />
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
    </div>
  );
}