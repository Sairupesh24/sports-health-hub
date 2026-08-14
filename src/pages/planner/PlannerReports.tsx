import PlannerLayout from "@/components/planner/PlannerLayout";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area } from "recharts";
import { Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_PIE = [
  { name: "Completed", value: 72, color: "hsl(152 60% 42%)" },
  { name: "In Progress", value: 35, color: "hsl(251 74% 60%)" },
  { name: "Planned", value: 24, color: "hsl(220 15% 55%)" },
  { name: "Blocked", value: 8, color: "hsl(0 72% 51%)" },
];

const BURNDOWN = [
  { week: "W1", open: 100, closed: 5 }, { week: "W2", open: 92, closed: 14 },
  { week: "W3", open: 80, closed: 26 }, { week: "W4", open: 73, closed: 33 },
  { week: "W5", open: 62, closed: 44 }, { week: "W6", open: 55, closed: 51 },
  { week: "W7", open: 43, closed: 63 }, { week: "W8", open: 36, closed: 70 },
];

const DEPT_ITEMS = [
  { dept: "Engineering", count: 67 },
  { dept: "Design", count: 28 },
  { dept: "Marketing", count: 15 },
  { dept: "Operations", count: 28 },
];

const OVERDUE_TREND = [
  { week: "W1", overdue: 3 }, { week: "W2", overdue: 5 },
  { week: "W3", overdue: 4 }, { week: "W4", overdue: 8 },
  { week: "W5", overdue: 6 }, { week: "W6", overdue: 9 },
  { week: "W7", overdue: 7 }, { week: "W8", overdue: 8 },
];

export default function PlannerReports() {
  return (
    <PlannerLayout>
      <div className="p-6 max-w-screen-xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Reports</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Workspace-level analytics across all projects.</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export
          </Button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Total Projects", value: 5, color: "hsl(251 74% 60%)" },
            { label: "Total Work Items", value: 139, color: "hsl(210 72% 50%)" },
            { label: "Completed Items", value: 72, color: "hsl(152 60% 42%)" },
            { label: "Overdue Items", value: 8, color: "hsl(0 72% 51%)" },
          ].map((k) => (
            <div key={k.label} className="planner-card p-4">
              <p className="text-2xl font-display font-bold text-foreground">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <div className="mt-2 h-1 rounded-full" style={{ background: k.color + "33" }}>
                <div className="h-full rounded-full" style={{ width: `${(k.value / 139) * 100}%`, background: k.color }} />
              </div>
            </div>
          ))}
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="planner-card p-4">
            <p className="font-display font-semibold text-sm text-foreground mb-3">Items by Status</p>
            <div className="flex items-center gap-3">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie data={STATUS_PIE} cx="50%" cy="50%" innerRadius={25} outerRadius={42} dataKey="value" strokeWidth={0}>
                    {STATUS_PIE.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1">
                {STATUS_PIE.map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-muted-foreground">{s.name}</span>
                    </span>
                    <span className="font-semibold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="planner-card p-4">
            <p className="font-display font-semibold text-sm text-foreground mb-3">Items by Department</p>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={DEPT_ITEMS} barSize={20} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                <Bar dataKey="count" fill="hsl(var(--planner-primary))" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="planner-card p-4">
            <p className="font-display font-semibold text-sm text-foreground mb-3">Overdue Trend</p>
            <ResponsiveContainer width="100%" height={110}>
              <AreaChart data={OVERDUE_TREND}>
                <defs>
                  <linearGradient id="overdueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0 72% 51%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(0 72% 51%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                <Area type="monotone" dataKey="overdue" stroke="hsl(0 72% 51%)" strokeWidth={2} fill="url(#overdueGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Open vs closed items over time */}
        <div className="planner-card p-4">
          <p className="font-display font-semibold text-sm text-foreground mb-3">Open vs. Closed Items Over Time</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={BURNDOWN}>
              <defs>
                <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0 72% 51%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(0 72% 51%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="closedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(152 60% 42%)" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="hsl(152 60% 42%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Area type="monotone" dataKey="open"   stroke="hsl(0 72% 51%)"   strokeWidth={2} fill="url(#openGrad)"   dot={false} name="Open" />
              <Area type="monotone" dataKey="closed" stroke="hsl(152 60% 42%)" strokeWidth={2} fill="url(#closedGrad)" dot={false} name="Closed" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </PlannerLayout>
  );
}
