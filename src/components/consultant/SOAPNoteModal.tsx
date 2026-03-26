import { useState, useEffect } from "react";
import PerformanceSnapshot from "./PerformanceSnapshot";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Save, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface SOAPNoteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    session: any;
    clientId: string;
    onSuccess: () => void;
}

const MODALITIES = ["IFT", "UST", "TENS", "STIMULATION", "CRYOTHERAPY", "HC", "NONE"];

export default function SOAPNoteModal({ open, onOpenChange, session, clientId, onSuccess }: SOAPNoteModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetchingPrevious, setFetchingPrevious] = useState(false);
    const [reconciling, setReconciling] = useState(false);
    const [balanceLoading, setBalanceLoading] = useState(false);
    const [remainingSessions, setRemainingSessions] = useState<number | null>(null);

    // Note State
    const [painScore, setPainScore] = useState<number>(0);
    const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
    const [treatmentType, setTreatmentType] = useState("");
    const [manualTherapy, setManualTherapy] = useState("");
    const [exerciseGiven, setExerciseGiven] = useState("");
    const [rangeOfMotion, setRangeOfMotion] = useState("");
    const [strengthProgress, setStrengthProgress] = useState("");
    const [clinicalNotes, setClinicalNotes] = useState("");
    const [nextPlan, setNextPlan] = useState("");

    const isCompleted = (session?.physio_session_details && (
        Array.isArray(session.physio_session_details)
            ? session.physio_session_details.length > 0
            : Object.keys(session.physio_session_details).length > 0
    )) || session?.status === 'Completed';

    const isUnentitled = session?.is_unentitled === true;
    const isFutureSession = session?.scheduled_start ? new Date(session.scheduled_start) > new Date() : false;
    const isCancelled = session?.status === 'Cancelled';
    const canEnterNotes = !isFutureSession && !isCancelled;

    useEffect(() => {
        if (open && session) {
            if (isCompleted) {
                const data = Array.isArray(session.physio_session_details)
                    ? session.physio_session_details[0]
                    : session.physio_session_details;
                setPainScore(data.pain_score || 0);
                setSelectedModalities(data.modality_used ? data.modality_used.split(',').map((s: string) => s.trim()) : []);
                setTreatmentType(data.treatment_type || "");
                setManualTherapy(data.manual_therapy || "");
                setExerciseGiven(data.exercise_given || "");
                setRangeOfMotion(data.range_of_motion || "");
                setStrengthProgress(data.strength_progress || "");
                setClinicalNotes(data.clinical_notes || "");
                setNextPlan(data.next_plan || "");
            } else {
                setPainScore(0);
                setSelectedModalities([]);
                setTreatmentType("");
                setManualTherapy("");
                setExerciseGiven("");
                setRangeOfMotion("");
                setStrengthProgress("");
                setClinicalNotes("");
                setNextPlan("");
            }
        }
    }, [open, session, isCompleted]);

    useEffect(() => {
        if (!open || !session?.id || session.status !== "Planned") {
            setRemainingSessions(null);
            return;
        }

        const fetchBalance = async () => {
            setBalanceLoading(true);
            try {
                const { data, error } = await (supabase as any).rpc('fn_compute_entitlement_balance', { 
                    p_client_id: clientId 
                });
                if (!error && data) {
                    const serviceKey = (session.service_type || "").toLowerCase().trim();
                    const balance = (data as any[]).find(b => b.service_name?.toLowerCase().trim() === serviceKey);
                    setRemainingSessions(balance ? balance.sessions_remaining : 0);
                }
            } finally {
                setBalanceLoading(false);
            }
        };
        fetchBalance();
    }, [open, session?.id, session?.status, clientId, session?.service_type]);

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
            const { data, error } = await supabase
                .from("physio_session_details")
                .select(`*, sessions!inner(client_id, scheduled_start)`)
                .eq("sessions.client_id", clientId)
                .lt("sessions.scheduled_start", session.scheduled_start)
                .order("sessions.scheduled_start" as any, { ascending: false })
                .limit(1);

            if (error) throw error;
            if (data?.length) {
                const prev = data[0];
                setPainScore(prev.pain_score || 0);
                setSelectedModalities(prev.modality_used ? prev.modality_used.split(',').map((s: string) => s.trim()) : []);
                setTreatmentType(prev.treatment_type || "");
                setManualTherapy(prev.manual_therapy || "");
                setExerciseGiven(prev.exercise_given || "");
                setRangeOfMotion(prev.range_of_motion || "");
                setStrengthProgress(prev.strength_progress || "");
                setClinicalNotes(prev.clinical_notes || "");
                setNextPlan(prev.next_plan || "");
                toast({ title: "Copied", description: "Copied data from previous session." });
            } else {
                toast({ title: "No Previous Note", description: "No previous SOAP notes found.", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setFetchingPrevious(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!session?.id) return;

        try {
            setLoading(true);
            const payload = {
                session_id: session.id,
                pain_score: painScore,
                modality_used: selectedModalities.join(', '),
                treatment_type: treatmentType,
                manual_therapy: manualTherapy,
                exercise_given: exerciseGiven,
                range_of_motion: rangeOfMotion,
                strength_progress: strengthProgress,
                clinical_notes: clinicalNotes,
                next_plan: nextPlan
            };

            let error;
            if (isCompleted) {
                const res = await supabase.from('physio_session_details').update(payload).eq('session_id', session.id);
                error = res.error;
            } else {
                const res = await supabase.from('physio_session_details').insert(payload);
                error = res.error;

                if (!error) {
                    await supabase.from('sessions').update({
                        actual_start: new Date().toISOString(),
                        actual_end: new Date().toISOString(),
                        status: 'Completed'
                    }).eq('id', session.id);

                    const { data: { user } } = await supabase.auth.getUser();
                    await supabase.rpc('complete_session', {
                        p_session_id: session.id,
                        p_user_id: user?.id
                    });
                }
            }

            if (error) throw error;
            toast({ title: "Success", description: "SOAP note saved successfully." });
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
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await (supabase as any).rpc("reconcile_session", {
                p_session_id: session.id,
                p_user_id: user?.id
            });
            if (error) throw new Error(error.message);
            toast({ title: "✅ Reconciled", description: "Entitlement deducted successfully." });
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
            <DialogContent className="sm:max-w-[90vw] lg:max-w-[1200px] max-h-[95vh] overflow-y-auto overflow-x-hidden">
                <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
                    <div className="flex flex-col gap-1">
                        <DialogTitle className="flex items-center gap-2 text-xl font-display">
                            SOAP Note — {format(new Date(session.scheduled_start), "MMM d, yyyy")}
                            {isUnentitled && (
                                <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-300 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> UN-ENTITLED
                                </span>
                            )}
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">Athlete: <span className="font-semibold text-foreground">{session.client?.first_name} {session.client?.last_name}</span></p>
                    </div>
                    {!isCompleted && (
                        <Button variant="outline" size="sm" onClick={handleCopyPrevious} disabled={fetchingPrevious} className="mr-8">
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Previous
                        </Button>
                    )}
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-6">
                    {/* Main Entry Area */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Status Banners */}
                        {session.status === "Planned" && !balanceLoading && remainingSessions === 0 && (
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

                        {isUnentitled && (
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

                        <form onSubmit={handleSubmit} className="space-y-8 pb-8">
                            {/* Subjective Section */}
                            <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
                                <div className="flex items-center gap-2 border-b pb-4">
                                    <div className="w-1 h-4 bg-primary rounded-full" />
                                    <h3 className="font-bold text-base uppercase tracking-wider text-foreground">Subjective</h3>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <Label className="text-sm font-semibold">Pain Intensity</Label>
                                            <span className="text-2xl font-black text-primary font-display">{painScore}<span className="text-xs text-muted-foreground font-normal ml-1">/ 10</span></span>
                                        </div>
                                        <Slider value={[painScore]} onValueChange={(val) => setPainScore(val[0])} max={10} step={1} className="py-2" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold">Subjective Notes / Patient Feedback</Label>
                                        <Textarea value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)} placeholder="How is the patient feeling?" className="min-h-[100px] bg-muted/20" />
                                    </div>
                                </div>
                            </div>

                            {/* Objective & Treatment Section */}
                            <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
                                <div className="flex items-center gap-2 border-b pb-4">
                                    <div className="w-1 h-4 bg-primary rounded-full" />
                                    <h3 className="font-bold text-base uppercase tracking-wider text-foreground">Objective & Treatment</h3>
                                </div>
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold">Clinical Modallities</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {MODALITIES.map(m => (
                                                <Button key={m} type="button" variant={selectedModalities.includes(m) ? "default" : "outline"} size="sm" className="h-8 text-[11px] font-bold" onClick={() => handleModalityToggle(m)}>
                                                    {m}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>Primary Treatment</Label><Input value={treatmentType} onChange={e => setTreatmentType(e.target.value)} placeholder="e.g. Laser, TENS" /></div>
                                        <div className="space-y-2"><Label>Manual Therapy</Label><Input value={manualTherapy} onChange={e => setManualTherapy(e.target.value)} placeholder="e.g. Myofascial Release" /></div>
                                        <div className="space-y-2"><Label>Range of Motion</Label><Input value={rangeOfMotion} onChange={e => setRangeOfMotion(e.target.value)} placeholder="e.g. Flexion 100°" /></div>
                                        <div className="space-y-2"><Label>Strength Status</Label><Input value={strengthProgress} onChange={e => setStrengthProgress(e.target.value)} placeholder="e.g. 4/5 MMT" /></div>
                                    </div>
                                    <div className="space-y-2"><Label>Exercise / Rehabilitation Given</Label><Textarea value={exerciseGiven} onChange={e => setExerciseGiven(e.target.value)} placeholder="List exercises and parameters..." className="bg-muted/20" /></div>
                                </div>
                            </div>

                            {/* Plan Section */}
                            <div className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
                                <div className="flex items-center gap-2 border-b pb-4">
                                    <div className="w-1 h-4 bg-primary rounded-full" />
                                    <h3 className="font-bold text-base uppercase tracking-wider text-foreground">Next Plan</h3>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">Rehabilitation Plan</Label>
                                    <Textarea value={nextPlan} onChange={e => setNextPlan(e.target.value)} placeholder="Next session goals..." className="bg-muted/20" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-4 sticky bottom-0 bg-background/80 backdrop-blur-sm border-t p-4 -mx-6 rounded-b-2xl">
                                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Discard</Button>
                                {canEnterNotes && (
                                    <Button type="submit" disabled={loading} className="min-w-[140px] shadow-lg shadow-primary/20">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                        {isCompleted ? "Update Record" : "Finalize SOAP Note"}
                                    </Button>
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
                                <div className="flex flex-col"><span className="text-[10px] text-muted-foreground uppercase font-bold">Consultant</span><span className="font-semibold text-foreground">Dr. {session.therapist?.last_name || "TBD"}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
