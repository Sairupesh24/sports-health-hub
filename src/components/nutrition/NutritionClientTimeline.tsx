import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock, Activity, AlertCircle, FileText, Pill, Plus, CheckCircle2, TrendingUp } from "lucide-react";
import type { NutritionClient } from "@/types/nutrition";

interface NutritionClientTimelineProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: NutritionClient | null;
  onNewAssessmentClick?: () => void;
}

export default function NutritionClientTimeline({
  open,
  onOpenChange,
  client,
  onNewAssessmentClick,
}: NutritionClientTimelineProps) {
  const [activeTab, setActiveTab] = useState<'assessments' | 'metrics' | 'supplements'>('assessments');

  if (!client) return null;

  // Mock timeline history entries
  const historyEntries = [
    {
      id: "ass-001",
      date: client.last_assessment_date || "2026-07-15",
      type: "Full Assessment",
      takenBy: "Dr. Sarah Jenkins (Lead Sports Nutritionist)",
      bmi: 22.4,
      weight: 71.5,
      bodyFat: 14.2,
      adherence: 88,
      keyObservations: "Significant improvement in intra-session glycogen replenishment. Allergies well managed.",
      supplements: [
        { name: "Creatine Monohydrate", dose: "5g", timing: "Post-workout" },
        { name: "Whey Protein Isolate", dose: "30g", timing: "Post-workout" },
        { name: "Omega-3 Fish Oil", dose: "1000mg", timing: "With Breakfast" },
      ]
    },
    {
      id: "ass-002",
      date: "2026-06-01",
      type: "Baseline Follow-up",
      takenBy: "Dr. Sarah Jenkins",
      bmi: 23.1,
      weight: 73.8,
      bodyFat: 16.0,
      adherence: 78,
      keyObservations: "Initial fatigue symptoms reported mid-session. Increased daily fluid recommendation to 3.8L.",
      supplements: [
        { name: "Whey Protein Isolate", dose: "30g", timing: "Post-workout" },
        { name: "Multivitamin", dose: "1 tab", timing: "Morning" },
      ]
    }
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl bg-card border-l border-border text-foreground p-0 flex flex-col">
        <SheetHeader className="p-6 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {client.uhid}
            </Badge>
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                if (onNewAssessmentClick) onNewAssessmentClick();
              }}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" /> New Assessment
            </Button>
          </div>
          <SheetTitle className="text-2xl font-bold">{client.name}</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground flex items-center gap-3">
            <span>{client.sport_or_goal}</span>
            <span>•</span>
            <span>Pref: <strong className="text-foreground">{client.preference}</strong></span>
            <span>•</span>
            <span>Adherence: <strong className="text-emerald-500">{client.adherence_rate}%</strong></span>
          </SheetDescription>

          {/* Allergies Warning Chips */}
          {client.allergies && client.allergies.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2">
              <span className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Clinical Alerts:
              </span>
              {client.allergies.map((allergy, i) => (
                <Badge key={i} variant="destructive" className="text-[10px] px-2 py-0.5">
                  {allergy}
                </Badge>
              ))}
            </div>
          )}
        </SheetHeader>

        {/* Tab Selection Header */}
        <div className="flex border-b border-border bg-muted/30 px-6 pt-2">
          <button
            onClick={() => setActiveTab('assessments')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'assessments'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Assessment History ({historyEntries.length})
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'metrics'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Anthropometric Trends
          </button>
          <button
            onClick={() => setActiveTab('supplements')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'supplements'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Pill className="w-3.5 h-3.5" /> Active Supplement Stack
          </button>
        </div>

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1 p-6">
          {activeTab === 'assessments' && (
            <div className="space-y-6">
              {historyEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="relative pl-6 pb-6 border-l-2 border-primary/30 last:border-l-0 last:pb-0"
                >
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-bold">
                    ✓
                  </div>
                  <div className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">{entry.date}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {entry.type}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">
                        Adherence: <strong className="text-emerald-500">{entry.adherence}%</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs p-2.5 rounded-lg bg-muted/40">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Weight</span>
                        <span className="font-semibold">{entry.weight} kg</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">BMI</span>
                        <span className="font-semibold">{entry.bmi}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Body Fat %</span>
                        <span className="font-semibold">{entry.bodyFat}%</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        <strong className="text-foreground font-medium">Observations: </strong>
                        {entry.keyObservations}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Evaluated by {entry.takenBy}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Body Composition Progress
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Weight Reduction Progress</span>
                      <span className="font-mono">73.8 kg ➔ 71.5 kg (-2.3 kg)</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[65%]" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Body Fat % Trend</span>
                      <span className="font-mono">16.0% ➔ 14.2% (-1.8%)</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[80%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'supplements' && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Pill className="w-4 h-4 text-primary" /> Current Prescribed Supplements
              </h4>
              {historyEntries[0].supplements.map((supp, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-card border border-border flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-foreground">{supp.name}</span>
                    <span className="text-muted-foreground block text-[10px]">
                      Timing: {supp.timing}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono bg-primary/10 text-primary border-primary/20">
                    {supp.dose}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
