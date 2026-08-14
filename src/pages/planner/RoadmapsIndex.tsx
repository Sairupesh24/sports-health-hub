import PlannerLayout from "@/components/planner/PlannerLayout";
import { Plus, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addDays, format, differenceInDays } from "date-fns";

const today = new Date(2026, 7, 12);
const minDate = new Date(2026, 5, 1);
const maxDate = new Date(2026, 11, 31);
const totalDays = differenceInDays(maxDate, minDate);
const CELL_WIDTH = 50; // px per week
const WEEKS = Math.ceil(totalDays / 7);

const ROADMAP_ITEMS = [
  { id: "1", label: "Website Replatform", start: new Date(2026,5,1), end: new Date(2026,8,30), color: "hsl(251 74% 60%)", row: 0 },
  { id: "2", label: "Mobile App Launch",  start: new Date(2026,6,15), end: new Date(2026,9,15), color: "hsl(25 95% 55%)", row: 1 },
  { id: "3", label: "Clinic Rollout",     start: new Date(2026,4,1), end: new Date(2026,7,25), color: "hsl(152 60% 42%)", row: 2 },
  { id: "4", label: "Q4 Campaign",        start: new Date(2026,8,1), end: new Date(2026,10,1), color: "hsl(38 92% 50%)", row: 3 },
];

const KEY_DATES = [
  { label: "Clinic Go-Live", date: new Date(2026,7,25), color: "hsl(0 72% 51%)" },
  { label: "Product Review", date: new Date(2026,8,15), color: "hsl(251 74% 60%)" },
];

function dateToWeek(date: Date): number {
  return Math.floor(differenceInDays(date, minDate) / 7);
}

export default function RoadmapsIndex() {
  const todayWeek = dateToWeek(today);

  return (
    <PlannerLayout>
      <div className="p-6 max-w-screen-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Roadmaps</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Cross-project strategic timeline view.</p>
          </div>
          <Button size="sm" style={{ background: "hsl(var(--planner-primary))" }} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Roadmap
          </Button>
        </div>

        <div className="planner-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border/40">
            <Map className="w-4 h-4 text-muted-foreground" />
            <p className="font-display font-semibold text-sm text-foreground">Corporate Roadmap 2026</p>
          </div>

          <div className="overflow-x-auto">
            <div style={{ width: WEEKS * CELL_WIDTH + 200, minWidth: "100%" }}>
              {/* Month ruler */}
              <div className="flex border-b border-border/40 bg-muted/20" style={{ marginLeft: 200 }}>
                {Array.from({ length: WEEKS }).map((_, i) => {
                  const d = addDays(minDate, i * 7);
                  const isMonthStart = d.getDate() <= 7;
                  return (
                    <div
                      key={i}
                      className="flex-shrink-0 border-r border-border/20 flex items-center justify-center"
                      style={{ width: CELL_WIDTH, height: 28 }}
                    >
                      {isMonthStart && (
                        <span className="text-[9px] font-semibold text-muted-foreground">
                          {format(d, "MMM")}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Project rows */}
              {ROADMAP_ITEMS.map((item) => {
                const startWeek = dateToWeek(item.start);
                const endWeek = dateToWeek(item.end);
                const barWidth = (endWeek - startWeek) * CELL_WIDTH;
                const barLeft = startWeek * CELL_WIDTH;
                return (
                  <div key={item.id} className="flex items-center border-b border-border/20 hover:bg-muted/10" style={{ height: 44 }}>
                    {/* Label */}
                    <div className="flex-shrink-0 px-4 flex items-center" style={{ width: 200 }}>
                      <div className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-xs font-medium text-foreground truncate">{item.label}</span>
                    </div>
                    {/* Chart area */}
                    <div className="relative flex-1" style={{ height: 44 }}>
                      {/* Today line */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 z-10 opacity-60"
                        style={{ left: todayWeek * CELL_WIDTH, background: "hsl(174 72% 40%)" }}
                      />
                      {/* Bar */}
                      <div
                        className="absolute top-3 rounded-lg flex items-center px-2 cursor-pointer hover:brightness-110 transition-all"
                        style={{
                          left: barLeft, width: Math.max(barWidth, 60), height: 20,
                          background: item.color, opacity: 0.85
                        }}
                      >
                        <span className="text-[9px] font-semibold text-white truncate">{item.label}</span>
                      </div>
                      {/* Key date diamonds */}
                      {KEY_DATES.map((kd) => {
                        const kdWeek = dateToWeek(kd.date);
                        return (
                          <div
                            key={kd.label}
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 rounded-sm z-20 cursor-pointer"
                            style={{ left: kdWeek * CELL_WIDTH - 6, background: kd.color }}
                            title={kd.label}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </PlannerLayout>
  );
}
