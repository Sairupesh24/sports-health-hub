import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2, XCircle, Clock, Calendar, Loader2,
  User, ChevronDown, Filter, AlertTriangle
} from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual_leave: "Casual Leave",
  sick_leave: "Sick / Medical Leave",
  annual_leave: "Annual Leave",
  personal: "Personal Leave",
  maternity_leave: "Maternity / Paternity",
  bereavement: "Bereavement Leave",
  compensation_off: "Comp-Off",
};

const STATUS_FILTERS = ["All", "Requested", "Approved", "Rejected"] as const;

export default function LeaveApprovals() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("Requested");
  const orgId = profile?.organization_id;

  // Fetch leave requests with employee profile
  const { data: leaves, isLoading } = useQuery({
    queryKey: ["hr-leave-requests", orgId, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("hr_leaves")
        .select("*")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false });

      if (statusFilter !== "All") q = q.eq("status", statusFilter);

      const { data, error } = await q;
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch employee profiles
      const empIds = [...new Set(data.map((l: any) => l.employee_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, profession")
        .in("id", empIds);

      return data.map((leave: any) => ({
        ...leave,
        employee: profiles?.find((p: any) => p.id === leave.employee_id),
      }));
    },
    enabled: !!orgId,
  });

  // Approve / Reject mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "Approved" | "Rejected" }) => {
      const { error } = await supabase
        .from("hr_leaves")
        .update({ status, approved_by: profile?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["hr-leave-requests"] });
      toast({
        title: status === "Approved" ? "Leave Approved ✓" : "Leave Rejected",
        description: status === "Approved"
          ? "The request has been approved and the employee notified."
          : "The request has been rejected.",
      });
    },
    onError: (err: any) => toast({ title: "Update Failed", description: err.message, variant: "destructive" }),
  });

  const leaveDays = (leave: any) =>
    differenceInCalendarDays(parseISO(leave.end_date), parseISO(leave.start_date)) + 1;

  const pendingCount = leaves?.filter((l: any) => l.status === "Requested").length || 0;

  return (
    <DashboardLayout role="hr_manager">
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Leave Approvals</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Review and approve staff time-off requests
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-xl">
              <Clock className="w-4 h-4 animate-pulse" />
              <span className="font-black text-sm">{pendingCount} Pending</span>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all",
                statusFilter === f
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center p-16">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : leaves?.length === 0 ? (
          <div className="text-center p-16 rounded-2xl border border-dashed">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-200 mb-4" />
            <p className="font-black text-slate-600 text-lg">All Clear</p>
            <p className="text-muted-foreground text-sm mt-1">
              {statusFilter === "Requested" ? "No pending leave requests." : "No requests found."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaves?.map((leave: any) => (
              <div
                key={leave.id}
                className={cn(
                  "rounded-2xl border bg-white p-5 transition-all hover:shadow-md",
                  leave.status === "Requested" && "border-amber-200 bg-amber-50/30"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Employee Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/10 flex items-center justify-center font-black text-primary text-sm flex-shrink-0">
                      {leave.employee?.first_name?.[0]}{leave.employee?.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-900">
                        {leave.employee?.first_name} {leave.employee?.last_name}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                        {leave.employee?.profession || "Staff"}
                      </p>
                    </div>
                  </div>

                  {/* Leave Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-bold capitalize">
                        {LEAVE_TYPE_LABELS[leave.leave_type] || leave.leave_type?.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs font-bold text-slate-500">
                        {format(parseISO(leave.start_date), "dd MMM")}
                        {leave.end_date !== leave.start_date
                          ? ` – ${format(parseISO(leave.end_date), "dd MMM yyyy")}`
                          : `, ${format(parseISO(leave.start_date), "yyyy")}`}
                      </span>
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {leaveDays(leave)} day{leaveDays(leave) !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {leave.reason && (
                      <p className="text-xs text-slate-500 italic mt-1.5">"{leave.reason}"</p>
                    )}
                  </div>

                  {/* Status / Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {leave.status === "Requested" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ id: leave.id, status: "Rejected" })}
                          className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 font-bold rounded-xl"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          disabled={updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ id: leave.id, status: "Approved" })}
                          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-200"
                        >
                          {updateMutation.isPending
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Approve
                        </Button>
                      </>
                    ) : (
                      <Badge className={cn(
                        "font-black px-3 py-1 text-xs capitalize rounded-xl",
                        leave.status === "Approved"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      )}>
                        {leave.status === "Approved" ? "✓ Approved" : "✗ Rejected"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
