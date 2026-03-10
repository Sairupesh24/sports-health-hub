import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import LogInjuryModal from "./LogInjuryModal";

interface AdHocSessionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    preselectedClientId?: string;
}

const MODALITIES = [
    "IFT", "UST", "TENS", "STIMULATION", "CRYOTHERAPY", "HC", "NONE"
];

export default function AdHocSessionModal({ open, onOpenChange, onSuccess, preselectedClientId }: AdHocSessionModalProps) {
    const { profile } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [activeInjuries, setActiveInjuries] = useState<any[]>([]);

    // Form State
    const [selectedClientId, setSelectedClientId] = useState<string>("");
    const [selectedInjuryId, setSelectedInjuryId] = useState<string>("none");

    // Session Timings
    const [sessionDate, setSessionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [startTime, setStartTime] = useState<string>(format(new Date(), 'HH:mm'));

    // Auto-calculate end time 30 mins from start
    const getDefaultEndTime = () => {
        const date = new Date();
        date.setMinutes(date.getMinutes() + 30);
        return format(date, 'HH:mm');
    };
    const [endTime, setEndTime] = useState<string>(getDefaultEndTime());

    // SOAP Note Data
    const [painScore, setPainScore] = useState<number[]>([5]);
    const [selectedModalities, setSelectedModalities] = useState<string[]>([]);
    const [treatmentType, setTreatmentType] = useState("");
    const [manualTherapy, setManualTherapy] = useState("");
    const [exerciseGiven, setExerciseGiven] = useState("");
    const [clinicalNotes, setClinicalNotes] = useState("");
    const [nextPlan, setNextPlan] = useState("");

    useEffect(() => {
        if (open && profile?.organization_id) {
            fetchClients();
            // Reset form
            setSelectedClientId(preselectedClientId || "");
            setSelectedInjuryId("none");
            setPainScore([5]);
            setSelectedModalities([]);
            setTreatmentType("");
            setManualTherapy("");
            setExerciseGiven("");
            setClinicalNotes("");
            setNextPlan("");
            setSessionDate(format(new Date(), 'yyyy-MM-dd'));
            setStartTime(format(new Date(), 'HH:mm'));
            setEndTime(getDefaultEndTime());
        }
    }, [open, profile?.organization_id, preselectedClientId]);

    useEffect(() => {
        if (selectedClientId) {
            fetchInjuries(selectedClientId);
        } else {
            setActiveInjuries([]);
            setSelectedInjuryId("none");
        }
    }, [selectedClientId]);

    const fetchClients = async () => {
        if (!profile?.organization_id) return;

        // Fetch all active clients from the clients table
        const { data, error } = await supabase
            .from("clients")
            .select("*")
            .is("deleted_at", null)
            .order("created_at", { ascending: false });

        if (!error && data) {
            setClients(data);
        } else {
            console.error("Error fetching clients:", error);
        }
    };

    const fetchInjuries = async (clientId: string) => {
        const { data, error } = await supabase
            .from('injuries')
            .select('*')
            .eq('client_id', clientId)
            .neq('status', 'Resolved')
            .order('injury_date', { ascending: false });

        if (!error && data) {
            setActiveInjuries(data);
            if (data.length > 0) {
                setSelectedInjuryId(data[0].id);
            }
        }
    };

    const handleModalityToggle = (modality: string) => {
        setSelectedModalities(prev => {
            if (prev.includes(modality)) {
                return prev.filter(m => m !== modality);
            } else {
                return [...prev, modality];
            }
        });
    };

    const handleSaveSession = async () => {
        if (!selectedClientId) {
            toast({ variant: "destructive", title: "Validation Error", description: "Please select a client." });
            return;
        }

        try {
            setLoading(true);

            // Construct proper UTC timestamps for scheduled_start and scheduled_end
            // We combine the date and time strings, assuming local timezone for input
            const localStart = new Date(`${sessionDate}T${startTime}:00`);
            const localEnd = new Date(`${sessionDate}T${endTime}:00`);

            // 1. Create the Ad-Hoc Session Record
            const { data: sessionData, error: sessionErr } = await supabase
                .from('sessions')
                .insert({
                    organization_id: profile!.organization_id,
                    client_id: selectedClientId,
                    therapist_id: profile!.id,
                    service_type: 'Physiotherapy',
                    status: 'Completed', // Instant creation implies it happened
                    scheduled_start: localStart.toISOString(),
                    scheduled_end: localEnd.toISOString(),
                    actual_start: localStart.toISOString(),
                    actual_end: localEnd.toISOString()
                })
                .select()
                .single();

            if (sessionErr) throw sessionErr;

            // 2. Create the associated SOAP Note record
            const { error: soapErr } = await supabase
                .from('physio_session_details')
                .insert({
                    session_id: sessionData.id,
                    injury_id: selectedInjuryId === 'none' ? null : selectedInjuryId,
                    pain_score: painScore[0],
                    modality_used: selectedModalities.join(', '),
                    treatment_type: treatmentType,
                    manual_therapy: manualTherapy,
                    exercise_given: exerciseGiven,
                    clinical_notes: clinicalNotes,
                    next_plan: nextPlan
                });

            if (soapErr) throw soapErr;

            toast({ title: "Success", description: "Ad-hoc session and SOAP notes saved successfully." });
            if (onSuccess) onSuccess();
            onOpenChange(false);

        } catch (error: any) {
            console.error("Error creating ad-hoc session:", error);
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save session data." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <DialogTitle>Start Ad-Hoc Session</DialogTitle>
                    <DialogDescription>Create a new unscheduled session and simultaneously enter SOAP notes.</DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 py-4">
                    <div className="space-y-8">

                        {/* 1. Client & Time Setup */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Session Details</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Select Client</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn("w-full justify-between font-normal", !selectedClientId && "text-muted-foreground")}
                                            >
                                                {selectedClientId ? (() => {
                                                    const c = clients.find(x => x.id === selectedClientId);
                                                    if (!c) return "Search or select client...";
                                                    return [c.honorific, c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ");
                                                })() : "Search or select client..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search client..." />
                                                <CommandList>
                                                    <CommandEmpty>No client found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {clients.map(c => {
                                                            const fullName = [c.honorific, c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ");
                                                            return (
                                                                <CommandItem
                                                                    key={c.id}
                                                                    value={`${fullName} ${c.uhid || ''}`}
                                                                    onSelect={() => setSelectedClientId(c.id)}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", selectedClientId === c.id ? "opacity-100" : "opacity-0")} />
                                                                    {fullName} {c.uhid ? `(${c.uhid})` : ''}
                                                                </CommandItem>
                                                            );
                                                        })}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-2">
                                    <Label>Related Injury (Optional)</Label>
                                    <div className="flex gap-2 items-center">
                                        <Select value={selectedInjuryId} onValueChange={setSelectedInjuryId} disabled={!selectedClientId}>
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder="Select active injury" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No Specific Injury (General / Assessment)</SelectItem>
                                                {activeInjuries.map(inj => (
                                                    <SelectItem key={inj.id} value={inj.id}>
                                                        {inj.diagnosis} ({format(new Date(inj.injury_date), "MMM d")})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {/* Nested Modal Trigger for logging a new injury on the fly */}
                                        {profile && selectedClientId && (
                                            <LogInjuryModal
                                                clientId={selectedClientId}
                                                organizationId={profile.organization_id}
                                                onSuccess={() => fetchInjuries(selectedClientId)}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Start Time</Label>
                                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Time</Label>
                                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        {/* 2. SOAP Notes - Subjective */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Subjective</h3>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <Label>Pain Score (0-10)</Label>
                                        <span className="font-medium">{painScore[0]}/10</span>
                                    </div>
                                    <Slider
                                        value={painScore}
                                        onValueChange={setPainScore}
                                        max={10}
                                        step={1}
                                        className="py-4"
                                    />
                                </div>

                                <div>
                                    <Label>Subjective Notes</Label>
                                    <Textarea
                                        placeholder="Patient reports feeling..."
                                        className="mt-2"
                                        rows={3}
                                        value={clinicalNotes}
                                        onChange={e => setClinicalNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. SOAP Notes - Objective */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg border-b pb-2">Objective & Treatment</h3>

                            <div>
                                <Label className="mb-3 block">Modalities Used</Label>
                                <div className="flex flex-wrap gap-4 bg-muted/30 p-4 rounded-lg border">
                                    {MODALITIES.map(modality => (
                                        <div key={modality} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`adhoc-modality-${modality}`}
                                                checked={selectedModalities.includes(modality)}
                                                onCheckedChange={() => handleModalityToggle(modality)}
                                            />
                                            <label
                                                htmlFor={`adhoc-modality-${modality}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {modality}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label>Treatment Type</Label>
                                    <Input
                                        list="adhoc-treatment-types"
                                        className="mt-2"
                                        value={treatmentType}
                                        onChange={e => setTreatmentType(e.target.value)}
                                        placeholder="e.g. Laser Therapy"
                                    />
                                    <datalist id="adhoc-treatment-types">
                                        <option value="Consultation" />
                                        <option value="Physiotherapy" />
                                        <option value="Device Assessment" />
                                        <option value="Taping" />
                                    </datalist>
                                </div>
                                <div>
                                    <Label>Manual Therapy</Label>
                                    <Textarea
                                        placeholder="Soft tissue mobilization, joint manip..."
                                        className="mt-2"
                                        value={manualTherapy}
                                        onChange={e => setManualTherapy(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label>Exercises Given</Label>
                                    <Textarea
                                        placeholder="Wall sits 3x10, clamshells..."
                                        className="mt-2"
                                        value={exerciseGiven}
                                        onChange={e => setExerciseGiven(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 4. SOAP Notes - Plan */}
                        <div className="space-y-4 pb-8">
                            <h3 className="font-semibold text-lg border-b pb-2">Plan</h3>
                            <div>
                                <Label>Next Steps & Recommendations</Label>
                                <Textarea
                                    placeholder="Continue current home exercise program..."
                                    className="mt-2"
                                    value={nextPlan}
                                    onChange={e => setNextPlan(e.target.value)}
                                />
                            </div>
                        </div>

                    </div>
                </ScrollArea>

                <div className="px-6 py-4 border-t flex justify-end gap-3 bg-muted/20 shrink-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleSaveSession}
                        disabled={loading || !selectedClientId}
                    >
                        {loading ? "Saving..." : "Save Ad-Hoc Session"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
