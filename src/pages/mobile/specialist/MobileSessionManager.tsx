import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import MobileSpecialistLayout from "@/components/layout/MobileSpecialistLayout";
import { 
  Calendar, 
  Clock, 
  Play, 
  Square, 
  Plus, 
  ChevronLeft,
  ChevronRight,
  User,
  History,
  ClipboardList,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { haptic } from "@/utils/haptic";
import { useToast } from "@/hooks/use-toast";
import { 
  format, 
  parseISO, 
  startOfDay, 
  endOfDay, 
  addDays, 
  subDays, 
  isSameDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths
} from "date-fns";
import { SportsScientistBookSessionModal } from "@/components/sports-scientist/SportsScientistBookSessionModal";
import { SportsScientistSessionStatusModal } from "@/components/sports-scientist/SportsScientistSessionStatusModal";

export default function MobileSessionManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');

  // Helper to map session modes to custom styling objects
  const getSessionModeStyle = (mode: string) => {
    switch (mode) {
      case 'Group':
        return {
          bg: 'bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-200/50 dark:border-indigo-800/30',
          text: 'text-indigo-700 dark:text-indigo-300',
          badgeBg: 'bg-indigo-500 text-white',
          label: 'Group',
          dot: 'bg-indigo-500',
          iconBg: 'bg-indigo-500/10 text-indigo-500'
        };
      case 'Other':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-200/50 dark:border-amber-800/30',
          text: 'text-amber-700 dark:text-amber-300',
          badgeBg: 'bg-amber-500 text-white',
          label: 'Other',
          dot: 'bg-amber-500',
          iconBg: 'bg-amber-500/10 text-amber-500'
        };
      case 'Individual':
      default:
        return {
          bg: 'bg-blue-500/10 dark:bg-blue-500/20 border-blue-200/50 dark:border-blue-800/30',
          text: 'text-blue-700 dark:text-blue-300',
          badgeBg: 'bg-blue-500 text-white',
          label: 'Individual',
          dot: 'bg-blue-500',
          iconBg: 'bg-blue-500/10 text-blue-500'
        };
    }
  };

  // Generate a range of dates for the horizontal timeline (e.g., 3 days before and 10 days after)
  const timelineDates = useMemo(() => {
    const dates = [];
    for (let i = -3; i <= 10; i++) {
      dates.push(addDays(new Date(), i));
    }
    return dates;
  }, []);

  // Compute start/end date range depending on the current view mode
  const dateRange = useMemo(() => {
    if (viewMode === 'day') {
      return {
        start: startOfDay(selectedDate),
        end: endOfDay(selectedDate)
      };
    } else if (viewMode === 'week') {
      return {
        start: startOfDay(startOfWeek(selectedDate, { weekStartsOn: 1 })),
        end: endOfDay(endOfWeek(selectedDate, { weekStartsOn: 1 }))
      };
    } else { // 'month'
      return {
        start: startOfDay(startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 0 })),
        end: endOfDay(endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 0 }))
      };
    }
  }, [viewMode, selectedDate]);

  // Generate days for Month View calendar grid (Sun-Sat)
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  // Fetch sessions for the resolved date range
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["mobile-sessions", user?.id, viewMode, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: async () => {
      if (!user) return [];
      return await apiFetch<any[]>(`/appointments?scientist_id=${user.id}&start=${dateRange.start.toISOString()}&end=${dateRange.end.toISOString()}`);
    },
    enabled: !!user
  });

  const handleStartSession = async (session: any) => {
    haptic.success();
    try {
      await apiFetch(`/appointments/${session.id}`, {
        method: "PATCH",
        body: { 
          status: "In Progress",
          actual_start: new Date().toISOString()
        }
      });
      queryClient.invalidateQueries({ queryKey: ["mobile-sessions"] });
      toast({ title: "Session Started" });
    } catch (error) {
      toast({ title: "Failed to start session", variant: "destructive" });
    }
  };

  return (
    <MobileSpecialistLayout title="Session Manager">
      <div className="space-y-8 pb-20">
        
        {/* Header Actions */}
        <div className="flex items-center justify-between">
           <div>
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Scheduled for</h3>
              <h4 className="text-lg font-black text-slate-900 dark:text-white italic tracking-tight mt-0.5">
                 {format(selectedDate, "MMMM yyyy")}
              </h4>
           </div>
           <Button 
            onClick={() => { haptic.light(); setIsBookModalOpen(true); }}
            className="rounded-full bg-primary text-white h-10 px-6 font-black italic shadow-lg shadow-primary/20 active:scale-95 transition-all"
           >
              <Plus className="w-4 h-4 mr-2" /> Plan Session
           </Button>
        </div>

        {/* View Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-[24px] w-full border border-slate-200/30 dark:border-white/5 shadow-sm">
          <button
            onClick={() => { haptic.light(); setViewMode('day'); }}
            className={cn(
              "flex-1 py-2 text-center text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-200",
              viewMode === 'day' 
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            )}
          >
            Day
          </button>
          <button
            onClick={() => { haptic.light(); setViewMode('week'); }}
            className={cn(
              "flex-1 py-2 text-center text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-200",
              viewMode === 'week' 
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            )}
          >
            Week
          </button>
          <button
            onClick={() => { haptic.light(); setViewMode('month'); }}
            className={cn(
              "flex-1 py-2 text-center text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all duration-200",
              viewMode === 'month' 
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            )}
          >
            Month
          </button>
        </div>

        {/* Day View Timeline Picker (only shown in Day View) */}
        {viewMode === 'day' && (
          <section className="overflow-x-auto no-scrollbar -mx-6 px-6">
             <div className="flex items-center gap-3 pb-2">
                {timelineDates.map((date) => (
                  <button
                    key={date.toISOString()}
                    onClick={() => { haptic.light(); setSelectedDate(date); }}
                    className={cn(
                      "flex flex-col items-center justify-center min-w-[56px] h-20 rounded-3xl transition-all duration-300",
                      isSameDay(date, selectedDate)
                        ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20 scale-105"
                        : "bg-white dark:bg-slate-900 border border-border/50 text-slate-500"
                    )}
                  >
                    <span className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">
                      {format(date, "EEE")}
                    </span>
                    <span className="text-lg font-black italic">
                      {format(date, "dd")}
                    </span>
                    {isSameDay(date, new Date()) && !isSameDay(date, selectedDate) && (
                      <div className="w-1 h-1 rounded-full bg-primary mt-1" />
                    )}
                  </button>
                ))}
             </div>
          </section>
        )}

        {/* Day View Sessions List */}
        {viewMode === 'day' && (
          <div className="space-y-4">
             {isLoading ? (
               <div className="space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] animate-pulse" />)}
               </div>
             ) : sessions?.length === 0 ? (
               <div className="py-12 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300 mb-4">
                     <Calendar className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">No sessions planned for today</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Tap 'Plan Session' to get started</p>
               </div>
             ) : (
               sessions?.map((session: any) => {
                 const modeStyle = getSessionModeStyle(session.session_mode);
                 return (
                   <Card 
                    key={session.id}
                    className={cn(
                      "bg-white dark:bg-slate-900 border-border/50 shadow-sm rounded-[2.5rem] overflow-hidden transition-all active:scale-[0.98]",
                      session.status === "In Progress" && "border-emerald-500/50 shadow-lg shadow-emerald-500/5"
                    )}
                   >
                      <CardContent className="p-6">
                         <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                                  <Clock className="w-5 h-5 text-slate-400" />
                               </div>
                               <div>
                                  <div className="flex items-center gap-2">
                                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                       {format(parseISO(session.scheduled_start), "hh:mm a")}
                                     </p>
                                     <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border leading-none", modeStyle.bg, modeStyle.text)}>
                                       {modeStyle.label}
                                     </span>
                                  </div>
                                  <h4 className="font-black text-slate-900 dark:text-white italic mt-0.5">
                                    {session.session_type?.name || "Standard Session"}
                                  </h4>
                               </div>
                            </div>
                            <Badge className={cn(
                              "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border-none",
                              session.status === "Scheduled" ? "bg-blue-500 text-white" :
                              session.status === "In Progress" ? "bg-emerald-500 text-white animate-pulse" :
                              "bg-slate-200 text-slate-500"
                            )}>
                              {session.status}
                            </Badge>
                         </div>
    
                         <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                                  <User className="w-5 h-5 text-primary" />
                               </div>
                               <div>
                                  <p className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60">Athlete</p>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {session.client?.first_name} {session.client?.last_name}
                                  </p>
                               </div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-200/50 dark:bg-slate-700/50 px-2 py-1 rounded">
                              {session.client?.uhid}
                            </span>
                         </div>
    
                         <div className="flex gap-3">
                            {session.status === "Scheduled" && (
                              <button 
                                onClick={() => handleStartSession(session)}
                                className="flex-1 bg-emerald-500 text-white h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                              >
                                 <Play className="w-4 h-4 fill-current" /> Start Session
                              </button>
                            )}
                            {session.status === "In Progress" && (
                              <button 
                                onClick={() => { haptic.warning(); setSelectedSession(session); }}
                                className="flex-1 bg-rose-500 text-white h-12 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                              >
                                 <Square className="w-4 h-4 fill-current" /> End Session
                              </button>
                            )}
                            <button 
                              onClick={() => { haptic.light(); setSelectedSession(session); }}
                              className="w-12 h-12 rounded-2xl border border-border/50 flex items-center justify-center text-slate-400 active:scale-95 transition-all"
                            >
                               <ClipboardList className="w-5 h-5" />
                            </button>
                         </div>
                      </CardContent>
                   </Card>
                 );
               })
             )}
          </div>
        )}

        {/* Week View Calendar Layout */}
        {viewMode === 'week' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Week Navigation Header */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  haptic.light();
                  setSelectedDate(subDays(selectedDate, 7));
                }}
                className="rounded-xl"
              >
                <ChevronLeft className="w-5 h-5 text-slate-500" />
              </Button>
              <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), "MMM dd")} - {format(endOfWeek(selectedDate, { weekStartsOn: 1 }), "MMM dd, yyyy")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  haptic.light();
                  setSelectedDate(addDays(selectedDate, 7));
                }}
                className="rounded-xl"
              >
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </Button>
            </div>

            {/* Week Days list */}
            <div className="space-y-4">
              {eachDayOfInterval({
                start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
                end: endOfWeek(selectedDate, { weekStartsOn: 1 })
              }).map((day) => {
                const daySessions = sessions?.filter(s => isSameDay(new Date(s.scheduled_start), day)) || [];
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div key={day.toISOString()} className="space-y-2">
                    <div className="flex items-center gap-3 px-2">
                      <span className={cn(
                        "text-xs font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                        isToday 
                          ? "bg-primary/10 text-primary border border-primary/20" 
                          : "text-slate-500 dark:text-slate-400"
                      )}>
                        {format(day, "EEEE, MMM dd")}
                      </span>
                      <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                      <span className="text-[10px] font-black text-slate-400">
                        {daySessions.length} {daySessions.length === 1 ? 'Session' : 'Sessions'}
                      </span>
                    </div>

                    {daySessions.length === 0 ? (
                      <div className="py-4 px-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-100 dark:border-slate-800/50 text-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                        No sessions planned
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {daySessions.map((session: any) => {
                          const modeStyle = getSessionModeStyle(session.session_mode);
                          return (
                            <Card
                              key={session.id}
                              onClick={() => { haptic.light(); setSelectedSession(session); }}
                              className="bg-white dark:bg-slate-900 border-border/50 shadow-sm rounded-3xl overflow-hidden hover:border-primary/20 transition-all active:scale-[0.99] cursor-pointer"
                            >
                              <CardContent className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", modeStyle.iconBg)}>
                                    <Clock className="w-5 h-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                        {format(parseISO(session.scheduled_start), "hh:mm a")}
                                      </span>
                                      <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border leading-none", modeStyle.bg, modeStyle.text)}>
                                        {modeStyle.label}
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate mt-0.5">
                                      {session.client ? `${session.client.first_name} ${session.client.last_name}` : "No Athlete"}
                                    </h4>
                                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate leading-none">
                                      {session.session_type?.name || "Standard Session"} {session.session_mode === 'Group' && session.group_name ? `• ${session.group_name}` : ''}
                                    </p>
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-300" />
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Month View Layout */}
        {viewMode === 'month' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Month Navigation */}
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  haptic.light();
                  setSelectedDate(subMonths(selectedDate, 1));
                }}
                className="rounded-xl"
              >
                <ChevronLeft className="w-5 h-5 text-slate-500" />
              </Button>
              <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                {format(selectedDate, "MMMM yyyy")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  haptic.light();
                  setSelectedDate(addMonths(selectedDate, 1));
                }}
                className="rounded-xl"
              >
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </Button>
            </div>

            {/* Interactive Month Calendar Grid */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              {/* Day Labels */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((label) => (
                  <span key={label} className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {label}
                  </span>
                ))}
              </div>

              {/* Days Numbers */}
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day) => {
                  const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  
                  const daySessions = sessions?.filter(s => isSameDay(new Date(s.scheduled_start), day)) || [];
                  const hasIndividual = daySessions.some(s => s.session_mode === 'Individual' || !s.session_mode);
                  const hasGroup = daySessions.some(s => s.session_mode === 'Group');
                  const hasOther = daySessions.some(s => s.session_mode === 'Other');

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => {
                        haptic.light();
                        setSelectedDate(day);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-between py-2 rounded-2xl transition-all aspect-square relative",
                        isSelected 
                          ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-slate-900" 
                          : isToday
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : isCurrentMonth
                          ? "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                          : "text-slate-300 dark:text-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                      )}
                    >
                      <span className="text-[11px] font-black leading-none">
                        {format(day, "d")}
                      </span>
                      
                      {/* Color dots indicating scheduled session modes */}
                      <div className="flex gap-0.5 mt-1 h-1 justify-center w-full">
                        {hasIndividual && (
                          <span className={cn("w-1 h-1 rounded-full shrink-0", isSelected ? "bg-white" : "bg-blue-500")} />
                        )}
                        {hasGroup && (
                          <span className={cn("w-1 h-1 rounded-full shrink-0", isSelected ? "bg-white" : "bg-indigo-500")} />
                        )}
                        {hasOther && (
                          <span className={cn("w-1 h-1 rounded-full shrink-0", isSelected ? "bg-white" : "bg-amber-500")} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Agenda List for selected month date */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Agenda: {format(selectedDate, "MMMM dd")}
                </h4>
                <span className="text-[10px] font-black text-slate-400">
                  {(sessions?.filter(s => isSameDay(new Date(s.scheduled_start), selectedDate)) || []).length} Sessions
                </span>
              </div>

              {(sessions?.filter(s => isSameDay(new Date(s.scheduled_start), selectedDate)) || []).length === 0 ? (
                <div className="py-8 px-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-[2rem] border border-dashed border-slate-100 dark:border-slate-800/50 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No sessions planned for this day</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(sessions?.filter(s => isSameDay(new Date(s.scheduled_start), selectedDate)) || []).map((session: any) => {
                    const modeStyle = getSessionModeStyle(session.session_mode);
                    return (
                      <Card
                        key={session.id}
                        onClick={() => { haptic.light(); setSelectedSession(session); }}
                        className="bg-white dark:bg-slate-900 border-border/50 shadow-sm rounded-3xl overflow-hidden hover:border-primary/20 transition-all active:scale-[0.99] cursor-pointer"
                      >
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", modeStyle.iconBg)}>
                              <Clock className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                  {format(parseISO(session.scheduled_start), "hh:mm a")}
                                </span>
                                <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border leading-none", modeStyle.bg, modeStyle.text)}>
                                  {modeStyle.label}
                                </span>
                              </div>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate mt-0.5">
                                {session.client ? `${session.client.first_name} ${session.client.last_name}` : "No Athlete"}
                              </h4>
                              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate leading-none">
                                {session.session_type?.name || "Standard Session"} {session.session_mode === 'Group' && session.group_name ? `• ${session.group_name}` : ''}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Month Overview section (shows top 5 next sessions this month) */}
            <div className="pt-4 space-y-3">
              <h5 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 px-2">
                Month Overview
              </h5>
              
              {sessions && sessions.length > 0 ? (
                <div className="space-y-2">
                  {sessions
                    .filter((s: any) => !isSameDay(new Date(s.scheduled_start), selectedDate))
                    .slice(0, 5)
                    .map((session: any) => {
                      const modeStyle = getSessionModeStyle(session.session_mode);
                      return (
                        <div
                          key={session.id}
                          onClick={() => { haptic.light(); setSelectedDate(new Date(session.scheduled_start)); }}
                          className="flex items-center justify-between p-3 bg-white/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl cursor-pointer hover:bg-white transition-all active:scale-[0.99]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-[10px] font-black text-slate-500 uppercase shrink-0 min-w-[50px]">
                              {format(new Date(session.scheduled_start), "MMM dd")}
                            </span>
                            <div className="min-w-0">
                              <h6 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {session.client ? `${session.client.first_name} ${session.client.last_name}` : "No Athlete"}
                              </h6>
                              <p className="text-[9px] text-slate-400 truncate mt-0.5">
                                {format(parseISO(session.scheduled_start), "hh:mm a")} • {session.session_type?.name || "Session"}
                              </p>
                            </div>
                          </div>
                          
                          <span className={cn("text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border leading-none shrink-0", modeStyle.bg, modeStyle.text)}>
                            {session.session_mode || "Individual"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 italic px-2">No other sessions scheduled this month.</p>
              )}
            </div>
          </div>
        )}

        {/* Day View stats (only shown in Day View) */}
        {viewMode === 'day' && (
          <section className="grid grid-cols-2 gap-4">
             <Card className="bg-white dark:bg-slate-900 border-border/50 rounded-[2.5rem] p-6 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4">
                   <History className="w-5 h-5" />
                </div>
                <h5 className="text-2xl font-black italic text-slate-900 dark:text-white">{sessions?.filter(s => s.status === "Completed").length || 0}</h5>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Completed Today</p>
             </Card>
             <Card className="bg-white dark:bg-slate-900 border-border/50 rounded-[2.5rem] p-6 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
                   <AlertCircle className="w-5 h-5" />
                </div>
                <h5 className="text-2xl font-black italic text-slate-900 dark:text-white">{sessions?.filter(s => isSameDay(new Date(s.scheduled_start), selectedDate) && (s.status === "Scheduled" || s.status === "Pending")).length || 0}</h5>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remaining</p>
             </Card>
          </section>
        )}
      </div>

      <SportsScientistBookSessionModal 
        open={isBookModalOpen}
        onOpenChange={setIsBookModalOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["mobile-sessions"] });
        }}
      />

      <SportsScientistSessionStatusModal 
        open={!!selectedSession}
        onOpenChange={(open) => !open && setSelectedSession(null)}
        session={selectedSession}
        onStatusUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ["mobile-sessions"] });
          setSelectedSession(null);
        }}
      />
    </MobileSpecialistLayout>
  );
}
