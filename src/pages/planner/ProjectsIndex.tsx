import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PlannerLayout from "@/components/planner/PlannerLayout";
import {
  Plus, Search, Filter, LayoutGrid, List, FolderKanban,
  ChevronRight, Calendar, Users, MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import NewProjectDialog from "@/components/planner/NewProjectDialog";

const healthConfig: Record<string, { label: string; cls: string; dot: string }> = {
  on_track:    { label: "On Track",    cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400", dot: "bg-emerald-500" },
  at_risk:     { label: "At Risk",     cls: "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400",   dot: "bg-amber-500" },
  delayed:     { label: "Delayed",     cls: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400", dot: "bg-orange-500" },
  blocked:     { label: "Blocked",     cls: "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400",           dot: "bg-red-500" },
  not_started: { label: "Not Started", cls: "text-slate-500 bg-slate-100 dark:bg-slate-800",                        dot: "bg-slate-400" },
  completed:   { label: "Completed",   cls: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400",         dot: "bg-blue-500" },
};

const priorityColors: Record<string, string> = {
  critical: "hsl(0 72% 51%)", high: "hsl(25 95% 55%)", medium: "hsl(38 92% 50%)", low: "hsl(152 60% 42%)"
};

const MOCK_PROJECTS = [
  { id: "1", name: "Website Replatform", code: "WRP", health: "on_track", priority: "high", progress: 68, owner: "Sarah K.", manager: "James P.", start: "Jun 1", due: "Sep 30", items: 42, overdue: 2, department: "Engineering" },
  { id: "2", name: "Mobile App Launch", code: "MAL", health: "at_risk", priority: "critical", progress: 42, owner: "James P.", manager: "Sarah K.", start: "Jul 15", due: "Oct 15", items: 67, overdue: 5, department: "Product" },
  { id: "3", name: "Clinic Software Rollout", code: "CSR", health: "on_track", priority: "high", progress: 90, owner: "Priya M.", manager: "Tom R.", start: "May 1", due: "Aug 25", items: 28, overdue: 0, department: "Operations" },
  { id: "4", name: "Q4 Marketing Campaign", code: "QMC", health: "not_started", priority: "medium", progress: 5, owner: "Tom R.", manager: "Ana D.", start: "Sep 1", due: "Nov 1", items: 15, overdue: 0, department: "Marketing" },
  { id: "5", name: "Athlete Portal Redesign", code: "APR", health: "delayed", priority: "high", progress: 31, owner: "Ana D.", manager: "Priya M.", start: "Apr 15", due: "Sep 10", items: 53, overdue: 8, department: "Engineering" },
];

export default function ProjectsIndex() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [newProjectOpen, setNewProjectOpen] = useState(false);

  const filtered = MOCK_PROJECTS.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PlannerLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Projects</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{filtered.length} active project{filtered.length !== 1 ? "s" : ""} in this workspace.</p>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            style={{ background: "hsl(var(--planner-primary))" }}
            onClick={() => setNewProjectOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 h-8">
            <Filter className="w-3.5 h-3.5" /> Filter
          </Button>
          <div className="flex items-center border border-border/50 rounded-lg overflow-hidden h-8">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-2.5 h-full flex items-center transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2.5 h-full flex items-center transition-colors border-l border-border/50 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => {
              const health = healthConfig[project.health] ?? healthConfig.not_started;
              return (
                <button
                  key={project.id}
                  onClick={() => navigate(`/planner/projects/${project.id}`)}
                  className="planner-card p-5 text-left space-y-3"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: priorityColors[project.priority] }}
                      >
                        {project.code}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground leading-tight line-clamp-1">{project.name}</p>
                        <p className="text-[10px] text-muted-foreground">{project.department}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Project</DropdownMenuItem>
                        <DropdownMenuItem>Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Health badge */}
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${health.cls}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
                    {health.label}
                  </span>

                  {/* Progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span><span className="font-medium">{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-1.5" />
                  </div>

                  {/* Footer stats */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <FolderKanban className="w-3 h-3" /> {project.items} items
                    </span>
                    {project.overdue > 0 && (
                      <span className="text-red-500 font-semibold">{project.overdue} overdue</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {project.due}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="planner-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  {["Project", "Health", "Progress", "Owner", "Items", "Due Date"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((project) => {
                  const health = healthConfig[project.health] ?? healthConfig.not_started;
                  return (
                    <tr
                      key={project.id}
                      className="border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/planner/projects/${project.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded text-[9px] font-bold text-white flex items-center justify-center flex-shrink-0"
                            style={{ background: priorityColors[project.priority] }}
                          >
                            {project.code}
                          </div>
                          <span className="font-medium text-foreground">{project.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${health.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${health.dot}`} />
                          {health.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={project.progress} className="h-1.5 w-24" />
                          <span className="text-xs text-muted-foreground">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{project.owner}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{project.items}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{project.due}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewProjectDialog open={newProjectOpen} onClose={() => setNewProjectOpen(false)} />
    </PlannerLayout>
  );
}
