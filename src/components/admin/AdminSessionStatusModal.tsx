import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, CheckCircle, ClipboardList, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { filterServicesByRole, Service } from "@/utils/serviceMapping";

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

    useEffect(() => {
        if (session) {
            setStatus(session.status || "Planned");
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
    const isFutureSession = sessionDate ? sessionDate > now : false;
    const isLocked = (session?.status === "Completed" && session?.actual_end && (now.getTime() - new Date(session.actual_end).getTime()) > 24 * 60 * 60 * 1000) || 
                     session?.status === "Cancelled" || 
                     session?.status === "Rescheduled";
    const isUnentitled = session?.is_unentitled === true;

    const handleSave = async () => {
        if (!session?.id) return;

        if (status === "Completed" && isFutureSession) {
            toast({ title: "Not Allowed", description: `This session is scheduled for ${format(new Date(session.scheduled_start), "MMM d, yyyy h:mm a")}. You cannot mark a future session as Completed.`, variant: "destructive" });
            return;
        }
        if (isLocked) {
            toast({ title: "Session Locked", description: "This session cannot be edited more than 24 hours after completion.", variant: "destructive" });
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
            } else {
                const selectedService = services.find(s => s.id === serviceId);
                await apiFetch(`/appointments/${session.id}`, {
                    method: 'PATCH',
                    data: { 
                        status, 
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

                    {/* 24h lock warning */}
                    {isLocked && (
                        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                            <span className="text-base">🔒</span>
                            <span>
                                {session?.status === "Cancelled" || session?.status === "Rescheduled" 
                                    ? `This session is ${session.status.toLowerCase()} and cannot be edited.` 
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
                        <p><strong>Client:</strong> {session.client?.first_name} {session.client?.last_name}</p>
                        <p><strong>Consultant:</strong> Dr. {session.therapist?.last_name}</p>
                        <p><strong>Scheduled:</strong> {format(new Date(session.scheduled_start), "MMM d, yyyy h:mm a")}</p>
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

                    {/* SOAP Notes (shown only for Completed sessions) */}
                    {session.status === "Completed" && (
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
                                        <SelectItem value="Rescheduled" disabled={session.status !== "Planned"}>Rescheduled</SelectItem>
                                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

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

                            <Button onClick={handleSave} disabled={loading} className="w-full mt-2">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {status === "Rescheduled" ? "Reschedule Session" : "Save Status"}
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
