"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, Clock, Check, Pencil, Trash2, Archive } from "lucide-react";

type UserRole = "admin" | "staff";

type ScheduleDate = {
  id: string;
  dateISO: string;
  morningSlots: number;
  afternoonSlots: number;
  morningBooked: number;
  afternoonBooked: number;
};

type SlotDefaults = {
  morningSlots: number;
  afternoonSlots: number;
};

interface SchedulesPageProps {
  role: UserRole;
}

function pad2(n: number) { return String(n).padStart(2, "0"); }
function formatISO(d: Date) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function formatLong(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function formatChip(dateISO: string) {
  const d = new Date(dateISO + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function isWeekday(d: Date) { const day = d.getDay(); return day >= 1 && day <= 5; }
function isPast(d: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dd = new Date(d); dd.setHours(0, 0, 0, 0);
  return dd < today;
}
function getDaysInMonth(current: Date) {
  const year = current.getFullYear();
  const month = current.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();
  const startDow = first.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  return cells;
}
function clampInt(n: number, min: number, max: number) {
  const x = Number.isFinite(n) ? Math.trunc(n) : min;
  return Math.min(max, Math.max(min, x));
}

export default function SchedulesPage({ role }: SchedulesPageProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [defaults, setDefaults] = useState<SlotDefaults>({ morningSlots: 10, afternoonSlots: 10 });
  const [schedules, setSchedules] = useState<ScheduleDate[]>([
    { id: "s1", dateISO: "2026-01-22", morningSlots: 10, afternoonSlots: 10, morningBooked: 4, afternoonBooked: 7 },
    { id: "s2", dateISO: "2026-01-23", morningSlots: 10, afternoonSlots: 10, morningBooked: 10, afternoonBooked: 2 },
  ]);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleDate | null>(null);

  const scheduledSet = useMemo(() => new Set(schedules.map((s) => s.dateISO)), [schedules]);
  const days = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);
  const monthName = useMemo(() => currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" }), [currentMonth]);

  const upcomingSchedules = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return schedules.filter((s) => new Date(s.dateISO + "T00:00:00") >= today).sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
  }, [schedules]);

  const availableDatesCount = upcomingSchedules.length;
  const morningAvailable = upcomingSchedules.reduce((sum, s) => sum + (s.morningSlots - s.morningBooked), 0);
  const afternoonAvailable = upcomingSchedules.reduce((sum, s) => sum + (s.afternoonSlots - s.afternoonBooked), 0);

  function previousMonth() { setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }
  function nextMonth() { setCurrentMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }

  function toggleSelect(date: Date) {
    const iso = formatISO(date);
    if (scheduledSet.has(iso)) return;
    setSelectedDates((prev) => (prev.includes(iso) ? prev.filter((x) => x !== iso) : [...prev, iso]));
  }

  function addSelectedDates() {
    if (selectedDates.length === 0) return;
    const morningSlots = clampInt(defaults.morningSlots, 0, 10);
    const afternoonSlots = clampInt(defaults.afternoonSlots, 0, 10);
    const newSchedules: ScheduleDate[] = selectedDates.slice().sort().map((iso) => ({
      id: `s_${iso}`, dateISO: iso, morningSlots, afternoonSlots, morningBooked: 0, afternoonBooked: 0,
    }));
    setSchedules((prev) => {
      const existing = new Set(prev.map((p) => p.dateISO));
      return [...prev, ...newSchedules.filter((n) => !existing.has(n.dateISO))];
    });
    setSelectedDates([]);
  }

  function handleRemoveClick(schedule: ScheduleDate) {
    setSelectedSchedule(schedule);
    if (role === "staff") {
      setShowArchiveModal(true);
    } else {
      setShowDeleteModal(true);
    }
  }

  function handleArchiveConfirm() {
    if (!selectedSchedule) return;
    setSchedules((prev) => prev.filter((s) => s.id !== selectedSchedule.id));
    setShowArchiveModal(false);
    setSelectedSchedule(null);
  }

  function handleDeleteConfirm() {
    if (!selectedSchedule) return;
    setSchedules((prev) => prev.filter((s) => s.id !== selectedSchedule.id));
    setShowDeleteModal(false);
    setSelectedSchedule(null);
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-xl bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <CalendarDays className="h-10 w-10 text-primary" />
              <div className="text-3xl font-semibold text-primary">{availableDatesCount}</div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="font-semibold text-primary">Available Dates</div>
              <div className="text-xs text-muted-foreground">Scheduled days</div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <Clock className="h-10 w-10 text-primary" />
              <div className="text-3xl font-semibold text-primary">{morningAvailable}</div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="font-semibold text-primary">Morning Slots</div>
              <div className="text-xs text-muted-foreground">Available (8am–11am)</div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <Clock className="h-10 w-10 text-primary" />
              <div className="text-3xl font-semibold text-primary">{afternoonAvailable}</div>
            </div>
            <div className="mt-4 space-y-1">
              <div className="font-semibold text-primary">Afternoon Slots</div>
              <div className="text-xs text-muted-foreground">Available (1pm–4pm)</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card className="rounded-xl bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4">
            <div className="text-lg font-semibold text-primary">Default Slots</div>
            <div className="text-sm text-muted-foreground">Used when adding selected dates from the calendar.</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
            <div className="space-y-2">
              <Label htmlFor="defaultMorning">Morning Slots (0–10)</Label>
              <Input id="defaultMorning" type="number" min={0} max={10} value={defaults.morningSlots} onChange={(e) => setDefaults((p) => ({ ...p, morningSlots: clampInt(Number(e.target.value), 0, 10) }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultAfternoon">Afternoon Slots (0–10)</Label>
              <Input id="defaultAfternoon" type="number" min={0} max={10} value={defaults.afternoonSlots} onChange={(e) => setDefaults((p) => ({ ...p, afternoonSlots: clampInt(Number(e.target.value), 0, 10) }))} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-lg" onClick={() => setDefaults({ morningSlots: 10, afternoonSlots: 10 })}>Reset</Button>
              <Button className="rounded-lg bg-primary hover:bg-primary/90">Saved</Button>
            </div>
          </div>
        </CardContent>

        <CardContent className="p-6">
          <div className="mb-6">
            <div className="text-lg font-semibold text-primary">Select Available Dates</div>
            <div className="text-sm text-muted-foreground">Click on weekdays (Monday–Friday) to select</div>
          </div>
          <div className="mb-6 flex items-center justify-between">
            <Button variant="outline" className="rounded-lg" onClick={previousMonth}>Previous</Button>
            <div className="text-lg font-semibold">{monthName}</div>
            <Button variant="outline" className="rounded-lg" onClick={nextMonth}>Next</Button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">{day}</div>
            ))}
            {days.map((d, idx) => {
              if (!d) return <div key={`empty-${idx}`} className="aspect-square" />;
              const iso = formatISO(d);
              const scheduled = scheduledSet.has(iso);
              const selected = selectedDates.includes(iso);
              const weekday = isWeekday(d);
              const past = isPast(d);
              const disabled = !weekday || past || scheduled;
              const base = "aspect-square rounded-lg border text-sm font-medium transition-colors flex items-center justify-center";
              const cls = scheduled ? "bg-emerald-50 border-emerald-300 text-emerald-800 cursor-not-allowed"
                : selected ? "bg-primary border-primary text-white"
                : disabled ? "bg-muted/40 border-border text-muted-foreground cursor-not-allowed"
                : "bg-white border-border hover:bg-primary/5 hover:border-primary/40";
              return (
                <button key={iso} type="button" disabled={disabled} onClick={() => toggleSelect(d)} className={`${base} ${cls}`}>
                  <div className="flex flex-col items-center leading-none">
                    <div>{d.getDate()}</div>
                    {scheduled && <Check className="mt-1 h-3.5 w-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>
          {selectedDates.length > 0 && (
            <div className="mt-6 rounded-lg border bg-primary/5 p-4">
              <div className="mb-2 text-sm font-medium text-primary">Selected Dates ({selectedDates.length})</div>
              <div className="flex flex-wrap gap-2">
                {selectedDates.slice().sort().map((iso) => (
                  <span key={iso} className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-medium text-primary">{formatChip(iso)}</span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-6">
            <Button className="w-full rounded-lg bg-primary py-6 hover:bg-primary/90" disabled={selectedDates.length === 0} onClick={addSelectedDates}>
              Add Selected Dates to Schedule ({selectedDates.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming List */}
      <Card className="rounded-xl bg-white shadow-sm">
        <CardContent className="p-6">
          <div className="mb-4 text-lg font-semibold text-primary">Upcoming Scheduled Dates</div>
          {upcomingSchedules.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No upcoming scheduled dates.</div>
          ) : (
            <div className="space-y-3">
              {upcomingSchedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
                  <div className="font-medium">{formatLong(s.dateISO)}</div>
                  <div className="flex items-center gap-2">
                    <button className="rounded-md p-2 text-gray-600 hover:bg-gray-100" title="Edit">
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      className={`rounded-md p-2 ${role === "staff" ? "text-yellow-600 hover:bg-yellow-50" : "text-red-600 hover:bg-red-50"}`}
                      title={role === "staff" ? "Archive" : "Delete"}
                      onClick={() => handleRemoveClick(s)}
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

      {/* Archive Modal (Staff) */}
      {showArchiveModal && selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 text-center">
            <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Archive className="w-7 h-7 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Archive Schedule?</h3>
            <p className="text-sm text-gray-500 mb-5">This schedule will be moved to archive.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowArchiveModal(false); setSelectedSchedule(null); }}>Cancel</Button>
              <Button className="flex-1 bg-yellow-600 hover:bg-yellow-700" onClick={handleArchiveConfirm}>Archive</Button>
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
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowDeleteModal(false); setSelectedSchedule(null); }}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleDeleteConfirm}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}