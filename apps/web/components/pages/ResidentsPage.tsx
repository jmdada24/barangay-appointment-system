"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
  Archive,
  Eye,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { getResidents, deleteResident } from "@/actions/residents";
import type { ResidentWithUser, VerificationStatus } from "@/types/resident";

import {
  ResidentFormDialog,
  ResidentEditDialog,
  ResidentViewDialog,
  ArchiveDialog,
} from "@/components/forms";

type UserRole = "admin" | "staff";

interface ResidentsPageProps {
  role: UserRole;
}

const ITEMS_PER_PAGE = 10;

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
  const [currentPage, setCurrentPage] = useState(1);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState<ResidentWithUser | null>(null);

  async function fetchResidents() {
    setLoading(true);
    const { data } = await getResidents();
    if (data) setResidents(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchResidents();
  }, []);

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

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

  const paginatedResidents = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const totalResidents = residents.length;
  const verifiedCount = residents.filter((r) => r.verification_status === "verified").length;
  const pendingCount = residents.filter((r) => r.verification_status === "pending").length;

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
    setShowArchiveModal(true);
  }

  async function handleArchiveConfirm() {
    if (!selectedResident) return;

    const result = await deleteResident(selectedResident.id);

    if (!result.success) {
      toast.error(result.error || "Failed to archive resident.");
      return;
    }

    toast.success("Resident archived successfully.");
    await fetchResidents();
    setSelectedResident(null);
    setShowArchiveModal(false);
  }

  const startItem = filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, filtered.length);

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
            <div className="relative w-full flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, or contact..."
                className="h-12 w-full rounded-lg border bg-white pl-10 pr-3 text-sm"
              />
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as "all" | VerificationStatus)}
              >
                <SelectTrigger className="h-12 min-h-12 w-full rounded-lg sm:w-[160px]">
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
                className="rounded-lg bg-primary py-6 hover:bg-primary/90"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Resident
              </Button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Showing {startItem}-{endItem} of {filtered.length} residents
            </span>
          </div>

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
                {paginatedResidents.map((r) => (
                  <div key={r.id} className="grid grid-cols-12 items-center bg-white p-3">
                    <div className="col-span-3">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.users?.email}</div>
                    </div>
                    <div className="col-span-2 text-sm text-gray-900">{r.phone_number || "-"}</div>
                    <div className="col-span-3 truncate text-sm text-muted-foreground">
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
                        className="rounded-md p-1 text-yellow-600 hover:bg-yellow-50"
                        title="Archive"
                        onClick={() => handleRemoveClick(r)}
                      >
                        <Archive className="h-4 w-4" />
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
    </div>
  );
}