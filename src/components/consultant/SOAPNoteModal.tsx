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
import { Copy, Save } from "lucide-react";

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
    );

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
                    await supabase.from('sessions').update({
                        status: 'Completed',
                        actual_start: new Date().toISOString(),
                        actual_end: new Date().toISOString()
                    }).eq('id', session.id);
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

    if (!session) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <DialogTitle>SOAP Note - {new Date(session.scheduled_start).toLocaleDateString()}</DialogTitle>
                    {!isCompleted && (
                        <Button variant="outline" size="sm" onClick={handleCopyPrevious} disabled={fetchingPrevious} className="mr-8">
                            <Copy className="w-4 h-4 mr-2" />
                            Same as before
                        </Button>
                    )}
                </DialogHeader>

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
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> {isCompleted ? "Update Note" : "Save Note"}</>}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
