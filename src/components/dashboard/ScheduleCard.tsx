import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { VIPBadge, VIPName } from "@/components/ui/VIPBadge";

interface ScheduleItem {
  id: string;
  time: string;
  clientName: string;
  type: string;
  status: "confirmed" | "pending" | "completed";
  clientId?: string;
  isVIP?: boolean; 
  rawSession?: any;
}

const statusStyles: Record<string, string> = {
  confirmed: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  completed: "bg-muted text-muted-foreground",
};

interface ScheduleCardProps {
  items: ScheduleItem[];
  title?: string;
  onItemClick?: (item: ScheduleItem) => void;
}

export default function ScheduleCard({ items, title = "Today's Schedule", onItemClick }: ScheduleCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 gradient-card">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-primary" />
        <h3 className="font-display font-semibold text-card-foreground">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => onItemClick?.(item)}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg bg-muted/50 animate-fade-in",
              onItemClick && "cursor-pointer hover:bg-muted transition-colors"
            )}
          >
            <span className="text-sm font-mono font-medium text-primary w-14">{item.time}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground truncate">
                <VIPName name={item.clientName} isVIP={item.isVIP} />
              </p>
              <p className="text-xs text-muted-foreground">{item.type}</p>
            </div>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusStyles[item.status])}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
