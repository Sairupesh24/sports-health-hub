import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { Users, Search, Plus, Flame, ChevronRight, Calendar } from "lucide-react";
import { format } from "date-fns";
import { apiFetch } from "@/utils/api";
import type { NutritionClient, NutritionDashboardStats } from "@/types/nutrition";
import NutritionAssessmentForm from "@/components/nutrition/NutritionAssessmentForm";
import MealPlanEditorModal from "@/components/nutrition/MealPlanEditorModal";

export default function NutritionistClients() {
  const navigate = useNavigate();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const [searchTerm, setSearchTerm] = useState("");
  const [preferenceFilter, setPreferenceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Date Filtering (Default to Today's Registrations, matching Admin Console)
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<"today" | "all">("today");

  const [clients, setClients] = useState<NutritionClient[]>([]);
  const [loading, setLoading] = useState(true);

  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [mealPlanModalOpen, setMealPlanModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<NutritionClient | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (searchTerm) params.search = searchTerm;

      const data = await apiFetch<NutritionDashboardStats>("/clinical/nutrition/dashboard/stats", { params });
      if (data && data.clients) {
        setClients(data.clients);
      }
    } catch (err) {
      console.warn("Error fetching clients list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [startDate, endDate, searchTerm]);

  const handleToggleViewMode = (mode: "today" | "all") => {
    setViewMode(mode);
    if (mode === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  const filteredClients = clients.filter((client) => {
    const matchesPref =
      preferenceFilter === "all" ||
      (client.preference || "").toLowerCase() === preferenceFilter.toLowerCase();

    const matchesType =
      typeFilter === "all" || client.client_type === typeFilter;

    return matchesPref && matchesType;
  });

  const getPreferenceBadge = (pref: string) => {
    switch (pref) {
      case "Vegetarian":
      case "Veg":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Veg</Badge>;
      case "Non-Vegetarian":
        return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20">Non-Veg</Badge>;
      case "Ovo-Vegetarian":
      case "Ovo vegetarian":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Ovo-Veg</Badge>;
      case "Vegan":
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Vegan</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">{pref || "Not Set"}</Badge>;
    }
  };

  const handleOpenAssessment = (client: NutritionClient) => {
    setSelectedClient(client);
    setAssessmentModalOpen(true);
  };

  const handleOpenMealPlan = (client: NutritionClient) => {
    setSelectedClient(client);
    setMealPlanModalOpen(true);
  };

  return (
    <DashboardLayout role="nutritionist">
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-500" /> Nutrition Clients
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Dedicated clinical dietetics directory. View profiles, macro targets, and allergy profiles.
            </p>
          </div>

          <Button onClick={() => setAssessmentModalOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <Plus className="w-4 h-4" /> New Assessment
          </Button>
        </div>

        {/* Directory Card */}
        <Card className="border-border">
          <CardHeader className="flex flex-col space-y-4 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold">Assigned Diet Clients</CardTitle>
                <CardDescription className="text-xs">
                  Showing {filteredClients.length} {viewMode === "today" ? "registrations for today" : "registered clients"}
                </CardDescription>
              </div>

              {/* View Mode Switcher (Today's Registrations vs All Registrations) */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border w-fit">
                <Button
                  size="sm"
                  variant={viewMode === "today" ? "default" : "ghost"}
                  onClick={() => handleToggleViewMode("today")}
                  className="text-xs h-7 px-3"
                >
                  Today's Registrations
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "all" ? "default" : "ghost"}
                  onClick={() => handleToggleViewMode("all")}
                  className="text-xs h-7 px-3"
                >
                  All Registrations
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, UHID, mobile..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>

                <select
                  value={preferenceFilter}
                  onChange={(e) => setPreferenceFilter(e.target.value)}
                  className="h-9 px-3 text-xs rounded-md bg-card border border-border text-foreground"
                >
                  <option value="all">All Preferences</option>
                  <option value="Vegetarian">Veg</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Ovo-Vegetarian">Ovo vegetarian</option>
                  <option value="Vegan">Vegan</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 px-3 text-xs rounded-md bg-card border border-border text-foreground"
                >
                  <option value="all">All Categories</option>
                  <option value="athlete">Athlete</option>
                  <option value="general">General Population</option>
                </select>
              </div>

              {/* Date Pickers */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground font-medium">From:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setViewMode("all");
                  }}
                  className="h-9 text-xs w-36 font-mono"
                />
                <span className="text-muted-foreground font-medium">To:</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setViewMode("all");
                  }}
                  className="h-9 text-xs w-36 font-mono"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Client Name & UHID</TableHead>
                    <TableHead className="text-xs font-bold">Category</TableHead>
                    <TableHead className="text-xs font-bold">Sport / Profession</TableHead>
                    <TableHead className="text-xs font-bold">Preference</TableHead>
                    <TableHead className="text-xs font-bold">Target Macros</TableHead>
                    <TableHead className="text-xs font-bold">Allergy Alerts</TableHead>
                    <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                        {loading ? "Loading clients..." : viewMode === "today" ? "No new client registrations today." : "No clients found."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <button
                            onClick={() => navigate(`/nutritionist/clients/${client.id}`)}
                            className="text-left group cursor-pointer"
                          >
                            <div className="font-semibold text-sm text-foreground group-hover:text-emerald-500 transition-colors">
                              {client.name}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground">{client.uhid}</div>
                          </button>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {client.client_type}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-xs font-medium max-w-[180px] truncate" title={client.sport_or_goal}>
                          {client.sport_or_goal}
                        </TableCell>

                        <TableCell>{getPreferenceBadge(client.preference)}</TableCell>

                        <TableCell>
                          {client.target_calories ? (
                            <div className="text-xs font-mono">
                              <span className="font-bold text-amber-500">{client.target_calories} kcal</span>
                              <div className="text-[10px] text-muted-foreground">
                                P: {client.protein_g}g | C: {client.carbs_g}g | F: {client.fats_g}g
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground font-mono">--</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {client.allergies && client.allergies.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              {client.allergies.map((allergy, i) => (
                                <Badge key={i} variant="destructive" className="text-[10px] px-1.5 py-0">
                                  {allergy}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground font-mono">None</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/nutritionist/clients/${client.id}`)}
                              className="h-8 text-xs gap-1"
                            >
                              Profile <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenMealPlan(client)}
                              className="h-8 text-xs gap-1"
                            >
                              <Flame className="w-3.5 h-3.5 text-amber-500" /> Meal Plan
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleOpenAssessment(client)}
                              className="h-8 text-xs gap-1 bg-emerald-600 text-white"
                            >
                              <Plus className="w-3.5 h-3.5" /> Assessment
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Dialog */}
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
              }}
              onSuccess={() => {
                setAssessmentModalOpen(false);
                fetchClients();
              }}
              onCancel={() => setAssessmentModalOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Meal Plan Editor Modal */}
        <MealPlanEditorModal
          open={mealPlanModalOpen}
          onOpenChange={setMealPlanModalOpen}
          client={selectedClient}
        />
      </div>
    </DashboardLayout>
  );
}
