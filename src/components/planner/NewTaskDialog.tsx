import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  UserCheck,
  User,
  Sparkles,
  Layers,
  AlarmClock,
  ArrowRight,
  Lock,
  Check,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { plannerStore, getTodayString } from "@/services/plannerStore";
import { DailyTaskCategory, DailyTaskPriority, TaskType, TaskTimeMode, TeamMember } from "@/types/planner";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  onTaskCreated?: () => void;
}

export default function NewTaskDialog({
  open,
  onOpenChange,
  defaultDate,
  onTaskCreated,
}: NewTaskDialogProps) {
  const { profile, user } = useAuth();
  const teams = plannerStore.getTeams();
  const rawMembers = plannerStore.getMembers();

  // Current logged in user info
  const currentUserId = profile?.id || user?.id || "current_user";
  const currentUserName = profile
    ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email || "You"
    : user?.email || "You";
  const currentUserRole = profile?.ams_role || profile?.profession || "Staff Member";
  const currentUserDept = (profile as any)?.department || "Staff";

  // Ensure current logged in user is in the members list
  const members: TeamMember[] = useMemo(() => {
    const list = [...rawMembers];
    if (currentUserId && !list.some((m) => String(m.id) === String(currentUserId))) {
      list.unshift({
        id: currentUserId,
        name: currentUserName,
        role: currentUserRole,
        department: currentUserDept,
        email: profile?.email || user?.email,
        avatar: profile?.avatar_url,
      });
    }
    return list;
  }, [rawMembers, currentUserId, currentUserName, currentUserRole, currentUserDept, profile, user]);

  // Basic task info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate || getTodayString());

  // Scheduling Mode: "range" (start & end) | "set_time" (single set time) | "flexible" (deadline only)
  const [timeMode, setTimeMode] = useState<TaskTimeMode>("range");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [setTime, setSetTime] = useState("14:00");

  // Deadline Setting
  const [hasDeadline, setHasDeadline] = useState<boolean>(false);
  const [deadlineDate, setDeadlineDate] = useState<string>(defaultDate || getTodayString());
  const [deadlineTime, setDeadlineTime] = useState<string>("18:00");

  const [category, setCategory] = useState<DailyTaskCategory>("clinical_care");
  const [priority, setPriority] = useState<DailyTaskPriority>("medium");

  // Task Type Separation: "individual" | "group"
  const [taskType, setTaskType] = useState<TaskType>("individual");

  // Assignee Individual (Who is receiving the task if individual) - can be self or another staff member
  const [assigneeId, setAssigneeId] = useState<string>(currentUserId);
  const [assigneeOpen, setAssigneeOpen] = useState<boolean>(false);

  // Assigned Group / Team (Which group is receiving the task if group)
  const [teamId, setTeamId] = useState<string>(teams[0]?.id || "");
  const [teamOpen, setTeamOpen] = useState<boolean>(false);

  // Memoized selected member and team objects
  const selectedAssigneeMember = useMemo(() => {
    return members.find((m) => String(m.id) === String(assigneeId));
  }, [members, assigneeId]);

  const selectedTeam = useMemo(() => {
    return teams.find((t) => String(t.id) === String(teamId));
  }, [teams, teamId]);

  // Approval Workflow
  const [requiresApproval, setRequiresApproval] = useState<boolean>(false);
  const [selectedApproverId, setSelectedApproverId] = useState<string>("");

  // Sync defaults whenever dialog opens
  useEffect(() => {
    if (open) {
      setAssigneeOpen(false);
      setTeamOpen(false);
      if (defaultDate) {
        setDate(defaultDate);
        setDeadlineDate(defaultDate);
      }
      // Initialize approver default if needed
      const doctorMember = members.find(
        (m) =>
          m.role.toLowerCase().includes("doctor") ||
          m.role.toLowerCase().includes("physician") ||
          m.role.toLowerCase().includes("lead")
      );
      setSelectedApproverId(doctorMember?.id || members[0]?.id || "");
    }
  }, [open]);

  const isSelfAssigned = taskType === "individual" && String(assigneeId) === String(currentUserId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Task Title Required", description: "Please enter a task name.", variant: "destructive" });
      return;
    }

    const assigner = {
      id: currentUserId,
      name: currentUserName,
    };
    const assignee = taskType === "individual"
      ? members.find((m) => String(m.id) === String(assigneeId)) || { id: currentUserId, name: currentUserName }
      : undefined;
    const team = taskType === "group" ? teams.find((t) => t.id === teamId) : undefined;
    const approver = members.find((m) => String(m.id) === String(selectedApproverId));

    if (taskType === "individual" && !assignee) {
      toast({ title: "Assignee Required", description: "Please select a staff member to assign this individual task to.", variant: "destructive" });
      return;
    }

    if (taskType === "group" && !team) {
      toast({ title: "Group Team Required", description: "Please select a group/team to assign this task to.", variant: "destructive" });
      return;
    }

    const isRange = timeMode === "range";
    const isSetTime = timeMode === "set_time";
    const isFlexible = timeMode === "flexible";

    const effectiveStartTime = isRange ? startTime : isSetTime ? setTime : undefined;
    const effectiveEndTime = isRange ? endTime : undefined;
    const effectiveHasTimeSlot = isRange || isSetTime;
    const effectiveDeadline = isFlexible ? (deadlineDate || date) : (hasDeadline ? deadlineDate : undefined);
    const effectiveDeadlineTime = isFlexible ? deadlineTime : (hasDeadline ? deadlineTime : undefined);

    plannerStore.addTask({
      title: title.trim(),
      description: description.trim(),
      date,
      time_mode: timeMode,
      start_time: effectiveStartTime,
      end_time: effectiveEndTime,
      has_time_slot: effectiveHasTimeSlot,
      is_set_time: isSetTime,
      deadline: effectiveDeadline,
      deadline_time: effectiveDeadlineTime,
      category,
      priority,
      status: requiresApproval ? "under_review" : "scheduled",

      // Task Type Separation - Assigner is permanently the logged-in user
      task_type: taskType,
      assigner_id: currentUserId,
      assigner_name: currentUserName,

      // Individual vs Group
      assignee_id: assignee?.id,
      assignee_name: assignee?.name,
      team_id: team?.id,
      team_name: team?.name,

      creator_id: currentUserId,
      creator_name: currentUserName,

      // Approval Workflow
      requires_approval: requiresApproval,
      approver_id: requiresApproval ? approver?.id : undefined,
      approver_name: requiresApproval ? approver?.name : undefined,
      approval_status: requiresApproval ? "pending" : undefined,
    });

    const destination = taskType === "individual"
      ? (String(assignee?.id) === String(currentUserId) ? "Self" : `Staff Member ${assignee?.name}`)
      : `Team ${team?.name}`;

    const timingDesc = isSetTime
      ? `Scheduled at set time ${setTime} for ${date}`
      : isRange
      ? `Scheduled for ${startTime} - ${endTime} on ${date}`
      : `Deadline set for ${effectiveDeadline}`;

    toast({
      title: `${taskType === "individual" ? "Individual" : "Group"} Task Scheduled`,
      description: `Task assigned to ${destination}. ${timingDesc}.`,
    });

    // Reset fields
    setTitle("");
    setDescription("");
    onOpenChange(false);
    if (onTaskCreated) setTimeout(() => onTaskCreated(), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-background border rounded-2xl shadow-xl p-4 sm:p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-fuchsia-600" />
              Schedule Daily Task & Deadlines
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Schedule time-slotted, single set-time, or deadline-based tasks with assigner, self/staff assignee, and approval rules.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* TASK TYPE SELECTION TAB (Individual vs Group) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-900">Task Scope / Type *</Label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTaskType("individual")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    taskType === "individual"
                      ? "bg-white dark:bg-slate-900 text-fuchsia-700 dark:text-fuchsia-300 shadow-sm border border-fuchsia-200 dark:border-fuchsia-800"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <User className="w-4 h-4 text-fuchsia-600" />
                  Individual Task
                </button>

                <button
                  type="button"
                  onClick={() => setTaskType("group")}
                  className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                    taskType === "group"
                      ? "bg-white dark:bg-slate-900 text-fuchsia-700 dark:text-fuchsia-300 shadow-sm border border-fuchsia-200 dark:border-fuchsia-800"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Users className="w-4 h-4 text-fuchsia-600" />
                  Group / Team Task
                </button>
              </div>
            </div>

            {/* Task Name / Title */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Task Name / Procedure *</Label>
              <Input
                placeholder={
                  taskType === "individual"
                    ? "e.g. Individual Rehabilitation Protocol & Assessment"
                    : "e.g. Group Operations Safety Briefing & Audit"
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 text-sm"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Task Description / Instructions</Label>
              <Textarea
                placeholder="Key instructions, procedures, checklist, or patient notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-sm min-h-[65px] resize-none"
              />
            </div>

            {/* SCHEDULING MODE: Time Range vs Set Time vs Flexible/Deadline */}
            <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-3">
              <div>
                <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-fuchsia-600" />
                  Time & Schedule Configuration *
                </Label>

                {/* 3-Way Mode Segmented Buttons */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/80 dark:bg-slate-900 rounded-xl border border-purple-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTimeMode("range")}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all text-center ${
                      timeMode === "range"
                        ? "bg-fuchsia-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Time Range</span>
                    </div>
                    <span className={`text-[9px] font-normal leading-none ${timeMode === "range" ? "text-fuchsia-100" : "text-slate-400"}`}>
                      Start & End time
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimeMode("set_time")}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all text-center ${
                      timeMode === "set_time"
                        ? "bg-fuchsia-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <AlarmClock className="w-3 h-3" />
                      <span>Set Time</span>
                    </div>
                    <span className={`text-[9px] font-normal leading-none ${timeMode === "set_time" ? "text-fuchsia-100" : "text-slate-400"}`}>
                      Single time (No end)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTimeMode("flexible")}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-0.5 transition-all text-center ${
                      timeMode === "flexible"
                        ? "bg-fuchsia-600 text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      <span>Flexible</span>
                    </div>
                    <span className={`text-[9px] font-normal leading-none ${timeMode === "flexible" ? "text-fuchsia-100" : "text-slate-400"}`}>
                      Deadline only
                    </span>
                  </button>
                </div>
              </div>

              {/* Mode 1: TIME RANGE (Start and End Time) */}
              {timeMode === "range" && (
                <div className="space-y-3 pt-1 border-t border-purple-100/70 dark:border-purple-900/40">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Date *
                      </Label>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-8 text-xs bg-white dark:bg-slate-900"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Start Time *
                      </Label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="h-8 text-xs bg-white dark:bg-slate-900"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        End Time *
                      </Label>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="h-8 text-xs bg-white dark:bg-slate-900"
                        required
                      />
                    </div>
                  </div>

                  {/* Optional Deadline for time-slotted tasks */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Attach Target Deadline Date?</span>
                    <Switch checked={hasDeadline} onCheckedChange={setHasDeadline} />
                  </div>

                  {hasDeadline && (
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Deadline Due Date</Label>
                        <Input
                          type="date"
                          value={deadlineDate}
                          onChange={(e) => setDeadlineDate(e.target.value)}
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Deadline Due Time</Label>
                        <Input
                          type="time"
                          value={deadlineTime}
                          onChange={(e) => setDeadlineTime(e.target.value)}
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 2: SINGLE SET TIME (No end time needed) */}
              {timeMode === "set_time" && (
                <div className="space-y-3 pt-1 border-t border-purple-100/70 dark:border-purple-900/40">
                  <div className="p-2.5 bg-fuchsia-50/80 dark:bg-fuchsia-950/30 rounded-xl border border-fuchsia-100 dark:border-fuchsia-900/40 text-[11px] text-fuchsia-900 dark:text-fuchsia-200 leading-relaxed font-medium flex items-start gap-2">
                    <AlarmClock className="w-3.5 h-3.5 text-fuchsia-600 mt-0.5 shrink-0" />
                    <span>
                      <strong>Single Set Time:</strong> This task is scheduled for a specific time on this date without requiring an end time.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Scheduled Date *
                      </Label>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-8 text-xs bg-white dark:bg-slate-900"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-fuchsia-800 dark:text-fuchsia-300 flex items-center gap-1">
                        <AlarmClock className="w-3 h-3 text-fuchsia-600" />
                        Scheduled Set Time *
                      </Label>
                      <Input
                        type="time"
                        value={setTime}
                        onChange={(e) => setSetTime(e.target.value)}
                        className="h-8 text-xs bg-white dark:bg-slate-900 font-bold text-fuchsia-950 dark:text-fuchsia-100 border-fuchsia-300 dark:border-fuchsia-800"
                        required
                      />
                    </div>
                  </div>

                  {/* Optional Deadline toggle */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Attach Target Deadline Date?</span>
                    <Switch checked={hasDeadline} onCheckedChange={setHasDeadline} />
                  </div>

                  {hasDeadline && (
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Deadline Due Date</Label>
                        <Input
                          type="date"
                          value={deadlineDate}
                          onChange={(e) => setDeadlineDate(e.target.value)}
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Deadline Due Time</Label>
                        <Input
                          type="time"
                          value={deadlineTime}
                          onChange={(e) => setDeadlineTime(e.target.value)}
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode 3: FLEXIBLE / DEADLINE-ONLY */}
              {timeMode === "flexible" && (
                <div className="space-y-2.5 pt-1 border-t border-purple-100/70 dark:border-purple-900/40">
                  <div className="p-2.5 bg-indigo-50/80 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed font-medium">
                    📌 <strong>Daily Recurring Visibility:</strong> This task has no specific time slot and will automatically appear on the Daily Schedule every single day from the start date until the deadline is reached or marked completed.
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Active From Date *
                      </Label>
                      <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-8 text-xs bg-white dark:bg-slate-900"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold text-fuchsia-700 dark:text-fuchsia-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-fuchsia-600" />
                        Target Deadline Due Date *
                      </Label>
                      <Input
                        type="date"
                        value={deadlineDate}
                        onChange={(e) => setDeadlineDate(e.target.value)}
                        className="h-8 text-xs bg-white dark:bg-slate-900 border-fuchsia-300 dark:border-fuchsia-800 font-bold text-fuchsia-900 dark:text-fuchsia-100"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Deadline Due Time (Optional)</Label>
                    <Input
                      type="time"
                      value={deadlineTime}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                      className="h-8 text-xs bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Category</Label>
                <Select value={category} onValueChange={(val) => setCategory(val as DailyTaskCategory)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinical_care">Clinical Care</SelectItem>
                    <SelectItem value="rehab_evaluation">Rehab & Evaluation</SelectItem>
                    <SelectItem value="staff_briefing">Staff Briefing</SelectItem>
                    <SelectItem value="equipment_check">Equipment Check</SelectItem>
                    <SelectItem value="administrative">Administrative</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority</Label>
                <Select value={priority} onValueChange={(val) => setPriority(val as DailyTaskPriority)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">🔴 Critical</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🔵 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ASSIGNMENT SECTION */}
            <div className="rounded-2xl border bg-slate-50/90 dark:bg-slate-900/60 p-3.5 sm:p-4 space-y-3 border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-950/60 text-fuchsia-600 flex items-center justify-center shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      {taskType === "individual" ? "Task Assignment" : "Group Assignment"}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      {taskType === "individual"
                        ? (isSelfAssigned ? "Assigned to yourself" : "Assigned to staff member")
                        : "Assigned to functional team"}
                    </p>
                  </div>
                </div>

                {taskType === "individual" && (
                  <div className="flex items-center p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-lg border border-slate-300/50 dark:border-slate-700/60 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setAssigneeId(currentUserId)}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 leading-none ${
                        isSelfAssigned
                          ? "bg-white dark:bg-slate-900 text-fuchsia-700 dark:text-fuchsia-300 shadow-xs font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-fuchsia-500" />
                      Myself
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isSelfAssigned) {
                          const other = members.find((m) => String(m.id) !== String(currentUserId));
                          if (other) setAssigneeId(other.id);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 leading-none ${
                        !isSelfAssigned
                          ? "bg-white dark:bg-slate-900 text-fuchsia-700 dark:text-fuchsia-300 shadow-xs font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <Users className="w-3 h-3 text-slate-500" />
                      Other Staff
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                {/* Field 1: Assigned By (Always logged-in user, non-changeable) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Assigned By
                    </Label>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-slate-400" /> Logged In User
                    </span>
                  </div>
                  <div
                    title="Assigned By is permanently set to the logged in user and cannot be changed"
                    className="h-9 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/60 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 font-medium cursor-not-allowed select-none shadow-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{currentUserName} (You)</span>
                    </div>
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                  </div>
                </div>

                {/* Field 2: Assigned To (Dynamic searchable dropdown that updates as we type) */}
                {/* Field 2: Assigned To */}
                {taskType === "individual" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Assigned To
                    </Label>
                    <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={assigneeOpen}
                          className="w-full justify-between h-9 text-xs bg-white dark:bg-slate-900 font-bold text-fuchsia-900 dark:text-fuchsia-200 border-fuchsia-200 dark:border-fuchsia-800 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {isSelfAssigned ? (
                              <>
                                <span className="text-fuchsia-600 dark:text-fuchsia-400 font-bold">✨</span>
                                <span className="truncate">Myself ({currentUserRole})</span>
                              </>
                            ) : selectedAssigneeMember ? (
                              <>
                                <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate">{selectedAssigneeMember.name} ({selectedAssigneeMember.role})</span>
                              </>
                            ) : (
                              <span className="text-slate-400 font-normal">Select Staff Member...</span>
                            )}
                          </div>
                          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] sm:w-[350px] p-0 z-[100] pointer-events-auto" align="start">
                        <Command>
                          <CommandInput placeholder="Search staff by name or role..." className="h-9 text-xs" />
                          <CommandList className="max-h-60 overflow-y-auto pointer-events-auto custom-scrollbar">
                            <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                              No staff member found.
                            </CommandEmpty>
                            <CommandGroup heading="Staff Members">
                              <CommandItem
                                value={`Myself ${currentUserName} ${currentUserRole} you`}
                                onSelect={() => {
                                  setAssigneeId(currentUserId);
                                  setAssigneeOpen(false);
                                }}
                                className="text-xs cursor-pointer flex items-center justify-between py-2 px-2.5"
                              >
                                <div className="flex items-center gap-2 font-bold text-fuchsia-700 dark:text-fuchsia-300">
                                  <span>✨</span>
                                  <span>Myself ({currentUserRole})</span>
                                </div>
                                {isSelfAssigned && <Check className="w-3.5 h-3.5 text-fuchsia-600 shrink-0" />}
                              </CommandItem>
                              {members
                                .filter((m) => String(m.id) !== String(currentUserId))
                                .map((m) => {
                                  const isSelected = String(m.id) === String(assigneeId);
                                  return (
                                    <CommandItem
                                      key={m.id}
                                      value={`${m.name} ${m.role} ${m.department || ""}`}
                                      onSelect={() => {
                                        setAssigneeId(m.id);
                                        setAssigneeOpen(false);
                                      }}
                                      className="text-xs cursor-pointer flex items-center justify-between py-2 px-2.5"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <div className="truncate flex items-baseline gap-1.5">
                                          <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{m.name}</span>
                                          <span className="text-[11px] text-slate-500 font-normal truncate">({m.role})</span>
                                        </div>
                                      </div>
                                      {isSelected && <Check className="w-3.5 h-3.5 text-fuchsia-600 shrink-0 ml-2" />}
                                    </CommandItem>
                                  );
                                })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Assigned Team / Group
                    </Label>
                    <Popover open={teamOpen} onOpenChange={setTeamOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={teamOpen}
                          className="w-full justify-between h-9 text-xs bg-white dark:bg-slate-900 font-bold text-fuchsia-900 dark:text-fuchsia-200 border-fuchsia-200 dark:border-fuchsia-800 px-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {selectedTeam ? (
                              <>
                                <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                <span className="truncate">{selectedTeam.name} ({selectedTeam.code})</span>
                              </>
                            ) : (
                              <span className="text-slate-400 font-normal">Select Functional Group...</span>
                            )}
                          </div>
                          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] sm:w-[350px] p-0 z-[100] pointer-events-auto" align="start">
                        <Command>
                          <CommandInput placeholder="Type to search team or group..." className="h-9 text-xs" />
                          <CommandList className="max-h-60 overflow-y-auto pointer-events-auto custom-scrollbar">
                            <CommandEmpty className="py-3 text-center text-xs text-muted-foreground">
                              No team found.
                            </CommandEmpty>
                            <CommandGroup heading="Functional Teams">
                              {teams.map((t) => {
                                const isSelected = String(t.id) === String(teamId);
                                return (
                                  <CommandItem
                                    key={t.id}
                                    value={`${t.name} ${t.code} ${t.department || ""}`}
                                    onSelect={() => {
                                      setTeamId(t.id);
                                      setTeamOpen(false);
                                    }}
                                    className="text-xs cursor-pointer flex items-center justify-between py-2 px-2.5"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <div className="truncate flex items-baseline gap-1.5">
                                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{t.name}</span>
                                        <span className="text-[11px] text-slate-500 font-normal truncate">({t.code})</span>
                                      </div>
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-fuchsia-600 shrink-0 ml-2" />}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>
            </div>

            {/* APPROVAL WORKFLOW SECTION */}
            <div className="rounded-xl border bg-fuchsia-50/60 dark:bg-fuchsia-950/20 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-fuchsia-600" />
                    Requires Manager Approval
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Task must be reviewed and approved by the designated manager before completion.
                  </p>
                </div>
                <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
              </div>

              {requiresApproval && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">Designated Approver</Label>
                  <Select value={selectedApproverId} onValueChange={setSelectedApproverId}>
                    <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Select Approver" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          🛡️ {m.name} ({m.role}) {String(m.id) === String(currentUserId) ? "— (You)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold">
                Schedule {taskType === "individual" ? (isSelfAssigned ? "Personal" : "Individual") : "Group"} Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
