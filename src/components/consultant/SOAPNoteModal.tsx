import { useState, useEffect } from "react";
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
    session: any; // The session object to attach the SOAP note to
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

    const isCompleted = session?.physio_session_details && (
        Array.isArray(session.physio_session_details)
            ? session.physio_session_details.length > 0
            : Object.keys(session.physio_session_details).length > 0
    ) || session?.status === 'Completed';

    const isUnentitled = session?.is_unentitled === true;
    const isFutureSession = session?.scheduled_start ? new Date(session.scheduled_start) > new Date() : false;
    const isCancelled = session?.status === 'Cancelled';
    const canEnterNotes = !isFutureSession && !isCancelled;

    // Load existing data if edit mode
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
                // Reset for new
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

    // Fetch entitlement balance for Planned sessions
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
            if (modality === "NONE") return ["NONE"]; // If NONE is selected, clear others

            const withoutNone = prev.filter(m => m !== "NONE");
            if (withoutNone.includes(modality)) {
                return withoutNone.filter(m => m !== modality);
            } else {
                return [...withoutNone, modality];
            }
        });
    };

    const handleCopyPrevious = async () => {
        try {
            setFetchingPrevious(true);
            // Find the most recent session WITH a SOAP note for this client
            const { data, error } = await supabase
                .from("physio_session_details")
                .select(`
                *,
                sessions!inner(client_id, scheduled_start)
            `)
                .eq("sessions.client_id", clientId)
                .lt("sessions.scheduled_start", session.scheduled_start)
                .order("sessions.scheduled_start" as any, { ascending: false })
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
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
                toast({ title: "No Previous Note", description: "No previous SOAP notes found for this client.", variant: "destructive" });
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
                // Update
                const res = await supabase.from('physio_session_details').update(payload).eq('session_id', session.id);
                error = res.error;
            } else {
                // Insert
                const res = await supabase.from('physio_session_details').insert(payload);
                error = res.error;

                // Mark session as completed
                if (!error) {
                    const { error: timesError } = await supabase.from('sessions').update({
                        actual_start: new Date().toISOString(),
                        actual_end: new Date().toISOString()
                    }).eq('id', session.id);
                    
                    if (timesError) throw timesError;

                    const { data: { user } } = await supabase.auth.getUser();
                    const { error: rpcError } = await supabase.rpc('complete_session', {
                        p_session_id: session.id,
                        p_user_id: user?.id
                    });
                    
                    if (rpcError) throw new Error(rpcError.message || "Failed to consume session entitlement");
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
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <div className="flex flex-col gap-1">
                        <DialogTitle className="flex items-center gap-2">
                            SOAP Note - {format(new Date(session.scheduled_start), "MMM d, yyyy")}
                            {isUnentitled && (
                                <span className="ml-2 px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold border border-red-300 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" /> UN-ENTITLED
                                </span>
                            )}
                        </DialogTitle>
                        <p className="text-xs text-muted-foreground">Client: {session.client?.first_name} {session.client?.last_name}</p>
                    </div>
                    {!isCompleted && (
                        <Button variant="outline" size="sm" onClick={handleCopyPrevious} disabled={fetchingPrevious} className="mr-8">
                            <Copy className="w-4 h-4 mr-2" />
                            Same as before
                        </Button>
                    )}
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    {/* Future session entitlement warning */}
                    {session.status === "Planned" && !balanceLoading && remainingSessions === 0 && (
                        <div className="flex items-start gap-2 rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800 animate-in fade-in duration-300">
                            <span className="text-base text-orange-500 font-bold">⚠</span>
                            <span>
                                <strong>No Entitlements Remaining:</strong> This client has no sessions left for {session.service_type || "this service"}. 
                                Completing this session will mark it as <strong>Un-entitled</strong> unless a new package is purchased.
                            </span>
                        </div>
                    )}

                    {/* Future session guard */}
                    {isFutureSession && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 animate-in fade-in duration-300">
                            <span className="text-base text-amber-500 font-bold">⚠</span>
                            <span>
                                <strong>Early Entry Prohibited:</strong> You cannot enter SOAP notes before the scheduled session time (<strong>{format(new Date(session.scheduled_start), "MMM d, yyyy h:mm a")}</strong>).
                            </span>
                        </div>
                    )}

                    {/* Cancelled session guard */}
                    {isCancelled && (
                        <div className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 animate-in fade-in duration-300">
                            <span className="text-base text-red-500 font-bold">🚫</span>
                            <span>
                                <strong>Cancelled Session:</strong> SOAP notes cannot be entered for a cancelled session.
                            </span>
                        </div>
                    )}

                    {/* UN-ENTITLED Banner with Reconcile */}
                    {isUnentitled && (
                        <div className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-3 animate-in fade-in duration-300">
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
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">

                    {/* Subjective */}
                    <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Subjective</h3>

                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label>Pain Score (0-10): <span className="font-bold text-primary ml-2">{painScore}</span></Label>
                            </div>
                            <Slider
                                value={[painScore]}
                                onValueChange={(val) => setPainScore(val[0])}
                                max={10}
                                step={1}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Patient Feedback / Subjective Notes</Label>
                            <Textarea
                                value={clinicalNotes}
                                onChange={e => setClinicalNotes(e.target.value)}
                                placeholder="How is the patient feeling since last session?"
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Objective */}
                    <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Objective & Treatment</h3>

                        <div className="space-y-3">
                            <Label>Modalities Used</Label>
                            <div className="flex flex-wrap gap-3">
                                {MODALITIES.map(modality => (
                                    <div key={modality} className="flex items-center space-x-2 border rounded-md px-3 py-2 bg-card">
                                        <Checkbox
                                            id={`mod-${modality}`}
                                            checked={selectedModalities.includes(modality)}
                                            onCheckedChange={() => handleModalityToggle(modality)}
                                        />
                                        <label htmlFor={`mod-${modality}`} className="text-sm font-medium leading-none cursor-pointer">
                                            {modality}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Treatment Type</Label>
                                <Input value={treatmentType} onChange={e => setTreatmentType(e.target.value)} placeholder="e.g. Laser Therapy" list="treatment-types" />
                                <datalist id="treatment-types">
                                    <option value="Consultation" />
                                    <option value="Physiotherapy" />
                                    <option value="Device Assessment" />
                                    <option value="Taping" />
                                </datalist>
                            </div>
                            <div className="space-y-2">
                                <Label>Manual Therapy</Label>
                                <Input value={manualTherapy} onChange={e => setManualTherapy(e.target.value)} placeholder="e.g. Soft tissue mobilization" />
                            </div>
                            <div className="space-y-2">
                                <Label>Range of Motion</Label>
                                <Input value={rangeOfMotion} onChange={e => setRangeOfMotion(e.target.value)} placeholder="e.g. 90deg flexion" />
                            </div>
                            <div className="space-y-2">
                                <Label>Strength Progress</Label>
                                <Input value={strengthProgress} onChange={e => setStrengthProgress(e.target.value)} placeholder="e.g. 4/5 quad strength" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Exercise Given</Label>
                            <Textarea value={exerciseGiven} onChange={e => setExerciseGiven(e.target.value)} placeholder="Describe exercises performed or prescribed..." rows={2} />
                        </div>
                    </div>

                    {/* Plan */}
                    <div className="space-y-4 rounded-lg border p-4 bg-muted/10">
                        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Plan</h3>
                        <div className="space-y-2">
                            <Label>Next Steps</Label>
                            <Textarea value={nextPlan} onChange={e => setNextPlan(e.target.value)} placeholder="Progress to Phase 2, increase load..." rows={2} />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        {canEnterNotes && (
                            <Button type="submit" disabled={loading}>
                                {loading ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> {isCompleted ? "Update Note" : "Save Note"}</>}
                            </Button>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
