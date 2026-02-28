import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "appointment" | "session" | "payment" | "client";
}

const typeColors: Record<string, string> = {
  appointment: "bg-info",
  session: "bg-primary",
  payment: "bg-success",
  client: "bg-accent",
};

interface RecentActivityProps {
  items: ActivityItem[];
}

export default function RecentActivity({ items }: RecentActivityProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 gradient-card">
      <h3 className="font-display font-semibold text-card-foreground mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-start gap-3 animate-fade-in">
            <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", typeColors[item.type])} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-card-foreground truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
