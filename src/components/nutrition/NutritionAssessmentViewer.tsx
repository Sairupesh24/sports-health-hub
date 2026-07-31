import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Printer, Download, Apple, Calendar, User, Clock, Pill, Activity, Zap, CheckCircle2, Loader2 } from "lucide-react";
import type { NutritionAssessment, FuelingSession } from "@/types/nutrition";

interface NutritionAssessmentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: NutritionAssessment | null;
}

export const formatDateDDMMYYYY = (dateStr?: string | null): string => {
  if (!dateStr) return "--";
  try {
    const cleanDate = dateStr.split("T")[0];
    const parts = cleanDate.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parts[0];
      const month = parts[1].padStart(2, "0");
      const day = parts[2].padStart(2, "0");
      return `${day}/${month}/${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

export default function NutritionAssessmentViewer({
  open,
  onOpenChange,
  assessment,
}: NutritionAssessmentViewerProps) {
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  if (!assessment) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const reportElement = document.getElementById("nutrition-report-capture-area");
    if (!reportElement) return;

    try {
      setDownloadingPDF(true);
      const origStyle = reportElement.getAttribute("style") || "";

      // Unconstrain the scrollable container so html2canvas sees the full content
      reportElement.style.maxHeight = "none";
      reportElement.style.height = "auto";
      reportElement.style.overflow = "visible";
      reportElement.style.paddingBottom = "20px"; // buffer so last line isn't clipped
      reportElement.scrollTop = 0;

      // Small delay to let layout reflow complete
      await new Promise((r) => setTimeout(r, 100));

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowHeight: reportElement.scrollHeight,
      });

      reportElement.setAttribute("style", origStyle);

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 10; // mm
      const usableWidth = pdfWidth - margin * 2;
      const usableHeight = pdfHeight - margin * 2;

      // How many canvas pixels fit on one page?
      const scaleFactor = usableWidth / canvas.width; // mm per canvas-px
      const pageHeightInPx = usableHeight / scaleFactor; // canvas-px per page

      const totalPages = Math.ceil(canvas.height / pageHeightInPx);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage();

        const srcY = page * pageHeightInPx;
        const srcH = Math.min(pageHeightInPx, canvas.height - srcY);

        // Slice the canvas for this page
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcH;
        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0, srcY, canvas.width, srcH,   // source rect
            0, 0, canvas.width, srcH        // dest rect
          );
        }

        const sliceData = pageCanvas.toDataURL("image/png");
        const sliceHeightMM = srcH * scaleFactor;
        pdf.addImage(sliceData, "PNG", margin, margin, usableWidth, sliceHeightMM);
      }

      const clientName = (assessment.name || "Client").replace(/\s+/g, "_");
      pdf.save(`Nutrition_Assessment_${clientName}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="print-dialog-content w-[95vw] sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden bg-card border-border text-foreground p-4 sm:p-6 print:max-h-none print:h-auto print:overflow-visible print:p-0 print:border-none print:shadow-none print:bg-white print:static">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border pb-3 shrink-0 no-print">
          <div>
            <div className="flex items-center gap-2">
              <Apple className="w-5 h-5 text-emerald-500 shrink-0" />
              <DialogTitle className="text-base sm:text-xl font-bold tracking-tight">NUTRITION ASSESSMENT FORM</DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Official Clinical Report • ISHPO Health System
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs">
              <Printer className="w-4 h-4" /> Print Report
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {downloadingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Download PDF
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Form Body */}
        <div
          id="nutrition-report-capture-area"
          className="printable-content overflow-y-auto pr-1 flex-1 max-h-[calc(90vh-100px)] space-y-6 pt-2 print:p-0 print:text-black print:overflow-visible print:max-h-none print:h-auto"
        >
          {/* Header Metadata */}
          <div className="flex justify-between items-center text-xs p-3 rounded-lg bg-muted/40 border border-border">
            <div>
              <span className="text-muted-foreground font-medium">Report ID: </span>
              <span className="font-mono font-bold text-foreground">{assessment.id || "NA-REC-LATEST"}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-medium">Date: </span>
              <span className="font-mono font-bold text-foreground">{formatDateDDMMYYYY(assessment.assessment_date)}</span>
            </div>
          </div>

          {/* 1. PERSONAL DETAILS */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold border-b border-border pb-1 text-emerald-600 flex items-center gap-2">
              <User className="w-4 h-4" /> PERSONAL DETAILS
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Name</span>
                <span className="font-bold text-foreground text-sm">{assessment.name || "--"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Age</span>
                <span className="font-bold text-foreground text-sm">{assessment.age || "--"} years</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Gender</span>
                <span className="font-bold text-foreground text-sm">{assessment.gender || "--"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Profession</span>
                <span className="font-bold text-foreground text-sm">{assessment.profession || "--"}</span>
              </div>
            </div>

            {/* Athlete vs General Population Section */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                  Category: {assessment.client_type === "athlete" ? "Athlete" : "General Population"}
                </span>
                <Badge variant="outline" className="capitalize text-[10px]">
                  {assessment.client_type}
                </Badge>
              </div>

              {assessment.client_type === "athlete" ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-border/50">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Sport</span>
                    <span className="font-semibold">{assessment.sport || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Position</span>
                    <span className="font-semibold">{assessment.position || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Training Age</span>
                    <span className="font-semibold">{assessment.training_age || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Competition Level</span>
                    <span className="font-semibold">{assessment.competition_level || "N/A"}</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-border/50">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Exercise</span>
                    <span className="font-semibold">{assessment.exercise ? "Yes" : "No"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Duration</span>
                    <span className="font-semibold">{assessment.exercise_duration || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Training Session</span>
                    <span className="font-semibold">{assessment.training_sessions_count || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Type of Exercise</span>
                    <span className="font-semibold">{assessment.exercise_type || "N/A"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. ANTHROPOMETRIC DETAILS */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold border-b border-border pb-1 text-emerald-600 flex items-center gap-2">
              <Activity className="w-4 h-4" /> ANTHROPOMETRIC DETAILS
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-xl bg-card border border-border text-xs">
              <div>
                <span className="text-muted-foreground block text-[10px]">Height</span>
                <span className="font-bold text-foreground text-sm font-mono">{assessment.height_cm ? `${assessment.height_cm} cm` : "--"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Weight</span>
                <span className="font-bold text-foreground text-sm font-mono">{assessment.weight_kg ? `${assessment.weight_kg} kg` : "--"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Body Fat %</span>
                <span className="font-bold text-foreground text-sm font-mono">{assessment.body_fat_pct ? `${assessment.body_fat_pct}%` : "--"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Muscle Mass</span>
                <span className="font-bold text-foreground text-sm font-mono">{assessment.muscle_mass_kg ? `${assessment.muscle_mass_kg} kg` : "--"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Calculated BMI</span>
                <span className="font-bold text-emerald-500 text-sm font-mono">{assessment.bmi ? `${assessment.bmi} kg/m²` : "--"}</span>
              </div>
            </div>
          </div>

          {/* 3. CLINICAL HISTORY & ALLERGIES */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold border-b border-border pb-1 text-emerald-600">
              CLINICAL BASELINE & MEDICAL HISTORY
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <span className="font-bold text-foreground block text-[11px]">COMPLAINTS:</span>
                <p className="text-muted-foreground whitespace-pre-wrap">{assessment.complaints || "None reported."}</p>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <span className="font-bold text-foreground block text-[11px]">BIOCHEMICAL INTERPRETATIONS:</span>
                <p className="text-muted-foreground whitespace-pre-wrap">{assessment.biochemical_interpretations || "None recorded."}</p>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border space-y-1.5 sm:col-span-2">
                <span className="font-bold text-foreground block text-[11px]">MEDICAL CONDITIONS & COMORBIDITIES:</span>
                {assessment.comorbidities && assessment.comorbidities.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {assessment.comorbidities.map((item, idx) => (
                      <div key={idx} className="p-2 rounded border bg-muted/40 text-xs space-y-0.5">
                        <div className="font-semibold text-foreground flex items-center justify-between gap-1">
                          <span>{item.condition}</span>
                          {item.since && <span className="text-[10px] text-muted-foreground bg-background px-1.5 py-0.5 rounded border">{item.since}</span>}
                        </div>
                        {item.treatment && (
                          <p className="text-[11px] text-muted-foreground">
                            <span className="font-medium text-foreground/80">Treatment:</span> {item.treatment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground whitespace-pre-wrap">{assessment.medical_history || "None recorded."}</p>
                )}
              </div>

              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <span className="font-bold text-foreground block text-[11px]">ANY OTHER MEDICATIONS:</span>
                <p className="text-muted-foreground whitespace-pre-wrap">{assessment.other_medications || "None."}</p>
              </div>
            </div>

            {/* Allergies and Intolerances */}
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1.5">
              <span className="font-bold text-rose-500 block text-[11px]">ALLERGIES AND INTOLERANCES:</span>
              {assessment.allergies_intolerances && assessment.allergies_intolerances.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {assessment.allergies_intolerances.map((alg, index) => (
                    <Badge key={index} variant="destructive" className="text-[10px]">
                      {alg}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground italic">No allergies recorded.</span>
              )}
            </div>
          </div>

          {/* 4. DIETARY HABITS & 24H RECALL */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold border-b border-border pb-1 text-emerald-600 flex items-center gap-2">
              <Apple className="w-4 h-4" /> DIETARY HABITS & 24-HOUR RECALL
            </h3>

            <div className="flex flex-wrap items-center justify-between p-3 rounded-lg bg-card border border-border text-xs gap-3">
              <div>
                <span className="text-muted-foreground mr-2 font-medium">Dietary Preference:</span>
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">{assessment.dietary_preference || "Non-Vegetarian"}</Badge>
              </div>

              <div>
                <span className="text-muted-foreground mr-2 font-medium">Duration of Sleep:</span>
                <strong className="font-mono">{assessment.sleep_duration_hours ? `${assessment.sleep_duration_hours} hours` : "Not specified"}</strong>
              </div>

              <div>
                <span className="text-muted-foreground mr-2 font-medium">Fluid Intake:</span>
                <strong className="font-mono">{assessment.daily_fluid_intake_l ? `${assessment.daily_fluid_intake_l} L/day` : "Not specified"}</strong>
              </div>
            </div>

            {/* 24h Recall Table */}
            <div className="p-3.5 rounded-xl bg-card border border-border text-xs space-y-2">
              <span className="font-bold text-foreground block text-[11px]">TYPICAL DIETARY HABITS / 24H RECALL:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded bg-muted/30">
                  <span className="font-bold text-primary block text-[10px]">Early Morning:</span>
                  <span className="text-muted-foreground">{assessment.timeline_recall?.early_morning || "--"}</span>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="font-bold text-primary block text-[10px]">Breakfast:</span>
                  <span className="text-muted-foreground">{assessment.timeline_recall?.breakfast || "--"}</span>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="font-bold text-primary block text-[10px]">Mid-Morning:</span>
                  <span className="text-muted-foreground">{assessment.timeline_recall?.mid_morning || "--"}</span>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="font-bold text-primary block text-[10px]">Lunch:</span>
                  <span className="text-muted-foreground">{assessment.timeline_recall?.lunch || "--"}</span>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="font-bold text-primary block text-[10px]">Evening Snack:</span>
                  <span className="text-muted-foreground">{assessment.timeline_recall?.evening_snack || "--"}</span>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <span className="font-bold text-primary block text-[10px]">Dinner:</span>
                  <span className="text-muted-foreground">{assessment.timeline_recall?.dinner || "--"}</span>
                </div>
                <div className="p-2 rounded bg-muted/30 sm:col-span-2">
                  <span className="font-bold text-primary block text-[10px]">Bed Time:</span>
                  <span className="text-muted-foreground">{assessment.timeline_recall?.bed_time || "--"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. TRAINING NUTRITION */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold border-b border-border pb-1 text-emerald-600 flex items-center gap-2">
              <Zap className="w-4 h-4" /> TRAINING NUTRITION (Fueling Strategy)
            </h3>

            {(() => {
              const allSessions: FuelingSession[] =
                assessment.fueling_sessions && assessment.fueling_sessions.length > 0
                  ? assessment.fueling_sessions
                  : (assessment.session_1 as any)?.all_sessions && Array.isArray((assessment.session_1 as any).all_sessions)
                  ? (assessment.session_1 as any).all_sessions
                  : [
                      { name: "SESSION 1", pre_workout: assessment.session_1?.pre_workout || "", during_workout: assessment.session_1?.during_workout || "", post_workout: assessment.session_1?.post_workout || "" },
                      { name: "SESSION 2", pre_workout: assessment.session_2?.pre_workout || "", during_workout: assessment.session_2?.during_workout || "", post_workout: assessment.session_2?.post_workout || "" },
                    ];

              const badgeColors = ["text-amber-500", "text-blue-500", "text-emerald-500", "text-purple-500", "text-rose-500"];

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {allSessions.map((sess, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-card border border-border space-y-2">
                      <span className={`font-bold block text-[11px] uppercase ${badgeColors[idx % badgeColors.length]}`}>
                        {sess.name || `SESSION ${idx + 1}`}:
                      </span>
                      <div className="space-y-1 text-muted-foreground">
                        <div><strong>Pre:</strong> {sess.pre_workout || "--"}</div>
                        <div><strong>During:</strong> {sess.during_workout || "--"}</div>
                        <div><strong>Post:</strong> {sess.post_workout || "--"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* 6. SUPPLEMENTS */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold border-b border-border pb-1 text-emerald-600 flex items-center gap-2">
              <Pill className="w-4 h-4" /> SUPPLEMENTS
            </h3>

            {assessment.supplements && assessment.supplements.length > 0 ? (
              <div className="space-y-2">
                {assessment.supplements.map((supp, index) => (
                  <div key={index} className="p-3 rounded-lg bg-card border border-border flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-foreground">{supp.supplement_name || "--"}</span>
                      <span className="text-muted-foreground block text-[10px]">Company: {supp.brand || "--"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-primary font-semibold">Dosage: {supp.dosage || "--"}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        Timing: {supp.consumption_time || "--"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No supplements prescribed.</p>
            )}
          </div>

          {/* 7. CLINICAL SUMMARY & ADVICE */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold border-b border-border pb-1 text-emerald-600">
              CLINICAL SUMMARY & ADVICE
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <span className="font-bold text-foreground block text-[11px]">OBSERVATIONS:</span>
                <p className="text-muted-foreground whitespace-pre-wrap">{assessment.observations || "None."}</p>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <span className="font-bold text-foreground block text-[11px]">GOAL:</span>
                <p className="text-muted-foreground whitespace-pre-wrap">{assessment.goal || "None."}</p>
              </div>

              <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                <span className="font-bold text-foreground block text-[11px]">ADVICE / PRESCRIPTION:</span>
                <p className="text-muted-foreground whitespace-pre-wrap">{assessment.advice_prescription || "None."}</p>
              </div>
            </div>

            {/* Signature Bar */}
            <div className="flex justify-between items-center pt-4 border-t border-border text-xs text-muted-foreground">
              <div>
                <span>Taken By: </span>
                <strong className="text-foreground">{assessment.taken_by || "Lead Nutritionist"}</strong>
              </div>
              <div>
                <span>Official Stamp / Date: </span>
                <strong className="text-foreground font-mono">{formatDateDDMMYYYY(assessment.assessment_date)}</strong>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
