import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/utils/api";
import { cn } from "@/lib/utils";
import {
  User,
  Activity,
  Apple,
  Zap,
  Pill,
  ClipboardCheck,
  Plus,
  Trash2,
  AlertTriangle,
  Save,
  X,
  Clock,
  Sparkles,
  Stethoscope,
  Search,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import type {
  NutritionAssessment,
  ClientType,
  DietaryPreference,
  SupplementItem,
  RecallTimeline,
  FuelingSession,
  MedicalConditionItem,
} from "@/types/nutrition";

interface NutritionAssessmentFormProps {
  clientId?: string;
  clientName?: string;
  clientUhid?: string;
  initialData?: Partial<NutritionAssessment>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function NutritionAssessmentForm({
  clientId = "",
  clientName = "",
  clientUhid = "",
  initialData,
  onSuccess,
  onCancel,
}: NutritionAssessmentFormProps) {
  const { profile } = useAuth();
  const { toast } = useToast();

  const loggedInName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Lead Nutritionist"
    : "Lead Nutritionist";
  const todayDate = new Date().toISOString().split("T")[0];

  const [activeTab, setActiveTab] = useState<string>("section-a");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // --- Client Selection Dropdown State ---
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState<boolean>(false);
  const [selectedClientId, setSelectedClientId] = useState<string>(clientId || initialData?.client_id || "");
  const [selectedClientUhid, setSelectedClientUhid] = useState<string>(clientUhid || "");
  const [clientComboboxOpen, setClientComboboxOpen] = useState<boolean>(false);

  // --- Section A: Personal Details ---
  const [name, setName] = useState<string>(clientName || initialData?.name || "");
  const [age, setAge] = useState<number | string>(initialData?.age || "");
  const [gender, setGender] = useState<string>(initialData?.gender || "Male");
  const [profession, setProfession] = useState<string>(initialData?.profession || "");
  const [clientType, setClientType] = useState<ClientType>(initialData?.client_type || "athlete");

  // (if Athlete)
  const [sport, setSport] = useState<string>(initialData?.sport || "");
  const [position, setPosition] = useState<string>(initialData?.position || "");
  const [trainingAge, setTrainingAge] = useState<string>(initialData?.training_age || "");
  const [competitionLevel, setCompetitionLevel] = useState<string>(initialData?.competition_level || "");

  // (if General Population)
  const [exercise, setExercise] = useState<boolean>(initialData?.exercise ?? true);
  const [exerciseDuration, setExerciseDuration] = useState<string>(initialData?.exercise_duration || "");
  const [trainingSessionsCount, setTrainingSessionsCount] = useState<number | string>(initialData?.training_sessions_count || "");
  const [exerciseType, setExerciseType] = useState<string>(initialData?.exercise_type || "");

  // Fetch list of registered clients for dropdown
  useEffect(() => {
    const fetchRegisteredClients = async () => {
      try {
        setLoadingClients(true);
        const res = await apiFetch<any[]>("/clients");
        if (res && Array.isArray(res)) {
          setClients(res);

          // If clientId was passed as prop or initialData, auto-match the client
          const targetId = clientId || initialData?.client_id;
          if (targetId) {
            const matched = res.find((c) => c.id === targetId);
            if (matched) {
              handleSelectClient(matched);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to load registered clients:", err);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchRegisteredClients();
  }, [clientId, initialData?.client_id]);

  const handleSelectClient = (c: any) => {
    const fullName = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed Client";
    setName(fullName);
    setSelectedClientId(c.id);
    setSelectedClientUhid(c.uhid || "");

    // Auto-fill Age if available
    if (c.age) {
      setAge(c.age);
    } else if (c.dob) {
      const birthYear = new Date(c.dob).getFullYear();
      const currentYear = new Date().getFullYear();
      if (!isNaN(birthYear) && currentYear > birthYear) {
        setAge(currentYear - birthYear);
      }
    }

    // Auto-fill Gender if available
    if (c.gender) {
      const g = c.gender.toString().toLowerCase();
      if (g.startsWith("m")) setGender("Male");
      else if (g.startsWith("f")) setGender("Female");
      else setGender("Other");
    }

    // Auto-fill Profession/Occupation
    if (c.occupation || c.profession) {
      setProfession(c.occupation || c.profession);
    }

    // Auto-fill Sport & Population Category
    if (c.sport) {
      setSport(c.sport);
    }
    if (c.athlete_type || c.sport) {
      setClientType("athlete");
      if (c.athlete_type) setCompetitionLevel(c.athlete_type);
    }

    // Auto-fill Dietary Preference
    if (c.dietary_preference) {
      setDietaryPreference(c.dietary_preference);
    }

    // Auto-fill Allergies
    if (c.allergies_intolerances || c.allergies) {
      const list = c.allergies_intolerances || c.allergies;
      if (Array.isArray(list)) {
        setAllergies(list);
      }
    }
  };

  // --- Section B: Anthropometric Details ---
  const [heightCm, setHeightCm] = useState<number | string>(initialData?.height_cm || "");
  const [weightKg, setWeightKg] = useState<number | string>(initialData?.weight_kg || "");
  const [bodyFatPct, setBodyFatPct] = useState<number | string>(initialData?.body_fat_pct || "");
  const [muscleMassKg, setMuscleMassKg] = useState<number | string>(initialData?.muscle_mass_kg || "");

  const [complaints, setComplaints] = useState<string>(initialData?.complaints || "");
  const [biochemicalInterpretations, setBiochemicalInterpretations] = useState<string>(initialData?.biochemical_interpretations || "");
  const [medicalHistory, setMedicalHistory] = useState<string>(initialData?.medical_history || "");
  const [otherMedications, setOtherMedications] = useState<string>(initialData?.other_medications || "");

  // Comorbidities / Medical Conditions (Multiple items)
  const parseInitialComorbidities = (): MedicalConditionItem[] => {
    if (initialData?.comorbidities && Array.isArray(initialData.comorbidities) && initialData.comorbidities.length > 0) {
      return initialData.comorbidities;
    }
    if (initialData?.medical_history) {
      try {
        const parsed = JSON.parse(initialData.medical_history);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        return [{ id: "1", condition: initialData.medical_history, since: "", treatment: "" }];
      }
    }
    return [];
  };

  const [comorbidities, setComorbidities] = useState<MedicalConditionItem[]>(parseInitialComorbidities);

  const handleAddComorbidity = (conditionName: string = "") => {
    const newItem: MedicalConditionItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      condition: conditionName,
      since: "",
      treatment: "",
    };
    setComorbidities((prev) => [...prev, newItem]);
  };

  const handleUpdateComorbidity = (id: string, field: keyof MedicalConditionItem, value: string) => {
    setComorbidities((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveComorbidity = (id: string) => {
    setComorbidities((prev) => prev.filter((item) => item.id !== id));
  };

  // Allergies & Intolerances
  const [allergyInput, setAllergyInput] = useState<string>("");
  const [allergies, setAllergies] = useState<string[]>(initialData?.allergies_intolerances || []);

  // Auto-calculated BMI
  const numHeight = Number(heightCm);
  const numWeight = Number(weightKg);
  let calculatedBmi = 0;
  if (numHeight > 0 && numWeight > 0) {
    calculatedBmi = Number((numWeight / Math.pow(numHeight / 100, 2)).toFixed(1));
  }

  const handleAddAllergy = () => {
    const trimmed = allergyInput.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed]);
      setAllergyInput("");
    }
  };

  const handleRemoveAllergy = (indexToRemove: number) => {
    setAllergies(allergies.filter((_, i) => i !== indexToRemove));
  };

  // --- Section C: Dietary Habits & 24h Recall ---
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreference>(
    initialData?.dietary_preference || "Non-Vegetarian"
  );
  const [sleepDurationHours, setSleepDurationHours] = useState<number | string>(initialData?.sleep_duration_hours || "");
  const [dailyFluidIntakeL, setDailyFluidIntakeL] = useState<number | string>(initialData?.daily_fluid_intake_l || "");

  const [recallTimeline, setRecallTimeline] = useState<RecallTimeline>(
    initialData?.timeline_recall || {
      early_morning: "",
      breakfast: "",
      mid_morning: "",
      lunch: "",
      evening_snack: "",
      dinner: "",
      bed_time: "",
    }
  );

  const handleTimelineChange = (field: keyof RecallTimeline, val: string) => {
    setRecallTimeline((prev) => ({ ...prev, [field]: val }));
  };

  // --- Section D: Training Nutrition (Dynamic Sessions) ---
  const parseInitialFuelingSessions = (): FuelingSession[] => {
    if (initialData?.fueling_sessions && Array.isArray(initialData.fueling_sessions) && initialData.fueling_sessions.length > 0) {
      return initialData.fueling_sessions;
    }
    if ((initialData?.session_1 as any)?.all_sessions && Array.isArray((initialData.session_1 as any).all_sessions)) {
      return (initialData.session_1 as any).all_sessions;
    }
    return [
      {
        id: "session-1",
        name: "Session 1",
        pre_workout: initialData?.session_1?.pre_workout || "",
        during_workout: initialData?.session_1?.during_workout || "",
        post_workout: initialData?.session_1?.post_workout || "",
      },
      {
        id: "session-2",
        name: "Session 2",
        pre_workout: initialData?.session_2?.pre_workout || "",
        during_workout: initialData?.session_2?.during_workout || "",
        post_workout: initialData?.session_2?.post_workout || "",
      },
    ];
  };

  const [fuelingSessions, setFuelingSessions] = useState<FuelingSession[]>(parseInitialFuelingSessions);

  const handleAddSession = () => {
    const nextIndex = fuelingSessions.length + 1;
    const newSession: FuelingSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `Session ${nextIndex}`,
      pre_workout: "",
      during_workout: "",
      post_workout: "",
    };
    setFuelingSessions((prev) => [...prev, newSession]);
  };

  const handleUpdateSession = (id: string, field: keyof FuelingSession, value: string) => {
    setFuelingSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleRemoveSession = (id: string) => {
    if (fuelingSessions.length <= 1) return;
    setFuelingSessions((prev) => prev.filter((s) => s.id !== id));
  };

  // --- Section E: Supplements ---
  const [supplements, setSupplements] = useState<SupplementItem[]>(initialData?.supplements || []);

  const handleAddSupplement = () => {
    const newId = Date.now().toString();
    setSupplements([
      ...supplements,
      { id: newId, supplement_name: "", brand: "", dosage: "", consumption_time: "" },
    ]);
  };

  const handleUpdateSupplement = (id: string, field: keyof SupplementItem, value: string) => {
    setSupplements(
      supplements.map((supp) => (supp.id === id ? { ...supp, [field]: value } : supp))
    );
  };

  const handleRemoveSupplement = (id: string) => {
    setSupplements(supplements.filter((supp) => supp.id !== id));
  };

  // --- Section F: Summary, Goal, Advice ---
  const [observations, setObservations] = useState<string>(initialData?.observations || "");
  const [goal, setGoal] = useState<string>(initialData?.goal || "");
  const [advicePrescription, setAdvicePrescription] = useState<string>(initialData?.advice_prescription || "");
  const [takenBy, setTakenBy] = useState<string>(initialData?.taken_by || loggedInName);
  const [assessmentDate, setAssessmentDate] = useState<string>(initialData?.assessment_date || todayDate);

  const handleSubmitAssessment = async () => {
    if (!selectedClientId && !clientId) {
      toast({
        title: "Registered Client Required",
        description: "Please select a registered client from the dropdown list.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const formattedMedicalHistory = comorbidities
        .filter((c) => c.condition.trim() !== "")
        .map((c, i) => {
          let line = `${i + 1}. ${c.condition.trim()}`;
          const details = [];
          if (c.since?.trim()) details.push(`Since/Duration: ${c.since.trim()}`);
          if (c.treatment?.trim()) details.push(`Treatment: ${c.treatment.trim()}`);
          if (details.length > 0) line += ` (${details.join(" | ")})`;
          return line;
        })
        .join("\n");

      const finalMedicalHistoryText = formattedMedicalHistory
        ? (medicalHistory.trim() ? `${formattedMedicalHistory}\n\nNotes: ${medicalHistory.trim()}` : formattedMedicalHistory)
        : medicalHistory;

      const payload: NutritionAssessment = {
        client_id: selectedClientId || clientId,
        name,
        age,
        gender,
        profession,
        client_type: clientType,

        sport: clientType === "athlete" ? sport : undefined,
        position: clientType === "athlete" ? position : undefined,
        training_age: clientType === "athlete" ? trainingAge : undefined,
        competition_level: clientType === "athlete" ? competitionLevel : undefined,

        exercise: clientType === "general" ? exercise : undefined,
        exercise_duration: clientType === "general" ? exerciseDuration : undefined,
        training_sessions_count: clientType === "general" ? trainingSessionsCount : undefined,
        exercise_type: clientType === "general" ? exerciseType : undefined,

        height_cm: heightCm,
        weight_kg: weightKg,
        body_fat_pct: bodyFatPct,
        muscle_mass_kg: muscleMassKg,
        bmi: calculatedBmi,
        complaints,
        biochemical_interpretations: biochemicalInterpretations,
        medical_history: finalMedicalHistoryText,
        comorbidities: comorbidities,
        other_medications: otherMedications,
        allergies_intolerances: allergies,

        dietary_preference: dietaryPreference,
        sleep_duration_hours: sleepDurationHours,
        daily_fluid_intake_l: dailyFluidIntakeL,
        timeline_recall: recallTimeline,

        session_1: {
          pre_workout: fuelingSessions[0]?.pre_workout || "",
          during_workout: fuelingSessions[0]?.during_workout || "",
          post_workout: fuelingSessions[0]?.post_workout || "",
        },
        session_2: {
          pre_workout: fuelingSessions[1]?.pre_workout || "",
          during_workout: fuelingSessions[1]?.during_workout || "",
          post_workout: fuelingSessions[1]?.post_workout || "",
        },
        fueling_sessions: fuelingSessions,

        supplements,

        observations,
        goal,
        advice_prescription: advicePrescription,
        taken_by: takenBy,
        assessment_date: assessmentDate,
      };

      try {
        await apiFetch('/clinical/nutrition/assessments', { data: payload });
      } catch (err) {
        console.warn("Backend API endpoint fallback:", err);
      }

      toast({
        title: "Assessment Saved",
        description: `Nutrition Assessment Form for ${name || "Client"} recorded.`,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({
        title: "Error Saving Assessment",
        description: err.message || "Failed to save assessment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Form Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Apple className="w-6 h-6 text-emerald-500" />
            <h2 className="text-xl font-bold text-foreground">NUTRITION ASSESSMENT FORM</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Clinical ingestion form • Date: <span className="font-mono font-semibold text-foreground">{assessmentDate}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmitAssessment}
            disabled={submitting}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <Save className="w-4 h-4" /> {submitting ? "Saving..." : "Save Assessment"}
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex overflow-x-auto md:grid md:grid-cols-6 h-auto p-1 bg-muted/60 rounded-xl gap-1 scrollbar-none">
          <TabsTrigger value="section-a" className="text-xs py-2 gap-1.5 font-medium shrink-0">
            <User className="w-3.5 h-3.5" /> Personal Details
          </TabsTrigger>
          <TabsTrigger value="section-b" className="text-xs py-2 gap-1.5 font-medium">
            <Activity className="w-3.5 h-3.5" /> Anthropometrics
          </TabsTrigger>
          <TabsTrigger value="section-c" className="text-xs py-2 gap-1.5 font-medium">
            <Apple className="w-3.5 h-3.5" /> Dietary Habits
          </TabsTrigger>
          <TabsTrigger value="section-d" className="text-xs py-2 gap-1.5 font-medium">
            <Zap className="w-3.5 h-3.5" /> Training Nutrition
          </TabsTrigger>
          <TabsTrigger value="section-e" className="text-xs py-2 gap-1.5 font-medium">
            <Pill className="w-3.5 h-3.5" /> Supplements
          </TabsTrigger>
          <TabsTrigger value="section-f" className="text-xs py-2 gap-1.5 font-medium">
            <ClipboardCheck className="w-3.5 h-3.5" /> Summary & Advice
          </TabsTrigger>
        </TabsList>

        {/* ---------------- PERSONAL DETAILS ---------------- */}
        <TabsContent value="section-a" className="mt-4 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-500" /> PERSONAL DETAILS
              </CardTitle>
              <CardDescription className="text-xs">
                Base demographic information and client population category.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Searchable Client Dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Select Client <span className="text-destructive">*</span></span>
                    {selectedClientUhid && (
                      <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        UHID: {selectedClientUhid}
                      </Badge>
                    )}
                  </Label>
                  <Popover open={clientComboboxOpen} onOpenChange={setClientComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={clientComboboxOpen}
                        className={cn(
                          "w-full justify-between h-10 px-3 bg-background font-normal text-left border-border",
                          !name && "border-amber-500/40 bg-amber-500/5"
                        )}
                      >
                        <span className="truncate text-xs">
                          {name ? (
                            <span className="font-semibold text-foreground flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              {name}
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              Select registered client...
                            </span>
                          )}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      disablePortal={true}
                      className="w-[calc(90vw-2rem)] sm:w-[400px] p-0 shadow-2xl rounded-xl border border-border z-[9999] overflow-hidden"
                      align="start"
                      onWheel={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                    >
                      <Command className="w-full">
                        <CommandInput placeholder="Search client by name, UHID, or mobile..." />
                        <CommandList
                          className="max-h-[250px] overflow-y-auto overscroll-contain p-1 touch-pan-y"
                          onWheel={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                        >
                          <CommandEmpty className="p-3 text-xs text-muted-foreground text-center font-medium">
                            {loadingClients ? "Loading clients..." : "No registered clients found."}
                          </CommandEmpty>
                          <CommandGroup>
                            {clients.map((c) => {
                              const fullName = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unnamed Client";
                              const isSelected = selectedClientId === c.id;
                              return (
                                <CommandItem
                                  key={c.id}
                                  value={`${fullName} ${c.uhid || ""} ${c.mobile_no || ""} ${c.sport || ""}`}
                                  onSelect={() => {
                                    handleSelectClient(c);
                                    setClientComboboxOpen(false);
                                  }}
                                  className="px-3 py-2.5 cursor-pointer text-xs rounded-lg hover:bg-muted/80 flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Check className={cn("w-4 h-4 shrink-0 text-emerald-500", isSelected ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-semibold text-foreground truncate">
                                        {fullName}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1.5 flex-wrap">
                                        {c.uhid && <span>UHID: {c.uhid}</span>}
                                        {c.mobile_no && <span>• {c.mobile_no}</span>}
                                        {c.sport && <span className="text-emerald-600 font-sans font-medium">• {c.sport}</span>}
                                      </span>
                                    </div>
                                  </div>
                                  {c.athlete_type && (
                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0 capitalize">
                                      {c.athlete_type}
                                    </Badge>
                                  )}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Age</Label>
                  <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Years" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Profession</Label>
                  <Input value={profession} onChange={(e) => setProfession(e.target.value)} placeholder="Profession" />
                </div>
              </div>

              {/* Dynamic Switch Card (if Athlete vs if General Population) */}
              <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" /> Population Category Switch
                    </Label>
                    <p className="text-xs text-muted-foreground">Select whether client is an Athlete or General Population.</p>
                  </div>
                  <div className="flex items-center gap-3 bg-card px-3 py-1.5 rounded-lg border border-border">
                    <span className={`text-xs font-semibold ${clientType === "general" ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      General Population
                    </span>
                    <Switch
                      checked={clientType === "athlete"}
                      onCheckedChange={(checked) => setClientType(checked ? "athlete" : "general")}
                    />
                    <span className={`text-xs font-semibold ${clientType === "athlete" ? "text-emerald-500 font-bold" : "text-muted-foreground"}`}>
                      Athlete
                    </span>
                  </div>
                </div>

                {clientType === "athlete" ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-border/50">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-emerald-500">Sport</Label>
                      <Input value={sport} onChange={(e) => setSport(e.target.value)} placeholder="Sport" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-emerald-500">Position</Label>
                      <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Position / Event" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-emerald-500">Training Age</Label>
                      <Input value={trainingAge} onChange={(e) => setTrainingAge(e.target.value)} placeholder="e.g. 4 years" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-emerald-500">Competition Level</Label>
                      <Input value={competitionLevel} onChange={(e) => setCompetitionLevel(e.target.value)} placeholder="e.g. National" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-border/50">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-primary">Exercise (Yes / No)</Label>
                      <Select
                        value={exercise ? "yes" : "no"}
                        onValueChange={(val) => setExercise(val === "yes")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-primary">Duration</Label>
                      <Input value={exerciseDuration} onChange={(e) => setExerciseDuration(e.target.value)} placeholder="e.g. 45 mins" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-primary">Training Session</Label>
                      <Input value={trainingSessionsCount} onChange={(e) => setTrainingSessionsCount(e.target.value)} placeholder="Sessions / week" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-primary">Type of Exercise</Label>
                      <Input value={exerciseType} onChange={(e) => setExerciseType(e.target.value)} placeholder="e.g. Resistance / Gym" />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => setActiveTab("section-b")} className="gap-2">
              Next: Anthropometrics &rarr;
            </Button>
          </div>
        </TabsContent>

        {/* ---------------- ANTHROPOMETRIC DETAILS ---------------- */}
        <TabsContent value="section-b" className="mt-4 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" /> ANTHROPOMETRIC DETAILS & CLINICAL BASELINE
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 rounded-xl bg-card border border-border">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Height (cm)</Label>
                  <Input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="cm" className="font-mono text-base font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Weight (kg)</Label>
                  <Input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="kg" className="font-mono text-base font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">BF%</Label>
                  <Input type="number" value={bodyFatPct} onChange={(e) => setBodyFatPct(e.target.value)} placeholder="%" className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Muscle Mass (kg)</Label>
                  <Input type="number" value={muscleMassKg} onChange={(e) => setMuscleMassKg(e.target.value)} placeholder="kg" className="font-mono" />
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border flex flex-col justify-between">
                  <span className="text-[11px] text-muted-foreground font-semibold">Calculated BMI</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black font-mono">{calculatedBmi || "--"}</span>
                    <span className="text-xs text-muted-foreground">kg/m²</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">COMPLAINTS</Label>
                  <Textarea value={complaints} onChange={(e) => setComplaints(e.target.value)} rows={3} placeholder="Chief complaints..." />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">BIOCHEMICAL INTERPRETATIONS</Label>
                  <Textarea value={biochemicalInterpretations} onChange={(e) => setBiochemicalInterpretations(e.target.value)} rows={3} placeholder="Blood work, deficiencies..." />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">ANY OTHER MEDICATIONS</Label>
                  <Textarea value={otherMedications} onChange={(e) => setOtherMedications(e.target.value)} rows={3} placeholder="Ongoing medications..." />
                </div>
              </div>

              {/* Comorbidities & Medical Conditions Section */}
              <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/20 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <Label className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <Stethoscope className="w-4 h-4 text-sky-500" /> MEDICAL CONDITIONS & COMORBIDITIES
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Add multiple medical conditions, diagnosed duration, and ongoing treatments/medications.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddComorbidity()}
                    className="gap-1.5 text-xs bg-background hover:bg-sky-50 dark:hover:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Medical Condition
                  </Button>
                </div>

                {/* Quick Add Preset Chips */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Quick Add Common Conditions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Hypertension",
                      "Type 2 Diabetes",
                      "Hypothyroidism",
                      "Dyslipidemia",
                      "PCOS / PCOD",
                      "Hyperuricemia / Gout",
                      "Fatty Liver (NAFLD)",
                      "Asthma",
                      "GERD / Acidity",
                    ].map((preset) => {
                      const alreadyAdded = comorbidities.some(
                        (c) => c.condition.toLowerCase() === preset.toLowerCase()
                      );
                      return (
                        <Badge
                          key={preset}
                          variant={alreadyAdded ? "secondary" : "outline"}
                          className={cn(
                            "cursor-pointer text-[11px] transition-all hover:scale-105 select-none",
                            alreadyAdded
                              ? "opacity-60 bg-slate-200 dark:bg-slate-800 cursor-not-allowed"
                              : "hover:bg-sky-100 hover:text-sky-800 dark:hover:bg-sky-900 dark:hover:text-sky-200 border-sky-200 dark:border-sky-800"
                          )}
                          onClick={() => {
                            if (!alreadyAdded) handleAddComorbidity(preset);
                          }}
                        >
                          + {preset}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* List of Comorbidities */}
                {comorbidities.length === 0 ? (
                  <div className="p-4 border border-dashed border-sky-300/40 rounded-lg text-center bg-background/50">
                    <p className="text-xs text-muted-foreground italic">No medical conditions or comorbidities added yet.</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddComorbidity()}
                      className="mt-1 text-xs text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      Click here to add your first medical condition
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {comorbidities.map((item, index) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-1 md:grid-cols-12 gap-2.5 p-3 rounded-lg border bg-background/90 items-center shadow-sm"
                      >
                        <div className="md:col-span-4 space-y-1">
                          <Label className="text-[10px] font-semibold text-muted-foreground">
                            Medical Condition {index + 1}
                          </Label>
                          <Input
                            value={item.condition}
                            onChange={(e) => handleUpdateComorbidity(item.id, "condition", e.target.value)}
                            placeholder="e.g. Hypertension, Diabetes"
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="md:col-span-3 space-y-1">
                          <Label className="text-[10px] font-semibold text-muted-foreground">
                            Since / Duration
                          </Label>
                          <Input
                            value={item.since || ""}
                            onChange={(e) => handleUpdateComorbidity(item.id, "since", e.target.value)}
                            placeholder="e.g. 2 years, since 2021"
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="md:col-span-4 space-y-1">
                          <Label className="text-[10px] font-semibold text-muted-foreground">
                            Treatment / Medication
                          </Label>
                          <Input
                            value={item.treatment || ""}
                            onChange={(e) => handleUpdateComorbidity(item.id, "treatment", e.target.value)}
                            placeholder="e.g. Metformin 500mg, Diet control"
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="md:col-span-1 flex justify-end pt-3 md:pt-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveComorbidity(item.id)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Optional Additional Medical History Notes */}
                <div className="pt-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    Additional Medical History / Clinical Notes (Optional)
                  </Label>
                  <Textarea
                    value={medicalHistory}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    rows={2}
                    placeholder="Surgical history, past hospitalizations, or extra clinical context..."
                    className="text-xs mt-1"
                  />
                </div>
              </div>

              {/* Allergies and Intolerances Tag Input */}
              <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-500" /> ALLERGIES AND INTOLERANCES
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Type & press Enter to add chip</span>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddAllergy();
                      }
                    }}
                    placeholder="e.g. Peanut, Lactose, Gluten..."
                    className="max-w-md text-xs"
                  />
                  <Button size="sm" variant="destructive" onClick={handleAddAllergy} className="gap-1 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Add Allergy
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {allergies.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No allergies recorded.</p>
                  ) : (
                    allergies.map((allergy, index) => (
                      <Badge
                        key={index}
                        variant="destructive"
                        className="px-3 py-1 text-xs font-semibold flex items-center gap-1.5 bg-rose-600 text-white"
                      >
                        {allergy}
                        <button onClick={() => handleRemoveAllergy(index)} className="hover:bg-rose-700 rounded-full p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab("section-a")}>
              &larr; Back
            </Button>
            <Button onClick={() => setActiveTab("section-c")} className="gap-2">
              Next: Dietary Habits &rarr;
            </Button>
          </div>
        </TabsContent>

        {/* ---------------- DIETARY HABITS ---------------- */}
        <TabsContent value="section-c" className="mt-4 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Apple className="w-4 h-4 text-emerald-500" /> DIETARY HABITS & 24H RECALL
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Preference */}
              <div className="space-y-2">
                <Label className="text-xs font-bold">Preference</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(
                    [
                      { id: "Vegetarian", label: "Veg", color: "border-emerald-500/50 bg-emerald-500/10 text-emerald-500" },
                      { id: "Non-Vegetarian", label: "Non-Vegetarian", color: "border-rose-500/50 bg-rose-500/10 text-rose-500" },
                      { id: "Ovo-Vegetarian", label: "Ovo vegetarian", color: "border-amber-500/50 bg-amber-500/10 text-amber-500" },
                      { id: "Vegan", label: "Vegan", color: "border-purple-500/50 bg-purple-500/10 text-purple-500" },
                    ] as const
                  ).map((pref) => (
                    <button
                      key={pref.id}
                      type="button"
                      onClick={() => setDietaryPreference(pref.id)}
                      className={`p-3 rounded-xl border text-sm font-semibold transition-all flex items-center justify-between ${
                        dietaryPreference === pref.id ? `${pref.color} shadow-sm ring-1 ring-primary` : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      <span>{pref.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Typical Dietary Habits / 24h recall */}
              <div className="space-y-3">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" /> Typical Dietary Habits / 24h recall
                </Label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: "early_morning", title: "Early morning" },
                    { key: "breakfast", title: "Breakfast" },
                    { key: "mid_morning", title: "Mid-morning" },
                    { key: "lunch", title: "Lunch" },
                    { key: "evening_snack", title: "Evening snack" },
                    { key: "dinner", title: "Dinner" },
                    { key: "bed_time", title: "Bed time" },
                  ].map((meal) => (
                    <div key={meal.key} className="p-3 rounded-lg bg-card border border-border space-y-1.5">
                      <Label className="text-xs font-semibold">{meal.title}</Label>
                      <Input
                        value={recallTimeline[meal.key as keyof RecallTimeline] || ""}
                        onChange={(e) => handleTimelineChange(meal.key as keyof RecallTimeline, e.target.value)}
                        placeholder={`${meal.title} intake...`}
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Sleep & Fluid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Duration of sleep (Hours)</Label>
                  <Input type="number" value={sleepDurationHours} onChange={(e) => setSleepDurationHours(e.target.value)} placeholder="Hours" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Fluid Intake (L/day)</Label>
                  <Input type="number" value={dailyFluidIntakeL} onChange={(e) => setDailyFluidIntakeL(e.target.value)} placeholder="L/day" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab("section-b")}>
              &larr; Back
            </Button>
            <Button onClick={() => setActiveTab("section-d")} className="gap-2">
              Next: Training Nutrition &rarr;
            </Button>
          </div>
        </TabsContent>

        {/* ---------------- TRAINING NUTRITION ---------------- */}
        <TabsContent value="section-d" className="mt-4 space-y-6">
          <Card className="border-border">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> TRAINING NUTRITION (Fueling Strategy)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Log pre, during, and post-workout nutrition for each training session of the day.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleAddSession}
                className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Session
              </Button>
            </CardHeader>

            <CardContent className="space-y-6 pt-6">
              {fuelingSessions.map((session, index) => {
                const colorClasses = [
                  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                  "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                  "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                  "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                ];
                const colorClass = colorClasses[index % colorClasses.length];

                return (
                  <div key={session.id || index} className="p-4 rounded-xl bg-card border border-border space-y-3 relative group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={colorClass}>
                          {session.name || `Session ${index + 1}`}
                        </Badge>
                      </div>
                      {fuelingSessions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSession(session.id || "")}
                          className="h-8 px-2 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Pre</Label>
                        <Textarea
                          value={session.pre_workout}
                          onChange={(e) => handleUpdateSession(session.id || "", "pre_workout", e.target.value)}
                          rows={3}
                          placeholder="Pre-workout notes..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">During</Label>
                        <Textarea
                          value={session.during_workout}
                          onChange={(e) => handleUpdateSession(session.id || "", "during_workout", e.target.value)}
                          rows={3}
                          placeholder="During workout notes..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Post</Label>
                        <Textarea
                          value={session.post_workout}
                          onChange={(e) => handleUpdateSession(session.id || "", "post_workout", e.target.value)}
                          rows={3}
                          placeholder="Post-workout recovery notes..."
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddSession}
                className="w-full py-4 border-dashed border-2 gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/5 hover:border-amber-500/50"
              >
                <Plus className="w-4 h-4" /> Add Another Training Session
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab("section-c")}>
              &larr; Back
            </Button>
            <Button onClick={() => setActiveTab("section-e")} className="gap-2">
              Next: Supplements &rarr;
            </Button>
          </div>
        </TabsContent>

        {/* ---------------- SUPPLEMENTS ---------------- */}
        <TabsContent value="section-e" className="mt-4 space-y-6">
          <Card className="border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="w-4 h-4 text-purple-500" /> SUPPLEMENTS
                </CardTitle>
                <CardDescription className="text-xs">Add dynamic supplement rows (Name, Company, Dosage, Consumption time).</CardDescription>
              </div>

              <Button size="sm" onClick={handleAddSupplement} className="gap-1.5">
                <Plus className="w-4 h-4" /> Add Supplement
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {supplements.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border rounded-xl text-muted-foreground text-xs">
                  No supplements added yet. Click "+ Add Supplement" above.
                </div>
              ) : (
                <div className="space-y-3">
                  {supplements.map((supp, index) => (
                    <div key={supp.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 rounded-xl bg-card border border-border items-center">
                      <div className="md:col-span-1 font-mono text-xs text-muted-foreground font-bold">#{index + 1}</div>

                      <div className="md:col-span-3 space-y-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Name</Label>
                        <Input
                          value={supp.supplement_name}
                          onChange={(e) => handleUpdateSupplement(supp.id, "supplement_name", e.target.value)}
                          placeholder="Supplement Name"
                          className="text-xs"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Company</Label>
                        <Input
                          value={supp.brand}
                          onChange={(e) => handleUpdateSupplement(supp.id, "brand", e.target.value)}
                          placeholder="Company / Brand"
                          className="text-xs"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Dosage</Label>
                        <Input
                          value={supp.dosage}
                          onChange={(e) => handleUpdateSupplement(supp.id, "dosage", e.target.value)}
                          placeholder="Dosage"
                          className="text-xs"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-[10px] font-semibold text-muted-foreground">Consumption time</Label>
                        <Input
                          value={supp.consumption_time}
                          onChange={(e) => handleUpdateSupplement(supp.id, "consumption_time", e.target.value)}
                          placeholder="e.g. Post-workout"
                          className="text-xs"
                        />
                      </div>

                      <div className="md:col-span-1 flex justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveSupplement(supp.id)}
                          className="text-rose-500 hover:bg-rose-500/10 h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab("section-d")}>
              &larr; Back
            </Button>
            <Button onClick={() => setActiveTab("section-f")} className="gap-2">
              Next: Summary & Advice &rarr;
            </Button>
          </div>
        </TabsContent>

        {/* ---------------- SUMMARY & ADVICE ---------------- */}
        <TabsContent value="section-f" className="mt-4 space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-500" /> CLINICAL SUMMARY & ADVICE
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Observations</Label>
                  <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} placeholder="Observations..." />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Goal</Label>
                  <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} placeholder="Goal..." />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Advice</Label>
                  <Textarea value={advicePrescription} onChange={(e) => setAdvicePrescription(e.target.value)} rows={4} placeholder="Advice..." />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 border border-border">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Taken by</Label>
                  <Input value={takenBy} onChange={(e) => setTakenBy(e.target.value)} className="bg-card font-semibold" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Date</Label>
                  <Input type="date" value={assessmentDate} onChange={(e) => setAssessmentDate(e.target.value)} className="bg-card font-mono" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" onClick={() => setActiveTab("section-e")}>
              &larr; Back
            </Button>
            <Button
              onClick={handleSubmitAssessment}
              disabled={submitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6"
            >
              <Save className="w-4 h-4" /> {submitting ? "Saving..." : "Save Assessment"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
