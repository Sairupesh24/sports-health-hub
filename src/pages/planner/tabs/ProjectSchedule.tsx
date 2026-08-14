import { useState, useRef, useCallback } from "react";
import {
  ZoomIn, ZoomOut, Flag, GitBranch, Layers, ChevronRight, ChevronDown,
  Plus, AlertTriangle, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addDays, format, startOfWeek, differenceInDays, parseISO, eachDayOfInterval, isWeekend, isSameDay } from "date-fns";

interface ProjectScheduleProps { projectId: string; }

type ZoomLevel = "week" | "month" | "quarter";

interface GanttTask {
  id: string;
  title: string;
  start: Date;
  end: Date;
  status: string;
  priority: string;
  assignee: string;
  is_milestone: boolean;
  is_critical: boolean;
  dependencies: string[];
  workstream?: string;
  children?: GanttTask[];
  _expanded?: boolean;
  _depth?: number;
}

const today = new Date(2026, 7, 12); // Aug 12, 2026
const mk = (y: number, m: number, d: number) => new Date(y, m - 1, d);

const RAW_TASKS: GanttTask[] = [
  { id: "ms1", title: "Discovery", start: mk(2026,6,1), end: mk(2026,6,30), status: "completed", priority: "high", assignee: "SK", is_milestone: false, is_critical: true, dependencies: [], workstream: "Discovery", _expanded: true,
    children: [
      { id: "1", title: "Stakeholder interviews", start: mk(2026,6,1),  end: mk(2026,6,10), status: "completed", priority: "high", assignee: "SK", is_milestone: false, is_critical: true,  dependencies: [], _depth: 1 },
      { id: "2", title: "Competitive analysis",   start: mk(2026,6,8),  end: mk(2026,6,15), status: "completed", priority: "medium", assignee: "TR", is_milestone: false, is_critical: false, dependencies: ["1"], _depth: 1 },
      { id: "3", title: "Requirements doc",       start: mk(2026,6,15), end: mk(2026,6,30), status: "completed", priority: "high", assignee: "JP", is_milestone: false, is_critical: true,  dependencies: ["2"], _depth: 1 },
    ]
  },
  { id: "ms2", title: "Design", start: mk(2026,7,1), end: mk(2026,8,15), status: "in_progress", priority: "high", assignee: "AD", is_milestone: false, is_critical: true, dependencies: ["ms1"], workstream: "Design", _expanded: true,
    children: [
      { id: "4", title: "Design System Tokens",      start: mk(2026,7,1),  end: mk(2026,7,20), status: "completed",   priority: "high",   assignee: "AD", is_milestone: false, is_critical: true,  dependencies: ["3"],  _depth: 1 },
      { id: "5", title: "Figma component migration", start: mk(2026,7,18), end: mk(2026,8,18), status: "in_progress", priority: "high",   assignee: "AD", is_milestone: false, is_critical: true,  dependencies: ["4"],  _depth: 1 },
      { id: "6", title: "Accessibility audit",       start: mk(2026,8,10), end: mk(2026,8,22), status: "planned",     priority: "high",   assignee: "SK", is_milestone: false, is_critical: false, dependencies: ["5"],  _depth: 1 },
    ]
  },
  { id: "ms3", title: "Engineering", start: mk(2026,7,15), end: mk(2026,9,20), status: "in_progress", priority: "critical", assignee: "JP", is_milestone: false, is_critical: true, dependencies: ["ms2"], workstream: "Engineering", _expanded: true,
    children: [
      { id: "7",  title: "API rate limiting",        start: mk(2026,7,15), end: mk(2026,8,14), status: "review",      priority: "critical", assignee: "JP", is_milestone: false, is_critical: true,  dependencies: ["4"],  _depth: 1 },
      { id: "8",  title: "CMS integration layer",    start: mk(2026,7,25), end: mk(2026,8,20), status: "in_progress", priority: "high",     assignee: "TR", is_milestone: false, is_critical: true,  dependencies: ["7"],  _depth: 1 },
      { id: "9",  title: "Analytics event tracking", start: mk(2026,8,10), end: mk(2026,8,16), status: "blocked",     priority: "high",     assignee: "JP", is_milestone: false, is_critical: true,  dependencies: ["8"],  _depth: 1 },
      { id: "10", title: "Performance testing",      start: mk(2026,8,20), end: mk(2026,9,1),  status: "planned",     priority: "medium",   assignee: "PM", is_milestone: false, is_critical: false, dependencies: ["9"],  _depth: 1 },
    ]
  },
  { id: "mil1", title: "🏁 Alpha Release", start: mk(2026,8,15), end: mk(2026,8,15), status: "at_risk", priority: "critical", assignee: "", is_milestone: true, is_critical: true, dependencies: ["6", "8"] },
  { id: "mil2", title: "🏁 Go-Live",       start: mk(2026,9,30), end: mk(2026,9,30), status: "pending", priority: "critical", assignee: "", is_milestone: true, is_critical: true, dependencies: ["10", "mil1"] },
];

const ZOOM_CONFIG: Record<ZoomLevel, { cellDays: number; cellWidth: number; headerFormat: string; subFormat: string }> = {
  week:    { cellDays: 1,  cellWidth: 36, headerFormat: "MMM d",  subFormat: "EEE" },
  month:   { cellDays: 7,  cellWidth: 80, headerFormat: "MMMM yyyy", subFormat: "'W'w" },
  quarter: { cellDays: 14, cellWidth: 80, headerFormat: "QQQ yyyy", subFormat: "MMM" },
};

const STATUS_COLORS: Record<string, string> = {
  planned: "hsl(220 15% 65%)",
  ready: "hsl(210 72% 55%)",
  in_progress: "hsl(251 74% 60%)",
  review: "hsl(38 92% 50%)",
  blocked: "hsl(0 72% 51%)",
  completed: "hsl(152 60% 42%)",
  at_risk: "hsl(38 92% 50%)",
  pending: "hsl(220 15% 65%)",
};

const LEFT_PANEL_WIDTH = 220;
const ROW_HEIGHT = 36;

export default function ProjectSchedule({ projectId }: ProjectScheduleProps) {
  const [zoom, setZoom] = useState<ZoomLevel>("month");
  const [showCritical, setShowCritical] = useState(false);
  const [showBaseline, setShowBaseline] = useState(false);
  const [tasks, setTasks] = useState<GanttTask[]>(RAW_TASKS);
  const scrollRef = useRef<HTMLDivElement>(null);

  const zoomConf = ZOOM_CONFIG[zoom];

  // Compute visible date range
  const minDate = new Date(2026, 5, 1); // Jun 1
  const maxDate = new Date(2026, 10, 1); // Nov 1
  const days = differenceInDays(maxDate, minDate);
  const totalCells = Math.ceil(days / zoomConf.cellDays);
  const totalWidth = totalCells * zoomConf.cellWidth;

  const dateToX = (date: Date): number => {
    const diff = differenceInDays(date, minDate);
    return (diff / zoomConf.cellDays) * zoomConf.cellWidth;
  };

  const todayX = dateToX(today);

  // Flatten tasks for rendering
  const flattenTasks = (taskList: GanttTask[], depth = 0): GanttTask[] => {
    const result: GanttTask[] = [];
    for (const t of taskList) {
      result.push({ ...t, _depth: depth });
      if (t._expanded && t.children) {
        result.push(...flattenTasks(t.children, depth + 1));
      }
    }
    return result;
  };

  const flatTasks = flattenTasks(tasks);

  const toggleExpand = (id: string) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, _expanded: !t._expanded } : t));
  };

  // Build dependency arrow paths
  const buildArrow = (fromTask: GanttTask, toTask: GanttTask): string => {
    const fromIdx = flatTasks.findIndex((t) => t.id === fromTask.id);
    const toIdx = flatTasks.findIndex((t) => t.id === toTask.id);
    const fromX = dateToX(fromTask.end) + zoomConf.cellWidth * 0.05;
    const fromY = (fromIdx + 0.5) * ROW_HEIGHT;
    const toX = dateToX(toTask.start);
    const toY = (toIdx + 0.5) * ROW_HEIGHT;
    const midX = (fromX + toX) / 2;
    return `M ${fromX} ${fromY} C ${midX} ${fromY} ${midX} ${toY} ${toX} ${toY}`;
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border/40 flex-shrink-0 flex-wrap">
        {/* Zoom */}
        <div className="flex items-center border border-border/50 rounded-lg overflow-hidden h-7">
          {(["week", "month", "quarter"] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={cn(
                "px-2.5 h-full text-xs font-medium capitalize transition-colors border-r border-border/50 last:border-r-0",
                zoom === z ? "text-white" : "hover:bg-muted text-muted-foreground"
              )}
              style={zoom === z ? { background: "hsl(var(--planner-primary))" } : {}}
            >
              {z}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border/50" />

        {/* Toggles */}
        <button
          onClick={() => setShowCritical((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-medium transition-colors border",
            showCritical
              ? "border-red-400 bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
              : "border-border/50 text-muted-foreground hover:bg-muted"
          )}
        >
          <AlertTriangle className="w-3 h-3" />
          Critical Path
        </button>

        <button
          onClick={() => setShowBaseline((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-xs font-medium transition-colors border",
            showBaseline
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/50 text-muted-foreground hover:bg-muted"
          )}
        >
          <Layers className="w-3 h-3" />
          Baseline
        </button>

        <div className="flex-1" />

        <Button size="sm" style={{ background: "hsl(var(--planner-primary))" }} className="gap-1.5 h-7 text-xs">
          <Plus className="w-3 h-3" /> Add Work Item
        </Button>
      </div>

      {/* Gantt body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — task names */}
        <div
          className="flex-shrink-0 border-r border-border/50 overflow-y-auto overflow-x-hidden"
          style={{ width: LEFT_PANEL_WIDTH }}
        >
          {/* Header */}
          <div className="h-10 border-b border-border/40 flex items-center px-3">
            <span className="text-xs font-semibold text-muted-foreground">Work Item</span>
          </div>
          {/* Rows */}
          {flatTasks.map((task, i) => (
            <div
              key={task.id}
              className="flex items-center gap-1 px-2 border-b border-border/20 hover:bg-muted/20 transition-colors"
              style={{ height: ROW_HEIGHT, paddingLeft: `${8 + (task._depth ?? 0) * 16}px` }}
            >
              {task.children && task.children.length > 0 ? (
                <button
                  onClick={() => toggleExpand(task.id)}
                  className="flex-shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
                >
                  {task._expanded
                    ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  }
                </button>
              ) : (
                <span className="w-4 flex-shrink-0" />
              )}
              {task.is_milestone && <Flag className="w-3 h-3 text-amber-500 flex-shrink-0" />}
              <span
                className={cn(
                  "text-xs truncate flex-1",
                  task._depth === 0 ? "font-semibold text-foreground" : "text-foreground",
                  showCritical && task.is_critical && "text-red-500 font-semibold"
                )}
              >
                {task.title}
              </span>
            </div>
          ))}
        </div>

        {/* Right panel — chart */}
        <div className="flex-1 overflow-auto" ref={scrollRef}>
          <div style={{ width: totalWidth, minWidth: "100%" }}>
            {/* Date ruler */}
            <div className="h-10 border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur-sm z-10 flex">
              {Array.from({ length: totalCells }).map((_, i) => {
                const cellDate = addDays(minDate, i * zoomConf.cellDays);
                return (
                  <div
                    key={i}
                    className="flex-shrink-0 border-r border-border/20 flex flex-col items-center justify-center overflow-hidden"
                    style={{ width: zoomConf.cellWidth }}
                  >
                    <span className="text-[9px] font-semibold text-foreground leading-tight">
                      {format(cellDate, zoom === "week" ? "d" : zoom === "month" ? "'W'w" : "MMM")}
                    </span>
                    {zoom === "week" && (
                      <span className="text-[8px] text-muted-foreground leading-tight">
                        {format(cellDate, "MMM")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grid + bars */}
            <div className="relative" style={{ height: flatTasks.length * ROW_HEIGHT }}>
              {/* Weekend shading + vertical grid lines */}
              {Array.from({ length: totalCells }).map((_, i) => {
                const cellDate = addDays(minDate, i * zoomConf.cellDays);
                const isWknd = zoom === "week" && isWeekend(cellDate);
                return (
                  <div
                    key={i}
                    className={cn("absolute top-0 bottom-0 border-r border-border/10", isWknd && "bg-muted/30")}
                    style={{ left: i * zoomConf.cellWidth, width: zoomConf.cellWidth }}
                  />
                );
              })}

              {/* Horizontal row stripes */}
              {flatTasks.map((_, i) => (
                <div
                  key={i}
                  className={cn("absolute left-0 right-0 border-b border-border/20", i % 2 === 0 && "bg-muted/5")}
                  style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                />
              ))}

              {/* Today line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 z-20 pointer-events-none"
                style={{ left: todayX, background: "hsl(var(--gantt-today-line))" }}
              >
                <div
                  className="absolute -top-0 -left-1.5 w-3 h-3 rounded-full"
                  style={{ background: "hsl(var(--gantt-today-line))" }}
                />
              </div>

              {/* SVG dependency arrows */}
              <svg
                className="absolute inset-0 pointer-events-none z-10"
                style={{ width: totalWidth, height: flatTasks.length * ROW_HEIGHT }}
              >
                {flatTasks.map((task) =>
                  task.dependencies.map((depId) => {
                    const depTask = flatTasks.find((t) => t.id === depId);
                    if (!depTask) return null;
                    const path = buildArrow(depTask, task);
                    return (
                      <path
                        key={`${depId}->${task.id}`}
                        d={path}
                        fill="none"
                        stroke={showCritical && task.is_critical ? "hsl(0 72% 51%)" : "hsl(var(--muted-foreground))"}
                        strokeWidth={showCritical && task.is_critical ? 2 : 1}
                        strokeOpacity={0.5}
                        markerEnd="url(#arrow)"
                      />
                    );
                  })
                )}
                <defs>
                  <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill="hsl(var(--muted-foreground))" fillOpacity={0.5} />
                  </marker>
                </defs>
              </svg>

              {/* Task bars */}
              {flatTasks.map((task, i) => {
                const x = dateToX(task.start);
                const width = Math.max(dateToX(task.end) - x, 8);
                const y = i * ROW_HEIGHT + 6;
                const h = ROW_HEIGHT - 12;
                const barColor = showCritical && task.is_critical
                  ? "hsl(0 72% 51%)"
                  : STATUS_COLORS[task.status] ?? "hsl(var(--planner-primary))";

                if (task.is_milestone) {
                  // Diamond shape for milestones
                  const cx = x + zoomConf.cellWidth * 0.1;
                  const cy = i * ROW_HEIGHT + ROW_HEIGHT / 2;
                  const size = 10;
                  return (
                    <div
                      key={task.id}
                      className="absolute flex items-center"
                      style={{ left: cx - size, top: cy - size, width: size * 2, height: size * 2 }}
                      title={task.title}
                    >
                      <div
                        className="w-full h-full rotate-45 rounded-sm shadow-sm cursor-pointer hover:scale-125 transition-transform"
                        style={{ background: "hsl(var(--gantt-bar-milestone))" }}
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={task.id}
                    className="absolute rounded cursor-pointer hover:brightness-110 hover:shadow-md transition-all group"
                    style={{
                      left: x,
                      top: y,
                      width,
                      height: h,
                      background: task._depth === 0 ? barColor + "66" : barColor,
                      border: task._depth === 0 ? `2px solid ${barColor}` : "none",
                      opacity: showCritical && !task.is_critical ? 0.4 : 1,
                    }}
                    title={task.title}
                  >
                    {/* Progress fill for completed portion */}
                    {task.status === "completed" && (
                      <div className="absolute inset-0 rounded" style={{ background: barColor, opacity: 0.9 }} />
                    )}
                    {/* Task label inside bar */}
                    {width > 60 && (
                      <span
                        className="absolute inset-0 flex items-center px-2 text-[9px] font-semibold text-white truncate pointer-events-none"
                        style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
                      >
                        {task.title}
                      </span>
                    )}
                    {/* Baseline ghost bar */}
                    {showBaseline && (
                      <div
                        className="absolute -bottom-1.5 left-0 right-0 h-1 rounded-full opacity-40"
                        style={{ background: "hsl(var(--gantt-bar-baseline))" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
