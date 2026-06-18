import React, { useState } from "react";
import { ParsedAssessmentData, getStatusFromPercent, StatusGrade } from "./XlsParser";
import BodySvg from "@/components/consultant/BodySvg";
import { MapData } from "@/components/consultant/PainMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Loader2, Check, AlertCircle, Save } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { apiFetch } from "@/utils/api";
import { toast } from "@/hooks/use-toast";

interface ExportPanelProps {
  data: ParsedAssessmentData;
  activeTestIndex: number;
  reportTexts: Record<string, string>;
  painData: MapData;
  reassessmentDate: string;
  reportTitle: string;
  clientId?: string;
  clients?: any[];
  readOnly?: boolean;
}

interface PoorRegion {
  id: string;
  label: string;
  percentRef: number;
  metricLabel: string;
  notes: string;
}

function getGroupedPoorRegions(data: ParsedAssessmentData, activeTestIndex: number): PoorRegion[] {
  const testIndex = activeTestIndex - 1;
  if (testIndex < 0) return [];

  const allMetrics = [
    ...data.metrics.mobility,
    ...data.metrics.strength,
    ...data.metrics.balance,
  ];

  const regionsList: PoorRegion[] = [];
  const added = new Set<string>();

  allMetrics.forEach((metric) => {
    const test = metric.tests[testIndex];
    if (test && test.percentRef !== null && test.percentRef < -10) {
      const keyLower = metric.key.toLowerCase();
      const targetRegions: { id: string; label: string }[] = [];

      if (keyLower.includes("cervical")) {
        targetRegions.push({ id: "neck", label: "Neck" });
      }
      if (keyLower.includes("lumbar") || keyLower.includes("thoracic")) {
        targetRegions.push({ id: "lumbar_spine", label: "Lower Back" });
      }
      if (keyLower.includes("shoulder") || keyLower.includes("lateralpulldown")) {
        if (keyLower.includes("left")) {
          targetRegions.push({ id: "deltoid_left", label: "Shoulder (L)" });
        } else if (keyLower.includes("right")) {
          targetRegions.push({ id: "deltoid_right", label: "Shoulder (R)" });
        } else {
          targetRegions.push(
            { id: "deltoid_left", label: "Shoulder (L)" },
            { id: "deltoid_right", label: "Shoulder (R)" }
          );
        }
      }
      if (keyLower.includes("knee") || keyLower.includes("quadriceps")) {
        if (keyLower.includes("left")) {
          targetRegions.push({ id: "quadriceps_left", label: "Quadriceps (L)" });
        } else if (keyLower.includes("right")) {
          targetRegions.push({ id: "quadriceps_right", label: "Quadriceps (R)" });
        } else {
          targetRegions.push(
            { id: "quadriceps_left", label: "Quadriceps (L)" },
            { id: "quadriceps_right", label: "Quadriceps (R)" }
          );
        }
      }
      if (keyLower.includes("hip")) {
        if (keyLower.includes("extension")) {
          if (keyLower.includes("left")) {
            targetRegions.push({ id: "gluteus_left", label: "Gluteus (L)" });
          } else if (keyLower.includes("right")) {
            targetRegions.push({ id: "gluteus_right", label: "Gluteus (R)" });
          } else {
            targetRegions.push(
              { id: "gluteus_left", label: "Gluteus (L)" },
              { id: "gluteus_right", label: "Gluteus (R)" }
            );
          }
        } else {
          if (keyLower.includes("left")) {
            targetRegions.push({ id: "gluteus_left", label: "Gluteus (L)" });
          } else if (keyLower.includes("right")) {
            targetRegions.push({ id: "gluteus_right", label: "Gluteus (R)" });
          } else {
            targetRegions.push(
              { id: "gluteus_left", label: "Gluteus (L)" },
              { id: "gluteus_right", label: "Gluteus (R)" }
            );
          }
        }
      }

      targetRegions.forEach((reg) => {
        const uniqueKey = `${reg.id}-${metric.label}`;
        if (!added.has(uniqueKey)) {
          added.add(uniqueKey);
          regionsList.push({
            id: reg.id,
            label: reg.label,
            percentRef: test.percentRef!,
            metricLabel: metric.label,
            notes: `Deficit detected: ${test.percentRef!.toFixed(1)}% relative to reference value in ${metric.label}.`,
          });
        }
      });
    }
  });

  // Group by region ID so each region appears only once in the list
  const grouped: Record<string, PoorRegion> = {};
  regionsList.forEach((item) => {
    if (!grouped[item.id]) {
      grouped[item.id] = { ...item };
    } else {
      grouped[item.id].notes += ` Deficit detected: ${item.percentRef.toFixed(1)}% relative to reference value in ${item.metricLabel}.`;
    }
  });

  return Object.values(grouped);
}

export default function ExportPanel({
  data,
  activeTestIndex,
  reportTexts,
  painData,
  reassessmentDate,
  reportTitle,
  clientId,
  clients,
  readOnly = false,
}: ExportPanelProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  const handleSaveToProfile = async () => {
    if (!clientId) {
      toast({
        title: "Error",
        description: "Please select a client before saving.",
        variant: "destructive",
      });
      return;
    }
    setSaveStatus("saving");
    try {
      await apiFetch("/clinical/assessment-reports", {
        method: "POST",
        data: {
          client_id: clientId,
          title: reportTitle,
          test_index: activeTestIndex,
          assessment_data: data,
          report_texts: reportTexts,
          pain_data: painData,
          reassessment_date: reassessmentDate || null,
        },
      });
      setSaveStatus("success");
      toast({
        title: "Report Saved",
        description: "The assessment report has been successfully saved to the client's profile.",
      });
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err: any) {
      console.error("Save Report Error:", err);
      setSaveStatus("error");
      toast({
        title: "Failed to Save",
        description: err.message || "An error occurred while saving the report.",
        variant: "destructive",
      });
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  };

  const currentTest = data.client.tests.find((t) => t.index === activeTestIndex) || data.client.latestTest;
  const testIndex = activeTestIndex - 1;

  const selectedClient = clients?.find((c) => c.id === clientId);
  const clientUhid = selectedClient?.uhid || "—";

  const groupedPoorRegions = getGroupedPoorRegions(data, activeTestIndex);
  const totalDeficits = groupedPoorRegions.length;
  const recommendationsLength = (reportTexts.recommendations || "").length;
  const isOnePage = totalDeficits <= 3 && recommendationsLength < 300;

  const page1Deficits = isOnePage ? groupedPoorRegions : groupedPoorRegions.slice(0, 4);
  const page2Deficits = isOnePage ? [] : groupedPoorRegions.slice(4);

  const handleExportPDF = async () => {
    if (!currentTest) return;
    
    setStatus("loading");
    try {
      const safeName = data.client.name.replace(/\s+/g, "_");
      const safeTitle = reportTitle.replace(/\s+/g, "_");
      const filename = `CSSH_${safeTitle}_${safeName}.pdf`;

      const page1 = document.getElementById("report-print-page-1");
      const page2 = document.getElementById("report-print-page-2");
      if (!page1) {
        throw new Error("Page 1 print container not found.");
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      const canvas1 = await html2canvas(page1, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData1 = canvas1.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const imgHeight = 297;

      pdf.addImage(imgData1, "PNG", 0, 0, imgWidth, imgHeight);

      if (!isOnePage) {
        if (!page2) {
          throw new Error("Page 2 print container not found.");
        }
        const canvas2 = await html2canvas(page2, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        const imgData2 = canvas2.toDataURL("image/png");
        pdf.addPage();
        pdf.addImage(imgData2, "PNG", 0, 0, imgWidth, imgHeight);
      }

      pdf.save(filename);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error("PDF Export Error:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  const getStatusColor = (status: StatusGrade): string => {
    const colors: Record<StatusGrade, string> = {
      good: "#22C55E",
      moderate: "#F59E0B",
      "needs-work": "#F97316",
      priority: "#EF4444",
    };
    return colors[status] || "#F59E0B";
  };

  const drawMiniCircle = (val: number | null, color: string) => {
    const size = 36;
    const strokeWidth = 4;
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const absVal = Math.abs(val ?? 0);
    const fill = Math.min(Math.max(absVal / 100, 0), 1);
    const offset = circ * (1 - fill);
    const sign = val && val > 0 ? "+" : "";

    return (
      <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
          <circle
            cx={size/2}
            cy={size/2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-slate-800">
          {val !== null ? `${sign}${val.toFixed(0)}%` : "—"}
        </div>
      </div>
    );
  };

  const numberedBadges: Record<string, number> = {};
  groupedPoorRegions.forEach((reg, idx) => {
    numberedBadges[reg.id] = idx + 1;
  });

  const gender = data.client.gender?.toLowerCase() === "female" ? "female" : "male";

  const strengthProfiles = [
    { key: "Lumbar / Thoracic Spine", label: "CORE STABILITY" },
    { key: "Shoulder and arm", label: "SHOULDER STABILITY" },
    { key: "Cervical spine", label: "NECK FUNCTION" },
    { key: "Hip and knee", label: "LOWER LIMB STRENGTH" },
  ];

  return (
    <div>
      <Card className="gradient-card border-border shadow-md">
        <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left space-y-1">
            <h4 className="text-sm font-black text-foreground uppercase tracking-tight font-display">
              {readOnly ? "Assessment Report Options" : "Finalize Assessment Report"}
            </h4>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              {readOnly ? "Download a PDF copy of this saved interactive report" : "Save this interactive report to the client's profile or export to PDF"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {!readOnly && (
              <Button
                onClick={handleSaveToProfile}
                disabled={saveStatus === "saving"}
                className={`w-full sm:w-auto min-w-[180px] font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all h-11 ${
                  saveStatus === "success"
                    ? "bg-green-600 hover:bg-green-700 text-white shadow-green-600/10"
                    : saveStatus === "error"
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/10"
                    : "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20"
                }`}
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : saveStatus === "success" ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Saved
                  </>
                ) : saveStatus === "error" ? (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Failed — Try Again
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save to Profile
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handleExportPDF}
              disabled={status === "loading"}
              className={`w-full sm:w-auto min-w-[180px] font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all h-11 ${
                status === "success"
                  ? "bg-green-600 hover:bg-green-700 text-white shadow-green-600/10"
                  : status === "error"
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/10"
                  : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
              }`}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Preparing...
                </>
              ) : status === "success" ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Exported
                </>
              ) : status === "error" ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Failed — Try Again
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Export to PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {currentTest && (
        <div
          id="report-print-area"
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
            pointerEvents: "none",
          }}
        >
          <div
            id="report-print-page-1"
            style={{
              width: "800px",
              height: "1130px",
              padding: "45px",
              boxSizing: "border-box",
              backgroundColor: "#ffffff",
              color: "#0f172a",
              position: "relative",
              fontFamily: "system-ui, sans-serif"
            }}
          >
            <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex flex-col">
                <img src="/cssh_logo.jpg" alt="CSSH Logo" className="h-10 w-auto object-contain self-start" />
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                  Empowering Movement, Every Day!
                </span>
              </div>
              <div className="text-center shrink-0">
                <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-900 font-display italic">
                  {reportTitle}
                </h1>
              </div>
              <div className="text-right text-slate-500 font-sans">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-700">
                  Integrated Sports Health Facility
                </div>
                <div className="text-[8px] text-slate-400 mt-0.5">
                  Phone: — | Email: —
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5">
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Client Name</div>
                <div className="text-xs font-black text-slate-800 uppercase mt-0.5">{data.client.name}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Universal Health ID (UHID)</div>
                <div className="text-xs font-mono font-black text-slate-800 mt-0.5">{clientUhid}</div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Report Date</div>
                <div className="text-xs font-black text-slate-800 mt-0.5">{currentTest.date}</div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6 items-start">
              <div className="col-span-6 flex flex-col items-center gap-4">
                <div className="flex flex-col items-center w-full">
                  <div className="text-[9px] font-black tracking-[0.2em] text-slate-400 uppercase mb-1">
                    ANTERIOR VIEW
                  </div>
                  <div className="border border-slate-100 bg-slate-50/20 p-2 rounded-2xl w-[320px] flex justify-center">
                    <BodySvg
                      gender={gender}
                      painData={painData}
                      view="front"
                      numberedBadges={numberedBadges}
                      layout="stacked"
                      onRegionClick={() => {}}
                      hoveredRegion={null}
                      setHoveredRegion={() => {}}
                    />
                  </div>
                </div>
                
                <div className="flex flex-col items-center w-full">
                  <div className="text-[9px] font-black tracking-[0.2em] text-slate-400 uppercase mb-1">
                    POSTERIOR VIEW
                  </div>
                  <div className="border border-slate-100 bg-slate-50/20 p-2 rounded-2xl w-[320px] flex justify-center">
                    <BodySvg
                      gender={gender}
                      painData={painData}
                      view="back"
                      numberedBadges={numberedBadges}
                      layout="stacked"
                      onRegionClick={() => {}}
                      hoveredRegion={null}
                      setHoveredRegion={() => {}}
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-6 space-y-4">
                <div className="space-y-2">
                  <div className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b pb-1">
                    REGION-LEVEL REMARKS & OBSERVATIONS
                  </div>
                  {page1Deficits.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2">
                      No significant region-level deficits identified.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-2 text-[8px] font-black uppercase text-slate-500 w-8">No.</th>
                          <th className="py-2 text-[8px] font-black uppercase text-slate-500 w-28">Anatomical Region</th>
                          <th className="py-2 text-[8px] font-black uppercase text-slate-500">Clinician Tissue Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {page1Deficits.map((reg, idx) => (
                          <tr key={reg.id} className="border-b border-slate-100">
                            <td className="py-2 font-extrabold text-slate-700">{idx + 1}</td>
                            <td className="py-2 font-black text-slate-800 uppercase tracking-tight text-[10px]">{reg.label}</td>
                            <td className="py-2 text-slate-600 leading-relaxed font-medium text-[10px]">{reg.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {isOnePage && reportTexts.recommendations && (
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b pb-1">
                      Recommendations
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] leading-relaxed text-slate-700 font-medium whitespace-pre-line">
                      {reportTexts.recommendations}
                    </div>
                  </div>
                )}

                {isOnePage && (
                  <>
                    <div className="space-y-2">
                      <div className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b pb-1">
                        PERFORMANCE PROFILE (KEY IMPROVEMENTS / REDUCTIONS)
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {strengthProfiles.map((profile) => {
                          const cat = data.strengthSummary[profile.key];
                          const val = cat ? (cat.testAverages[testIndex] ?? cat.latestAverage) : null;
                          const status = val && val >= 0 ? "IMPROVED" : "REDUCED";
                          const color = val && val >= 0 ? "#22c55e" : "#ef4444";

                          return (
                            <div key={profile.key} className="p-2.5 border border-slate-100 rounded-xl bg-slate-50/50 flex items-center gap-3 h-14">
                              {drawMiniCircle(val, color)}
                              <div className="flex flex-col justify-center min-w-0">
                                <div className="text-[9px] font-black text-slate-700 tracking-tight leading-tight uppercase mb-0.5">
                                  {profile.label}
                                </div>
                                <div className="h-4 flex items-center">
                                  <span
                                    className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border inline-block leading-none"
                                    style={{
                                      borderColor: `${color}30`,
                                      backgroundColor: `${color}08`,
                                      color: color
                                    }}
                                  >
                                    {status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <div className="text-[7px] text-slate-400 font-black uppercase tracking-wider">Height</div>
                        <div className="text-[10px] font-extrabold text-slate-800 mt-0.5">{currentTest.height || "—"} cm</div>
                      </div>
                      <div>
                        <div className="text-[7px] text-slate-400 font-black uppercase tracking-wider">Weight</div>
                        <div className="text-[10px] font-extrabold text-slate-800 mt-0.5">{currentTest.weight || "—"} kg</div>
                      </div>
                      <div>
                        <div className="text-[7px] text-slate-400 font-black uppercase tracking-wider">BMI</div>
                        <div className="text-[10px] font-extrabold text-slate-800 mt-0.5">{currentTest.bmi || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[7px] text-slate-400 font-black uppercase tracking-wider">Age Bracket</div>
                        <div className="text-[10px] font-extrabold text-slate-800 mt-0.5">Midterm test</div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-dashed border-slate-200 flex justify-between items-end">
                      <div className="space-y-0.5">
                        <div className="text-[8px] text-slate-400 font-black uppercase tracking-wider">Practitioner Sign-Off</div>
                        <div className="text-xs font-black text-slate-800 font-display">Sandeep S</div>
                        <div className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Sports Physician</div>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="text-[8px] text-slate-400 font-black uppercase tracking-wider">Log Date</div>
                        <div className="text-[10px] font-bold text-slate-700">{currentTest.date}</div>
                        <div className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-teal-600 bg-teal-50 border border-teal-200/40 px-1.5 py-0.5 rounded-full mt-1">
                          ✓ Clinically Signed
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="absolute bottom-6 left-12 right-12 border-t border-slate-100 pt-3 flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
              <span>Center for Spine and Sports Health, Hyderabad</span>
              <span>Page 1 of {isOnePage ? "1" : "2"}</span>
            </div>
          </div>

          {!isOnePage && (
            <div
              id="report-print-page-2"
              style={{
                width: "800px",
                height: "1130px",
                padding: "45px",
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
                color: "#0f172a",
                position: "relative",
                fontFamily: "system-ui, sans-serif"
              }}
            >
              <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-4">
                <div className="flex flex-col">
                  <img src="/cssh_logo.jpg" alt="CSSH Logo" className="h-10 w-auto object-contain self-start" />
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                    Empowering Movement, Every Day!
                  </span>
                </div>
                <div className="text-center shrink-0">
                  <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-900 font-display italic">
                    {reportTitle}
                  </h1>
                </div>
                <div className="text-right text-slate-500 font-sans">
                  <div className="text-[9px] font-black uppercase tracking-wider text-slate-700">
                    Integrated Sports Health Facility
                  </div>
                  <div className="text-[8px] text-slate-400 mt-0.5">
                    Phone: — | Email: —
                  </div>
                </div>
              </div>

              <div className="space-y-6 mt-6">
                {page2Deficits.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b pb-1">
                      REGION-LEVEL REMARKS & OBSERVATIONS (CONTINUED)
                    </div>
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-2 text-[8px] font-black uppercase text-slate-500 w-8">No.</th>
                          <th className="py-2 text-[8px] font-black uppercase text-slate-500 w-28">Anatomical Region</th>
                          <th className="py-2 text-[8px] font-black uppercase text-slate-500">Clinician Tissue Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {page2Deficits.map((reg, idx) => (
                          <tr key={reg.id} className="border-b border-slate-100">
                            <td className="py-2 font-extrabold text-slate-700">{idx + 5}</td>
                            <td className="py-2 font-black text-slate-800 uppercase tracking-tight text-[10px]">{reg.label}</td>
                            <td className="py-2 text-slate-600 leading-relaxed font-medium text-[10px]">{reg.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {reportTexts.recommendations && (
                  <div className="space-y-1.5">
                    <div className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b pb-1">
                      Recommendations
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] leading-relaxed text-slate-700 font-medium whitespace-pre-line">
                      {reportTexts.recommendations}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase border-b pb-1">
                    PERFORMANCE PROFILE (KEY IMPROVEMENTS / REDUCTIONS)
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {strengthProfiles.map((profile) => {
                      const cat = data.strengthSummary[profile.key];
                      const val = cat ? (cat.testAverages[testIndex] ?? cat.latestAverage) : null;
                      const status = val && val >= 0 ? "IMPROVED" : "REDUCED";
                      const color = val && val >= 0 ? "#22c55e" : "#ef4444";

                      return (
                        <div key={profile.key} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex items-center gap-3 h-16">
                          {drawMiniCircle(val, color)}
                          <div className="flex flex-col justify-center min-w-0">
                            <div className="text-[9px] font-black text-slate-700 tracking-tight leading-tight uppercase mb-1">
                              {profile.label}
                            </div>
                            <div className="h-4 flex items-center">
                              <span
                                className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border inline-block leading-none"
                                style={{
                                  borderColor: `${color}30`,
                                  backgroundColor: `${color}08`,
                                  color: color
                                }}
                              >
                                {status}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Height</div>
                    <div className="text-sm font-extrabold text-slate-800 mt-0.5">{currentTest.height || "—"} cm</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Weight</div>
                    <div className="text-sm font-extrabold text-slate-800 mt-0.5">{currentTest.weight || "—"} kg</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">BMI</div>
                    <div className="text-sm font-extrabold text-slate-800 mt-0.5">{currentTest.bmi || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Age Bracket</div>
                    <div className="text-sm font-extrabold text-slate-800 mt-0.5">Midterm test</div>
                  </div>
                </div>

                {reassessmentDate && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex justify-between items-center">
                    <span className="text-xs text-amber-600 font-black uppercase tracking-wider">
                      Reassessment Due Date
                    </span>
                    <span className="text-sm font-black text-amber-700">{reassessmentDate}</span>
                  </div>
                )}

                <div className="pt-8 border-t border-dashed border-slate-200 mt-12 flex justify-between items-end">
                  <div className="space-y-1">
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Practitioner Sign-Off</div>
                    <div className="text-base font-black text-slate-800 font-display">Sandeep S</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sports Physician</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Log Date</div>
                    <div className="text-sm font-bold text-slate-700 mb-1">{currentTest.date}</div>
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-teal-600 bg-teal-50 border border-teal-200/40 px-3 py-1 rounded-full">
                      ✓ Clinically Signed via ISHPO
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-6 left-12 right-12 border-t border-slate-100 pt-3 flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest">
                <span>Center for Spine and Sports Health, Hyderabad</span>
                <span>Page 2 of 2</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
