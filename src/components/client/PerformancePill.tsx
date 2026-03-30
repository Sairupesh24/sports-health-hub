import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformancePillProps {
  label: string;
  value: string;
  icon: LucideIcon;
  status?: "good" | "warning" | "alert" | "neutral";
  trend?: "up" | "down" | "flat";
}

export default function PerformancePill({ 
  label, 
  value, 
  icon: Icon, 
  status = "neutral",
  trend 
}: PerformancePillProps) {
  
  const statusStyles = {
    good: "bg-emerald-50 text-emerald-600 border-emerald-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    alert: "bg-rose-50 text-rose-600 border-rose-100",
    neutral: "bg-slate-50 text-slate-600 border-slate-100"
  };

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-2xl border min-w-[140px] shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98]",
      statusStyles[status]
    )}>
      <div className="p-2 rounded-xl bg-white/80 shadow-sm">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">{label}</p>
        <div className="flex items-center gap-1">
          <span className="text-sm font-black tracking-tight">{value}</span>
          {trend === "up" && <span className="text-[10px]">↑</span>}
          {trend === "down" && <span className="text-[10px]">↓</span>}
        </div>
      </div>
    </div>
  );
}
