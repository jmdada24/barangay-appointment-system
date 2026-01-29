// Folder: apps/web/app/(admin)/admin

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Calendar, Clock, ThumbsUp, CheckCircle2, Megaphone } from "lucide-react";

const stats = [
  { label: "Total Appointments", value: 8, hint: "Scheduled for today", icon: Calendar },
  { label: "Pending Requests", value: 8, hint: "Awaiting approval", icon: Clock },
  { label: "Approved", value: 8, hint: "Ready for service", icon: ThumbsUp },
  { label: "Completed", value: 8, hint: "Total processed", icon: CheckCircle2 },
];

const upcoming = [
  { service: "Barangay Clearance", name: "Juan Dela Cruz", date: "January 20, 2026", time: "09:00 AM" },
];

const pending = [
  { service: "Cedula", name: "Juan Dela Cruz", date: "January 20, 2026", time: "09:00 AM" },
];

const announcements = [
  {
    title: "Barangay Hall Operating Hours",
    tag: "Info",
    content: "Open 8:00 AM to 5:00 PM, Monday to Friday. Closed on weekends and holidays.",
  },
  {
    title: "Document Processing Time",
    tag: "Warning",
    content: "Requests are processed within 3–5 business days. Please book in advance.",
  },
  {
    title: "System Maintenance Notice",
    tag: "Urgent",
    content: "Scheduled maintenance on January 25, 2026 from 12:00 AM to 4:00 AM.",
  },
];

export default function AdminOverviewPage() {
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
                    <Icon className="h-10 w-10 text-[#062E24]" />
                    <div className="text-3xl font-semibold">{s.value}</div>


                </div>
              </CardHeader>

              <CardContent className="flex flex-col items-start space-y-1">
                <CardTitle className="font-semibold text-[#062E24]">{s.label}</CardTitle>
                <div className="text-xs text-muted-foreground text-right">{s.hint}</div>
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
            {upcoming.map((u, idx) => (
              <div key={idx} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{u.service}</div>
                  <div className="text-xs text-muted-foreground">{u.time}</div>
                </div>
                <div className="text-sm text-muted-foreground">{u.name}</div>
                <div className="text-xs text-muted-foreground">{u.date}</div>
              </div>
            ))}

            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/appointment">View all appointments</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Pending Request</CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {pending.map((p, idx) => (
              <div key={idx} className="rounded-md border border-amber-300 bg-amber-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.service}</div>
                  <div className="text-xs text-muted-foreground">{p.time}</div>
                </div>
                <div className="text-sm text-muted-foreground">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.date}</div>
              </div>
            ))}

            <Button asChild className="w-full bg-[#062E24] hover:bg-[#062E24]/90">
              <Link href="/admin/appointment">Review pending</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Announcements */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Recent Announcement</CardTitle>
          </div>

          <Button asChild variant="link" className="px-0">
            <Link href="/admin/announcement">Manage All →</Link>
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {announcements.map((a) => (
            <div key={a.title} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-muted-foreground">{a.tag}</div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{a.content}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}