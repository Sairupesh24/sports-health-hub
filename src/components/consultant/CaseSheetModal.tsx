import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/utils/api";
import { format } from "date-fns";
import { Save, Lock, Unlock, Loader2, FileText, Stethoscope, ClipboardList, Activity, FlaskConical, ChevronRight, AlertTriangle, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import PainMap from "./PainMap";

interface CaseSheetModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: string;
    client: any;
    caseId?: string | null;
    onSuccess?: (caseData: any) => void;
}

const BLANK_FORM = {
    chief_complaint: "", referral_source: "", referred_by: "",
    duration: "", radiation: "", onset: "", migration: "", character: "",
    progression: "", aggravation: "", alleviation: "", associated_features: "", diurnal_variation: "",
    hopi: "", mechanism: "", aggravating_factors: "", relieving_factors: "",
    previous_treatment: "No", previous_treatment_details: "",
    past_medical_history: "", past_surgical_history: "", drug_history: "", family_history: "",
    history_dm: false as boolean, history_htn: false as boolean, history_cad: false as boolean,
    history_cva: false as boolean, history_ba: false as boolean, history_tb: false as boolean,
    allergies: "", trauma: "", hospitalisation: "",
    years_of_training: "", training_volume: "", training_type: "", training_notes: "",
    lmp: "", cycle_regularity: "", menstrual_notes: "",
    built: "", nourishment: "",
    pallor: false as boolean, icterus: false as boolean, cyanosis: false as boolean,
    clubbing: false as boolean, lymphadenopathy: false as boolean, edema: false as boolean,
    beighton_score: "", temperature: "", pulse_rate: "", bp: "", spo2: "",
    respiratory_rate: "", height: "", weight: "", bmi: "",
    inspection_notes: "", palpation_notes: "", range_of_motion_notes: "",
    special_tests: [] as string[],
    neurovascular_notes: "", dermatome_notes: "", myotome_notes: "", reflexes_notes: "",
    pain_map: {} as Record<string, any>, pain_score: 0 as number,
    body_region: "", injury_type: "", severity: "Moderate",
    diagnosis_notes: "",
    provisional_diagnosis: "", icd_code: "", investigations: [] as string[],
    final_diagnosis: "", short_term_goals: "", long_term_goals: "",
    treatment_plan: "", home_exercise_program: "", advice: "", additional_notes: "",
};
type FormState = typeof BLANK_FORM;

const SectionHeader = ({ icon: Icon, title, subtitle, color = "text-primary" }: { icon: any; title: string; subtitle?: string; color?: string; }) => (
    <div className="flex items-start gap-2.5 pb-3 border-b border-border/40 mb-4">
        <div className="p-1.5 rounded-lg bg-primary/10 mt-0.5 shrink-0"><Icon className={cn("w-4 h-4", color)} /></div>
        <div>
            <h4 className="font-black text-sm uppercase tracking-wider text-foreground">{title}</h4>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
    </div>
);
const FieldRow = ({ label, children, required, counter }: { label: string; children: React.ReactNode; required?: boolean; counter?: string }) => (
    <div className="space-y-1.5">
        <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-foreground">{label}{required && <span className="text-red-500 ml-1">*</span>}</Label>
            {counter && <span className="text-[10px] text-muted-foreground font-mono">{counter}</span>}
        </div>
        {children}
    </div>
);
const CheckboxRow = ({ id, label, checked, onChange, disabled }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <div className="flex items-center gap-2">
        <Checkbox id={id} checked={checked} onCheckedChange={onChange as any} disabled={disabled} className="shrink-0" />
        <Label htmlFor={id} className="text-xs text-foreground cursor-pointer">{label}</Label>
    </div>
);

export default function CaseSheetModal({ open, onOpenChange, clientId, client, caseId, onSuccess }: CaseSheetModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetchingCase, setFetchingCase] = useState(false);
    const [savingStatus, setSavingStatus] = useState(false);
    const [activeTab, setActiveTab] = useState("history");
    const [caseData, setCaseData] = useState<any>(null);
    const [form, setForm] = useState<FormState>({ ...BLANK_FORM });

    // Master data for cascading injury repository diagnosis dropdowns
    const [regions, setRegions] = useState<string[]>([]);
    const [types, setTypes] = useState<string[]>([]);
    const [diagnoses, setDiagnoses] = useState<string[]>([]);

    const fetchRegions = useCallback(async () => {
        try {
            const data = await apiFetch<string[]>('/clinical/master-data/regions');
            setRegions(data || []);
        } catch (error) {
            console.error("Failed to fetch regions", error);
        }
    }, []);

    const fetchTypes = useCallback(async (region: string) => {
        if (!region) { setTypes([]); return; }
        try {
            const data = await apiFetch<string[]>(`/clinical/master-data/types?region=${encodeURIComponent(region)}`);
            setTypes(data || []);
        } catch (error) {
            console.error("Failed to fetch types", error);
        }
    }, []);

    const fetchDiagnoses = useCallback(async (region: string, type: string) => {
        if (!region || !type) { setDiagnoses([]); return; }
        try {
            const data = await apiFetch<string[]>(`/clinical/master-data/diagnoses?region=${encodeURIComponent(region)}&type=${encodeURIComponent(type)}`);
            setDiagnoses(data || []);
        } catch (error) {
            console.error("Failed to fetch diagnoses", error);
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchRegions();
        }
    }, [open, fetchRegions]);

    const handleRegionChange = (region: string) => {
        setForm(prev => ({ ...prev, body_region: region, injury_type: "", final_diagnosis: "" }));
        fetchTypes(region);
        setDiagnoses([]);
    };

    const handleTypeChange = (type: string) => {
        setForm(prev => ({ ...prev, injury_type: type, final_diagnosis: "" }));
        fetchDiagnoses(form.body_region, type);
    };

    const handleDiagnosisChange = (diagnosis: string) => {
        setForm(prev => ({ ...prev, final_diagnosis: diagnosis }));
    };

    const isEditing = !!caseId;
    const isFemale = (client?.gender || "").toLowerCase() === "female";
    const isClosed = caseData?.status === "closed";
    const isReadOnly = isClosed;

    const prefillFromClient = useCallback(() => {
        if (!client) return;
        setForm(prev => ({ ...prev, height: client.height ? String(client.height) : prev.height, weight: client.weight ? String(client.weight) : prev.weight }));
    }, [client]);

    const fetchCase = useCallback(async () => {
        if (!caseId) return;
        setFetchingCase(true);
        try {
            const data = await apiFetch<any>(`/clinical/cases/${caseId}`);
            setCaseData(data);
            const loadedFinalDx = data.final_diagnosis || (data.body_region && data.provisional_diagnosis && !data.final_diagnosis ? data.provisional_diagnosis : "");
            const loadedProvDx = (data.body_region && data.provisional_diagnosis && !data.final_diagnosis) ? "" : (data.provisional_diagnosis || "");

            setForm({
                chief_complaint: data.chief_complaint || "", referral_source: data.referral_source || "", referred_by: data.referred_by || "",
                duration: data.duration || "",
                radiation: data.radiation || "",
                onset: data.onset || "",
                migration: data.migration || "",
                character: data.character || "",
                progression: data.progression || "",
                aggravation: data.aggravation || data.aggravating_factors || "",
                alleviation: data.alleviation || data.relieving_factors || "",
                associated_features: data.associated_features || "",
                diurnal_variation: data.diurnal_variation || "",
                hopi: data.hopi || "", mechanism: data.mechanism || "",
                aggravating_factors: data.aggravating_factors || "", relieving_factors: data.relieving_factors || "",
                previous_treatment: data.previous_treatment || "No", previous_treatment_details: data.previous_treatment_details || "",
                past_medical_history: data.past_medical_history || "", past_surgical_history: data.past_surgical_history || "",
                drug_history: data.drug_history || "", family_history: data.family_history || "",
                history_dm: data.history_dm ?? data.dm ?? false,
                history_htn: data.history_htn ?? data.htn ?? false,
                history_cad: data.history_cad ?? data.cad ?? false,
                history_cva: data.history_cva ?? data.cva ?? false,
                history_ba: data.history_ba ?? data.ba ?? false,
                history_tb: data.history_tb ?? data.tb ?? false,
                allergies: data.allergies || "",
                trauma: data.trauma || "",
                hospitalisation: data.hospitalisation || data.hospitalization || "",
                years_of_training: data.years_of_training != null ? String(data.years_of_training) : "",
                training_volume: data.training_volume || "", training_type: data.training_type || "", training_notes: data.training_notes || "",
                lmp: data.lmp ? format(new Date(data.lmp), "yyyy-MM-dd") : "",
                cycle_regularity: data.cycle_regularity || "", menstrual_notes: data.menstrual_notes || "",
                built: data.built || "", nourishment: data.nourishment || "",
                pallor: data.pallor || false, icterus: data.icterus || false, cyanosis: data.cyanosis || false,
                clubbing: data.clubbing || false, lymphadenopathy: data.lymphadenopathy || false, edema: data.edema || false,
                beighton_score: data.beighton_score != null ? String(data.beighton_score) : "",
                temperature: data.temperature || "", pulse_rate: data.pulse_rate != null ? String(data.pulse_rate) : "",
                bp: data.bp || "", spo2: data.spo2 != null ? String(data.spo2) : "",
                respiratory_rate: data.respiratory_rate != null ? String(data.respiratory_rate) : "",
                height: data.height != null ? String(data.height) : "", weight: data.weight != null ? String(data.weight) : "",
                bmi: data.bmi != null ? String(data.bmi) : "",
                inspection_notes: data.inspection_notes || "", palpation_notes: data.palpation_notes || "",
                range_of_motion_notes: data.range_of_motion_notes || "",
                special_tests: Array.isArray(data.special_tests) ? data.special_tests : [],
                neurovascular_notes: data.neurovascular_notes || "", dermatome_notes: data.dermatome_notes || "",
                myotome_notes: data.myotome_notes || "", reflexes_notes: data.reflexes_notes || "",
                pain_map: data.pain_map || {}, pain_score: data.pain_score || 0,
                body_region: data.body_region || "",
                injury_type: data.injury_type || "",
                severity: data.severity || "Moderate",
                diagnosis_notes: data.diagnosis_notes || "",
                provisional_diagnosis: loadedProvDx, icd_code: data.icd_code || "",
                investigations: Array.isArray(data.investigations) ? data.investigations : [],
                final_diagnosis: loadedFinalDx, short_term_goals: data.short_term_goals || "",
                long_term_goals: data.long_term_goals || "", treatment_plan: data.treatment_plan || "",
                home_exercise_program: data.home_exercise_program || "", advice: data.advice || "",
                additional_notes: data.additional_notes || "",
            });
            if (data.body_region) {
                fetchTypes(data.body_region);
                if (data.injury_type) {
                    fetchDiagnoses(data.body_region, data.injury_type);
                }
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally { setFetchingCase(false); }
    }, [caseId]);

    useEffect(() => {
        if (open) {
            setActiveTab("history");
            if (caseId) { fetchCase(); }
            else { setCaseData(null); setForm({ ...BLANK_FORM }); prefillFromClient(); }
        }
    }, [open, caseId]);

    useEffect(() => {
        const h = parseFloat(form.height); const w = parseFloat(form.weight);
        if (h > 0 && w > 0) { const hm = h / 100; setForm(prev => ({ ...prev, bmi: (w / (hm * hm)).toFixed(1) })); }
    }, [form.height, form.weight]);

    const set = (field: keyof FormState) => (value: any) => setForm(prev => ({ ...prev, [field]: value }));
    const setEvt = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleSave = async () => {
        if (isReadOnly) return;
        if (!form.chief_complaint.trim()) { toast({ title: "Required", description: "Chief Complaint is required.", variant: "destructive" }); setActiveTab("history"); return; }
        setLoading(true);
        try {
            const payload: Record<string, any> = {
                ...form, client_id: clientId, pain_score: form.pain_score || 0,
                beighton_score: form.beighton_score ? parseInt(form.beighton_score) : null,
                years_of_training: form.years_of_training ? parseInt(form.years_of_training) : null,
                pulse_rate: form.pulse_rate ? parseInt(form.pulse_rate) : null,
                respiratory_rate: form.respiratory_rate ? parseInt(form.respiratory_rate) : null,
                height: form.height ? parseFloat(form.height) : null,
                weight: form.weight ? parseFloat(form.weight) : null,
                bmi: form.bmi ? parseFloat(form.bmi) : null,
                spo2: form.spo2 ? parseFloat(form.spo2) : null,
                lmp: isFemale && form.lmp ? form.lmp : null,
                cycle_regularity: isFemale ? form.cycle_regularity : null,
                menstrual_notes: isFemale ? form.menstrual_notes : null,
            };
            let result: any;
            if (isEditing && caseId) {
                result = await apiFetch(`/clinical/cases/${caseId}`, { method: "PUT", data: payload });
                toast({ title: "Case Updated", description: "Case sheet saved successfully." });
            } else {
                result = await apiFetch("/clinical/cases", { method: "POST", data: payload });
                toast({ title: "Case Created", description: `Case ${result.case_number} opened.` });
            }
            onSuccess?.(result);
            if (!isEditing) onOpenChange(false); else setCaseData(result);
        } catch (err: any) {
            toast({ title: "Save Failed", description: err.message, variant: "destructive" });
        } finally { setLoading(false); }
    };

    const handleToggleStatus = async () => {
        if (!caseId) return;
        setSavingStatus(true);
        try {
            const action = isClosed ? "reopen" : "close";
            const result = await apiFetch(`/clinical/cases/${caseId}/${action}`, { method: "POST" });
            setCaseData(result);
            toast({ title: isClosed ? "Case Reopened" : "Case Closed", description: isClosed ? "The case is now open for editing." : "Case has been closed." });
            onSuccess?.(result);
        } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
        finally { setSavingStatus(false); }
    };

    if (!open) return null;
    const inputClass = cn("bg-background border-border text-xs rounded-xl", isReadOnly && "opacity-60 cursor-not-allowed");
    const textareaClass = cn("bg-background border-border text-xs rounded-xl min-h-[70px] resize-none", isReadOnly && "opacity-60 cursor-not-allowed");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent aria-describedby="case-sheet-desc" className="sm:max-w-[95vw] lg:max-w-[1280px] h-[92vh] max-h-[92vh] overflow-hidden flex flex-col p-0 z-[60]">
                <DialogHeader className="px-6 pt-5 pb-4 border-b border-border/60 shrink-0 pr-14">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <DialogTitle className="text-xl font-bold font-display">{isEditing ? `Case Sheet - ${caseData?.case_number || "..."}` : "New Consultation Case Sheet"}</DialogTitle>
                                {caseData && (<Badge className={cn("text-[10px] font-black uppercase px-2.5 py-0.5 tracking-wider", isClosed ? "bg-slate-700 text-white" : "bg-emerald-500 text-white")}>{isClosed ? "CLOSED" : "OPEN"}</Badge>)}
                            </div>
                            <DialogDescription id="case-sheet-desc" className="text-xs text-muted-foreground">
                                {client ? `${client.honorific || ""} ${client.first_name} ${client.last_name}`.trim() + ` - UHID: ${client.uhid}` + (client.age ? ` - Age: ${client.age} yrs` : "") + (client.gender ? ` - ${client.gender}` : "") : ""}
                            </DialogDescription>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {isEditing && caseData && (
                                <Button variant="outline" size="sm" className={cn("h-8 px-3 text-xs font-bold rounded-xl gap-1.5", isClosed ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : "border-slate-300 text-slate-700 hover:bg-slate-50")} onClick={handleToggleStatus} disabled={savingStatus}>
                                    {savingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isClosed ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                    {isClosed ? "Reopen Case" : "Close Case"}
                                </Button>
                            )}
                            {!isReadOnly && (
                                <Button size="sm" className="h-8 px-4 text-xs font-bold rounded-xl gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave} disabled={loading}>
                                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    {isEditing ? "Update Case" : "Open Case"}
                                </Button>
                            )}
                        </div>
                    </div>
                    {fetchingCase && <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading case data...</div>}
                    {isReadOnly && (
                        <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                            <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            This case is <strong className="mx-1">closed</strong>. Fields are read-only. Reopen the case to make changes.
                        </div>
                    )}
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="px-6 py-2.5 shrink-0 border-b border-border/40 bg-muted/20 overflow-x-auto">
                        <TabsList className="bg-muted/60 p-1.5 rounded-2xl inline-flex w-max min-w-full justify-start border border-border/40 gap-1">
                            <TabsTrigger value="history" className="gap-2 rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-3 py-1.5 shrink-0 whitespace-nowrap">
                                <ClipboardList className="w-3.5 h-3.5 text-teal-500 shrink-0" /> History &amp; Profile
                            </TabsTrigger>
                            <TabsTrigger value="examination" className="gap-2 rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-3 py-1.5 shrink-0 whitespace-nowrap">
                                <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0" /> General Examination
                            </TabsTrigger>
                            <TabsTrigger value="local" className="gap-2 rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-3 py-1.5 shrink-0 whitespace-nowrap">
                                <Stethoscope className="w-3.5 h-3.5 text-violet-500 shrink-0" /> Clinical Examination
                            </TabsTrigger>
                            <TabsTrigger value="diagnosis" className="gap-2 rounded-xl text-xs font-bold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs px-3 py-1.5 shrink-0 whitespace-nowrap">
                                <FlaskConical className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Diagnosis &amp; Plan
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
                            {/* TAB 1 - History & Profile */}
                            <TabsContent value="history" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                    <SectionHeader icon={FileText} title="Chief Complaint" color="text-teal-500" />
                                    <FieldRow label="Chief Complaint" required>
                                        <Textarea className={textareaClass} value={form.chief_complaint} onChange={setEvt("chief_complaint")} disabled={isReadOnly} placeholder="Describe the primary complaint..." />
                                    </FieldRow>
                                </div>

                                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                    <SectionHeader 
                                        icon={ClipboardList} 
                                        title="History of Present Illness (HOPI)" 
                                        color="text-teal-600" 
                                        subtitle="Open text descriptions (max 150 characters each)"
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FieldRow label="Duration" counter={`${(form.duration || "").length}/150`}>
                                            <Input
                                                className={inputClass}
                                                value={form.duration}
                                                onChange={setEvt("duration")}
                                                disabled={isReadOnly}
                                                maxLength={150}
                                                placeholder="e.g., 3 weeks, acute since yesterday..."
                                            />
                                        </FieldRow>

                                        <FieldRow label="Radiation" counter={`${(form.radiation || "").length}/150`}>
                                            <Input
                                                className={inputClass}
                                                value={form.radiation}
                                                onChange={setEvt("radiation")}
                                                disabled={isReadOnly}
                                                maxLength={150}
                                                placeholder="e.g., Radiating down lateral thigh to knee..."
                                            />
                                        </FieldRow>

                                        <FieldRow label="Onset" counter={`${(form.onset || "").length}/150`}>
                                            <Input
                                                className={inputClass}
                                                value={form.onset}
                                                onChange={setEvt("onset")}
                                                disabled={isReadOnly}
                                                maxLength={150}
                                                placeholder="e.g., Sudden pop while pivoting, gradual stiffness..."
                                            />
                                        </FieldRow>

                                        <FieldRow label="Migration" counter={`${(form.migration || "").length}/150`}>
                                            <Input
                                                className={inputClass}
                                                value={form.migration}
                                                onChange={setEvt("migration")}
                                                disabled={isReadOnly}
                                                maxLength={150}
                                                placeholder="e.g., Shifted from lower back to right glute..."
                                            />
                                        </FieldRow>

                                        <FieldRow label="Character" counter={`${(form.character || "").length}/150`}>
                                            <Input
                                                className={inputClass}
                                                value={form.character}
                                                onChange={setEvt("character")}
                                                disabled={isReadOnly}
                                                maxLength={150}
                                                placeholder="e.g., Sharp, throbbing, dull ache, burning..."
                                            />
                                        </FieldRow>

                                        <FieldRow label="Progression" counter={`${(form.progression || "").length}/150`}>
                                            <Input
                                                className={inputClass}
                                                value={form.progression}
                                                onChange={setEvt("progression")}
                                                disabled={isReadOnly}
                                                maxLength={150}
                                                placeholder="e.g., Worsening over last 4 days, static, fluctuating..."
                                            />
                                        </FieldRow>

                                        <FieldRow label="Aggravation" counter={`${(form.aggravation || "").length}/150`}>
                                            <Input
                                                className={inputClass}
                                                value={form.aggravation}
                                                onChange={setEvt("aggravation")}
                                                disabled={isReadOnly}
                                                maxLength={150}
                                                placeholder="e.g., Squatting, deceleration, prolonged sitting..."
                                            />
                                        </FieldRow>

                                        <FieldRow label="Alleviation" counter={`${(form.alleviation || "").length}/150`}>
                                            <Input
                                                className={inputClass}
                                                value={form.alleviation}
                                                onChange={setEvt("alleviation")}
                                                disabled={isReadOnly}
                                                maxLength={150}
                                                placeholder="e.g., Rest, ice, elevation, gentle movement..."
                                            />
                                        </FieldRow>

                                        <FieldRow label="Associated features" counter={`${(form.associated_features || "").length}/150`}>
                                            <Input
                                                className={inputClass}
                                                value={form.associated_features}
                                                onChange={setEvt("associated_features")}
                                                disabled={isReadOnly}
                                                maxLength={150}
                                                placeholder="e.g., Swelling, clicking, giving way, numbness..."
                                            />
                                        </FieldRow>

                                        <FieldRow label="Diurnal variation" counter={`${(form.diurnal_variation || "").length}/150`}>
                                            <Input
                                                className={inputClass}
                                                value={form.diurnal_variation}
                                                onChange={setEvt("diurnal_variation")}
                                                disabled={isReadOnly}
                                                maxLength={150}
                                                placeholder="e.g., Worse in morning / morning stiffness, nocturnal pain..."
                                            />
                                        </FieldRow>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                    <SectionHeader 
                                        icon={FileText} 
                                        title="Past History" 
                                        color="text-indigo-500" 
                                        subtitle="Medical conditions, allergies, prior trauma and hospitalisation"
                                    />
                                    
                                    {/* Medical Conditions Checkboxes Row */}
                                    <div className="rounded-xl border border-border/70 bg-muted/20 p-4 mb-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                Medical Conditions (Multiple can be selected)
                                            </Label>
                                            <span className="text-[11px] text-muted-foreground">Select all that apply</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                                            {[
                                                { key: "history_dm", label: "DM", title: "Diabetes Mellitus" },
                                                { key: "history_htn", label: "HTN", title: "Hypertension" },
                                                { key: "history_cad", label: "CAD", title: "Coronary Artery Disease" },
                                                { key: "history_cva", label: "CVA", title: "Cerebrovascular Accident" },
                                                { key: "history_ba", label: "BA", title: "Bronchial Asthma" },
                                                { key: "history_tb", label: "TB", title: "Tuberculosis" },
                                            ].map(item => {
                                                const isChecked = !!form[item.key as keyof FormState];
                                                return (
                                                    <label
                                                        key={item.key}
                                                        htmlFor={`past-history-${item.key}`}
                                                        title={item.title}
                                                        className={cn(
                                                            "flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer select-none",
                                                            isChecked
                                                                ? "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs"
                                                                : "border-border bg-background hover:bg-muted/50 text-foreground",
                                                            isReadOnly && "opacity-60 cursor-not-allowed"
                                                        )}
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black tracking-wide">{item.label}</span>
                                                            <span className="text-[9px] text-muted-foreground truncate max-w-[70px]" title={item.title}>
                                                                {item.title}
                                                            </span>
                                                        </div>
                                                        <Checkbox
                                                            id={`past-history-${item.key}`}
                                                            checked={isChecked}
                                                            onCheckedChange={v => !isReadOnly && set(item.key as keyof FormState)(!!v)}
                                                            disabled={isReadOnly}
                                                            className="shrink-0 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                                        />
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Allergies, Trauma, Hospitalisation */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <FieldRow label="Allergies">
                                            <Input
                                                className={inputClass}
                                                value={form.allergies}
                                                onChange={setEvt("allergies")}
                                                disabled={isReadOnly}
                                                placeholder="e.g., Penicillin, NSAIDs, Food allergies..."
                                            />
                                        </FieldRow>

                                        <FieldRow label="Trauma">
                                            <Input
                                                className={inputClass}
                                                value={form.trauma}
                                                onChange={setEvt("trauma")}
                                                disabled={isReadOnly}
                                                placeholder="e.g., Prior fractures, RTA, major dislocations..."
                                            />
                                        </FieldRow>

                                        <FieldRow label="Hospitalisation">
                                            <Input
                                                className={inputClass}
                                                value={form.hospitalisation}
                                                onChange={setEvt("hospitalisation")}
                                                disabled={isReadOnly}
                                                placeholder="e.g., Prior admissions, surgeries, ICU stays..."
                                            />
                                        </FieldRow>
                                    </div>

                                    {/* Optional Collapsible for Additional Past/Family History */}
                                    <div className="mt-4 pt-3 border-t border-border/40">
                                        <details className="group">
                                            <summary className="text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1.5 select-none">
                                                <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
                                                Additional Past / Family History (Optional)
                                            </summary>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-1">
                                                <FieldRow label="Past Medical History Notes">
                                                    <Input className={inputClass} value={form.past_medical_history} onChange={setEvt("past_medical_history")} disabled={isReadOnly} placeholder="Other chronic medical conditions..." />
                                                </FieldRow>
                                                <FieldRow label="Past Surgical History">
                                                    <Input className={inputClass} value={form.past_surgical_history} onChange={setEvt("past_surgical_history")} disabled={isReadOnly} placeholder="Previous surgeries, procedures..." />
                                                </FieldRow>
                                                <FieldRow label="Drug History / Medications">
                                                    <Input className={inputClass} value={form.drug_history} onChange={setEvt("drug_history")} disabled={isReadOnly} placeholder="Current medications, doses..." />
                                                </FieldRow>
                                                <FieldRow label="Family History">
                                                    <Input className={inputClass} value={form.family_history} onChange={setEvt("family_history")} disabled={isReadOnly} placeholder="Relevant family medical conditions..." />
                                                </FieldRow>
                                            </div>
                                        </details>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                    <SectionHeader icon={ClipboardList} title="Previous Treatment History" color="text-teal-600" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FieldRow label="Previous Treatment Taken?">
                                            <Select value={form.previous_treatment} onValueChange={set("previous_treatment")} disabled={isReadOnly}>
                                                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="No">No</SelectItem><SelectItem value="Yes">Yes</SelectItem></SelectContent>
                                            </Select>
                                        </FieldRow>
                                        {form.previous_treatment === "Yes" && (
                                            <div className="md:col-span-2">
                                                <FieldRow label="Treatment Details">
                                                    <Textarea className={textareaClass} value={form.previous_treatment_details} onChange={setEvt("previous_treatment_details")} disabled={isReadOnly} placeholder="Describe previous treatment, manual therapy, modalities, injections..." />
                                                </FieldRow>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                    <SectionHeader icon={Activity} title="Training History" color="text-emerald-500" subtitle="Auto-filled from athlete profile where available" />
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <FieldRow label="Years of Training"><Input type="number" min="0" className={inputClass} value={form.years_of_training} onChange={setEvt("years_of_training")} disabled={isReadOnly} placeholder="e.g. 5" /></FieldRow>
                                        <FieldRow label="Training Volume"><Input className={inputClass} value={form.training_volume} onChange={setEvt("training_volume")} disabled={isReadOnly} placeholder="e.g. 8 hrs/week" /></FieldRow>
                                        <FieldRow label="Training Type"><Select value={form.training_type} onValueChange={set("training_type")} disabled={isReadOnly}><SelectTrigger className={inputClass}><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{["Strength","Endurance","Skill-based","Mixed","Recreational","Competitive"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FieldRow>
                                        <FieldRow label="Training Notes"><Input className={inputClass} value={form.training_notes} onChange={setEvt("training_notes")} disabled={isReadOnly} placeholder="Additional notes..." /></FieldRow>
                                    </div>
                                </div>

                                {isFemale && (
                                    <div className="rounded-2xl border border-pink-200 dark:border-pink-800/50 bg-pink-50/40 dark:bg-pink-950/20 p-5 shadow-sm">
                                        <SectionHeader icon={User} title="Menstrual History" color="text-pink-500" subtitle="Applicable for female athletes only" />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FieldRow label="Last Menstrual Period (LMP)"><Input type="date" className={inputClass} value={form.lmp} onChange={setEvt("lmp")} disabled={isReadOnly} /></FieldRow>
                                            <FieldRow label="Cycle Regularity"><Select value={form.cycle_regularity} onValueChange={set("cycle_regularity")} disabled={isReadOnly}><SelectTrigger className={inputClass}><SelectValue placeholder="Select..." /></SelectTrigger><SelectContent>{["Regular","Irregular","Amenorrhea","Dysmenorrhea"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></FieldRow>
                                            <FieldRow label="Notes"><Input className={inputClass} value={form.menstrual_notes} onChange={setEvt("menstrual_notes")} disabled={isReadOnly} placeholder="Contraceptives, cycle length, etc." /></FieldRow>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-end pt-2"><Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("examination")} className="gap-1.5 text-xs font-bold rounded-xl">Next: General Exam <ChevronRight className="w-3.5 h-3.5" /></Button></div>
                            </TabsContent>

                            {/* TAB 2 - General Examination */}
                            <TabsContent value="examination" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                                    {/* Left Column: General Examination Vitals & Signs */}
                                    <div className="lg:col-span-5 rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                                        <SectionHeader icon={Activity} title="General Examination" color="text-blue-500" subtitle="Vitals, clinical signs & anthropometrics" />
                                        <div className="grid grid-cols-3 gap-3">
                                            <FieldRow label="Built">
                                                <Select value={form.built} onValueChange={set("built")} disabled={isReadOnly}>
                                                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select..." /></SelectTrigger>
                                                    <SelectContent>{["Lean","Average","Athletic","Obese"].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FieldRow>
                                            <FieldRow label="Nourishment">
                                                <Select value={form.nourishment} onValueChange={set("nourishment")} disabled={isReadOnly}>
                                                    <SelectTrigger className={inputClass}><SelectValue placeholder="Select..." /></SelectTrigger>
                                                    <SelectContent>{["Well Nourished","Poorly Nourished","Obese"].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FieldRow>
                                            <FieldRow label="Beighton Score (0-9)">
                                                <Input type="number" min="0" max="9" className={inputClass} value={form.beighton_score} onChange={setEvt("beighton_score")} disabled={isReadOnly} placeholder="0-9" />
                                            </FieldRow>
                                        </div>

                                        <div>
                                            <Label className="text-xs font-bold text-foreground mb-2 block">Clinical Signs</Label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                {(["pallor","icterus","cyanosis","clubbing","lymphadenopathy","edema"] as const).map(field => (
                                                    <CheckboxRow key={field} id={`sign-${field}`} label={field.charAt(0).toUpperCase() + field.slice(1)} checked={form[field] as boolean} onChange={v => set(field)(v)} disabled={isReadOnly} />
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-xs font-bold text-foreground mb-2 block">Vitals</Label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                <FieldRow label="Temperature"><Input className={inputClass} value={form.temperature} onChange={setEvt("temperature")} disabled={isReadOnly} placeholder="e.g. 37.2 C" /></FieldRow>
                                                <FieldRow label="Pulse Rate (bpm)"><Input type="number" className={inputClass} value={form.pulse_rate} onChange={setEvt("pulse_rate")} disabled={isReadOnly} placeholder="72" /></FieldRow>
                                                <FieldRow label="Blood Pressure"><Input className={inputClass} value={form.bp} onChange={setEvt("bp")} disabled={isReadOnly} placeholder="120/80" /></FieldRow>
                                                <FieldRow label="SpO2 (%)"><Input type="number" step="0.1" min="0" max="100" className={inputClass} value={form.spo2} onChange={setEvt("spo2")} disabled={isReadOnly} placeholder="98.0" /></FieldRow>
                                                <FieldRow label="Resp. Rate (bpm)"><Input type="number" className={inputClass} value={form.respiratory_rate} onChange={setEvt("respiratory_rate")} disabled={isReadOnly} placeholder="16" /></FieldRow>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-border/40">
                                            <Label className="text-xs font-bold text-foreground mb-2 block">Anthropometrics</Label>
                                            <div className="grid grid-cols-3 gap-3">
                                                <FieldRow label="Height (cm)"><Input type="number" step="0.1" className={inputClass} value={form.height} onChange={setEvt("height")} disabled={isReadOnly} placeholder="175" /></FieldRow>
                                                <FieldRow label="Weight (kg)"><Input type="number" step="0.1" className={inputClass} value={form.weight} onChange={setEvt("weight")} disabled={isReadOnly} placeholder="70" /></FieldRow>
                                                <FieldRow label="BMI (auto)"><Input className={cn(inputClass,"bg-muted/40")} value={form.bmi} readOnly placeholder="auto" /></FieldRow>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Body Heatmaps (Side-by-Side) */}
                                    <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
                                        <SectionHeader 
                                            icon={Activity} 
                                            title="Pain / Soreness Map" 
                                            color="text-rose-500" 
                                            subtitle="Anterior & Posterior anatomical heatmaps (Side-by-Side)" 
                                        />
                                        <PainMap 
                                            value={form.pain_map} 
                                            onChange={(data) => { 
                                                set("pain_map")(data); 
                                                const scoresList = data?.scores ? Object.values(data.scores as Record<string, number>) : []; 
                                                const maxPain = data?.maxPainScore ?? (scoresList.length > 0 ? Math.max(...scoresList) : 0); 
                                                set("pain_score")(maxPain); 
                                            }} 
                                            readOnly={isReadOnly} 
                                            gender={client?.gender?.toLowerCase() === "female" ? "female" : "male"} 
                                            layout="side-by-side"
                                            hideScores={true}
                                            viewHeightClass="h-[250px] sm:h-[280px] md:h-[300px] lg:h-[320px] max-h-[46vh]"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-between pt-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("history")} className="text-xs font-bold rounded-xl">Back: History</Button>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("local")} className="gap-1.5 text-xs font-bold rounded-xl">Next: Clinical Exam <ChevronRight className="w-3.5 h-3.5" /></Button>
                                </div>
                            </TabsContent>

                            {/* TAB 3 - Clinical Examination */}
                            <TabsContent value="local" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                    <SectionHeader icon={Stethoscope} title="Local / Regional Examination" color="text-violet-500" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FieldRow label="Inspection"><Textarea className={textareaClass} value={form.inspection_notes} onChange={setEvt("inspection_notes")} disabled={isReadOnly} placeholder="Posture, alignment, swelling, deformity, skin changes..." /></FieldRow>
                                        <FieldRow label="Palpation"><Textarea className={textareaClass} value={form.palpation_notes} onChange={setEvt("palpation_notes")} disabled={isReadOnly} placeholder="Tenderness, temperature, crepitus, masses..." /></FieldRow>
                                        <div className="md:col-span-2"><FieldRow label="Range of Motion Findings"><Textarea className={cn(textareaClass,"min-h-[80px]")} value={form.range_of_motion_notes} onChange={setEvt("range_of_motion_notes")} disabled={isReadOnly} placeholder="Active/Passive ROM in degrees for each joint/plane..." /></FieldRow></div>
                                        <div className="md:col-span-2"><FieldRow label="Special Tests Positive (comma-separated)"><Textarea className={textareaClass} value={(form.special_tests as string[]).join(", ")} onChange={(e) => set("special_tests")(e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))} disabled={isReadOnly} placeholder="e.g. Apley, McMurray, Lachman, SLRT..." /></FieldRow></div>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                    <SectionHeader icon={Activity} title="Neurovascular Status" color="text-cyan-500" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FieldRow label="General Neurovascular Status"><Textarea className={textareaClass} value={form.neurovascular_notes} onChange={setEvt("neurovascular_notes")} disabled={isReadOnly} placeholder="Pulse, capillary refill, sensation..." /></FieldRow>
                                        <FieldRow label="Dermatome Assessment"><Textarea className={textareaClass} value={form.dermatome_notes} onChange={setEvt("dermatome_notes")} disabled={isReadOnly} placeholder="Sensory dermatomal findings..." /></FieldRow>
                                        <FieldRow label="Myotome Assessment"><Textarea className={textareaClass} value={form.myotome_notes} onChange={setEvt("myotome_notes")} disabled={isReadOnly} placeholder="Motor myotomal findings (graded 0-5)..." /></FieldRow>
                                        <FieldRow label="Reflexes"><Textarea className={textareaClass} value={form.reflexes_notes} onChange={setEvt("reflexes_notes")} disabled={isReadOnly} placeholder="DTRs, Babinski, Clonus..." /></FieldRow>
                                    </div>
                                </div>
                                <div className="flex justify-between pt-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("examination")} className="text-xs font-bold rounded-xl">Back: General Exam</Button>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("diagnosis")} className="gap-1.5 text-xs font-bold rounded-xl">Next: Diagnosis <ChevronRight className="w-3.5 h-3.5" /></Button>
                                </div>
                            </TabsContent>

                            {/* TAB 4 - Diagnosis & Plan */}
                            <TabsContent value="diagnosis" className="space-y-6 focus-visible:outline-none focus-visible:ring-0 mt-0">
                                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                    <SectionHeader icon={FlaskConical} title="Provisional Diagnosis" color="text-amber-500" subtitle="Initial clinical impression prior to investigations" />
                                    <FieldRow label="Provisional Diagnosis">
                                        <Textarea 
                                            className={cn(textareaClass, "min-h-[75px]")} 
                                            value={form.provisional_diagnosis} 
                                            onChange={setEvt("provisional_diagnosis")} 
                                            disabled={isReadOnly} 
                                            placeholder="Enter initial impression, suspected conditions, working diagnosis..." 
                                        />
                                    </FieldRow>
                                </div>

                                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                    <SectionHeader icon={FlaskConical} title="Investigations Ordered / Results" color="text-orange-500" />
                                    <FieldRow label="Investigations (one per line)">
                                        <Textarea className={cn(textareaClass,"min-h-[80px]")} value={(form.investigations as string[]).join("\n")} onChange={(e) => set("investigations")(e.target.value.split("\n").map((s: string) => s.trim()).filter(Boolean))} disabled={isReadOnly} placeholder="X-Ray, MRI, Blood CBC, EMG/NCS..." />
                                    </FieldRow>
                                </div>

                                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
                                    <SectionHeader icon={FileText} title="Final Diagnosis" color="text-red-500" subtitle="Specify confirmed diagnosis from injury repository with classification details" />
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {/* Body Region */}
                                        <FieldRow label="Body Region" required>
                                            <Select value={form.body_region} onValueChange={handleRegionChange} disabled={isReadOnly}>
                                                <SelectTrigger className={cn("h-10 text-xs rounded-xl bg-background border-border", isReadOnly && "opacity-60 cursor-not-allowed")}>
                                                    <SelectValue placeholder="Select region" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {regions.map(r => (
                                                        <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FieldRow>

                                        {/* Injury Type */}
                                        <FieldRow label="Injury Type" required>
                                            <Select value={form.injury_type} onValueChange={handleTypeChange} disabled={isReadOnly || !form.body_region}>
                                                <SelectTrigger className={cn("h-10 text-xs rounded-xl bg-background border-border", (isReadOnly || !form.body_region) && "opacity-60 cursor-not-allowed")}>
                                                    <SelectValue placeholder={!form.body_region ? "Select region first" : "Select type"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {types.map(t => (
                                                        <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FieldRow>

                                        {/* Diagnosis */}
                                        <FieldRow label="Diagnosis" required>
                                            <Select value={form.final_diagnosis} onValueChange={handleDiagnosisChange} disabled={isReadOnly || !form.injury_type}>
                                                <SelectTrigger className={cn("h-10 text-xs rounded-xl bg-background border-border", (isReadOnly || !form.injury_type) && "opacity-60 cursor-not-allowed")}>
                                                    <SelectValue placeholder={!form.injury_type ? "Select type first" : "Select diagnosis"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {form.final_diagnosis && !diagnoses.includes(form.final_diagnosis) && (
                                                        <SelectItem value={form.final_diagnosis} className="text-xs">{form.final_diagnosis}</SelectItem>
                                                    )}
                                                    {diagnoses.map(d => (
                                                        <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FieldRow>

                                        {/* Severity */}
                                        <FieldRow label="Severity">
                                            <Select value={form.severity} onValueChange={set("severity")} disabled={isReadOnly}>
                                                <SelectTrigger className={cn("h-10 text-xs rounded-xl bg-background border-border", isReadOnly && "opacity-60 cursor-not-allowed")}>
                                                    <SelectValue placeholder="Select severity" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Mild" className="text-xs">Mild</SelectItem>
                                                    <SelectItem value="Moderate" className="text-xs">Moderate</SelectItem>
                                                    <SelectItem value="Severe" className="text-xs">Severe</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FieldRow>
                                    </div>

                                    <div className="pt-2 border-t border-border/40">
                                        <FieldRow label="Specific Notes / Laterality (Optional)">
                                            <Input className={inputClass} value={form.diagnosis_notes} onChange={setEvt("diagnosis_notes")} disabled={isReadOnly} placeholder="Custom notes, grade, side (left/right)..." />
                                        </FieldRow>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                    <SectionHeader icon={ClipboardList} title="Management Plan" color="text-emerald-600" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FieldRow label="Short-Term Goals"><Textarea className={textareaClass} value={form.short_term_goals} onChange={setEvt("short_term_goals")} disabled={isReadOnly} placeholder="0-4 weeks goals..." /></FieldRow>
                                        <FieldRow label="Long-Term Goals"><Textarea className={textareaClass} value={form.long_term_goals} onChange={setEvt("long_term_goals")} disabled={isReadOnly} placeholder="Return to sport / function goals..." /></FieldRow>
                                        <div className="md:col-span-2"><FieldRow label="Treatment Plan"><Textarea className={cn(textareaClass,"min-h-[80px]")} value={form.treatment_plan} onChange={setEvt("treatment_plan")} disabled={isReadOnly} placeholder="Detailed treatment plan including modalities, manual therapy, exercises..." /></FieldRow></div>
                                        <FieldRow label="Home Exercise Program (HEP)"><Textarea className={textareaClass} value={form.home_exercise_program} onChange={setEvt("home_exercise_program")} disabled={isReadOnly} placeholder="Home exercises prescribed..." /></FieldRow>
                                        <FieldRow label="Advice / Precautions"><Textarea className={textareaClass} value={form.advice} onChange={setEvt("advice")} disabled={isReadOnly} placeholder="Activity modifications, dietary advice, follow-up schedule..." /></FieldRow>
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                                    <SectionHeader icon={FileText} title="Additional Remarks" color="text-slate-500" />
                                    <FieldRow label="Notes / Remarks"><Textarea className={cn(textareaClass,"min-h-[80px]")} value={form.additional_notes} onChange={setEvt("additional_notes")} disabled={isReadOnly} placeholder="Any additional clinical notes, consent information, patient education..." /></FieldRow>
                                </div>
                                <div className="flex justify-between items-center pt-2 pb-4">
                                    <Button type="button" variant="outline" size="sm" onClick={() => setActiveTab("local")} className="text-xs font-bold rounded-xl">Back: Clinical Exam</Button>
                                    {!isReadOnly ? (
                                        <Button size="sm" onClick={handleSave} disabled={loading} className="h-9 px-5 text-xs font-bold rounded-xl gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm">
                                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                            {isEditing ? "Update Case Sheet" : "Open Case Sheet"}
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Case is closed - reopen to save changes.
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
            </DialogContent>
        </Dialog>
    );
}
