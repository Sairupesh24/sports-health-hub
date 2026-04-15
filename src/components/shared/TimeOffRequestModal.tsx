import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface TimeOffRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const LEAVE_TYPES = [
  { value: "Casual", label: "Casual Leave" },
  { value: "Sick", label: "Sick / Medical Leave" },
  { value: "Annual", label: "Annual / Earned Leave" },
  { value: "Unpaid", label: "Unpaid Leave" },
  { value: "Other", label: "Other" },
];

export default function TimeOffRequestModal({ open, onOpenChange, onSuccess }: TimeOffRequestModalProps) {
  const { profile } = useAuth();
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(false);

  const totalDays = dateRange?.from && dateRange?.to
    ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : dateRange?.from ? 1 : 0;

  const handleSubmit = async () => {
    if (!leaveType) return toast({ title: "Select Leave Type", description: "Please choose a leave category.", variant: "destructive" });
    if (!dateRange?.from) return toast({ title: "Select Dates", description: "Please choose at least one date.", variant: "destructive" });
    if (!reason.trim()) return toast({ title: "Reason Required", description: "Please briefly describe the reason.", variant: "destructive" });

    setLoading(true);
    try {
      const { error } = await supabase.from("hr_leaves").insert({
        organization_id: profile?.organization_id,
        employee_id: profile?.id,
        leave_type: leaveType,
        start_date: format(dateRange.from, "yyyy-MM-dd"),
        end_date: format(dateRange.to || dateRange.from, "yyyy-MM-dd"),
        reason: reason.trim(),
        status: "Requested",
      });

      if (error) throw error;

      toast({
        title: "Leave Request Submitted",
        description: "Your request has been sent to HR for approval.",
      });
      setLeaveType(""); setReason(""); setDateRange(undefined);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Clock className="w-5 h-5 text-primary" />
            Request Time Off
          </DialogTitle>
          <DialogDescription>
            Submit a leave request for HR approval. You'll be notified when it's reviewed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Leave Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Leave Type</label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Date Range {totalDays > 0 && <span className="text-primary normal-case font-bold">— {totalDays} day{totalDays !== 1 ? "s" : ""}</span>}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-11 justify-start text-left font-medium rounded-xl",
                    !dateRange?.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to && dateRange.to !== dateRange.from
                      ? `${format(dateRange.from, "dd MMM yyyy")} → ${format(dateRange.to, "dd MMM yyyy")}`
                      : format(dateRange.from, "dd MMM yyyy")
                  ) : "Pick a date range"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  fromDate={new Date()}
                  numberOfMonths={2}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reason</label>
            <Textarea
              placeholder="Briefly describe the reason for your leave request..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="min-h-[90px] rounded-xl resize-none"
            />
          </div>

          {/* Summary chip */}
          {leaveType && dateRange?.from && (
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-bold text-slate-900">{LEAVE_TYPES.find(t => t.value === leaveType)?.label}</p>
                <p className="text-xs text-muted-foreground">
                  {format(dateRange.from, "dd MMM")}
                  {dateRange.to && dateRange.to !== dateRange.from ? ` – ${format(dateRange.to, "dd MMM yyyy")}` : `, ${format(dateRange.from, "yyyy")}`}
                  {" · "}{totalDays} day{totalDays !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="ml-auto">
                <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                  Pending
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2 font-bold px-6">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarIcon className="w-4 h-4" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
