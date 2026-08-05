import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, AlertTriangle, Clock, CheckCircle2, XCircle, Info } from "lucide-react";
import { format, startOfDay, differenceInCalendarDays, parseISO, isFuture, isBefore } from "date-fns";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { SportsScientistRescheduleModal } from "@/components/sports-scientist/SportsScientistRescheduleModal";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: any;
    onSuccess: () => void | Promise<any>;
}

/**
 * Editing rules:
 *  - Future sessions  → can only be set to Planned / Cancelled  (not Completed/Missed)
 *  - Today            → full edit (any status)
 *  - Yesterday        → full edit (any status)
 *  - 2+ days ago      → LOCKED — read-only, cannot save
 */
function getSessionEditability(session: any): {
    isLocked: boolean;
    isFuture: boolean;
    isToday: boolean;
    isYesterday: boolean;
    daysAgo: number;
    lockReason?: string;
} {
    if (!session) return { isLocked: false, isFuture: false, isToday: false, isYesterday: false, daysAgo: 0 };

    const scheduledDay = startOfDay(parseISO(session.scheduled_start));
    const today = startOfDay(new Date());
    const daysAgo = differenceInCalendarDays(today, scheduledDay); // positive = past, negative = future

    const isFutureSession = daysAgo < 0;
    const isToday = daysAgo === 0;
    const isYesterday = daysAgo === 1;
    const isStatusLocked = session.status === "Cancelled" || session.status === "Rescheduled" || session.status === "Completed";
    const isLocked = daysAgo >= 2 || isStatusLocked;

    return {
        isLocked,
        isFuture: isFutureSession,
        isToday,
        isYesterday,
        daysAgo,
        lockReason: isStatusLocked 
            ? `This session is ${session.status.toLowerCase()} and cannot be edited.`
            : isLocked
            ? `This session was on ${format(parseISO(session.scheduled_start), "MMM d, yyyy")} — sessions older than 1 day cannot be edited.`
            : undefined,
    };
}

export function SportsScientistSessionStatusModal({ open, onOpenChange, session, onSuccess }: Props) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [autoMissing, setAutoMissing] = useState(false);
    const [status, setStatus] = useState<string>("Planned");
    const [actualStart, setActualStart] = useState("");
    const [actualEnd, setActualEnd] = useState("");
    const [sessionNotes, setSessionNotes] = useState("");
    const [cancellationReason, setCancellationReason] = useState("");
    const [rescheduledDate, setRescheduledDate] = useState("");
    const [rescheduledTime, setRescheduledTime] = useState("");
    const [attendees, setAttendees] = useState<any[]>([]);
    const [attendeesLoading, setAttendeesLoading] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);

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
        if (!editInfo.isLocked) return; // Only lock-trigger: 2+ days old

        setAutoMissing(true);
        try {
            await apiFetch(`/api/appointments/${session.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: "Missed" })
            });
            onSuccess(); // refresh caller
        } catch (e) {
            console.error("Auto-miss failed", e);
        } finally {
            setAutoMissing(false);
        }
    }, [session, editInfo.isLocked, onSuccess]);

    useEffect(() => {
        if (session) {
            // Derive effective status (may have been auto-missed)
            const effectiveStatus = editInfo.isLocked && session.status === "Planned"
                ? "Missed"
                : session.status || "Planned";
            setStatus(effectiveStatus);
            setSessionNotes(session.session_notes || "");
            setCancellationReason(session.cancellation_reason || "");

            if (session.actual_start) {
                setActualStart(format(parseISO(session.actual_start), "HH:mm"));
            } else if (session.scheduled_start) {
                setActualStart(format(parseISO(session.scheduled_start), "HH:mm"));
            }
            if (session.actual_end) {
                setActualEnd(format(parseISO(session.actual_end), "HH:mm"));
            } else if (session.scheduled_end) {
                setActualEnd(format(parseISO(session.scheduled_end), "HH:mm"));
            }

            if (editInfo.isLocked && session.status === "Planned") {
                autoMarkMissed();
            }

            // Initialize rescheduling defaults
            setRescheduledDate(format(parseISO(session.scheduled_start), "yyyy-MM-dd"));
            setRescheduledTime(format(parseISO(session.scheduled_start), "HH:mm"));
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
                toast({ title: "Session Started", description: "Session transitioned to IN_PROGRESS. Athlete moved to Active On Field queue." });
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

            toast({ title: "Session Completed", description: "Actual timings recorded and entitlement balance updated." });
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

        // Strict today guard: cannot start or complete non-today sessions
        if (!editInfo.isToday && (status === "Completed" || status === "IN_PROGRESS" || status === "In Progress" || status === "Checked In")) {
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
            } else if (status === "Rescheduled") {
                if (session.status !== "Planned") {
                    throw new Error("Only Planned sessions can be rescheduled.");
                }
                if (!rescheduledDate || !rescheduledTime) {
                    throw new Error("Please select both a date and time for rescheduling.");
                }

                const newStartTime = new Date(`${rescheduledDate}T${rescheduledTime}:00`);
                const durationMs = new Date(session.scheduled_end || session.scheduled_start).getTime() - new Date(session.scheduled_start).getTime();
                const newEndTime = new Date(newStartTime.getTime() + (durationMs || 3600000)); // Default 1h if duration missing

                await apiFetch(`/api/appointments/${session.id}/reschedule`, {
                    method: 'POST',
                    body: JSON.stringify({
                        new_start: newStartTime.toISOString(),
                        new_end: newEndTime.toISOString()
                    })
                });

                toast({ title: "Rescheduled", description: "The session has been moved to the new date and time." });
            } else {
                await apiFetch(`/api/appointments/${session.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(updateData)
                });
            }

            // Also update session_notes separately if changed
            if (sessionNotes !== session.session_notes && status !== "Completed" && status !== "Rescheduled") {
                await apiFetch(`/api/appointments/${session.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ session_notes: sessionNotes })
                });
            }

            toast({ title: "Saved", description: "Session notes updated." });
            await onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (!session) return null;

    const scheduledDate = parseISO(session.scheduled_start);

    // Status badge styling
    const getStatusStyle = (s: string) => {
        switch (s) {
            case "Completed": return "bg-emerald-100 text-emerald-800 border-emerald-300";
            case "Planned": return session?.actual_start ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-blue-100 text-blue-800 border-blue-300";
            case "Missed": return "bg-rose-100 text-rose-800 border-rose-300";
            case "Checked In": return "bg-emerald-100 text-emerald-800 border-emerald-300";
            case "In Progress": return "bg-emerald-100 text-emerald-800 border-emerald-300";
            case "Cancelled": return "bg-slate-100 text-slate-600 border-slate-300";
            case "Rescheduled": return "bg-amber-100 text-amber-800 border-amber-300";
            default: return "bg-muted text-muted-foreground border-border";
        }
    };

    const availableStatuses = editInfo.isFuture
        ? ["Planned", "Cancelled"]
        : ["Planned", "Checked In", "Completed", "Rescheduled", "Cancelled"];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-[480px] max-h-[90dvh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {editInfo.isLocked ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Clock className="w-4 h-4 text-primary" />}
                        Update Session Status
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Form to update the current training session's status, notes, or rescheduling details.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    {/* Status badges row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {editInfo.isLocked && (
                            <div className="flex items-start gap-2 w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{editInfo.lockReason}</span>
                            </div>
                        )}
                        {editInfo.isFuture && (
                            <div className="flex items-start gap-2 w-full rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>Future session — scheduled for <strong>{format(scheduledDate, "MMM d, yyyy h:mm a")}</strong>. You may only change this to Planned or Cancelled.</span>
                            </div>
                        )}
                        {(editInfo.isToday || editInfo.isYesterday) && !editInfo.isLocked && (
                            <div className="flex items-start gap-2 w-full rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{editInfo.isToday ? "Today's session" : "Yesterday's session"} — fully editable until midnight tonight.</span>
                            </div>
                        )}
                        {session.session_mode === "Individual" && session.client?.outstanding_balance > 0 && (
                            <div className="flex items-start gap-2 w-full rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/20 p-3 text-sm text-rose-800 dark:text-rose-300">
                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
                                <span>
                                    <strong>Payment Overdue:</strong> This athlete has pending dues. Please advise them to clear dues.
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Session summary card */}
                    <div className="bg-muted/40 p-4 rounded-xl text-sm space-y-2 border border-border/50">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium">Type</span>
                            <span className="font-semibold">{session.session_type?.name || session.service_type || "Sports Science"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium">Athlete</span>
                            <span className="font-semibold">
                                {session.session_mode === "Group"
                                    ? `👥 Group: ${session.group_name}`
                                    : session.session_mode === "Other"
                                    ? `🏢 Internal: ${session.session_type?.name}`
                                    : session.client?.first_name
                                    ? `${session.client.first_name} ${session.client.last_name}`
                                    : "N/A"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium">Scheduled</span>
                            <span className="font-semibold">{format(scheduledDate, "MMM d, h:mm a")} – {format(parseISO(session.scheduled_end || session.scheduled_start), "h:mm a")}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground font-medium">Current Status</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${getStatusStyle(status)}`}>
                                {(status === "Checked In" || status === "In Progress" || (status === "Planned" && session?.actual_start)) ? "IN PROGRESS" : status}
                            </span>
                        </div>
                        {session?.actual_start && (
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-muted-foreground font-medium uppercase tracking-wider">Recorded Start</span>
                                <span className="font-bold text-emerald-600">{format(parseISO(session.actual_start), "h:mm a")}</span>
                            </div>
                        )}
                        {session?.actual_end && (
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-muted-foreground font-medium uppercase tracking-wider">Recorded End</span>
                                <span className="font-bold text-emerald-600">{format(parseISO(session.actual_end), "h:mm a")}</span>
                            </div>
                        )}
                    </div>

                    {/* Group Session Attendees */}
                    {session.session_mode === 'Group' && (
                        <div className="space-y-2 pt-1">
                            <Label className="font-semibold text-foreground flex items-center gap-2">
                                👥 Attendees ({attendees.length})
                            </Label>
                            {attendeesLoading ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Loading attendees...
                                </div>
                            ) : attendees.length > 0 ? (
                                <div className="bg-muted/30 border border-border/50 rounded-lg p-3 max-h-[150px] overflow-y-auto space-y-1.5 custom-scrollbar text-xs">
                                    {attendees.map((attendee) => (
                                        <div key={attendee.id} className="flex justify-between items-center py-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-slate-800 dark:text-slate-200">{attendee.first_name} {attendee.last_name}</span>
                                                {attendee.outstanding_balance > 0 && (
                                                    <span className="text-[7px] bg-rose-500 text-white px-2 py-0.5 rounded font-black uppercase tracking-widest leading-none">
                                                        DUE PENDING
                                                    </span>
                                                )}
                                            </div>
                                            {attendee.uhid && (
                                                <span className="font-mono text-[10px] text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                    {attendee.uhid}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-xs text-muted-foreground bg-slate-50 border border-slate-200 rounded-md px-3 py-2 italic">
                                    No attendees registered for this group session.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Quick Actions / Free Time Entry (Today or Yesterday planned sessions) */}
                    {!editInfo.isLocked && (editInfo.isToday || editInfo.isYesterday) && (status === "Planned" || status === "Checked In" || status === "In Progress" || (status === "Planned" && session?.actual_start)) && (
                        <div className="grid gap-3 pt-2">
                            {(status === "Planned" && !session?.actual_start) && (
                                isPastScheduledEnd ? (
                                    /* Retroactive Free Time Entry Card when scheduled end time has passed */
                                    <div className="grid gap-3 bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-bold text-amber-900 dark:text-amber-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                                Scheduled End Time Passed — Free Time Entry
                                            </Label>
                                            <span className="text-[9px] font-black uppercase text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
                                                Actual Timings
                                            </span>
                                        </div>
                                        <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                                            The scheduled slot time has passed. Please specify actual session start and end times to record completion:
                                        </p>

                                        <div className="grid grid-cols-2 gap-3 pt-1">
                                            <div>
                                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Actual Start Time</Label>
                                                <Input
                                                    type="time"
                                                    value={actualStart}
                                                    onChange={(e) => setActualStart(e.target.value)}
                                                    className="bg-white dark:bg-slate-900 text-sm font-mono font-bold h-10 border-slate-200 dark:border-slate-800"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">Actual End Time</Label>
                                                <Input
                                                    type="time"
                                                    value={actualEnd}
                                                    onChange={(e) => setActualEnd(e.target.value)}
                                                    className="bg-white dark:bg-slate-900 text-sm font-mono font-bold h-10 border-slate-200 dark:border-slate-800"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 pt-2">
                                            <Button 
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-sm gap-2" 
                                                onClick={handleCompleteWithFreeTime}
                                                disabled={loading}
                                            >
                                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                Record & Complete Session
                                            </Button>
                                            <div className="flex gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs"
                                                    onClick={() => handleQuickAction("Missed")}
                                                    disabled={loading}
                                                >
                                                    Mark as Missed
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="flex-1 border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 font-bold text-xs"
                                                    onClick={() => setIsRescheduleModalOpen(true)}
                                                    disabled={loading}
                                                >
                                                    Reschedule Slot
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Live Session Window: Start Session buttons */
                                    <div className="flex flex-col gap-2 w-full">
                                        <Label className="font-semibold text-muted-foreground">Quick Actions</Label>
                                        <div className="flex gap-2">
                                            <Button 
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold" 
                                                onClick={() => handleQuickAction("Start")}
                                                disabled={loading}
                                            >
                                                Start Session
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50 font-bold"
                                                onClick={() => handleQuickAction("Missed")}
                                                disabled={loading}
                                            >
                                                Mark as Missed
                                            </Button>
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="w-full border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 font-bold"
                                            onClick={() => setIsRescheduleModalOpen(true)}
                                            disabled={loading}
                                        >
                                            <Clock className="w-4 h-4 mr-2 text-amber-600" />
                                            Reschedule Slot
                                        </Button>
                                    </div>
                                )
                            )}
                            {(status === "Checked In" || status === "In Progress" || (status === "Planned" && session?.actual_start)) && (
                                <div className="flex flex-col gap-2 w-full">
                                    <div className="flex items-center justify-center gap-2 text-emerald-700 bg-emerald-50 py-2 rounded-lg font-bold border border-emerald-200">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Session In Progress
                                    </div>
                                    <Button 
                                        className="w-full bg-blue-600 hover:bg-blue-700 font-bold" 
                                        onClick={() => handleQuickAction("End")}
                                        disabled={loading}
                                    >
                                        End Session
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reschedule option for future / non-today planned sessions */}
                    {!editInfo.isLocked && !editInfo.isToday && status === "Planned" && (
                        <div className="pt-2">
                            <Button
                                variant="outline"
                                className="w-full border-amber-300 text-amber-800 dark:text-amber-300 hover:bg-amber-50 font-bold h-11"
                                onClick={() => setIsRescheduleModalOpen(true)}
                                disabled={loading}
                            >
                                <Clock className="w-4 h-4 mr-2 text-amber-600" />
                                Reschedule Future Slot
                            </Button>
                        </div>
                    )}

                    {/* Reschedule Button for future or planned sessions */}
                    {status === "Planned" && (
                        <SportsScientistRescheduleModal
                            open={isRescheduleModalOpen}
                            onOpenChange={setIsRescheduleModalOpen}
                            session={session}
                            onSuccess={async () => {
                                await onSuccess();
                                onOpenChange(false);
                            }}
                        />
                    )}

                    {/* Cancellation/Missed Reason */}
                    {(status === "Missed" || status === "Cancelled") && (
                        <div className="grid gap-2 animate-in slide-in-from-top-2 p-4 bg-rose-50/50 rounded-xl border border-rose-200">
                            <Label className="font-semibold text-rose-800">Reason for {status}</Label>
                            <Textarea
                                id="cancellationReason"
                                placeholder={`Please provide a reason why this session was ${status.toLowerCase()}...`}
                                value={cancellationReason}
                                onChange={e => setCancellationReason(e.target.value)}
                                disabled={editInfo.isLocked}
                                className="resize-none min-h-[80px] text-sm bg-white"
                            />
                        </div>
                    )}

                    {/* Session notes */}
                    <div className="grid gap-2">
                        <Label className="font-semibold">Session Notes / Observations</Label>
                        <Textarea
                            placeholder="Add post-session notes, observations, performance data..."
                            value={sessionNotes}
                            onChange={e => setSessionNotes(e.target.value)}
                            disabled={editInfo.isLocked}
                            className="resize-none min-h-[80px] text-sm"
                        />
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={loading || editInfo.isLocked || autoMissing}
                        className="w-full h-11 font-bold"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editInfo.isLocked ? "Session Locked" : "Save Notes"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
