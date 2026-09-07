import React, { useState, useEffect } from "react";
import { StrengthCategorySummary, getStatusFromPercent, StatusGrade, MetricItem } from "./XlsParser";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, ChevronDown, ChevronUp, AlertCircle, Info, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StrengthOverviewProps {
  strengthSummary: Record<string, StrengthCategorySummary>;
  activeTestIndex: number;
}

interface ImprovementResult {
  value: number | null;
  text: string;
  direction: "positive" | "negative" | "neutral" | "none";
}

export default function StrengthOverview({ strengthSummary, activeTestIndex }: StrengthOverviewProps) {
  // Strength categories mapping with exact labels
  const categoriesList = [
    { key: "Cervical spine", label: "Cervical Spine" },
    { key: "Lumbar / Thoracic Spine", label: "Lumbar / Thoracic Spine" },
    { key: "Hip and knee", label: "Hip and Knee" },
    { key: "Shoulder and arm", label: "Shoulder" },
  ];

  // Default to first category that has metrics
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    const firstWithData = categoriesList.find((cat) => strengthSummary[cat.key]?.metrics?.length > 0);
    return firstWithData ? firstWithData.key : categoriesList[0]?.key || null;
  });

  useEffect(() => {
    if (!selectedCategory || !strengthSummary[selectedCategory]?.metrics?.length) {
      const firstWithData = categoriesList.find((cat) => strengthSummary[cat.key]?.metrics?.length > 0);
      if (firstWithData) {
        setSelectedCategory(firstWithData.key);
      }
    }
  }, [strengthSummary, selectedCategory]);

  const handleCategoryClick = (key: string) => {
    setSelectedCategory((prev) => (prev === key ? null : key));
  };

  /**
   * Calculate percentage improvement comparative to previous test if any
   */
  const calculateImprovement = (metric: MetricItem, activeTestIdx: number): ImprovementResult => {
    const testIndex = activeTestIdx - 1;
    if (testIndex <= 0 || !metric.tests || metric.tests.length < 2) {
      return { value: null, text: "—", direction: "none" };
    }

    const curr = metric.tests[testIndex];
    const prev = metric.tests[testIndex - 1];

    if (!curr || !prev) {
      return { value: null, text: "—", direction: "none" };
    }

    // 1. Primary: calculate percentage change in raw result value if both are valid numbers
    if (
      curr.result !== null &&
      prev.result !== null &&
      !isNaN(curr.result) &&
      !isNaN(prev.result) &&
      prev.result !== 0
    ) {
      const change = ((curr.result - prev.result) / Math.abs(prev.result)) * 100;
      const sign = change > 0 ? "+" : "";
      return {
        value: change,
        text: `${sign}${change.toFixed(1)}%`,
        direction: change > 0 ? "positive" : change < 0 ? "negative" : "neutral",
      };
    }

    // 2. Secondary: if results are missing or 0, calculate delta in % Ref
    if (
      curr.percentRef !== null &&
      prev.percentRef !== null &&
      !isNaN(curr.percentRef) &&
      !isNaN(prev.percentRef)
    ) {
      const delta = curr.percentRef - prev.percentRef;
      const sign = delta > 0 ? "+" : "";
      return {
        value: delta,
        text: `${sign}${delta.toFixed(1)}%`,
        direction: delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral",
      };
    }

    return { value: null, text: "—", direction: "none" };
  };

  const getImpressionBadge = (status: StatusGrade) => {
    const badgeConfig: Record<
      StatusGrade,
      { label: string; bg: string; text: string; border: string; dot: string }
    > = {
      good: {
        label: "Good",
        bg: "bg-emerald-500/10",
        text: "text-emerald-700 dark:text-emerald-400",
        border: "border-emerald-500/30",
        dot: "bg-emerald-500",
      },
      moderate: {
        label: "Moderate",
        bg: "bg-amber-500/10",
        text: "text-amber-700 dark:text-amber-400",
        border: "border-amber-500/30",
        dot: "bg-amber-500",
      },
      "needs-work": {
        label: "Needs Work",
        bg: "bg-orange-500/10",
        text: "text-orange-700 dark:text-orange-400",
        border: "border-orange-500/30",
        dot: "bg-orange-500",
      },
      priority: {
        label: "Priority",
        bg: "bg-rose-500/10",
        text: "text-rose-700 dark:text-rose-400",
        border: "border-rose-500/30",
        dot: "bg-rose-500",
      },
    };

    const config = badgeConfig[status] || badgeConfig.moderate;

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${config.bg} ${config.text} ${config.border}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Category Tabs Card */}
      <Card className="gradient-card border-border shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <div>
              <h3 className="text-sm font-black tracking-tight text-foreground uppercase italic flex items-center gap-1.5">
                <ArrowUpDown className="w-4 h-4 text-primary" />
                Strength Assessment Overview
              </h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                Select a tab to view individual metrics, comparative improvements, and clinical impressions
              </p>
            </div>
            {activeTestIndex > 1 && (
              <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                Comparing: Test {activeTestIndex} vs Test {activeTestIndex - 1}
              </span>
            )}
          </div>

          {/* Clean Modern Tabs with Category Names Only */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {categoriesList.map((cat) => {
              const summary = strengthSummary[cat.key];
              const hasData = summary && summary.metrics.length > 0;
              const isSelected = selectedCategory === cat.key;

              return (
                <button
                  key={cat.key}
                  type="button"
                  disabled={!hasData}
                  onClick={() => handleCategoryClick(cat.key)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all duration-200 ${
                    !hasData
                      ? "opacity-40 cursor-not-allowed bg-muted/20 border-dashed border-border text-muted-foreground"
                      : isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 ring-2 ring-primary/30 font-bold"
                      : "bg-card hover:bg-muted/40 text-foreground border-border hover:border-primary/40 font-semibold"
                  }`}
                >
                  <span className="text-xs sm:text-sm font-black tracking-tight uppercase truncate">
                    {cat.label}
                  </span>
                  {hasData && (
                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4 opacity-60" />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Expanded Table Section */}
      {selectedCategory && strengthSummary[selectedCategory] && (
        <Card className="border border-border/80 bg-card shadow-sm rounded-2xl animate-fade-in overflow-hidden">
          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  {strengthSummary[selectedCategory].label} — Individual Metrics Detail
                </h4>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                  Comparison profile across all recorded tests in series
                  {activeTestIndex > 1 && (
                    <span className="text-primary ml-1.5 font-semibold">
                      • Improvement calculated vs Test {activeTestIndex - 1}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted px-2.5 py-1 rounded-lg border transition-all self-start sm:self-auto"
              >
                Close Details
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-white dark:bg-slate-900/80 shadow-sm">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-b border-border">
                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-foreground/80 py-3">
                      Metric Name
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-center text-foreground/80 py-3">
                      Ref. Value
                    </TableHead>
                    {strengthSummary[selectedCategory].testAverages.map((_, idx) => (
                      <React.Fragment key={idx}>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider text-center text-foreground/80 py-3">
                          T{idx + 1} Result
                        </TableHead>
                        <TableHead className="text-[10px] font-black uppercase tracking-wider text-center text-foreground/80 py-3">
                          T{idx + 1} % Ref.
                        </TableHead>
                      </React.Fragment>
                    ))}
                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-center bg-primary/[0.04] text-primary py-3">
                      % Improvement
                      {activeTestIndex > 1 && (
                        <span className="block text-[8px] font-semibold text-muted-foreground/80 lowercase">
                          (vs T{activeTestIndex - 1})
                        </span>
                      )}
                    </TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-wider text-center md:text-right text-foreground/80 py-3">
                      Impression
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {strengthSummary[selectedCategory].metrics.map((metric) => {
                    const testIndex = activeTestIndex - 1;
                    const testPercent = metric.tests[testIndex]?.percentRef ?? metric.latestPercentRef;
                    const activeStatus = getStatusFromPercent(testPercent);
                    const improvement = calculateImprovement(metric, activeTestIndex);

                    return (
                      <TableRow
                        key={metric.key}
                        className="hover:bg-primary/[0.02] border-b border-border/60 transition-colors"
                      >
                        <TableCell className="font-semibold text-xs text-foreground truncate max-w-xs py-3">
                          {metric.label}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-center text-muted-foreground py-3">
                          {metric.referenceValue ?? "—"}
                        </TableCell>
                        {metric.tests.map((t, idx) => (
                          <React.Fragment key={idx}>
                            <TableCell className="font-mono text-xs text-center text-foreground/90 py-3">
                              {t.result !== null ? t.result : "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-center font-bold py-3">
                              {t.percentRef !== null ? (
                                <span
                                  className={
                                    t.percentRef > 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-rose-500 dark:text-rose-400"
                                  }
                                >
                                  {t.percentRef > 0 ? "+" : ""}
                                  {t.percentRef.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-slate-400 font-mono">—</span>
                              )}
                            </TableCell>
                          </React.Fragment>
                        ))}
                        {/* Percentage improvement (comparative to previous test if any) */}
                        <TableCell className="font-mono text-xs text-center font-black bg-primary/[0.02] py-3">
                          {improvement.direction === "positive" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <TrendingUp className="w-3 h-3 shrink-0" />
                              {improvement.text}
                            </span>
                          ) : improvement.direction === "negative" ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                              <TrendingDown className="w-3 h-3 shrink-0" />
                              {improvement.text}
                            </span>
                          ) : improvement.direction === "neutral" ? (
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <Minus className="w-3 h-3 shrink-0" />
                              {improvement.text}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60 font-mono font-medium">—</span>
                          )}
                        </TableCell>
                        {/* Impression */}
                        <TableCell className="text-center md:text-right py-3">
                          {getImpressionBadge(activeStatus)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-semibold italic bg-muted/20 p-3 rounded-xl border border-dashed border-border/80">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <span>
                % Improvement indicates relative progression compared to the previous test session (if any). Impression categorizes performance grade relative to normative reference benchmarks.
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

