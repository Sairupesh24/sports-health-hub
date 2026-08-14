import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Play, CheckCircle2, Clock, TrendingDown, Plus, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SprintBoardProps { projectId: string; mode?: "sprint" | "scheduled"; }

const BURNDOWN = [
  { day: "D1", remaining: 40, ideal: 40 },
  { day: "D2", remaining: 40, ideal: 36 },
  { day: "D3", remaining: 37, ideal: 32 },
  { day: "D4", remaining: 32, ideal: 28 },
  { day: "D5", remaining: 28, ideal: 24 },
  { day: "D6", remaining: 22, ideal: 20 },
  { day: "D7", remaining: 18, ideal: 16 },
  { day: "D8", remaining: 16, ideal: 12 },
  { day: "D9", remaining: 14, ideal: 8  },
  { day: "D10",remaining: 10, ideal: 4  },
];

const SPRINT_ITEMS = [
  { id: "1", title: "API rate limiting",          status: "review",      priority: "critical", assignee: "JP" },
  { id: "2", title: "CMS integration layer",      status: "in_progress", priority: "high",     assignee: "TR" },
  { id: "3", title: "Analytics event tracking",   status: "blocked",     priority: "high",     assignee: "JP" },
  { id: "4", title: "Mobile responsive breaks",   status: "in_progress", priority: "medium",   assignee: "AP" },
  { id: "5", title: "SEO meta implementation",    status: "ready",       priority: "low",      assignee: "TR" },
  { id: "6", title: "Image optimization",         status: "completed",   priority: "medium",   assignee: "PM" },
  { id: "7", title: "Dark mode layout",           status: "in_progress", priority: "medium",   assignee: "AP" },
  { id: "8", title: "Footer component",           status: "completed",   priority: "low",      assignee: "SK" },
];

const STATUS_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  planned:     { color: "hsl(220 15% 55%)", bg: "hsl(220 15% 96%)", label: "Planned" },
  ready:       { color: "hsl(210 72% 50%)", bg: "hsl(210 72% 95%)", label: "Ready" },
  in_progress: { color: "hsl(251 74% 60%)", bg: "hsl(251 74% 95%)", label: "In Progress" },
  review:      { color: "hsl(38 92% 50%)",  bg: "hsl(38 92% 95%)",  label: "Review" },
  blocked:     { color: "hsl(0 72% 51%)",   bg: "hsl(0 72% 96%)",   label: "Blocked" },
  completed:   { color: "hsl(152 60% 42%)", bg: "hsl(152 60% 95%)", label: "Completed" },
};

const PRIORITY_DOTS: Record<string, string> = {
  critical: "bg-red-500", high: "bg-orange-500", medium: "bg-amber-400", low: "bg-emerald-500"
};

export default function SprintBoard({ projectId, mode = "sprint" }: SprintBoardProps) {
  const completed = SPRINT_ITEMS.filter((i) => i.status === "completed").length;
  const total = SPRINT_ITEMS.length;

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">
      {/* Sprint header */}
      <div className="planner-card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              Active Sprint
            </span>
            <h2 className="font-display font-bold text-foreground">Sprint 4</h2>
          </div>
          <p className="text-sm text-muted-foreground">Goal: Deliver core integrations and performance baseline</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>Aug 8 – Aug 22</span>
            <span>{completed}/{total} items done</span>
            <span className={cn("font-semibold", completed / total > 0.6 ? "text-emerald-600" : "text-amber-600")}>
              {Math.round((completed / total) * 100)}% complete
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Capacity</p>
            <p className="font-display font-bold text-lg text-foreground">32/40h</p>
          </div>
          <Progress value={80} className="w-20 h-2" />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> Complete Sprint
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sprint items list */}
        <div className="lg:col-span-2 planner-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <p className="font-display font-semibold text-sm text-foreground">Sprint 4 Work Items</p>
            <Button size="sm" style={{ background: "hsl(var(--planner-primary))" }} className="gap-1.5 h-7 text-xs">
              <Plus className="w-3 h-3" /> Add
            </Button>
          </div>
          <div className="divide-y divide-border/30">
            {SPRINT_ITEMS.map((item) => {
              const s = STATUS_COLORS[item.status];
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors group">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOTS[item.priority]}`} />
                  <span className="flex-1 text-sm text-foreground min-w-0 truncate">{item.title}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ color: s.color, background: s.bg }}>
                    {s.label}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 w-6 text-right">{item.assignee}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Burndown chart */}
        <div className="planner-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="w-4 h-4 text-muted-foreground" />
            <p className="font-display font-semibold text-sm text-foreground">Burndown</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={BURNDOWN}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="day" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
              />
              <Line
                type="monotone" dataKey="ideal" stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Ideal"
              />
              <Line
                type="monotone" dataKey="remaining" stroke="hsl(var(--planner-primary))"
                strokeWidth={2} dot={false} name="Remaining"
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-4 h-px bg-muted-foreground/60 inline-block" /> Ideal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-px inline-block" style={{ background: "hsl(var(--planner-primary))" }} /> Actual
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
