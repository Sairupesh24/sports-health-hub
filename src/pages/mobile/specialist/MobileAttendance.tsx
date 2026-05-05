import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MobileSpecialistLayout from "@/components/layout/MobileSpecialistLayout";
import { 
  MapPin, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  ChevronRight,
  Loader2,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  History,
  TrendingUp,
  FileText,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { haptic } from "@/utils/haptic";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import AttendanceMarker from "@/components/attendance/AttendanceMarker";
import EmergencyLeaveModal from "@/components/shared/EmergencyLeaveModal";
import { format, startOfMonth, endOfDay, differenceInMinutes, parseISO, isSameDay } from "date-fns";

import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export default function MobileAttendance() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [date, setDate] = useState<any>({
    from: startOfMonth(new Date()),
    to: endOfDay(new Date()),
  });

  // Fetch today's attendance log for the specialist status
  const { data: currentStatusLog } = useQuery({
    queryKey: ["mobile-attendance-status", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await (supabase as any)
        .from('hr_attendance_logs')
        .select('*')
        .eq('profile_id', user.id)
        .gte('created_at', `${today}T00:00:00Z`)
        .order('created_at', { ascending: false });
      
      if (error) return null;
      return data?.find((l: any) => l.type === 'check_in' || l.type === 'check_out' || l.type === 'emergency_leave') || null;
    },
    enabled: !!user
  });

  // Fetch logs for history
  const { data: logs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["mobile-attendance-logs-history", user?.id, date?.from, date?.to],
    queryFn: async () => {
      if (!user || !date?.from) return [];
      const { data, error } = await (supabase as any)
        .from('hr_attendance_logs')
        .select('*')
        .eq('profile_id', user.id)
        .gte('created_at', date.from.toISOString())
        .lte('created_at', (date.to || endOfDay(date.from)).toISOString())
        .order('created_at', { ascending: false });
      
      if (error) return [];
      return data || [];
    },
    enabled: !!user && !!date?.from
  });

  const isCheckedIn = currentStatusLog?.type === 'check_in';

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
      // Sort logs for the day by time
      const dayLogs = [...group.logs].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      let lastCheckIn: Date | null = null;
      dayLogs.forEach((log) => {
        if (log.type === 'check_in') {
          lastCheckIn = new Date(log.created_at);
        } else if (log.type === 'check_out' && lastCheckIn) {
          const duration = differenceInMinutes(new Date(log.created_at), lastCheckIn);
          // Only count durations > 0 to avoid "dummy" or instant test logs
          if (duration > 0) {
            group.totalMinutes += duration;
          }
          lastCheckIn = null;
        }
      });
    });

    // Final filter: Remove groups with 0 total minutes unless they have a single active check-in for TODAY
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
    return {
      hours: Math.floor(totalMinutes / 60),
      minutes: totalMinutes % 60,
      days: processedLogs.length
    };
  }, [processedLogs]);

  return (
    <MobileSpecialistLayout title="Attendance">
      <div className="space-y-6 pb-32">
        
        {/* Functional Attendance Marker */}
        <section className="space-y-3">
           <AttendanceMarker />
        </section>

        {/* Month Summary Card */}
        <section className="grid grid-cols-2 gap-4">
           <Card className="bg-slate-900 border-none rounded-3xl overflow-hidden relative group shadow-xl">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full -mr-10 -mt-10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
              <CardContent className="p-5 space-y-2 relative z-10">
                 <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                    <TrendingUp className="w-4 h-4" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Hours</p>
                    <h4 className="text-xl font-black text-white italic tracking-tighter">
                       {summary.hours}h {summary.minutes}m
                    </h4>
                 </div>
              </CardContent>
           </Card>
           <Card className="bg-white dark:bg-slate-900 border border-border/50 rounded-3xl overflow-hidden shadow-sm">
              <CardContent className="p-5 space-y-2">
                 <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <History className="w-4 h-4" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Work Days</p>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white italic tracking-tighter">
                       {summary.days} Days
                    </h4>
                 </div>
              </CardContent>
           </Card>
        </section>

        {/* Detailed Logs Section */}
        <section className="space-y-4">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                 <FileText className="w-4 h-4" /> Professional History
              </h3>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn(
                      "h-10 w-10 rounded-xl transition-all active:scale-95",
                      date?.from ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-100 text-slate-500"
                    )}>
                       <CalendarIcon className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-3xl overflow-hidden border-none shadow-2xl" align="end">
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

           <div className="space-y-4">
              {isLoadingLogs ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                   <Loader2 className="w-8 h-8 animate-spin text-primary" />
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Retrieving Secure Logs...</p>
                </div>
              ) : processedLogs.length === 0 ? (
                <div className="bg-slate-50 dark:bg-slate-900/30 border-2 border-dashed border-border/50 rounded-[2rem] p-12 text-center">
                   <XCircle className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                   <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">No logs found</h4>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">For the selected period</p>
                </div>
              ) : (
                processedLogs.map((group) => (
                  <Card key={group.date} className="bg-white dark:bg-slate-900 border border-border/50 rounded-[2rem] overflow-hidden shadow-sm">
                    <CardContent className="p-0">
                      <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-3 border-b border-border/50 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-primary font-black text-[10px]">
                               {format(parseISO(group.date), 'dd')}
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-white">
                               {format(parseISO(group.date), 'EEEE, MMM yyyy')}
                            </span>
                         </div>
                         <div className="text-right">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md">
                               {Math.floor(group.totalMinutes / 60)}h {group.totalMinutes % 60}m
                            </span>
                         </div>
                      </div>
                      <div className="p-4 space-y-3">
                         {group.logs.map((log: any, idx: number) => (
                           <div key={log.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                 <div className={cn(
                                   "w-2 h-2 rounded-full",
                                   log.type === 'check_in' ? "bg-emerald-500" : "bg-rose-500"
                                 )} />
                                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-16">
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
        <section className="pt-4">
           <button 
             onClick={() => { haptic.warning(); setIsEmergencyModalOpen(true); }}
             className="w-full bg-rose-500/10 border border-rose-500/20 p-5 rounded-3xl flex items-center justify-between active:scale-95 transition-all group"
           >
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20">
                    <AlertCircle className="w-5 h-5" />
                 </div>
                 <div className="text-left">
                    <h4 className="font-black text-rose-600 uppercase tracking-tighter text-sm">Emergency Leave</h4>
                    <p className="text-[8px] font-bold text-rose-500/60 leading-none">Instant Manager Notification</p>
                 </div>
              </div>
              <ChevronRight className="w-5 h-5 text-rose-300" />
           </button>
        </section>
      </div>

      <EmergencyLeaveModal 
        open={isEmergencyModalOpen}
        onOpenChange={setIsEmergencyModalOpen}
      />
    </MobileSpecialistLayout>
  );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={cn("px-2 py-1 rounded-lg text-xs font-bold", className)}>
      {children}
    </span>
  );
}
