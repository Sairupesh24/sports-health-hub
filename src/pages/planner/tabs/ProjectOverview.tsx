import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { CheckCircle2, AlertTriangle, Clock, Flag, Users, TrendingUp, Activity, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProjectOverviewProps {
  project: any;
}

const STATUS_PIE = [
  { name: "Completed", value: 28, color: "hsl(152 60% 42%)" },
  { name: "In Progress", value: 12, color: "hsl(251 74% 60%)" },
  { name: "Review", value: 6, color: "hsl(38 92% 50%)" },
  { name: "Planned", value: 8, color: "hsl(220 15% 55%)" },
  { name: "Blocked", value: 1, color: "hsl(0 72% 51%)" },
];

const SPRINT_DATA = [
  { sprint: "S1", completed: 12, target: 15 },
  { sprint: "S2", completed: 18, target: 18 },
  { sprint: "S3", completed: 14, target: 20 },
  { sprint: "S4 (Active)", completed: 8, target: 20 },
];

const VELOCITY_DATA = [
  { week: "W1", items: 4 }, { week: "W2", items: 7 }, { week: "W3", items: 5 },
  { week: "W4", items: 9 }, { week: "W5", items: 6 }, { week: "W6", items: 8 },
  { week: "W7", items: 11 }, { week: "W8", items: 7 },
];

const MILESTONES = [
  { name: "Discovery Complete", date: "Jun 30", status: "reached" },
  { name: "Design Handoff", date: "Jul 20", status: "reached" },
  { name: "Alpha Release", date: "Aug 15", status: "at_risk" },
  { name: "Beta Testing", date: "Sep 1", status: "pending" },
  { name: "Go-Live", date: "Sep 30", status: "pending" },
];

const ACTIVITY = [
  { user: "Sarah K.", action: "moved", subject: "Design System Tokens → Completed", time: "12m" },
  { user: "James P.", action: "created", subject: "Performance test suite", time: "1h" },
  { user: "Tom R.", action: "commented on", subject: "CMS integration", time: "2h" },
  { user: "Priya M.", action: "updated", subject: "Sprint 4 capacity → 20 items", time: "3h" },
];

const msConfig: Record<string, string> = {
  reached: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400",
  at_risk: "text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400",
  pending: "text-slate-500 bg-slate-100 dark:bg-slate-800",
};

export default function ProjectOverview({ project }: ProjectOverviewProps) {
  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Overall Completion", value: `${project.progress}%`, icon: TrendingUp, color: "hsl(251 74% 60%)" },
          { label: "Open Items", value: project.open_items, icon: Activity, color: "hsl(210 72% 50%)" },
          { label: "Overdue", value: project.overdue_items, icon: AlertTriangle, color: "hsl(0 72% 51%)" },
          { label: "Blocked", value: project.blocked_items, icon: Flag, color: "hsl(38 92% 50%)" },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="planner-card p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: k.color + "18" }}>
                <Icon className="w-4.5 h-4.5" style={{ color: k.color }} />
              </div>
              <div>
                <p className="text-xl font-display font-bold text-foreground">{k.value}</p>
                <p className="text-[10px] text-muted-foreground">{k.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Pie */}
        <div className="planner-card p-4">
          <h3 className="font-display font-semibold text-sm text-foreground mb-3">Status Distribution</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={STATUS_PIE} cx="50%" cy="50%" innerRadius={28} outerRadius={44} dataKey="value" strokeWidth={0}>
                  {STATUS_PIE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {STATUS_PIE.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </span>
                  <span className="font-semibold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sprint Progress */}
        <div className="planner-card p-4">
          <h3 className="font-display font-semibold text-sm text-foreground mb-3">Sprint Progress</h3>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={SPRINT_DATA} barSize={14} barGap={2}>
              <XAxis dataKey="sprint" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v: any) => [v, ""]}
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
              />
              <Bar dataKey="target" fill="hsl(var(--muted))" radius={[2, 2, 0, 0]} />
              <Bar dataKey="completed" fill="hsl(var(--planner-primary))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Velocity */}
        <div className="planner-card p-4">
          <h3 className="font-display font-semibold text-sm text-foreground mb-3">Completion Velocity</h3>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={VELOCITY_DATA}>
              <defs>
                <linearGradient id="velocGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(251 74% 60%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(251 74% 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
              />
              <Area type="monotone" dataKey="items" stroke="hsl(251 74% 60%)" strokeWidth={2} fill="url(#velocGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Milestones */}
        <div className="planner-card p-4">
          <h3 className="font-display font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <Flag className="w-4 h-4 text-muted-foreground" /> Milestones
          </h3>
          <div className="space-y-2.5">
            {MILESTONES.map((m) => (
              <div key={m.name} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.status === "reached" ? "bg-emerald-500" : m.status === "at_risk" ? "bg-amber-500" : "bg-muted-foreground/30"}`} />
                  <span className="text-sm text-foreground">{m.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{m.date}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize ${msConfig[m.status]}`}>
                    {m.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="planner-card p-4">
          <h3 className="font-display font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" /> Recent Activity
          </h3>
          <div className="space-y-3">
            {ACTIVITY.map((a, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{a.user}</span>{" "}
                {a.action}{" "}
                <span className="text-foreground">{a.subject}</span>
                <span className="block text-[10px] opacity-60 mt-0.5">{a.time} ago</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
