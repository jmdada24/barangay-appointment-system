"use client";

// Folder: apps/web/app/(admin)/admin/resident

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  BadgeCheck,
  Clock,
  Search,
  Filter,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";

type ResidentStatus = "verify" | "pending" | "rejected";

type ResidentRow = {
  id: string;
  name: string;
  email: string;
  contact: string;
  address: string;
  status: ResidentStatus;
};

function StatusPill({ status }: { status: ResidentStatus }) {
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

export default function AdminResidentPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ResidentStatus>("all");

  // Mock data (replace with Supabase later)
  const residents: ResidentRow[] = [
    {
      id: "1",
      name: "Juan Dela Cruz",
      email: "juan.delacruz@email.com",
      contact: "09171234567",
      address: "123 Main St, Barangay Sample",
      status: "verify",
    },
    {
      id: "2",
      name: "Wade Warren",
      email: "wade.warren@email.com",
      contact: "09171234567",
      address: "123 Main St, Barangay Sample",
      status: "pending",
    },
    {
      id: "3",
      name: "Esther Howard",
      email: "esther.howard@email.com",
      contact: "09171234567",
      address: "123 Main St, Barangay Sample",
      status: "rejected",
    },
    {
      id: "4",
      name: "Cameron Williamson",
      email: "cameron.w@email.com",
      contact: "09171234567",
      address: "123 Main St, Barangay Sample",
      status: "verify",
    },
    {
      id: "5",
      name: "Cameron Williamson",
      email: "cameron.w2@email.com",
      contact: "09171234567",
      address: "123 Main St, Barangay Sample",
      status: "pending",
    },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return residents.filter((r) => {
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.contact.toLowerCase().includes(q);

      const matchesStatus = statusFilter === "all" ? true : r.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter, residents]);

  const totalResidents = residents.length;
  const verifiedCount = residents.filter((r) => r.status === "verify").length;
  const pendingCount = residents.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Stats (matches your screenshot) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-xl bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <Users className="h-10 w-10 text-[#062E24]" />
              <div className="text-3xl font-semibold text-[#062E24]">{totalResidents}</div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="font-semibold text-[#062E24]">Total Residents</div>
              <div className="text-xs text-muted-foreground">Registered users</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <BadgeCheck className="h-10 w-10 text-[#062E24]" />
              <div className="text-3xl font-semibold text-[#062E24]">{verifiedCount}</div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="font-semibold text-[#062E24]">Verified</div>
              <div className="text-xs text-muted-foreground">Active accounts</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <Clock className="h-10 w-10 text-[#062E24]" />
              <div className="text-3xl font-semibold text-[#062E24]">{pendingCount}</div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="font-semibold text-[#062E24]">Pending Verification</div>
              <div className="text-xs text-muted-foreground">Awaiting approval</div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Table container */}
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
                  setStatusFilter((s) => (s === "all" ? "pending" : s === "pending" ? "verify" : s === "verify" ? "rejected" : "all"))
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
                onClick={() => {
                  // TODO: open modal / navigate to create form
                  alert("Add Resident (hook up later)");
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Resident
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-8 overflow-hidden rounded-lg">
            <div className="grid grid-cols-12 bg-white p-3 text-sm font-semibold text-muted-foreground">
              <div className="col-span-3">RESIDENT INFO</div>
              <div className="col-span-2">CONTACT</div>
              <div className="col-span-3">ADDRESS</div>
              <div className="col-span-2 text-center">STATUS</div>
              <div className="col-span-2 text-center">ACTION</div>
            </div>

            <div className="divide-y">
              {filtered.map((r) => (
                <div key={r.id} className="grid grid-cols-12 items-center bg-white p-3">
                  <div className="col-span-3">
                    <div className="font-medium text-[#1b1b1b]">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </div>

                  <div className="col-span-2 text-sm text-[#1b1b1b]">{r.contact}</div>

                  <div className="col-span-3 text-sm text-muted-foreground">{r.address}</div>

                  <div className="col-span-2 flex justify-center">
                    <StatusPill status={r.status} />
                  </div>

                  <div className="col-span-2 flex justify-center gap-3">
                    <button
                      type="button"
                      className="rounded-md p-1 text-[#1b1b1b] hover:bg-black/5"
                      title="Edit"
                      onClick={() => alert(`Edit ${r.name} (hook up later)`)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      className="rounded-md p-1 text-red-600 hover:bg-red-50"
                      title="Delete"
                      onClick={() => alert(`Delete ${r.name} (hook up later)`)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="bg-white px-5 py-10 text-center text-sm text-muted-foreground">
                  No residents found.
                </div>
              )}

            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}