import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  FolderKanban,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Activity,
  Calendar,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import PlannerLayout from "@/components/planner/PlannerLayout";

// ---- Mock data (will be replaced with real API in M3) ----
const MOCK_STATS = [
  { label: "Active Projects", value: 5, icon: FolderKanban, color: "hsl(251 74% 60%)", change: "+2" },
  { label: "Open Work Items", value: 47, icon: Activity, color: "hsl(210 72% 50%)", change: "-3 today" },
  { label: "Overdue", value: 8, icon: AlertTriangle, color: "hsl(0 72% 51%)", change: "↑2" },
  { label: "Completed This Week", value: 12, icon: CheckCircle2, color: "hsl(152 60% 42%)", change: "↑5" },
];

const MOCK_PROJECTS = [
  { id: "1", name: "Website Replatform", health: "on_track", progress: 68, owner: "Sarah K.", due: "Sep 30", status: "active" },
  { id: "2", name: "Mobile App Launch", health: "at_risk", progress: 42, owner: "James P.", due: "Oct 15", status: "active" },
  { id: "3", name: "Clinic Software Rollout", health: "on_track", progress: 90, owner: "Priya M.", due: "Aug 25", status: "active" },
  { id: "4", name: "Q4 Marketing Campaign", health: "not_started", progress: 5, owner: "Tom R.", due: "Nov 1", status: "active" },
  { id: "5", name: "Athlete Portal Redesign", health: "delayed", progress: 31, owner: "Ana D.", due: "Sep 10", status: "active" },
];

const MOCK_ACTIVITY = [
  { id: "1", user: "Sarah K.", action: "moved", subject: "Design System Tokens", to: "Completed", time: "12m ago", project: "Website Replatform" },
  { id: "2", user: "James P.", action: "commented on", subject: "Push notification setup", to: "", time: "1h ago", project: "Mobile App Launch" },
  { id: "3", user: "Priya M.", action: "created", subject: "Staff onboarding checklist", to: "", time: "2h ago", project: "Clinic Software Rollout" },
  { id: "4", user: "Tom R.", action: "updated status of", subject: "Brand guidelines review", to: "In Progress", time: "3h ago", project: "Q4 Marketing Campaign" },
  { id: "5", user: "Ana D.", action: "assigned", subject: "UX audit findings", to: "James P.", time: "4h ago", project: "Athlete Portal Redesign" },
];

const MOCK_UPCOMING = [
  { id: "1", name: "Clinic Go-Live", type: "milestone", date: "Aug 25", project: "Clinic Software Rollout", urgent: true },
  { id: "2", name: "Mobile Beta Sign-off", type: "milestone", date: "Sep 5", project: "Mobile App Launch", urgent: false },
  { id: "3", name: "Sprint 4 End", type: "sprint", date: "Sep 8", project: "Website Replatform", urgent: false },
  { id: "4", name: "Design handoff", type: "work_item", date: "Sep 10", project: "Athlete Portal Redesign", urgent: false },
];

const healthConfig: Record<string, { label: string; cls: string; dot: string }> = {
  on_track: { label: "On Track", cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400", dot: "bg-emerald-500" },
  at_risk: { label: "At Risk", cls: "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400", dot: "bg-amber-500" },
  delayed: { label: "Delayed", cls: "text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400", dot: "bg-orange-500" },
  blocked: { label: "Blocked", cls: "text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400", dot: "bg-red-500" },
  not_started: { label: "Not Started", cls: "text-slate-500 bg-slate-100 dark:bg-slate-800", dot: "bg-slate-400" },
  completed: { label: "Completed", cls: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400", dot: "bg-blue-500" },
};

export default function PlannerHome() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <PlannerLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
              Welcome back, {profile?.first_name} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Here's what's happening across your projects today.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              size="sm"
              className="gap-1.5"
              style={{ background: "hsl(var(--planner-primary))" }}
              onClick={() => navigate("/planner/projects/new")}
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {MOCK_STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="planner-card p-4 flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: stat.color + "18" }}
                >
                  <Icon className="w-4.5 h-4.5" style={{ color: stat.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">{stat.change}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Projects list — spans 2 cols */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold text-foreground text-sm">Active Projects</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 gap-1"
                onClick={() => navigate("/planner/projects")}
              >
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </div>

            <div className="space-y-2">
              {MOCK_PROJECTS.map((project) => {
                const health = healthConfig[project.health] ?? healthConfig.not_started;
                return (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/planner/projects/${project.id}`)}
                    className="planner-card p-4 w-full text-left flex items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-foreground text-sm truncate">{project.name}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${health.cls}`}>
                          <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${health.dot}`} />
                          {health.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={project.progress} className="flex-1 h-1.5" />
                        <span className="text-xs text-muted-foreground flex-shrink-0 w-8 text-right">
                          {project.progress}%
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">{project.owner}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">Due {project.due}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right column — Upcoming + Activity */}
          <div className="space-y-4">
            {/* Upcoming deadlines */}
            <div className="planner-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-display font-semibold text-foreground text-sm">Upcoming</h3>
              </div>
              <div className="space-y-2.5">
                {MOCK_UPCOMING.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.urgent ? "bg-red-500" : "bg-muted-foreground/40"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{item.project}</p>
                    </div>
                    <span className={`text-[10px] font-semibold flex-shrink-0 ${item.urgent ? "text-red-500" : "text-muted-foreground"}`}>
                      {item.date}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            <div className="planner-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-display font-semibold text-foreground text-sm">Recent Activity</h3>
              </div>
              <div className="space-y-3">
                {MOCK_ACTIVITY.map((a) => (
                  <div key={a.id} className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">{a.user}</span>{" "}
                    {a.action}{" "}
                    <span className="font-medium text-foreground">{a.subject}</span>
                    {a.to && <> → <span className="font-medium">{a.to}</span></>}
                    <span className="block text-[10px] opacity-60 mt-0.5">{a.time} · {a.project}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PlannerLayout>
  );
}
