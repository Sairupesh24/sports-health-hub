import PlannerLayout from "@/components/planner/PlannerLayout";
import { Calendar as BigCalendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const today = new Date(2026, 7, 12);

const EVENTS = [
  { date: new Date(2026,7,14), label: "Sprint 4 Mid Review", type: "sprint", color: "hsl(251 74% 60%)" },
  { date: new Date(2026,7,15), label: "Alpha Release", type: "milestone", color: "hsl(0 72% 51%)" },
  { date: new Date(2026,7,18), label: "Design Handoff due", type: "work_item", color: "hsl(38 92% 50%)" },
  { date: new Date(2026,7,22), label: "Sprint 4 End", type: "sprint", color: "hsl(152 60% 42%)" },
  { date: new Date(2026,7,25), label: "Clinic Go-Live 🏁", type: "milestone", color: "hsl(0 72% 51%)" },
  { date: new Date(2026,8,1),  label: "Sprint 5 Start", type: "sprint", color: "hsl(251 74% 60%)" },
  { date: new Date(2026,8,8),  label: "Sprint 4 Retrospective", type: "sprint", color: "hsl(210 72% 50%)" },
];

export default function PlannerCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 7, 1));

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const startDayOfWeek = getDay(days[0]); // 0=Sun

  const getEventsForDay = (date: Date) =>
    EVENTS.filter((e) => e.date.toDateString() === date.toDateString());

  return (
    <PlannerLayout>
      <div className="p-6 max-w-screen-xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">Planner Calendar</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-display font-semibold text-foreground min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="ml-2" onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</Button>
          </div>
        </div>

        <div className="planner-card overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-border/40">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="text-center py-2.5 text-xs font-semibold text-muted-foreground border-r border-border/20 last:border-r-0">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {/* Leading empty cells */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 border-r border-b border-border/20 bg-muted/5" />
            ))}

            {days.map((day) => {
              const events = getEventsForDay(day);
              const isCurrentDay = isToday(day);
              const isInMonth = isSameMonth(day, currentMonth);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "h-24 border-r border-b border-border/20 p-1.5 transition-colors hover:bg-muted/20",
                    !isInMonth && "opacity-30"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={cn(
                        "text-xs font-semibold w-6 h-6 rounded-full flex items-center justify-center",
                        isCurrentDay ? "text-white font-bold" : "text-muted-foreground"
                      )}
                      style={isCurrentDay ? { background: "hsl(var(--planner-primary))" } : {}}
                    >
                      {format(day, "d")}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {events.slice(0, 2).map((e, i) => (
                      <div
                        key={i}
                        className="text-[9px] px-1.5 py-0.5 rounded font-medium truncate text-white"
                        style={{ background: e.color }}
                      >
                        {e.label}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <div className="text-[9px] text-muted-foreground px-1">+{events.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: "hsl(0 72% 51%)" }} /> Milestone</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: "hsl(251 74% 60%)" }} /> Sprint</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: "hsl(38 92% 50%)" }} /> Work Item Due</span>
        </div>
      </div>
    </PlannerLayout>
  );
}
