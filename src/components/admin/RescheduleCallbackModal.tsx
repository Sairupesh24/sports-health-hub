import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/utils/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addDays, format, startOfToday } from "date-fns";
import { Clock, CheckCircle2, Calendar, Loader2 } from "lucide-react";

interface RescheduleCallbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enquiryId: string;
  enquiryName: string;
  currentCallbackDate?: string | null;
  onSuccess?: () => void;
}

export function RescheduleCallbackModal({
  open,
  onOpenChange,
  enquiryId,
  enquiryName,
  currentCallbackDate,
  onSuccess
}: RescheduleCallbackModalProps) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("16:00");
  const [reason, setReason] = useState("");

  const applyPreset = (daysOffset: number, hour: number, minute: number, label: string) => {
    const target = addDays(startOfToday(), daysOffset);
    setDate(format(target, "yyyy-MM-dd"));
    setTime(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    setReason(`Rescheduled for ${label}`);
  };

  const rescheduleMutation = useMutation({
    mutationFn: async (clear: boolean = false) => {
      let isoDate: string | null = null;
      if (!clear && date) {
        const [h, m] = (time || "12:00").split(':').map(Number);
        const [year, month, day] = date.split('-').map(Number);
        const dt = new Date(year, month - 1, day, h || 12, m || 0);
        isoDate = dt.toISOString();
      }

      await apiFetch(`/clients/enquiries/${enquiryId}/callback`, {
        method: 'PATCH',
        data: {
          next_follow_up_at: isoDate,
          reason: clear ? "Callback marked completed / cleared" : reason.trim()
        }
      });
    },
    onSuccess: (_, clear) => {
      queryClient.invalidateQueries({ queryKey: ["enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["enquiry_interactions"] });
      toast({
        title: clear ? "Callback Cleared" : "Callback Scheduled",
        description: clear 
          ? "Pending callback has been marked as completed." 
          : "The new callback date & time have been updated.",
      });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive"
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-display font-bold text-slate-900">
                Callback Schedule: {enquiryName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {currentCallbackDate 
                  ? `Current callback: ${format(new Date(currentCallbackDate), "EEE, MMM d • h:mm a")}` 
                  : "Set a reminder to call this prospective lead back."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Fast Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Quick Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] font-bold"
                onClick={() => applyPreset(0, 17, 30, "Today evening (5:30 PM)")}
              >
                ⚡ Today Evening
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] font-bold"
                onClick={() => applyPreset(1, 10, 30, "Tomorrow morning (10:30 AM)")}
              >
                ⚡ Tomorrow Morning
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] font-bold"
                onClick={() => applyPreset(1, 16, 0, "Tomorrow afternoon (4:00 PM)")}
              >
                ⚡ Tomorrow Afternoon
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] font-bold"
                onClick={() => applyPreset(2, 11, 0, "In 2 days")}
              >
                ⚡ In 2 Days
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] font-bold"
                onClick={() => applyPreset(7, 10, 30, "Next week")}
              >
                ⚡ Next Week
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Date</Label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Time</Label>
              <Input 
                type="time" 
                value={time} 
                onChange={(e) => setTime(e.target.value)} 
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Reason / Memo</Label>
            <Input 
              placeholder="e.g. Call after office hours to confirm slot"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t pt-4">
          {currentCallbackDate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={rescheduleMutation.isPending}
              onClick={() => rescheduleMutation.mutate(true)}
              className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs font-semibold"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Done & Clear
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            disabled={!date || rescheduleMutation.isPending}
            onClick={() => rescheduleMutation.mutate(false)}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
          >
            {rescheduleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4 mr-1.5" />}
            Save Callback Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

