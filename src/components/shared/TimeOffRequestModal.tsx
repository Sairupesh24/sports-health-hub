import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Clock, Loader2, ShieldAlert, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { format, addDays, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { useQuery } from "@tanstack/react-query";

interface TimeOffRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const LEAVE_TYPES = [
  { value: "Casual", label: "Casual Leave (1/mo)", key: "casual" },
  { value: "Sick", label: "Sick / Medical Leave (1/3mo)", key: "sick" },
  { value: "Annual", label: "Annual / Earned Leave", key: "paid" },
  { value: "Emergency", label: "Emergency Leave", key: "emergency" },
  { value: "Other", label: "Other / Unpaid (LOP)", key: "other" },
];

export default function TimeOffRequestModal({ open, onOpenChange, onSuccess }: TimeOffRequestModalProps) {
  const { profile } = useAuth();
  const [leaveType, setLeaveType] = useState("");
  const [reason, setReason] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [loading, setLoading] = useState(false);

  // Fetch employee leave balances
  const { data: balanceData } = useQuery({
    queryKey: ["my-leave-balances", profile?.id],
    queryFn: async () => {
      const res = await apiFetch<any>('/hr/leave-balances');
      return res.data || null;
    },
    enabled: open && !!profile?.id,
  });

  // Calculate 48-hour restriction
  const isSameDayOrImmediateAllowed = leaveType === "Sick" || leaveType === "Emergency";
  const todayStart = startOfDay(new Date());
  // For non-sick/emergency leaves, 48 hours prior notice is required (disable today & tomorrow)
  const minSelectableDate = isSameDayOrImmediateAllowed ? todayStart : addDays(todayStart, 2);

  // Reset selected dates if user changes leave type and current selection violates the 48-hour rule
  useEffect(() => {
    if (dateRange?.from && dateRange.from < minSelectableDate) {
      setDateRange(undefined);
    }
  }, [leaveType]);

  const totalDays = dateRange?.from && dateRange?.to
    ? Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : dateRange?.from ? 1 : 0;

  const selectedCategory = LEAVE_TYPES.find(t => t.value === leaveType);
  const availableQuota = balanceData?.available?.[selectedCategory?.key || 'casual'] ?? 0;
  const isLossOfPay = selectedCategory?.key === 'other' || (totalDays > availableQuota && availableQuota >= 0);
  const lopDaysCount = selectedCategory?.key === 'other' ? totalDays : Math.max(0, totalDays - availableQuota);

  const handleSubmit = async () => {
    if (!leaveType) return toast({ title: "Select Leave Type", description: "Please choose a leave category.", variant: "destructive" });
    if (!dateRange?.from) return toast({ title: "Select Dates", description: "Please choose at least one date.", variant: "destructive" });
    if (!reason.trim()) return toast({ title: "Reason Required", description: "Please briefly describe the reason.", variant: "destructive" });

    // Validate 48 hour rule
    if (!isSameDayOrImmediateAllowed && dateRange.from < addDays(todayStart, 2)) {
      return toast({
        title: "Advance Notice Required (48 Hours)",
        description: "Only Sick and Emergency leaves can be applied on the same day or tomorrow. All other leaves require at least 48 hours advance notice.",
        variant: "destructive"
      });
    }

    setLoading(true);
    try {
      await apiFetch('/hr/leaves', {
        method: 'POST',
        data: {
          leave_type: leaveType,
          start_date: format(dateRange.from, "yyyy-MM-dd"),
          end_date: format(dateRange.to || dateRange.from, "yyyy-MM-dd"),
          reason: reason.trim(),
        }
      });

      toast({
        title: "Leave Request Submitted",
        description: isLossOfPay 
          ? `Your request (${lopDaysCount} day(s) marked as Loss of Pay) has been sent to HR.` 
          : "Your request has been sent to HR for approval.",
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
      <DialogContent className="sm:max-w-[520px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black">
            <Clock className="w-5 h-5 text-primary" />
            Request Time Off
          </DialogTitle>
          <DialogDescription>
            Submit a leave request for HR approval. Extra days exceeding available balance will be processed as Loss of Pay.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Leave Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex justify-between">
              <span>Leave Type</span>
              {selectedCategory && (
                <span className="text-primary font-bold text-xs">
                  Available: {availableQuota} day(s)
                </span>
              )}
            </label>
            <Select value={leaveType} onValueChange={setLeaveType}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map(t => {
                  const quotaVal = balanceData?.available?.[t.key];
                  return (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex justify-between items-center w-full">
                        <span>{t.label}</span>
                        {quotaVal !== undefined && (
                          <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-600">
                            {quotaVal} avail
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* 48-Hour Notice Policy Helper Badge */}
            {leaveType && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 pt-0.5">
                <AlertCircle className="w-3.5 h-3.5 text-primary" />
                {isSameDayOrImmediateAllowed ? (
                  <span className="text-emerald-700 font-bold">Same-day application permitted for {leaveType} Leave.</span>
                ) : (
                  <span className="text-amber-700 font-bold">48-hour prior notice required. Today & tomorrow are disabled.</span>
                )}
              </div>
            )}
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
              <PopoverContent className="w-auto p-0 z-[9999] shadow-2xl border border-slate-200 bg-white rounded-2xl overflow-hidden" align="start" side="bottom" sideOffset={6} collisionPadding={16}>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  disabled={(date) => date < minSelectableDate}
                  numberOfMonths={1}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Loss of Pay (LOP) Warning Banner */}
          {isLossOfPay && totalDays > 0 && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-3 text-xs text-rose-900">
              <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-rose-700 uppercase tracking-wider text-[11px]">Loss of Pay (LOP) Notice</p>
                <p className="mt-0.5 font-medium leading-relaxed">
                  You have <b>{availableQuota}</b> day(s) available in this category. Releasing <b>{totalDays}</b> day(s) means <b>{lopDaysCount} day(s)</b> will be calculated as <b>Loss of Pay (LOP)</b>.
                </p>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reason</label>
            <Textarea
              placeholder="Briefly describe the reason for your leave request..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="min-h-[80px] rounded-xl resize-none"
            />
          </div>
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
