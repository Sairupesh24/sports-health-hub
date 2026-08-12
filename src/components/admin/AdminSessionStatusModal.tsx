import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, CheckCircle, ClipboardList, RefreshCw, Clock, Check, UserCheck } from "lucide-react";
import { format, startOfDay, differenceInCalendarDays, addDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { filterServicesByRole, Service, formatStaffName } from "@/utils/serviceMapping";
import { cn } from "@/lib/utils";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: any;
    onSuccess: () => void;
}

export function AdminSessionStatusModal({ open, onOpenChange, session, onSuccess }: Props) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [reconciling, setReconciling] = useState(false);
    const [status, setStatus] = useState<string>("Planned");
    const [cancellationReason, setCancellationReason] = useState("");
    const [actualStart, setActualStart] = useState("");
    const [actualEnd, setActualEnd] = useState("");
    const [soapNote, setSoapNote] = useState<any>(null);
    const [soapLoading, setSoapLoading] = useState(false);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [remainingSessions, setRemainingSessions] = useState<number | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [serviceId, setServiceId] = useState<string>("");
    const [rescheduledDate, setRescheduledDate] = useState("");
    const [rescheduledTime, setRescheduledTime] = useState("");
    const [attendees, setAttendees] = useState<any[]>([]);
    const [attendeesLoading, setAttendeesLoading] = useState(false);

    // Reassignment states
    const [staffList, setStaffList] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [reassignConsultantId, setReassignConsultantId] = useState("");
    const [reassignDate, setReassignDate] = useState("");
    const [targetBookedSessions, setTargetBookedSessions] = useState<any[]>([]);
    const [loadingTargetBookings, setLoadingTargetBookings] = useState(false);
    const [reassignSelectedSlot, setReassignSelectedSlot] = useState<{ startTime: string; endTime: string; label: string } | null>(null);

    useEffect(() => {
        if (open && session) {
            setReassignDate(format(new Date(session.scheduled_start), "yyyy-MM-dd"));
            setReassignConsultantId("");
            setReassignSelectedSlot(null);
            fetchStaffList();
        }
    }, [open, session]);

    const fetchStaffList = async () => {
        try {
            setLoadingStaff(true);
            const data = await apiFetch<any[]>("/hr/employees?role_type=clinical").catch(() => []);
            if (data && Array.isArray(data)) {
                setStaffList(data);
            }
        } catch (err) {
            console.warn("Failed to fetch staff list:", err);
        } finally {
            setLoadingStaff(false);
        }
    };

    useEffect(() => {
        if (open && reassignConsultantId && reassignDate) {
            fetchTargetBookings(reassignConsultantId, reassignDate);
        }
    }, [open, reassignConsultantId, reassignDate]);

    const fetchTargetBookings = async (consultantId: string, dateStr: string) => {
        try {
            setLoadingTargetBookings(true);
            setReassignSelectedSlot(null);
            const start = `${dateStr}T00:00:00.000Z`;
            const end = `${dateStr}T23:59:59.999Z`;
            const res = await apiFetch<any[]>(`/api/appointments?specialist_id=${consultantId}&start=${start}&end=${end}`).catch(() => []);
            if (res && Array.isArray(res)) {
                setTargetBookedSessions(res.filter(s => s.status !== "Cancelled"));
            } else {
                setTargetBookedSessions([]);
            }
        } catch (err) {
            console.warn("Failed to fetch target bookings:", err);
        } finally {
            setLoadingTargetBookings(false);
        }
    };

    // Calculate available time slots for target consultant on reassignDate
    const reassignAvailableSlots = useMemo(() => {
        if (!reassignConsultantId || !reassignDate) return [];

        let startMinutes = 9 * 60;  // 09:00 AM
        let endMinutes = 18 * 60;   // 06:00 PM
        const slotDur = 60; // 60 mins

        const slots: { startTime: string; endTime: string; label: string }[] = [];
        let current = startMinutes;

        while (current + slotDur <= endMinutes) {
            const startH = Math.floor(current / 60);
            const startM = current % 60;
            const endTotal = current + slotDur;
            const endH = Math.floor(endTotal / 60);
            const endM = endTotal % 60;

            const formatTwoDigits = (num: number) => (num < 10 ? `0${num}` : `${num}`);
            const startFormatted = `${formatTwoDigits(startH)}:${formatTwoDigits(startM)}`;
            const endFormatted = `${formatTwoDigits(endH)}:${formatTwoDigits(endM)}`;

            const formatAmPm = (hh: number, mm: number) => {
                const ampm = hh >= 12 ? "PM" : "AM";
                const displayH = hh % 12 === 0 ? 12 : hh % 12;
                return `${displayH}:${formatTwoDigits(mm)} ${ampm}`;
            };

            const label = `${formatAmPm(startH, startM)} - ${formatAmPm(endH, endM)}`;

            const isBooked = targetBookedSessions.some((b) => {
                if (!b.scheduled_start) return false;
                const bStart = new Date(b.scheduled_start);
                const bEnd = b.scheduled_end ? new Date(b.scheduled_end) : new Date(bStart.getTime() + slotDur * 60000);
                const slotStartObj = new Date(`${reassignDate}T${startFormatted}:00`);
                const slotEndObj = new Date(`${reassignDate}T${endFormatted}:00`);
                return slotStartObj < bEnd && slotEndObj > bStart;
            });

            if (!isBooked) {
                slots.push({ startTime: startFormatted, endTime: endFormatted, label });
            }

            current += slotDur;
        }

        return slots;
    }, [reassignConsultantId, reassignDate, targetBookedSessions]);

    useEffect(() => {
        if (session) {
            setStatus(session.status || "Planned");
            setCancellationReason(session.cancellation_reason || "");
            setServiceId(session.service_id || "");
            fetchServices();
            if (session.actual_start) {
                setActualStart(format(new Date(session.actual_start), "HH:mm"));
            } else if (session.scheduled_start) {
                setActualStart(format(new Date(session.scheduled_start), "HH:mm"));
            }
            if (session.actual_end) {
                setActualEnd(format(new Date(session.actual_end), "HH:mm"));
            } else if (session.scheduled_end) {
                setActualEnd(format(new Date(session.scheduled_end), "HH:mm"));
            }

            // Initialize rescheduling defaults
            setRescheduledDate(format(new Date(session.scheduled_start), "yyyy-MM-dd"));
            setRescheduledTime(format(new Date(session.scheduled_start), "HH:mm"));
        }
    }, [session]);

    const fetchServices = async () => {
        if (!session?.organization_id) return;
        try {
            const data = await apiFetch<any[]>('/billing/services', {
                params: { is_active: true }
            });
            if (data) setServices(data as Service[]);
        } catch (error) {
            console.error("Error fetching services:", error);
        }
    };

    // Fetch SOAP notes when modal opens for a Completed session
    useEffect(() => {
        if (!open || !session?.id) { setSoapNote(null); return; }
        if (session.status !== "Completed") { setSoapNote(null); return; }
        setSoapLoading(true);
        apiFetch<any>(`/clinical/sessions/${session.id}/soap`)
            .then((data) => { setSoapNote(data ?? null); })
            .catch(() => setSoapNote(null))
            .finally(() => setSoapLoading(false));
    }, [open, session?.id, session?.status]);

    // Fetch attendees for Group sessions
    useEffect(() => {
        if (!open || !session?.id || session.session_mode !== "Group") {
            setAttendees([]);
            return;
        }
        setAttendeesLoading(true);
        apiFetch<any[]>(`/appointments/${session.id}/attendees`)
            .then((data) => { setAttendees(data || []); })
            .catch(() => setAttendees([]))
            .finally(() => setAttendeesLoading(false));
    }, [open, session?.id, session?.session_mode]);

    // Fetch entitlement balance for Planned sessions
    useEffect(() => {
        if (!open || !session?.id || session.status !== "Planned") {
            setRemainingSessions(null);
            return;
        }

        const fetchBalance = async () => {
            setBalanceLoading(true);
            try {
                const data = await apiFetch<any>(`/billing/entitlements/balance/${session.client_id}`);
                if (data && data.byServiceName) {
                    const serviceKey = (session.service_type || "").toLowerCase().trim();
                    setRemainingSessions(data.byServiceName[serviceKey] || 0);
                }
            } catch (error) {
                console.error("Error fetching balance:", error);
                setRemainingSessions(0);
            } finally {
                setBalanceLoading(false);
            }
        };

        fetchBalance();
    }, [open, session?.id, session?.status, session?.client_id, session?.service_type, serviceId]);

    // Derived guards
    const sessionDate = session ? new Date(session.scheduled_start) : null;
    const now = new Date();
    const todayStart = startOfDay(now);
    const sessionDay = sessionDate ? startOfDay(sessionDate) : todayStart;
    const daysFromToday = differenceInCalendarDays(sessionDay, todayStart);

    // Future session: scheduled for TOMORROW OR LATER (daysFromToday > 0)
    const isFutureSession = daysFromToday > 0;
    const isTodaySession = daysFromToday === 0;
    const isPastSession = daysFromToday < 0;

    const isLocked = (session?.status === "Completed" && session?.actual_end && (now.getTime() - new Date(session.actual_end).getTime()) > 24 * 60 * 60 * 1000) || 
                     session?.status === "Cancelled" || 
                     session?.status === "Rescheduled" ||
                     session?.status === "Reassigned";
    const isUnentitled = session?.is_unentitled === true;
    const isElapsed = session && 
                      (session.status === 'Planned' || session.status === 'Checked In') && 
                      now > new Date(session.scheduled_end);


    const handleSave = async () => {
        if (!session?.id) return;

        if (status === "Completed" && isFutureSession) {
            toast({ title: "Not Allowed", description: `This session is scheduled for ${format(new Date(session.scheduled_start), "MMM d, yyyy h:mm a")}. You cannot mark a future session as Completed.`, variant: "destructive" });
            return;
        }
        if (status === "Cancelled" && !cancellationReason.trim()) {
            toast({ title: "Reason Required", description: "Please enter the reason for cancelling this session.", variant: "destructive" });
            return;
        }
        if (isLocked) {
            toast({ title: "Session Locked", description: "This session cannot be edited more than 24 hours after completion or once cancelled/rescheduled/reassigned.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            if (status === "Completed") {
                if (!actualStart || !actualEnd) throw new Error("Actual start and end times are required for completed sessions.");
                const dateStr = format(new Date(session.scheduled_start), "yyyy-MM-dd");
                const aStart = new Date(`${dateStr}T${actualStart}:00`).toISOString();
                const aEnd = new Date(`${dateStr}T${actualEnd}:00`).toISOString();

                await apiFetch(`/appointments/${session.id}/complete`, {
                    method: 'POST',
                    data: { actual_start: aStart, actual_end: aEnd }
                });
            } else if (status === "Rescheduled") {
                if (!rescheduledDate || !rescheduledTime) throw new Error("Please select both a date and time for rescheduling.");
                const newStartTime = new Date(`${rescheduledDate}T${rescheduledTime}:00`);
                const durationMs = new Date(session.scheduled_end).getTime() - new Date(session.scheduled_start).getTime();
                const newEndTime = new Date(newStartTime.getTime() + durationMs);

                await apiFetch(`/appointments/${session.id}/reschedule`, {
                    method: 'POST',
                    data: { new_start: newStartTime.toISOString(), new_end: newEndTime.toISOString() }
                });
            } else if (status === "Reassigned") {
                if (!reassignConsultantId || !reassignSelectedSlot || !reassignDate) {
                    throw new Error("Please select a target staff member and choose an available time slot for reassignment.");
                }
                const newStartISO = new Date(`${reassignDate}T${reassignSelectedSlot.startTime}:00`).toISOString();
                const newEndISO = new Date(`${reassignDate}T${reassignSelectedSlot.endTime}:00`).toISOString();

                await apiFetch(`/appointments/${session.id}/reassign`, {
                    method: 'POST',
                    data: {
                        target_consultant_id: reassignConsultantId,
                        new_start: newStartISO,
                        new_end: newEndISO
                    }
                });
            } else {
                const selectedService = services.find(s => s.id === serviceId);
                await apiFetch(`/appointments/${session.id}`, {
                    method: 'PATCH',
                    data: { 
                        status, 
                        cancellation_reason: status === "Cancelled" ? cancellationReason.trim() : null,
                        service_id: serviceId || null,
                        service_type: selectedService?.name || session.service_type
                    }
                });
            }

            toast({ title: "Success", description: "Session status updated successfully." });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleReconcile = async () => {
        if (!session?.id) return;
        setReconciling(true);
        try {
            await apiFetch(`/appointments/${session.id}/reconcile`, { method: 'POST' });
            toast({ title: "✅ Reconciled", description: "Session entitlement has been deducted and the un-entitled flag cleared." });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({ title: "Reconciliation Failed", description: error.message, variant: "destructive" });
        } finally {
            setReconciling(false);
        }
    };

    if (!session) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby={undefined} className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Update Session Status
                        {isUnentitled && (
                            <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-300 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> UN-ENTITLED
                            </span>
                        )}
                        {isElapsed && (
                            <span className="ml-2 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-bold border border-amber-300 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-600" /> ELAPSED
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4 animate-in fade-in-50">

                    {/* Future session warning */}
                    {isFutureSession && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
                            <span className="text-base">⚠️</span>
                            <span>This session is scheduled for <strong>{format(new Date(session.scheduled_start), "MMM d, yyyy h:mm a")}</strong>. You cannot mark it as Completed before it occurs.</span>
                        </div>
                    )}

                    {/* Elapsed session warning */}
                    {isElapsed && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50/50 p-3 text-sm text-amber-800 animate-in fade-in slide-in-from-top-2 duration-300">
                            <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            <span>This session's scheduled time has passed. Please update the status to <strong>Completed</strong> or <strong>Cancelled</strong>.</span>
                        </div>
                    )}

                    {/* 24h lock warning */}
                    {isLocked && (
                        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                            <span className="text-base">🔒</span>
                            <span>
                                {session?.status === "Reassigned"
                                    ? "This session has been reassigned to another consultant and cannot be edited."
                                    : session?.status === "Cancelled"
                                    ? "This session has been cancelled and cannot be edited."
                                    : session?.status === "Rescheduled"
                                    ? "This session has been rescheduled and cannot be edited."
                                    : isUnentitled
                                        ? "This session is locked and cannot be edited. However, reconciliation for payment is still permitted."
                                        : "This session is locked. It cannot be edited more than 24 hours after completion."}
                            </span>
                        </div>
                    )}

                    {/* Planned session entitlement warning */}
                    {status === "Planned" && !balanceLoading && remainingSessions === 0 && (
                        <div className="flex items-start gap-2 rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800">
                            <span className="text-base text-orange-500 font-bold">⚠</span>
                            <span>
                                <strong>No Entitlements Remaining:</strong> This client has no sessions left for {session.service_type || "this service"}. 
                                Completing this session will mark it as <strong>Un-entitled</strong> unless a new package is purchased.
                            </span>
                        </div>
                    )}

                    {/* UN-ENTITLED Banner with Reconcile */}
                    {isUnentitled && (
                        <div className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-red-700">
                                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-sm">Un-entitled Session</p>
                                    <p className="text-xs text-red-600 mt-0.5">This session was completed without consuming an entitlement. The client had no active package at the time.</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full border-red-400 text-red-700 hover:bg-red-100 text-xs font-semibold"
                                onClick={handleReconcile}
                                disabled={reconciling}
                            >
                                {reconciling
                                    ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Reconciling...</>
                                    : <><RefreshCw className="w-3 h-3 mr-1" /> Reconcile — Client Has Paid</>
                                }
                            </Button>
                        </div>
                    )}

                    {/* Session Info */}
                    <div className="bg-muted/50 p-3 rounded-md text-sm space-y-1">
                        {session.session_mode === 'Group' ? (
                            <p><strong>Group:</strong> {session.group_name || 'Unnamed Group'}</p>
                        ) : (
                            <p><strong>Client:</strong> {session.client?.first_name} {session.client?.last_name}</p>
                        )}
                        <p><strong>Consultant:</strong> {formatStaffName(session.therapist || session.scientist || session.staff, { useFirstName: true })}</p>
                        <p className="flex items-center gap-1.5 flex-wrap">
                            <strong>Scheduled:</strong> {format(new Date(session.scheduled_start), "MMM d, yyyy h:mm a")}
                            {isElapsed && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold inline-flex items-center gap-0.5 uppercase tracking-wider">
                                    Elapsed
                                </span>
                            )}
                        </p>
                        {session?.actual_start && (
                            <p className="text-emerald-700 text-xs font-bold">
                                <strong>Recorded Start:</strong> {format(new Date(session.actual_start), "h:mm a")}
                            </p>
                        )}
                        {session?.actual_end && (
                            <p className="text-emerald-700 text-xs font-bold">
                                <strong>Recorded End:</strong> {format(new Date(session.actual_end), "h:mm a")}
                            </p>
                        )}
                        {session?.cancellation_reason && (
                            <p className="text-rose-700 dark:text-rose-300 text-xs font-semibold pt-1 border-t border-border/50">
                                <strong>Cancellation Reason:</strong> {session.cancellation_reason}
                            </p>
                        )}
                        <div className="flex items-center gap-2">
                             <strong>Service:</strong>
                             <Select 
                                value={serviceId} 
                                onValueChange={setServiceId} 
                                disabled={isLocked || (session.status === "Completed" && !isUnentitled)}
                             >
                                 <SelectTrigger className="h-7 text-xs bg-transparent border-none p-0 focus:ring-0">
                                     <SelectValue placeholder="Select Service" />
                                 </SelectTrigger>
                                 <SelectContent>
                                     {services.map(s => (
                                         <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                     ))}
                                 </SelectContent>
                             </Select>
                        </div>
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
                                            <span className="font-medium text-slate-800">{attendee.first_name} {attendee.last_name}</span>
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

                    {/* SOAP Notes (shown only for Completed sessions) */}
                    {session.status === "Completed" && !session.scientist_id && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <ClipboardList className="w-4 h-4 text-primary" />
                                    SOAP Notes
                                </div>
                                {soapLoading ? (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Loading SOAP notes...
                                    </div>
                                ) : soapNote ? (
                                    <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-xs border border-border/50">
                                        {soapNote.pain_score !== null && soapNote.pain_score !== undefined && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground font-medium">Pain Score:</span>
                                                <span className="font-semibold">{soapNote.pain_score} / 10</span>
                                            </div>
                                        )}
                                        {soapNote.treatment_type && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground font-medium">Treatment:</span>
                                                <span className="text-right max-w-[60%]">{soapNote.treatment_type}</span>
                                            </div>
                                        )}
                                        {soapNote.modality_used && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground font-medium">Modalities:</span>
                                                <span className="text-right max-w-[60%]">{soapNote.modality_used}</span>
                                            </div>
                                        )}
                                        {soapNote.manual_therapy && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground font-medium">Manual Therapy:</span>
                                                <span className="text-right max-w-[60%]">{soapNote.manual_therapy}</span>
                                            </div>
                                        )}
                                        {soapNote.range_of_motion && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground font-medium">Range of Motion:</span>
                                                <span className="text-right max-w-[60%]">{soapNote.range_of_motion}</span>
                                            </div>
                                        )}
                                        {soapNote.clinical_notes && (
                                            <div className="pt-1 border-t border-border/50">
                                                <span className="text-muted-foreground font-medium block mb-1">Clinical Notes:</span>
                                                <p className="text-foreground whitespace-pre-wrap">{soapNote.clinical_notes}</p>
                                            </div>
                                        )}
                                        {soapNote.next_plan && (
                                            <div className="pt-1 border-t border-border/50">
                                                <span className="text-muted-foreground font-medium block mb-1">Next Plan:</span>
                                                <p className="text-foreground whitespace-pre-wrap">{soapNote.next_plan}</p>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1 pt-1 text-emerald-600">
                                            <CheckCircle className="w-3 h-3" />
                                            <span>SOAP note recorded</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                        <AlertTriangle className="w-3 h-3" />
                                        No SOAP notes have been added for this session yet.
                                    </div>
                                )}
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Status Selector */}
                    {!isLocked && (
                        <>
                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Planned">Planned</SelectItem>
                                        <SelectItem value="Checked In">Checked In</SelectItem>
                                        <SelectItem value="Completed" disabled={isFutureSession}>Completed</SelectItem>
                                        <SelectItem value="Rescheduled" disabled={!isFutureSession || session.status !== "Planned"}>
                                            {isFutureSession ? "Rescheduled" : "Rescheduled (Future Sessions Only)"}
                                        </SelectItem>
                                        <SelectItem value="Reassigned" disabled={!["Planned", "Checked In"].includes(session.status)}>Reassigned</SelectItem>
                                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                                {isTodaySession && (
                                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 mt-1">
                                        ⚠️ Rescheduling is only available for future sessions (tomorrow onwards). Today's sessions cannot be rescheduled.
                                    </p>
                                )}
                            </div>

                            {status === "Cancelled" && (
                                <div className="grid gap-2 animate-in slide-in-from-top-2 p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800">
                                    <Label className="font-semibold text-rose-800 dark:text-rose-300 flex items-center justify-between text-xs">
                                        <span>Reason for Cancellation *</span>
                                        <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Required</span>
                                    </Label>
                                    <Textarea
                                        placeholder="Please enter the reason why this session is being cancelled..."
                                        value={cancellationReason}
                                        onChange={(e) => setCancellationReason(e.target.value)}
                                        className="min-h-[80px] text-xs bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-700"
                                    />
                                </div>
                            )}

                            {status === "Rescheduled" && (
                                <div className="grid gap-3 animate-in slide-in-from-top-2 pt-3 border-t mt-2">
                                    <Label className="text-amber-700 font-semibold flex items-center gap-2">
                                        🗓️ Reschedule Details
                                    </Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-1.5">
                                            <Label className="text-xs text-muted-foreground font-medium">New Date</Label>
                                            <Input 
                                                type="date" 
                                                value={rescheduledDate} 
                                                onChange={e => setRescheduledDate(e.target.value)}
                                                className="h-9"
                                            />
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label className="text-xs text-muted-foreground font-medium">New Time</Label>
                                            <Input 
                                                type="time" 
                                                value={rescheduledTime} 
                                                onChange={e => setRescheduledTime(e.target.value)}
                                                className="h-9"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">
                                        Note: This will mark the current slot as 'Rescheduled' and create a new 'Planned' session.
                                    </p>
                                </div>
                            )}

                            {status === "Reassigned" && (
                                <div className="grid gap-3 animate-in slide-in-from-top-2 pt-3 border-t mt-2 p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
                                    <Label className="text-purple-900 dark:text-purple-300 font-semibold flex items-center gap-2 text-xs">
                                        <UserCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                        Reassign Appointment Details
                                    </Label>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground font-medium">Reassign To Staff Member *</Label>
                                            <Select value={reassignConsultantId} onValueChange={setReassignConsultantId}>
                                                <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
                                                    <SelectValue placeholder={loadingStaff ? "Loading staff..." : "Select consultant"} />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60">
                                                    {staffList.map((s) => (
                                                        <SelectItem key={s.id} value={s.id}>
                                                            {formatStaffName(s, { showProfession: true, useFirstName: true })}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs text-muted-foreground font-medium">Date *</Label>
                                            <Input
                                                type="date"
                                                value={reassignDate}
                                                onChange={(e) => setReassignDate(e.target.value)}
                                                className="h-9 text-xs bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                    </div>

                                    {reassignConsultantId && (
                                        <div className="space-y-2 pt-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <Label className="font-semibold text-purple-900 dark:text-purple-200 text-xs">
                                                    Available Time Slots on {reassignDate ? format(new Date(`${reassignDate}T00:00:00`), "MMM d, yyyy") : ""}
                                                </Label>
                                                {loadingTargetBookings && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />}
                                            </div>

                                            {reassignAvailableSlots.length > 0 ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                                                    {reassignAvailableSlots.map((slot) => {
                                                        const isSelected = reassignSelectedSlot?.startTime === slot.startTime;
                                                        return (
                                                            <button
                                                                key={slot.startTime}
                                                                type="button"
                                                                onClick={() => setReassignSelectedSlot(slot)}
                                                                className={cn(
                                                                    "px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-left flex items-center justify-between",
                                                                    isSelected
                                                                        ? "bg-purple-600 text-white border-purple-600 shadow-sm ring-2 ring-purple-600/30"
                                                                        : "bg-white dark:bg-slate-900 hover:bg-purple-100/50 border-purple-200 text-foreground"
                                                                )}
                                                            >
                                                                <span>{slot.label}</span>
                                                                {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 rounded-lg">
                                                    No open time slots available for this staff member on this date.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {reassignSelectedSlot && (
                                        <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700 rounded-lg text-xs text-purple-900 dark:text-purple-200 font-medium flex items-center justify-between">
                                            <span>Selected New Slot: <strong className="font-mono">{reassignSelectedSlot.label}</strong></span>
                                            <span className="text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">60 Mins</span>
                                        </div>
                                    )}

                                    <p className="text-[10px] text-muted-foreground italic">
                                        Note: Reassigning will mark the current appointment as 'Reassigned' and schedule a new 'Planned' session for the selected staff member.
                                    </p>
                                </div>
                            )}

                            <Button onClick={handleSave} disabled={loading} className="w-full mt-2">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {status === "Rescheduled" ? "Reschedule Session" : status === "Reassigned" ? "Confirm Reassignment" : "Save Status"}
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
