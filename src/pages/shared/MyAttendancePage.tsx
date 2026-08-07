import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Clock, CheckCircle2, LogIn, LogOut, AlertTriangle,
  Calendar as CalendarIcon, Plus, Loader2, ChevronLeft, ChevronRight,
  Megaphone, TrendingUp, History, ShieldAlert, Award, Trash2
} from "lucide-react";
import {
  format, startOfWeek, addDays, endOfWeek, isToday, isSameDay, parseISO,
  subWeeks, addWeeks, startOfMonth, endOfMonth, formatDistanceToNow
} from "date-fns";
import { cn } from "@/lib/utils";
import AttendanceMarker from "@/components/attendance/AttendanceMarker";
import TimeOffRequestModal from "@/components/shared/TimeOffRequestModal";
import PostNoticeModal from "@/components/shared/PostNoticeModal";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/utils/api";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MyAttendancePage() {
  const { profile, roles } = useAuth();
  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const [postNoticeOpen, setPostNoticeOpen] = useState(false);
  const queryClient = useQueryClient();

  const isHrOrAdmin = roles?.includes("hr_manager") || roles?.includes("admin") || roles?.includes("super_admin") || profile?.role === "admin" || profile?.role === "hr_manager";

  // Date Navigation State for Weekly History
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  
  // Date Filtering State for Full Log History
  const [historyFromDate, setHistoryFromDate] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [historyToDate, setHistoryToDate] = useState<string>(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [viewMode, setViewMode] = useState<"week" | "history">("week");

  // Derive role for layout
  const role = roles?.includes("sports_scientist") ? "sports_scientist"
    : roles?.includes("physiotherapist") ? "physiotherapist"
    : roles?.includes("foe") ? "foe"
    : "consultant";

  // Selected week days (Mon → Sun)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(selectedWeekStart, i));
  const weekEnd = endOfWeek(selectedWeekStart, { weekStartsOn: 1 });

  // Current month range
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  // Listen for global attendance updates
  useEffect(() => {
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["my-week-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["my-month-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["my-history-attendance"] });
      queryClient.invalidateQueries({ queryKey: ["my-emergencies"] });
      queryClient.invalidateQueries({ queryKey: ["my-leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["global-announcements"] });
    };
    window.addEventListener("attendance_updated", handleUpdate);
    return () => window.removeEventListener("attendance_updated", handleUpdate);
  }, [queryClient]);

  // Fetch selected week's attendance logs
  const { data: weekLogs, isLoading: weekLogsLoading } = useQuery({
    queryKey: ["my-week-attendance", profile?.id, format(selectedWeekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const from = format(selectedWeekStart, "yyyy-MM-dd");
      const to = format(addDays(weekEnd, 1), "yyyy-MM-dd");
      const response = await apiFetch<any>(`/hr/attendance/history?from=${from}&to=${to}`);
      return Array.isArray(response) ? response : (response.data || []);
    },
    enabled: !!profile?.id,
  });

  // Fetch current month's attendance logs (for Monthly Average Working Hours)
  const { data: monthLogs } = useQuery({
    queryKey: ["my-month-attendance", profile?.id, format(currentMonthStart, "yyyy-MM-dd")],
    queryFn: async () => {
      const from = format(currentMonthStart, "yyyy-MM-dd");
      const to = format(addDays(currentMonthEnd, 1), "yyyy-MM-dd");
      const response = await apiFetch<any>(`/hr/attendance/history?from=${from}&to=${to}`);
      return Array.isArray(response) ? response : (response.data || []);
    },
    enabled: !!profile?.id,
  });

  // Fetch full log history for custom date range / tenure
  const { data: fullHistoryLogs, isLoading: historyLoading } = useQuery({
    queryKey: ["my-history-attendance", profile?.id, historyFromDate, historyToDate],
    queryFn: async () => {
      const response = await apiFetch<any>(`/hr/attendance/history?from=${historyFromDate}&to=${historyToDate}`);
      return Array.isArray(response) ? response : (response.data || []);
    },
    enabled: !!profile?.id && viewMode === "history",
  });

  // Fetch leave balances & Loss of Pay (LOP) details
  const { data: leaveBalanceData, refetch: refetchLeaveBalances } = useQuery({
    queryKey: ["my-leave-balances", profile?.id],
    queryFn: async () => {
      const res = await apiFetch<any>('/hr/leave-balances');
      return res.data || null;
    },
    enabled: !!profile?.id,
  });

  // Fetch my leave requests
  const { data: myLeaves, isLoading: leavesLoading, refetch: refetchLeaves } = useQuery({
    queryKey: ["my-leaves", profile?.id],
    queryFn: async () => {
      const response = await apiFetch<any>(`/hr/leaves?employee_id=${profile!.id}`);
      return response.data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch emergency alerts (my own)
  const { data: myEmergencies } = useQuery({
    queryKey: ["my-emergencies", profile?.id],
    queryFn: async () => {
      const response = await apiFetch<any>(`/hr/emergencies?staff_id=${profile!.id}`);
      return response.data || [];
    },
    enabled: !!profile?.id,
  });

  // Fetch dedicated HR broadcast notices for Notice Board
  const { data: globalAnnouncements = [], isLoading: globalLoading, refetch: refetchAnnouncements } = useQuery({
    queryKey: ["global-announcements", profile?.organization_id],
    queryFn: async () => {
      const response = await apiFetch<any[]>('/admin/notices');
      return Array.isArray(response) ? response : [];
    },
    enabled: !!profile?.organization_id
  });

  const handleDeleteNotice = async (id: string) => {
    try {
      await apiFetch(`/admin/notifications/${id}`, { method: 'DELETE' });
      toast({ title: "Notice Removed" });
      refetchAnnouncements();
    } catch (err: any) {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    }
  };

  // Build per-day summaries for the selected week
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

  // Calculations for Weekly Average Working Hours
  const weeklyWorkedDays = daySummaries.filter(d => d.workedMinutes !== null && d.workedMinutes > 0);
  const weeklyTotalMinutes = weeklyWorkedDays.reduce((acc, curr) => acc + (curr.workedMinutes || 0), 0);
  const weeklyTotalHours = (weeklyTotalMinutes / 60).toFixed(1);
  const weeklyAvgHoursPerDay = weeklyWorkedDays.length > 0
    ? (weeklyTotalMinutes / 60 / weeklyWorkedDays.length).toFixed(1)
    : "0.0";

  // Calculations for Monthly Average Working Hours
  const monthDaysMap = new Map<string, { checkIn?: any; checkOut?: any }>();
  (monthLogs || []).forEach((l: any) => {
    const dayKey = format(parseISO(l.created_at), "yyyy-MM-dd");
    if (!monthDaysMap.has(dayKey)) monthDaysMap.set(dayKey, {});
    const item = monthDaysMap.get(dayKey)!;
    if (l.type === "check_in") item.checkIn = l;
    if (l.type === "check_out" || l.type === "emergency_leave") item.checkOut = l;
  });

  let monthlyTotalMinutes = 0;
  let monthlyDaysCount = 0;
  monthDaysMap.forEach(item => {
    if (item.checkIn && item.checkOut) {
      const mins = (new Date(item.checkOut.created_at).getTime() - new Date(item.checkIn.created_at).getTime()) / 60000;
      if (mins > 0) {
        monthlyTotalMinutes += mins;
        monthlyDaysCount++;
      }
    }
  });

  const monthlyTotalHours = (monthlyTotalMinutes / 60).toFixed(1);
  const monthlyAvgHoursPerDay = monthlyDaysCount > 0
    ? (monthlyTotalMinutes / 60 / monthlyDaysCount).toFixed(1)
    : "0.0";

  const isFuture = (d: Date) => d > new Date();

  const statusColor = (summary: typeof daySummaries[0]) => {
    const { day, checkIn, checkOut, emergency } = summary;
    if (emergency) return "bg-destructive/10 border-destructive/20 text-destructive";
    if (!checkIn && !isFuture(day)) return "bg-slate-50 border-slate-100 text-slate-400";
    if (checkIn && (checkOut?.type === "check_out" || checkOut?.type === "emergency_leave")) return "bg-emerald-50 border-emerald-100 text-emerald-700";
    if (checkIn && !checkOut) return "bg-amber-50 border-amber-100 text-amber-700";
    return "bg-slate-50 border-slate-100 text-slate-400";
  };

  const leaveStatusBadge = (status: string) => {
    if (status === "Approved" || status === "approved") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold">Approved</Badge>;
    if (status === "Rejected" || status === "rejected") return <Badge className="bg-destructive/10 text-destructive border-destructive/20 font-bold">Rejected</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold">Pending</Badge>;
  };

  // Quota metrics from backend
  const quota = leaveBalanceData?.quota || { casual_leave: 12, sick_leave: 4, paid_leave: 0, emergency_leave: 0 };
  const used = leaveBalanceData?.used || { casual: 0, sick: 0, paid: 0, emergency: 0, lop: 0 };
  const available = leaveBalanceData?.available || { casual: 12, sick: 4, paid: 0, emergency: 0 };

  return (
    <DashboardLayout role={role}>
      <div className="space-y-4 sm:space-y-6 max-w-[1200px] mx-auto pb-32 sm:pb-12 px-2 sm:px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">My Attendance & Work Log</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              {format(new Date(), "EEEE, dd MMMM yyyy")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setTimeOffOpen(true)}
              className="w-full sm:w-auto gap-2 font-bold rounded-xl shadow-md bg-primary hover:bg-primary/90 text-xs sm:text-sm h-10 sm:h-11"
            >
              <Plus className="w-4 h-4" />
              Request Time Off
            </Button>
          </div>
        </div>

        {/* Live Check-in Widget */}
        <AttendanceMarker />

        {/* TOP ANALYTICS STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Weekly Average Working Hours */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white p-3.5 sm:p-4 space-y-2 sm:space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">Weekly Avg Hours</p>
                <h3 className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{weeklyAvgHoursPerDay} <span className="text-xs sm:text-sm font-bold text-slate-500">h/d</span></h3>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center text-[10px] sm:text-xs gap-0.5">
              <span className="text-slate-500 font-medium">Total Worked:</span>
              <span className="font-bold text-indigo-700">{weeklyTotalHours} hrs ({weeklyWorkedDays.length}d)</span>
            </div>
          </Card>

          {/* Card 2: Monthly Average Working Hours */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white p-3.5 sm:p-4 space-y-2 sm:space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">Monthly Avg Hours</p>
                <h3 className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{monthlyAvgHoursPerDay} <span className="text-xs sm:text-sm font-bold text-slate-500">h/d</span></h3>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center text-[10px] sm:text-xs gap-0.5">
              <span className="text-slate-500 font-medium">This Month:</span>
              <span className="font-bold text-emerald-700">{monthlyTotalHours} hrs ({monthlyDaysCount}d)</span>
            </div>
          </Card>

          {/* Card 3: Available Leave Balances */}
          <Card className="border border-slate-100 shadow-sm rounded-2xl bg-white p-3.5 sm:p-4 space-y-2 sm:space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">Available Leaves</p>
                <h3 className="text-lg sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">
                  {available.casual + available.sick + available.paid + available.emergency} <span className="text-xs sm:text-sm font-bold text-slate-500">days</span>
                </h3>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                <Award className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center text-[10px] sm:text-xs gap-0.5">
              <span className="text-slate-500 font-medium">Casual: {available.casual} | Sick: {available.sick}</span>
              <span className="font-bold text-blue-700">Active Quotas</span>
            </div>
          </Card>

          {/* Card 4: Loss of Pay (LOP) Days */}
          <Card className={cn(
            "border shadow-sm rounded-2xl p-3.5 sm:p-4 space-y-2 sm:space-y-3 transition-colors",
            used.lop > 0 ? "bg-rose-50/50 border-rose-200" : "bg-white border-slate-100"
          )}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">Loss of Pay (LOP)</p>
                <h3 className={cn("text-lg sm:text-2xl font-black mt-0.5 sm:mt-1", used.lop > 0 ? "text-rose-700" : "text-slate-900")}>
                  {used.lop} <span className="text-xs sm:text-sm font-bold opacity-75">days</span>
                </h3>
              </div>
              <div className={cn(
                "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                used.lop > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"
              )}>
                <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="pt-1 border-t border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center text-[10px] sm:text-xs gap-0.5">
              <span className="text-slate-500 font-medium">Extra Leaves Taken:</span>
              <span className={cn("font-bold", used.lop > 0 ? "text-rose-600" : "text-slate-400")}>
                {used.lop > 0 ? `${used.lop} day(s) LOP` : "None"}
              </span>
            </div>
          </Card>
        </div>

        {/* MAIN BODY GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Attendance Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Tabs defaultValue="week" className="w-full">
              {/* Responsive Touch-Scrollable Tabs List */}
              <div className="w-full overflow-x-auto no-scrollbar pb-1">
                <TabsList className="bg-slate-100 rounded-xl p-1 inline-flex w-max min-w-full justify-start sm:justify-center">
                  <TabsTrigger value="week" className="rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap">Attendance Log</TabsTrigger>
                  <TabsTrigger value="leave-balances" className="rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap">Leave Balances</TabsTrigger>
                  <TabsTrigger value="leaves" className="rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap">
                    Leave Requests
                    {myLeaves?.filter((l: any) => l.status === "Requested").length ? (
                      <span className="ml-1.5 bg-amber-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center font-bold">
                        {myLeaves?.filter((l: any) => l.status === "Requested").length}
                      </span>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="emergency" className="rounded-lg font-bold text-xs sm:text-sm whitespace-nowrap">Emergency History</TabsTrigger>
                </TabsList>
              </div>

              {/* TAB 1: ATTENDANCE LOG (WITH HISTORICAL TENURE NAVIGATION) */}
              <TabsContent value="week" className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
                {/* Navigation Bar & Mode Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewMode(viewMode === "week" ? "history" : "week")}
                      className="w-full sm:w-auto rounded-xl font-bold gap-1 text-xs h-9"
                    >
                      <History className="w-3.5 h-3.5" />
                      {viewMode === "week" ? "Switch to Tenure History Log" : "Switch to Week Cards"}
                    </Button>
                  </div>

                  {viewMode === "week" ? (
                    <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedWeekStart(prev => subWeeks(prev, 1))}
                        className="h-8 w-8 rounded-lg flex-shrink-0"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-xs font-black text-slate-800 text-center flex-1 sm:flex-initial">
                        {format(selectedWeekStart, "dd MMM")} – {format(weekEnd, "dd MMM yyyy")}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setSelectedWeekStart(prev => addWeeks(prev, 1))}
                        className="h-8 w-8 rounded-lg flex-shrink-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                        className="text-[11px] font-black rounded-lg h-8 px-2.5 flex-shrink-0"
                      >
                        Today
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 w-full">
                      {/* From Date Card */}
                      <div className="relative flex flex-col p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 hover:border-slate-300 transition-all cursor-pointer">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">From Date</span>
                        <div className="flex items-center justify-between w-full mt-0.5 min-w-0">
                          <span className="text-xs font-black text-slate-800 truncate">
                            {historyFromDate ? format(parseISO(historyFromDate), "dd MMM yyyy") : "Select date"}
                          </span>
                          <CalendarIcon className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-1 pointer-events-none" />
                        </div>
                        <input
                          type="date"
                          value={historyFromDate}
                          onChange={e => setHistoryFromDate(e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                        />
                      </div>

                      {/* To Date Card */}
                      <div className="relative flex flex-col p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100/80 hover:border-slate-300 transition-all cursor-pointer">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">To Date</span>
                        <div className="flex items-center justify-between w-full mt-0.5 min-w-0">
                          <span className="text-xs font-black text-slate-800 truncate">
                            {historyToDate ? format(parseISO(historyToDate), "dd MMM yyyy") : "Select date"}
                          </span>
                          <CalendarIcon className="w-3.5 h-3.5 text-primary flex-shrink-0 ml-1 pointer-events-none" />
                        </div>
                        <input
                          type="date"
                          value={historyToDate}
                          onChange={e => setHistoryToDate(e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* WEEK CARDS VIEW */}
                {viewMode === "week" && (
                  weekLogsLoading ? (
                    <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {daySummaries.map(({ day, checkIn, checkOut, emergency, workedMinutes }, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "rounded-2xl border p-4 space-y-3 transition-all bg-white",
                            isToday(day) ? "ring-2 ring-primary shadow-md" : "",
                            statusColor({ day, checkIn, checkOut, emergency, workedMinutes, dayLogs: [] })
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{DAY_LABELS[idx]}</p>
                              <p className="text-xl sm:text-2xl font-black">{format(day, "d MMM")}</p>
                            </div>
                            {isToday(day) && (
                              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black">TODAY</Badge>
                            )}
                          </div>

                          {emergency ? (
                            <div className="space-y-1 text-xs font-medium">
                              <div className="flex items-center gap-1.5 text-destructive font-bold">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Emergency Leave
                              </div>
                              <p className="text-[10px] opacity-60">Auto-checked out at {format(parseISO(emergency.created_at), "hh:mm a")}</p>
                            </div>
                          ) : checkIn ? (
                            <div className="space-y-1 text-xs font-medium">
                              <div className="flex items-center gap-1.5">
                                <LogIn className="w-3.5 h-3.5 text-emerald-500" />
                                <span>In: {format(parseISO(checkIn.created_at), "hh:mm a")}</span>
                              </div>
                              {checkOut?.type === "check_out" ? (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <LogOut className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Out: {format(parseISO(checkOut.created_at), "hh:mm a")}</span>
                                  </div>
                                  {workedMinutes !== null && (
                                    <div className="flex items-center gap-1.5 font-bold text-emerald-600 pt-1">
                                      <Clock className="w-3.5 h-3.5" />
                                      {Math.floor(workedMinutes / 60)}h {Math.round(workedMinutes % 60)}m worked
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="flex items-center gap-1.5 text-amber-600 font-bold">
                                  <Clock className="w-3.5 h-3.5 animate-pulse" />
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
                  )
                )}

                {/* FULL ORGANIZATION TENURE LOG HISTORY VIEW */}
                {viewMode === "history" && (
                  <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b p-3.5 sm:p-4">
                      <CardTitle className="text-xs sm:text-sm font-black text-slate-800">
                        Tenure Logs ({format(parseISO(historyFromDate), "dd MMM yyyy")} to {format(parseISO(historyToDate), "dd MMM yyyy")})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {historyLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                      ) : fullHistoryLogs?.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs italic">
                          No attendance entries found for the selected date range.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto">
                          {fullHistoryLogs?.map((log: any) => (
                            <div key={log.id} className="p-3 sm:p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50">
                              <div className="flex items-center gap-2.5 sm:gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0",
                                  log.type === "check_in" ? "bg-emerald-100 text-emerald-700" :
                                  log.type === "emergency_leave" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"
                                )}>
                                  {log.type === "check_in" ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 capitalize">{log.type.replace(/_/g, " ")}</p>
                                  <p className="text-[10px] text-muted-foreground">{format(parseISO(log.created_at), "EEEE, dd MMM yyyy")}</p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold text-slate-800">{format(parseISO(log.created_at), "hh:mm:ss a")}</p>
                                <span className="text-[9px] font-black uppercase text-slate-400">
                                  {log.is_within_geofence ? "Geofenced" : "Remote"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* TAB 2: LEAVE BALANCES & RULES */}
              <TabsContent value="leave-balances" className="mt-3 sm:mt-4 space-y-4">
                <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden p-4 sm:p-5 space-y-4 sm:space-y-5">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm sm:text-base">My Annual Leave Allocations</h3>
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                      Standard Rules: Casual (12 days/yr - 1/mo), Sick (4 days/yr - 1/3mo), Paid (0 default), Emergency (0 default).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {/* Casual Leave */}
                    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 sm:p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs uppercase tracking-wider text-blue-700">Casual Leave</span>
                        <Badge className="bg-blue-100 text-blue-800 border-none font-bold text-[10px]">1 / Month Default</Badge>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <p className="text-xl sm:text-2xl font-black text-blue-900">{available.casual} <span className="text-xs font-bold text-blue-600">avail</span></p>
                        <p className="text-xs text-blue-700 font-bold">{used.casual} / {quota.casual_leave} used</p>
                      </div>
                      <Progress value={Math.min(100, (used.casual / (quota.casual_leave || 1)) * 100)} className="h-2 bg-blue-200/50" />
                    </div>

                    {/* Sick Leave */}
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3.5 sm:p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs uppercase tracking-wider text-emerald-700">Sick Leave</span>
                        <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px]">1 / 3 Months Default</Badge>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <p className="text-xl sm:text-2xl font-black text-emerald-900">{available.sick} <span className="text-xs font-bold text-emerald-600">avail</span></p>
                        <p className="text-xs text-emerald-700 font-bold">{used.sick} / {quota.sick_leave} used</p>
                      </div>
                      <Progress value={Math.min(100, (used.sick / (quota.sick_leave || 1)) * 100)} className="h-2 bg-emerald-200/50" />
                    </div>

                    {/* Paid Leave */}
                    <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3.5 sm:p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs uppercase tracking-wider text-purple-700">Paid / Annual Leave</span>
                        <Badge className="bg-purple-100 text-purple-800 border-none font-bold text-[10px]">HR Allocation</Badge>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <p className="text-xl sm:text-2xl font-black text-purple-900">{available.paid} <span className="text-xs font-bold text-purple-600">avail</span></p>
                        <p className="text-xs text-purple-700 font-bold">{used.paid} / {quota.paid_leave} used</p>
                      </div>
                      <Progress value={Math.min(100, (used.paid / (quota.paid_leave || 1)) * 100)} className="h-2 bg-purple-200/50" />
                    </div>

                    {/* Emergency Leave */}
                    <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5 sm:p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-xs uppercase tracking-wider text-amber-700">Emergency Leave</span>
                        <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[10px]">HR Allocation</Badge>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <p className="text-xl sm:text-2xl font-black text-amber-900">{available.emergency} <span className="text-xs font-bold text-amber-600">avail</span></p>
                        <p className="text-xs text-amber-700 font-bold">{used.emergency} / {quota.emergency_leave} used</p>
                      </div>
                      <Progress value={Math.min(100, (used.emergency / (quota.emergency_leave || 1)) * 100)} className="h-2 bg-amber-200/50" />
                    </div>
                  </div>

                  {/* Loss of Pay Rule Banner */}
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 sm:p-4 flex items-start gap-3 text-xs text-rose-900">
                    <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-black text-rose-800 uppercase tracking-wider text-xs">Loss of Pay (LOP) Regulation</p>
                      <p className="mt-1 leading-relaxed text-rose-700 font-medium">
                        If you submit time-off requests that exceed your available leave balance for any category, the additional days taken will be calculated and reported as <b>Loss of Pay (LOP)</b>.
                      </p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* TAB 3: LEAVE REQUESTS */}
              <TabsContent value="leaves" className="mt-3 sm:mt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs sm:text-sm font-bold text-muted-foreground">{myLeaves?.length || 0} total requests</p>
                  <Button size="sm" variant="outline" onClick={() => setTimeOffOpen(true)} className="gap-2 rounded-xl font-bold text-xs">
                    <Plus className="w-3 h-3" /> New Request
                  </Button>
                </div>

                {leavesLoading ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : myLeaves?.length === 0 ? (
                  <div className="text-center p-10 rounded-2xl border border-dashed bg-white">
                    <CalendarIcon className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                    <p className="font-bold text-slate-500 text-sm">No leave requests yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Submit your first time-off request above</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myLeaves?.map((leave: any) => (
                      <div key={leave.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 sm:p-4 rounded-2xl border bg-white hover:shadow-md transition-all">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-slate-900 capitalize text-xs sm:text-sm">{leave.leave_type?.replace(/_/g, " ")}</p>
                            {leaveStatusBadge(leave.status)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(leave.start_date), "dd MMM yyyy")}
                            {leave.end_date !== leave.start_date ? ` – ${format(parseISO(leave.end_date), "dd MMM yyyy")}` : ""}
                          </p>
                          {leave.reason && <p className="text-xs text-slate-500 italic mt-1 truncate">"{leave.reason}"</p>}
                        </div>
                        <p className="text-[10px] text-muted-foreground whitespace-nowrap self-end sm:self-center">
                          {format(parseISO(leave.created_at), "dd MMM")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* TAB 4: EMERGENCY HISTORY */}
              <TabsContent value="emergency" className="mt-3 sm:mt-4 space-y-3">
                {!myEmergencies || myEmergencies.length === 0 ? (
                  <div className="text-center p-10 rounded-2xl border border-dashed bg-white">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-200 mb-3" />
                    <p className="font-bold text-slate-500 text-sm">No emergency alerts</p>
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
          </div>

          {/* Right Column: Notice Board Widget */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border border-slate-100 shadow-md rounded-[28px] overflow-hidden bg-white">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4 sm:p-5 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xs sm:text-sm font-black text-slate-900 tracking-tight uppercase leading-none">Notice Board</CardTitle>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global Announcements</p>
                  </div>
                </div>
                {isHrOrAdmin && (
                  <Button
                    size="sm"
                    onClick={() => setPostNoticeOpen(true)}
                    className="h-8 text-[10px] font-black rounded-lg gap-1 px-2.5 bg-primary text-white hover:bg-primary/90"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Post Notice
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3.5">
                {globalLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary/30" /></div>
                ) : globalAnnouncements.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 italic text-xs">
                    No active global announcements.
                  </div>
                ) : (
                  globalAnnouncements.map((ann: any) => (
                    <div key={ann.id} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-1.5 relative group">
                      <div className="flex justify-between items-start">
                        <Badge className={cn(
                          "border-none text-[8px] font-black uppercase px-1.5 py-0.5",
                          ann.priority === 'high' ? "bg-rose-500/10 text-rose-600" : "bg-primary/10 text-primary"
                        )}>
                          {ann.priority === 'high' ? 'Urgent' : 'Notice'}
                        </Badge>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] text-slate-400 font-bold lowercase italic">
                            {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                          </span>
                          {isHrOrAdmin && (
                            <button
                              onClick={() => handleDeleteNotice(ann.id)}
                              className="text-slate-300 hover:text-rose-500 transition-colors p-0.5"
                              title="Delete Notice"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight">{ann.title}</h4>
                      <p className="text-[11px] font-medium text-slate-600 leading-relaxed italic">"{ann.content}"</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <TimeOffRequestModal
          open={timeOffOpen}
          onOpenChange={setTimeOffOpen}
          onSuccess={() => {
            refetchLeaves();
            refetchLeaveBalances();
          }}
        />

        <PostNoticeModal
          open={postNoticeOpen}
          onOpenChange={setPostNoticeOpen}
          onSuccess={() => {
            refetchAnnouncements();
          }}
        />
      </div>
    </DashboardLayout>
  );
}
