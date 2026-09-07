import React, { useReducer, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { ParsedAssessmentData } from "./XlsParser";
import ReportEntryPanel from "./ReportEntryPanel";
import ReportHeader from "./ReportHeader";
import StrengthOverview from "./StrengthOverview";
import EditableReport from "./EditableReport";
import ExportPanel from "./ExportPanel";
import PainMap, { MapData } from "@/components/consultant/PainMap";
import AssessmentPathologyMap, { AssessmentPathologyData } from "./AssessmentPathologyMap";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Flame, Layers, AlertCircle, Calendar, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  honorific?: string;
  uhid: string;
  gender?: string;
}

interface AssessmentReportProps {
  role: "admin" | "consultant" | "sports_scientist" | "client" | "foe" | "manager";
  initialData?: ParsedAssessmentData;
  initialActiveTestIndex?: number;
  initialPainData?: MapData;
  initialClientId?: string;
  initialReassessmentDate?: string;
  initialReportTexts?: Record<string, string>;
  initialReportTitle?: string;
  readOnly?: boolean;
}

type ReportPhase = "idle" | "loaded";

interface ReportState {
  phase: ReportPhase;
  data: ParsedAssessmentData | null;
  selectedClientId?: string;
  selectedClientGender?: string;
  clientName: string;
}

type ReportAction =
  | { type: "PARSE_SUCCESS"; payload: { data: ParsedAssessmentData; clientName: string; clientId?: string; clientGender?: string } }
  | { type: "RESET" };

const initialState: ReportState = {
  phase: "idle",
  data: null,
  selectedClientId: undefined,
  selectedClientGender: undefined,
  clientName: "",
};

function reportReducer(state: ReportState, action: ReportAction): ReportState {
  switch (action.type) {
    case "PARSE_SUCCESS":
      return {
        phase: "loaded",
        data: action.payload.data,
        selectedClientId: action.payload.clientId,
        selectedClientGender: action.payload.clientGender,
        clientName: action.payload.clientName,
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export default function AssessmentReport({
  role,
  initialData,
  initialActiveTestIndex,
  initialPainData,
  initialClientId,
  initialReassessmentDate,
  initialReportTexts,
  initialReportTitle,
  readOnly = false,
}: AssessmentReportProps) {
  const [state, dispatch] = useReducer(reportReducer, {
    phase: initialData ? "loaded" : "idle",
    data: initialData ?? null,
    selectedClientId: initialClientId,
    selectedClientGender: initialData?.client.gender,
    clientName: initialData?.client.name ?? "",
  });
  
  // Shared state components
  const [activeTestIndex, setActiveTestIndex] = useState<number>(initialActiveTestIndex ?? 1);
  const [painData, setPainData] = useState<AssessmentPathologyData>(initialPainData ?? {});
  const [reassessmentDate, setReassessmentDate] = useState<string>(initialReassessmentDate ?? "");
  const [reportTexts, setReportTexts] = useState<Record<string, string>>(initialReportTexts ?? {});
  const [reportTitle, setReportTitle] = useState<string>(initialReportTitle ?? "MUSCLE HEATMAP ASSESSMENT");
  
  // Top view mode toggle: 'subjective' | 'assessment'
  const [viewMode, setViewMode] = useState<"subjective" | "assessment">("subjective");

  // Query to fetch all active clients
  const { data: clients, isLoading: isClientsLoading } = useQuery<Client[]>({
    queryKey: ["assessment-report-clients"],
    queryFn: async () => {
      return apiFetch<Client[]>("/clients");
    },
  });

  const activeClientId = state.selectedClientId || initialClientId;

  // Query to fetch the latest saved subjective pain consultation report for the active client
  const { data: subjectivePainResult, isLoading: isSubjectivePainLoading } = useQuery({
    queryKey: ["client-latest-subjective-pain", activeClientId],
    queryFn: async () => {
      if (!activeClientId) return { found: false };
      return apiFetch<{
        found: boolean;
        sessionId?: string;
        scheduledStart?: string;
        serviceType?: string;
        therapistName?: string;
        painScore?: number;
        sorenessData?: any;
        clinicalNotes?: string;
      }>(`/clinical/clients/${activeClientId}/latest-subjective-pain`);
    },
    enabled: !!activeClientId,
  });

  const handleParseSuccess = (
    parsedData: ParsedAssessmentData,
    clientName: string,
    clientId?: string,
    clientGender?: string
  ) => {
    // Default active test to latest test index
    const latestIdx = parsedData.client.latestTest?.index || 1;
    setActiveTestIndex(latestIdx);
    setPainData({});
    
    dispatch({
      type: "PARSE_SUCCESS",
      payload: { data: parsedData, clientName, clientId, clientGender },
    });
  };

  const handleReset = () => {
    dispatch({ type: "RESET" });
    setActiveTestIndex(1);
    setPainData({});
    setReassessmentDate("");
    setReportTexts({});
    setReportTitle("MUSCLE HEATMAP ASSESSMENT");
    setViewMode("subjective");
  };

  const handleActiveTestIndexChange = (index: number) => {
    setActiveTestIndex(index);
  };

  const markedCount = Object.values(painData).filter(r => r && r.marked !== false).length;
  const clientGender = ((state.selectedClientGender || state.data?.client.gender)?.toLowerCase() === "female" ? "female" : "male") as "male" | "female";

  if (isClientsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3" role="status">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Loading clinical directories...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-7xl mx-auto px-4 md:px-6 py-4">
      {state.phase === "idle" ? (
        <ReportEntryPanel
          clients={clients}
          onParseSuccess={handleParseSuccess}
        />
      ) : (
        state.data && (
          <div className="space-y-6 animate-fade-in">
            {/* Header section */}
            <ReportHeader
              clientData={state.data.client}
              activeTestIndex={activeTestIndex}
              onActiveTestIndexChange={handleActiveTestIndexChange}
              onReset={handleReset}
              readOnly={readOnly}
            />

            {/* Split Grid Layout: Left heatmap/SVG, Right textareas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Subjective Pain / Assessment Values toggle & view */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col space-y-4">
                  
                  {/* Mode Segmented Toggle */}
                  <div className="flex items-center p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 w-full shadow-inner">
                    <button
                      type="button"
                      onClick={() => setViewMode("subjective")}
                      className={cn(
                        "flex-1 py-2 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 select-none",
                        viewMode === "subjective"
                          ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      <Flame className="w-3.5 h-3.5 text-red-500" />
                      <span>Subjective Pain</span>
                      {subjectivePainResult?.found ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 ml-1 shrink-0 shadow-xs" title="Consultation report present" />
                      ) : (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-black ml-1 shrink-0">
                          Missing
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewMode("assessment")}
                      className={cn(
                        "flex-1 py-2 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 select-none",
                        viewMode === "assessment"
                          ? "bg-white dark:bg-slate-900 text-primary shadow-xs"
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Assessment Values</span>
                      {markedCount > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-black ml-1 shrink-0">
                          {markedCount}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* View 1: Subjective Pain (Saved consultation report) */}
                  {viewMode === "subjective" && (
                    <div className="space-y-3 animate-fade-in">
                      {isSubjectivePainLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-2">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Checking consultation subjective pain report...
                          </p>
                        </div>
                      ) : subjectivePainResult?.found && subjectivePainResult?.sorenessData ? (
                        <div className="space-y-3">
                          {/* Consultation metadata tag */}
                          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-[11px]">
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
                              <Calendar className="w-3.5 h-3.5 text-primary" />
                              <span>{new Date(subjectivePainResult.scheduledStart || "").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{subjectivePainResult.therapistName || "Consultant"}</span>
                            </div>
                          </div>

                          <PainMap
                            value={subjectivePainResult.sorenessData}
                            readOnly={true}
                            gender={clientGender}
                            layout="stacked"
                          />
                        </div>
                      ) : (
                        /* Missing Report State */
                        <div className="py-10 px-6 rounded-3xl bg-amber-500/5 dark:bg-amber-500/10 border border-dashed border-amber-500/30 text-center space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
                            <AlertCircle className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-black uppercase tracking-tight text-amber-900 dark:text-amber-200">
                              Subjective Pain Report Missing
                            </h4>
                            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed max-w-xs mx-auto">
                              No patient-reported subjective pain sensation map or NRS scores were recorded in SOAP notes during consultation.
                            </p>
                          </div>
                          <div className="pt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setViewMode("assessment")}
                              className="rounded-xl border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 dark:hover:bg-amber-950/50"
                            >
                              <Layers className="w-3.5 h-3.5 mr-1.5" />
                              Switch to Assessment Values
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* View 2: Assessment Values (Clinician SVG Map) */}
                  {viewMode === "assessment" && (
                    <div className="space-y-3 animate-fade-in">
                      <AssessmentPathologyMap
                        gender={clientGender}
                        value={painData}
                        onChange={setPainData}
                        readOnly={readOnly}
                        layout="stacked"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Summaries, Observations, accordions */}
              <div className="lg:col-span-7">
                <EditableReport
                  data={state.data}
                  activeTestIndex={activeTestIndex}
                  reassessmentDate={reassessmentDate}
                  onReassessmentDateChange={setReassessmentDate}
                  onReportTextsChange={setReportTexts}
                  reportTexts={reportTexts}
                  setReportTexts={setReportTexts}
                  reportTitle={reportTitle}
                  onReportTitleChange={setReportTitle}
                  readOnly={readOnly}
                />
              </div>
            </div>

            {/* Bottom Footer: Strength Summary Tabs & Export Panel */}
            <div className="space-y-6">
              <StrengthOverview
                strengthSummary={state.data.strengthSummary}
                activeTestIndex={activeTestIndex}
              />

              <ExportPanel
                data={state.data}
                activeTestIndex={activeTestIndex}
                reportTexts={reportTexts}
                painData={painData}
                subjectivePainData={subjectivePainResult?.found ? subjectivePainResult.sorenessData : undefined}
                reassessmentDate={reassessmentDate}
                reportTitle={reportTitle}
                clientId={state.selectedClientId}
                clients={clients}
                readOnly={readOnly}
              />
            </div>
          </div>
        )
      )}
    </div>
  );
}
