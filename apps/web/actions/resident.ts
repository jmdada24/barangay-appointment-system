"use server";

import { createClient } from "@/utils/supabase/server";
import { Calendar, Clock, CircleCheckBig, CheckCircle } from "lucide-react";

export type ResidentResult = {
  success: boolean;
  error?: string;
  data?: unknown;
};

/**
 * Get resident appointment statistics for dashboard
 */
export async function getResidentAppointmentStats(): Promise<ResidentResult> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get resident ID using user_id from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (userError || !userData) {
      return { success: false, error: "User not found" };
    }

    // Get resident ID from residents table
    const { data: resident, error: residentError } = await supabase
      .from("residents")
      .select("id")
      .eq("user_id", userData.id)
      .single();

    if (residentError || !resident) {
      return { success: false, error: "Resident not found" };
    }

    // Get appointment stats
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("status")
      .eq("resident_id", resident.id);

    if (error) {
      console.error("Fetch stats error");
      return { success: false, error: error.message };
    }

    const appts = appointments || [];
    const stats = {
      total: appts.length,
      pending: appts.filter((a: any) => a.status === "pending").length,
      approved: appts.filter((a: any) => a.status === "approved").length,
      completed: appts.filter((a: any) => a.status === "completed").length,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Unexpected error in get resident appointment stats");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

/**
 * Get resident recent activity (appointments + announcements)
 */
export async function getResidentRecentActivity(): Promise<ResidentResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get resident ID using user_id from users table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (userError || !userData) {
      return { success: false, error: "User not found" };
    }

    // Get resident ID from residents table
    const { data: resident, error: residentError } = await supabase
      .from("residents")
      .select("id")
      .eq("user_id", userData.id)
      .single();

    if (residentError || !resident) {
      return { success: false, error: "Resident not found" };
    }

    // Get recent appointments
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select(
        `
        id,
        status,
        created_at,
        services (service_name)
      `
      )
      .eq("resident_id", resident.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (apptError) {
      console.error("Fetch appointments error" );
    }

    // Get recent announcements
    const { data: announcements, error: announcError } = await supabase
      .from("announcements")
      .select(
        `
        id,
        title,
        content,
        created_at
      `
      )
      .order("created_at", { ascending: false })
      .limit(5);

    if (announcError) {
      console.error("Fetch announcements error");
    }

    // Combine and format activities
    const activities: any[] = [];

    // Add appointments
    if (appointments) {
      appointments.forEach((apt: any) => {
        let title = "";
        let content = "";
        let icon = "Calendar";

        const serviceName = apt.services?.service_name || "Appointment";
        switch (apt.status) {
          case "approved":
            title = `${serviceName} Approved`;
            content = `Your appointment for ${serviceName} has been approved`;
            icon = "CircleCheckBig";
            break;
          case "pending":
            title = `${serviceName} Pending`;
            content = `Your ${serviceName} request is being reviewed`;
            icon = "Clock";
            break;
          case "completed":
            title = `${serviceName} Completed`;
            content = `Your ${serviceName} appointment has been completed`;
            icon = "CheckCircle";
            break;
          default:
            title = `${serviceName} - ${apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}`;
            content = `Your ${serviceName} appointment status: ${apt.status}`;
            icon = "Calendar";
        }

        activities.push({
          id: `apt-${apt.id}`,
          title,
          tag: formatTimeAgo(apt.created_at),
          content,
          icon,
          type: "appointment",
        });
      });
    }

    // Add announcements
    if (announcements) {
      announcements.forEach((ann: any) => {
        // Skip announcements with empty titles
        if (ann.title?.trim()) {
          activities.push({
            id: `ann-${ann.id}`,
            title: ann.title,
            tag: formatTimeAgo(ann.created_at),
            content: ann.content || "(No description)",
            icon: "Calendar",
            type: "announcement",
          });
        }
      });
    }

    // Sort by time (newest first) and limit to 5
    activities.sort((a, b) => {
      const timeA = extractMinutesAgo(a.tag);
      const timeB = extractMinutesAgo(b.tag);
      return timeA - timeB;
    });

    return { success: true, data: activities.slice(0, 5) };
  } catch (error) {
    console.error("Unexpected error in get resident recent activity");
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;

    return date.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

function extractMinutesAgo(timeStr: string): number {
  const match = timeStr.match(/(\d+)/);
  if (!match) return 0;

  const value = parseInt(match[1]);

  if (timeStr.includes("minute")) return value;
  if (timeStr.includes("hour")) return value * 60;
  if (timeStr.includes("day")) return value * 1440;

  return 0;
}