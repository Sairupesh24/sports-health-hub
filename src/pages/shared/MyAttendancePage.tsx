import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock, CheckCircle2, LogIn, LogOut, AlertTriangle,
  Calendar, Plus, Loader2, ChevronRight
} from "lucide-react";
import { format, startOfWeek, addDays, isToday, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import AttendanceMarker from "@/components/attendance/AttendanceMarker";
import TimeOffRequestModal from "@/components/shared/TimeOffRequestModal";
import { toast } from "@/hooks/use-toast";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MyAttendancePage() {
  const { profile, roles } = useAuth();
  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const queryClient = useQueryClient();

  // Derive role for layout
  const role = roles?.includes("sports_scientist") ? "sports_scientist"
    : roles?.includes("physiotherapist") ? "physiotherapist"
    : roles?.includes("foe") ? "foe"
    : "consultant";

  // Week days (Mon → Sun)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Listen for global attendance updates
  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["my-week-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["my-emergencies"] });
    };
    window.addEventListener("attendance_updated", handleUpdate);
    return () => window.removeEventListener("attendance_updated", handleUpdate);
  }, [queryClient]);

  // Fetch this week's attendance logs
  const { data: weekLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["my-week-attendance", profile?.id, format(weekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_attendance_logs")
        .select("*")
        .eq("profile_id", profile!.id)
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", addDays(weekStart, 7).toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch my leave requests
  const { data: myLeaves, isLoading: leavesLoading, refetch: refetchLeaves } = useQuery({
    queryKey: ["my-leaves", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_leaves")
        .select("*")
        .eq("employee_id", profile!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch emergency alerts (my own)
  const { data: myEmergencies } = useQuery({
    queryKey: ["my-emergencies", profile?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("emergency_alerts")
        .select("*")
        .eq("staff_id", profile!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!profile?.id,
  });

  // Build per-day summaries
  const daySummaries = weekDays.map(day => {
    const dayLogs = (weekLogs || []).filter((l: any) =>
      isSameDay(parseISO(l.created_at), day)
    );
    const checkIn = dayLogs.find((l: any) => l.type === "check_in");
    const checkOut = dayLogs.find((l: any) => l.type === "check_out" || l.type === "missed_check_out" || l.type === "emergency_leave");
    const emergency = dayLogs.find((l: any) => l.type === "emergency_leave");

    let workedMinutes: number | null = null;
    if (checkIn && checkOut && (checkOut.type === "check_out" || checkOut.type === "emergency_leave")) {
      workedMinutes = (new Date(checkOut.created_at).getTime() - new Date(checkIn.created_at).getTime()) / 60000;
    }

    return { day, checkIn, checkOut, emergency, workedMinutes, dayLogs };
  });

  const statusColor = (summary: typeof daySummaries[0]) => {
    const { day, checkIn, checkOut, emergency } = summary;
    if (emergency) return "bg-destructive/10 border-destructive/20 text-destructive";
    if (!checkIn && !isFuture(day)) return "bg-slate-50 border-slate-100 text-slate-400";
    if (checkIn && (checkOut?.type === "check_out" || checkOut?.type === "emergency_leave")) return "bg-emerald-50 border-emerald-100 text-emerald-700";
    if (checkIn && !checkOut) return "bg-amber-50 border-amber-100 text-amber-700";
    return "bg-slate-50 border-slate-100 text-slate-400";
  };

  const isFuture = (d: Date) => d > new Date();

  const leaveStatusBadge = (status: string) => {
    if (status === "Approved" || status === "approved") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold">Approved</Badge>;
    if (status === "Rejected" || status === "rejected") return <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold">Rejected</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold">Pending</Badge>;
  };

  return (
    <DashboardLayout role={role}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">My Attendance</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {format(new Date(), "EEEE, dd MMMM yyyy")}
            </p>
          </div>
          <Button
            onClick={() => setTimeOffOpen(true)}
            className="gap-2 font-bold rounded-xl shadow-md"
          >
            <Plus className="w-4 h-4" />
            Request Time Off
          </Button>
        </div>

        {/* Live Check-in Widget */}
        <AttendanceMarker />

        <Tabs defaultValue="week">
          <TabsList className="bg-slate-100 rounded-xl p-1">
            <TabsTrigger value="week" className="rounded-lg font-bold">This Week</TabsTrigger>
            <TabsTrigger value="leaves" className="rounded-lg font-bold">
              Leave Requests
              {myLeaves?.filter((l: any) => l.status === "Requested").length
                ? <span className="ml-1.5 bg-amber-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
                    {myLeaves?.filter((l: any) => l.status === "Requested").length}
                  </span>
                : null}
            </TabsTrigger>
            <TabsTrigger value="emergency" className="rounded-lg font-bold">Emergency History</TabsTrigger>
          </TabsList>

          {/* WEEK VIEW */}
          <TabsContent value="week" className="mt-4">
            {logsLoading ? (
              <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {daySummaries.map(({ day, checkIn, checkOut, emergency, workedMinutes }, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-2xl border p-4 space-y-3 transition-all",
                      isToday(day) ? "ring-2 ring-primary shadow-lg" : "",
                      statusColor({ day, checkIn, checkOut, emergency, workedMinutes, dayLogs: [] })
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{DAY_LABELS[idx]}</p>
                        <p className="text-2xl font-black">{format(day, "d")}</p>
                      </div>
                      {isToday(day) && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black">TODAY</Badge>
                      )}
                    </div>

                    {emergency ? (
                      <div className="space-y-1 text-xs font-medium">
                        <div className="flex items-center gap-1.5 text-destructive font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          Emergency Leave
                        </div>
                        <p className="text-[10px] opacity-60">Auto-checked out at {format(parseISO(emergency.created_at), "hh:mm a")}</p>
                      </div>
                    ) : checkIn ? (
                      <div className="space-y-1 text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <LogIn className="w-3 h-3 text-emerald-500" />
                          <span>In: {format(parseISO(checkIn.created_at), "hh:mm a")}</span>
                        </div>
                        {checkOut?.type === "check_out" ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <LogOut className="w-3 h-3 text-slate-400" />
                              <span>Out: {format(parseISO(checkOut.created_at), "hh:mm a")}</span>
                            </div>
                            {workedMinutes !== null && (
                              <div className="flex items-center gap-1.5 font-bold text-emerald-600 pt-1">
                                <Clock className="w-3 h-3" />
                                {Math.floor(workedMinutes / 60)}h {Math.round(workedMinutes % 60)}m worked
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                            <Clock className="w-3 h-3 animate-pulse" />
                            Still working...
                          </div>
                        )}
                      </div>
                    ) : isFuture(day) ? (
                      <p className="text-[10px] opacity-40 font-medium">—</p>
                    ) : (
                      <p className="text-[10px] font-bold opacity-50">No record</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* LEAVE REQUESTS */}
          <TabsContent value="leaves" className="mt-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-bold text-muted-foreground">{myLeaves?.length || 0} total requests</p>
              <Button size="sm" variant="outline" onClick={() => setTimeOffOpen(true)} className="gap-2 rounded-xl font-bold">
                <Plus className="w-3 h-3" /> New Request
              </Button>
            </div>

            {leavesLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : myLeaves?.length === 0 ? (
              <div className="text-center p-12 rounded-2xl border border-dashed">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="font-bold text-slate-500">No leave requests yet</p>
                <p className="text-xs text-muted-foreground mt-1">Submit your first time-off request above</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myLeaves?.map((leave: any) => (
                  <div key={leave.id} className="flex items-center gap-4 p-4 rounded-2xl border bg-white hover:shadow-md transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-bold text-slate-900 capitalize">{leave.leave_type?.replace(/_/g, " ")}</p>
                        {leaveStatusBadge(leave.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(leave.start_date), "dd MMM yyyy")}
                        {leave.end_date !== leave.start_date ? ` – ${format(parseISO(leave.end_date), "dd MMM yyyy")}` : ""}
                      </p>
                      {leave.reason && <p className="text-xs text-slate-500 italic mt-1 truncate">"{leave.reason}"</p>}
                    </div>
                    <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(parseISO(leave.created_at), "dd MMM")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* EMERGENCY HISTORY */}
          <TabsContent value="emergency" className="mt-4 space-y-3">
            {!myEmergencies || myEmergencies.length === 0 ? (
              <div className="text-center p-12 rounded-2xl border border-dashed">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-200 mb-3" />
                <p className="font-bold text-slate-500">No emergency alerts</p>
                <p className="text-xs text-muted-foreground mt-1">You have never raised an emergency leave</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myEmergencies.map((alert: any) => (
                  <div key={alert.id} className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                    alert.status === "unresolved" ? "bg-destructive/5 border-destructive/20" : "bg-white border-slate-100"
                  )}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <p className="font-bold text-slate-900 text-sm">Emergency Leave</p>
                        <Badge className={cn(
                          "text-[10px] font-black",
                          alert.status === "unresolved"
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        )}>
                          {alert.status === "unresolved" ? "PENDING" : "RESOLVED"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(alert.created_at), "dd MMM yyyy, hh:mm a")}
                      </p>
                      {alert.reason && (
                        <p className="text-xs text-slate-600 italic mt-1">"{alert.reason}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <TimeOffRequestModal
          open={timeOffOpen}
          onOpenChange={setTimeOffOpen}
          onSuccess={() => refetchLeaves()}
        />
      </div>
    </DashboardLayout>
  );
}
