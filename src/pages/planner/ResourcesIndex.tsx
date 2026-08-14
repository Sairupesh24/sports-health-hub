import PlannerLayout from "@/components/planner/PlannerLayout";
import { Users, TrendingUp, AlertTriangle } from "lucide-react";

interface ResourcesIndexProps {}

const MOCK_MEMBERS = [
  { id: "1", name: "Sarah Kim",    initials: "SK", role: "Project Manager" },
  { id: "2", name: "James Park",   initials: "JP", role: "Backend Engineer" },
  { id: "3", name: "Ana Diaz",     initials: "AD", role: "Designer" },
  { id: "4", name: "Tom Roberts",  initials: "TR", role: "Frontend Engineer" },
  { id: "5", name: "Priya Mehta",  initials: "PM", role: "QA Engineer" },
];

// Week labels
const WEEKS = ["Aug 11", "Aug 18", "Aug 25", "Sep 1", "Sep 8", "Sep 15", "Sep 22", "Sep 29"];

// Utilization data [member][week] = percentage
const UTILIZATION = [
  [80, 85, 75, 70, 65, 60, 55, 50],
  [95, 100, 110, 90, 85, 80, 75, 70],
  [65, 70, 60, 55, 50, 45, 40, 35],
  [70, 75, 80, 85, 90, 70, 65, 60],
  [30, 35, 40, 45, 50, 55, 60, 55],
];

function cellClass(pct: number) {
  if (pct > 100) return "resource-cell-over";
  if (pct > 80)  return "resource-cell-warn";
  return "resource-cell-ok";
}

export default function ResourcesIndex() {
  return (
    <PlannerLayout>
      <div className="p-6 max-w-screen-xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Resource Planning</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Capacity and workload across team members.</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded resource-cell-ok inline-block" /> Available</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded resource-cell-warn inline-block" /> Near Capacity</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded resource-cell-over inline-block" /> Over-allocated</span>
          </div>
        </div>

        <div className="planner-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-48">Team Member</th>
                  {WEEKS.map((w) => (
                    <th key={w} className="text-center px-2 py-3 text-xs font-semibold text-muted-foreground min-w-[80px]">{w}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_MEMBERS.map((member, mi) => (
                  <tr key={member.id} className="border-b border-border/20 hover:bg-muted/10">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: "hsl(var(--planner-primary))" }}
                        >
                          {member.initials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{member.name}</p>
                          <p className="text-[10px] text-muted-foreground">{member.role}</p>
                        </div>
                      </div>
                    </td>
                    {UTILIZATION[mi].map((pct, wi) => (
                      <td key={wi} className="px-2 py-3 text-center">
                        <div
                          className={`inline-flex items-center justify-center w-16 h-8 rounded-lg text-xs font-bold transition-transform hover:scale-105 cursor-pointer ${cellClass(pct)}`}
                        >
                          {pct}%
                          {pct > 100 && <AlertTriangle className="w-2.5 h-2.5 ml-0.5" />}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Over-allocated Members", value: 1, icon: AlertTriangle, color: "hsl(0 72% 51%)" },
            { label: "Avg Team Utilization", value: "73%", icon: TrendingUp, color: "hsl(251 74% 60%)" },
            { label: "Total Team Size", value: MOCK_MEMBERS.length, icon: Users, color: "hsl(152 60% 42%)" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="planner-card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: s.color + "18" }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: s.color }} />
                </div>
                <div>
                  <p className="font-display font-bold text-xl text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PlannerLayout>
  );
}
