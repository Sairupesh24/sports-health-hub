import { useState } from "react";
import {
  Plus, Filter, Columns, ChevronDown, ChevronRight,
  ArrowUpDown, MoreHorizontal, CheckSquare, Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface WorkTableProps {
  projectId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  planned:     { label: "Planned",     color: "hsl(220 15% 55%)", bg: "hsl(220 15% 96%)" },
  ready:       { label: "Ready",       color: "hsl(210 72% 50%)", bg: "hsl(210 72% 95%)" },
  in_progress: { label: "In Progress", color: "hsl(251 74% 60%)", bg: "hsl(251 74% 95%)" },
  review:      { label: "Review",      color: "hsl(38 92% 50%)",  bg: "hsl(38 92% 95%)" },
  blocked:     { label: "Blocked",     color: "hsl(0 72% 51%)",   bg: "hsl(0 72% 96%)" },
  completed:   { label: "Completed",   color: "hsl(152 60% 42%)", bg: "hsl(152 60% 95%)" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: "Critical", color: "hsl(0 72% 51%)" },
  high:     { label: "High",     color: "hsl(25 95% 55%)" },
  medium:   { label: "Medium",   color: "hsl(38 92% 50%)" },
  low:      { label: "Low",      color: "hsl(152 60% 42%)" },
};

interface WorkItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  start_date?: string;
  due_date?: string;
  estimated_hours?: number;
  workstream: string;
  tags: string[];
  children?: WorkItem[];
  _expanded?: boolean;
}

const MOCK_ITEMS: WorkItem[] = [
  {
    id: "ws1", title: "Discovery", status: "completed", priority: "high",
    assignee: "Sarah K.", start_date: "Jun 1", due_date: "Jun 30", estimated_hours: 40,
    workstream: "Discovery", tags: [],
    children: [
      { id: "1", title: "Stakeholder interviews", status: "completed", priority: "high", assignee: "Sarah K.", due_date: "Jun 10", estimated_hours: 8, workstream: "Discovery", tags: ["research"] },
      { id: "2", title: "Competitive analysis",  status: "completed", priority: "medium", assignee: "Tom R.",   due_date: "Jun 15", estimated_hours: 12, workstream: "Discovery", tags: [] },
      { id: "3", title: "Requirements document", status: "completed", priority: "high",   assignee: "James P.", due_date: "Jun 30", estimated_hours: 20, workstream: "Discovery", tags: ["docs"] },
    ],
  },
  {
    id: "ws2", title: "Design", status: "in_progress", priority: "high",
    assignee: "Ana D.", start_date: "Jul 1", due_date: "Aug 15", estimated_hours: 80,
    workstream: "Design", tags: [],
    children: [
      { id: "4", title: "Design System Tokens",     status: "completed",   priority: "high",   assignee: "Ana D.", due_date: "Jul 20", estimated_hours: 20, workstream: "Design", tags: ["design"] },
      { id: "5", title: "Figma component migration",status: "in_progress", priority: "high",   assignee: "Ana D.", due_date: "Aug 18", estimated_hours: 30, workstream: "Design", tags: ["design"] },
      { id: "6", title: "Accessibility audit",      status: "planned",     priority: "high",   assignee: "Sarah K.", due_date: "Aug 22", estimated_hours: 15, workstream: "Design", tags: [] },
    ],
  },
  {
    id: "ws3", title: "Engineering", status: "in_progress", priority: "critical",
    assignee: "James P.", start_date: "Jul 15", due_date: "Sep 20", estimated_hours: 200,
    workstream: "Engineering", tags: [],
    children: [
      { id: "7",  title: "API rate limiting",        status: "review",      priority: "critical", assignee: "James P.", due_date: "Aug 14", estimated_hours: 12, workstream: "Engineering", tags: ["backend"] },
      { id: "8",  title: "CMS integration layer",    status: "in_progress", priority: "high",     assignee: "Tom R.",   due_date: "Aug 20", estimated_hours: 24, workstream: "Engineering", tags: ["backend"] },
      { id: "9",  title: "Analytics event tracking", status: "blocked",     priority: "high",     assignee: "James P.", due_date: "Aug 16", estimated_hours: 8,  workstream: "Engineering", tags: ["blocked"] },
      { id: "10", title: "Performance testing",      status: "planned",     priority: "medium",   assignee: "Priya M.", due_date: "Sep 1",  estimated_hours: 20, workstream: "Engineering", tags: [] },
    ],
  },
];

function WorkItemRow({
  item,
  depth = 0,
  selected,
  onSelect,
  onToggleExpand,
  expanded,
}: {
  item: WorkItem;
  depth?: number;
  selected: boolean;
  onSelect: (id: string, v: boolean) => void;
  onToggleExpand?: () => void;
  expanded?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const status = STATUS_CONFIG[item.status];
  const priority = PRIORITY_CONFIG[item.priority];
  const hasChildren = item.children && item.children.length > 0;

  return (
    <tr
      className={cn(
        "group border-b border-border/30 hover:bg-muted/30 transition-colors",
        selected && "bg-primary/5"
      )}
    >
      {/* Checkbox */}
      <td className="w-8 px-2 py-2.5">
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelect(item.id, Boolean(v))}
          className="opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100"
        />
      </td>

      {/* Title */}
      <td className="py-2.5 pr-4" style={{ paddingLeft: `${8 + depth * 20}px` }}>
        <div className="flex items-center gap-1.5">
          {hasChildren ? (
            <button
              onClick={onToggleExpand}
              className="flex-shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
            >
              {expanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-4 flex-shrink-0" />
          )}
          {editing ? (
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
              className="h-6 text-sm px-1 py-0 border-primary"
            />
          ) : (
            <span
              className={cn(
                "text-sm font-medium cursor-pointer hover:text-primary transition-colors",
                depth === 0 ? "text-foreground font-semibold" : "text-foreground"
              )}
              onDoubleClick={() => setEditing(true)}
            >
              {title}
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="py-2.5 pr-4">
        {status ? (
          <button
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{ color: status.color, background: status.bg }}
          >
            {status.label}
          </button>
        ) : null}
      </td>

      {/* Priority */}
      <td className="py-2.5 pr-4">
        {priority ? (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: priority.color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: priority.color }} />
            {depth === 0 ? "" : priority.label}
          </span>
        ) : null}
      </td>

      {/* Assignee */}
      <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
        {item.assignee}
      </td>

      {/* Due date */}
      <td className="py-2.5 pr-4 text-xs text-muted-foreground whitespace-nowrap">
        {item.due_date}
      </td>

      {/* Est. Hours */}
      <td className="py-2.5 pr-4 text-xs text-muted-foreground text-right">
        {item.estimated_hours ? `${item.estimated_hours}h` : "—"}
      </td>

      {/* Workstream */}
      <td className="py-2.5 pr-4 text-xs text-muted-foreground">
        {depth === 0 ? "" : item.workstream}
      </td>

      {/* Actions */}
      <td className="py-2.5 w-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:bg-muted transition-all">
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>Add Sub-item</DropdownMenuItem>
            <DropdownMenuItem>Move to Sprint</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export default function WorkTable({ projectId }: WorkTableProps) {
  const [items, setItems] = useState<WorkItem[]>(MOCK_ITEMS.map((i) => ({ ...i, _expanded: true })));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, _expanded: !i._expanded } : i));
  };

  const toggleSelect = (id: string, v: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      v ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const allSelected = items.every((i) => selected.has(i.id));
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  };

  const COLUMNS_HEADER = [
    { key: "title", label: "Title", width: "flex-1" },
    { key: "status", label: "Status", width: "w-28" },
    { key: "priority", label: "Priority", width: "w-24" },
    { key: "assignee", label: "Assignee", width: "w-28" },
    { key: "due_date", label: "Due Date", width: "w-24" },
    { key: "estimated_hours", label: "Est. Hours", width: "w-24 text-right" },
    { key: "workstream", label: "Workstream", width: "w-28" },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border/40 flex-shrink-0 flex-wrap">
        {selected.size > 0 ? (
          <>
            <span className="text-xs font-semibold text-primary">{selected.size} selected</span>
            <Button variant="outline" size="sm" className="h-7 text-xs">Change Status</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">Reassign</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">Move to Sprint</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive">Delete</Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
              <Filter className="w-3 h-3" /> Filter
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
              <ArrowUpDown className="w-3 h-3" /> Sort
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
              <Columns className="w-3 h-3" /> Columns
            </Button>
          </>
        )}
        <div className="flex-1" />
        <Button
          size="sm"
          className="gap-1.5 h-7 text-xs"
          style={{ background: "hsl(var(--planner-primary))" }}
        >
          <Plus className="w-3 h-3" /> Add Item
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="sticky top-0 bg-background/95 backdrop-blur-sm z-10">
            <tr className="border-b border-border/50">
              <th className="w-8 px-2 py-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  className="opacity-60"
                />
              </th>
              {COLUMNS_HEADER.map((col) => (
                <th key={col.key} className={`text-left py-2 pr-4 text-xs font-semibold text-muted-foreground ${col.width}`}>
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                    {col.label}
                    <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />
                  </button>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((parent) => (
              <>
                <WorkItemRow
                  key={parent.id}
                  item={parent}
                  depth={0}
                  selected={selected.has(parent.id)}
                  onSelect={toggleSelect}
                  onToggleExpand={() => toggleExpand(parent.id)}
                  expanded={parent._expanded}
                />
                {parent._expanded && parent.children?.map((child) => (
                  <WorkItemRow
                    key={child.id}
                    item={child}
                    depth={1}
                    selected={selected.has(child.id)}
                    onSelect={toggleSelect}
                  />
                ))}
              </>
            ))}
          </tbody>
        </table>

        {/* Add item row */}
        <button
          className="flex items-center gap-2 px-8 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors w-full text-left border-t border-border/20"
        >
          <Plus className="w-3.5 h-3.5" />
          Add work item
        </button>
      </div>
    </div>
  );
}
