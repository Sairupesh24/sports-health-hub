import { UserPlus, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ProjectPeopleProps { projectId: string; }

const MOCK_MEMBERS = [
  { id: "1", name: "Sarah Kim", initials: "SK", role: "manager", items: 12, hours_est: 48, hours_done: 32, utilization: 80 },
  { id: "2", name: "James Park", initials: "JP", role: "contributor", items: 9, hours_est: 36, hours_done: 18, utilization: 95 },
  { id: "3", name: "Ana Diaz", initials: "AD", role: "contributor", items: 7, hours_est: 28, hours_done: 10, utilization: 65 },
  { id: "4", name: "Tom Roberts", initials: "TR", role: "contributor", items: 6, hours_est: 24, hours_done: 16, utilization: 70 },
  { id: "5", name: "Priya Mehta", initials: "PM", role: "viewer", items: 3, hours_est: 12, hours_done: 4,  utilization: 30 },
];

const ROLE_LABELS: Record<string, { label: string; cls: string }> = {
  owner:       { label: "Owner",       cls: "text-violet-600 bg-violet-50 dark:bg-violet-950 dark:text-violet-400" },
  admin:       { label: "Admin",       cls: "text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400" },
  manager:     { label: "Manager",     cls: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-400" },
  contributor: { label: "Contributor", cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400" },
  viewer:      { label: "Viewer",      cls: "text-slate-500 bg-slate-100 dark:bg-slate-800" },
};

export default function ProjectPeople({ projectId }: ProjectPeopleProps) {
  return (
    <div className="p-6 max-w-screen-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-foreground text-lg">Project People</h2>
          <p className="text-sm text-muted-foreground">{MOCK_MEMBERS.length} members</p>
        </div>
        <Button size="sm" style={{ background: "hsl(var(--planner-primary))" }} className="gap-1.5">
          <UserPlus className="w-3.5 h-3.5" /> Add Member
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MOCK_MEMBERS.map((m) => {
          const roleConf = ROLE_LABELS[m.role] ?? ROLE_LABELS.viewer;
          const utilizationColor = m.utilization > 90
            ? "hsl(0 72% 51%)"
            : m.utilization > 75
            ? "hsl(38 92% 50%)"
            : "hsl(152 60% 42%)";
          return (
            <div key={m.id} className="planner-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="text-sm font-bold text-white" style={{ background: "hsl(var(--planner-primary))" }}>
                    {m.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{m.name}</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${roleConf.cls}`}>
                    {roleConf.label}
                  </span>
                </div>
                <button className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="font-display font-bold text-lg text-foreground">{m.items}</p>
                  <p className="text-[10px] text-muted-foreground">Work Items</p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="font-display font-bold text-lg text-foreground">{m.hours_done}h</p>
                  <p className="text-[10px] text-muted-foreground">of {m.hours_est}h</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Utilization</span>
                  <span className="font-semibold" style={{ color: utilizationColor }}>{m.utilization}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(m.utilization, 100)}%`, background: utilizationColor }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
