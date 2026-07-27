import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Search, Plus, Eye, Apple } from "lucide-react";
import { apiFetch } from "@/utils/api";
import type { NutritionAssessment } from "@/types/nutrition";
import NutritionAssessmentForm from "@/components/nutrition/NutritionAssessmentForm";
import NutritionAssessmentViewer from "@/components/nutrition/NutritionAssessmentViewer";

export default function NutritionistAssessmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [assessments, setAssessments] = useState<NutritionAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<NutritionAssessment | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<NutritionAssessment[]>("/clinical/nutrition/assessments");
      if (data && Array.isArray(data)) {
        setAssessments(data);
      }
    } catch (err) {
      console.warn("Error loading assessments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const filteredAssessments = assessments.filter(
    (ass) =>
      (ass.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ass.taken_by || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ass.dietary_preference || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout role="nutritionist">
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-emerald-500" /> NUTRITION ASSESSMENT FORM Library
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Search, view, and print ingested clinical nutrition assessment reports.
            </p>
          </div>

          <Button onClick={() => setAssessmentModalOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <Plus className="w-4 h-4" /> New Assessment Form
          </Button>
        </div>

        {/* Repository Table Card */}
        <Card className="border-border">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-base font-bold">Ingested Assessment Records</CardTitle>
              <CardDescription className="text-xs">
                Total {filteredAssessments.length} assessment records logged
              </CardDescription>
            </div>

            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, clinician..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Client Name</TableHead>
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
                  {filteredAssessments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                        {loading ? "Loading assessments..." : "No assessment records logged yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssessments.map((ass, idx) => (
                      <TableRow key={ass.id || idx} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-semibold text-sm text-foreground">{ass.name || "Client"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{ass.profession}</div>
                        </TableCell>

                        <TableCell className="font-mono text-xs">{ass.assessment_date}</TableCell>

                        <TableCell>
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {ass.client_type}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {ass.dietary_preference}
                          </Badge>
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
                              setViewModalOpen(true);
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
            </div>
          </CardContent>
        </Card>

        {/* New Assessment Form Dialog */}
        <Dialog open={assessmentModalOpen} onOpenChange={setAssessmentModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto bg-card border-border p-4 sm:p-6">
            <DialogHeader className="sr-only">
              <DialogTitle>NUTRITION ASSESSMENT FORM</DialogTitle>
            </DialogHeader>
            <NutritionAssessmentForm
              onSuccess={() => {
                setAssessmentModalOpen(false);
                fetchAssessments();
              }}
              onCancel={() => setAssessmentModalOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Clinical Report Viewer */}
        <NutritionAssessmentViewer
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          assessment={selectedAssessment}
        />
      </div>
    </DashboardLayout>
  );
}
