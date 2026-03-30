import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    type: "positive" | "negative" | "neutral";
  };
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "secondary" | "glass";
}

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  onClick,
  className,
  variant = "secondary"
}: MetricCardProps) {
  
  const variants = {
    primary: "bg-slate-900 text-white border-slate-800 shadow-xl shadow-slate-900/10",
    secondary: "bg-white text-slate-900 border-slate-100 shadow-sm",
    glass: "glass text-slate-900 border-white/20 shadow-lg"
  };

  const trendStyles = {
    positive: "text-emerald-500 bg-emerald-50 border-emerald-100",
    negative: "text-rose-500 bg-rose-50 border-rose-100",
    neutral: "text-slate-400 bg-slate-50 border-slate-100"
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-[32px] p-6 border transition-all duration-500",
        onClick && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        variants[variant],
        className
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
          variant === "primary" ? "bg-white/10" : "bg-slate-50"
        )}>
          <Icon className={cn("w-6 h-6", variant === "primary" ? "text-slate-100" : "text-primary")} />
        </div>
        
        {trend && (
          <div className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
            trendStyles[trend.type]
          )}>
            {trend.value}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <p className={cn(
          "text-[10px] font-black uppercase tracking-[0.2em]",
          variant === "primary" ? "text-slate-400" : "text-slate-500"
        )}>
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-black italic tracking-tighter">{value}</h3>
          {subtitle && (
            <span className={cn(
              "text-xs font-bold",
              variant === "primary" ? "text-slate-400" : "text-muted-foreground"
            )}>
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Decorative pulse background */}
      {variant === "primary" && (
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Icon className="w-24 h-24 rotate-12" />
        </div>
      )}
    </div>
  );
}
