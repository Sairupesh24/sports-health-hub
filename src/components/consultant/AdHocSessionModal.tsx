import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
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
import { Check, ChevronsUpDown, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { filterServicesByRole, Service } from "@/utils/serviceMapping";
import LogInjuryModal from "./LogInjuryModal";
import PainMap from "./PainMap";

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
    const { profile, roles } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [activeInjuries, setActiveInjuries] = useState<any[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [serviceId, setServiceId] = useState<string>("");
    const [servicesLoading, setServicesLoading] = useState(false);

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

    const selectedClient = useMemo(() => {
        return clients.find(c => c.id === selectedClientId);
    }, [clients, selectedClientId]);

    const clientGender = selectedClient?.gender?.toLowerCase() === "female" ? "female" : "male";

    useEffect(() => {
        if (open && profile?.organization_id) {
            fetchClients();
            // Reset form
            setSelectedClientId(preselectedClientId || "");
            setSelectedInjuryId("none");
            setPainScore(0);
            setSorenessData({});
            setSelectedModalities([]);
            setTreatmentType("");
            setManualTherapy("");
            setExerciseGiven("");
            setRangeOfMotion("");
            setStrengthProgress("");
            setClinicalNotes("");
            setNextPlan("");
            setSessionDate(format(new Date(), 'yyyy-MM-dd'));
            setStartTime(format(new Date(), 'HH:mm'));
            setEndTime(getDefaultEndTime());
            fetchServices();
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
        try {
            const data = await apiFetch<any[]>('/clients');
            setClients(data);
        } catch (err) {
            console.error("Error fetching clients:", err);
        }
    };

    const fetchInjuries = async (clientId: string) => {
        try {
            const data = await apiFetch<any[]>('/clinical/injuries', {
                params: { client_id: clientId, status: 'Active' }
            });
            setActiveInjuries(data);
            if (data.length > 0) {
                setSelectedInjuryId(data[0].id);
            }
        } catch (err) {
            console.error("Error fetching injuries:", err);
        }
    };

    const fetchServices = async () => {
        if (!profile?.organization_id) return;
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

    const filteredServices = useMemo(() => {
        return filterServicesByRole(services, profile?.profession, roles?.[0]);
    }, [services, profile?.profession, roles]);

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

            const localStart = new Date(`${sessionDate}T${startTime}:00`);
            const localEnd = new Date(`${sessionDate}T${endTime}:00`);

            const selectedService = services.find(s => s.id === serviceId);

            // 1. Create the Ad-Hoc Session via dedicated endpoint
            const sessionData = await apiFetch<any>('/appointments', {
                method: 'POST',
                data: {
                    client_id: selectedClientId,
                    therapist_id: profile?.id || null,
                    service_id: serviceId || null,
                    service_type: selectedService?.name || 'Physiotherapy',
                    scheduled_start: localStart.toISOString(),
                    scheduled_end: localEnd.toISOString(),
                    is_adhoc: true,
                    source_console: 'clinical'
                }
            });

            // 2. Save the SOAP Note and complete it
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

            await apiFetch(`/clinical/sessions/${sessionData.id}/soap`, {
                method: 'POST',
                data: {
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
                    service_id: serviceId || null,
                    service_type: selectedService?.name || 'Physiotherapy'
                }
            });

            toast({ title: "Session Saved", description: "Ad-hoc session and SOAP notes logged successfully." });
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save session" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[92vw] lg:max-w-[1240px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border-border rounded-3xl shadow-2xl">
                <DialogHeader className="px-6 py-4 border-b shrink-0 bg-background/90 backdrop-blur-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1 text-left">
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-xl font-bold font-display text-foreground leading-tight">
                                    Start Ad-Hoc Session
                                </DialogTitle>
                                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black tracking-wider border border-amber-500/20 uppercase">
                                    AD-HOC / UNSCHEDULED
                                </span>
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground font-medium">
                                Create an unscheduled treatment session and document clinical SOAP notes simultaneously.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <ScrollArea className="flex-1 px-6 py-5 overflow-y-auto">
                    <div className="space-y-6 pb-6 max-w-full">
                        {/* 1. Client, Timing & Service Setup Card */}
                        <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-primary rounded-full" />
                                    <h3 className="font-black text-sm uppercase tracking-wider text-primary">
                                        Session & Patient Details
                                    </h3>
                                </div>
                                {profile && selectedClientId && (
                                    <LogInjuryModal
                                        clientId={selectedClientId}
                                        organizationId={profile.organization_id}
                                        onSuccess={() => fetchInjuries(selectedClientId)}
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                                {/* Client Combobox */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">Select Patient / Client</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-full justify-between font-normal bg-background border-border hover:border-primary/40 text-xs h-10 rounded-xl",
                                                    !selectedClientId && "text-muted-foreground"
                                                )}
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <Users className="w-4 h-4 text-primary/70 shrink-0" />
                                                    {selectedClientId ? (() => {
                                                        const c = clients.find(x => x.id === selectedClientId);
                                                        if (!c) return "Search client...";
                                                        const fullName = [c.honorific, c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ");
                                                        return `${fullName} ${c.uhid ? `(${c.uhid})` : ''}`;
                                                    })() : "Search by name, UHID or phone..."}
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[380px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search client name or UHID..." />
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

                                {/* Service Type */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">Service Type</Label>
                                    <Select value={serviceId} onValueChange={setServiceId}>
                                        <SelectTrigger className="bg-background border-border text-xs h-10 rounded-xl">
                                            <SelectValue placeholder={servicesLoading ? "Loading..." : "Select Service"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {filteredServices.map(s => (
                                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Target Injury */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">Target Injury (Optional)</Label>
                                    <Select value={selectedInjuryId} onValueChange={setSelectedInjuryId} disabled={!selectedClientId}>
                                        <SelectTrigger className="bg-background border-border text-xs h-10 rounded-xl">
                                            <SelectValue placeholder="Select active injury..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Specific Injury (General Assessment)</SelectItem>
                                            {activeInjuries.map(inj => (
                                                <SelectItem key={inj.id} value={inj.id}>
                                                    {inj.diagnosis} ({format(new Date(inj.injury_date), "MMM d")})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Date & Times */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</Label>
                                    <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} className="bg-background border-border text-xs h-9 rounded-xl" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Start Time</Label>
                                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-background border-border text-xs h-9 rounded-xl" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">End Time</Label>
                                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-background border-border text-xs h-9 rounded-xl" />
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

                            {selectedClientId ? (
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
                                    readOnly={loading}
                                    clinicalNotes={clinicalNotes}
                                    onClinicalNotesChange={setClinicalNotes}
                                    gender={clientGender}
                                    layout="side-by-side"
                                    hideScores={false}
                                />
                            ) : (
                                <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-2xl border border-dashed border-border">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-xs font-bold">Please select a patient above to enable the interactive subjective assessment map.</p>
                                </div>
                            )}
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
                                        {MODALITIES.map(modality => (
                                            <Button
                                                key={modality}
                                                type="button"
                                                variant={selectedModalities.includes(modality) ? "default" : "outline"}
                                                size="sm"
                                                className={`h-8 text-xs font-bold rounded-xl transition-all ${
                                                    selectedModalities.includes(modality)
                                                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                                                        : "bg-background border-border text-foreground hover:bg-muted"
                                                }`}
                                                onClick={() => handleModalityToggle(modality)}
                                            >
                                                {modality}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-foreground">Treatment Type</Label>
                                        <Input
                                            list="adhoc-treatment-types"
                                            value={treatmentType}
                                            onChange={e => setTreatmentType(e.target.value)}
                                            placeholder="e.g., Manual Physiotherapy"
                                            className="bg-background border-border text-xs rounded-xl"
                                        />
                                        <datalist id="adhoc-treatment-types">
                                            <option value="Consultation" />
                                            <option value="Physiotherapy" />
                                            <option value="Device Assessment" />
                                            <option value="Taping" />
                                            <option value="Dry Needling" />
                                        </datalist>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-foreground">Manual Therapy</Label>
                                        <Textarea
                                            placeholder="Soft tissue mobilization, joint manip..."
                                            value={manualTherapy}
                                            onChange={e => setManualTherapy(e.target.value)}
                                            className="bg-background border-border text-xs min-h-[65px] rounded-xl resize-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-foreground">Exercises Given</Label>
                                        <Textarea
                                            placeholder="Wall sits 3x10, clamshells, band pull..."
                                            value={exerciseGiven}
                                            onChange={e => setExerciseGiven(e.target.value)}
                                            className="bg-background border-border text-xs min-h-[65px] rounded-xl resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-foreground">Range of Motion (ROM)</Label>
                                        <Input
                                            placeholder="e.g., Shoulder flexion 165° (prev 150°)"
                                            value={rangeOfMotion}
                                            onChange={e => setRangeOfMotion(e.target.value)}
                                            className="bg-background border-border text-xs rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-foreground">Strength & Functional Progress</Label>
                                        <Input
                                            placeholder="e.g., Single leg squat stable, 4/5 hip abductors"
                                            value={strengthProgress}
                                            onChange={e => setStrengthProgress(e.target.value)}
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
                                    placeholder="Enter clinical assessment, diagnostic impressions, joint/muscle findings, functional limitations..."
                                    value={clinicalNotes}
                                    onChange={e => setClinicalNotes(e.target.value)}
                                    className="bg-background border-border text-xs min-h-[75px] rounded-xl resize-none"
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
                                    Progression & Recommendations
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">Next Steps & Home Recommendations</Label>
                                <Textarea
                                    placeholder="Continue home exercise program 2x daily, ice application, next follow-up in 3 days..."
                                    value={nextPlan}
                                    onChange={e => setNextPlan(e.target.value)}
                                    className="bg-background border-border text-xs min-h-[75px] rounded-xl resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                {/* Sticky Action Footer */}
                <div className="px-6 py-4 border-t flex items-center justify-between bg-background/95 backdrop-blur-md shrink-0 shadow-lg z-20">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => onOpenChange(false)}
                        className="font-bold text-xs"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSaveSession}
                        disabled={loading || !selectedClientId}
                        className="min-w-[170px] font-black uppercase text-xs tracking-wider shadow-lg shadow-primary/20 rounded-xl h-10"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Saving...
                            </>
                        ) : (
                            "Save Ad-Hoc Session"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
