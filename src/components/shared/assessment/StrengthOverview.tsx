import React, { useState } from "react";
import { ParsedAssessmentData, StrengthCategorySummary, getStatusFromPercent, StatusGrade } from "./XlsParser";
import StrengthRing from "./StrengthRing";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, ChevronDown, ChevronUp, AlertCircle, Info } from "lucide-react";

interface StrengthOverviewProps {
  strengthSummary: Record<string, StrengthCategorySummary>;
  activeTestIndex: number;
}

export default function StrengthOverview({ strengthSummary, activeTestIndex }: StrengthOverviewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Strength categories mapping
  const categoriesList = [
    { key: "Cervical spine", label: "Cervical Spine" },
    { key: "Lumbar / Thoracic Spine", label: "Lumbar / Thoracic Spine" },
    { key: "Shoulder and arm", label: "Shoulder" },
    { key: "Hip and knee", label: "Hip & Knee" },
  ];

  const handleCategoryClick = (key: string) => {
    setSelectedCategory((prev) => (prev === key ? null : key));
  };

  const getStatusColor = (status: StatusGrade): string => {
    const statusColors: Record<StatusGrade, string> = {
      good: "text-green-500",
      moderate: "text-amber-500",
      "needs-work": "text-orange-500",
      priority: "text-red-500",
    };
    return statusColors[status] || "text-amber-500";
  };

  // Find active test's average for a category
  const getCategoryAvgForTest = (summary: StrengthCategorySummary) => {
    const testIndex = activeTestIndex - 1;
    return summary.testAverages[testIndex] ?? summary.latestAverage;
  };

  const getCategoryStatusForTest = (summary: StrengthCategorySummary) => {
    const avg = getCategoryAvgForTest(summary);
    return getStatusFromPercent(avg);
  };

  return (
    <div className="space-y-6">
      {/* Strength Rings Card */}
      <Card className="gradient-card border-border shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-black tracking-tight text-foreground uppercase italic flex items-center gap-1.5">
                <ArrowUpDown className="w-4 h-4 text-primary" />
                Strength Overview
              </h3>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                Isometric strength performance aggregates vs reference values
              </p>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categoriesList.map((cat) => {
              const summary = strengthSummary[cat.key];

              if (!summary || summary.metrics.length === 0) {
                return (
                  <div
                    key={cat.key}
                    className="flex flex-col items-center justify-center p-6 border border-dashed rounded-2xl bg-muted/20 text-center space-y-2"
                  >
                    <AlertCircle className="w-6 h-6 text-muted-foreground/40" />
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-tight">{cat.label}</p>
                      <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                        No reference data
                      </p>
                    </div>
                  </div>
                );
              }

              const isSelected = selectedCategory === cat.key;
              const testAvg = getCategoryAvgForTest(summary);
              const testStatus = getCategoryStatusForTest(summary);

              return (
                <div
                  key={cat.key}
                  onClick={() => handleCategoryClick(cat.key)}
                  className={`cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                    isSelected
                      ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-slate-950 rounded-2xl"
                      : ""
                  }`}
                >
                  <StrengthRing
                    title={summary.label}
                    latestAverage={testAvg}
                    testAverages={summary.testAverages}
                    status={testStatus}
                  />
                  <div className="flex justify-center -mt-2.5 pb-2.5">
                    {isSelected ? (
                      <ChevronUp className="w-4 h-4 text-primary animate-bounce" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground/60" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detail Drawer Section */}
      {selectedCategory && strengthSummary[selectedCategory] && (
        <Card className="border border-primary/20 bg-primary/[0.02] shadow-inner rounded-3xl animate-fade-in">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h4 className="text-xs font-black text-primary uppercase tracking-wider">
                  {strengthSummary[selectedCategory].label} — Individual Metrics Detail
                </h4>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                  Comparison profile across all tests in series
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted px-2.5 py-1 rounded-lg border transition-all"
              >
                Close Details
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-white dark:bg-slate-900">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase">Metric Name</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-center">Ref. Value</TableHead>
                    {strengthSummary[selectedCategory].testAverages.map((_, idx) => (
                      <React.Fragment key={idx}>
                        <TableHead className="text-[10px] font-black uppercase text-center">T{idx + 1} Result</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center">T{idx + 1} % Ref.</TableHead>
                      </React.Fragment>
                    ))}
                    <TableHead className="text-[10px] font-black uppercase text-right">Latest Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {strengthSummary[selectedCategory].metrics.map((metric) => {
                    const testIndex = activeTestIndex - 1;
                    const testPercent = metric.tests[testIndex]?.percentRef;
                    const activeStatus = getStatusFromPercent(testPercent);

                    return (
                      <TableRow key={metric.key} className="hover:bg-primary/[0.01]">
                        <TableCell className="font-semibold text-xs text-foreground truncate max-w-xs">
                          {metric.label}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-center text-muted-foreground">
                          {metric.referenceValue ?? "—"}
                        </TableCell>
                        {metric.tests.map((t, idx) => (
                          <React.Fragment key={idx}>
                            <TableCell className="font-mono text-xs text-center text-foreground/80">
                              {t.result ?? "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-center font-bold">
                              {t.percentRef !== null ? (
                                <span className={t.percentRef > 0 ? "text-green-600" : "text-red-500"}>
                                  {t.percentRef > 0 ? "+" : ""}
                                  {t.percentRef.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </TableCell>
                          </React.Fragment>
                        ))}
                        <TableCell className="text-right font-black uppercase text-[10px]">
                          <span className={getStatusColor(activeStatus)}>
                            {activeStatus.replace("-", " ")}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold italic bg-white/40 dark:bg-slate-900/10 p-3 rounded-2xl border border-dashed">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <span>
                Metrics without reference benchmarks are listed in the full detailed tables below this dashboard panel.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
