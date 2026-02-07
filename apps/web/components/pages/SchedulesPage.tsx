"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Clock, ChevronLeft, ChevronRight, Pencil, Trash2, Archive, Loader2 } from "lucide-react";
import { getSchedules, addSchedule, updateSchedule, deleteSchedule, archiveSchedule } from "@/actions/schedules";

type UserRole = "admin" | "staff";

interface SchedulesPageProps {
  role: UserRole;
}

type ScheduleDate = {
  id: number;
  date: string;
  morning_slots: number;
  afternoon_slots: number;
  morning_booked: number;
  afternoon_booked: number;
};

type SlotDefaults = {
  morningSlots: number;
  afternoonSlots: number;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getDaysInMonth(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const days: Date[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  return days;
}

function formatISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLong(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function getWeekdayInitials(): string[] {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function SchedulesPage({ role }: SchedulesPageProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [defaults, setDefaults] = useState<SlotDefaults>({ morningSlots: 10, afternoonSlots: 10 });
  const [schedules, setSchedules] = useState<ScheduleDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleDate | null>(null);
  const [editFormData, setEditFormData] = useState<{ morningSlots: number; afternoonSlots: number }>({ morningSlots: 10, afternoonSlots: 10 });

  // Fetch schedules on mount
  useEffect(() => {
    fetchSchedules();
  }, []);

  async function fetchSchedules() {
    setLoading(true);
    const result = await getSchedules();
    if (result.success && result.data) {
      setSchedules(result.data);
    }
    setLoading(false);
  }

  const scheduledSet = useMemo(() => new Set(schedules.map((s) => s.date)), [schedules]);
  const days = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);
  const monthName = useMemo(() => currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" }), [currentMonth]);

  const upcomingSchedules = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return schedules
      .filter((s) => new Date(s.date + "T00:00:00") >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [schedules]);

  const availableDatesCount = upcomingSchedules.length;
  const morningAvailable = upcomingSchedules.reduce((sum, s) => sum + (s.morning_slots - s.morning_booked), 0);
  const afternoonAvailable = upcomingSchedules.reduce((sum, s) => sum + (s.afternoon_slots - s.afternoon_booked), 0);

  function previousMonth() {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function toggleSelect(date: Date) {
    const iso = formatISO(date);
    if (scheduledSet.has(iso)) return;
    setSelectedDates((prev) => (prev.includes(iso) ? prev.filter((x) => x !== iso) : [...prev, iso]));
  }

  async function addSelectedDates() {
    if (selectedDates.length === 0) return;

    setLoading(true);
    const morningSlots = clampInt(defaults.morningSlots, 0, 10);
    const afternoonSlots = clampInt(defaults.afternoonSlots, 0, 10);

    for (const dateISO of selectedDates) {
      await addSchedule(dateISO, morningSlots, afternoonSlots);
    }

    setSelectedDates([]);
    await fetchSchedules();
    setLoading(false);
  }

  function handleEditClick(schedule: ScheduleDate) {
    setSelectedSchedule(schedule);
    setEditFormData({
      morningSlots: schedule.morning_slots,
      afternoonSlots: schedule.afternoon_slots,
    });
    setShowEditModal(true);
  }

  async function handleEditConfirm() {
    if (!selectedSchedule) return;
    setLoading(true);
    await updateSchedule(selectedSchedule.id, editFormData.morningSlots, editFormData.afternoonSlots);
    await fetchSchedules();
    setShowEditModal(false);
    setSelectedSchedule(null);
    setLoading(false);
  }

  function handleRemoveClick(schedule: ScheduleDate) {
    setSelectedSchedule(schedule);
    if (role === "staff") {
      setShowArchiveModal(true);
    } else {
      setShowDeleteModal(true);
    }
  }

  async function handleArchiveConfirm() {
    if (!selectedSchedule) return;
    setLoading(true);
    await archiveSchedule(selectedSchedule.id);
    await fetchSchedules();
    setShowArchiveModal(false);
    setSelectedSchedule(null);
    setLoading(false);
  }

  async function handleDeleteConfirm() {
    if (!selectedSchedule) return;
    setLoading(true);
    await deleteSchedule(selectedSchedule.id);
    await fetchSchedules();
    setShowDeleteModal(false);
    setSelectedSchedule(null);
    setLoading(false);
  }

  if (loading && schedules.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-xl bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Dates</p>
                <p className="text-3xl font-semibold mt-2">{availableDatesCount}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <CalendarDays className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Morning Slots</p>
                <p className="text-3xl font-semibold mt-2">{morningAvailable}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Afternoon Slots</p>
                <p className="text-3xl font-semibold mt-2">{afternoonAvailable}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar + Add Section */}
      <Card className="rounded-xl bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Add New Schedules</h3>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={previousMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold">{monthName}</h2>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="mb-6">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {getWeekdayInitials().map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-2">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square"></div>
                ))}

                {/* Day cells */}
                {days.map((day) => {
                  const iso = formatISO(day);
                  const isSelected = selectedDates.includes(iso);
                  const isScheduled = scheduledSet.has(iso);
                  const isPast = day < new Date() && day.getHours() === 0;

                  return (
                    <button
                      key={iso}
                      onClick={() => toggleSelect(day)}
                      disabled={isScheduled || isPast}
                      className={`
                        aspect-square rounded-lg flex items-center justify-center font-medium text-sm
                        transition-all
                        ${isScheduled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}
                        ${isPast ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}
                        ${isSelected && !isScheduled ? "bg-primary text-white" : ""}
                        ${!isSelected && !isScheduled && !isPast ? "border border-gray-200 hover:border-primary" : ""}
                      `}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slot Configuration */}
            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Morning Slots (8-11 AM)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={defaults.morningSlots}
                  onChange={(e) => setDefaults((prev) => ({ ...prev, morningSlots: parseInt(e.target.value) || 0 }))}
                  className="h-12 text-base"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Afternoon Slots (1-4 PM)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={defaults.afternoonSlots}
                  onChange={(e) => setDefaults((prev) => ({ ...prev, afternoonSlots: parseInt(e.target.value) || 0 }))}
                  className="h-12 text-base"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              className="w-full rounded-lg bg-primary py-6 hover:bg-primary/90"
              disabled={selectedDates.length === 0 || loading}
              onClick={addSelectedDates}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add Selected Dates to Schedule ({selectedDates.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Schedules */}
      <Card className="rounded-xl bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4 text-lg font-semibold text-primary">Upcoming Scheduled Dates</div>
          {upcomingSchedules.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No upcoming scheduled dates.</div>
          ) : (
            <div className="space-y-3">
              {upcomingSchedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
                  <div>
                    <div className="font-medium">{formatLong(s.date)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Morning: {s.morning_slots - s.morning_booked}/{s.morning_slots} • Afternoon: {s.afternoon_slots - s.afternoon_booked}/{s.afternoon_slots}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-md p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                      title="Edit"
                      onClick={() => handleEditClick(s)}
                      disabled={loading}
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      className={`rounded-md p-2 transition-colors ${
                        role === "staff" ? "text-yellow-600 hover:bg-yellow-50" : "text-red-600 hover:bg-red-50"
                      }`}
                      title={role === "staff" ? "Archive" : "Delete"}
                      onClick={() => handleRemoveClick(s)}
                      disabled={loading}
                    >
                      {role === "staff" ? <Archive className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {showEditModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Schedule</h3>
            <p className="text-sm text-gray-600 mb-4">{formatLong(selectedSchedule.date)}</p>

            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Morning Slots (8-11 AM)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={editFormData.morningSlots}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, morningSlots: parseInt(e.target.value) || 0 }))}
                  className="h-12 text-base"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Afternoon Slots (1-4 PM)</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={editFormData.afternoonSlots}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, afternoonSlots: parseInt(e.target.value) || 0 }))}
                  className="h-12 text-base"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSchedule(null);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleEditConfirm} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Modal (Staff) */}
      {showArchiveModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Archive className="w-7 h-7 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Archive Schedule?</h3>
            <p className="text-sm text-gray-500 mb-5">{formatLong(selectedSchedule.date)} will be archived.</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowArchiveModal(false);
                  setSelectedSchedule(null);
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1 bg-yellow-600 hover:bg-yellow-700" onClick={handleArchiveConfirm} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Archive
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal (Admin) */}
      {showDeleteModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Delete Schedule?</h3>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone. {formatLong(selectedSchedule.date)} will be deleted.</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSchedule(null);
                }}
              >
                Cancel
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleDeleteConfirm} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}