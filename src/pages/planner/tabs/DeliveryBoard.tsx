import { useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCorners
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, Filter, SlidersHorizontal, AlertTriangle,
  ChevronDown, GripVertical, Clock, Tag, MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { WorkItemStatus } from "@/types/planner";

interface DeliveryBoardProps {
  projectId: string;
}

interface WorkItemCard {
  id: string;
  title: string;
  status: WorkItemStatus;
  priority: "critical" | "high" | "medium" | "low";
  assignee: string;
  due?: string;
  overdue?: boolean;
  tags?: string[];
  checklist_done?: number;
  checklist_total?: number;
  workstream?: string;
}

const PRIORITY_CONFIG = {
  critical: { dot: "bg-red-500", label: "Critical" },
  high:     { dot: "bg-orange-500", label: "High" },
  medium:   { dot: "bg-amber-400", label: "Medium" },
  low:      { dot: "bg-emerald-500", label: "Low" },
};

const COLUMNS: { id: WorkItemStatus; label: string; color: string }[] = [
  { id: "planned",     label: "Planned",     color: "hsl(220 15% 55%)" },
  { id: "ready",       label: "Ready",       color: "hsl(210 72% 50%)" },
  { id: "in_progress", label: "In Progress", color: "hsl(251 74% 60%)" },
  { id: "review",      label: "Review",      color: "hsl(38 92% 50%)" },
  { id: "blocked",     label: "Blocked",     color: "hsl(0 72% 51%)" },
  { id: "completed",   label: "Completed",   color: "hsl(152 60% 42%)" },
];

const MOCK_ITEMS: WorkItemCard[] = [
  { id: "1", title: "Design System Tokens audit",        status: "completed",   priority: "high",     assignee: "SK", due: "Aug 10", tags: ["design"] },
  { id: "2", title: "Figma component migration",         status: "in_progress", priority: "high",     assignee: "AP", due: "Aug 18", checklist_done: 3, checklist_total: 7, tags: ["design"] },
  { id: "3", title: "API rate limiting implementation",  status: "review",      priority: "critical", assignee: "JP", due: "Aug 14", overdue: true },
  { id: "4", title: "CMS integration layer",             status: "in_progress", priority: "high",     assignee: "TR", due: "Aug 20", checklist_done: 1, checklist_total: 4 },
  { id: "5", title: "Performance testing scenarios",     status: "planned",     priority: "medium",   assignee: "PM", due: "Sep 1" },
  { id: "6", title: "Accessibility audit",               status: "planned",     priority: "high",     assignee: "SK", due: "Aug 22" },
  { id: "7", title: "Mobile responsive breakpoints",     status: "ready",       priority: "medium",   assignee: "AP", due: "Aug 25" },
  { id: "8", title: "SEO meta tag implementation",       status: "ready",       priority: "low",      assignee: "TR", due: "Aug 28" },
  { id: "9", title: "Analytics event tracking",          status: "blocked",     priority: "high",     assignee: "JP", due: "Aug 16", overdue: true, tags: ["blocked"] },
  { id: "10", title: "Image optimization pipeline",      status: "completed",   priority: "medium",   assignee: "PM" },
  { id: "11", title: "Content migration scripts",        status: "in_progress", priority: "medium",   assignee: "TR", due: "Aug 30", checklist_done: 2, checklist_total: 5 },
  { id: "12", title: "Staging environment setup",        status: "completed",   priority: "critical", assignee: "JP" },
];

// ---- Sortable Card ----
function KanbanCard({
  item,
  onClick,
}: { item: WorkItemCard; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const priority = PRIORITY_CONFIG[item.priority];

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="kanban-card group"
      onClick={onClick}
    >
      {/* Drag handle (visible on hover) */}
      <div
        {...listeners}
        {...attributes}
        className="absolute -left-1 top-2 opacity-0 group-hover:opacity-30 hover:!opacity-70 cursor-grab p-0.5 rounded"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-3 h-3 text-muted-foreground" />
      </div>

      {/* Priority + title */}
      <div className="flex items-start gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${priority.dot}`} title={priority.label} />
        <p className="text-sm font-medium text-foreground leading-tight flex-1">{item.title}</p>
      </div>

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.tags.map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 gap-2">
        <div className="flex items-center gap-2">
          {/* Checklist progress */}
          {item.checklist_total && item.checklist_total > 0 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              ☑ {item.checklist_done}/{item.checklist_total}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Due date */}
          {item.due && (
            <span className={cn("text-[10px]", item.overdue ? "text-red-500 font-semibold" : "text-muted-foreground")}>
              {item.overdue ? "⚠ " : ""}
              {item.due}
            </span>
          )}
          {/* Assignee avatar */}
          <Avatar className="w-5 h-5">
            <AvatarFallback className="text-[8px] font-bold" style={{ background: "hsl(var(--planner-primary))", color: "white" }}>
              {item.assignee}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </div>
  );
}

// ---- Column ----
function KanbanColumn({
  column,
  items,
  onCardClick,
  onAddItem,
}: {
  column: (typeof COLUMNS)[0];
  items: WorkItemCard[];
  onCardClick: (id: string) => void;
  onAddItem: (status: WorkItemStatus) => void;
}) {
  return (
    <div className="flex flex-col w-72 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: column.color }} />
          <span className="text-xs font-semibold text-foreground">{column.label}</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {items.length}
          </span>
        </div>
        <button
          onClick={() => onAddItem(column.id)}
          className="p-0.5 rounded hover:bg-muted transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Drop zone */}
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 min-h-[200px] rounded-xl p-2 bg-muted/20 border border-border/30">
          {items.map((item) => (
            <KanbanCard key={item.id} item={item} onClick={() => onCardClick(item.id)} />
          ))}
          {items.length === 0 && (
            <div className="text-center py-8 text-muted-foreground/50 text-xs">
              Drop items here
            </div>
          )}
        </div>
      </SortableContext>

      {/* Add item button */}
      <button
        onClick={() => onAddItem(column.id)}
        className="mt-2 w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add item
      </button>
    </div>
  );
}

export default function DeliveryBoard({ projectId }: DeliveryBoardProps) {
  const [items, setItems] = useState<WorkItemCard[]>(MOCK_ITEMS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const getColumnItems = (status: WorkItemStatus) =>
    items.filter((i) => i.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    // Find which column the card was dropped into
    const targetColumn = COLUMNS.find((col) => {
      const colItems = getColumnItems(col.id);
      return colItems.some((i) => i.id === over.id) || over.id === col.id;
    });

    if (targetColumn) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === active.id ? { ...item, status: targetColumn.id } : item
        )
      );
    }
  };

  const activeItem = items.find((i) => i.id === activeId);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border/40 flex-shrink-0">
        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
          <Filter className="w-3 h-3" /> Filter
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
          <SlidersHorizontal className="w-3 h-3" /> Group by
          <ChevronDown className="w-3 h-3" />
        </Button>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{items.length} total items</span>
        <Button
          size="sm"
          className="gap-1.5 h-7 text-xs"
          style={{ background: "hsl(var(--planner-primary))" }}
        >
          <Plus className="w-3 h-3" /> Add Item
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-5 h-full min-w-max">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                items={getColumnItems(col.id)}
                onCardClick={(id) => setSelectedItem(id)}
                onAddItem={(status) => {/* open work item detail */}}
              />
            ))}

            <DragOverlay>
              {activeItem ? (
                <div className="kanban-card opacity-90 rotate-1 shadow-2xl w-72">
                  <div className="flex items-start gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${PRIORITY_CONFIG[activeItem.priority].dot}`} />
                    <p className="text-sm font-medium text-foreground leading-tight">{activeItem.title}</p>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
