"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ThumbsUp, CheckCircle2, Megaphone, Loader2, AlertCircle } from "lucide-react";
import { getAppointmentsStats, getUpcomingAppointments, getPendingAppointments } from "@/actions/appointments";
import { getAnnouncements } from "@/actions/announcements";

type UserRole = "admin" | "staff";

interface OverviewPageProps {
  role: UserRole;
}

type Announcement = {
  id: number;
  title: string;
  content: string;
  type: "info" | "warning" | "urgent";
  created_at: string;
};

type AppointmentData = {
  id: number;
  services: {
    service_name: string;
  };
  residents: {
    name: string;
  };
  schedules: {
    date: string;
  };
  time_slot: "morning" | "afternoon";
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
};

export default function OverviewPage({ role }: OverviewPageProps) {
  const basePath = role === "admin" ? "/admin" : "/staff";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentData[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<AppointmentData[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      // Fetch appointment stats
      const statsResult = await getAppointmentsStats();
      if (statsResult.success && statsResult.data) {
        const stats = statsResult.data as any;
        setTotalAppointments(stats.total || 0);
        setPendingCount(stats.pending || 0);
        setApprovedCount(stats.approved || 0);
        setCompletedCount(stats.completed || 0);
      }

      // Fetch upcoming appointments
      const upcomingResult = await getUpcomingAppointments();
      if (upcomingResult.success && upcomingResult.data) {
        setUpcomingAppointments((upcomingResult.data as AppointmentData[]).slice(0, 5));
      }

      // Fetch pending appointments
      const pendingResult = await getPendingAppointments();
      if (pendingResult.success && pendingResult.data) {
        setPendingAppointments((pendingResult.data as AppointmentData[]).slice(0, 5));
      }

      // Fetch announcements
      const announcementsResult = await getAnnouncements();
      if (announcementsResult.success && announcementsResult.data) {
        setAnnouncements((announcementsResult.data as Announcement[]).slice(0, 3));
      }
    } catch (err) {
      setError("Failed to load overview data");
    }

    setLoading(false);
  }

  const stats = [
    { label: "Total Appointments", value: totalAppointments, hint: "All time", icon: Calendar },
    { label: "Pending Requests", value: pendingCount, hint: "Awaiting approval", icon: Clock },
    { label: "Approved", value: approvedCount, hint: "Ready for service", icon: ThumbsUp },
    { label: "Completed", value: completedCount, hint: "Total processed", icon: CheckCircle2 },
  ];

  function formatDate(dateStr: string) {
    try {
      const dateString = dateStr.split("T")[0];
      const d = new Date(dateString + "T00:00:00Z");
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(d);
    } catch {
      return dateStr;
    }
  }

  function getTimeSlot(slot: "morning" | "afternoon") {
    return slot === "morning" ? "09:00 AM" : "02:00 PM";
  }

  function getAnnouncementColor(type: string) {
    switch (type) {
      case "info":
        return "bg-blue-50 border-blue-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "urgent":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  }

  function getAnnouncementTag(type: string) {
    switch (type) {
      case "info":
        return "Info";
      case "warning":
        return "Warning";
      case "urgent":
        return "Urgent";
      default:
        return "Info";
    }
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
              <h3 className="font-medium text-red-900">Error Loading Overview</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchData}
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
      {/* Stats */}
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

      {/* Upcoming + Pending */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Upcoming Appointments</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingAppointments.length > 0 ? (
              <>
                {upcomingAppointments.map((u) => (
                  <div key={u.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{u.services.service_name}</div>
                      <div className="text-xs text-muted-foreground">{getTimeSlot(u.time_slot)}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{u.residents.name}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(u.schedules.date)}</div>
                  </div>
                ))}
                <Button asChild variant="outline" className="w-full">
                  <Link href={`${basePath}/appointment`}>View all appointments</Link>
                </Button>
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No upcoming appointments</p>
                <Button asChild variant="outline" className="w-full mt-3">
                  <Link href={`${basePath}/appointment`}>View all appointments</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Pending Requests</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingAppointments.length > 0 ? (
              <>
                {pendingAppointments.map((p) => (
                  <div key={p.id} className="rounded-md border border-amber-300 bg-amber-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{p.services.service_name}</div>
                      <div className="text-xs text-muted-foreground">{getTimeSlot(p.time_slot)}</div>
                    </div>
                    <div className="text-sm text-muted-foreground">{p.residents.name}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(p.schedules.date)}</div>
                  </div>
                ))}
                <Button asChild className="w-full bg-primary hover:bg-primary/90">
                  <Link href={`${basePath}/appointment`}>Review pending</Link>
                </Button>
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No pending requests</p>
                <Button asChild className="w-full bg-primary hover:bg-primary/90 mt-3">
                  <Link href={`${basePath}/appointment`}>Review pending</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Recent Announcements</CardTitle>
          </div>
          <Button asChild variant="link" className="px-0">
            <Link href={`${basePath}/announcement`}>Manage All →</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {announcements.length > 0 ? (
            announcements.map((a) => (
              <div key={a.id} className={`rounded-md border p-3 ${getAnnouncementColor(a.type)}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{getAnnouncementTag(a.type)}</div>
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{a.content}</div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No announcements yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}