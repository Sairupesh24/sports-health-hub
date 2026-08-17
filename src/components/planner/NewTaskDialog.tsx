import React, { useState } from "react";
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
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  UserCheck,
  User,
  ArrowRight,
} from "lucide-react";
import { plannerStore, getTodayString } from "@/services/plannerStore";
import { DailyTaskCategory, DailyTaskPriority, TaskType } from "@/types/planner";
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
  const { profile } = useAuth();
  const teams = plannerStore.getTeams();
  const members = plannerStore.getMembers();

  // Basic task info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate || getTodayString());
  
  // Scheduling Mode: Time-Slotted vs Deadline-Only (No specific time slot)
  const [hasTimeSlot, setHasTimeSlot] = useState<boolean>(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  
  // Deadline Setting
  const [hasDeadline, setHasDeadline] = useState<boolean>(false);
  const [deadlineDate, setDeadlineDate] = useState<string>(defaultDate || getTodayString());
  const [deadlineTime, setDeadlineTime] = useState<string>("18:00");

  const [category, setCategory] = useState<DailyTaskCategory>("clinical_care");
  const [priority, setPriority] = useState<DailyTaskPriority>("medium");

  // Task Type Separation: "individual" | "group"
  const [taskType, setTaskType] = useState<TaskType>("individual");

  // Assigner (Who is assigning the task)
  const defaultAssigner = members.find((m) => m.id === profile?.id) || members[0];
  const [assignerId, setAssignerId] = useState<string>(defaultAssigner?.id || "");

  // Assignee Individual (Who is receiving the task if individual)
  const [assigneeId, setAssigneeId] = useState<string>(
    members.find((m) => m.id !== defaultAssigner?.id)?.id || members[0]?.id || ""
  );

  // Assigned Group / Team (Which group is receiving the task if group)
  const [teamId, setTeamId] = useState<string>(teams[0]?.id || "");

  // Approval Workflow
  const [requiresApproval, setRequiresApproval] = useState<boolean>(true);
  const [selectedApproverId, setSelectedApproverId] = useState<string>(
    members.find((m) => m.role.toLowerCase().includes("doctor") || m.role.toLowerCase().includes("physician") || m.role.toLowerCase().includes("lead"))?.id || members[0]?.id || ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: "Task Title Required", description: "Please enter a task name.", variant: "destructive" });
      return;
    }

    const assigner = members.find((m) => m.id === assignerId);
    const assignee = taskType === "individual" ? members.find((m) => m.id === assigneeId) : undefined;
    const team = taskType === "group" ? teams.find((t) => t.id === teamId) : undefined;
    const approver = members.find((m) => m.id === selectedApproverId);

    if (taskType === "individual" && !assignee) {
      toast({ title: "Assignee Required", description: "Please select a staff member to assign this individual task to.", variant: "destructive" });
      return;
    }

    if (taskType === "group" && !team) {
      toast({ title: "Group Team Required", description: "Please select a group/team to assign this task to.", variant: "destructive" });
      return;
    }

    const effectiveDeadline = !hasTimeSlot ? (deadlineDate || date) : (hasDeadline ? deadlineDate : undefined);
    const effectiveDeadlineTime = !hasTimeSlot ? deadlineTime : (hasDeadline ? deadlineTime : undefined);

    plannerStore.addTask({
      title: title.trim(),
      description: description.trim(),
      date,
      start_time: hasTimeSlot ? startTime : undefined,
      end_time: hasTimeSlot ? endTime : undefined,
      has_time_slot: hasTimeSlot,
      deadline: effectiveDeadline,
      deadline_time: effectiveDeadlineTime,
      category,
      priority,
      status: requiresApproval ? "under_review" : "scheduled",
      
      // Task Type Separation
      task_type: taskType,
      assigner_id: assigner?.id,
      assigner_name: assigner?.name,

      // Individual vs Group
      assignee_id: assignee?.id,
      assignee_name: assignee?.name,
      team_id: team?.id,
      team_name: team?.name,

      creator_id: profile?.id || assigner?.id,
      creator_name: profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : assigner?.name,

      // Approval Workflow (same for both individual and group tasks)
      requires_approval: requiresApproval,
      approver_id: requiresApproval ? approver?.id : undefined,
      approver_name: requiresApproval ? approver?.name : undefined,
      approval_status: requiresApproval ? "pending" : undefined,
    });

    const destination = taskType === "individual" ? `Staff Member ${assignee?.name}` : `Team ${team?.name}`;
    toast({
      title: `${taskType === "individual" ? "Individual" : "Group"} Task Scheduled`,
      description: !hasTimeSlot 
        ? `Task assigned to ${destination} with deadline ${effectiveDeadline}. Appears daily until completed.`
        : `Task assigned by ${assigner?.name || "Assigner"} to ${destination} for ${date}.`,
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
            Schedule a time-slotted or deadline-based task with assigner, assignee/group, and approval rules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* TASK TYPE SELECTION TAB (Individual vs Group) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-900">Task Scope / Type *</Label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setTaskType("individual")}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  taskType === "individual"
                    ? "bg-white text-fuchsia-700 shadow-sm border border-fuchsia-200"
                    : "text-slate-600 hover:text-slate-900"
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
                    ? "bg-white text-fuchsia-700 shadow-sm border border-fuchsia-200"
                    : "text-slate-600 hover:text-slate-900"
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

          {/* SCHEDULING MODE: Time Slot vs Deadline Only */}
          <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-fuchsia-600" />
                  Time Slot Requirement
                </Label>
                <p className="text-[11px] text-slate-500">
                  {hasTimeSlot ? "Task has specific start and end hours" : "No specific time slot (Deadline based)"}
                </p>
              </div>
              <Switch
                checked={hasTimeSlot}
                onCheckedChange={(checked) => {
                  setHasTimeSlot(checked);
                  if (!checked) {
                    setDeadlineDate(deadlineDate || date);
                  }
                }}
              />
            </div>

            {hasTimeSlot ? (
              /* SPECIFIC TIME SLOT FIELDS */
              <div className="space-y-3 pt-1 border-t border-purple-100/70">
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Date *
                    </Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-8 text-xs bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Start Time
                    </Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="h-8 text-xs bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      End Time
                    </Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="h-8 text-xs bg-white"
                      required
                    />
                  </div>
                </div>

                {/* Optional Deadline for time-slotted tasks */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-medium text-slate-600">Attach Target Deadline Date?</span>
                  <Switch checked={hasDeadline} onCheckedChange={setHasDeadline} />
                </div>

                {hasDeadline && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600">Deadline Due Date</Label>
                      <Input
                        type="date"
                        value={deadlineDate}
                        onChange={(e) => setDeadlineDate(e.target.value)}
                        className="h-8 text-xs bg-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-600">Deadline Due Time</Label>
                      <Input
                        type="time"
                        value={deadlineTime}
                        onChange={(e) => setDeadlineTime(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* DEADLINE-ONLY / NO SPECIFIC TIME SLOT FIELDS */
              <div className="space-y-2.5 pt-1 border-t border-purple-100/70">
                <div className="p-2.5 bg-indigo-50/80 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed font-medium">
                  📌 <strong>Daily Recurring Visibility:</strong> This task has no specific time slot and will automatically appear on the Daily Schedule every single day from the start date until the deadline is reached or until marked completed.
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Active From Date *
                    </Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-8 text-xs bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 text-fuchsia-700 font-bold">
                      <Clock className="w-3 h-3 text-fuchsia-600" />
                      Target Deadline Due Date *
                    </Label>
                    <Input
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      className="h-8 text-xs bg-white border-fuchsia-300 font-bold text-fuchsia-900"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Deadline Due Time (Optional)</Label>
                  <Input
                    type="time"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                    className="h-8 text-xs bg-white"
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

          {/* ASSIGNMENT SECTION (Separated for Individual vs Group) */}
          <div className="rounded-xl border bg-slate-50 p-3.5 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-fuchsia-600" />
                {taskType === "individual" ? "Individual Task Assignment" : "Group Task Assignment"}
              </Label>
              <span className="text-[11px] font-semibold text-fuchsia-700 bg-fuchsia-50 px-2 py-0.5 rounded border border-fuchsia-200">
                {taskType === "individual" ? "Assigner ➔ Staff Member" : "Assigner ➔ Functional Group"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Field 1: Assigned By (Who is Assigning) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Assigned By (Who is assigning?)</Label>
                <Select value={assignerId} onValueChange={setAssignerId}>
                  <SelectTrigger className="h-9 text-xs bg-white font-medium">
                    <SelectValue placeholder="Select Assigner" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Field 2: Assigned To (Individual Staff vs Group Team) */}
              {taskType === "individual" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Assigned To (Which Staff Member?)</Label>
                  <Select value={assigneeId} onValueChange={setAssigneeId}>
                    <SelectTrigger className="h-9 text-xs bg-white font-bold text-fuchsia-900 border-fuchsia-200">
                      <SelectValue placeholder="Select Staff Member" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          👤 {m.name} ({m.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Assigned To Group (Which Team?)</Label>
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger className="h-9 text-xs bg-white font-bold text-fuchsia-900 border-fuchsia-200">
                      <SelectValue placeholder="Select Functional Group" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          👥 {t.name} ({t.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* APPROVAL WORKFLOW SECTION (Same for both Individual & Group tasks) */}
          <div className="rounded-xl border bg-fuchsia-50/60 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
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
                <Label className="text-xs font-semibold text-slate-800">Designated Approver</Label>
                <Select value={selectedApproverId} onValueChange={setSelectedApproverId}>
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Select Approver" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        🛡️ {m.name} ({m.role})
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
              Schedule {taskType === "individual" ? "Individual" : "Group"} Task
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
