import React, { useState, useEffect, useMemo } from "react";
import { StrengthCategorySummary, getStatusFromPercent, StatusGrade, MetricItem, normalizeCategoryKey } from "./XlsParser";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StrengthOverviewProps {
  strengthSummary: Record<string, StrengthCategorySummary>;
  activeTestIndex: number;
}

interface ImprovementResult {
  value: number | null;
  text: string;
  direction: "positive" | "negative" | "neutral" | "none";
  note?: string;
}

export default function StrengthOverview({ strengthSummary, activeTestIndex }: StrengthOverviewProps) {
  // Canonical categories list (with aliases for new template formats e.g. Neck, Torso, Limbs)
  const categoriesList = useMemo(
    () => [
      { key: "Cervical spine", label: "Cervical Spine", sublabel: "Neck" },
      { key: "Lumbar / Thoracic Spine", label: "Lumbar / Thoracic Spine", sublabel: "Torso" },
      { key: "Hip and knee", label: "Hip and Knee", sublabel: "Lower Limbs" },
      { key: "Shoulder and arm", label: "Shoulder", sublabel: "Upper Limbs" },
    ],
    []
  );

  const activeTestIdx = activeTestIndex - 1;

  // Helper to find category summary by normalized key
  const getSummary = (key: string): StrengthCategorySummary | undefined => {
    if (strengthSummary[key]) return strengthSummary[key];
    const normalizedTarget = normalizeCategoryKey(key);
    for (const [k, v] of Object.entries(strengthSummary)) {
      if (normalizeCategoryKey(k) === normalizedTarget) {
        return v;
      }
    }
    return undefined;
  };

  // Default selection: prioritize category with data in the active test session
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    const withActiveData = categoriesList.find((cat) => {
      const summary = getSummary(cat.key);
      if (!summary) return false;
      const hasAvg = summary.testAverages[activeTestIdx] !== null && summary.testAverages[activeTestIdx] !== undefined;
      const hasResults = summary.metrics?.some(
        (m) =>
          m.tests[activeTestIdx]?.result !== null &&
          m.tests[activeTestIdx]?.result !== undefined
      );
      return hasAvg || hasResults;
    });

    if (withActiveData) return withActiveData.key;

    const firstWithMetrics = categoriesList.find((cat) => (getSummary(cat.key)?.metrics?.length ?? 0) > 0);
    return firstWithMetrics ? firstWithMetrics.key : categoriesList[0]?.key || null;
  });

  // Keep selection aligned when activeTestIndex changes or if current selection is empty
  useEffect(() => {
    const currentSummary = selectedCategory ? getSummary(selectedCategory) : null;
    const hasCurrentData = currentSummary && currentSummary.metrics.length > 0;

    if (!hasCurrentData) {
      const withActiveData = categoriesList.find((cat) => {
        const summary = getSummary(cat.key);
        if (!summary) return false;
        const hasAvg = summary.testAverages[activeTestIdx] !== null && summary.testAverages[activeTestIdx] !== undefined;
        const hasResults = summary.metrics?.some(
          (m) =>
            m.tests[activeTestIdx]?.result !== null &&
            m.tests[activeTestIdx]?.result !== undefined
        );
        return hasAvg || hasResults;
      });

      if (withActiveData) {
        setSelectedCategory(withActiveData.key);
      } else {
        const firstWithMetrics = categoriesList.find((cat) => (getSummary(cat.key)?.metrics?.length ?? 0) > 0);
        if (firstWithMetrics) {
          setSelectedCategory(firstWithMetrics.key);
        }
      }
    }
  }, [activeTestIndex, strengthSummary, selectedCategory, activeTestIdx, categoriesList]);

  const handleCategoryClick = (key: string) => {
    setSelectedCategory((prev) => (prev === key ? null : key));
  };

  /**
   * Calculate percentage improvement comparative to a specific baseline test (e.g. T1 or T2)
   */
  const calculateImprovementAgainst = (
    metric: MetricItem,
    baselineTestNumber: number, // 1 for T1, 2 for T2
    currentTestNumber: number   // activeTestIndex, e.g. 3
  ): ImprovementResult => {
    const currentIdx = currentTestNumber - 1;
    const baselineIdx = baselineTestNumber - 1;

    if (
      !metric.tests ||
      currentIdx <= baselineIdx ||
      baselineIdx < 0 ||
      currentIdx >= metric.tests.length
    ) {
      return { value: null, text: "—", direction: "none" };
    }

    const curr = metric.tests[currentIdx];
    const base = metric.tests[baselineIdx];

    if (!curr || !base) {
      return { value: null, text: "—", direction: "none" };
    }

    // 1. Primary: calculate percentage change in raw result value if both are valid numbers
    if (
      curr.result !== null &&
      base.result !== null &&
      !isNaN(curr.result) &&
      !isNaN(base.result) &&
      base.result !== 0
    ) {
      const change = ((curr.result - base.result) / Math.abs(base.result)) * 100;
      const sign = change > 0 ? "+" : "";
      return {
        value: change,
        text: `${sign}${change.toFixed(1)}%`,
        direction: change > 0 ? "positive" : change < 0 ? "negative" : "neutral",
      };
    }

    // 2. Secondary: if raw results are missing or 0, calculate delta in % Ref
    if (
      curr.percentRef !== null &&
      base.percentRef !== null &&
      !isNaN(curr.percentRef) &&
      !isNaN(base.percentRef)
    ) {
      const delta = curr.percentRef - base.percentRef;
      const sign = delta > 0 ? "+" : "";
      return {
        value: delta,
        text: `${sign}${delta.toFixed(1)}%`,
        direction: delta > 0 ? "positive" : delta < 0 ? "negative" : "neutral",
      };
    }

    return { value: null, text: "—", direction: "none" };
  };

  /**
   * Get category progression between active test and previous test
   */
  const getCategoryProgression = (summary?: StrengthCategorySummary) => {
    if (!summary || activeTestIndex <= 1) return null;
    const curr = summary.testAverages[activeTestIndex - 1];
    const prev = summary.testAverages[activeTestIndex - 2];

    if (curr !== null && prev !== null && curr !== undefined && prev !== undefined) {
      const diff = curr - prev;
      return {
        diff,
        text: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`,
        direction: diff > 0 ? "positive" : diff < 0 ? "negative" : "neutral",
      };
    }
    return null;
  };

  const getImpressionBadge = (status: StatusGrade | "not-tested" | "raw", note?: string) => {
    if (status === "not-tested") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          {note || `Not Tested (T${activeTestIndex})`}
        </span>
      );
    }

    if (status === "raw") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
          Measured (Raw)
        </span>
      );
    }

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
        {note && <span className="text-[9px] font-semibold opacity-75 lowercase ml-0.5">({note})</span>}
      </span>
    );
  };

  const selectedSummary = selectedCategory ? getSummary(selectedCategory) : undefined;

  // Compute summary stats for the selected category
  const selectedStats = useMemo(() => {
    if (!selectedSummary) return null;
    const metrics = selectedSummary.metrics || [];
    const testIdx = activeTestIndex - 1;

    const rankableInActive = metrics.filter(
      (m) => m.tests[testIdx]?.percentRef !== null && m.tests[testIdx]?.percentRef !== undefined
    );
    const inTargetCount = rankableInActive.filter((m) => (m.tests[testIdx]?.percentRef ?? -999) >= -10).length;
    const activeResultsCount = metrics.filter(
      (m) =>
        (m.tests[testIdx]?.result !== null && m.tests[testIdx]?.result !== undefined) ||
        (m.tests[testIdx]?.percentRef !== null && m.tests[testIdx]?.percentRef !== undefined)
    ).length;

    const categoryAvg = selectedSummary.testAverages[testIdx];
    const progression = getCategoryProgression(selectedSummary);

    return {
      totalMetrics: metrics.length,
      activeResultsCount,
      rankableCount: rankableInActive.length,
      inTargetCount,
      categoryAvg,
      progression,
    };
  }, [selectedSummary, activeTestIndex]);

  return (
    <div className="space-y-4">
      {/* Category Overview Cards Card */}
      <Card className="gradient-card border-border shadow-sm">
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <div>
              <h3 className="text-sm font-black tracking-tight text-foreground uppercase italic flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-primary" />
                <span>Strength Assessment Overview</span>
              </h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                Aggregated category performance, progression benchmarks, and metric-level breakdown
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
                Active Session: Test {activeTestIndex}
              </span>
              {activeTestIndex > 1 && (
                <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg">
                  Comparing vs Test {activeTestIndex - 1}
                </span>
              )}
            </div>
          </div>

          {/* 4 Rich Executive Category Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {categoriesList.map((cat) => {
              const summary = getSummary(cat.key);
              const totalMetrics = summary?.metrics?.length ?? 0;
              const hasData = totalMetrics > 0;
              const isSelected = selectedCategory === cat.key;

              const activeAvg = summary?.testAverages[activeTestIdx];
              const hasActiveAvg = activeAvg !== null && activeAvg !== undefined;
              const latestAvg = summary?.latestAverage;
              const hasAnyAvg = latestAvg !== null && latestAvg !== undefined;

              // Find which test recorded the latest average if active test was not tested
              let priorTestIndex: number | null = null;
              if (!hasActiveAvg && summary && summary.testAverages) {
                for (let i = summary.testAverages.length - 1; i >= 0; i--) {
                  if (summary.testAverages[i] !== null && summary.testAverages[i] !== undefined) {
                    priorTestIndex = i + 1;
                    break;
                  }
                }
              }

              const progression = getCategoryProgression(summary);
              const activeStatus = hasActiveAvg
                ? getStatusFromPercent(activeAvg)
                : hasAnyAvg
                ? getStatusFromPercent(latestAvg)
                : "moderate";

              // Check if any results recorded for active test (including non-benchmark raw metrics)
              const activeResultsCount =
                summary?.metrics?.filter(
                  (m) =>
                    m.tests[activeTestIdx]?.result !== null &&
                    m.tests[activeTestIdx]?.result !== undefined
                ).length ?? 0;

              return (
                <div
                  key={cat.key}
                  role="button"
                  tabIndex={hasData ? 0 : -1}
                  onClick={() => hasData && handleCategoryClick(cat.key)}
                  onKeyDown={(e) => {
                    if (hasData && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      handleCategoryClick(cat.key);
                    }
                  }}
                  className={cn(
                    "relative text-left rounded-2xl border p-4 transition-all duration-200 select-none flex flex-col justify-between min-h-[140px]",
                    !hasData
                      ? "opacity-50 cursor-not-allowed bg-muted/20 border-dashed border-border"
                      : isSelected
                      ? "cursor-pointer bg-card border-primary ring-2 ring-primary/40 shadow-lg shadow-primary/10"
                      : "cursor-pointer bg-card/80 hover:bg-card hover:border-primary/50 border-border/80 shadow-xs hover:shadow-md"
                  )}
                >
                  {/* Card Header: Category Name + Status Pill */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-black tracking-tight uppercase text-foreground truncate block">
                        {cat.label}
                      </span>
                      {cat.sublabel && (
                        <span className="text-[9px] font-bold text-muted-foreground/75 uppercase tracking-wider block">
                          {cat.sublabel}
                        </span>
                      )}
                    </div>
                    {hasData && (
                      <div className="shrink-0">
                        {hasActiveAvg ? (
                          getImpressionBadge(activeStatus)
                        ) : priorTestIndex ? (
                          getImpressionBadge(activeStatus, `T${priorTestIndex}`)
                        ) : activeResultsCount > 0 ? (
                          getImpressionBadge("raw")
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                            No Ref
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Body: Primary Metric Value */}
                  <div className="my-2">
                    {hasActiveAvg ? (
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={cn(
                            "text-2xl font-black font-mono tracking-tight",
                            activeAvg > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : activeAvg < -10
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-amber-600 dark:text-amber-400"
                          )}
                        >
                          {activeAvg > 0 ? "+" : ""}
                          {activeAvg.toFixed(1)}%
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          vs ref
                        </span>
                      </div>
                    ) : priorTestIndex && hasAnyAvg ? (
                      <div className="space-y-0.5">
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className={cn(
                              "text-xl font-black font-mono tracking-tight",
                              latestAvg > 0
                                ? "text-emerald-600/80 dark:text-emerald-400/80"
                                : "text-amber-600/80 dark:text-amber-400/80"
                            )}
                          >
                            {latestAvg > 0 ? "+" : ""}
                            {latestAvg.toFixed(1)}%
                          </span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                            (in T{priorTestIndex})
                          </span>
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                          Not re-tested in T{activeTestIndex}
                        </p>
                      </div>
                    ) : activeResultsCount > 0 ? (
                      <div className="space-y-0.5">
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black font-mono text-foreground tracking-tight">
                            {activeResultsCount}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            tests measured
                          </span>
                        </div>
                        <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                          Force progression tracked
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="text-xl font-black font-mono text-muted-foreground">—</span>
                        <p className="text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                          No session tests
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Metrics Count & Progression Delta */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1 font-bold">
                      <Layers className="w-3 h-3 text-primary/70 shrink-0" />
                      {totalMetrics} {totalMetrics === 1 ? "metric" : "metrics"}
                    </span>

                    {progression ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 font-mono font-black text-[10px]",
                          progression.direction === "positive"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : progression.direction === "negative"
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground"
                        )}
                        title={`Progression vs Test ${activeTestIndex - 1}`}
                      >
                        {progression.direction === "positive" ? (
                          <TrendingUp className="w-3 h-3 shrink-0" />
                        ) : progression.direction === "negative" ? (
                          <TrendingDown className="w-3 h-3 shrink-0" />
                        ) : (
                          <Minus className="w-3 h-3 shrink-0" />
                        )}
                        {progression.text} vs T{activeTestIndex - 1}
                      </span>
                    ) : hasData ? (
                      <span className="flex items-center gap-0.5 text-primary text-[10px] font-bold">
                        {isSelected ? (
                          <>
                            <span>Active</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>View</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Expanded Detail Breakdown Section */}
      {selectedCategory && selectedSummary && (
        <Card className="border border-border/90 bg-card shadow-sm rounded-2xl animate-fade-in overflow-hidden">
          <CardContent className="p-4 sm:p-6 space-y-5">
            {/* Detail Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  <h4 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wide">
                    {selectedSummary.label} — Individual Metrics Detail
                  </h4>
                </div>
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
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-1.5 rounded-xl border transition-all self-start sm:self-auto shadow-xs"
              >
                Close Details
              </button>
            </div>

            {/* Quick Summary Statistics Strip */}
            {selectedStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-xl border border-border/60">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Category Average (% vs Ref)
                  </span>
                  <p className="text-sm font-black font-mono text-foreground">
                    {selectedStats.categoryAvg !== null && selectedStats.categoryAvg !== undefined ? (
                      <span
                        className={
                          selectedStats.categoryAvg > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : selectedStats.categoryAvg < -10
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-amber-600 dark:text-amber-400"
                        }
                      >
                        {selectedStats.categoryAvg > 0 ? "+" : ""}
                        {selectedStats.categoryAvg.toFixed(1)}%
                      </span>
                    ) : selectedSummary.latestAverage !== null ? (
                      <span className="text-muted-foreground">
                        {selectedSummary.latestAverage > 0 ? "+" : ""}
                        {selectedSummary.latestAverage.toFixed(1)}% (Prior)
                      </span>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Total Indicators
                  </span>
                  <p className="text-sm font-black font-mono text-foreground">
                    {selectedStats.totalMetrics} measured
                    <span className="text-[10px] font-normal text-muted-foreground ml-1">
                      ({selectedStats.activeResultsCount} in T{activeTestIndex})
                    </span>
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Target Benchmark (≥ -10%)
                  </span>
                  <p className="text-sm font-black font-mono text-foreground">
                    {selectedStats.rankableCount > 0 ? (
                      <>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {selectedStats.inTargetCount}
                        </span>
                        {" / "}
                        <span>{selectedStats.rankableCount} met target</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground font-sans text-xs">Normative N/A</span>
                    )}
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Session Progression
                  </span>
                  <p className="text-sm font-black font-mono text-foreground">
                    {selectedStats.progression ? (
                      <span
                        className={
                          selectedStats.progression.direction === "positive"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : selectedStats.progression.direction === "negative"
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-muted-foreground"
                        }
                      >
                        {selectedStats.progression.text} vs T{activeTestIndex - 1}
                      </span>
                    ) : (
                      <span className="text-muted-foreground font-sans text-xs">
                        {activeTestIndex === 1 ? "Baseline session" : "No previous comparator"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Metrics Table */}
            {selectedSummary.metrics && selectedSummary.metrics.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-border bg-white dark:bg-slate-900 shadow-xs">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow className="border-b border-border">
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-foreground/80 py-3 pl-4">
                        Metric Name
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-center text-foreground/80 py-3">
                        Ref. Benchmark
                      </TableHead>
                      {selectedSummary.testAverages.map((_, idx) => (
                        <React.Fragment key={idx}>
                          <TableHead
                            className={cn(
                              "text-[10px] font-black uppercase tracking-wider text-center py-3",
                              idx === activeTestIdx
                                ? "bg-primary/[0.08] text-primary font-black"
                                : "text-foreground/80"
                            )}
                          >
                            T{idx + 1} Result
                          </TableHead>
                          <TableHead
                            className={cn(
                              "text-[10px] font-black uppercase tracking-wider text-center py-3",
                              idx === activeTestIdx
                                ? "bg-primary/[0.08] text-primary font-black"
                                : "text-foreground/80"
                            )}
                          >
                            T{idx + 1} % Ref.
                          </TableHead>
                        </React.Fragment>
                      ))}
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-center bg-primary/[0.03] text-primary py-3">
                        % Improvement
                        <span className="block text-[8px] font-semibold text-muted-foreground/80 lowercase">
                          (vs T1)
                        </span>
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-wider text-center bg-primary/[0.06] text-primary py-3 pr-4">
                        % Improvement
                        <span className="block text-[8px] font-semibold text-muted-foreground/80 lowercase">
                          (vs T2)
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSummary.metrics.map((metric) => {
                      const impVsT1 = calculateImprovementAgainst(metric, 1, activeTestIndex);
                      const impVsT2 = calculateImprovementAgainst(metric, 2, activeTestIndex);

                      return (
                        <TableRow
                          key={metric.key}
                          className="hover:bg-primary/[0.02] border-b border-border/60 transition-colors"
                        >
                          <TableCell className="font-bold text-xs text-foreground truncate max-w-xs py-3 pl-4">
                            {metric.label}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-center text-muted-foreground py-3">
                            {metric.referenceValue !== null && metric.referenceValue !== undefined
                              ? metric.referenceValue
                              : "—"}
                          </TableCell>
                          {metric.tests.map((t, idx) => (
                            <React.Fragment key={idx}>
                              <TableCell
                                className={cn(
                                  "font-mono text-xs text-center py-3",
                                  idx === activeTestIdx
                                    ? "bg-primary/[0.04] font-bold text-foreground"
                                    : "text-foreground/80"
                                )}
                              >
                                {t.result !== null && t.result !== undefined ? t.result : "—"}
                              </TableCell>
                              <TableCell
                                className={cn(
                                  "font-mono text-xs text-center font-bold py-3",
                                  idx === activeTestIdx ? "bg-primary/[0.04]" : ""
                                )}
                              >
                                {t.percentRef !== null && t.percentRef !== undefined ? (
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
                                  <span className="text-muted-foreground/40 font-mono">—</span>
                                )}
                              </TableCell>
                            </React.Fragment>
                          ))}

                          {/* % Improvement vs T1 */}
                          <TableCell className="font-mono text-xs text-center font-black bg-primary/[0.02] py-3">
                            {impVsT1.direction === "positive" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                                <span>{impVsT1.text}</span>
                              </span>
                            ) : impVsT1.direction === "negative" ? (
                              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                                <span>{impVsT1.text}</span>
                              </span>
                            ) : impVsT1.direction === "neutral" ? (
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <Minus className="w-3.5 h-3.5 shrink-0" />
                                <span>{impVsT1.text}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40 font-mono font-medium">—</span>
                            )}
                          </TableCell>

                          {/* % Improvement vs T2 */}
                          <TableCell className="font-mono text-xs text-center font-black bg-primary/[0.04] py-3 pr-4">
                            {impVsT2.direction === "positive" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                                <span>{impVsT2.text}</span>
                              </span>
                            ) : impVsT2.direction === "negative" ? (
                              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                                <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                                <span>{impVsT2.text}</span>
                              </span>
                            ) : impVsT2.direction === "neutral" ? (
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <Minus className="w-3.5 h-3.5 shrink-0" />
                                <span>{impVsT2.text}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40 font-mono font-medium">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 bg-muted/10 rounded-xl border border-dashed border-border text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
                <p className="text-xs font-black uppercase text-foreground">
                  No Recorded Strength Indicators
                </p>
                <p className="text-[11px] text-muted-foreground max-w-sm">
                  No individual measurement tests were found in the uploaded file under {selectedSummary.label}.
                </p>
              </div>
            )}

            {/* Informational Legend Footnote */}
            <div className="flex items-start gap-2 text-[10px] text-muted-foreground font-medium bg-muted/20 p-3 rounded-xl border border-dashed border-border/80">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed">
                <p>
                  <strong>% Improvement vs T1 &amp; vs T2</strong> reflects relative progression comparing the active test session against baseline Test 1 and previous Test 2. Positive percentage indicates strength gain.
                </p>
                <p>
                  <strong>Benchmark References:</strong> % Ref indicates force output relative to normative population reference values. Metrics without normative reference benchmarks track absolute force outputs.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
