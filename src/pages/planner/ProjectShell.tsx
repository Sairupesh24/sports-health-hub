import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import PlannerLayout from "@/components/planner/PlannerLayout";
import {
  ChevronLeft, MoreHorizontal, Calendar, Users, AlertTriangle,
  CheckCircle2, Clock, TrendingUp, Edit2, Flag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import ProjectOverview from "./tabs/ProjectOverview";
import WorkTable from "./tabs/WorkTable";
import DeliveryBoard from "./tabs/DeliveryBoard";
import ProjectBacklog from "./tabs/ProjectBacklog";
import SprintBoard from "./tabs/SprintBoard";
import ProjectPeople from "./tabs/ProjectPeople";
import ProjectObjectives from "./tabs/ProjectObjectives";
import ProjectReports from "./tabs/ProjectReports";
import ProjectActivity from "./tabs/ProjectActivity";
import ProjectSchedule from "./tabs/ProjectSchedule";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

type ProjectTab =
  | "overview" | "work" | "schedule" | "board"
  | "backlog" | "scheduled-work" | "people"
  | "objectives" | "reports" | "activity";

const TABS: { id: ProjectTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "work", label: "Work" },
  { id: "schedule", label: "Schedule" },
  { id: "board", label: "Board" },
  { id: "backlog", label: "Backlog" },
  { id: "scheduled-work", label: "Scheduled Work" },
  { id: "people", label: "People" },
  { id: "objectives", label: "Objectives" },
  { id: "reports", label: "Reports" },
  { id: "activity", label: "Activity" },
];

const healthConfig: Record<string, { label: string; cls: string }> = {
  on_track:    { label: "On Track",    cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400" },
  at_risk:     { label: "At Risk",     cls: "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400" },
  delayed:     { label: "Delayed",     cls: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400" },
  blocked:     { label: "Blocked",     cls: "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400" },
  not_started: { label: "Not Started", cls: "text-slate-500 bg-slate-100 dark:bg-slate-800" },
  completed:   { label: "Completed",   cls: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400" },
};

// Mock project data — replaced by API in M3
const MOCK_PROJECT = {
  id: "1", name: "Website Replatform", code: "WRP",
  health: "on_track", priority: "high", progress: 68,
  status: "active", owner: "Sarah K.", manager: "James P.",
  start: "Jun 1, 2026", due: "Sep 30, 2026", days_remaining: 49,
  open_items: 42, overdue_items: 2, blocked_items: 1,
  description: "Full replatform of the main marketing website to Next.js 15 with headless CMS integration.",
  department: "Engineering",
};

export default function ProjectShell() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const project = MOCK_PROJECT;
  const health = healthConfig[project.health] ?? healthConfig.not_started;

  const renderTab = () => {
    switch (activeTab) {
      case "overview": return <ProjectOverview project={project} />;
      case "work": return <WorkTable projectId={id!} />;
      case "schedule": return <ProjectSchedule projectId={id!} />;
      case "board": return <DeliveryBoard projectId={id!} />;
      case "backlog": return <ProjectBacklog projectId={id!} />;
      case "scheduled-work": return <SprintBoard projectId={id!} mode="scheduled" />;
      case "people": return <ProjectPeople projectId={id!} />;
      case "objectives": return <ProjectObjectives projectId={id!} />;
      case "reports": return <ProjectReports projectId={id!} />;
      case "activity": return <ProjectActivity projectId={id!} />;
      default: return <ProjectOverview project={project} />;
    }
  };

  return (
    <PlannerLayout>
      <div className="flex flex-col h-full">
        {/* Project Header */}
        <div className="border-b border-border/50 bg-card/50 flex-shrink-0">
          <div className="px-6 pt-4 pb-0 max-w-screen-2xl mx-auto">
            {/* Breadcrumb */}
            <button
              onClick={() => navigate("/planner/projects")}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              <ChevronLeft className="w-3 h-3" />
              All Projects
            </button>

            {/* Project Title Row */}
            <div className="flex items-start gap-4 mb-3">
              {/* Code badge */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                style={{ background: "hsl(var(--planner-primary))" }}
              >
                {project.code}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="font-display text-xl font-bold text-foreground tracking-tight">{project.name}</h1>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${health.cls}`}>
                    {health.label}
                  </span>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">
                    {project.status.replace("_", " ")}
                  </span>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {project.start} → {project.due}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {project.days_remaining} days remaining
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {project.owner}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flag className="w-3 h-3" />
                    {project.department}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground border border-border/50 rounded-lg px-3 py-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                    {project.open_items} open
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                    {project.overdue_items} overdue
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />
                    {project.blocked_items} blocked
                  </span>
                </div>

                {/* Progress pill */}
                <div className="hidden md:flex items-center gap-2 bg-muted/50 border border-border/50 rounded-lg px-3 py-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <Progress value={project.progress} className="w-16 h-1.5" />
                  <span className="text-xs font-semibold text-foreground">{project.progress}%</span>
                </div>

                <Button variant="outline" size="sm" className="h-8 gap-1.5">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Clone Project</DropdownMenuItem>
                    <DropdownMenuItem>Take Baseline</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-0 overflow-x-auto no-scrollbar">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-all duration-150",
                    activeTab === tab.id
                      ? "border-current text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
                  )}
                  style={activeTab === tab.id ? { borderColor: "hsl(var(--planner-primary))", color: "hsl(var(--planner-primary))" } : {}}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {renderTab()}
        </div>
      </div>
    </PlannerLayout>
  );
}
