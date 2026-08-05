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

      const res = await apiFetch<any>(`/api/appointments/${session.id}/reschedule`, {
        method: "POST",
        body: JSON.stringify({
          new_start: newStart.toISOString(),
          new_end: newEnd.toISOString()
        })
      });

      const isWaitlisted = res?.status === "Waitlisted";
      toast({
        title: isWaitlisted ? "Placed on Waitlist" : "Session Rescheduled",
        description: isWaitlisted
          ? "Capacity threshold reached (3/3 max). The appointment was placed on waitlist."
          : `Session moved to ${format(newStart, "MMM d, yyyy 'at' h:mm a")}.`,
        variant: isWaitlisted ? "destructive" : "default"
      });

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
      <DialogContent className="sm:max-w-[480px] rounded-[2rem]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-widest mb-1">
            <CalendarIcon className="w-4 h-4" /> Sports Science Timetable
          </div>
          <DialogTitle className="text-xl font-black tracking-tight">
            Reschedule Session
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-medium">
            Rescheduling session for <strong className="text-foreground">{clientName}</strong>. Lineage tracking will be recorded in audit logs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleReschedule} className="space-y-5 py-2">
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
                Sports Science sessions enforce a capacity limit of <strong>3 clients per slot</strong>. If capacity is reached, the appointment will be automatically queued on the Waitlist.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl font-bold h-11"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl font-bold h-11 bg-primary text-primary-foreground gap-2"
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
