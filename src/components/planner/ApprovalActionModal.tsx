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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, ShieldCheck, User, Users } from "lucide-react";
import { DailyTask } from "@/types/planner";
import { plannerStore } from "@/services/plannerStore";
import { toast } from "@/hooks/use-toast";

interface ApprovalActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: DailyTask | null;
  mode: "approve" | "reject";
  onActionCompleted?: () => void;
}

export default function ApprovalActionModal({
  open,
  onOpenChange,
  task,
  mode,
  onActionCompleted,
}: ApprovalActionModalProps) {
  const [note, setNote] = useState("");

  if (!task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "reject" && !note.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please state the reason for rejecting or requesting revision.",
        variant: "destructive",
      });
      return;
    }

    const approverName = task.approver_name || "Dr. Sai Pavan K";

    if (mode === "approve") {
      plannerStore.approveTask(task.id, approverName, note);
      toast({
        title: "Task Approved",
        description: `Task "${task.title}" has been approved.`,
      });
    } else {
      plannerStore.rejectTask(task.id, approverName, note);
      toast({
        title: "Task Rejected",
        description: `Task "${task.title}" rejected with feedback.`,
      });
    }

    setNote("");
    onOpenChange(false);
    if (onActionCompleted) setTimeout(() => onActionCompleted(), 0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && task && (
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-background border rounded-2xl shadow-xl p-4 sm:p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {mode === "approve" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600" />
              )}
              {mode === "approve" ? "Approve Task Completion" : "Reject Task & Request Changes"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {mode === "approve"
                ? "Review task details and approve for final sign-off."
                : "Specify feedback or reason for rejecting this scheduled task."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Task Summary Card */}
            <div className="rounded-xl border p-3 bg-slate-50 space-y-2">
              <h4 className="font-bold text-sm text-slate-900">{task.title}</h4>
              {task.description && (
                <p className="text-xs text-slate-600 line-clamp-2">{task.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-1 font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border">
                  <Clock className="w-3 h-3 text-fuchsia-600" />
                  {task.time_mode === "set_time" || (task.start_time && !task.end_time)
                    ? `${task.date} (At ${task.start_time})`
                    : !task.start_time
                    ? `${task.date} (Flexible)`
                    : `${task.date} (${task.start_time} - ${task.end_time})`}
                </span>

                {task.team_name && (
                  <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border">
                    <Users className="w-3 h-3 text-blue-600" />
                    {task.team_name}
                  </span>
                )}

                {task.assignee_name && (
                  <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border">
                    <User className="w-3 h-3 text-emerald-600" />
                    {task.assignee_name}
                  </span>
                )}
              </div>
            </div>

            {/* Note / Feedback */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>{mode === "approve" ? "Sign-Off / Approval Note" : "Rejection Reason *"}</span>
                <span className="text-[10px] text-muted-foreground">
                  {mode === "approve" ? "Optional" : "Required"}
                </span>
              </Label>
              <Textarea
                placeholder={
                  mode === "approve"
                    ? "Add any sign-off remarks, completed observations, or validation criteria..."
                    : "Specify what needs to be revised or corrected before this task can be approved..."
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="text-xs min-h-[80px] resize-none"
                required={mode === "reject"}
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {mode === "approve" ? (
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Approval
                </Button>
              ) : (
                <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5">
                  <XCircle className="w-4 h-4" />
                  Confirm Rejection
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      )}
    </Dialog>
  );
}
