"use client";

import { Calendar, Megaphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Announcement = {
  id: string;
  title: string;
  content: string;
  postedDate: string;
};

// Mock data - will be replaced with Supabase data later
const mockAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "Barangay Office Holiday Schedule",
    content:
      "The Barangay Office will be closed on January 25, 2026 in observance of a special non-working holiday. Regular operations will resume on January 26, 2026.",
    postedDate: "January 20, 2026",
  },
  {
    id: "2",
    title: "New Operating Hours",
    content:
      "Starting February 1, 2026, the Barangay Office will be open from 8:00 AM to 5:00 PM, Monday to Friday. Saturday operations remain from 8:00 AM to 12:00 PM.",
    postedDate: "January 18, 2026",
  },
  {
    id: "3",
    title: "Community Clean-Up Drive",
    content:
      "Join us for our monthly community clean-up drive on January 28, 2026, starting at 6:00 AM. Let's work together to keep our barangay clean and green!",
    postedDate: "January 15, 2026",
  },
  {
    id: "4",
    title: "Free Medical Mission",
    content:
      "A free medical mission will be held at the Barangay Hall on February 5, 2026 from 8:00 AM to 4:00 PM. Services include general check-up, dental, and eye screening.",
    postedDate: "January 12, 2026",
  },
  {
    id: "5",
    title: "Barangay ID Registration",
    content:
      "Residents who have not yet claimed their Barangay ID may do so at the Barangay Hall during office hours. Please bring a valid government ID and 1x1 photo.",
    postedDate: "January 10, 2026",
  },
];

export default function ResidentAnnouncements() {
  return (
    <div className="space-y-6">
      {/* Announcements List */}
      <div className="space-y-4">
        {mockAnnouncements.map((announcement) => (
          <Card key={announcement.id} className="border border-gray-200 shadow-sm">
            <CardContent className="p-5">
              <div className="flex gap-4">
                {/* Icon */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Megaphone className="w-5 h-5 text-primary" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {announcement.title}
                  </h2>
                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                    {announcement.content}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Posted on {announcement.postedDate}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {mockAnnouncements.length === 0 && (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-10 text-center">
            <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No announcements yet</h3>
            <p className="text-sm text-gray-500">
              Check back later for updates from the barangay office.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}