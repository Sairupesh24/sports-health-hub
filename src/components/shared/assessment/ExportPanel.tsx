import React, { useState } from "react";
import { ParsedAssessmentData } from "./XlsParser";
import BodySvg from "@/components/consultant/BodySvg";
import { MapData } from "@/components/consultant/PainMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer, Loader2, Check, AlertCircle, Save } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { apiFetch } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ExportPanelProps {
  data: ParsedAssessmentData;
  activeTestIndex: number;
  reportTexts: Record<string, string>;
  painData: MapData;
  subjectivePainData?: any;
  reassessmentDate: string;
  reportTitle: string;
  clientId?: string;
  clients?: any[];
  readOnly?: boolean;
  practitionerName?: string;
  practitionerRole?: string;
}

interface MarkedRegion {
  id: string;
  label: string;
  notes: string;
  num: number;
}

export default function ExportPanel({
  data,
  activeTestIndex,
  reportTexts,
  painData,
  subjectivePainData,
  reassessmentDate,
  reportTitle,
  clientId,
  clients,
  readOnly = false,
  practitionerName: propPractitionerName,
  practitionerRole: propPractitionerRole,
}: ExportPanelProps) {
  const { profile, user, roles } = useAuth();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  // Dynamically resolve practitioner name from logged-in user session or saved report metadata
  const loggedInName = (() => {
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
    if (fullName) return fullName;
    if ((user as any)?.user_metadata?.full_name) return (user as any).user_metadata.full_name;
    if ((user as any)?.name) return (user as any).name;
    if (profile?.email) {
      const emailUser = profile.email.split("@")[0];
      return emailUser.charAt(0).toUpperCase() + emailUser.slice(1);
    }
    if ((user as any)?.email) {
      const emailUser = (user as any).email.split("@")[0];
      return emailUser.charAt(0).toUpperCase() + emailUser.slice(1);
    }
    return "Practitioner";
  })();

  const loggedInRole = (() => {
    if (profile?.profession) return profile.profession;
    if (roles?.includes("consultant")) return "Sports Physician";
    if (roles?.includes("sports_scientist")) return "Sports Scientist";
    if (roles?.includes("admin")) return "Administrator";
    if (roles?.includes("super_admin")) return "Super Administrator";
    if (profile?.role) {
      return profile.role
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return "Sports Physician";
  })();

  const effectivePractitionerName =
    propPractitionerName?.trim() ||
    reportTexts?.practitionerName?.trim() ||
    loggedInName;

  const effectivePractitionerRole =
    propPractitionerRole?.trim() ||
    reportTexts?.practitionerRole?.trim() ||
    loggedInRole;

  const organizationName = profile?.organization_name || profile?.organization?.name || "Center for Spine & Sports Health";

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
          report_texts: {
            ...reportTexts,
            practitionerName: effectivePractitionerName,
            practitionerRole: effectivePractitionerRole,
          },
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

  const selectedClient = clients?.find((c) => c.id === clientId);
  const clientUhid = selectedClient?.uhid || "—";

  // Build clinician-marked regions list (limited to 200 chars)
  const markedRegionsList: MarkedRegion[] = Object.entries(painData || {})
    .filter(([_, r]) => r && (r as any).marked !== false)
    .map(([id, r], idx) => ({
      id,
      label: (r as any).name || id.replace(/_/g, " "),
      notes: ((r as any).notes || "").slice(0, 200),
      num: idx + 1,
    }));

  // Marked regions that actually have clinician notes written
  const markedRegionsWithNotes = markedRegionsList.filter(
    (reg) => reg.notes && reg.notes.trim().length > 0 && reg.notes !== "Marked on body map"
  );
  const hasPage2 = markedRegionsWithNotes.length > 0;

  const numberedBadges: Record<string, number> = {};
  markedRegionsList.forEach((reg) => {
    numberedBadges[reg.id] = reg.num;
  });

  const gender = data.client.gender?.toLowerCase() === "female" ? "female" : "male";

  const frontRegionIds = [
    "head", "neck", "neck_left", "neck_right", "trapezius_left", "trapezius_right",
    "pectoral_left", "pectoral_right", "deltoid_left", "deltoid_right",
    "biceps_left", "biceps_right", "triceps_front_left", "triceps_front_right",
    "abdominal_left", "abdominal_right", "abdominal_upper", "abdominal_lower",
    "obliques_left", "obliques_right", "adductors_left", "adductors_right",
    "quadriceps_left", "quadriceps_right", "knee_left", "knee_right",
    "tibialis_left", "tibialis_right", "calves_front_left", "calves_front_right",
    "forearm_left", "forearm_right", "left_hand", "right_hand",
    "ankle_left", "ankle_right", "left_foot", "right_foot"
  ];

  const handleExportPDF = async () => {
    if (!currentTest) return;

    // Validation: Clinical Impression & Recommendations are mandatory
    if (!reportTexts.clinicalImpression?.trim() || !reportTexts.recommendations?.trim()) {
      toast({
        title: "Mandatory Fields Required",
        description: "Please complete both 'Clinical Impression / Diagnosis' and 'Recommendations' before exporting the report.",
        variant: "destructive",
      });
      return;
    }
    
    setStatus("loading");
    try {
      const page1 = document.getElementById("report-print-page-1");
      if (!page1) {
        throw new Error("Print container not found.");
      }

      await new Promise((resolve) => setTimeout(resolve, 250));

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

      if (hasPage2) {
        const page2 = document.getElementById("report-print-page-2");
        if (page2) {
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
      }

      // Open print window directly to avoid unwanted direct downloads
      pdf.autoPrint();
      const blobUrl = (pdf.output("bloburl") as any)?.toString() || String(pdf.output("bloburl"));
      const printWin = window.open(blobUrl, "_blank");
      if (!printWin) {
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.bottom = "0";
        iframe.style.right = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.src = blobUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          iframe.contentWindow?.print();
        };
      }

      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error("PDF Export Error:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  };

  const isImpressionEmpty = !reportTexts.clinicalImpression?.trim();
  const isRecommendationsEmpty = !reportTexts.recommendations?.trim();
  const hasValidationBlock = isImpressionEmpty || isRecommendationsEmpty;

  return (
    <div>
      <Card className="gradient-card border-border shadow-md">
        <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left space-y-1">
            <h4 className="text-sm font-black text-foreground uppercase tracking-tight font-display">
              {readOnly ? "Assessment Report Options" : "Finalize Assessment Report"}
            </h4>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              {hasValidationBlock
                ? "Complete mandatory fields (Clinical Impression & Recommendations) to print/export"
                : readOnly
                ? "Open printable assessment report in print window"
                : "Save this interactive report to client profile or print directly"}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {!readOnly && (
              <Button
                onClick={handleSaveToProfile}
                disabled={saveStatus === "saving"}
                className={`w-full sm:w-auto min-w-[170px] font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all h-11 ${
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
              className={`w-full sm:w-auto min-w-[170px] font-black uppercase text-xs tracking-wider rounded-xl shadow-lg transition-all h-11 ${
                hasValidationBlock
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20"
                  : status === "success"
                  ? "bg-green-600 hover:bg-green-700 text-white shadow-green-600/10"
                  : status === "error"
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/10"
                  : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
              }`}
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : status === "success" ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Print Opened
                </>
              ) : status === "error" ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Failed — Try Again
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-2" />
                  Print / Export Report
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
          {/* ==================== PAGE 1 (CORE ASSESSMENT & BODY MAPS) ==================== */}
          <div
            id="report-print-page-1"
            style={{
              width: "800px",
              height: "1130px",
              padding: "26px 32px",
              boxSizing: "border-box",
              backgroundColor: "#ffffff",
              color: "#0f172a",
              position: "relative",
              fontFamily: "Arial, Helvetica, -apple-system, sans-serif"
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #0f172a", paddingBottom: "8px", marginBottom: "8px" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <img src="/cssh_logo.jpg" alt="CSSH Logo" style={{ height: "32px", width: "auto", objectFit: "contain", alignSelf: "flex-start" }} />
                <span style={{ fontSize: "7px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px", lineHeight: 1.4 }}>
                  Empowering Movement, Every Day!
                </span>
              </div>
              <div style={{ textAlign: "center" }}>
                <h1 style={{ fontSize: "16px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", color: "#0f172a", fontStyle: "italic", margin: 0, lineHeight: 1.4 }}>
                  {reportTitle}
                </h1>
              </div>
              <div style={{ textAlign: "right", color: "#64748b" }}>
                <div style={{ fontSize: "8px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#334155", lineHeight: 1.4 }}>
                  Integrated Sports Health Facility
                </div>
                <div style={{ fontSize: "7px", color: "#94a3b8", marginTop: "2px", lineHeight: 1.4 }}>
                  Center for Spine & Sports Health
                </div>
              </div>
            </div>

            {/* Client Metadata Bar (6 Columns with explicit anti-clipping padding and line-height) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", backgroundColor: "#f8fafc", padding: "6px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "10px", textAlign: "left", alignItems: "center" }}>
              <div style={{ padding: "2px 0", overflow: "visible" }}>
                <div style={{ fontSize: "7.5px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                  Client Name
                </div>
                <div style={{ fontSize: "11px", fontWeight: 900, color: "#0f172a", textTransform: "uppercase", lineHeight: 1.4, paddingTop: "2px" }}>
                  {data.client.name}
                </div>
              </div>
              <div style={{ padding: "2px 0", overflow: "visible" }}>
                <div style={{ fontSize: "7.5px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                  Universal Health ID
                </div>
                <div style={{ fontSize: "10.5px", fontFamily: "monospace", fontWeight: 900, color: "#0f172a", lineHeight: 1.4, paddingTop: "2px" }}>
                  {clientUhid}
                </div>
              </div>
              <div style={{ padding: "2px 0", overflow: "visible" }}>
                <div style={{ fontSize: "7.5px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                  Assessment Date
                </div>
                <div style={{ fontSize: "10.5px", fontWeight: 900, color: "#0f172a", lineHeight: 1.4, paddingTop: "2px" }}>
                  {currentTest.date}
                </div>
              </div>
              <div style={{ padding: "2px 0", overflow: "visible" }}>
                <div style={{ fontSize: "7.5px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                  Test Series
                </div>
                <div style={{ fontSize: "10.5px", fontWeight: 900, color: "#0f172a", lineHeight: 1.4, paddingTop: "2px" }}>
                  Test {currentTest.index} of {data.client.tests.length}
                </div>
              </div>
              <div style={{ padding: "2px 0", overflow: "visible" }}>
                <div style={{ fontSize: "7.5px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                  Biometrics
                </div>
                <div style={{ fontSize: "10px", fontWeight: 900, color: "#0f172a", lineHeight: 1.4, paddingTop: "2px" }}>
                  {currentTest.height || "—"}cm / {currentTest.weight || "—"}kg (BMI {currentTest.bmi || "—"})
                </div>
              </div>
              <div style={{ padding: "2px 0", overflow: "visible" }}>
                <div style={{ fontSize: "7.5px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                  Follow-Up
                </div>
                <div style={{ fontSize: "10px", fontWeight: 900, color: "#0f172a", lineHeight: 1.4, paddingTop: "2px" }}>
                  {reassessmentDate || "Routine Series"}
                </div>
              </div>
            </div>

            {/* Main Page Grid: Left 46% (Full-Height Body Maps) | Right 54% (All 6 Clinical Sections) */}
            <div style={{ display: "grid", gridTemplateColumns: "5.5fr 6.5fr", gap: "12px", height: "930px", alignItems: "stretch" }}>
              
              {/* Left Column: Anterior & Posterior Body SVGs (Equal Halves, Large, Centered) */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", gap: "8px" }}>
                
                {/* 1. Anterior View Container */}
                <div style={{ flex: 1, backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "8px 10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", minHeight: 0 }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 900, letterSpacing: "0.15em", color: "#64748b", textTransform: "uppercase", lineHeight: 1.4 }}>
                    ANTERIOR VIEW
                  </div>
                  
                  <div style={{ flex: 1, width: "100%", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 0, padding: "2px 0" }}>
                    <div style={{ height: "100%", width: "100%", maxHeight: "390px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                      <BodySvg
                        gender={gender}
                        painData={painData}
                        view="front"
                        numberedBadges={numberedBadges}
                        layout="stacked"
                        hideTitle={true}
                        onRegionClick={() => {}}
                        hoveredRegion={null}
                        setHoveredRegion={() => {}}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Posterior View Container */}
                <div style={{ flex: 1, backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "8px 10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", minHeight: 0 }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 900, letterSpacing: "0.15em", color: "#64748b", textTransform: "uppercase", lineHeight: 1.4 }}>
                    POSTERIOR VIEW
                  </div>
                  
                  <div style={{ flex: 1, width: "100%", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 0, padding: "2px 0" }}>
                    <div style={{ height: "100%", width: "100%", maxHeight: "390px", display: "flex", justifyContent: "center", alignItems: "center" }}>
                      <BodySvg
                        gender={gender}
                        painData={painData}
                        view="back"
                        numberedBadges={numberedBadges}
                        layout="stacked"
                        hideTitle={true}
                        onRegionClick={() => {}}
                        hoveredRegion={null}
                        setHoveredRegion={() => {}}
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: All 6 Clinical Sections + Consultation + Sign-Off (Dynamically Sized) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", height: "100%", justifyContent: "flex-start", textAlign: "left", minHeight: 0 }}>
                
                {/* 0. Subjective Pain Consultation Card */}
                <div style={{ padding: "6px 8px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "7.5px", fontWeight: 900, letterSpacing: "0.05em", color: "#475569", textTransform: "uppercase", lineHeight: 1.4 }}>
                      Subjective Pain Assessment (Consultation)
                    </div>
                    {subjectivePainData?.scores ? (
                      <span style={{ fontSize: "6.5px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#047857", backgroundColor: "#d1fae5", padding: "1.5px 5px", borderRadius: "3px" }}>
                        Recorded in SOAP
                      </span>
                    ) : (
                      <span style={{ fontSize: "6.5px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#b45309", backgroundColor: "#fef3c7", padding: "1.5px 5px", borderRadius: "3px" }}>
                        Missing / Not Recorded
                      </span>
                    )}
                  </div>

                  {subjectivePainData?.scores ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px" }}>
                      <div style={{ backgroundColor: "#ffffff", padding: "2px 4px", borderRadius: "4px", border: "1px solid #f1f5f9", textAlign: "center" }}>
                        <div style={{ fontSize: "6px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Shoulder/Arm</div>
                        <div style={{ fontSize: "9px", fontWeight: 900, color: "#0f172a" }}>{(subjectivePainData.scores.shoulderAndArm ?? subjectivePainData.scores.shoulder_and_arm) ?? 0}/10</div>
                      </div>
                      <div style={{ backgroundColor: "#ffffff", padding: "2px 4px", borderRadius: "4px", border: "1px solid #f1f5f9", textAlign: "center" }}>
                        <div style={{ fontSize: "6px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Neck</div>
                        <div style={{ fontSize: "9px", fontWeight: 900, color: "#0f172a" }}>{subjectivePainData.scores.neck ?? 0}/10</div>
                      </div>
                      <div style={{ backgroundColor: "#ffffff", padding: "2px 4px", borderRadius: "4px", border: "1px solid #f1f5f9", textAlign: "center" }}>
                        <div style={{ fontSize: "6px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Back</div>
                        <div style={{ fontSize: "9px", fontWeight: 900, color: "#0f172a" }}>{subjectivePainData.scores.back ?? 0}/10</div>
                      </div>
                      <div style={{ backgroundColor: "#ffffff", padding: "2px 4px", borderRadius: "4px", border: "1px solid #f1f5f9", textAlign: "center" }}>
                        <div style={{ fontSize: "6px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Hip/Leg</div>
                        <div style={{ fontSize: "9px", fontWeight: 900, color: "#0f172a" }}>{(subjectivePainData.scores.hipAndLeg ?? subjectivePainData.scores.hip_and_leg) ?? 0}/10</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: "7px", color: "#94a3b8", fontStyle: "italic", lineHeight: 1.4 }}>
                      No subjective pain sensation map or NRS scores recorded during consultation.
                    </div>
                  )}
                </div>

                {/* 1. Clinical Summary (Dynamic Height & 8.5px Readable Font) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 900, letterSpacing: "0.05em", color: "#334155", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px", lineHeight: 1.4, paddingBottom: "1px" }}>
                    <span style={{ width: "3.5px", height: "10px", backgroundColor: "#2563eb", borderRadius: "2px", display: "inline-block" }} />
                    <span>Clinical Summary</span>
                  </div>
                  <div style={{ padding: "6px 8px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "8.5px", lineHeight: 1.45, color: "#1e293b", fontWeight: 500, whiteSpace: "pre-line" }}>
                    {reportTexts.clinicalSummary || "Client baseline test assessment recorded."}
                  </div>
                </div>

                {/* 2. Strength Findings (Dynamic Height & 8.5px Readable Font) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 900, letterSpacing: "0.05em", color: "#334155", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px", lineHeight: 1.4, paddingBottom: "1px" }}>
                    <span style={{ width: "3.5px", height: "10px", backgroundColor: "#0d9488", borderRadius: "2px", display: "inline-block" }} />
                    <span>Strength Assessment Findings</span>
                  </div>
                  <div style={{ padding: "6px 8px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "8.5px", lineHeight: 1.45, color: "#1e293b", fontWeight: 500, whiteSpace: "pre-line" }}>
                    {reportTexts.strengthFindings || "Assessment strength metrics recorded across muscle groups."}
                  </div>
                </div>

                {/* 3. Mobility Findings (Dynamic Height & 8.5px Readable Font) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 900, letterSpacing: "0.05em", color: "#334155", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px", lineHeight: 1.4, paddingBottom: "1px" }}>
                    <span style={{ width: "3.5px", height: "10px", backgroundColor: "#6366f1", borderRadius: "2px", display: "inline-block" }} />
                    <span>Mobility & Range of Motion Findings</span>
                  </div>
                  <div style={{ padding: "6px 8px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "8.5px", lineHeight: 1.45, color: "#1e293b", fontWeight: 500, whiteSpace: "pre-line" }}>
                    {reportTexts.mobilityFindings || "Mobility tests recorded with active range of motion metrics."}
                  </div>
                </div>

                {/* 4. Strength Balance Findings (Dynamic Height & 8.5px Readable Font) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 900, letterSpacing: "0.05em", color: "#334155", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px", lineHeight: 1.4, paddingBottom: "1px" }}>
                    <span style={{ width: "3.5px", height: "10px", backgroundColor: "#14b8a6", borderRadius: "2px", display: "inline-block" }} />
                    <span>Strength Balance & Symmetry Findings</span>
                  </div>
                  <div style={{ padding: "6px 8px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "8.5px", lineHeight: 1.45, color: "#1e293b", fontWeight: 500, whiteSpace: "pre-line" }}>
                    {reportTexts.balanceFindings || "Bilateral symmetry and agonist/antagonist balance recorded."}
                  </div>
                </div>

                {/* 5. Clinical Impression / Diagnosis (Dynamic Height & 8.5px Readable Font) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 900, letterSpacing: "0.05em", color: "#334155", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px", lineHeight: 1.4, paddingBottom: "1px" }}>
                    <span style={{ width: "3.5px", height: "10px", backgroundColor: "#d97706", borderRadius: "2px", display: "inline-block" }} />
                    <span>Clinical Impression / Diagnosis</span>
                  </div>
                  <div style={{ padding: "6px 8px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "8.5px", lineHeight: 1.45, color: "#1e293b", fontWeight: 500, whiteSpace: "pre-line" }}>
                    {reportTexts.clinicalImpression || "Clinical impression established based on movement and isometric testing."}
                  </div>
                </div>

                {/* 6. Recommendations & Rehabilitation Plan (Dynamic Height & 8.5px Readable Font) */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 900, letterSpacing: "0.05em", color: "#334155", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "5px", lineHeight: 1.4, paddingBottom: "1px" }}>
                    <span style={{ width: "3.5px", height: "10px", backgroundColor: "#059669", borderRadius: "2px", display: "inline-block" }} />
                    <span>Recommendations & Rehabilitation Plan</span>
                  </div>
                  <div style={{ padding: "6px 8px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "8.5px", lineHeight: 1.45, color: "#1e293b", fontWeight: 500, whiteSpace: "pre-line" }}>
                    {reportTexts.recommendations || "Tailored rehabilitation and progressive loading protocol advised."}
                  </div>
                </div>

                {/* Practitioner Sign-Off Bar (Anchored Cleanly at the Bottom) */}
                <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px dashed #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "6.5px", color: "#94a3b8", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                      Practitioner Sign-Off
                    </div>
                    <div style={{ fontSize: "10px", fontWeight: 900, color: "#0f172a", lineHeight: 1.4, paddingTop: "1px" }}>
                      {effectivePractitionerName}
                    </div>
                    <div style={{ fontSize: "7px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                      {effectivePractitionerRole}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "7.5px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0d9488", backgroundColor: "#f0fdfa", border: "1px solid #ccfbf1", padding: "2px 8px", borderRadius: "12px", lineHeight: 1.4 }}>
                      ✓ Clinically Signed via CSSH
                    </div>
                    <div style={{ fontSize: "7.5px", fontWeight: 700, color: "#64748b", marginTop: "2px", lineHeight: 1.4 }}>
                      Log Date: {currentTest.date}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Page 1 Footer */}
            <div style={{ position: "absolute", bottom: "10px", left: "32px", right: "32px", borderTop: "1px solid #f1f5f9", paddingTop: "4px", display: "flex", justifyContent: "space-between", fontSize: "6.5px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
              <span>Center for Spine and Sports Health, Hyderabad</span>
              <span>Validated Clinical Assessment Report • {hasPage2 ? "Page 1 of 2" : "Page 1 of 1"}</span>
            </div>
          </div>

          {/* ==================== PAGE 2 (MARKED REGION NOTES & OBSERVATIONS) ==================== */}
          {hasPage2 && (
            <div
              id="report-print-page-2"
              style={{
                width: "800px",
                height: "1130px",
                padding: "26px 32px",
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
                color: "#0f172a",
                position: "relative",
                fontFamily: "Arial, Helvetica, -apple-system, sans-serif"
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #0f172a", paddingBottom: "8px", marginBottom: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <img src="/cssh_logo.jpg" alt="CSSH Logo" style={{ height: "32px", width: "auto", objectFit: "contain", alignSelf: "flex-start" }} />
                  <span style={{ fontSize: "7px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px", lineHeight: 1.4 }}>
                    Empowering Movement, Every Day!
                  </span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <h1 style={{ fontSize: "15px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.02em", color: "#0f172a", fontStyle: "italic", margin: 0, lineHeight: 1.4 }}>
                    REGION-LEVEL CLINICAL REMARKS & TISSUE OBSERVATIONS
                  </h1>
                </div>
                <div style={{ textAlign: "right", color: "#64748b" }}>
                  <div style={{ fontSize: "8px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#334155", lineHeight: 1.4 }}>
                    Integrated Sports Health Facility
                  </div>
                  <div style={{ fontSize: "7px", color: "#94a3b8", marginTop: "2px", lineHeight: 1.4 }}>
                    Center for Spine & Sports Health
                  </div>
                </div>
              </div>

              {/* Client Metadata Bar */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "8px", backgroundColor: "#f8fafc", padding: "6px 12px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "12px", textAlign: "left", alignItems: "center" }}>
                <div style={{ padding: "2px 0", overflow: "visible" }}>
                  <div style={{ fontSize: "7.5px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                    Client Name
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: 900, color: "#0f172a", textTransform: "uppercase", lineHeight: 1.4, paddingTop: "2px" }}>
                    {data.client.name}
                  </div>
                </div>
                <div style={{ padding: "2px 0", overflow: "visible" }}>
                  <div style={{ fontSize: "7.5px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                    Universal Health ID
                  </div>
                  <div style={{ fontSize: "10.5px", fontFamily: "monospace", fontWeight: 900, color: "#0f172a", lineHeight: 1.4, paddingTop: "2px" }}>
                    {clientUhid}
                  </div>
                </div>
                <div style={{ padding: "2px 0", overflow: "visible" }}>
                  <div style={{ fontSize: "7.5px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                    Assessment Date
                  </div>
                  <div style={{ fontSize: "10.5px", fontWeight: 900, color: "#0f172a", lineHeight: 1.4, paddingTop: "2px" }}>
                    {currentTest.date}
                  </div>
                </div>
                <div style={{ padding: "2px 0", overflow: "visible" }}>
                  <div style={{ fontSize: "7.5px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                    Test Series
                  </div>
                  <div style={{ fontSize: "10.5px", fontWeight: 900, color: "#0f172a", lineHeight: 1.4, paddingTop: "2px" }}>
                    Test {currentTest.index} of {data.client.tests.length}
                  </div>
                </div>
                <div style={{ padding: "2px 0", overflow: "visible" }}>
                  <div style={{ fontSize: "7.5px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                    Biometrics
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: 900, color: "#0f172a", lineHeight: 1.4, paddingTop: "2px" }}>
                    {currentTest.height || "—"}cm / {currentTest.weight || "—"}kg (BMI {currentTest.bmi || "—"})
                  </div>
                </div>
                <div style={{ padding: "2px 0", overflow: "visible" }}>
                  <div style={{ fontSize: "7.5px", color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                    Remarks Count
                  </div>
                  <div style={{ fontSize: "10px", fontWeight: 900, color: "#0f172a", lineHeight: 1.4, paddingTop: "2px" }}>
                    {markedRegionsWithNotes.length} Regions Noted
                  </div>
                </div>
              </div>

              {/* Title Header for Notes Section */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "4px", marginBottom: "12px", textAlign: "left" }}>
                <div style={{ fontSize: "8.5px", fontWeight: 900, letterSpacing: "0.08em", color: "#1e293b", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "4px", height: "11px", backgroundColor: "#dc2626", borderRadius: "2px", display: "inline-block" }} />
                  <span>Marked Anatomical Region Remarks & Tissue Notes (Max 200 Chars)</span>
                </div>
                <span style={{ fontSize: "7.5px", fontWeight: 800, color: "#dc2626", backgroundColor: "#fee2e2", padding: "2px 6px", borderRadius: "4px" }}>
                  {markedRegionsWithNotes.length} {markedRegionsWithNotes.length === 1 ? "Region" : "Regions"} with Notes
                </span>
              </div>

              {/* Cards Grid for Marked Region Notes */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", textAlign: "left", marginBottom: "16px" }}>
                {markedRegionsWithNotes.map((reg) => {
                  const isFront = frontRegionIds.includes(reg.id);
                  return (
                    <div
                      key={reg.id}
                      style={{
                        padding: "10px 12px",
                        backgroundColor: "#f8fafc",
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: "#dc2626", color: "#ffffff", fontSize: "9px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {reg.num}
                          </span>
                          <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#0f172a", letterSpacing: "0.02em" }}>
                            {reg.label}
                          </span>
                        </div>
                        <span style={{ fontSize: "7px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", backgroundColor: "#ffffff", border: "1px solid #cbd5e1", padding: "1px 5px", borderRadius: "4px" }}>
                          {isFront ? "Anterior View" : "Posterior View"}
                        </span>
                      </div>

                      <div style={{ padding: "8px 10px", backgroundColor: "#ffffff", borderRadius: "6px", border: "1px solid #f1f5f9", fontSize: "8px", lineHeight: 1.5, color: "#334155", fontWeight: 500 }}>
                        {reg.notes}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Physical Profile Summary Card on Page 2 */}
              <div style={{ backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "10px 14px", marginBottom: "20px", textAlign: "left" }}>
                <div style={{ fontSize: "8px", fontWeight: 900, textTransform: "uppercase", color: "#475569", letterSpacing: "0.05em", marginBottom: "6px" }}>
                  Client Physical Profile & Test Overview
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "7px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Standing Height</div>
                    <div style={{ fontSize: "10px", fontWeight: 900, color: "#0f172a", marginTop: "1px" }}>{currentTest.height || "—"} cm</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "7px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Body Mass</div>
                    <div style={{ fontSize: "10px", fontWeight: 900, color: "#0f172a", marginTop: "1px" }}>{currentTest.weight || "—"} kg</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "7px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Body Mass Index</div>
                    <div style={{ fontSize: "10px", fontWeight: 900, color: "#0f172a", marginTop: "1px" }}>{currentTest.bmi || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "7px", color: "#94a3b8", fontWeight: 800, textTransform: "uppercase" }}>Clinical Assessment Date</div>
                    <div style={{ fontSize: "10px", fontWeight: 900, color: "#0f172a", marginTop: "1px" }}>{currentTest.date}</div>
                  </div>
                </div>
              </div>

              {/* Practitioner Sign-Off on Page 2 */}
              <div style={{ position: "absolute", bottom: "34px", left: "32px", right: "32px", borderTop: "1px dashed #e2e8f0", paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "7px", color: "#94a3b8", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                    Practitioner Sign-Off & Verification
                  </div>
                  <div style={{ fontSize: "10.5px", fontWeight: 900, color: "#0f172a", lineHeight: 1.4, paddingTop: "1px" }}>
                    {effectivePractitionerName}
                  </div>
                  <div style={{ fontSize: "7px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                    {effectivePractitionerRole} • {organizationName}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "7.5px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em", color: "#0d9488", backgroundColor: "#f0fdfa", border: "1px solid #ccfbf1", padding: "2px 8px", borderRadius: "12px", lineHeight: 1.4 }}>
                    ✓ Clinically Signed via CSSH
                  </div>
                  <div style={{ fontSize: "7.5px", fontWeight: 700, color: "#64748b", marginTop: "3px", lineHeight: 1.4 }}>
                    Log Date: {currentTest.date}
                  </div>
                </div>
              </div>

              {/* Page 2 Footer */}
              <div style={{ position: "absolute", bottom: "10px", left: "32px", right: "32px", borderTop: "1px solid #f1f5f9", paddingTop: "4px", display: "flex", justifyContent: "space-between", fontSize: "6.5px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", lineHeight: 1.4 }}>
                <span>Center for Spine and Sports Health, Hyderabad</span>
                <span>Validated Clinical Assessment Report • Page 2 of 2</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
