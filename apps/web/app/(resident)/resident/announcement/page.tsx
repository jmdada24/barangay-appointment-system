"use client";

import { useEffect, useState } from "react";
import { Calendar, Megaphone, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getAnnouncements } from "@/actions/announcements";

type AnnouncementType = "info" | "warning" | "urgent";

type Announcement = {
  id: number;
  title: string;
  content: string;
  type: AnnouncementType;
  created_at: string;
};

function getTypeStyles(type: AnnouncementType) {
  switch (type) {
    case "info":
      return "text-blue-600";
    case "warning":
      return "text-yellow-600";
    case "urgent":
      return "text-red-600";
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
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(d);
  } catch (error) {
    return dateISO;
  }
}

export default function ResidentAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-900">Error Loading Announcements</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchAnnouncements}
                className="mt-3 text-sm font-medium text-red-600 hover:text-red-700 underline"
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
      {/* Announcements List */}
      <div className="space-y-4">
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <Card
              key={announcement.id}
              className="border border-gray-200 shadow-sm"
            >
              <CardContent className="p-5">
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-10 h-10 ${getTypeStyles(announcement.type).replace(
                        "text-",
                        "bg-"
                      ).replace("-600", "-100")} rounded-lg flex items-center justify-center`}
                    >
                      <Megaphone
                        className={`w-5 h-5 ${getTypeStyles(
                          announcement.type
                        )}`}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {announcement.title}
                      </h2>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          announcement.type === "info"
                            ? "bg-blue-100 text-blue-700"
                            : announcement.type === "warning"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {capitalizeFirst(announcement.type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Posted on {formatDate(announcement.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-10 text-center">
              <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No announcements yet
              </h3>
              <p className="text-sm text-gray-500">
                Check back later for updates from the barangay office.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}