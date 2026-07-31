import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Apple,
  ArrowLeft,
  Flame,
  Dumbbell,
  Wheat,
  Droplets,
  AlertCircle,
  Clock,
  Pill,
  Zap,
  Activity,
  Plus,
  FileText,
  Calendar,
  Sparkles,
  TrendingUp,
  User,
  Phone,
  Mail,
  Heart,
  Briefcase,
  ShieldAlert,
  Printer,
  Eye,
} from "lucide-react";
import { apiFetch } from "@/utils/api";
import NutritionAssessmentForm from "@/components/nutrition/NutritionAssessmentForm";
import NutritionAssessmentViewer, { formatDateDDMMYYYY } from "@/components/nutrition/NutritionAssessmentViewer";
import MealPlanEditorModal from "@/components/nutrition/MealPlanEditorModal";
import type { NutritionAssessment } from "@/types/nutrition";

export default function NutritionistClientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<any | null>(null);
  const [latestAssessment, setLatestAssessment] = useState<NutritionAssessment | null>(null);
  const [assessments, setAssessments] = useState<NutritionAssessment[]>([]);

  // Modals
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [mealPlanModalOpen, setMealPlanModalOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<NutritionAssessment | null>(null);
  const [activeTab, setActiveTab] = useState("diet");

  const fetchClientProfile = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await apiFetch<any>(`/clinical/nutrition/clients/${id}`);
      if (data) {
        setClientData(data.client || null);
        setLatestAssessment(data.latestAssessment || null);
        setAssessments(data.assessments || []);
      }
    } catch (err) {
      console.warn("Error fetching client profile from nutrition endpoint:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientProfile();
  }, [id]);

  const clientName = clientData
    ? `${clientData.first_name || ""} ${clientData.last_name || ""}`.trim()
    : "Client Profile";

  const uhid = clientData?.uhid || "N/A";
  const mobile = clientData?.mobile_no || "--";
  const email = clientData?.email || "--";
  const gender = clientData?.gender || "--";
  const age = clientData?.age || (clientData?.dob ? new Date().getFullYear() - new Date(clientData.dob).getFullYear() : "--");
  const bloodGroup = clientData?.blood_group || "--";
  const occupation = clientData?.occupation || clientData?.profession || "--";
  const sport = clientData?.sport || "--";
  const registeredOn = clientData?.registered_on ? new Date(clientData.registered_on).toISOString().split("T")[0] : "--";

  const preference = latestAssessment?.dietary_preference || "Not Set";
  const allergies = latestAssessment?.allergies_intolerances || (clientData?.allergies ? [clientData.allergies] : []);

  const getPreferenceBadge = (pref: string) => {
    switch (pref) {
      case "Vegetarian":
      case "Veg":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Veg</Badge>;
      case "Non-Vegetarian":
        return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20">Non-Veg</Badge>;
      case "Ovo-Vegetarian":
      case "Ovo vegetarian":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Ovo vegetarian</Badge>;
      case "Vegan":
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Vegan</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">{pref || "Not Set"}</Badge>;
    }
  };

  return (
    <DashboardLayout role="nutritionist">
      <div className="space-y-6 pb-12">
        {/* Navigation Back Link */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => navigate("/nutritionist/clients")}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Nutrition Clients Directory
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setMealPlanModalOpen(true)}
              className="gap-2 text-xs"
            >
              <Flame className="w-4 h-4 text-amber-500" /> Edit Meal Plan
            </Button>
            <Button
              onClick={() => setAssessmentModalOpen(true)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
            >
              <Plus className="w-4 h-4" /> New Nutrition Assessment
            </Button>
          </div>
        </div>

        {/* 1. BASIC INFORMATION FIRST */}
        <Card className="border-border">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">{clientName}</h1>
                  <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/20">
                    {uhid}
                  </Badge>
                  {getPreferenceBadge(preference)}
                  <Badge variant="secondary" className="capitalize text-xs">
                    {latestAssessment?.client_type || (sport !== "--" ? "Athlete" : "General Population")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Organization Client Profile • Registered: <span className="font-mono font-medium text-foreground">{registeredOn}</span>
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {/* Basic Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
              <div className="space-y-1 p-2.5 rounded-lg bg-muted/30">
                <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <User className="w-3.5 h-3.5" /> Gender / Age
                </span>
                <span className="font-semibold text-foreground">{gender} / {age} yrs</span>
              </div>

              <div className="space-y-1 p-2.5 rounded-lg bg-muted/30">
                <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <Phone className="w-3.5 h-3.5" /> Mobile
                </span>
                <span className="font-semibold text-foreground font-mono">{mobile}</span>
              </div>

              <div className="space-y-1 p-2.5 rounded-lg bg-muted/30">
                <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <Mail className="w-3.5 h-3.5" /> Email
                </span>
                <span className="font-semibold text-foreground truncate block" title={email}>{email}</span>
              </div>

              <div className="space-y-1 p-2.5 rounded-lg bg-muted/30">
                <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <Heart className="w-3.5 h-3.5 text-rose-500" /> Blood Group
                </span>
                <span className="font-semibold text-foreground font-mono">{bloodGroup}</span>
              </div>

              <div className="space-y-1 p-2.5 rounded-lg bg-muted/30">
                <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <Briefcase className="w-3.5 h-3.5" /> Profession
                </span>
                <span className="font-semibold text-foreground">{occupation}</span>
              </div>

              <div className="space-y-1 p-2.5 rounded-lg bg-muted/30">
                <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" /> Sport / Goal
                </span>
                <span className="font-semibold text-foreground">{sport}</span>
              </div>
            </div>

            {/* Allergies & Intolerances Warning Box */}
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="font-bold text-rose-500">Allergies and Intolerances:</span>
              </div>

              {allergies && allergies.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {allergies.map((alg: string, idx: number) => (
                    <Badge key={idx} variant="destructive" className="text-[10px] font-semibold">
                      {alg}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground italic">No allergies or intolerances recorded.</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. ANTHROPOMETRICS & CLINICAL SUMMARY CARD */}
        {latestAssessment && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" /> Anthropometrics & Clinical Baseline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-xl bg-card border border-border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Height</span>
                  <span className="font-bold text-foreground text-sm font-mono">{latestAssessment.height_cm ? `${latestAssessment.height_cm} cm` : "--"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Weight</span>
                  <span className="font-bold text-foreground text-sm font-mono">{latestAssessment.weight_kg ? `${latestAssessment.weight_kg} kg` : "--"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Body Fat %</span>
                  <span className="font-bold text-foreground text-sm font-mono">{latestAssessment.body_fat_pct ? `${latestAssessment.body_fat_pct}%` : "--"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Muscle Mass</span>
                  <span className="font-bold text-foreground text-sm font-mono">{latestAssessment.muscle_mass_kg ? `${latestAssessment.muscle_mass_kg} kg` : "--"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Calculated BMI</span>
                  <span className="font-bold text-emerald-500 text-sm font-mono">{latestAssessment.bmi ? `${latestAssessment.bmi} kg/m²` : "--"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                  <span className="font-bold text-foreground block text-[11px]">COMPLAINTS:</span>
                  <p className="text-muted-foreground">{latestAssessment.complaints || "None reported."}</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                  <span className="font-bold text-foreground block text-[11px]">BIOCHEMICAL INTERPRETATIONS:</span>
                  <p className="text-muted-foreground">{latestAssessment.biochemical_interpretations || "None recorded."}</p>
                </div>
                <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                  <span className="font-bold text-foreground block text-[11px]">MEDICAL CONDITIONS & COMORBIDITIES:</span>
                  {latestAssessment.comorbidities && latestAssessment.comorbidities.length > 0 ? (
                    <div className="flex flex-col gap-1 pt-1">
                      {latestAssessment.comorbidities.map((item, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">• {item.condition}</span>
                          {item.since && <span> (Since: {item.since})</span>}
                          {item.treatment && <span className="italic"> - Tx: {item.treatment}</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground whitespace-pre-wrap">{latestAssessment.medical_history || "None recorded."}</p>
                  )}
                </div>
                <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                  <span className="font-bold text-foreground block text-[11px]">OTHER MEDICATIONS:</span>
                  <p className="text-muted-foreground">{latestAssessment.other_medications || "None."}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. NUTRITION STRATEGY TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/60 rounded-xl gap-1">
            <TabsTrigger value="diet" className="text-xs py-2 gap-1.5 font-medium">
              <Apple className="w-3.5 h-3.5" /> Dietary Habits & 24h Recall
            </TabsTrigger>
            <TabsTrigger value="fueling" className="text-xs py-2 gap-1.5 font-medium">
              <Zap className="w-3.5 h-3.5" /> Training Nutrition
            </TabsTrigger>
            <TabsTrigger value="supplements" className="text-xs py-2 gap-1.5 font-medium">
              <Pill className="w-3.5 h-3.5" /> Prescribed Supplements
            </TabsTrigger>
            <TabsTrigger value="assessments" className="text-xs py-2 gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5" /> Ingested Assessments ({assessments.length})
            </TabsTrigger>
          </TabsList>

          {/* DIETARY HABITS & 24H RECALL TAB */}
          <TabsContent value="diet" className="mt-4 space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" /> Typical Dietary Habits / 24h Recall
                </CardTitle>
                <CardDescription className="text-xs">
                  Daily meal timeline recall and fluid / sleep habits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between p-3 rounded-lg bg-card border border-border text-xs gap-3">
                  <div>
                    <span className="text-muted-foreground mr-2 font-medium">Diet Preference:</span>
                    {getPreferenceBadge(preference)}
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-2 font-medium">Duration of Sleep:</span>
                    <strong className="font-mono">{latestAssessment?.sleep_duration_hours ? `${latestAssessment.sleep_duration_hours} hours` : "Not specified"}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-2 font-medium">Fluid Intake:</span>
                    <strong className="font-mono">{latestAssessment?.daily_fluid_intake_l ? `${latestAssessment.daily_fluid_intake_l} L/day` : "Not specified"}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { title: "Early morning", detail: latestAssessment?.timeline_recall?.early_morning },
                    { title: "Breakfast", detail: latestAssessment?.timeline_recall?.breakfast },
                    { title: "Mid-morning", detail: latestAssessment?.timeline_recall?.mid_morning },
                    { title: "Lunch", detail: latestAssessment?.timeline_recall?.lunch },
                    { title: "Evening snack", detail: latestAssessment?.timeline_recall?.evening_snack },
                    { title: "Dinner", detail: latestAssessment?.timeline_recall?.dinner },
                    { title: "Bed time", detail: latestAssessment?.timeline_recall?.bed_time },
                  ].map((meal, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-card border border-border space-y-1 text-xs">
                      <span className="font-bold text-primary block">{meal.title}</span>
                      <p className="text-muted-foreground">{meal.detail || "Not recorded."}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TRAINING NUTRITION TAB */}
          <TabsContent value="fueling" className="mt-4 space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" /> Training Nutrition (Fueling Strategy)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                  <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Session 1</Badge>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                      <span className="font-bold text-foreground">Pre</span>
                      <p className="text-muted-foreground">{latestAssessment?.session_1?.pre_workout || "None recorded."}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                      <span className="font-bold text-foreground">During</span>
                      <p className="text-muted-foreground">{latestAssessment?.session_1?.during_workout || "None recorded."}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                      <span className="font-bold text-foreground">Post</span>
                      <p className="text-muted-foreground">{latestAssessment?.session_1?.post_workout || "None recorded."}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Session 2</Badge>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                      <span className="font-bold text-foreground">Pre</span>
                      <p className="text-muted-foreground">{latestAssessment?.session_2?.pre_workout || "None recorded."}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                      <span className="font-bold text-foreground">During</span>
                      <p className="text-muted-foreground">{latestAssessment?.session_2?.during_workout || "None recorded."}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 space-y-1">
                      <span className="font-bold text-foreground">Post</span>
                      <p className="text-muted-foreground">{latestAssessment?.session_2?.post_workout || "None recorded."}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SUPPLEMENTS TAB */}
          <TabsContent value="supplements" className="mt-4 space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Pill className="w-4 h-4 text-purple-500" /> Prescribed Supplement Stack
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {latestAssessment?.supplements && latestAssessment.supplements.length > 0 ? (
                  latestAssessment.supplements.map((supp, index) => (
                    <div key={index} className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-foreground">{supp.supplement_name || "--"}</span>
                        <span className="text-muted-foreground block text-[10px]">Company: {supp.brand || "--"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-primary font-semibold">Dosage: {supp.dosage || "--"}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          Consumption time: {supp.consumption_time || "--"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic py-4 text-center">No active supplements recorded.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* CLINICAL ASSESSMENTS HISTORY TAB */}
          <TabsContent value="assessments" className="mt-4 space-y-6">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" /> Assessment Records History
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Completed NUTRITION ASSESSMENT FORMS for {clientName}.
                  </CardDescription>
                </div>
                <Button onClick={() => setAssessmentModalOpen(true)} size="sm" className="gap-1.5 bg-emerald-600 text-white">
                  <Plus className="w-4 h-4" /> New Assessment
                </Button>
              </CardHeader>

              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Date</TableHead>
                      <TableHead className="text-xs font-bold">Category</TableHead>
                      <TableHead className="text-xs font-bold">Preference</TableHead>
                      <TableHead className="text-xs font-bold">Height / Weight</TableHead>
                      <TableHead className="text-xs font-bold">BMI</TableHead>
                      <TableHead className="text-xs font-bold">Taken by</TableHead>
                      <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {assessments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                          No nutrition assessments logged yet. Click "+ New Assessment" above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      assessments.map((ass, idx) => (
                        <TableRow key={ass.id || idx} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-mono text-xs font-bold">{formatDateDDMMYYYY(ass.assessment_date)}</TableCell>

                          <TableCell>
                            <Badge variant="outline" className="capitalize text-[10px]">
                              {ass.client_type}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            {getPreferenceBadge(ass.dietary_preference)}
                          </TableCell>

                          <TableCell className="text-xs font-mono">
                            {ass.height_cm ? `${ass.height_cm} cm` : "--"} / {ass.weight_kg ? `${ass.weight_kg} kg` : "--"}
                          </TableCell>

                          <TableCell className="text-xs font-mono font-bold text-emerald-500">
                            {ass.bmi ? `${ass.bmi} kg/m²` : "--"}
                          </TableCell>

                          <TableCell className="text-xs font-medium">{ass.taken_by}</TableCell>

                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedAssessment(ass);
                                setViewerOpen(true);
                              }}
                              className="h-8 text-xs gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Form
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ---------------- NEW ASSESSMENT FORM DIALOG ---------------- */}
        <Dialog open={assessmentModalOpen} onOpenChange={setAssessmentModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto bg-card border-border p-4 sm:p-6">
            <DialogHeader className="sr-only">
              <DialogTitle>NUTRITION ASSESSMENT FORM</DialogTitle>
            </DialogHeader>
            <NutritionAssessmentForm
              clientId={clientData?.id}
              clientName={clientName}
              clientUhid={uhid}
              initialData={{
                name: clientName,
                gender: gender !== "--" ? gender : "Male",
                profession: occupation !== "--" ? occupation : "",
                sport: sport !== "--" ? sport : "",
                dietary_preference: preference === "Not Set" ? "Non-Vegetarian" : preference,
                allergies_intolerances: allergies,
              }}
              onSuccess={() => {
                setAssessmentModalOpen(false);
                fetchClientProfile();
              }}
              onCancel={() => setAssessmentModalOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* ---------------- ASSESSMENT REPORT VIEWER ---------------- */}
        <NutritionAssessmentViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          assessment={selectedAssessment}
        />

        {/* ---------------- MEAL PLAN MACRO EDITOR MODAL ---------------- */}
        <MealPlanEditorModal
          open={mealPlanModalOpen}
          onOpenChange={setMealPlanModalOpen}
          client={{
            id: clientData?.id || "",
            name: clientName,
            uhid: uhid,
            sport_or_goal: sport !== "--" ? sport : occupation,
            preference: preference,
            last_assessment_date: latestAssessment?.assessment_date || null,
            next_follow_up: null,
            client_type: latestAssessment?.client_type || "athlete",
            allergies: allergies,
            adherence_rate: 80,
            status: "Active",
          }}
        />
      </div>
    </DashboardLayout>
  );
}
