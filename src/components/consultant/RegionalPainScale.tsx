import React from "react";
import { cn } from "@/lib/utils";

export interface PainAreaScores {
  shoulderAndArm?: number;
  neck?: number;
  back?: number;
  hipAndLeg?: number;
}

export const PAIN_REGIONS: Array<{
  id: keyof PainAreaScores;
  label: string;
}> = [
  { id: "shoulderAndArm", label: "Shoulder and arm pain" },
  { id: "neck", label: "Neck pain" },
  { id: "back", label: "Back pain" },
  { id: "hipAndLeg", label: "Hip and leg pain" },
];

interface RegionalPainScaleProps {
  scores?: PainAreaScores;
  onChange?: (region: keyof PainAreaScores, value: number) => void;
  readOnly?: boolean;
  className?: string;
  showOverallBadge?: boolean;
}

export default function RegionalPainScale({
  scores = {},
  onChange,
  readOnly = false,
  className,
  showOverallBadge = true,
}: RegionalPainScaleProps) {
  const maxScore = Math.max(
    scores?.shoulderAndArm ?? 0,
    scores?.neck ?? 0,
    scores?.back ?? 0,
    scores?.hipAndLeg ?? 0
  );

  return (
    <div className={cn("p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4", className)}>
      {showOverallBadge && (
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Subjective Pain Assessment (NRS 0–10)
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Select pain severity rating across key anatomical regions
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Overall Pain</span>
            <span className={cn(
              "text-base font-black font-display",
              maxScore === 0 ? "text-emerald-600 dark:text-emerald-400" :
              maxScore <= 3 ? "text-lime-600 dark:text-lime-400" :
              maxScore <= 6 ? "text-amber-500" :
              maxScore <= 8 ? "text-orange-500" :
              "text-rose-600 dark:text-rose-400"
            )}>
              {maxScore}/10
            </span>
          </div>
        </div>
      )}

      {/* 4 Regional Rows Matching Image 2 */}
      <div className="space-y-4">
        {PAIN_REGIONS.map((region) => {
          const selectedVal = scores?.[region.id];
          return (
            <div key={region.id} className="space-y-1.5">
              <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                {region.label}
              </div>
              <div className="grid grid-cols-11 gap-1 sm:gap-1.5 max-w-xl">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = selectedVal === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={readOnly}
                      onClick={() => !readOnly && onChange?.(region.id, num)}
                      className={cn(
                        "aspect-square w-full flex items-center justify-center text-xs sm:text-sm font-semibold rounded-xs border transition-all select-none",
                        isSelected
                          ? "bg-[#2e7d32] dark:bg-green-600 border-[#2e7d32] dark:border-green-600 text-white font-bold shadow-xs scale-100"
                          : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800",
                        readOnly && !isSelected ? "opacity-60 cursor-not-allowed" : "",
                        readOnly && isSelected ? "cursor-default" : ""
                      )}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Italic Caption Matching Image 2 */}
      <p className="text-[11px] sm:text-xs italic text-slate-500 dark:text-slate-400 pt-0.5">
        0 = no pain, 5 = moderate pain, 10 = worst possible pain
      </p>
    </div>
  );
}
