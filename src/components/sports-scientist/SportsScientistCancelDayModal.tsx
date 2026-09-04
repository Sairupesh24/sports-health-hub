import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarX, Loader2, AlertCircle, Clock, Trash2, Calendar as CalendarIcon, Info } from "lucide-react";
import { format, parseISO, isSameDay, startOfDay, endOfDay, isAfter, addDays } from "date-fns";
import { formatClientName } from "@/lib/utils";

interface CancelDayModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentDate: Date;
    sessions: any[];
    onSuccess: () => void | Promise<any>;
}

export function SportsScientistCancelDayModal({
    open,
    onOpenChange,
    currentDate,
    sessions,
    onSuccess
}: CancelDayModalProps) {
    const { user } = useAuth();
    const { toast } = useToast();

    // Default to tomorrow if currentDate is today or in the past
    const tomorrow = addDays(startOfDay(new Date()), 1);
    const initialDate = currentDate && isAfter(startOfDay(currentDate), startOfDay(new Date())) 
        ? currentDate 
        : tomorrow;

    const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
    const [fetchedSessions, setFetchedSessions] = useState<any[] | null>(null);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [reason, setReason] = useState("On Leave");
    const [submitting, setSubmitting] = useState(false);
    const [cancellingSingleId, setCancellingSingleId] = useState<string | null>(null);

    // Synchronize selectedDate when modal opens
    useEffect(() => {
        if (open) {
            const todayStart = startOfDay(new Date());
            const targetDate = currentDate && isAfter(startOfDay(currentDate), todayStart)
                ? currentDate
                : addDays(todayStart, 1);

            setSelectedDate(targetDate);
            setReason("On Leave");
            fetchSessionsForDate(targetDate);
        } else {
            setFetchedSessions(null);
        }
    }, [open, currentDate]);

    const fetchSessionsForDate = async (date: Date) => {
        if (!user?.id) return;
        try {
            setLoadingSessions(true);
            const start = startOfDay(date).toISOString();
            const end = endOfDay(date).toISOString();
            const data = await apiFetch<any[]>(`/api/appointments?specialist_id=${user.id}&start=${start}&end=${end}`);
            setFetchedSessions(data || []);
        } catch (err) {
            console.error("Failed to fetch sessions for date:", err);
            setFetchedSessions(null);
        } finally {
            setLoadingSessions(false);
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            const [y, m, d] = e.target.value.split('-').map(Number);
            const newDate = new Date(y, m - 1, d);
            setSelectedDate(newDate);
            fetchSessionsForDate(newDate);
        }
    };

    // Strict Future Date check (must be strictly after today)
    const isFutureDate = isAfter(startOfDay(selectedDate), startOfDay(new Date()));
    const minDateString = format(tomorrow, "yyyy-MM-dd");

    // Filter active sessions for selectedDate
    const sourceSessions = fetchedSessions !== null ? fetchedSessions : (sessions || []);
    const dayActiveSessions = sourceSessions.filter((s: any) => {
        const isDayMatch = isSameDay(startOfDay(parseISO(s.scheduled_start)), startOfDay(selectedDate));
        const status = (s.status || '').toLowerCase();
        const isActive = !['cancelled', 'deleted', 'missed', 'completed'].includes(status);
        return isDayMatch && isActive;
    });

    const handleCancelSingleSession = async (sessionId: string) => {
        if (!isFutureDate) {
            toast({
                title: "Future Dates Only",
                description: "Leave cancellations can only be processed for future dates.",
                variant: "destructive"
            });
            return;
        }

        try {
            setCancellingSingleId(sessionId);
            await apiFetch('/api/appointments/bulk-cancel', {
                method: 'POST',
                data: {
                    ids: [sessionId],
                    reason: reason.trim() || 'On Leave'
                }
            });
            toast({ title: "Session Cancelled", description: "The session has been cancelled." });
            await fetchSessionsForDate(selectedDate);
            await onSuccess();
        } catch (err: any) {
            toast({ title: "Cancellation Failed", description: err.message, variant: "destructive" });
        } finally {
            setCancellingSingleId(null);
        }
    };

    const handleConfirmCancelDay = async () => {
        if (!isFutureDate) {
            toast({
                title: "Future Dates Only",
                description: "Leave cancellations can only be processed for future dates.",
                variant: "destructive"
            });
            return;
        }

        if (dayActiveSessions.length === 0) {
            toast({ title: "No Active Sessions", description: "There are no active sessions scheduled for this day to cancel." });
            onOpenChange(false);
            return;
        }

        try {
            setSubmitting(true);
            const ids = dayActiveSessions.map((s: any) => s.id);
            const response = await apiFetch<{ success: boolean; cancelled_count: number }>('/api/appointments/bulk-cancel', {
                method: 'POST',
                data: {
                    ids,
                    reason: reason.trim() || 'On Leave'
                }
            });

            toast({
                title: "Sessions Cancelled for Leave",
                description: `Successfully cancelled ${response.cancelled_count || ids.length} session(s) for ${format(selectedDate, "EEEE, MMM d, yyyy")}.`
            });

            await onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast({
                title: "Cancellation Failed",
                description: err.message || "Failed to cancel day sessions.",
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col rounded-3xl p-6 bg-card border-border shadow-xl overflow-hidden">
                <DialogHeader className="space-y-2 text-left shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <CalendarX className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-display font-bold">
                                Cancel Sessions
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground font-medium">
                                Select a future date to view and cancel scheduled appointments when you are taking leave.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-3 overflow-y-auto flex-1 pr-1 no-scrollbar">
                    {/* Interactive Future Date Picker Field */}
                    <div className="space-y-1.5 p-4 rounded-2xl bg-muted/40 border border-border/60">
                        <div className="flex items-center justify-between mb-1">
                            <Label htmlFor="leave-date-picker" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                                Select Future Leave Date
                            </Label>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                {loadingSessions ? "Loading..." : `${dayActiveSessions.length} Active Session${dayActiveSessions.length === 1 ? '' : 's'}`}
                            </span>
                        </div>
                        <Input
                            id="leave-date-picker"
                            type="date"
                            min={minDateString}
                            value={format(selectedDate, "yyyy-MM-dd")}
                            onChange={handleDateChange}
                            className="h-11 rounded-xl font-bold text-sm bg-background border-border"
                        />
                        <p className="text-[10px] text-muted-foreground font-medium italic mt-1">
                            Current Selection: <strong>{format(selectedDate, "EEEE, MMMM d, yyyy")}</strong>
                        </p>
                    </div>

                    {/* Warning if past or today is selected */}
                    {!isFutureDate && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div>
                                <span>Leave cancellations are <strong>only allowed for future dates</strong> (starting tomorrow, {format(tomorrow, "MMM d, yyyy")}).</span>
                                <p className="text-[10px] font-normal opacity-90 mt-0.5">Please pick a future date above to manage leave sessions.</p>
                            </div>
                        </div>
                    )}

                    {/* Session List Preview */}
                    {loadingSessions ? (
                        <div className="p-6 rounded-2xl border border-dashed text-center space-y-2 text-muted-foreground">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
                            <p className="text-xs font-medium">Checking sessions for {format(selectedDate, "MMM d")}...</p>
                        </div>
                    ) : dayActiveSessions.length > 0 ? (
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Scheduled Sessions To Be Cancelled
                            </Label>
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                                {dayActiveSessions.map((s: any) => {
                                    const startD = parseISO(s.scheduled_start);
                                    const name = s.session_mode === 'Group'
                                        ? `👥 ${s.group_name || 'Group'}`
                                        : s.session_mode === 'Other'
                                            ? `🏢 ${s.session_type?.name}`
                                            : formatClientName(s.client);

                                    const isCancellingThis = cancellingSingleId === s.id;

                                    return (
                                        <div key={s.id} className="p-3 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 flex items-center justify-between text-xs transition-all hover:bg-rose-100/50">
                                            <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
                                                <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                <div className="truncate">
                                                    <span className="font-bold text-foreground truncate block">{name}</span>
                                                    <span className="text-[10px] text-muted-foreground">{s.session_type?.name || s.service_type || 'Appointment'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="font-semibold text-rose-600 dark:text-rose-400 text-xs">
                                                    {format(startD, "h:mm a")}
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleCancelSingleSession(s.id)}
                                                    disabled={!isFutureDate || cancellingSingleId !== null || submitting}
                                                    title={isFutureDate ? "Cancel this individual session" : "Only future sessions can be cancelled"}
                                                    className="h-7 w-7 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-200/50 dark:hover:bg-rose-900/40 disabled:opacity-40"
                                                >
                                                    {isCancellingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl bg-muted/20 border border-dashed text-center text-xs text-muted-foreground font-medium">
                            No active sessions scheduled on {format(selectedDate, "MMM d, yyyy")}.
                        </div>
                    )}

                    {/* Cancellation / Leave Reason Input */}
                    <div className="space-y-1.5">
                        <Label htmlFor="leave-reason" className="text-xs font-bold">
                            Reason for Cancellation / Leave
                        </Label>
                        <Input
                            id="leave-reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. On Leave, Sick Leave, Emergency..."
                            className="rounded-xl h-10 text-xs"
                            disabled={!isFutureDate}
                        />
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] flex items-start gap-2">
                        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <span>
                            Cancelling sessions will update their status to <strong>Cancelled</strong> with the specified leave reason.
                        </span>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/50 shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={submitting}
                        className="rounded-xl text-xs h-10 font-bold"
                    >
                        Close
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleConfirmCancelDay}
                        disabled={!isFutureDate || submitting || dayActiveSessions.length === 0 || loadingSessions}
                        className="rounded-xl text-xs h-10 font-bold bg-rose-600 hover:bg-rose-700 text-white gap-2 disabled:opacity-50"
                    >
                        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Cancel All {dayActiveSessions.length} Session{dayActiveSessions.length === 1 ? '' : 's'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
