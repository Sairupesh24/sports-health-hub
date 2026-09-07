import { useState, useEffect, useMemo } from "react";
import PerformanceSnapshot from "./PerformanceSnapshot";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/utils/api";
import { Copy, Save, AlertTriangle, RefreshCw, Loader2, Lock } from "lucide-react";
import { format } from "date-fns";
import { filterServicesByRole, Service } from "@/utils/serviceMapping";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { formatClientName } from "@/lib/utils";
import LogInjuryModal from "./LogInjuryModal";
import PainMap from "./PainMap";

interface SOAPNoteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: any;
    clientId: string;
    onSuccess: () => void;
}

const MODALITIES = ["IFT", "UST", "TENS", "STIMULATION", "CRYOTHERAPY", "HC", "NONE"];

export default function SOAPNoteModal({ open, onOpenChange, session, clientId, onSuccess }: SOAPNoteModalProps) {
    const { profile, roles } = useAuth();
    const isAdminOrFoe = roles?.some(r => ["admin", "super_admin", "clinic_admin", "foe"].includes(r));
    const [loading, setLoading] = useState(false);
    const [fetchingPrevious, setFetchingPrevious] = useState(false);
    const [reconciling, setReconciling] = useState(false);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [remainingSessions, setRemainingSessions] = useState<number | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [serviceId, setServiceId] = useState<string>("");
    const [servicesLoading, setServicesLoading] = useState(false);
    const [client, setClient] = useState<any>(null);

    // Note State
    const [painScore, setPainScore] = useState<number>(0);
    const [sorenessData, setSorenessData] = useState<Record<string, any>>({});
    const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
    const [treatmentType, setTreatmentType] = useState("");
    const [manualTherapy, setManualTherapy] = useState("");
    const [exerciseGiven, setExerciseGiven] = useState("");
    const [rangeOfMotion, setRangeOfMotion] = useState("");
    const [strengthProgress, setStrengthProgress] = useState("");
        const [clinicalNotes, setClinicalNotes] = useState("");
    const [nextPlan, setNextPlan] = useState("");
    const [clientInjuries, setClientInjuries] = useState<any[]>([]);
    const [selectedInjuryId, setSelectedInjuryId] = useState<string>("");

    const isCompleted = (session?.physio_session_details && (
        Array.isArray(session.physio_session_details)
            ? session.physio_session_details.length > 0
            : Object.keys(session.physio_session_details).length > 0
    )) || session?.status === 'Completed';

    const isSameDay = (d1: Date, d2: Date) =>
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();

    const sessionDate = session?.scheduled_start 
        ? new Date(session.scheduled_start) 
        : (session?.created_at ? new Date(session.created_at) : new Date());
    const today = new Date();

    // Past calendar date: strictly before today's calendar date
    const isPastDate = sessionDate < today && !isSameDay(sessionDate, today);

    // Locking rule:
    // Once saved, and opened on the same date, they have to be editable.
    // Once the date changes, they should be locked.
    const isLocked = isCompleted && isPastDate;
    const isSameDayEditable = isCompleted && !isPastDate;

    const isUnentitled = session?.is_unentitled === true;
    const isFutureSession = session?.scheduled_start ? new Date(session.scheduled_start) > new Date() : false;
    const isCancelled = session?.status === 'Cancelled';
    const canEnterNotes = !isFutureSession && !isCancelled;

    useEffect(() => {
        if (open && session) {
            setServiceId(session.service_id || "");
            fetchServices();

            const applyDetails = (data: any) => {
                if (!data) return;
                setPainScore(data?.pain_score || 0);
                setSelectedModalities(data?.modality_used ? data.modality_used.split(',').map((s: string) => s.trim()) : []);
                setTreatmentType(data?.treatment_type || "");
                setManualTherapy(data?.manual_therapy || "");
                setExerciseGiven(data?.exercise_given || "");
                setRangeOfMotion(data?.range_of_motion || "");
                setStrengthProgress(data?.strength_progress || "");
                setClinicalNotes(data?.clinical_notes || "");
                setNextPlan(data?.next_plan || "");
                setSelectedInjuryId(data?.injury_id || "");
                let sd = data?.soreness_data || {};
                if (typeof sd === 'string') {
                    try {
                        sd = JSON.parse(sd);
                    } catch (e) {
                        console.error("Failed to parse soreness_data", e);
                    }
                }
                setSorenessData(sd || {});
            };

            const rawDetails = session.physio_session_details;
            const existingDetails = rawDetails
                ? (Array.isArray(rawDetails) ? rawDetails[0] : rawDetails)
                : null;

            if (existingDetails && Object.keys(existingDetails).length > 0) {
                applyDetails(existingDetails);
            }

            if (session.id) {
                apiFetch<any>(`/clinical/sessions/${session.id}/soap`)
                    .then((fetchedData) => {
                        if (fetchedData) {
                            applyDetails(fetchedData);
                        }
                    })
                    .catch(() => {
                        if (!existingDetails) {
                            setPainScore(0);
                            setSelectedModalities([]);
                            setTreatmentType("");
                            setManualTherapy("");
                            setExerciseGiven("");
                            setRangeOfMotion("");
                            setStrengthProgress("");
                            setClinicalNotes("");
                            setNextPlan("");
                            setSelectedInjuryId("");
                            setSorenessData({});
                        }
                    });
            } else if (!existingDetails) {
                setPainScore(0);
                setSelectedModalities([]);
                setTreatmentType("");
                setManualTherapy("");
                setExerciseGiven("");
                setRangeOfMotion("");
                setStrengthProgress("");
                setClinicalNotes("");
                setNextPlan("");
                setSelectedInjuryId("");
                setSorenessData({});
            }
        }
    }, [open, session]);

    const fetchInjuries = async () => {
        if (!clientId) return;
        try {
            const data = await apiFetch<any[]>('/clinical/injuries', {
                params: { client_id: clientId }
            });
            setClientInjuries(data);
        } catch (err) {
            console.error("Error fetching injuries:", err);
        }
    };

    const fetchClientDetails = async () => {
        if (!clientId) return;
        try {
            const data = await apiFetch<any>(`/clients/${clientId}`);
            setClient(data);
        } catch (err) {
            console.error("Error fetching client details in SOAPNoteModal:", err);
        }
    };

    const fetchServices = async () => {
        const orgId = session?.organization_id || profile?.organization_id;
        if (!orgId) return;
        
        setServicesLoading(true);
        try {
            const data = await apiFetch<Service[]>('/appointments/session-types');
            setServices(data);
        } catch (err) {
            console.error("Error fetching services:", err);
        } finally {
            setServicesLoading(false);
        }
    };

    const fetchClientBalance = async () => {
        if (!clientId || !serviceId) {
            setRemainingSessions(null);
            return;
        }

        setBalanceLoading(true);
        try {
            const data = await apiFetch<any>(`/billing/clients/${clientId}/entitlements`);
            const matchedEntitlement = data.find((e: any) => e.service_id === serviceId && e.status === 'active');
            if (matchedEntitlement) {
                setRemainingSessions(Math.max(0, matchedEntitlement.granted_sessions - matchedEntitlement.sessions_used));
            } else {
                setRemainingSessions(0);
            }
        } catch (error) {
            console.error("Error fetching client balance:", error);
            setRemainingSessions(null);
        } finally {
            setBalanceLoading(false);
        }
    };

    const filteredServices = useMemo(() => {
        // Use profession if available from profile (consultant view), or role fallback
        return filterServicesByRole(services, profile?.profession, roles[0]);
    }, [services, profile?.profession, roles]);

    useEffect(() => {
        if (!open || !session?.id || session.status !== "Planned") {
            setRemainingSessions(null);
            return;
        }

        const fetchBalance = async () => {
            setBalanceLoading(true);
            try {
                const data = await apiFetch<any>(`/billing/entitlements/balance/${clientId}`);
                if (data && data.balances) {
                    const currentService = services.find(s => s.id === serviceId);
                    const targetServiceName = (currentService?.name || session.service_type || "").toLowerCase().trim();
                    const balance = data.balances.find((b: any) => 
                        b.service_name?.toLowerCase().trim() === targetServiceName
                    );
                    setRemainingSessions(balance ? balance.sessions_remaining : 0);
                }
            } catch (error) {
                console.error("Error fetching balance:", error);
                setRemainingSessions(0);
            } finally {
                setBalanceLoading(false);
            }
        };
        fetchBalance();
    }, [open, session?.id, session?.status, clientId, session?.service_type, serviceId, services]);

    useEffect(() => {
        if (open && clientId) {
            fetchInjuries();
            fetchClientDetails();
        } else if (!open) {
            setClient(null);
        }
    }, [open, clientId]);

    const handleModalityToggle = (modality: string) => {
        setSelectedModalities(prev => {
            if (modality === "NONE") return ["NONE"];
            const withoutNone = prev.filter(m => m !== "NONE");
            return withoutNone.includes(modality) ? withoutNone.filter(m => m !== modality) : [...withoutNone, modality];
        });
    };

    const handleCopyPrevious = async () => {
        try {
            setFetchingPrevious(true);
            const prev = await apiFetch<any>('/clinical/sessions/previous', {
                params: { client_id: clientId, before: session.scheduled_start }
            });

            if (prev) {
                setPainScore(prev.pain_score || 0);
                setSelectedModalities(prev.modality_used ? prev.modality_used.split(',').map((s: string) => s.trim()) : []);
                setTreatmentType(prev.treatment_type || "");
                setManualTherapy(prev.manual_therapy || "");
                setExerciseGiven(prev.exercise_given || "");
                setRangeOfMotion(prev.range_of_motion || "");
                setStrengthProgress(prev.strength_progress || "");
                setClinicalNotes(prev.clinical_notes || "");
                setNextPlan(prev.next_plan || "");
                setSelectedInjuryId(prev.injury_id || "");
            let sd = prev.soreness_data || {};
            if (typeof sd === 'string') {
                try { sd = JSON.parse(sd); } catch(e) {}
            }
            setSorenessData(sd || {});
            toast({ title: "Copied", description: "Copied data from previous session." });
        } else {
            toast({ title: "No Previous Note", description: "No previous SOAP notes found for this client.", variant: "default" });
        }
    } catch (error: any) {
        toast({ title: "No Previous Note", description: "No previous SOAP notes found.", variant: "destructive" });
    } finally {
        setFetchingPrevious(false);
    }
};

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.id || isLocked) return;

    try {
        setLoading(true);
        const selectedService = services.find(s => s.id === serviceId);
        
        const currentScores = {
            shoulderAndArm: Number(sorenessData?.scores?.shoulderAndArm) || 0,
            neck: Number(sorenessData?.scores?.neck) || 0,
            back: Number(sorenessData?.scores?.back) || 0,
            hipAndLeg: Number(sorenessData?.scores?.hipAndLeg) || 0,
        };

        const computedPainScore = Math.max(
            currentScores.shoulderAndArm,
            currentScores.neck,
            currentScores.back,
            currentScores.hipAndLeg,
            painScore || 0
        );

        const finalSorenessData = {
            ...(sorenessData || {}),
            scores: currentScores,
            maxPainScore: computedPainScore,
        };

        const payload = {
            pain_score: computedPainScore,
            modality_used: selectedModalities.join(', '),
            treatment_type: treatmentType,
            manual_therapy: manualTherapy,
            exercise_given: exerciseGiven,
            range_of_motion: rangeOfMotion,
            strength_progress: strengthProgress,
            clinical_notes: clinicalNotes,
            next_plan: nextPlan,
            soreness_data: finalSorenessData,
            injury_id: selectedInjuryId === "none" || selectedInjuryId === "" ? null : selectedInjuryId,
            service_id: serviceId || session.service_id || null,
            service_type: selectedService?.name || session.service_type || 'Physiotherapy'
        };

        await apiFetch(`/clinical/sessions/${session.id}/soap`, {
            method: 'POST',
            data: payload
        });

        toast({ 
            title: "Success", 
            description: isCompleted ? "SOAP note updated successfully." : "SOAP note saved and session completed successfully." 
        });
        onOpenChange(false);
        onSuccess();
    } catch (error: any) {
        toast({ title: "Save Failed", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
};

    const handleReconcile = async () => {
        if (!session?.id) return;
        setReconciling(true);
        try {
            await apiFetch(`/clinical/sessions/${session.id}/reconcile`, { method: 'POST' });
            toast({ title: "✅ Reconciled", description: "Entitlement deducted successfully." });
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast({ title: "Reconciliation Failed", description: error.message, variant: "destructive" });
        } finally {
            setReconciling(false);
        }
    };

    const getTherapistName = () => {
        if (session?.therapist) {
            const first = session.therapist.first_name || "";
            const last = session.therapist.last_name || "";
            const name = `${first} ${last}`.trim();
            if (name) return name;
        }
        if (profile) {
            const first = profile.first_name || "";
            const last = profile.last_name || "";
            const name = `${first} ${last}`.trim();
            if (name) return name;
        }
        return "TBD";
    };

    const rawTherapistName = getTherapistName();
    const therapistDisplayName = rawTherapistName.toLowerCase().startsWith("dr.") 
        ? rawTherapistName 
        : `Dr. ${rawTherapistName}`;

    if (!session) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby={undefined} className="sm:max-w-[90vw] lg:max-w-[1200px] max-h-[95vh] overflow-y-auto overflow-x-hidden">
                <DialogTitle className="sr-only">SOAP Note Details</DialogTitle>
                <DialogHeader className="border-b pb-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5 text-left flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xl font-bold font-display text-slate-900 dark:text-white leading-tight">
                                    SOAP Note — {session?.scheduled_start ? format(new Date(session.scheduled_start), "MMM d, yyyy") : "Consultation"}
                                </span>
                                {isCompleted ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black tracking-wider border border-emerald-200 uppercase">
                                        COMPLETED SESSION
                                    </span>
                                ) : (
                                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black tracking-wider border border-blue-200 uppercase">
                                        PLANNED SESSION
                                    </span>
                                )}
                                {isUnentitled && isAdminOrFoe && (
                                    <span className="px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-black tracking-wider border border-red-200 flex items-center gap-1 uppercase">
                                        <AlertTriangle className="w-3 h-3" /> UN-ENTITLED
                                    </span>
                                )}
                            </div>
                            <DialogDescription className="text-sm text-slate-500">
                                Client: <span className="font-semibold text-slate-800 dark:text-slate-200">{formatClientName(client || session.client || session, { fallback: "Unknown Client" })}</span>
                            </DialogDescription>
                        </div>
                        {!isLocked && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={handleCopyPrevious} 
                                disabled={fetchingPrevious} 
                                className="w-full md:w-auto self-start md:self-center bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm rounded-xl font-medium h-9 text-xs"
                            >
                                <Copy className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                Copy Previous Note
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-6">
                    {/* Main Entry Area */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Lock Policy Banner for Consultants */}
                        {!isAdminOrFoe && !isLocked && (
                            <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                                <div>
                                    <span className="font-semibold">Slot Fixed:</span> Appointment timing cannot be rescheduled directly. Contact an Admin to reschedule or cancel this slot.
                                </div>
                            </div>
                        )}

                        {/* Locked Past-Date Audit Banner */}
                        {isLocked && (
                            <div className="flex items-start gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/90 dark:bg-amber-950/40 dark:border-amber-700/60 p-4 text-xs text-amber-900 dark:text-amber-200 shadow-sm">
                                <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="font-bold text-sm text-amber-950 dark:text-amber-100">Locked Record — Past Date</p>
                                    <p className="leading-relaxed opacity-90">
                                        This session took place on <span className="font-semibold">{format(sessionDate, "dd MMMM yyyy")}</span>. Clinical records from past dates are locked from editing to maintain audit and regulatory integrity.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Same-Day Edit Notification Banner */}
                        {isSameDayEditable && (
                            <div className="flex items-start gap-3 rounded-2xl border border-blue-300/80 bg-blue-50/90 dark:bg-blue-950/40 dark:border-blue-700/60 p-4 text-xs text-blue-900 dark:text-blue-200 shadow-sm">
                                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0 mt-1" />
                                <div className="space-y-0.5">
                                    <p className="font-bold text-sm text-blue-950 dark:text-blue-100">Same-Day Edit Mode</p>
                                    <p className="leading-relaxed opacity-90">
                                        This session was completed today. All clinical findings, exercises, sensation maps, and notes remain editable until midnight.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Status Banners */}
                        {session.status === "Planned" && !balanceLoading && remainingSessions === 0 && isAdminOrFoe && (
                            <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800 shadow-sm">
                                <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                                <div>
                                    <p className="font-bold">No Entitlements Remaining</p>
                                    <p className="text-xs opacity-90 text-orange-700">This session will be marked as Un-entitled upon completion.</p>
                                </div>
                            </div>
                        )}

                        {isFutureSession && (
                            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                                <div>
                                    <p className="font-bold">Early Entry Guard</p>
                                    <p className="text-xs opacity-90">Notes cannot be finalized before the scheduled session time.</p>
                                </div>
                            </div>
                        )}

                        {isUnentitled && isAdminOrFoe && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                                    <p className="font-bold text-red-800">Un-entitled Session Detected</p>
                                </div>
                                <Button size="sm" variant="outline" className="w-full bg-white border-red-300 text-red-700 hover:bg-red-50" onClick={handleReconcile} disabled={reconciling}>
                                    {reconciling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />} 
                                    Reconcile with New Package
                                </Button>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6 pb-6">
                            {/* 1. Session Configuration Section */}
                            <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-primary rounded-full" />
                                        <h3 className="font-black text-sm uppercase tracking-wider text-primary">Session Configuration</h3>
                                    </div>
                                    {!isLocked && (
                                        <LogInjuryModal 
                                            clientId={clientId} 
                                            organizationId={session.organization_id || profile?.organization_id} 
                                            onSuccess={() => { fetchInjuries(); }} 
                                        />
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-foreground">Service / Session Type Done</Label>
                                        <Select 
                                            value={serviceId} 
                                            onValueChange={setServiceId}
                                            disabled={isLocked}
                                        >
                                            <SelectTrigger className="bg-background border-border">
                                                <SelectValue placeholder="Select session type..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filteredServices.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                ))}
                                                {(serviceId && !filteredServices.find(s => s.id === serviceId)) && (
                                                    <SelectItem value={serviceId}>
                                                        {services.find(s => s.id === serviceId)?.name || session.service_type}
                                                    </SelectItem>
                                                )}
                                                {filteredServices.length === 0 && !serviceId && (
                                                    <SelectItem value="none" disabled>No matching services for your role</SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        {!serviceId && !isCompleted && (
                                            <p className="text-[10px] text-red-500 font-medium animate-pulse">
                                                ⚠️ Please select session type before finalizing.
                                            </p>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-foreground">Linked Injury / Diagnosis</Label>
                                        <Select 
                                            value={selectedInjuryId || "none"} 
                                            onValueChange={v => setSelectedInjuryId(v === "none" ? "" : v)}
                                            disabled={isLocked}
                                        >
                                            <SelectTrigger className="bg-background border-border">
                                                <SelectValue placeholder="Select target injury..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No specific injury / General session</SelectItem>
                                                {clientInjuries.map(inj => (
                                                    <SelectItem key={inj.id} value={inj.id}>
                                                        {inj.diagnosis || inj.injury_type} ({inj.region}) - {inj.status}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-foreground">Treatment Type</Label>
                                        <Input 
                                            list="soap-treatment-types"
                                            value={treatmentType} 
                                            onChange={e => setTreatmentType(e.target.value)} 
                                            disabled={isLocked}
                                            placeholder="e.g., Consultation, Manual Therapy..." 
                                            className="bg-background border-border text-xs rounded-xl" 
                                        />
                                        <datalist id="soap-treatment-types">
                                            <option value="Consultation" />
                                            <option value="Physiotherapy" />
                                            <option value="Device Assessment" />
                                            <option value="Taping" />
                                            <option value="Dry Needling" />
                                            <option value="Active Rehabilitation" />
                                        </datalist>
                                    </div>
                                </div>
                            </div>

                            {/* 2. S — Subjective Section */}
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-5">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-black text-xs flex items-center justify-center border border-teal-500/20">
                                            S
                                        </span>
                                        <h3 className="font-black text-sm uppercase tracking-wider text-foreground">
                                            Subjective
                                        </h3>
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        Patient Feedback & Sensation Mapping
                                    </span>
                                </div>

                                <PainMap 
                                    value={sorenessData} 
                                    onChange={(data) => {
                                        setSorenessData(data);
                                        const scoresList = data?.scores ? Object.values(data.scores as Record<string, number>) : [];
                                        const maxPain = data?.maxPainScore ?? (
                                            scoresList.length > 0 ? Math.max(...scoresList) : 0
                                        );
                                        setPainScore(maxPain);
                                    }}
                                    readOnly={isLocked}
                                    clinicalNotes={clinicalNotes}
                                    onClinicalNotesChange={setClinicalNotes}
                                    gender={client?.gender?.toLowerCase() === "female" ? "female" : "male"}
                                    layout="side-by-side"
                                    hideScores={false}
                                />
                            </div>

                            {/* 3. O — Objective & Treatment Section */}
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-xs flex items-center justify-center border border-blue-500/20">
                                            O
                                        </span>
                                        <h3 className="font-black text-sm uppercase tracking-wider text-foreground">
                                            Objective & Treatment
                                        </h3>
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        Clinical Modalities & Interventions
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                            Clinical Modalities
                                        </Label>
                                        <div className="flex flex-wrap gap-2">
                                            {MODALITIES.map(m => (
                                                <Button 
                                                    key={m} 
                                                    type="button" 
                                                    variant={selectedModalities.includes(m) ? "default" : "outline"} 
                                                    size="sm" 
                                                    disabled={isLocked}
                                                    className={`h-8 text-xs font-bold rounded-xl transition-all ${
                                                        selectedModalities.includes(m)
                                                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                                                            : "bg-background border-border text-foreground hover:bg-muted"
                                                    }`} 
                                                    onClick={() => handleModalityToggle(m)}
                                                >
                                                    {m}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-foreground">Manual Therapy Performed</Label>
                                            <Textarea 
                                                value={manualTherapy} 
                                                onChange={e => setManualTherapy(e.target.value)} 
                                                disabled={isLocked}
                                                placeholder="Soft tissue mobilization, joint mobilization grade, dry needling..." 
                                                className="bg-background border-border text-xs min-h-[75px] rounded-xl resize-none" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-foreground">Exercise & Rehabilitation Given</Label>
                                            <Textarea 
                                                value={exerciseGiven} 
                                                onChange={e => setExerciseGiven(e.target.value)} 
                                                disabled={isLocked}
                                                placeholder="List exercises, sets, reps, load, and cues given..." 
                                                className="bg-background border-border text-xs min-h-[75px] rounded-xl resize-none" 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-foreground">Range of Motion (ROM)</Label>
                                            <Input 
                                                value={rangeOfMotion} 
                                                onChange={e => setRangeOfMotion(e.target.value)} 
                                                disabled={isLocked}
                                                placeholder="e.g., Shoulder flexion 165° (prev 150°)" 
                                                className="bg-background border-border text-xs rounded-xl" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-foreground">Strength & Functional Progress</Label>
                                            <Input 
                                                value={strengthProgress} 
                                                onChange={e => setStrengthProgress(e.target.value)} 
                                                disabled={isLocked}
                                                placeholder="e.g., Single leg squat stable, 4/5 hip abductors" 
                                                className="bg-background border-border text-xs rounded-xl" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 4. A — Assessment & Clinical Impression Section */}
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs flex items-center justify-center border border-amber-500/20">
                                            A
                                        </span>
                                        <h3 className="font-black text-sm uppercase tracking-wider text-foreground">
                                            Assessment & Clinical Impression
                                        </h3>
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        Clinical Diagnosis & Findings
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">Clinical Impression & Assessment Notes</Label>
                                    <Textarea 
                                        value={clinicalNotes} 
                                        onChange={e => setClinicalNotes(e.target.value)} 
                                        disabled={isLocked}
                                        placeholder="Enter clinical assessment, diagnostic impressions, joint/muscle findings, functional limitations..." 
                                        className="bg-background border-border text-xs min-h-[85px] rounded-xl resize-none" 
                                    />
                                </div>
                            </div>

                            {/* 5. P — Rehabilitation Plan & Next Steps Section */}
                            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b pb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black text-xs flex items-center justify-center border border-purple-500/20">
                                            P
                                        </span>
                                        <h3 className="font-black text-sm uppercase tracking-wider text-foreground">
                                            Rehabilitation Plan & Next Steps
                                        </h3>
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                        Progression & Next Session Goals
                                    </span>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">Next Session Goals & Progression Plan</Label>
                                    <Textarea 
                                        value={nextPlan} 
                                        onChange={e => setNextPlan(e.target.value)} 
                                        disabled={isLocked}
                                        placeholder="Plan for next consultation: progression criteria, home exercise protocol, reassessment date..." 
                                        className="bg-background border-border text-xs min-h-[80px] rounded-xl resize-none" 
                                    />
                                </div>
                            </div>

                            {/* Sticky Action Footer */}
                            <div className="flex items-center justify-between gap-4 pt-4 sticky bottom-0 bg-background/95 backdrop-blur-md border-t p-4 -mx-6 rounded-b-2xl shadow-lg z-20">
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    onClick={() => onOpenChange(false)}
                                    className="font-bold text-xs"
                                >
                                    Close
                                </Button>
                                {isLocked ? (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold">
                                        <Lock className="w-4 h-4 text-amber-600" />
                                        <span>Locked Record (Past Date)</span>
                                    </div>
                                ) : (
                                    canEnterNotes && (
                                        <Button 
                                            type="submit" 
                                            disabled={loading || (!serviceId && !isCompleted)} 
                                            className="min-w-[160px] font-black uppercase text-xs tracking-wider shadow-lg shadow-primary/20 rounded-xl h-10"
                                        >
                                            {loading ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <Save className="w-4 h-4 mr-2" />
                                            )}
                                            {isCompleted ? "Update SOAP Note" : "Finalize SOAP Note"}
                                        </Button>
                                    )
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Sidebar Area */}
                    <div className="lg:col-span-1 space-y-6">
                        <PerformanceSnapshot clientId={clientId} />
                        
                        <div className="p-5 rounded-2xl border border-primary/10 bg-primary/5 space-y-4 shadow-sm">
                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Internal Context</h4>
                            <div className="space-y-3 text-sm">
                                <div className="flex flex-col"><span className="text-[10px] text-muted-foreground uppercase font-bold">Service Type</span><span className="font-semibold text-foreground">{session.service_type}</span></div>
                                <div className="flex flex-col"><span className="text-[10px] text-muted-foreground uppercase font-bold">Scheduled At</span><span className="font-semibold text-foreground">{format(new Date(session.scheduled_start), "MMM d, h:mm a")}</span></div>
                                <div className="flex flex-col"><span className="text-[10px] text-muted-foreground uppercase font-bold">Consultant</span><span className="font-semibold text-foreground">{therapistDisplayName}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
