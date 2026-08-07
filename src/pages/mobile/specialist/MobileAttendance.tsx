import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import MobileSpecialistLayout from "@/components/layout/MobileSpecialistLayout";
import MobileConsultantLayout from "@/components/layout/MobileConsultantLayout";
import { useLocation } from "react-router-dom";
import { 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  ShieldAlert,
  ChevronRight,
  Loader2,
  Calendar as CalendarIcon,
  XCircle,
  History,
  TrendingUp,
  FileText,
  Plus,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { haptic } from "@/utils/haptic";
import { useToast } from "@/hooks/use-toast";
import AttendanceMarker from "@/components/attendance/AttendanceMarker";
import TimeOffRequestModal from "@/components/shared/TimeOffRequestModal";
import EmergencyLeaveModal from "@/components/shared/EmergencyLeaveModal";
import { format, startOfMonth, endOfDay, differenceInMinutes, parseISO, startOfWeek, endOfWeek } from "date-fns";

import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function MobileAttendance() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const Layout = location.pathname.startsWith("/mobile/consultant") ? MobileConsultantLayout : MobileSpecialistLayout;

  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [timeOffOpen, setTimeOffOpen] = useState(false);
  const [date, setDate] = useState<any>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });

  // Fetch today's attendance log
  const { data: currentStatusLogs } = useQuery({
    queryKey: ["mobile-attendance-status", user?.id],
    queryFn: async () => {
      const response = await apiFetch<any[]>("/hr/attendance/today");
      return response.data || [];
    },
    enabled: !!user
  });

  // Fetch logs for history
  const { data: logs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["mobile-attendance-logs-history", user?.id, date?.from, date?.to],
    queryFn: async () => {
      if (!user || !date?.from) return [];
      return await apiFetch<any[]>(`/hr/attendance/history?from=${date.from.toISOString()}&to=${(date.to || endOfDay(date.from)).toISOString()}`);
    },
    enabled: !!user && !!date?.from
  });

  // Fetch leave balance data
  const { data: leaveBalanceData, refetch: refetchLeaveBalances } = useQuery({
    queryKey: ["mobile-leave-balances", user?.id],
    queryFn: async () => {
      const res = await apiFetch<any>('/hr/leave-balances');
      return res.data || null;
    },
    enabled: !!user
  });

  // Process logs for daily grouping and hour calculation
  const processedLogs = useMemo(() => {
    if (!logs) return [];
    
    const groups: Record<string, any> = {};
    
    logs.forEach((log: any) => {
      const dateKey = format(parseISO(log.created_at), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = { date: dateKey, logs: [], totalMinutes: 0 };
      }
      groups[dateKey].logs.push(log);
    });

    Object.values(groups).forEach((group: any) => {
      const dayLogs = [...group.logs].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      let lastCheckIn: Date | null = null;
      dayLogs.forEach((log) => {
        if (log.type === 'check_in') {
          lastCheckIn = new Date(log.created_at);
        } else if ((log.type === 'check_out' || log.type === 'emergency_leave') && lastCheckIn) {
          const duration = differenceInMinutes(new Date(log.created_at), lastCheckIn);
          if (duration > 0) {
            group.totalMinutes += duration;
          }
          lastCheckIn = null;
        }
      });
    });

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return Object.values(groups)
      .filter((g: any) => g.totalMinutes > 0 || g.date === todayStr)
      .sort((a: any, b: any) => b.date.localeCompare(a.date));
  }, [logs]);

  // Summary calculation
  const summary = useMemo(() => {
    let totalMinutes = 0;
    processedLogs.forEach((group: any) => {
      totalMinutes += group.totalMinutes;
    });
    const days = processedLogs.length;
    const avgMins = days > 0 ? totalMinutes / days : 0;
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      days,
      avgHoursPerDay: (avgMins / 60).toFixed(1)
    };
  }, [processedLogs]);

  const available = leaveBalanceData?.available || { casual: 12, sick: 4, paid: 0, emergency: 0 };
  const used = leaveBalanceData?.used || { casual: 0, sick: 0, paid: 0, emergency: 0, lop: 0 };
  const totalAvailLeaves = available.casual + available.sick + available.paid + available.emergency;

  return (
    <Layout title="Attendance">
      <div className="space-y-5 pb-32 px-1">
        
        {/* Header Action Row */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Attendance & Logs</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(), "dd MMMM yyyy")}</p>
          </div>
          <Button
            size="sm"
            onClick={() => { haptic.light(); setTimeOffOpen(true); }}
            className="rounded-xl font-bold gap-1.5 bg-primary text-xs shadow-md"
          >
            <Plus className="w-3.5 h-3.5" /> Request Leave
          </Button>
        </div>

        {/* Functional Attendance Marker */}
        <section className="space-y-3">
           <AttendanceMarker />
        </section>

        {/* Analytics & Balance Grid Cards */}
        <section className="grid grid-cols-2 gap-3">
           <Card className="bg-slate-900 border-none rounded-3xl overflow-hidden relative group shadow-xl">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <CardContent className="p-4 space-y-2 relative z-10">
                 <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <TrendingUp className="w-4 h-4" />
                 </div>
                 <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Hours</p>
                    <h4 className="text-lg font-black text-white italic tracking-tight">
                       {summary.hours}h {summary.minutes}m
                    </h4>
                    <p className="text-[9px] text-primary font-bold">{summary.avgHoursPerDay} h/day avg</p>
                 </div>
              </CardContent>
           </Card>

           <Card className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-border/50 rounded-3xl overflow-hidden shadow-sm">
              <CardContent className="p-4 space-y-2">
                 <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Award className="w-4 h-4" />
                 </div>
                 <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Avail Leaves</p>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white italic tracking-tight">
                       {totalAvailLeaves} Days
                    </h4>
                    <p className="text-[9px] text-blue-600 font-bold">Casual: {available.casual} | Sick: {available.sick}</p>
                 </div>
              </CardContent>
           </Card>
        </section>

        {/* Loss of Pay Warning Card (If any LOP) */}
        {used.lop > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-rose-900">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
              <div>
                <p className="font-black text-rose-800 uppercase tracking-wider text-[10px]">Loss of Pay (LOP) Days</p>
                <p className="text-rose-700 font-bold text-xs">{used.lop} day(s) calculated as LOP</p>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Logs Section */}
        <section className="space-y-3">
           <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                 <FileText className="w-3.5 h-3.5" /> Attendance History
              </h3>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn(
                      "h-9 w-9 rounded-xl transition-all active:scale-95",
                      date?.from ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-slate-100 text-slate-500"
                    )}>
                       <CalendarIcon className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden border border-slate-200 shadow-2xl z-[9999]" align="end" side="bottom" sideOffset={6} collisionPadding={16}>
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={date?.from}
                      selected={date}
                      onSelect={setDate}
                      numberOfMonths={1}
                      className="bg-white dark:bg-slate-900"
                    />
                  </PopoverContent>
                </Popover>
              </div>
           </div>

           <div className="space-y-3">
              {isLoadingLogs ? (
                <div className="flex flex-col items-center justify-center py-10 space-y-3">
                   <Loader2 className="w-7 h-7 animate-spin text-primary" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading History Logs...</p>
                </div>
              ) : processedLogs.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 rounded-3xl p-8 text-center">
                   <XCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                   <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-tight">No logs found</h4>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">For the selected period</p>
                </div>
              ) : (
                processedLogs.map((group) => (
                  <Card key={group.date} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-border/50 rounded-2xl overflow-hidden shadow-sm">
                    <CardContent className="p-0">
                      <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                         <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-primary font-black text-[10px]">
                               {format(parseISO(group.date), 'dd')}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 dark:text-white">
                               {format(parseISO(group.date), 'EEEE, MMM yyyy')}
                            </span>
                         </div>
                         <div className="text-right">
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md">
                               {Math.floor(group.totalMinutes / 60)}h {group.totalMinutes % 60}m
                            </span>
                         </div>
                      </div>
                      <div className="p-3.5 space-y-2.5">
                         {group.logs.map((log: any) => (
                           <div key={log.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                 <div className={cn(
                                   "w-2 h-2 rounded-full",
                                   log.type === 'check_in' ? "bg-emerald-500" : "bg-rose-500"
                                 )} />
                                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-12">
                                    {log.type === 'check_in' ? "IN" : "OUT"}
                                 </span>
                                 <span className="text-xs font-black text-slate-900 dark:text-white italic">
                                    {format(parseISO(log.created_at), 'hh:mm a')}
                                 </span>
                              </div>
                              <div className="flex items-center gap-2">
                                 {log.is_within_geofence ? (
                                   <div className="flex items-center gap-1 text-emerald-500">
                                      <ShieldCheck className="w-3 h-3" />
                                      <span className="text-[8px] font-black uppercase tracking-widest">Verified</span>
                                   </div>
                                 ) : (
                                   <div className="flex items-center gap-1 text-amber-500">
                                      <ShieldAlert className="w-3 h-3" />
                                      <span className="text-[8px] font-black uppercase tracking-widest italic">Outside</span>
                                   </div>
                                 )}
                              </div>
                           </div>
                         ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
           </div>
        </section>

        {/* Emergency Action */}
        <section className="pt-2">
           <button 
             onClick={() => { haptic.warning(); setIsEmergencyModalOpen(true); }}
             className="w-full bg-rose-500/10 border border-rose-500/20 p-4 rounded-3xl flex items-center justify-between active:scale-95 transition-all group"
           >
              <div className="flex items-center gap-3">
                 <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                    <AlertCircle className="w-4 h-4" />
                 </div>
                 <div className="text-left">
                    <h4 className="font-black text-rose-600 uppercase tracking-tighter text-xs">Emergency Leave</h4>
                    <p className="text-[8px] font-bold text-rose-500/60 leading-none">Instant Manager Alert</p>
                 </div>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-300" />
           </button>
        </section>
      </div>

      <EmergencyLeaveModal 
        open={isEmergencyModalOpen}
        onOpenChange={setIsEmergencyModalOpen}
      />

      <TimeOffRequestModal
        open={timeOffOpen}
        onOpenChange={setTimeOffOpen}
        onSuccess={() => refetchLeaveBalances()}
      />
    </Layout>
  );
}
