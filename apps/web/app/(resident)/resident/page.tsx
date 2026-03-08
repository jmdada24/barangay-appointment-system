"use client";

import { useEffect, useState } from "react";
import { CardContent, Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, CircleCheckBig, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import type { LucideIcon, } from "lucide-react";
import { Download, FileText, X } from "lucide-react";
import { getResidentAppointmentStats, getResidentRecentActivity } from "@/actions/resident";
import { Button } from "@/components/ui/button";

type StatItem = {
  label: string;
  value: number;
  icon: LucideIcon;
};

type ActivityItem = {
  id: string;
  title: string;
  tag: string;
  content: string;
  icon: string;
  type: "appointment" | "announcement";
};

const iconMap: Record<string, LucideIcon> = {
  Calendar,
  Clock,
  CircleCheckBig,
  CheckCircle,
};

export default function ResidentOverviewPage() {
  const [stats, setStats] = useState<StatItem[]>([
    { label: "Total Appointments", value: 0, icon: Calendar },
    { label: "Pending", value: 0, icon: Clock },
    { label: "Approved", value: 0, icon: CircleCheckBig },
    { label: "Completed", value: 0, icon: CheckCircle },
  ]);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCharterPreview, setShowCharterPreview] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      // Fetch appointment stats
      const statsResult = await getResidentAppointmentStats();
      if (statsResult.success && statsResult.data) {
        const data = statsResult.data as any;
        setStats([
          { label: "Total Appointments", value: data.total || 0, icon: Calendar },
          { label: "Pending", value: data.pending || 0, icon: Clock },
          { label: "Approved", value: data.approved || 0, icon: CircleCheckBig },
          { label: "Completed", value: data.completed || 0, icon: CheckCircle },
        ]);
      }

      // Fetch recent activity
      const activityResult = await getResidentRecentActivity();
      if (activityResult.success && activityResult.data) {
        setActivities(activityResult.data as ActivityItem[]);
      }
    } catch (err) {
      setError("Failed to load overview data");
      console.error("Failed to load the data");
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#062E24]" />
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
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Icon className="h-10 w-10 text-[#062E24]" />
                </div>
              </CardHeader>

              <CardContent className="flex flex-col items-start space-y-1">
                <div className="text-3xl font-semibold">{s.value}</div>
              </CardContent>

              <CardContent className="flex flex-col items-start space-y-1">
                <CardTitle className="font-normal text-[#062E24]">{s.label}</CardTitle>
              </CardContent>
            </Card>
          );
        })}
      </div>



      {/* Citizen's Charter */}
      <Card className="shadow-sm border border-blue-200 bg-blue-50/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg text-blue-900">Citizen's Charter</CardTitle>
          </div>
          <p className="text-sm text-blue-700 mt-2">
            Learn about our commitment to quality service and your rights as a resident
          </p>
        </CardHeader>

        <CardContent className="flex gap-2">
          <Button
            onClick={() => setShowCharterPreview(true)}
            variant="outline"
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            View Document
          </Button>
          <a
            href="/assets/barangay-bayabas-citizens-charter.pdf"
            download="Barangay_Bayabas_Citizens_Charter.pdf"
          >
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* PDF Preview Modal */}
      {showCharterPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 z-50">
          <div className="bg-white rounded-lg w-full h-screen max-h-screen flex flex-col">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-semibold text-lg">Citizen's Charter</h3>
              <button
                onClick={() => setShowCharterPreview(false)}
                className="text-gray-500 hover:text-gray-700 p-1 hover:bg-gray-100 rounded-md transition"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <iframe
              src="/assets/barangay-bayabas-citizens-charter.pdf"
              className="flex-1 w-full border-0"
              title="Citizen's Charter"
            />
          </div>
        </div>
      )}


      {/* Recent Activity */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">Recent Activity</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {activities.length > 0 ? (
            activities.map((a) => {
              const Icon = iconMap[a.icon];

              return (
                <div key={a.id} className="border-b py-5 px-2 last:border-b-0">
                  <div className="flex items-start gap-4">
                    {Icon && <Icon className="mt-1 h-8 w-8 shrink-0 text-[#062E24]" />}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="font-medium">{a.title}</div>
                        <div className="shrink-0 text-xs text-muted-foreground">
                          {a.tag}
                        </div>
                      </div>

                      <div className="mt-1 text-sm text-muted-foreground">
                        {a.content}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}