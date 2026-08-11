import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2, UserCheck } from "lucide-react";
import { format, parseISO, addMinutes } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any;
  onSuccess?: () => void | Promise<any>;
}

export function SportsScientistRescheduleModal({ open, onOpenChange, session, onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [durationMins, setDurationMins] = useState(60);
  const [availability, setAvailability] = useState<{ status: string; slots?: any[] } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [rescheduleScope, setRescheduleScope] = useState<"THIS_SESSION" | "ALL_FUTURE">("THIS_SESSION");

  useEffect(() => {
    if (session && open) {
      const startD = parseISO(session.scheduled_start);
      const endD = session.scheduled_end ? parseISO(session.scheduled_end) : addMinutes(startD, 60);
      const calculatedDuration = Math.max(15, Math.round((endD.getTime() - startD.getTime()) / 60000));

      setRescheduleDate(format(startD, "yyyy-MM-dd"));
      setRescheduleTime(format(startD, "HH:mm"));
      setDurationMins(calculatedDuration || 60);
    }
  }, [session, open]);

  // Fetch practitioner availability when date changes
  useEffect(() => {
    if (!open || !rescheduleDate) return;
    const providerId = session?.scientist_id || session?.therapist_id || user?.id;
    if (!providerId) return;

    setCheckingAvailability(true);
    apiFetch<any>(`/api/appointments/availability?therapist_id=${providerId}&date=${rescheduleDate}`)
      .then((data) => setAvailability(data))
      .catch(() => setAvailability({ status: "Unknown", slots: [] }))
      .finally(() => setCheckingAvailability(false));
  }, [open, rescheduleDate, session?.scientist_id, session?.therapist_id, user?.id]);

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.id) return;
    if (!rescheduleDate || !rescheduleTime) {
      toast({ title: "Required", description: "Please select both a new date and time.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const newStart = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
      const newEnd = addMinutes(newStart, durationMins);

      if (rescheduleScope === "ALL_FUTURE") {
        const res = await apiFetch<any>(`/api/appointments/${session.id}/reschedule-future`, {
          method: "POST",
          body: JSON.stringify({
            new_start: newStart.toISOString(),
            new_end: newEnd.toISOString()
          })
        });

        toast({
          title: "All Future Sessions Rescheduled",
          description: `Successfully shifted ${res?.rescheduled_count || 'all'} future sessions (${res?.confirmed_count || 0} confirmed).`,
          variant: "default"
        });
      } else {
        const res = await apiFetch<any>(`/api/appointments/${session.id}/reschedule`, {
          method: "POST",
          body: JSON.stringify({
            new_start: newStart.toISOString(),
            new_end: newEnd.toISOString()
          })
        });

        const isSlotFull = res?.status === "Waitlisted";
        if (isSlotFull) {
          toast({
            title: "Slot Full",
            description: "This time slot is at full capacity (3/3 clients). Please choose a different time.",
            variant: "destructive"
          });
          return;
        }
        toast({
          title: "Session Rescheduled",
          description: `Session moved to ${format(newStart, "MMM d, yyyy 'at' h:mm a")}.`,
          variant: "default"
        });
      }

      if (onSuccess) await onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Reschedule Failed",
        description: error.message || "Could not reschedule session. Please check slot availability.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  const clientName = session.session_mode === "Group"
    ? `Group: ${session.group_name || "Session"}`
    : `${session.client?.first_name || "Client"} ${session.client?.last_name || ""}`.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[520px] max-h-[88vh] flex flex-col rounded-[2rem] p-0 overflow-hidden border border-border/80 shadow-2xl">
        <DialogHeader className="p-6 pb-3 shrink-0 border-b border-border/40 bg-card">
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest mb-1">
            <CalendarIcon className="w-4 h-4" /> Sports Science Timetable
          </div>
          <DialogTitle className="text-xl font-black tracking-tight">
            Reschedule Session & Series
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-medium">
            Rescheduling session for <strong className="text-foreground">{clientName}</strong>. Lineage tracking will be recorded in audit logs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleReschedule} className="flex flex-col flex-1 overflow-hidden">
          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Scope Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reschedule Scope</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRescheduleScope("THIS_SESSION")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    rescheduleScope === "THIS_SESSION"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                    🎯 Single Session
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium leading-tight">
                    Reschedule only this individual appointment.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRescheduleScope("ALL_FUTURE")}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    rescheduleScope === "ALL_FUTURE"
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
                    🔄 All Future {session?.scheduled_start ? format(parseISO(session.scheduled_start), "EEEE") : ""} Sessions
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium leading-tight">
                    Update all upcoming planned sessions falling on this day of the week.
                  </div>
                </button>
              </div>
            </div>

            {/* Current schedule banner */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border text-xs space-y-1">
              <div className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Currently Scheduled Slot</div>
              <div className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {format(parseISO(session.scheduled_start), "EEEE, MMM d, yyyy 'at' HH:mm")}
              </div>
            </div>

            {/* Date & Time Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Date</Label>
                <Input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="h-11 rounded-xl font-bold text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Time</Label>
                <Input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="h-11 rounded-xl font-bold text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Duration (Minutes)</Label>
              <Input
                type="number"
                min={15}
                max={240}
                step={15}
                value={durationMins}
                onChange={(e) => setDurationMins(parseInt(e.target.value) || 60)}
                className="h-11 rounded-xl font-bold text-xs"
                required
              />
            </div>

            {/* Availability & Capacity Indicator */}
            {checkingAvailability ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 italic">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking practitioner availability...
              </div>
            ) : availability && (
              <div className="p-3.5 rounded-2xl bg-muted/40 border space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Practitioner Status</span>
                  <Badge
                    variant={availability.status === "Available" ? "secondary" : "outline"}
                    className="text-[9px] font-black uppercase tracking-wider"
                  >
                    {availability.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Sports Science sessions have no client capacity limit per slot. Slots at full capacity cannot be booked — please choose a different time.
                </p>
              </div>
            )}
          </div>

          {/* Pinned Footer */}
          <DialogFooter className="p-4 px-6 border-t border-border/50 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm shrink-0 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl font-bold h-11 px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl font-bold h-11 px-6 bg-primary text-primary-foreground gap-2 shadow-md shadow-primary/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Rescheduling...
                </>
              ) : (
                <>Confirm Reschedule</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
