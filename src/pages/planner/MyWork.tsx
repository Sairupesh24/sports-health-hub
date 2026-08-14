import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PlannerLayout from "@/components/planner/PlannerLayout";
import {
  CheckCircle2, Clock, AlertTriangle, Briefcase, Filter, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "assigned" | "created" | "watching";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planned:     { label: "Planned",     color: "hsl(220 15% 55%)", bg: "hsl(220 15% 96%)" },
  ready:       { label: "Ready",       color: "hsl(210 72% 50%)", bg: "hsl(210 72% 95%)" },
  in_progress: { label: "In Progress", color: "hsl(251 74% 60%)", bg: "hsl(251 74% 95%)" },
  review:      { label: "Review",      color: "hsl(38 92% 50%)",  bg: "hsl(38 92% 95%)" },
  blocked:     { label: "Blocked",     color: "hsl(0 72% 51%)",   bg: "hsl(0 72% 96%)" },
  completed:   { label: "Completed",   color: "hsl(152 60% 42%)", bg: "hsl(152 60% 95%)" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: "Critical", color: "hsl(0 72% 51%)" },
  high:     { label: "High",     color: "hsl(25 95% 55%)" },
  medium:   { label: "Medium",   color: "hsl(38 92% 50%)" },
  low:      { label: "Low",      color: "hsl(152 60% 42%)" },
};

const MOCK_MY_ITEMS = [
  { id: "1", title: "Design System Tokens audit", status: "in_progress", priority: "high", project: "Website Replatform", due: "Aug 18", overdue: false },
  { id: "2", title: "API rate limit implementation", status: "review", priority: "critical", project: "Mobile App Launch", due: "Aug 14", overdue: true },
  { id: "3", title: "Onboarding video script", status: "planned", priority: "medium", project: "Clinic Software Rollout", due: "Aug 22", overdue: false },
  { id: "4", title: "User interview synthesis", status: "in_progress", priority: "high", project: "Athlete Portal Redesign", due: "Aug 16", overdue: true },
  { id: "5", title: "Q4 content calendar", status: "ready", priority: "medium", project: "Q4 Marketing Campaign", due: "Aug 25", overdue: false },
  { id: "6", title: "Performance testing scenarios", status: "planned", priority: "low", project: "Mobile App Launch", due: "Sep 1", overdue: false },
  { id: "7", title: "Accessibility audit report", status: "review", priority: "high", project: "Website Replatform", due: "Aug 20", overdue: false },
  { id: "8", title: "Staff training deck", status: "blocked", priority: "high", project: "Clinic Software Rollout", due: "Aug 15", overdue: true },
];

export default function MyWork() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<FilterTab>("all");

  const stats = [
    { label: "In Progress", value: MOCK_MY_ITEMS.filter((i) => i.status === "in_progress").length, icon: Clock, color: "hsl(251 74% 60%)" },
    { label: "Overdue", value: MOCK_MY_ITEMS.filter((i) => i.overdue).length, icon: AlertTriangle, color: "hsl(0 72% 51%)" },
    { label: "Due This Week", value: 5, icon: Clock, color: "hsl(38 92% 50%)" },
    { label: "Completed This Week", value: 4, icon: CheckCircle2, color: "hsl(152 60% 42%)" },
  ];

  return (
    <PlannerLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">My Work</h1>
            <p className="text-muted-foreground text-sm mt-0.5">All work items assigned to you across projects.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Filter
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="planner-card p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: s.color + "18" }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-lg font-display font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tab filter */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="assigned" className="text-xs">Assigned to me</TabsTrigger>
            <TabsTrigger value="created" className="text-xs">Created by me</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Work items list */}
        <div className="space-y-2">
          {MOCK_MY_ITEMS.map((item) => {
            const status = STATUS_CONFIG[item.status];
            const priority = PRIORITY_CONFIG[item.priority];
            return (
              <button
                key={item.id}
                className="planner-card px-4 py-3 w-full text-left flex items-center gap-4"
                onClick={() => navigate(`/planner/projects/1/work-items/${item.id}`)}
              >
                {/* Priority dot */}
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: priority.color }}
                  title={priority.label}
                />

                {/* Title + project */}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", item.overdue ? "text-destructive" : "text-foreground")}>
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{item.project}</p>
                </div>

                {/* Status badge */}
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-flex"
                  style={{ color: status.color, background: status.bg }}
                >
                  {status.label}
                </span>

                {/* Due date */}
                <span className={cn("text-xs flex-shrink-0 w-16 text-right", item.overdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
                  {item.overdue ? "Overdue" : item.due}
                </span>

                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </PlannerLayout>
  );
}
