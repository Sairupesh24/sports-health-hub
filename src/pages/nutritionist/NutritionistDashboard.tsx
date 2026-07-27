import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Users,
  Calendar,
  Plus,
  Apple,
  Flame,
  Eye,
  Clock,
  ArrowRight,
  UserPlus,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { NutritionClient, NutritionDashboardStats, NutritionAssessment, TodayAppointment, RecentRegistrationClient } from "@/types/nutrition";
import NutritionAssessmentForm from "@/components/nutrition/NutritionAssessmentForm";
import NutritionClientTimeline from "@/components/nutrition/NutritionClientTimeline";
import MealPlanEditorModal from "@/components/nutrition/MealPlanEditorModal";
import NutritionAssessmentViewer from "@/components/nutrition/NutritionAssessmentViewer";
import NutritionistBookAppointmentModal from "@/components/nutrition/NutritionistBookAppointmentModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function getRelativeTimeString(dateStr: string | null): string {
  if (!dateStr) return "Recently";
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

export default function NutritionistDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<NutritionDashboardStats>({
    totalActiveDietClients: 0,
    consultationsScheduledToday: 0,
    avgAdherenceRate: 0,
    criticalAlertsCount: 0,
    todayAppointments: [],
    latestRegisteredClient: null,
    recentRegistrations: [],
    clients: [],
  });

  // Modal States
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [mealPlanModalOpen, setMealPlanModalOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [bookModalOpen, setBookModalOpen] = useState(false);

  const [selectedClient, setSelectedClient] = useState<NutritionClient | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<NutritionAssessment | null>(null);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<NutritionDashboardStats>("/clinical/nutrition/dashboard/stats");
      if (data) {
        setStats(data);
      }
    } catch (err) {
      console.warn("Error fetching nutrition dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const handleOpenNewAssessment = (clientId?: string, clientName?: string, clientUhid?: string) => {
    setSelectedClient({
      id: clientId || "",
      name: clientName || "",
      uhid: clientUhid || "",
      sport_or_goal: "",
      preference: "Not Set",
      last_assessment_date: null,
      next_follow_up: null,
      client_type: "general",
      allergies: [],
      adherence_rate: 0,
      status: "Active",
    });
    setAssessmentModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const s = (status || "pending").toLowerCase();
    if (s === "completed") {
      return <Badge variant="secondary" className="text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5">completed</Badge>;
    }
    if (s === "in_progress" || s === "in progress") {
      return <Badge className="text-[11px] font-medium bg-blue-500/10 text-blue-500 border-blue-500/20 px-2 py-0.5">in progress</Badge>;
    }
    return <Badge className="text-[11px] font-medium bg-amber-500/10 text-amber-600 border-amber-500/20 px-2 py-0.5">pending</Badge>;
  };

  const todayAppointments = stats.todayAppointments || [];
  const recentRegistrations = stats.recentRegistrations || [];

  return (
    <DashboardLayout role="nutritionist">
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Nutritionist Console</h1>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-mono">
                ISHPO Clinical
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Welcome back,{" "}
              <strong className="text-foreground">
                {profile ? `${profile.first_name} ${profile.last_name}` : "Nutritionist"}
              </strong>
              . Daily consultations overview for <span className="font-mono font-medium text-foreground">{todayStr}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => setBookModalOpen(true)}
              className="gap-2 text-xs border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
            >
              <Calendar className="w-4 h-4 text-emerald-500" /> Schedule Consultation
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/nutritionist/clients")}
              className="gap-2 text-xs"
            >
              <Users className="w-4 h-4" /> View All Nutrition Clients
            </Button>
            <Button onClick={() => handleOpenNewAssessment()} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs">
              <Plus className="w-4 h-4" /> New Assessment Form
            </Button>
          </div>
        </div>

        {/* MAIN DASHBOARD: TWO SIDE-BY-SIDE PANELS (Today's Appointments + Recent Activity) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT PANEL: Today's Appointments */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-500" /> Today's Appointments
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {todayAppointments.length} sessions
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-3 max-h-[600px] overflow-y-auto">
              {todayAppointments.length === 0 ? (
                <div className="text-center py-12 space-y-3 text-muted-foreground text-xs">
                  <Calendar className="w-8 h-8 mx-auto text-muted-foreground/40" />
                  <p className="font-semibold text-foreground">No consultations scheduled for today.</p>
                  <p className="max-w-xs mx-auto text-muted-foreground">
                    Click below to schedule a new appointment or view the full client directory.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setBookModalOpen(true)}
                    className="mt-2 text-xs gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Schedule Consultation
                  </Button>
                </div>
              ) : (
                todayAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    onClick={() => navigate(`/nutritionist/clients/${apt.client_id}`)}
                    className="p-3.5 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border/70 flex items-center justify-between gap-4 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="font-mono text-sm font-bold text-emerald-500 shrink-0">
                        {apt.scheduled_start ? format(new Date(apt.scheduled_start), "HH:mm") : "--:--"}
                      </span>

                      <div className="min-w-0">
                        <div className="font-bold text-sm text-foreground group-hover:text-emerald-500 transition-colors truncate">
                          {apt.client_name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {apt.service_type || "Training / Consultation"}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {getStatusBadge(apt.status)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* RIGHT PANEL: Recent Activity */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  Recent Activity
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/nutritionist/clients")}
                  className="text-xs text-muted-foreground hover:text-foreground gap-1 h-7 px-2"
                >
                  View Clients <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="pt-2 space-y-1 max-h-[600px] overflow-y-auto">
              {recentRegistrations.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  No recent client registration activity.
                </div>
              ) : (
                recentRegistrations.map((reg) => (
                  <div
                    key={reg.id}
                    onClick={() => navigate(`/nutritionist/clients/${reg.id}`)}
                    className="flex items-center justify-between py-3 px-2 border-b border-border/40 last:border-0 hover:bg-muted/40 rounded-lg cursor-pointer transition-all group"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-foreground group-hover:text-emerald-500 transition-colors">
                          New client registered
                        </div>
                        <div className="text-xs font-bold text-muted-foreground uppercase truncate mt-0.5">
                          {reg.name}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground font-medium shrink-0 pl-2">
                      {getRelativeTimeString(reg.registered_on)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---------------- BOOK APPOINTMENT MODAL ---------------- */}
        <NutritionistBookAppointmentModal
          open={bookModalOpen}
          onOpenChange={setBookModalOpen}
          defaultDate={new Date()}
          onSuccess={() => fetchDashboardStats()}
        />

        {/* ---------------- NEW ASSESSMENT FORM DIALOG ---------------- */}
        <Dialog open={assessmentModalOpen} onOpenChange={setAssessmentModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto bg-card border-border p-4 sm:p-6">
            <DialogHeader className="sr-only">
              <DialogTitle>NUTRITION ASSESSMENT FORM</DialogTitle>
            </DialogHeader>

            <NutritionAssessmentForm
              clientId={selectedClient?.id}
              clientName={selectedClient?.name}
              clientUhid={selectedClient?.uhid}
              initialData={{
                name: selectedClient?.name,
                dietary_preference: selectedClient?.preference === "Not Set" ? "Non-Vegetarian" : selectedClient?.preference,
                allergies_intolerances: selectedClient?.allergies,
                sport: selectedClient?.sport_or_goal === "--" ? "" : selectedClient?.sport_or_goal,
                goal: selectedClient?.sport_or_goal === "--" ? "" : selectedClient?.sport_or_goal,
              }}
              onSuccess={() => {
                setAssessmentModalOpen(false);
                fetchDashboardStats();
              }}
              onCancel={() => setAssessmentModalOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* ---------------- CLINICAL ASSESSMENT VIEWER ---------------- */}
        <NutritionAssessmentViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          assessment={selectedAssessment}
        />

        {/* ---------------- MEAL PLAN MACRO EDITOR MODAL ---------------- */}
        <MealPlanEditorModal
          open={mealPlanModalOpen}
          onOpenChange={setMealPlanModalOpen}
          client={selectedClient}
        />
      </div>
    </DashboardLayout>
  );
}
