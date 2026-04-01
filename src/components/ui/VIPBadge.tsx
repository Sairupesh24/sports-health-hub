import { Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface VIPBadgeProps {
  isVIP?: boolean;
  className?: string;
  showText?: boolean;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function VIPBadge({ isVIP, className, showText = true, iconOnly = false, size = "md" }: VIPBadgeProps) {
  if (!isVIP) return null;

  const sizeMetrics = {
    sm: { icon: 10, text: "text-[8px]", padding: "px-1 py-0" },
    md: { icon: 14, text: "text-[10px]", padding: "px-1.5 py-0.5" },
    lg: { icon: 18, text: "text-xs", padding: "px-2 py-1" },
  };

  const metrics = sizeMetrics[size];

  if (iconOnly) {
    return (
        <Crown 
          className={cn("text-[#D4AF37] fill-[#D4AF37]/20 flex-shrink-0", className)} 
          size={metrics.icon} 
          aria-label="VIP Client"
        />
    );
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-md border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.2)]",
      metrics.padding,
      className
    )}>
      <Crown size={metrics.icon} className="fill-[#D4AF37]/40" />
      {showText && <span className={metrics.text}>VIP</span>}
    </div>
  );
}

/**
 * A utility component to wrap a name and apply VIP styling
 */
export function VIPName({ name, isVIP, className }: { name: string; isVIP?: boolean; className?: string }) {
  if (!isVIP) return <span className={className}>{name}</span>;

  return (
    <span className={cn("inline-flex items-center gap-1.5 group font-bold tracking-tight", className)}>
      <span className="text-[#D4AF37] drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
        {name}
      </span>
      <VIPBadge isVIP={true} size="sm" showText={false} />
    </span>
  );
}
