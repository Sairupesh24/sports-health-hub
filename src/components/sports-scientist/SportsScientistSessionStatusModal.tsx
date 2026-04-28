import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, AlertTriangle, Clock, CheckCircle2, XCircle, Info } from "lucide-react";
import { format, startOfDay, differenceInCalendarDays, parseISO, isFuture } from "date-fns";
import { Input } from "@/components/ui/input";

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

    const editInfo = getSessionEditability(session);

    // Auto-mark as Missed if the session was Planned but is now 2+ days old
    const autoMarkMissed = useCallback(async () => {
        if (!session?.id) return;
        if (session.status !== "Planned") return;
        if (!editInfo.isLocked) return; // Only lock-trigger: 2+ days old

        setAutoMissing(true);
        try {
            await supabase
                .from("sessions")
                .update({ status: "Missed", updated_at: new Date().toISOString() })
                .eq("id", session.id);
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
        setLoading(true);
        try {
            if (action === "Start") {
                const nowTime = format(new Date(), "HH:mm");
                const dateStr = format(parseISO(session.scheduled_start), "yyyy-MM-dd");
                const actualStartIso = new Date(`${dateStr}T${nowTime}:00`).toISOString();
                
                let updateError;
                try {
                    const { error } = await supabase.from("sessions").update({
                        status: "Checked In",
                        actual_start: actualStartIso,
                        updated_at: new Date().toISOString()
                    }).eq("id", session.id);
                    updateError = error;
                } catch (e) {
                    updateError = e;
                }
                
                if (updateError) {
                    // Aggressive Fallback: Just update actual_start and keep status as is
                    const { error: fallbackError } = await supabase.from("sessions").update({
                        actual_start: actualStartIso,
                        updated_at: new Date().toISOString()
                    }).eq("id", session.id);
                    
                    if (fallbackError) throw fallbackError;
                    // If fallback succeeds, we stay as "Planned" but with actual_start set, 
                    // which our UI now recognizes as "IN PROGRESS"
                    setStatus(session.status || "Planned");
                } else {
                    setStatus("Checked In");
                }
                
                toast({ title: "Session Started", description: "Athlete has arrived." });
                await onSuccess();
            } else if (action === "End") {
                const nowTime = format(new Date(), "HH:mm");
                const dateStr = format(parseISO(session.scheduled_start), "yyyy-MM-dd");
                const actualEndIso = new Date(`${dateStr}T${nowTime}:00`).toISOString();
                
                const { error: updateError } = await supabase.from("sessions").update({
                    status: "Completed",
                    actual_end: actualEndIso,
                    updated_at: new Date().toISOString()
                }).eq("id", session.id);
                
                if (updateError) throw updateError;
                
                const { data: { user } } = await supabase.auth.getUser();
                const { error: rpcError } = await supabase.rpc("complete_session", {
                    p_session_id: session.id,
                    p_user_id: user?.id,
                });
                if (rpcError) throw new Error(rpcError.message || "Failed to complete session");
                
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
            toast({ title: "Error", description: error.message, variant: "destructive" });
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

        // Future session guard: can only set Planned or Cancelled
        if (editInfo.isFuture && status === "Completed") {
            toast({
                title: "Not Allowed",
                description: `This session is on ${format(parseISO(session.scheduled_start), "MMM d, yyyy h:mm a")}. You cannot mark a future session as Completed.`,
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
                updateData.actual_start = new Date(`${dateStr}T${actualStart}:00`).toISOString();
                updateData.actual_end = new Date(`${dateStr}T${actualEnd}:00`).toISOString();

                // Update actual times first
                await (supabase as any).from("sessions").update({
                    actual_start: updateData.actual_start,
                    actual_end: updateData.actual_end,
                }).eq("id", session.id);

                // Call complete_session RPC (handles entitlement deduction)
                const { data: { user } } = await supabase.auth.getUser();
                const { error: rpcError } = await supabase.rpc("complete_session", {
                    p_session_id: session.id,
                    p_user_id: user?.id,
                });
                if (rpcError) throw new Error(rpcError.message || "Failed to complete session");
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

                const { data: newSessionId, error: rescheduleError } = await supabase.rpc("reschedule_session", {
                    p_session_id: session.id,
                    p_new_start: newStartTime.toISOString(),
                    p_new_end: newEndTime.toISOString()
                });

                if (rescheduleError) throw rescheduleError;

                toast({ title: "Rescheduled", description: "The session has been moved to the new date and time." });
            } else {
                const { error } = await (supabase as any)
                    .from("sessions")
                    .update(updateData)
                    .eq("id", session.id);
                if (error) throw error;
            }

            // Also update session_notes separately if changed
            if (sessionNotes !== session.session_notes) {
                await (supabase as any).from("sessions").update({ session_notes: sessionNotes }).eq("id", session.id);
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
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {editInfo.isLocked ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Clock className="w-4 h-4 text-primary" />}
                        Update Session Status
                    </DialogTitle>
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
                                {(status === "Checked In" || (status === "Planned" && session?.actual_start)) ? "IN PROGRESS" : status}
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

                    {/* Quick Actions */}
                    {!editInfo.isLocked && !editInfo.isFuture && (status === "Planned" || status === "Checked In" || (status === "Planned" && session?.actual_start)) && (
                        <div className="grid gap-3 pt-2">
                            <Label className="font-semibold text-muted-foreground">Quick Actions</Label>
                            <div className="flex gap-2">
                                {(status === "Planned" && !session?.actual_start) && (
                                    <>
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
                                    </>
                                )}
                                {(status === "Checked In" || (status === "Planned" && session?.actual_start)) && (
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
                        </div>
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
