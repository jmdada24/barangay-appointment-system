"use client";

// Folder: apps/web/app/(admin)/admin/schedule

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { CalendarDays, Clock, Check, Trash2, Pencil, Save, X } from "lucide-react";

type ScheduleDate = {
    id: string;
    dateISO: string; // YYYY-MM-DD
    morningSlots: number; // max 10 (mock)
    afternoonSlots: number; // max 10 (mock)
    morningBooked: number;
    afternoonBooked: number;
};

type SlotDefaults = {
    morningSlots: number;
    afternoonSlots: number;
};

function pad2(n: number) {
    return String(n).padStart(2, "0");
}

function formatISO(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatLong(dateISO: string) {
    const d = new Date(dateISO + "T00:00:00");
    return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function formatChip(dateISO: string) {
    const d = new Date(dateISO + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isWeekday(d: Date) {
    const day = d.getDay();
    return day >= 1 && day <= 5; // Mon-Fri
}

function isPast(d: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dd = new Date(d);
    dd.setHours(0, 0, 0, 0);
    return dd < today;
}

function getDaysInMonth(current: Date) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const daysInMonth = last.getDate();
    const startDow = first.getDay(); // 0..6

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
    return cells;
}

function clampInt(n: number, min: number, max: number) {
    const x = Number.isFinite(n) ? Math.trunc(n) : min;
    return Math.min(max, Math.max(min, x));
}

export default function AdminSchedulesPage() {
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    const [selectedDates, setSelectedDates] = useState<string[]>([]);

    // Defaults used when adding selected dates
    const [defaults, setDefaults] = useState<SlotDefaults>({
        morningSlots: 10,
        afternoonSlots: 10,
    });

    // Mock schedules (replace with Supabase later)
    const [schedules, setSchedules] = useState<ScheduleDate[]>([
        {
            id: "s1",
            dateISO: "2026-01-22",
            morningSlots: 10,
            afternoonSlots: 10,
            morningBooked: 4,
            afternoonBooked: 7,
        },
        {
            id: "s2",
            dateISO: "2026-01-23",
            morningSlots: 10,
            afternoonSlots: 10,
            morningBooked: 10,
            afternoonBooked: 2,
        },
    ]);

    // Inline edit state (per scheduled date)
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<{ morningSlots: string; afternoonSlots: string }>({
        morningSlots: "10",
        afternoonSlots: "10",
    });

    const scheduledSet = useMemo(() => new Set(schedules.map((s) => s.dateISO)), [schedules]);
    const days = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);

    const monthName = useMemo(
        () => currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" }),
        [currentMonth],
    );

    const upcomingSchedules = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return schedules
            .filter((s) => new Date(s.dateISO + "T00:00:00") >= today)
            .sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
    }, [schedules]);

    const availableDatesCount = upcomingSchedules.length;
    const morningAvailable = upcomingSchedules.reduce((sum, s) => sum + (s.morningSlots - s.morningBooked), 0);
    const afternoonAvailable = upcomingSchedules.reduce((sum, s) => sum + (s.afternoonSlots - s.afternoonBooked), 0);

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

    function addSelectedDates() {
        if (selectedDates.length === 0) return;

        const morningSlots = clampInt(defaults.morningSlots, 0, 10);
        const afternoonSlots = clampInt(defaults.afternoonSlots, 0, 10);

        const newSchedules: ScheduleDate[] = selectedDates
            .slice()
            .sort()
            .map((iso) => ({
                id: `s_${iso}`,
                dateISO: iso,
                morningSlots,
                afternoonSlots,
                morningBooked: 0,
                afternoonBooked: 0,
            }));

        setSchedules((prev) => {
            const existing = new Set(prev.map((p) => p.dateISO));
            return [...prev, ...newSchedules.filter((n) => !existing.has(n.dateISO))];
        });

        setSelectedDates([]);
    }

    function deleteSchedule(id: string) {
        setSchedules((prev) => prev.filter((s) => s.id !== id));
        if (editingId === id) setEditingId(null);
    }

    function startEdit(s: ScheduleDate) {
        setEditingId(s.id);
        setEditValues({
            morningSlots: String(s.morningSlots),
            afternoonSlots: String(s.afternoonSlots),
        });
    }

    function cancelEdit() {
        setEditingId(null);
    }

    function saveEdit(s: ScheduleDate) {
        const desiredMorning = clampInt(Number(editValues.morningSlots), 0, 10);
        const desiredAfternoon = clampInt(Number(editValues.afternoonSlots), 0, 10);

        // Do not allow lowering below booked counts
        const safeMorning = Math.max(desiredMorning, s.morningBooked);
        const safeAfternoon = Math.max(desiredAfternoon, s.afternoonBooked);

        setSchedules((prev) =>
            prev.map((row) =>
                row.id === s.id
                    ? {
                        ...row,
                        morningSlots: safeMorning,
                        afternoonSlots: safeAfternoon,
                    }
                    : row,
            ),
        );

        setEditingId(null);
    }

    return (
        <div className="space-y-6">
            {/* Title area like screenshot */}



            {/* Stats cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="rounded-xl bg-white shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                            <CalendarDays className="h-10 w-10 text-[#062E24]" />
                            <div className="text-3xl font-semibold text-[#062E24]">{availableDatesCount}</div>
                        </div>
                        <div className="mt-4 space-y-1">
                            <div className="font-semibold text-[#062E24]">Available Dates</div>
                            <div className="text-xs text-muted-foreground">Scheduled days</div>
                        </div>
                    </CardContent>
                </Card>



                <Card className="rounded-xl bg-white shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                            <Clock className="h-10 w-10 text-[#062E24]" />
                            <div className="text-3xl font-semibold text-[#062E24]">{morningAvailable}</div>
                        </div>
                        <div className="mt-4 space-y-1">
                            <div className="font-semibold text-[#062E24]">Morning Slots</div>
                            <div className="text-xs text-muted-foreground">Available (8am–11am)</div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl bg-white shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                            <Clock className="h-10 w-10 text-[#062E24]" />
                            <div className="text-3xl font-semibold text-[#062E24]">{afternoonAvailable}</div>
                        </div>
                        <div className="mt-4 space-y-1">
                            <div className="font-semibold text-[#062E24]">Afternoon Slots</div>
                            <div className="text-xs text-muted-foreground">Available (1pm–4pm)</div>
                        </div>
                    </CardContent>
                </Card>
            </div>


            {/* Calendar container */}
            <Card className="rounded-xl bg-white shadow-sm">


                <CardContent className="p-6">
                    <div className="mb-4">
                        <div className="text-lg font-semibold text-[#062E24]">Default Slots</div>
                        <div className="text-sm text-muted-foreground">
                            These will be used when you add selected dates from the calendar.
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:items-end">
                        <div className="space-y-2">
                            <Label htmlFor="defaultMorning">Morning Slots (0–10)</Label>
                            <Input
                                id="defaultMorning"
                                type="number"
                                min={0}
                                max={10}
                                value={defaults.morningSlots}
                                onChange={(e) =>
                                    setDefaults((p) => ({ ...p, morningSlots: clampInt(Number(e.target.value), 0, 10) }))
                                }
                            />
                            <div className="text-xs text-muted-foreground">Available (8am–11am)</div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="defaultAfternoon">Afternoon Slots (0–10)</Label>
                            <Input
                                id="defaultAfternoon"
                                type="number"
                                min={0}
                                max={10}
                                value={defaults.afternoonSlots}
                                onChange={(e) =>
                                    setDefaults((p) => ({ ...p, afternoonSlots: clampInt(Number(e.target.value), 0, 10) }))
                                }
                            />
                            <div className="text-xs text-muted-foreground">Available (1pm–4pm)</div>
                        </div>

                        <div className="flex gap-3">
                            <Button type="button" variant="outline" className="rounded-lg" onClick={() => setDefaults({ morningSlots: 10, afternoonSlots: 10 })}>
                                Reset
                            </Button>
                            <Button type="button" className="rounded-lg bg-[#062E24] hover:bg-[#062E24]/90" onClick={() => { }}>
                                Saved
                            </Button>
                        </div>
                    </div>
                </CardContent>

                <CardContent className="p-6">
                    <div className="mb-6">
                        <div className="text-lg font-semibold text-[#062E24]">Select Available Dates</div>
                        <div className="text-sm text-muted-foreground">
                            Click on weekdays (Monday–Friday) to select multiple dates for appointment scheduling
                        </div>
                    </div>

                    {/* Calendar header */}
                    <div className="mb-6 flex items-center justify-between">
                        <Button type="button" variant="outline" className="rounded-lg" onClick={previousMonth}>
                            Previous
                        </Button>

                        <div className="text-lg font-semibold text-[#1b1b1b]">{monthName}</div>

                        <Button type="button" variant="outline" className="rounded-lg" onClick={nextMonth}>
                            Next
                        </Button>
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
                                {day}
                            </div>
                        ))}

                        {days.map((d, idx) => {
                            if (!d) return <div key={`empty-${idx}`} className="aspect-square" />;

                            const iso = formatISO(d);
                            const scheduled = scheduledSet.has(iso);
                            const selected = selectedDates.includes(iso);
                            const weekday = isWeekday(d);
                            const past = isPast(d);
                            const disabled = !weekday || past || scheduled;

                            const base =
                                "aspect-square rounded-lg border text-sm font-medium transition-colors flex items-center justify-center";
                            const cls = scheduled
                                ? "bg-emerald-50 border-emerald-300 text-emerald-800 cursor-not-allowed"
                                : selected
                                    ? "bg-[#062E24] border-[#062E24] text-white"
                                    : disabled
                                        ? "bg-muted/40 border-border text-muted-foreground cursor-not-allowed"
                                        : "bg-white border-border text-[#1b1b1b] hover:bg-[#062E24]/5 hover:border-[#062E24]/40";

                            return (
                                <button
                                    key={iso}
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => toggleSelect(d)}
                                    className={`${base} ${cls}`}
                                    title={scheduled ? "Already scheduled" : disabled ? "Unavailable" : "Select date"}
                                >
                                    <div className="flex flex-col items-center leading-none">
                                        <div>{d.getDate()}</div>
                                        {scheduled && <Check className="mt-1 h-3.5 w-3.5" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Selected dates summary */}
                    {selectedDates.length > 0 && (
                        <div className="mt-6 rounded-lg border bg-[#062E24]/5 p-4">
                            <div className="mb-2 text-sm font-medium text-[#062E24]">
                                Selected Dates ({selectedDates.length})
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedDates
                                    .slice()
                                    .sort()
                                    .map((iso) => (
                                        <span
                                            key={iso}
                                            className="inline-flex items-center rounded-full border bg-white px-3 py-1 text-xs font-medium text-[#062E24]"
                                        >
                                            {formatChip(iso)}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-6">
                        <Button
                            type="button"
                            className="w-full rounded-lg bg-[#062E24] py-6 hover:bg-[#062E24]/90"
                            disabled={selectedDates.length === 0}
                            onClick={addSelectedDates}
                        >
                            Add Selected Dates to Schedule ({selectedDates.length})
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Upcoming list (with edit slots) */}
            <Card className="rounded-xl bg-white shadow-sm">
                <CardContent className="p-6">
                    <div className="mb-4 text-lg font-semibold text-[#062E24]">Upcoming Scheduled Dates</div>

                    {upcomingSchedules.length === 0 ? (
                        <div className="py-10 text-center text-sm text-muted-foreground">No upcoming scheduled dates.</div>
                    ) : (
                        <div className="space-y-3">
                            {upcomingSchedules.map((s) => {
                                const morningAvail = s.morningSlots - s.morningBooked;
                                const afternoonAvail = s.afternoonSlots - s.afternoonBooked;
                                const isEditing = editingId === s.id;

                                return (
                                    <div key={s.id} className="flex items-center justify-between rounded-lg border bg-white p-4">
                                        <div className="min-w-0">
                                            <div className="font-medium text-[#1b1b1b]">{formatLong(s.dateISO)}</div>

                                            {!isEditing ? (
                                                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                                                    <div>
                                                        <span className="font-medium text-[#1b1b1b]">Morning:</span>{" "}
                                                        <span className={morningAvail === 0 ? "text-red-600" : "text-emerald-700"}>
                                                            {morningAvail}/{s.morningSlots} available
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <span className="font-medium text-[#1b1b1b]">Afternoon:</span>{" "}
                                                        <span className={afternoonAvail === 0 ? "text-red-600" : "text-emerald-700"}>
                                                            {afternoonAvail}/{s.afternoonSlots} available
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <Label htmlFor={`m_${s.id}`} className="text-xs">
                                                            Morning Slots (min {s.morningBooked}, max 10)
                                                        </Label>
                                                        <Input
                                                            id={`m_${s.id}`}
                                                            type="number"
                                                            min={s.morningBooked}
                                                            max={10}
                                                            value={editValues.morningSlots}
                                                            onChange={(e) => setEditValues((p) => ({ ...p, morningSlots: e.target.value }))}
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label htmlFor={`a_${s.id}`} className="text-xs">
                                                            Afternoon Slots (min {s.afternoonBooked}, max 10)
                                                        </Label>
                                                        <Input
                                                            id={`a_${s.id}`}
                                                            type="number"
                                                            min={s.afternoonBooked}
                                                            max={10}
                                                            value={editValues.afternoonSlots}
                                                            onChange={(e) => setEditValues((p) => ({ ...p, afternoonSlots: e.target.value }))}
                                                        />
                                                    </div>

                                                    <div className="sm:col-span-2 text-xs text-muted-foreground">
                                                        Note: Slot counts cannot be reduced below already booked counts.
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="ml-4 flex items-center gap-2">
                                            {!isEditing ? (
                                                <button
                                                    type="button"
                                                    className="rounded-md p-2 text-[#1b1b1b] hover:bg-black/5"
                                                    title="Edit slots"
                                                    onClick={() => startEdit(s)}
                                                >
                                                    <Pencil className="h-5 w-5" />
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="rounded-md p-2 text-[#062E24] hover:bg-[#062E24]/10"
                                                        title="Save"
                                                        onClick={() => saveEdit(s)}
                                                    >
                                                        <Save className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="rounded-md p-2 text-muted-foreground hover:bg-black/5"
                                                        title="Cancel"
                                                        onClick={cancelEdit}
                                                    >
                                                        <X className="h-5 w-5" />
                                                    </button>
                                                </>
                                            )}

                                            <button
                                                type="button"
                                                className="rounded-md p-2 text-red-600 hover:bg-red-50"
                                                title="Delete"
                                                onClick={() => deleteSchedule(s.id)}
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}