"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  BadgeCheck,
  Clock,
  Search,
  Plus,
  Pencil,
  Trash2,
  Archive,
  Eye,
  Loader2,
} from "lucide-react";

import {
  getResidents,
  deleteResident,
  archiveResident,
} from "@/actions/residents";
import type { ResidentWithUser, VerificationStatus } from "@/types/resident";

import {
  ResidentFormDialog,
  ResidentEditDialog,
  ResidentViewDialog,
  ArchiveDialog,
  DeleteDialog,
} from "@/components/forms";

type UserRole = "admin" | "staff";

interface ResidentsPageProps {
  role: UserRole;
}

function StatusPill({ status }: { status: VerificationStatus }) {
  const styles = {
    verified: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    rejected: "bg-rose-50 text-rose-700",
  };

  const labels = {
    verified: "Verified",
    pending: "Pending",
    rejected: "Rejected",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function ResidentsPage({ role }: ResidentsPageProps) {
  const [residents, setResidents] = useState<ResidentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VerificationStatus>("all");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState<ResidentWithUser | null>(null);

  // Fetch residents
  async function fetchResidents() {
    setLoading(true);
    const { data } = await getResidents();
    if (data) setResidents(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchResidents();
  }, []);

  // Filter residents
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return residents.filter((r) => {
      const email = r.users?.email || "";
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        (r.phone_number || "").toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" || r.verification_status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [query, statusFilter, residents]);

  // Stats
  const totalResidents = residents.length;
  const verifiedCount = residents.filter((r) => r.verification_status === "verified").length;
  const pendingCount = residents.filter((r) => r.verification_status === "pending").length;

  // Handlers
  function handleViewClick(resident: ResidentWithUser) {
    setSelectedResident(resident);
    setShowViewModal(true);
  }

  function handleEditClick(resident: ResidentWithUser) {
    setSelectedResident(resident);
    setShowEditModal(true);
  }

  function handleRemoveClick(resident: ResidentWithUser) {
    setSelectedResident(resident);
    if (role === "staff") {
      setShowArchiveModal(true);
    } else {
      setShowDeleteModal(true);
    }
  }

  async function handleArchiveConfirm() {
    if (!selectedResident) return;
    await archiveResident(selectedResident.id);
    await fetchResidents();
    setSelectedResident(null);
  }

  async function handleDeleteConfirm() {
    if (!selectedResident) return;
    await deleteResident(selectedResident.id);
    await fetchResidents();
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
            <div className="relative w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, or contact..."
                className="h-12 w-full rounded-lg border bg-white pl-10 pr-3 text-sm"
              />
            </div>

            <div className="flex items-center gap-3">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "all" | VerificationStatus)}
              >
                <SelectTrigger className="min-h-12 h-12 w-[160px] rounded-lg">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="lg"
                className="rounded-lg bg-primary hover:bg-primary/90 py-6"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Resident
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-8 overflow-hidden rounded-lg border">
            <div className="grid grid-cols-12 bg-gray-50 p-3 text-sm font-semibold text-muted-foreground">
              <div className="col-span-3">RESIDENT INFO</div>
              <div className="col-span-2">CONTACT</div>
              <div className="col-span-3">ADDRESS</div>
              <div className="col-span-2 text-center">STATUS</div>
              <div className="col-span-2 text-center">ACTION</div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((r) => (
                  <div key={r.id} className="grid grid-cols-12 items-center bg-white p-3">
                    <div className="col-span-3">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.users?.email}</div>
                    </div>
                    <div className="col-span-2 text-sm text-gray-900">{r.phone_number || "-"}</div>
                    <div className="col-span-3 text-sm text-muted-foreground truncate">
                      {r.address || "-"}
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <StatusPill status={r.verification_status} />
                    </div>
                    <div className="col-span-2 flex justify-center gap-2">
                      <button
                        className="rounded-md p-1 text-blue-600 hover:bg-blue-50"
                        title="View"
                        onClick={() => handleViewClick(r)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="rounded-md p-1 text-gray-600 hover:bg-gray-100"
                        title="Edit"
                        onClick={() => handleEditClick(r)}
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
                        onClick={() => handleRemoveClick(r)}
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

                {filtered.length === 0 && !loading && (
                  <div className="bg-white px-5 py-10 text-center text-sm text-muted-foreground">
                    No residents found.
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ResidentFormDialog
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={fetchResidents}
      />

      <ResidentEditDialog
        open={showEditModal}
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) setSelectedResident(null);
        }}
        resident={selectedResident}
        onSuccess={fetchResidents}
      />

      <ResidentViewDialog
        open={showViewModal}
        onOpenChange={(open) => {
          setShowViewModal(open);
          if (!open) setSelectedResident(null);
        }}
        resident={selectedResident}
        onSuccess={fetchResidents}
      />

      <ArchiveDialog
        open={showArchiveModal}
        onOpenChange={(open) => {
          setShowArchiveModal(open);
          if (!open) setSelectedResident(null);
        }}
        name={selectedResident?.name || ""}
        onConfirm={handleArchiveConfirm}
      />

      <DeleteDialog
        open={showDeleteModal}
        onOpenChange={(open) => {
          setShowDeleteModal(open);
          if (!open) setSelectedResident(null);
        }}
        name={selectedResident?.name || ""}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}