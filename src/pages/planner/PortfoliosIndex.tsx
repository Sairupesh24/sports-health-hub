import PlannerLayout from "@/components/planner/PlannerLayout";
import { Plus, FolderKanban, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

const MOCK_PORTFOLIOS = [
  {
    id: "1", name: "Digital Transformation", description: "Core tech modernization initiatives across the organization.",
    projects: [
      { name: "Website Replatform", health: "on_track", progress: 68 },
      { name: "Mobile App Launch", health: "at_risk", progress: 42 },
      { name: "Athlete Portal Redesign", health: "delayed", progress: 31 },
    ],
  },
  {
    id: "2", name: "Clinic Operations", description: "Clinical systems and patient experience improvements.",
    projects: [
      { name: "Clinic Software Rollout", health: "on_track", progress: 90 },
    ],
  },
];

const HEALTH_COLORS: Record<string, string> = {
  on_track: "hsl(152 60% 42%)", at_risk: "hsl(38 92% 50%)", delayed: "hsl(25 95% 55%)", blocked: "hsl(0 72% 51%)"
};

export default function PortfoliosIndex() {
  const navigate = useNavigate();
  return (
    <PlannerLayout>
      <div className="p-6 max-w-screen-xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Portfolios</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Group and manage projects strategically.</p>
          </div>
          <Button size="sm" style={{ background: "hsl(var(--planner-primary))" }} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Portfolio
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {MOCK_PORTFOLIOS.map((portfolio) => (
            <div key={portfolio.id} className="planner-card p-5 space-y-4">
              <div>
                <h2 className="font-display font-bold text-foreground text-base">{portfolio.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{portfolio.description}</p>
              </div>
              <div className="space-y-2.5">
                {portfolio.projects.map((p) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: HEALTH_COLORS[p.health] ?? "hsl(220 15% 55%)" }} />
                    <span className="text-sm text-foreground flex-1 truncate">{p.name}</span>
                    <Progress value={p.progress} className="w-16 h-1.5" />
                    <span className="text-xs text-muted-foreground w-8 text-right">{p.progress}%</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                <FolderKanban className="w-3.5 h-3.5" /> View Portfolio <ChevronRight className="w-3 h-3 ml-auto" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </PlannerLayout>
  );
}
