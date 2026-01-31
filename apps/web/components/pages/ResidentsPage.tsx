"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, BadgeCheck, Clock, Search, Filter, Plus, Pencil, Trash2, Archive } from "lucide-react";

type UserRole = "admin" | "staff";
type ResidentStatus = "verify" | "pending" | "rejected";

type ResidentRow = {
  id: string;
  name: string;
  email: string;
  contact: string;
  address: string;
  status: ResidentStatus;
};

interface ResidentsPageProps {
  role: UserRole;
}

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

const mockResidents: ResidentRow[] = [
  { id: "1", name: "Juan Dela Cruz", email: "juan.delacruz@email.com", contact: "09171234567", address: "123 Main St, Barangay Sample", status: "verify" },
  { id: "2", name: "Wade Warren", email: "wade.warren@email.com", contact: "09171234567", address: "123 Main St, Barangay Sample", status: "pending" },
  { id: "3", name: "Esther Howard", email: "esther.howard@email.com", contact: "09171234567", address: "123 Main St, Barangay Sample", status: "rejected" },
  { id: "4", name: "Cameron Williamson", email: "cameron.w@email.com", contact: "09171234567", address: "123 Main St, Barangay Sample", status: "verify" },
  { id: "5", name: "Cameron Williamson", email: "cameron.w2@email.com", contact: "09171234567", address: "123 Main St, Barangay Sample", status: "pending" },
];

export default function ResidentsPage({ role }: ResidentsPageProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ResidentStatus>("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState<ResidentRow | null>(null);

  const residents = mockResidents;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return residents.filter((r) => {
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.contact.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter, residents]);

  const totalResidents = residents.length;
  const verifiedCount = residents.filter((r) => r.status === "verify").length;
  const pendingCount = residents.filter((r) => r.status === "pending").length;

  function handleRemoveClick(resident: ResidentRow) {
    setSelectedResident(resident);
    if (role === "staff") {
      setShowArchiveModal(true);
    } else {
      setShowDeleteModal(true);
    }
  }

  function handleArchiveConfirm() {
    if (!selectedResident) return;
    console.log("Archive resident:", selectedResident.id);
    setShowArchiveModal(false);
    setSelectedResident(null);
  }

  function handleDeleteConfirm() {
    if (!selectedResident) return;
    console.log("Delete resident:", selectedResident.id);
    setShowDeleteModal(false);
    setSelectedResident(null);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-xl bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <Users className="h-10 w-10 text-primary" />
              <div className="text-3xl font-semibold text-primary">{totalResidents}</div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="font-semibold text-primary">Total Residents</div>
              <div className="text-xs text-muted-foreground">Registered users</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <BadgeCheck className="h-10 w-10 text-primary" />
              <div className="text-3xl font-semibold text-primary">{verifiedCount}</div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="font-semibold text-primary">Verified</div>
              <div className="text-xs text-muted-foreground">Active accounts</div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <Clock className="h-10 w-10 text-primary" />
              <div className="text-3xl font-semibold text-primary">{pendingCount}</div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="font-semibold text-primary">Pending Verification</div>
              <div className="text-xs text-muted-foreground">Awaiting approval</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="rounded-xl bg-white shadow-sm">
        <CardContent className="p-6">
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
                    s === "all" ? "pending" : s === "pending" ? "verify" : s === "verify" ? "rejected" : "all"
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

              <Button size="lg" className="rounded-lg bg-primary hover:bg-primary/90 py-6">
                <Plus className="mr-2 h-4 w-4" />
                Add Resident
              </Button>
            </div>
          </div>

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
                    <div className="font-medium text-gray-900">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </div>
                  <div className="col-span-2 text-sm text-gray-900">{r.contact}</div>
                  <div className="col-span-3 text-sm text-muted-foreground">{r.address}</div>
                  <div className="col-span-2 flex justify-center">
                    <StatusPill status={r.status} />
                  </div>
                  <div className="col-span-2 flex justify-center gap-3">
                    <button className="rounded-md p-1 text-gray-600 hover:bg-gray-100" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      className={`rounded-md p-1 ${
                        role === "staff"
                          ? "text-yellow-600 hover:bg-yellow-50"
                          : "text-red-600 hover:bg-red-50"
                      }`}
                      title={role === "staff" ? "Archive" : "Delete"}
                      onClick={() => handleRemoveClick(r)}
                    >
                      {role === "staff" ? <Archive className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
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

      {/* Archive Modal (Staff) */}
      {showArchiveModal && selectedResident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Archive className="w-7 h-7 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Archive Resident?</h3>
            <p className="text-sm text-gray-500 mb-5">
              This resident will be moved to archive. An admin can restore it later.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowArchiveModal(false); setSelectedResident(null); }}>
                Cancel
              </Button>
              <Button className="flex-1 bg-yellow-600 hover:bg-yellow-700" onClick={handleArchiveConfirm}>
                Archive
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal (Admin) */}
      {showDeleteModal && selectedResident && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Delete Resident?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowDeleteModal(false); setSelectedResident(null); }}>
                Cancel
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleDeleteConfirm}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}