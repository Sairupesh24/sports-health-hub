import { useState } from "react";
import { Plus, ChevronRight, GripVertical, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProjectBacklogProps { projectId: string; }

const MOCK_BACKLOG = [
  { id: "b1", title: "Dark mode support",               priority: "medium",   estimate: 8  },
  { id: "b2", title: "Multi-language localization",      priority: "low",      estimate: 24 },
  { id: "b3", title: "Offline mode caching",            priority: "medium",   estimate: 16 },
  { id: "b4", title: "Third-party OAuth integration",   priority: "high",     estimate: 12 },
  { id: "b5", title: "Email digest notifications",      priority: "low",      estimate: 6  },
  { id: "b6", title: "Advanced search filters",         priority: "medium",   estimate: 10 },
  { id: "b7", title: "Bulk import via CSV",             priority: "medium",   estimate: 14 },
  { id: "b8", title: "Audit log export",                priority: "low",      estimate: 6  },
  { id: "b9", title: "Two-factor authentication",       priority: "critical", estimate: 10 },
];

const MOCK_SPRINTS = [
  { id: "s4", name: "Sprint 4 (Active)", capacity: 40, used: 32, status: "active" },
  { id: "s5", name: "Sprint 5", capacity: 40, used: 0, status: "planned" },
];

const PRIORITY_CONFIG: Record<string, { dot: string; label: string }> = {
  critical: { dot: "bg-red-500",    label: "Critical" },
  high:     { dot: "bg-orange-500", label: "High" },
  medium:   { dot: "bg-amber-400",  label: "Medium" },
  low:      { dot: "bg-emerald-500",label: "Low" },
};

export default function ProjectBacklog({ projectId }: ProjectBacklogProps) {
  const [backlog, setBacklog] = useState(MOCK_BACKLOG);

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Backlog panel */}
      <div className="flex-1 flex flex-col border-r border-border/40 overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/40">
          <div>
            <h2 className="font-display font-semibold text-foreground text-sm">Backlog</h2>
            <p className="text-xs text-muted-foreground">{backlog.length} unscheduled items</p>
          </div>
          <Button size="sm" style={{ background: "hsl(var(--planner-primary))" }} className="gap-1.5 h-7 text-xs">
            <Plus className="w-3 h-3" /> Add to Backlog
          </Button>
        </div>
        <div className="flex-1 p-4 space-y-1.5">
          {backlog.map((item) => {
            const p = PRIORITY_CONFIG[item.priority];
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/40 bg-card hover:border-border hover:shadow-sm transition-all group"
              >
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground cursor-grab flex-shrink-0" />
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${p.dot}`} />
                <span className="flex-1 text-sm text-foreground min-w-0 truncate">{item.title}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{item.estimate}h</span>
                <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-all">
                  <ArrowRightLeft className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sprint panels */}
      <div className="w-full lg:w-80 flex flex-col overflow-y-auto">
        <div className="px-6 py-3 border-b border-border/40">
          <h2 className="font-display font-semibold text-foreground text-sm">Sprints</h2>
        </div>
        <div className="p-4 space-y-4">
          {MOCK_SPRINTS.map((sprint) => (
            <div key={sprint.id} className="planner-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-foreground">{sprint.name}</p>
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  sprint.status === "active"
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                )}>
                  {sprint.status === "active" ? "Active" : "Planned"}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Capacity</span>
                  <span>{sprint.used}/{sprint.capacity}h</span>
                </div>
                <Progress value={(sprint.used / sprint.capacity) * 100} className="h-1.5" />
              </div>
              <Button variant="outline" size="sm" className="w-full h-7 text-xs gap-1.5">
                <Plus className="w-3 h-3" /> Add from Backlog
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
