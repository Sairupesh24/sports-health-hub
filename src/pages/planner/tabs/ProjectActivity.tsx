import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ProjectActivityProps { projectId: string; }

const MOCK_ACTIVITY = [
  { id: "1",  user: "SK", name: "Sarah Kim",  action: "moved",    subject: "Design System Tokens", detail: "Planned → Completed",    time: "12m ago",  type: "status" },
  { id: "2",  user: "JP", name: "James Park", action: "commented", subject: "API rate limiting",   detail: "Need load testing first", time: "1h ago",   type: "comment" },
  { id: "3",  user: "TR", name: "Tom Roberts", action: "created",  subject: "CMS integration doc", detail: "",                        time: "2h ago",   type: "create" },
  { id: "4",  user: "AD", name: "Ana Diaz",   action: "updated",  subject: "Sprint 4 capacity",    detail: "32h → 40h",              time: "3h ago",   type: "update" },
  { id: "5",  user: "PM", name: "Priya Mehta", action: "assigned", subject: "Performance testing",  detail: "→ Priya Mehta",          time: "4h ago",   type: "assign" },
  { id: "6",  user: "SK", name: "Sarah Kim",  action: "created",  subject: "Milestone: Alpha Release", detail: "Target: Aug 15",     time: "5h ago",   type: "milestone" },
  { id: "7",  user: "JP", name: "James Park", action: "blocked",  subject: "Analytics event tracking", detail: "Waiting for API keys", time: "6h ago",  type: "status" },
  { id: "8",  user: "TR", name: "Tom Roberts", action: "completed", subject: "Image optimization", detail: "",                       time: "8h ago",   type: "status" },
  { id: "9",  user: "AD", name: "Ana Diaz",   action: "added",   subject: "Sprint 4",              detail: "4 items from backlog",   time: "1d ago",   type: "update" },
  { id: "10", user: "SK", name: "Sarah Kim",  action: "created",  subject: "Project", detail: "Website Replatform created", time: "42d ago", type: "create" },
];

const TYPE_COLORS: Record<string, string> = {
  status:    "hsl(251 74% 60%)",
  comment:   "hsl(210 72% 50%)",
  create:    "hsl(152 60% 42%)",
  update:    "hsl(38 92% 50%)",
  assign:    "hsl(25 95% 55%)",
  milestone: "hsl(0 72% 51%)",
};

function groupByDay(items: typeof MOCK_ACTIVITY) {
  const groups: Record<string, typeof MOCK_ACTIVITY> = {};
  const getGroup = (time: string) => {
    if (time.includes("m") || time.includes("h")) return "Today";
    if (time.includes("1d")) return "Yesterday";
    return "Earlier";
  };
  items.forEach((a) => {
    const g = getGroup(a.time);
    if (!groups[g]) groups[g] = [];
    groups[g].push(a);
  });
  return groups;
}

export default function ProjectActivity({ projectId }: ProjectActivityProps) {
  const groups = groupByDay(MOCK_ACTIVITY);

  return (
    <div className="p-6 max-w-screen-md mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-foreground text-lg">Activity Log</h2>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filter
        </Button>
      </div>

      {Object.entries(groups).map(([day, items]) => (
        <div key={day}>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">{day}</p>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border/50" />

            <div className="space-y-4 pl-10">
              {items.map((a) => (
                <div key={a.id} className="relative">
                  {/* Avatar dot */}
                  <Avatar
                    className="absolute -left-[36px] top-0 w-7 h-7 border-2 border-background"
                  >
                    <AvatarFallback
                      className="text-[9px] font-bold text-white"
                      style={{ background: TYPE_COLORS[a.type] ?? "hsl(var(--planner-primary))" }}
                    >
                      {a.user}
                    </AvatarFallback>
                  </Avatar>

                  <div className="text-sm">
                    <span className="font-semibold text-foreground">{a.name}</span>
                    {" "}{a.action}{" "}
                    <span className="font-medium text-foreground">{a.subject}</span>
                    {a.detail && (
                      <span className="text-muted-foreground"> — {a.detail}</span>
                    )}
                    <span className="block text-[10px] text-muted-foreground/60 mt-0.5">{a.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
