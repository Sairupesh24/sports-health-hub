import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line
} from "recharts";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectReportsProps { projectId: string; }

const STATUS_PIE = [
  { name: "Completed", value: 28, color: "hsl(152 60% 42%)" },
  { name: "In Progress", value: 12, color: "hsl(251 74% 60%)" },
  { name: "Review", value: 6, color: "hsl(38 92% 50%)" },
  { name: "Planned", value: 8, color: "hsl(220 15% 55%)" },
  { name: "Blocked", value: 1, color: "hsl(0 72% 51%)" },
];

const RESOURCE_DATA = [
  { name: "Sarah K.", sprint1: 12, sprint2: 18, sprint3: 14, sprint4: 8 },
  { name: "James P.", sprint1: 10, sprint2: 14, sprint3: 16, sprint4: 12 },
  { name: "Ana D.",   sprint1: 8,  sprint2: 10, sprint3: 8,  sprint4: 6  },
  { name: "Tom R.",   sprint1: 6,  sprint2: 8,  sprint3: 10, sprint4: 8  },
];

const VELOCITY_DATA = [
  { sprint: "S1", planned: 15, actual: 12 },
  { sprint: "S2", planned: 18, actual: 18 },
  { sprint: "S3", planned: 20, actual: 14 },
  { sprint: "S4", planned: 20, actual: 8 },
];

const OVERDUE = [
  { title: "API rate limiting",          due: "Aug 14", assignee: "James P.", days: 2 },
  { title: "Analytics event tracking",  due: "Aug 16", assignee: "James P.", days: 0 },
  { title: "User interview synthesis",  due: "Aug 12", assignee: "Ana D.",   days: 4 },
];

export default function ProjectReports({ projectId }: ProjectReportsProps) {
  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-foreground text-lg">Project Reports</h2>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status pie */}
        <div className="planner-card p-4">
          <h3 className="font-display font-semibold text-sm text-foreground mb-3">Items by Status</h3>
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

        {/* Sprint velocity */}
        <div className="planner-card p-4">
          <h3 className="font-display font-semibold text-sm text-foreground mb-3">Sprint Velocity</h3>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={VELOCITY_DATA} barSize={12}>
              <XAxis dataKey="sprint" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
              <Bar dataKey="planned" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[2,2,0,0]} name="Planned" />
              <Bar dataKey="actual"  fill="hsl(var(--planner-primary))" radius={[2,2,0,0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Overdue items */}
        <div className="planner-card p-4">
          <h3 className="font-display font-semibold text-sm text-foreground mb-3 text-red-500">⚠ Overdue Items</h3>
          <div className="space-y-2.5">
            {OVERDUE.map((o, i) => (
              <div key={i} className="text-xs border border-red-200 dark:border-red-900 rounded-lg p-2.5 bg-red-50/50 dark:bg-red-950/30">
                <p className="font-medium text-foreground">{o.title}</p>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>Due {o.due} · {o.assignee}</span>
                  {o.days > 0 && <span className="text-red-500 font-semibold">{o.days}d overdue</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resource allocation */}
      <div className="planner-card p-4">
        <h3 className="font-display font-semibold text-sm text-foreground mb-3">Resource Allocation by Sprint</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={RESOURCE_DATA} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
            <Bar dataKey="sprint1" fill="hsl(251 74% 80%)" name="Sprint 1" radius={[2,2,0,0]} />
            <Bar dataKey="sprint2" fill="hsl(251 74% 65%)" name="Sprint 2" radius={[2,2,0,0]} />
            <Bar dataKey="sprint3" fill="hsl(251 74% 55%)" name="Sprint 3" radius={[2,2,0,0]} />
            <Bar dataKey="sprint4" fill="hsl(251 74% 45%)" name="Sprint 4" radius={[2,2,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
