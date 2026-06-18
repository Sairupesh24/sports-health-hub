import React, { useEffect, useState } from "react";
import { StatusGrade } from "./XlsParser";

interface StrengthRingProps {
  title: string;
  latestAverage: number | null;
  testAverages: (number | null)[];
  status: StatusGrade;
  size?: number;
  animate?: boolean;
}

export default function StrengthRing({
  title,
  latestAverage,
  testAverages,
  status,
  size = 160,
  animate = true,
}: StrengthRingProps) {
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate fill fraction: maps -100% -> 0, 0% -> 0.5, +100% -> 1.0
  const avgValue = latestAverage ?? 0;
  const fillFraction = Math.min(Math.max((avgValue + 100) / 200, 0), 1);
  const targetOffset = circumference * (1 - fillFraction);

  // Animation state
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!animate || mediaQuery.matches) {
      setOffset(targetOffset);
      return;
    }

    const timer = setTimeout(() => {
      setOffset(targetOffset);
    }, 50);

    return () => clearTimeout(timer);
  }, [targetOffset, animate]);

  // Map status to color variable and label
  const statusLabels: Record<StatusGrade, string> = {
    good: "Good",
    moderate: "Moderate",
    "needs-work": "Needs Work",
    priority: "Priority",
  };

  const statusColors: Record<StatusGrade, string> = {
    good: "var(--status-good)",
    moderate: "var(--status-moderate)",
    "needs-work": "var(--status-needs-work)",
    priority: "var(--status-priority)",
  };

  const statusColor = statusColors[status] || "var(--status-moderate)";
  const statusLabel = statusLabels[status] || "Moderate";

  // Format progression text
  const validAverages = testAverages.map((avg, i) => ({
    val: avg,
    label: `T${i + 1}`,
  })).filter((t) => t.val !== null);

  const showProgression = validAverages.length > 1;

  // Format primary value: "+14.2%" or "-14.2%"
  const formatVal = (val: number | null) => {
    if (val === null) return "N/A";
    const sign = val > 0 ? "+" : "";
    return `${sign}${val.toFixed(1)}%`;
  };

  return (
    <div className="ishpo-report flex flex-col items-center justify-center p-4 bg-card/40 border rounded-2xl shadow-sm text-center">
      {/* SVG Ring Container */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-slate-200 dark:stroke-slate-800 fill-none"
            strokeWidth={strokeWidth}
          />
          {/* Active colored indicator */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={statusColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 700ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </svg>
        {/* Bold central numeric value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black font-display italic text-foreground tracking-tighter leading-none">
            {formatVal(latestAverage)}
          </span>
        </div>
      </div>

      {/* Info labels below ring */}
      <div className="mt-4 space-y-1">
        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 font-display">
          {title}
        </h4>

        {/* Test progression row */}
        {showProgression && (
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {validAverages.map((t) => `${t.label}: ${formatVal(t.val)}`).join(" → ")}
          </p>
        )}

        {/* Status Badge */}
        <div className="pt-1">
          <span
            className="inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border"
            style={{
              borderColor: `${statusColor}40`,
              backgroundColor: `${statusColor}10`,
              color: statusColor,
            }}
          >
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
