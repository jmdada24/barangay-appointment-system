"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Bell,
  Plus,
  Archive,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/actions/announcements";

type UserRole = "admin" | "staff";
type AnnouncementType = "info" | "warning" | "urgent";

type Announcement = {
  id: number;
  title: string;
  content: string;
  type: AnnouncementType;
  created_at: string;
  is_active: boolean;
};

interface AnnouncementsPageProps {
  role: UserRole;
}

const announcementTypes: AnnouncementType[] = ["info", "warning", "urgent"];

function getTypeStyles(type: AnnouncementType) {
  switch (type) {
    case "info":
      return {
        badge: "bg-blue-100 text-blue-700 border-blue-200",
        card: "border-l-blue-500",
        icon: "text-blue-500",
        title: "text-blue-700",
        content: "text-gray-600",
      };
    case "warning":
      return {
        badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
        card: "border-l-yellow-500",
        icon: "text-yellow-500",
        title: "text-yellow-700",
        content: "text-yellow-700",
      };
    case "urgent":
      return {
        badge: "bg-red-100 text-red-700 border-red-200",
        card: "border-l-red-500",
        icon: "text-red-500",
        title: "text-red-600",
        content: "text-red-600",
      };
  }
}

function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
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

export default function AnnouncementsPage({
  role,
}: AnnouncementsPageProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "info" as AnnouncementType,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  async function fetchAnnouncements() {
    setLoading(true);
    setError(null);

    const result = await getAnnouncements();
    if (result.success && result.data) {
      setAnnouncements(result.data as Announcement[]);
    } else {
      setError(result.error || "Failed to load announcements");
    }

    setLoading(false);
  }

  function validateForm() {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.content.trim()) newErrors.content = "Content is required";
    else if (formData.content.trim().length < 10)
      newErrors.content = "Content must be at least 10 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    setActionLoading(true);

    const result = await createAnnouncement(formData);

    if (result.success) {
      await fetchAnnouncements();
      toast.success("Announcement created successfully.");
      setShowCreateModal(false);
      setFormData({ title: "", content: "", type: "info" });
      setErrors({});
    } else {
      toast.error(result.error || "Failed to create announcement.");
    }

    setActionLoading(false);
  }

  function handleRemoveClick(announcement: Announcement) {
    setSelectedAnnouncement(announcement);
    if (role === "staff") {
      setShowArchiveModal(true);
    } else {
      setShowDeleteModal(true);
    }
  }

  async function handleArchiveConfirm() {
    if (!selectedAnnouncement) return;

    setActionLoading(true);
    const result = await deleteAnnouncement(selectedAnnouncement.id);

    if (result.success) {
      setAnnouncements((prev) =>
        prev.filter((a) => a.id !== selectedAnnouncement.id)
      );
      toast.success("Announcement archived successfully.");
      setShowArchiveModal(false);
      setSelectedAnnouncement(null);
    } else {
      toast.error(result.error || "Failed to archive announcement.");
    }

    setActionLoading(false);
  }

  async function handleDeleteConfirm() {
    if (!selectedAnnouncement) return;

    setActionLoading(true);
    const result = await deleteAnnouncement(selectedAnnouncement.id);

    if (result.success) {
      setAnnouncements((prev) =>
        prev.filter((a) => a.id !== selectedAnnouncement.id)
      );
      toast.success("Announcement archived successfully.");
      setShowDeleteModal(false);
      setSelectedAnnouncement(null);
    } else {
      toast.error(result.error || "Failed to archive announcement.");
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
                Error Loading Announcements
              </h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={fetchAnnouncements}
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/90"
          size="lg"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Announcement
        </Button>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="space-y-3 p-4">
          {announcements.length > 0 ? (
            announcements.map((announcement) => {
              const styles = getTypeStyles(announcement.type);
              return (
                <div
                  key={announcement.id}
                  className={`rounded-lg border border-gray-100 border-l-4 bg-white p-4 ${styles.card}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <Bell
                        className={`mt-0.5 h-5 w-5 flex-shrink-0 ${styles.icon}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className={`font-semibold ${styles.title}`}>
                            {announcement.title}
                          </h3>
                          <span
                            className={`rounded border px-2 py-0.5 text-xs font-medium ${styles.badge}`}
                          >
                            {capitalizeFirst(announcement.type)}
                          </span>
                        </div>
                        <p className={`mb-2 text-sm ${styles.content}`}>
                          {announcement.content}
                        </p>
                        <p className="text-xs text-gray-500">
                          Posted: {formatDate(announcement.created_at)}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveClick(announcement)}
                      className="flex-shrink-0 rounded-lg p-2 text-yellow-500 transition-colors hover:bg-yellow-50 hover:text-yellow-600"
                      title="Archive"
                    >
                      <Archive className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center">
              <Bell className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-1 text-lg font-medium text-gray-900">
                No announcements yet
              </h3>
              <p className="text-sm text-gray-500">
                Create your first announcement to notify residents.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                New Announcement
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ title: "", content: "", type: "info" });
                  setErrors({});
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }));
                    if (errors.title)
                      setErrors((prev) => ({ ...prev, title: "" }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                    errors.title ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="Enter announcement title"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {announcementTypes.map((type) => {
                    const isSelected = formData.type === type;
                    const styles = getTypeStyles(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, type }))
                        }
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                          isSelected
                            ? `${styles.badge} ring-2 ring-primary/30 ring-offset-1`
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        {capitalizeFirst(type)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }));
                    if (errors.content)
                      setErrors((prev) => ({ ...prev, content: "" }));
                  }}
                  rows={4}
                  className={`w-full resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                    errors.content ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="Enter announcement content"
                />
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">{errors.content}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ title: "", content: "", type: "info" });
                    setErrors({});
                  }}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={actionLoading}
                >
                  {actionLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Announcement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Modal (Staff) */}
      {showArchiveModal && selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
                <Archive className="h-7 w-7 text-yellow-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Archive Announcement?
              </h3>
              <p className="mb-5 text-sm text-gray-500">
                This announcement will be moved to the archive. An admin can
                restore it later.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowArchiveModal(false);
                    setSelectedAnnouncement(null);
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

      {/* Archive Modal (Admin) */}
      {showDeleteModal && selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100">
                <Archive className="h-7 w-7 text-yellow-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Archive Announcement?
              </h3>
              <p className="mb-5 text-sm text-gray-500">
                Are you sure you want to archive "
                {selectedAnnouncement.title}"? It will be removed from the
                active announcements list and can be restored later from the
                archive.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedAnnouncement(null);
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