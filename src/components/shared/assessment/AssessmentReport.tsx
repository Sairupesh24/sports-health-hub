import React, { useReducer, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { ParsedAssessmentData } from "./XlsParser";
import ReportEntryPanel from "./ReportEntryPanel";
import ReportHeader from "./ReportHeader";
import StrengthOverview from "./StrengthOverview";
import EditableReport from "./EditableReport";
import ExportPanel from "./ExportPanel";
import PainMap, { MapData } from "@/components/consultant/PainMap";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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

// Map poor performing metrics (percentRef < -10%) to default region data
function computeDefaultPainData(data: ParsedAssessmentData, activeTestIndex: number): MapData {
  const painData: MapData = {};
  const testIndex = activeTestIndex - 1;
  if (testIndex < 0) return painData;

  const allMetrics = [
    ...data.metrics.mobility,
    ...data.metrics.strength,
    ...data.metrics.balance,
  ];

  allMetrics.forEach((metric) => {
    const test = metric.tests[testIndex];
    if (test && test.percentRef !== null && test.percentRef < -10) {
      const keyLower = metric.key.toLowerCase();
      const targetRegions: string[] = [];

      if (keyLower.includes("cervical")) {
        targetRegions.push("neck", "neck_back");
      }
      if (keyLower.includes("lumbar") || keyLower.includes("thoracic")) {
        targetRegions.push("lumbar_spine");
        if (keyLower.includes("extension") || keyLower.includes("rotation")) {
          targetRegions.push("trapezius");
        }
      }
      if (keyLower.includes("shoulder") || keyLower.includes("lateralpulldown")) {
        if (keyLower.includes("left")) {
          targetRegions.push("deltoid_left", "shoulder_left_back");
        } else if (keyLower.includes("right")) {
          targetRegions.push("deltoid_right", "shoulder_right_back");
        } else {
          targetRegions.push("deltoid_left", "shoulder_left_back", "deltoid_right", "shoulder_right_back");
        }
      }
      if (keyLower.includes("knee") || keyLower.includes("quadriceps")) {
        if (keyLower.includes("left")) {
          targetRegions.push("quadriceps_left", "tibialis_left");
        } else if (keyLower.includes("right")) {
          targetRegions.push("quadriceps_right", "tibialis_right");
        } else {
          targetRegions.push("quadriceps_left", "tibialis_left", "quadriceps_right", "tibialis_right");
        }
      }
      if (keyLower.includes("hip")) {
        if (keyLower.includes("extension")) {
          if (keyLower.includes("left")) {
            targetRegions.push("gluteus_left", "hamstrings_left");
          } else if (keyLower.includes("right")) {
            targetRegions.push("gluteus_right", "hamstrings_right");
          } else {
            targetRegions.push("gluteus_left", "hamstrings_left", "gluteus_right", "hamstrings_right");
          }
        } else {
          if (keyLower.includes("left")) {
            targetRegions.push("gluteus_left");
          } else if (keyLower.includes("right")) {
            targetRegions.push("gluteus_right");
          } else {
            targetRegions.push("gluteus_left", "gluteus_right");
          }
        }
      }

      targetRegions.forEach((regionId) => {
        if (!painData[regionId]) {
          painData[regionId] = {
            painLevel: 5,
            notes: `Auto-populated from poor performing metric: ${metric.label} (${test.percentRef!.toFixed(1)}%)`,
            qualities: [],
          };
        } else {
          painData[regionId].notes += `, ${metric.label} (${test.percentRef!.toFixed(1)}%)`;
        }
      });
    }
  });

  return painData;
}

export default function AssessmentReport({
  role,
  initialData,
  initialActiveTestIndex,
  initialPainData,
  initialReassessmentDate,
  initialReportTexts,
  initialReportTitle,
  readOnly = false,
}: AssessmentReportProps) {
  const [state, dispatch] = useReducer(reportReducer, {
    phase: initialData ? "loaded" : "idle",
    data: initialData ?? null,
    selectedClientId: undefined,
    selectedClientGender: initialData?.client.gender,
    clientName: initialData?.client.name ?? "",
  });
  
  // Shared state components
  const [activeTestIndex, setActiveTestIndex] = useState<number>(initialActiveTestIndex ?? 1);
  const [painData, setPainData] = useState<MapData>(initialPainData ?? {});
  const [reassessmentDate, setReassessmentDate] = useState<string>(initialReassessmentDate ?? "");
  const [reportTexts, setReportTexts] = useState<Record<string, string>>(initialReportTexts ?? {});
  const [reportTitle, setReportTitle] = useState<string>(initialReportTitle ?? "MUSCLE HEATMAP ASSESSMENT");

  // Query to fetch all active clients
  const { data: clients, isLoading: isClientsLoading } = useQuery<Client[]>({
    queryKey: ["assessment-report-clients"],
    queryFn: async () => {
      return apiFetch<Client[]>("/clients");
    },
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
    setPainData(computeDefaultPainData(parsedData, latestIdx));
    
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
  };

  const handleActiveTestIndexChange = (index: number) => {
    setActiveTestIndex(index);
    if (state.data) {
      setPainData(computeDefaultPainData(state.data, index));
    }
  };

  // Group poor performing regions and number them 1 to N
  const getPoorPerformingRegionsList = () => {
    if (!state.data) return [];
    const testIndex = activeTestIndex - 1;
    if (testIndex < 0) return [];

    const allMetrics = [
      ...state.data.metrics.mobility,
      ...state.data.metrics.strength,
      ...state.data.metrics.balance,
    ];

    const regionsList: { id: string; label: string; percentRef: number; metricLabel: string; notes: string }[] = [];
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
    const grouped: Record<string, typeof regionsList[0]> = {};
    regionsList.forEach((item) => {
      if (!grouped[item.id]) {
        grouped[item.id] = { ...item };
      } else {
        grouped[item.id].notes += ` Deficit detected: ${item.percentRef.toFixed(1)}% relative to reference value in ${item.metricLabel}.`;
      }
    });

    return Object.values(grouped);
  };

  const groupedPoorRegions = getPoorPerformingRegionsList();

  // Create numberedBadges mapping
  const numberedBadges: Record<string, number> = {};
  groupedPoorRegions.forEach((reg, idx) => {
    numberedBadges[reg.id] = idx + 1;
  });

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

            {/* Split Grid Layout: Left heatmap, Right textareas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Heatmap (stacked vertically) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-xl flex flex-col space-y-3">
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase italic">
                      Target Pathology Heatmap
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                      Pre-populated based on poor performing indices
                    </p>
                  </div>
                  <PainMap
                    value={painData}
                    onChange={setPainData}
                    readOnly={readOnly}
                    gender={(state.selectedClientGender || state.data.client.gender)?.toLowerCase() === "female" ? "female" : "male"}
                    layout="stacked"
                    numberedBadges={numberedBadges}
                  />
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

            {/* Bottom Footer: Circular Strength Charts & Export Panel */}
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
