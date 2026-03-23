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
    onSuccess: () => void;
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
    const isLocked = daysAgo >= 2;

    return {
        isLocked,
        isFuture: isFutureSession,
        isToday,
        isYesterday,
        daysAgo,
        lockReason: isLocked
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

            // Trigger auto-miss if applicable
            if (editInfo.isLocked && session.status === "Planned") {
                autoMarkMissed();
            }
        }
    }, [session]);

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

            toast({ title: "Saved", description: "Session status updated." });
            onSuccess();
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
            case "Planned": return "bg-blue-100 text-blue-800 border-blue-300";
            case "Missed": return "bg-rose-100 text-rose-800 border-rose-300";
            case "Cancelled": return "bg-slate-100 text-slate-600 border-slate-300";
            case "Rescheduled": return "bg-amber-100 text-amber-800 border-amber-300";
            default: return "bg-muted text-muted-foreground border-border";
        }
    };

    const availableStatuses = editInfo.isFuture
        ? ["Planned", "Cancelled"]
        : ["Planned", "Completed", "Missed", "Rescheduled", "Cancelled"];

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
                        {(editInfo.isToday || editInfo.isYesterday) && (
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
                                {status}
                            </span>
                        </div>
                    </div>

                    {/* Status selector */}
                    <div className="grid gap-2">
                        <Label className="font-semibold">Change Status</Label>
                        <Select value={status} onValueChange={setStatus} disabled={editInfo.isLocked || autoMissing}>
                            <SelectTrigger className="h-11">
                                <SelectValue placeholder="Select Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableStatuses.map(s => (
                                    <SelectItem key={s} value={s}>
                                        <div className="flex items-center gap-2">
                                            {s === "Completed" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                                            {s === "Missed" && <XCircle className="w-3.5 h-3.5 text-rose-500" />}
                                            {s === "Cancelled" && <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                                            {s === "Planned" && <Clock className="w-3.5 h-3.5 text-blue-500" />}
                                            {s}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Actual times — only shown when marking Completed */}
                    {status === "Completed" && !editInfo.isLocked && (
                        <div className="grid gap-3 animate-in slide-in-from-top-2 p-4 bg-emerald-50/50 rounded-xl border border-emerald-200">
                            <Label className="text-sm font-semibold text-emerald-800">Actual Performance Times</Label>
                            <div className="flex items-center gap-3">
                                <div className="grid gap-1.5 flex-1">
                                    <Label className="text-xs text-muted-foreground">Start</Label>
                                    <Input type="time" value={actualStart} onChange={e => setActualStart(e.target.value)} className="h-9" />
                                </div>
                                <span className="text-muted-foreground text-xs pt-5">to</span>
                                <div className="grid gap-1.5 flex-1">
                                    <Label className="text-xs text-muted-foreground">End</Label>
                                    <Input type="time" value={actualEnd} onChange={e => setActualEnd(e.target.value)} className="h-9" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Cancellation/Missed Reason */}
                    {(status === "Missed" || status === "Cancelled") && (
                        <div className="grid gap-2 animate-in slide-in-from-top-2 p-4 bg-rose-50/50 rounded-xl border border-rose-200">
                            <Label className="font-semibold text-rose-800">Reason for {status}</Label>
                            <Textarea
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
                        {editInfo.isLocked ? "Session Locked" : "Save Changes"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
