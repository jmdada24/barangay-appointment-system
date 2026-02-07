"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Calendar,
  Clock,
  Eye,
  Filter,
  RotateCcw,
  Search,
  Trash2,
  User,
  X,
  Lock,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

type ArchivedItemType = "appointment" | "resident" | "announcement" | "feedback";

type ArchivedItem = {
  id: string;
  type: ArchivedItemType;
  title: string;
  description: string;
  archivedAt: string;
  archivedBy: string;
  originalData: Record<string, unknown>;
};

const mockArchivedItems: ArchivedItem[] = [
  {
    id: "1",
    type: "appointment",
    title: "Barangay Clearance - Juan Dela Cruz",
    description: "Appointment completed on January 10, 2026",
    archivedAt: "2026-01-15",
    archivedBy: "Admin",
    originalData: { service: "Barangay Clearance", resident: "Juan Dela Cruz" },
  },
  {
    id: "2",
    type: "resident",
    title: "Maria Santos",
    description: "Account deactivated - moved to another barangay",
    archivedAt: "2026-01-14",
    archivedBy: "Admin",
    originalData: { email: "maria.santos@email.com", contact: "09123456789" },
  },
  {
    id: "3",
    type: "announcement",
    title: "Holiday Schedule 2025",
    description: "Expired announcement from December 2025",
    archivedAt: "2026-01-02",
    archivedBy: "Admin",
    originalData: { type: "info", content: "Office closed on Dec 25-26, 2025" },
  },
  {
    id: "4",
    type: "feedback",
    title: "Feedback from Pedro Reyes",
    description: "Resolved complaint about waiting time",
    archivedAt: "2026-01-12",
    archivedBy: "Admin",
    originalData: { rating: 2, category: "Complaints" },
  },
  {
    id: "5",
    type: "appointment",
    title: "Business Clearance - ABC Store",
    description: "Appointment completed on January 8, 2026",
    archivedAt: "2026-01-10",
    archivedBy: "Admin",
    originalData: { service: "Business Clearance", resident: "Jose Garcia" },
  },
  {
    id: "6",
    type: "announcement",
    title: "System Maintenance Notice",
    description: "Completed maintenance notification",
    archivedAt: "2026-01-05",
    archivedBy: "Admin",
    originalData: { type: "urgent", content: "System maintenance on Jan 5" },
  },
];

const itemTypes: { value: ArchivedItemType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "appointment", label: "Appointments" },
  { value: "resident", label: "Residents" },
  { value: "announcement", label: "Announcements" },
  { value: "feedback", label: "Feedback" },
];

function getTypeStyles(type: ArchivedItemType) {
  switch (type) {
    case "appointment":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
        icon: Calendar,
      };
    case "resident":
      return {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
        icon: User,
      };
    case "announcement":
      return {
        bg: "bg-yellow-50",
        text: "text-yellow-700",
        border: "border-yellow-200",
        icon: Archive,
      };
    case "feedback":
      return {
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200",
        icon: Eye,
      };
    default:
      return {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
        icon: Archive,
      };
  }
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function AdminArchivePage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>(mockArchivedItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ArchivedItemType | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ArchivedItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Check user role on mount
  useEffect(() => {
    async function checkAuthorization() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      const { data: userRecord } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", user.id)
        .single();

      if (userRecord?.role === "admin") {
        setIsAuthorized(true);
      } else {
        router.push("/staff");
      }

      setIsLoading(false);
    }

    checkAuthorization();
  }, [router]);

  // Stats
  const stats = useMemo(() => {
    const total = archivedItems.length;
    const appointments = archivedItems.filter((i) => i.type === "appointment").length;
    const residents = archivedItems.filter((i) => i.type === "resident").length;
    const others = archivedItems.filter(
      (i) => i.type === "announcement" || i.type === "feedback"
    ).length;

    return [
      { label: "Total Archived", value: total, hint: "All archived items", icon: Archive },
      { label: "Appointments", value: appointments, hint: "Completed/cancelled", icon: Calendar },
      { label: "Residents", value: residents, hint: "Deactivated accounts", icon: User },
      { label: "Others", value: others, hint: "Announcements & feedback", icon: Clock },
    ];
  }, [archivedItems]);

  // Filtered & sorted items
  const filteredItems = useMemo(() => {
    let result = [...archivedItems];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query)
      );
    }

    if (typeFilter !== "all") {
      result = result.filter((item) => item.type === typeFilter);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.archivedAt).getTime();
      const dateB = new Date(b.archivedAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [archivedItems, searchQuery, typeFilter, sortOrder]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authorized, show access denied
  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Lock className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600 max-w-md">
            The archive section is only available to administrators. Staff members do not have
            access to this feature.
          </p>
          <Button onClick={() => router.push("/staff")} className="mt-4">
            Go to Staff Dashboard
          </Button>
        </div>
      </div>
    );
  }

  function handleViewClick(item: ArchivedItem) {
    setSelectedItem(item);
    setShowViewModal(true);
  }

  function handleRestoreClick(item: ArchivedItem) {
    setSelectedItem(item);
    setShowRestoreModal(true);
  }

  function handleDeleteClick(item: ArchivedItem) {
    setSelectedItem(item);
    setShowDeleteModal(true);
  }

  async function handleRestoreConfirm() {
    if (!selectedItem) return;
    setActionLoading(true);

    setArchivedItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
    setShowRestoreModal(false);
    setSelectedItem(null);

    setActionLoading(false);
  }

  async function handleDeleteConfirm() {
    if (!selectedItem) return;
    setActionLoading(true);

    setArchivedItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
    setShowDeleteModal(false);
    setSelectedItem(null);

    setActionLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Admin Badge */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
        <Lock className="w-5 h-5 text-blue-600" />
        <p className="text-sm font-medium text-blue-900">
          Admin Only - Archive section is restricted to administrators only.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Icon className="h-10 w-10 text-primary" />
                  <div className="text-3xl font-semibold">{s.value}</div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col items-start space-y-1">
                <CardTitle className="font-semibold text-primary">{s.label}</CardTitle>
                <div className="text-xs text-muted-foreground">{s.hint}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters & Archive List */}
      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search archived items..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as ArchivedItemType | "all")}
                className="pl-10 pr-8 py-2 text-sm border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {itemTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort by Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                className="pl-10 pr-8 py-2 text-sm border border-gray-200 rounded-lg appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Archive List */}
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const styles = getTypeStyles(item.type);
              const TypeIcon = styles.icon;

              return (
                <div
                  key={item.id}
                  className="p-4 bg-white border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Type Icon */}
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${styles.bg}`}
                      >
                        <TypeIcon className={`w-5 h-5 ${styles.text}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-medium text-gray-900">{item.title}</h3>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded border ${styles.bg} ${styles.text} ${styles.border}`}
                          >
                            {capitalizeFirst(item.type)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{item.description}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Archived: {formatDate(item.archivedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            By: {item.archivedBy}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleViewClick(item)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRestoreClick(item)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Restore"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="text-center py-10">
                <Archive className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No archived items</h3>
                <p className="text-sm text-gray-500">
                  {searchQuery || typeFilter !== "all"
                    ? "Try adjusting your search or filters."
                    : "Items you delete will appear here."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Details Modal */}
      {showViewModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Archived Item Details</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Type</p>
                <p className="text-sm font-medium text-gray-900">
                  {capitalizeFirst(selectedItem.type)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Title</p>
                <p className="text-sm font-medium text-gray-900">{selectedItem.title}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Description</p>
                <p className="text-sm text-gray-700">{selectedItem.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Archived Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(selectedItem.archivedAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Archived By</p>
                  <p className="text-sm font-medium text-gray-900">{selectedItem.archivedBy}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Original Data</p>
                <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-32 border border-gray-200">
                  {JSON.stringify(selectedItem.originalData, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowViewModal(false)}
              >
                Close
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setShowViewModal(false);
                  handleRestoreClick(selectedItem);
                }}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Restore
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Restore Item?</h3>
              <p className="text-sm text-gray-500 mb-5">
                Are you sure you want to restore "{selectedItem.title}"? This will move it back to
                its original location.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowRestoreModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleRestoreConfirm}
                  disabled={actionLoading}
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Restore
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 shadow-xl animate-in slide-in-from-bottom-4 duration-300">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Permanently?</h3>
              <p className="text-sm text-gray-500 mb-5">
                Are you sure you want to permanently delete "{selectedItem.title}"? This action
                cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteModal(false)}
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