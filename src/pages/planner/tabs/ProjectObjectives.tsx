import { Plus, Target, TrendingUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ProjectObjectivesProps { projectId: string; }

const MOCK_OBJECTIVES = [
  {
    id: "1", name: "Launch a world-class digital presence",
    status: "active", overall: 68,
    key_results: [
      { id: "kr1", name: "Achieve Lighthouse score ≥ 90", current: 72, target: 90, unit: "pts", progress: 80 },
      { id: "kr2", name: "Reduce page load time to < 2s", current: 2.8, target: 2, unit: "s", progress: 60 },
      { id: "kr3", name: "100% mobile responsive coverage", current: 85, target: 100, unit: "%", progress: 85 },
    ],
  },
  {
    id: "2", name: "Improve operational reliability",
    status: "active", overall: 45,
    key_results: [
      { id: "kr4", name: "99.9% uptime SLA", current: 99.2, target: 99.9, unit: "%", progress: 65 },
      { id: "kr5", name: "Zero P1 bugs in production", current: 2, target: 0, unit: "bugs", progress: 30 },
    ],
  },
];

export default function ProjectObjectives({ projectId }: ProjectObjectivesProps) {
  return (
    <div className="p-6 max-w-screen-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-foreground text-lg">Strategic Objectives</h2>
          <p className="text-sm text-muted-foreground">OKRs aligned to this project</p>
        </div>
        <Button size="sm" style={{ background: "hsl(var(--planner-primary))" }} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Link Objective
        </Button>
      </div>

      <div className="space-y-4">
        {MOCK_OBJECTIVES.map((obj) => (
          <div key={obj.id} className="planner-card p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "hsl(var(--planner-primary-light))" }}>
                  <Target className="w-4.5 h-4.5" style={{ color: "hsl(var(--planner-primary))" }} />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">{obj.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{obj.key_results.length} key results</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-lg font-display font-bold text-foreground">{obj.overall}%</span>
                <Progress value={obj.overall} className="w-20 h-2" />
              </div>
            </div>

            <div className="space-y-3 border-t border-border/40 pt-3">
              {obj.key_results.map((kr) => (
                <div key={kr.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-foreground">{kr.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {kr.current}{kr.unit} / {kr.target}{kr.unit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${kr.progress}%`,
                        background: kr.progress >= 80 ? "hsl(152 60% 42%)" : kr.progress >= 50 ? "hsl(251 74% 60%)" : "hsl(38 92% 50%)"
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{kr.progress}% progress</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
