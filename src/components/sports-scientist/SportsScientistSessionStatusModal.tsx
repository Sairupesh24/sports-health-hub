import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, AlertTriangle, Clock, CheckCircle2, XCircle, Info, Calendar } from "lucide-react";
import { format, startOfDay, differenceInCalendarDays, parseISO, isFuture, isBefore, addMinutes } from "date-fns";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { formatClientName } from "@/lib/utils";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: any;
    onSuccess: () => void | Promise<any>;
}

/**
 * Editing rules:
 *  - Future sessions from next day onwards (daysAgo <= -1) → Full timing change allowed (date, start time, duration, scope)
 *  - Today (daysAgo === 0) → Quick start/end, status, notes. Timing changes disabled for today.
 *  - Yesterday (daysAgo === 1) → Full status/notes edit
 *  - 2+ days ago → LOCKED (read-only)
 */
function getSessionEditability(session: any): {
    isLocked: boolean;
    isFuture: boolean;
    isNextDayOrLater: boolean;
    isToday: boolean;
    isYesterday: boolean;
    daysAgo: number;
    lockReason?: string;
} {
    if (!session) return { isLocked: false, isFuture: false, isNextDayOrLater: false, isToday: false, isYesterday: false, daysAgo: 0 };

    const scheduledDay = startOfDay(parseISO(session.scheduled_start));
    const today = startOfDay(new Date());
    const daysAgo = differenceInCalendarDays(today, scheduledDay); // positive = past, 0 = today, negative = future (starting from tomorrow: daysAgo <= -1)

    const isFutureSession = daysAgo < 0;
    const isTodaySession = daysAgo === 0;
    const isYesterdaySession = daysAgo === 1;
    const isNextDayOrLater = daysAgo <= -1; // Tomorrow onwards!
    const isStatusLocked = session.status === "Cancelled" || session.status === "Rescheduled" || session.status === "Completed";
    const isLocked = daysAgo >= 2 || isStatusLocked;

    return {
        isLocked,
        isFuture: isFutureSession,
        isNextDayOrLater,
        isToday: isTodaySession,
        isYesterday: isYesterdaySession,
        daysAgo,
        lockReason: isStatusLocked 
            ? `This session is ${session.status.toLowerCase()} and cannot be edited.`
            : isLocked
            ? `This session was on ${format(parseISO(session.scheduled_start), "MMM d, yyyy")} — sessions older than 1 day cannot be edited.`
            : undefined,
    };
}

export function SportsScientistSessionStatusModal({ open, onOpenChange, session, onSuccess }: Props) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [autoMissing, setAutoMissing] = useState(false);
    const [status, setStatus] = useState<string>("Planned");
    const [actualStart, setActualStart] = useState("");
    const [actualEnd, setActualEnd] = useState("");
    const [sessionNotes, setSessionNotes] = useState("");
    const [cancellationReason, setCancellationReason] = useState("");
    
    // Reschedule / Timing states
    const [rescheduledDate, setRescheduledDate] = useState("");
    const [rescheduledTime, setRescheduledTime] = useState("");
    const [durationMins, setDurationMins] = useState<number>(60);
    const [rescheduleScope, setRescheduleScope] = useState<"THIS_SESSION" | "ALL_FUTURE">("THIS_SESSION");
    const [showRescheduleControls, setShowRescheduleControls] = useState(false);

    const [attendees, setAttendees] = useState<any[]>([]);
    const [attendeesLoading, setAttendeesLoading] = useState(false);

    const editInfo = getSessionEditability(session);
    const scheduledEnd = session?.scheduled_end ? parseISO(session.scheduled_end) : (session?.scheduled_start ? parseISO(session.scheduled_start) : new Date());
    const isPastScheduledEnd = isBefore(scheduledEnd, new Date());

    // Fetch attendees for Group sessions
    useEffect(() => {
        if (!open || !session?.id || session.session_mode !== "Group") {
            setAttendees([]);
            return;
        }
        setAttendeesLoading(true);
        apiFetch<any[]>(`/api/appointments/${session.id}/attendees`)
            .then((data) => { setAttendees(data || []); })
            .catch(() => setAttendees([]))
            .finally(() => setAttendeesLoading(false));
    }, [open, session?.id, session?.session_mode]);

    // Auto-mark as Missed if the session was Planned but is now 2+ days old
    const autoMarkMissed = useCallback(async () => {
        if (!session?.id) return;
        if (session.status !== "Planned") return;
        if (!editInfo.isLocked) return;

        setAutoMissing(true);
        try {
            await apiFetch(`/api/appointments/${session.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: "Missed" })
            });
            onSuccess();
        } catch (e) {
            console.error("Auto-miss failed", e);
        } finally {
            setAutoMissing(false);
        }
    }, [session, editInfo.isLocked, onSuccess]);

    useEffect(() => {
        if (session) {
            const effectiveStatus = editInfo.isLocked && session.status === "Planned"
                ? "Missed"
                : session.status || "Planned";
            setStatus(effectiveStatus);
            setSessionNotes(session.session_notes || "");
            setCancellationReason(session.cancellation_reason || "");

            if (session.actual_start) {
                setActualStart(format(parseISO(session.actual_start), "HH:mm"));
            } else {
                setActualStart("");
            }
            if (session.actual_end) {
                setActualEnd(format(parseISO(session.actual_end), "HH:mm"));
            } else {
                setActualEnd("");
            }

            if (editInfo.isLocked && session.status === "Planned") {
                autoMarkMissed();
            }

            setShowRescheduleControls(false);

            // Initialize timing change defaults
            if (session.scheduled_start) {
                const startD = parseISO(session.scheduled_start);
                const endD = session.scheduled_end ? parseISO(session.scheduled_end) : addMinutes(startD, 60);
                const calculatedDuration = Math.max(15, Math.round((endD.getTime() - startD.getTime()) / 60000));

                setRescheduledDate(format(startD, "yyyy-MM-dd"));
                setRescheduledTime(format(startD, "HH:mm"));
                setDurationMins(calculatedDuration || 60);
                setRescheduleScope("THIS_SESSION");
            }
        }
    }, [session]);

    const handleQuickAction = async (action: "Start" | "End" | "Missed") => {
        if (!session?.id) return;

        if ((action === "Start" || action === "End") && !editInfo.isToday) {
            toast({
                title: "Action Not Allowed",
                description: `Sessions can only be started or ended on their scheduled day. This session is scheduled for ${format(parseISO(session.scheduled_start), "MMM d, yyyy")}.`,
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            if (action === "Start") {
                const nowIso = new Date().toISOString();
                const scientistId = session.scientist_id || user?.id;
                
                await apiFetch(`/api/appointments/${session.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        session_id: session.id,
                        sports_scientist_id: scientistId,
                        actual_start: nowIso,
                        status: "IN_PROGRESS"
                    })
                });
                
                setStatus("IN_PROGRESS");
                toast({ title: "Session Started", description: "Session transitioned to IN_PROGRESS." });
                await onSuccess();
            } else if (action === "End") {
                const nowTime = format(new Date(), "HH:mm");
                const dateStr = format(parseISO(session.scheduled_start), "yyyy-MM-dd");
                const actualEndIso = new Date(`${dateStr}T${nowTime}:00`).toISOString();
                
                await apiFetch(`/api/appointments/${session.id}/complete`, {
                    method: 'POST',
                    body: JSON.stringify({
                        actual_start: session.actual_start || actualEndIso,
                        actual_end: actualEndIso
                    })
                });
                
                toast({ title: "Session Ended", description: "Session completed successfully." });
                await queryClient.invalidateQueries({ queryKey: ["admin-master-sessions"] });
                await queryClient.invalidateQueries({ queryKey: ["roster-sessions"] });
                await queryClient.invalidateQueries({ queryKey: ["sports-scientist-sessions"] });
                await onSuccess();
                onOpenChange(false);
            } else if (action === "Missed") {
                setStatus("Missed");
                setTimeout(() => {
                    const textarea = document.getElementById("cancellationReason");
                    if (textarea) textarea.focus();
                }, 100);
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to update session", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteWithFreeTime = async () => {
        if (!session?.id) return;
        if (!actualStart || !actualEnd) {
            toast({
                title: "Required",
                description: "Please enter both actual start time and actual end time.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            const dateStr = format(parseISO(session.scheduled_start), "yyyy-MM-dd");
            const actualStartIso = new Date(`${dateStr}T${actualStart}:00`).toISOString();
            const actualEndIso = new Date(`${dateStr}T${actualEnd}:00`).toISOString();

            await apiFetch(`/api/appointments/${session.id}/complete`, {
                method: 'POST',
                body: JSON.stringify({
                    actual_start: actualStartIso,
                    actual_end: actualEndIso
                })
            });

            if (sessionNotes) {
                await apiFetch(`/api/appointments/${session.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ session_notes: sessionNotes })
                });
            }

            toast({ title: "Session Completed", description: "Actual timings recorded and balance updated." });
            await queryClient.invalidateQueries({ queryKey: ["admin-master-sessions"] });
            await queryClient.invalidateQueries({ queryKey: ["roster-sessions"] });
            await queryClient.invalidateQueries({ queryKey: ["sports-scientist-sessions"] });
            await onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to record completed session", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!session?.id) return;

        // Hard lock: 2+ days ago
        if (editInfo.isLocked) {
            toast({ title: "Session Locked", description: editInfo.lockReason, variant: "destructive" });
            return;
        }

        // Strict today guard
        if (!editInfo.isToday && !editInfo.isNextDayOrLater && (status === "Completed" || status === "IN_PROGRESS" || status === "In Progress" || status === "Checked In")) {
            toast({
                title: "Not Allowed",
                description: `This session is scheduled for ${format(parseISO(session.scheduled_start), "MMM d, yyyy h:mm a")}. Start and stop can only happen if the session is scheduled for today.`,
                variant: "destructive"
            });
            return;
        }

        if (editInfo.isFuture && status === "Missed") {
            toast({ title: "Not Allowed", description: "You cannot mark a future session as Missed.", variant: "destructive" });
            return;
        }

        if (status === "Completed" && (!actualStart || !actualEnd)) {
            toast({ title: "Required", description: "Please enter actual start and end times to mark as Completed.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            let timingsUpdated = false;

            // Handle timing updates / rescheduling for any unlocked session
            if (!editInfo.isLocked && rescheduledDate && rescheduledTime) {
                const originalStartStr = format(parseISO(session.scheduled_start), "yyyy-MM-dd HH:mm");
                const newStartStr = `${rescheduledDate} ${rescheduledTime}`;

                const originalStart = parseISO(session.scheduled_start);
                const originalEnd = session.scheduled_end ? parseISO(session.scheduled_end) : addMinutes(originalStart, 60);
                const originalDuration = Math.round((originalEnd.getTime() - originalStart.getTime()) / 60000);

                if (originalStartStr !== newStartStr || durationMins !== originalDuration || rescheduleScope === "ALL_FUTURE") {
                    const newStart = new Date(`${rescheduledDate}T${rescheduledTime}:00`);
                    const newEnd = addMinutes(newStart, durationMins);

                    if (rescheduleScope === "ALL_FUTURE") {
                        await apiFetch(`/api/appointments/${session.id}/reschedule-future`, {
                            method: 'POST',
                            body: JSON.stringify({
                                new_start: newStart.toISOString(),
                                new_end: newEnd.toISOString()
                            })
                        });
                    } else {
                        await apiFetch(`/api/appointments/${session.id}/reschedule`, {
                            method: 'POST',
                            body: JSON.stringify({
                                new_start: newStart.toISOString(),
                                new_end: newEnd.toISOString()
                            })
                        });
                    }
                    timingsUpdated = true;
                }
            }

            const updateData: any = {
                status,
                session_notes: sessionNotes,
                cancellation_reason: (status === "Missed" || status === "Cancelled") ? cancellationReason : null,
                updated_at: new Date().toISOString(),
            };

            if (status === "Completed") {
                const dateStr = format(parseISO(session.scheduled_start), "yyyy-MM-dd");
                const actual_start = new Date(`${dateStr}T${actualStart}:00`).toISOString();
                const actual_end = new Date(`${dateStr}T${actualEnd}:00`).toISOString();

                await apiFetch(`/api/appointments/${session.id}/complete`, {
                    method: 'POST',
                    body: JSON.stringify({ actual_start, actual_end })
                });
            } else {
                await apiFetch(`/api/appointments/${session.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(updateData)
                });
            }

            toast({
                title: timingsUpdated ? "Session Timings & Details Saved ✓" : "Session Saved ✓",
                description: timingsUpdated ? "Session schedule timing updated successfully." : "Session details updated successfully."
            });
            await queryClient.invalidateQueries({ queryKey: ["admin-master-sessions"] });
            await queryClient.invalidateQueries({ queryKey: ["roster-sessions"] });
            await queryClient.invalidateQueries({ queryKey: ["sports-scientist-sessions"] });
            await onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({ title: "Error", description: error.message || "Failed to save session", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (!session) return null;

    const scheduledDate = parseISO(session.scheduled_start);

    const getStatusStyle = (s: string) => {
        switch (s) {
            case "Completed": return "bg-emerald-100 text-emerald-800 border-emerald-300";
            case "Planned": return session?.actual_start ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-blue-100 text-blue-800 border-blue-300";
            case "IN_PROGRESS":
            case "In Progress":
            case "Checked In": return "bg-emerald-100 text-emerald-800 border-emerald-300";
            case "Cancelled": return "bg-rose-100 text-rose-800 border-rose-300";
            case "Missed": return "bg-amber-100 text-amber-800 border-amber-300";
            default: return "bg-slate-100 text-slate-800 border-slate-300";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[94vw] max-w-[520px] max-h-[88vh] flex flex-col rounded-3xl sm:rounded-[2rem] p-0 overflow-hidden border border-border/80 shadow-2xl pointer-events-auto">
                <DialogHeader className="p-4 sm:p-5 pb-3 shrink-0 border-b border-border/40 bg-card">
                    <DialogTitle className="text-base sm:text-lg font-black tracking-tight">
                        Update Session Status
                    </DialogTitle>
                    <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                        Manage status, notes, and attendance for this session.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3 sm:space-y-4 custom-scrollbar">
                    {/* Header Notices */}
                    <div className="space-y-2">
                        {editInfo.isLocked && (
                            <div className="flex items-start gap-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3 text-[11px] sm:text-xs text-slate-700">
                                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 shrink-0" />
                                <span>{editInfo.lockReason}</span>
                            </div>
                        )}
                        {editInfo.isNextDayOrLater && !editInfo.isLocked && (
                            <div className="flex items-start gap-2 w-full rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 sm:p-3.5 text-[11px] sm:text-xs text-emerald-800 font-medium">
                                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 shrink-0 text-emerald-600" />
                                <span>
                                    Future session — scheduled for <strong>{format(scheduledDate, "EEE, MMM d, yyyy 'at' h:mm a")}</strong>. Click <strong>Reschedule Session</strong> below to change date or time.
                                </span>
                            </div>
                        )}
                        {editInfo.isToday && !editInfo.isLocked && (
                            <div className="flex items-start gap-2 w-full rounded-xl border border-blue-200 bg-blue-50/70 p-2.5 sm:p-3.5 text-[11px] sm:text-xs text-blue-800 font-medium">
                                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 shrink-0 text-blue-600" />
                                <span>Today's session — scheduled for today. Click <strong>Reschedule Session</strong> below to change date or time, or record actual timings.</span>
                            </div>
                        )}
                        {session.session_mode === "Individual" && session.client?.outstanding_balance > 0 && (
                            <div className="flex items-start gap-2 w-full rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 p-2.5 sm:p-3 text-[11px] sm:text-xs text-rose-800 dark:text-rose-300">
                                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
                                <span>
                                    <strong>Payment Overdue:</strong> This athlete has pending dues.
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Session summary / Slot details card */}
                    <div className="bg-muted/40 p-3 sm:p-4 rounded-xl text-xs space-y-1.5 sm:space-y-2 border border-border/50">
                        <div className="flex justify-between items-center text-[11px] sm:text-xs">
                            <span className="text-muted-foreground font-medium">Type</span>
                            <span className="font-semibold text-right truncate ml-2">{session.session_type?.name || session.service_type || "Sports Science"}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] sm:text-xs">
                            <span className="text-muted-foreground font-medium">Athlete</span>
                            <span className="font-semibold text-right truncate ml-2">
                                {session.session_mode === "Group"
                                    ? `👥 Group: ${session.group_name}`
                                    : session.session_mode === "Other"
                                    ? `🏢 Internal: ${session.session_type?.name}`
                                    : session.client
                                    ? formatClientName(session.client)
                                    : "N/A"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] sm:text-xs">
                            <span className="text-muted-foreground font-medium">Scheduled</span>
                            <span className="font-semibold text-right truncate ml-2">{format(scheduledDate, "MMM d, h:mm a")} – {format(parseISO(session.scheduled_end || session.scheduled_start), "h:mm a")}</span>
                        </div>
                        {(session.actual_start || session.actual_end) && (
                            <div className="flex justify-between items-center text-[11px] sm:text-xs bg-emerald-500/10 dark:bg-emerald-950/40 p-2 sm:p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800">
                                <span className="text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    Actual Timings
                                </span>
                                <span className="font-black text-emerald-900 dark:text-emerald-200 text-right truncate ml-2">
                                    {session.actual_start ? format(parseISO(session.actual_start), "MMM d, h:mm a") : "--"}
                                    {session.actual_end ? ` – ${format(parseISO(session.actual_end), "h:mm a")}` : " (In Progress)"}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-[11px] sm:text-xs">
                            <span className="text-muted-foreground font-medium">Current Status</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wide border ${getStatusStyle(status)}`}>
                                {(status === "Checked In" || status === "In Progress" || (status === "Planned" && session?.actual_start)) ? "IN PROGRESS" : status}
                            </span>
                        </div>
                    </div>

                    {/* Reschedule Button placed directly under Slot Details Card */}
                    {!editInfo.isLocked && (
                        <div className="pt-0.5">
                            <Button
                                type="button"
                                variant={showRescheduleControls ? "default" : "outline"}
                                className={`w-full h-10 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold text-xs gap-2 rounded-xl shadow-sm transition-all ${
                                    showRescheduleControls ? "bg-emerald-700 text-white hover:bg-emerald-800" : "bg-emerald-50/70 hover:bg-emerald-100/90"
                                }`}
                                onClick={() => setShowRescheduleControls(prev => !prev)}
                            >
                                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                {showRescheduleControls ? "Hide Reschedule Form" : "Reschedule Session"}
                            </Button>
                        </div>
                    )}

                    {/* Change Timings & Date Section */}
                    {!editInfo.isLocked && showRescheduleControls && (
                        <div className="grid gap-2.5 sm:gap-3 bg-emerald-50/40 dark:bg-slate-900/60 p-3.5 sm:p-4 rounded-2xl border border-emerald-200 dark:border-slate-800 animate-in slide-in-from-top-2">
                            <div className="flex items-center justify-between gap-2">
                                <Label className="font-bold text-slate-900 dark:text-slate-100 text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                                    Reschedule Session & Timings
                                </Label>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
                                <div>
                                    <Label className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">New Date</Label>
                                    <Input
                                        type="date"
                                        value={rescheduledDate}
                                        onChange={(e) => setRescheduledDate(e.target.value)}
                                        className="bg-white dark:bg-slate-900 text-xs font-bold h-9 sm:h-10 border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">New Start Time</Label>
                                    <Input
                                        type="time"
                                        value={rescheduledTime}
                                        onChange={(e) => setRescheduledTime(e.target.value)}
                                        className="bg-white dark:bg-slate-900 text-xs font-bold h-9 sm:h-10 border-slate-200 dark:border-slate-800"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <div>
                                    <Label className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Duration (Mins)</Label>
                                    <Input
                                        type="number"
                                        min={15}
                                        max={240}
                                        step={15}
                                        value={durationMins}
                                        onChange={(e) => setDurationMins(parseInt(e.target.value) || 60)}
                                        className="bg-white dark:bg-slate-900 text-xs font-bold h-9 sm:h-10 border-slate-200 dark:border-slate-800"
                                    />
                                </div>

                                <div>
                                    <Label className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Apply Changes To</Label>
                                    <Select value={rescheduleScope} onValueChange={(v: any) => setRescheduleScope(v)}>
                                        <SelectTrigger className="bg-white dark:bg-slate-900 text-xs font-bold h-9 sm:h-10 border-slate-200 dark:border-slate-800">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="THIS_SESSION">Single Session</SelectItem>
                                            <SelectItem value="ALL_FUTURE">All Future</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button
                                type="button"
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm mt-1"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Calendar className="w-3.5 h-3.5 mr-1" />}
                                Confirm & Save Reschedule
                            </Button>
                        </div>
                    )}

                    {/* Quick Actions / Actual Timings Section */}
                    {!editInfo.isLocked && (status === "Planned" || status === "Checked In" || status === "In Progress" || (status === "Planned" && session?.actual_start)) && (
                        <div className="grid gap-2.5 sm:gap-3 pt-1">
                            {isPastScheduledEnd ? (
                                /* When scheduled end time has crossed, show empty time fields for exact time entry instead of start/stop buttons */
                                <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 sm:space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                                        <Label className="font-bold text-slate-900 dark:text-slate-100 text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
                                            Record Actual Timings
                                        </Label>
                                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-none text-[8.5px] sm:text-[9px] font-black uppercase px-2 py-0.5">
                                            Scheduled End Passed
                                        </Badge>
                                    </div>
                                    <p className="text-[10.5px] sm:text-[11px] text-muted-foreground leading-tight">
                                        The scheduled end time has passed. Specify exact actual start and end times:
                                    </p>
                                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                        <div>
                                            <Label className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Actual Start *</Label>
                                            <Input
                                                type="time"
                                                value={actualStart}
                                                onChange={(e) => setActualStart(e.target.value)}
                                                className="bg-white dark:bg-slate-900 text-xs font-bold h-9 sm:h-10 border-slate-200 dark:border-slate-800"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Actual End *</Label>
                                            <Input
                                                type="time"
                                                value={actualEnd}
                                                onChange={(e) => setActualEnd(e.target.value)}
                                                className="bg-white dark:bg-slate-900 text-xs font-bold h-9 sm:h-10 border-slate-200 dark:border-slate-800"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 pt-1">
                                        <Button
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 sm:h-10 text-xs rounded-xl"
                                            onClick={handleCompleteWithFreeTime}
                                            disabled={loading}
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Complete Session"}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold h-9 sm:h-10 text-xs rounded-xl"
                                            onClick={() => handleQuickAction("Missed")}
                                            disabled={loading}
                                        >
                                            Mark as Missed
                                        </Button>
                                    </div>
                                </div>
                            ) : editInfo.isToday && (
                                /* Scheduled end time has NOT crossed yet — show standard Start/Reschedule/Missed buttons */
                                <>
                                    {(status === "Planned" && !session?.actual_start) && (
                                        <div className="flex flex-col gap-2 w-full">
                                            <Label className="font-semibold text-muted-foreground text-[11px] sm:text-xs uppercase tracking-wider">Today's Quick Actions</Label>
                                            <div className="flex gap-2">
                                                <Button 
                                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold h-9 sm:h-10 text-xs" 
                                                    onClick={() => handleQuickAction("Start")}
                                                    disabled={loading}
                                                >
                                                    Start Session
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50 font-bold h-9 sm:h-10 text-xs"
                                                    onClick={() => handleQuickAction("Missed")}
                                                    disabled={loading}
                                                >
                                                    Mark as Missed
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                    {(status === "Checked In" || status === "In Progress" || (status === "Planned" && session?.actual_start)) && (
                                        <div className="flex flex-col gap-2 w-full">
                                            <div className="flex items-center justify-center gap-2 text-emerald-700 bg-emerald-50 py-1.5 sm:py-2 rounded-lg font-bold border border-emerald-200 text-xs">
                                                <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                                                Session In Progress
                                            </div>
                                            <Button 
                                                className="w-full bg-blue-600 hover:bg-blue-700 font-bold h-9 sm:h-10 text-xs" 
                                                onClick={() => handleQuickAction("End")}
                                                disabled={loading}
                                            >
                                                End Session
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Cancellation/Missed Reason */}
                    {(status === "Missed" || status === "Cancelled") && (
                        <div className="grid gap-2 p-3 sm:p-4 bg-rose-50/50 rounded-xl border border-rose-200">
                            <Label className="font-semibold text-rose-800 text-[11px] sm:text-xs">Reason for {status}</Label>
                            <Textarea
                                id="cancellationReason"
                                placeholder={`Please provide a reason why this session was ${status.toLowerCase()}...`}
                                value={cancellationReason}
                                onChange={e => setCancellationReason(e.target.value)}
                                disabled={editInfo.isLocked}
                                className="resize-none min-h-[70px] sm:min-h-[80px] text-xs sm:text-sm bg-white"
                            />
                        </div>
                    )}

                    {/* Session notes */}
                    <div className="grid gap-1.5 sm:gap-2">
                        <Label className="font-semibold text-[11px] sm:text-xs uppercase tracking-wider text-slate-700">Session Notes / Observations</Label>
                        <Textarea
                            placeholder="Add post-session notes, observations, performance data..."
                            value={sessionNotes}
                            onChange={e => setSessionNotes(e.target.value)}
                            disabled={editInfo.isLocked}
                            className="resize-none min-h-[70px] sm:min-h-[80px] text-xs sm:text-sm"
                        />
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={loading || editInfo.isLocked || autoMissing}
                        className="w-full h-10 sm:h-11 font-bold text-xs sm:text-sm rounded-xl shadow-md bg-primary hover:bg-primary/90 text-white"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editInfo.isLocked ? "Session Locked" : "Save Changes"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
