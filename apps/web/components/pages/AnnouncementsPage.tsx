"use client";

import { useState } from "react";
import { Bell, Plus, Trash2, Archive, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type UserRole = "admin" | "staff";
type AnnouncementType = "info" | "warning" | "urgent";

type Announcement = {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  createdAt: string;
};

interface AnnouncementsPageProps {
  role: UserRole;
}

const mockAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "Barangay Hall Operating Hours",
    content: "Please be informed that the Barangay Hall will be open from 8:00 AM to 5:00 PM, Monday to Friday.",
    type: "info",
    createdAt: "2026-01-20",
  },
  {
    id: "2",
    title: "Document Processing Time",
    content: "All barangay clearance and certificate requests will be processed within 3-5 business days.",
    type: "warning",
    createdAt: "2026-01-18",
  },
  {
    id: "3",
    title: "System Maintenance Notice",
    content: "The online appointment system will undergo scheduled maintenance on January 25, 2026.",
    type: "urgent",
    createdAt: "2026-01-15",
  },
];

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

export default function AnnouncementsPage({ role }: AnnouncementsPageProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "info" as AnnouncementType,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validateForm() {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = "Title is required";
    if (!formData.content.trim()) newErrors.content = "Content is required";
    else if (formData.content.trim().length < 10) newErrors.content = "Content must be at least 10 characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    const newAnnouncement: Announcement = {
      id: Date.now().toString(),
      title: formData.title,
      content: formData.content,
      type: formData.type,
      createdAt: new Date().toISOString().split("T")[0],
    };

    setAnnouncements((prev) => [newAnnouncement, ...prev]);
    setShowCreateModal(false);
    setFormData({ title: "", content: "", type: "info" });
    setErrors({});
  }

  function handleRemoveClick(announcement: Announcement) {
    setSelectedAnnouncement(announcement);
    if (role === "staff") {
      setShowArchiveModal(true);
    } else {
      setShowDeleteModal(true);
    }
  }

  function handleArchiveConfirm() {
    if (!selectedAnnouncement) return;
    // TODO: Move to archive
    setAnnouncements((prev) => prev.filter((a) => a.id !== selectedAnnouncement.id));
    setShowArchiveModal(false);
    setSelectedAnnouncement(null);
  }

  function handleDeleteConfirm() {
    if (!selectedAnnouncement) return;
    setAnnouncements((prev) => prev.filter((a) => a.id !== selectedAnnouncement.id));
    setShowDeleteModal(false);
    setSelectedAnnouncement(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={() => setShowCreateModal(true)} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New
        </Button>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="p-4 space-y-3">
          {announcements.map((announcement) => {
            const styles = getTypeStyles(announcement.type);
            return (
              <div
                key={announcement.id}
                className={`p-4 bg-white border border-gray-100 rounded-lg border-l-4 ${styles.card}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Bell className={`w-5 h-5 mt-0.5 flex-shrink-0 ${styles.icon}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className={`font-semibold ${styles.title}`}>{announcement.title}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${styles.badge}`}>
                          {capitalizeFirst(announcement.type)}
                        </span>
                      </div>
                      <p className={`text-sm ${styles.content}`}>{announcement.content}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveClick(announcement)}
                    className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                      role === "staff"
                        ? "text-yellow-400 hover:text-yellow-600 hover:bg-yellow-50"
                        : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                    }`}
                  >
                    {role === "staff" ? <Archive className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            );
          })}

          {announcements.length === 0 && (
            <div className="text-center py-10">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No announcements yet</h3>
              <p className="text-sm text-gray-500">Create your first announcement to notify residents.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">New Announcement</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ title: "", content: "", type: "info" });
                  setErrors({});
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, title: e.target.value }));
                    if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                    errors.title ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="Enter announcement title"
                />
                {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
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
                        onClick={() => setFormData((prev) => ({ ...prev, type }))}
                        className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                          isSelected
                            ? `${styles.badge} ring-2 ring-offset-1 ring-primary/30`
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {capitalizeFirst(type)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, content: e.target.value }));
                    if (errors.content) setErrors((prev) => ({ ...prev, content: "" }));
                  }}
                  rows={4}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none ${
                    errors.content ? "border-red-500" : "border-gray-200"
                  }`}
                  placeholder="Enter announcement content"
                />
                {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
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
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
                  Create Announcement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Modal (Staff) */}
      {showArchiveModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Archive className="w-7 h-7 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Archive Announcement?</h3>
              <p className="text-sm text-gray-500 mb-5">
                This announcement will be moved to the archive. An admin can restore it later.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setShowArchiveModal(false); setSelectedAnnouncement(null); }}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-yellow-600 hover:bg-yellow-700" onClick={handleArchiveConfirm}>
                  Archive
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal (Admin) */}
      {showDeleteModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Announcement?</h3>
              <p className="text-sm text-gray-500 mb-5">
                Are you sure you want to delete "{selectedAnnouncement.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setShowDeleteModal(false); setSelectedAnnouncement(null); }}>
                  Cancel
                </Button>
                <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleDeleteConfirm}>
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