import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import { 
  Calendar, Activity, CreditCard, Clock, 
  ChevronRight, Dumbbell, Play, Eye, Zap,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { format, isToday, differenceInCalendarDays, subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { 
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip as ChartTooltip 
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import WellnessCheckinForm from "@/components/ams/WellnessCheckinForm";

export default function MobileClientDashboard() {
  const navigate = useNavigate();
  const { profile, clientId, user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [assignedWorkouts, setAssignedWorkouts] = useState<any[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<any[]>([]);
  const [unpaidDues, setUnpaidDues] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Day selection & preview modals
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [previewDay, setPreviewDay] = useState<any | null>(null);
  const [isWellnessModalOpen, setIsWellnessModalOpen] = useState(false);

  const linkedUhid = profile?.uhid || (profile as any)?.client_uhid || user?.uhid || null;

  const fetchDashboardData = async () => {
    setLoading(true);
    const activeId = clientId || (profile as any)?.client_id || profile?.uhid || profile?.id || user?.id;

    try {
      const [apptsRes, assignmentsRes, logsRes, billsRes] = await Promise.allSettled([
        apiFetch(`/api/appointments?client_id=${activeId || ''}&start=${subDays(new Date(), 30).toISOString()}`),
        apiFetch(`/api/ams/program-assignments?status=active${activeId ? `&athlete_id=${activeId}` : ''}`),
        apiFetch(`/api/ams/wellness-logs?days=30${activeId ? `&athlete_id=${activeId}` : ''}`),
        apiFetch(`/api/billing/invoices?client_id=${activeId || ''}`)
      ]);

      if (apptsRes.status === 'fulfilled' && Array.isArray(apptsRes.value)) {
        setAppointments(apptsRes.value);
      } else {
        setAppointments([]);
      }

      const assignments = assignmentsRes.status === 'fulfilled' && Array.isArray(assignmentsRes.value) ? assignmentsRes.value : [];
      setAssignedWorkouts(assignments);

      if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value)) {
        setWellnessLogs(logsRes.value);
      } else {
        setWellnessLogs([]);
      }

      if (billsRes.status === 'fulfilled' && Array.isArray(billsRes.value)) {
        const total = billsRes.value.reduce((sum: number, b: any) => {
          if (b.status !== 'Paid' && b.status !== 'Cancelled') {
            return sum + (Number(b.total_amount) || 0);
          }
          return sum;
        }, 0);
        setUnpaidDues(total);
      } else {
        setUnpaidDues(0);
      }
    } catch (err) {
      console.error("MobileClientDashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [clientId, profile?.id, profile?.uhid, user?.id]);

  const activeProgram = assignedWorkouts[0] || null;
  const programDays: any[] = useMemo(() => {
    if (!activeProgram) return [];
    return activeProgram.program?.days || activeProgram.program_days || [];
  }, [activeProgram]);

  const { todayWorkout, nextUpcomingWorkout, fallbackWorkout, todayDayIndex } = useMemo(() => {
    if (!activeProgram || programDays.length === 0) {
      return { todayWorkout: null, nextUpcomingWorkout: null, fallbackWorkout: null, todayDayIndex: 0 };
    }

    const start = new Date(activeProgram.start_date);
    const diffDays = differenceInCalendarDays(new Date(), start);

    let matchedIdx = programDays.findIndex((d: any) => d.display_order === diffDays || d.day_number === (diffDays + 1));
    let today = matchedIdx >= 0 ? programDays[matchedIdx] : null;
    let next = null;

    if (!today) {
      const nextIdx = programDays.findIndex((d: any) => (d.display_order ?? 0) >= diffDays);
      if (nextIdx >= 0) {
        next = programDays[nextIdx];
        matchedIdx = nextIdx;
      } else {
        next = programDays[0];
        matchedIdx = 0;
      }
    } else {
      next = programDays[matchedIdx + 1] || null;
    }

    const fallback = programDays[0] || null;
    const progName = activeProgram.program?.name || activeProgram.program_name || "Custom Regimen";

    return {
      todayWorkout: today ? { ...today, programName: progName } : null,
      nextUpcomingWorkout: next ? { ...next, programName: progName } : null,
      fallbackWorkout: fallback ? { ...fallback, programName: progName } : null,
      todayDayIndex: matchedIdx >= 0 ? matchedIdx : 0
    };
  }, [activeProgram, programDays]);

  const currentSelectedDay = useMemo(() => {
    if (selectedDayIndex !== null && programDays[selectedDayIndex]) {
      return {
        ...programDays[selectedDayIndex],
        programName: activeProgram?.program?.name || activeProgram?.program_name || "Custom Regimen",
        dayIndex: selectedDayIndex
      };
    }
    const defaultWorkout = todayWorkout || nextUpcomingWorkout || fallbackWorkout;
    return defaultWorkout ? { ...defaultWorkout, dayIndex: todayDayIndex } : null;
  }, [selectedDayIndex, programDays, todayWorkout, nextUpcomingWorkout, fallbackWorkout, todayDayIndex, activeProgram]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const metrics = useMemo(() => {
    if (wellnessLogs.length === 0) {
      return { 
        readiness: 85, 
        avgPain: "0.0", 
        sleep: "Good", 
        recovery: 80, 
        fatigue: "Low",
        hasLoggedToday: false 
      };
    }
    
    const latest = wellnessLogs[wellnessLogs.length - 1];
    const isLoggedToday = latest.created_at && isToday(new Date(latest.created_at));
    const readiness = Math.round(((latest.sleep_score + (11 - latest.stress_level) + (11 - latest.fatigue_level)) / 3) * 10);
    
    const last7Days = wellnessLogs.filter(l => differenceInCalendarDays(new Date(), new Date(l.created_at)) <= 7);
    const avgPain = last7Days.length > 0 ? (last7Days.reduce((sum, l) => sum + l.soreness_level, 0) / last7Days.length).toFixed(1) : "0.0";

    return {
      readiness: Math.min(100, Math.max(0, readiness)),
      avgPain,
      sleep: latest.sleep_score >= 8 ? "Excellent" : latest.sleep_score >= 6 ? "Good" : "Fair",
      recovery: Math.round(((latest.sleep_score + (11 - latest.fatigue_level)) / 2) * 10),
      fatigue: latest.fatigue_level > 7 ? "High" : latest.fatigue_level > 4 ? "Moderate" : "Low",
      hasLoggedToday: Boolean(isLoggedToday)
    };
  }, [wellnessLogs]);

  const chartData = useMemo(() => {
    if (wellnessLogs.length === 0) {
      return [
        { day: 'Mon', score: 2 },
        { day: 'Tue', score: 1 },
        { day: 'Wed', score: 3 },
        { day: 'Thu', score: 2 },
        { day: 'Fri', score: 1 }
      ];
    }
    return wellnessLogs.slice(-5).map(l => ({
      day: l.created_at ? format(new Date(l.created_at), 'EEE') : 'N/A',
      score: l.soreness_level ?? 2
    }));
  }, [wellnessLogs]);

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter(a => a.scheduled_start && new Date(a.scheduled_start) >= new Date())
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
      .slice(0, 2);
  }, [appointments]);

  const handleLaunchWorkout = (dayId?: string) => {
    if (dayId) {
      navigate(`/mobile/client/workout/${dayId}`);
    } else {
      navigate('/mobile/client/performance');
    }
  };

  return (
    <MobileLayout>
      <div className="space-y-4 pb-10">
        
        {/* ================================================================= */}
        {/* TOP MOBILE BAR & PROFILE OVERVIEW                                 */}
        {/* ================================================================= */}
        <section className="pt-1 space-y-2">
          {/* Top row: Date + UHID on left, Action buttons on right */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {format(new Date(), 'EEEE, MMM d')}
              </span>
              {linkedUhid && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold py-0.5 px-2 rounded-full">
                  UHID: {linkedUhid}
                </Badge>
              )}
            </div>

            {/* Action buttons moved above */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsWellnessModalOpen(true)}
                className="h-8 px-2.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold gap-1 shadow-xs"
              >
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span>Check-in</span>
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/mobile/client/appointments')}
                className="h-8 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 text-xs font-semibold gap-1 shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book</span>
              </Button>
            </div>
          </div>

          {/* Full-width greeting and client name printed completely without truncation */}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {greeting}, <span className="text-primary">{profile?.first_name ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}` : 'Athlete'}</span>
            </h1>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 3-METRIC SUMMARY TILES                                            */}
        {/* ================================================================= */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Readiness */}
          <div 
            onClick={() => setIsWellnessModalOpen(true)}
            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs text-center cursor-pointer active:scale-95 transition-all"
          >
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Readiness</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white block mt-0.5">{metrics.readiness}%</span>
            <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 block truncate">
              {metrics.readiness >= 80 ? "Optimal" : "Moderate"}
            </span>
          </div>

          {/* Next Appt */}
          <div 
            onClick={() => navigate('/mobile/client/appointments')}
            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs text-center cursor-pointer active:scale-95 transition-all"
          >
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Next Session</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white truncate block mt-0.5">
              {upcomingAppointments[0] ? format(new Date(upcomingAppointments[0].scheduled_start), "hh:mm a") : "None"}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate font-medium">
              {upcomingAppointments[0] ? (isToday(new Date(upcomingAppointments[0].scheduled_start)) ? 'Today' : format(new Date(upcomingAppointments[0].scheduled_start), 'MMM d')) : "Schedule"}
            </span>
          </div>

          {/* Protocol Days */}
          <div 
            onClick={() => navigate('/mobile/client/performance')}
            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs text-center cursor-pointer active:scale-95 transition-all"
          >
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Regimen</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white truncate block mt-0.5">
              {programDays.length > 0 ? `${programDays.length} Days` : "Active"}
            </span>
            <span className="text-[10px] text-primary block truncate font-semibold">
              Performance
            </span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* TODAY'S WORKOUT HERO PROTOCOL                                     */}
        {/* ================================================================= */}
        {activeProgram && currentSelectedDay ? (
          <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 space-y-3.5 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 text-primary flex items-center justify-center shrink-0">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Workout Protocol
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[190px]">
                    {activeProgram.program?.name || activeProgram.program_name}
                  </p>
                </div>
              </div>

              {currentSelectedDay.dayIndex === todayDayIndex && (
                <Badge className="bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-semibold py-0.5 px-2">
                  Today
                </Badge>
              )}
            </div>

            {/* Horizontal Day Chips Slider */}
            {programDays.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-slate-100 dark:border-slate-800 pb-2.5">
                {programDays.map((day: any, idx: number) => {
                  const isSelected = (selectedDayIndex !== null ? selectedDayIndex === idx : todayDayIndex === idx);
                  return (
                    <button
                      key={day.id || idx}
                      onClick={() => setSelectedDayIndex(idx)}
                      className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all shrink-0 ${
                        isSelected 
                          ? "bg-slate-900 text-white dark:bg-primary dark:text-slate-950 font-semibold shadow-xs" 
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700"
                      }`}
                    >
                      Day {idx + 1}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected Day Details */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                Day {(currentSelectedDay.display_order !== undefined ? currentSelectedDay.display_order + 1 : (currentSelectedDay.dayIndex ?? 0) + 1)}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                {currentSelectedDay.title || "Workout Session"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                {currentSelectedDay.items?.length 
                  ? `${currentSelectedDay.items.length} prescribed movements and strength sets`
                  : "Targeted conditioning & mobility protocol"}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewDay(currentSelectedDay)}
                className="flex-1 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold h-10 gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                Preview
              </Button>
              <Button
                size="sm"
                onClick={() => handleLaunchWorkout(currentSelectedDay.id)}
                className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 text-xs font-semibold h-10 gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Session
              </Button>
            </div>
          </section>
        ) : (
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm text-center space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mx-auto flex items-center justify-center text-slate-400">
              <Dumbbell className="w-5 h-5 text-slate-400" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">No Prescribed Regimen</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Your coach will assign a plan to your UHID.</p>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/mobile/client/appointments')}
              className="rounded-xl bg-slate-900 dark:bg-primary text-white dark:text-slate-950 text-xs font-semibold px-4 h-8"
            >
              Book Consultation
            </Button>
          </div>
        )}

        {/* ================================================================= */}
        {/* UPCOMING APPOINTMENTS                                             */}
        {/* ================================================================= */}
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Upcoming Sessions
            </h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/mobile/client/appointments')}
              className="text-xs font-semibold text-primary h-7 px-2"
            >
              View Schedule
            </Button>
          </div>

          <div className="space-y-2">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.map((apt) => {
                const dateObj = new Date(apt.scheduled_start);
                const isSessionToday = isToday(dateObj);

                return (
                  <div 
                    key={apt.id}
                    onClick={() => navigate('/mobile/client/appointments')}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 active:bg-slate-100 dark:active:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSessionToday 
                          ? "bg-primary/10 text-primary" 
                          : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                      }`}>
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white">
                            {format(dateObj, "EEE, MMM d")}
                          </p>
                          {isSessionToday && (
                            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/20 px-1 rounded">
                              Today
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                          {format(dateObj, "hh:mm a")} • {apt.service_type || 'Consultation'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-1.5">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No sessions scheduled</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => navigate('/mobile/client/appointments')}
                  className="rounded-xl text-xs font-semibold h-8 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  Book Session
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* ================================================================= */}
        {/* RECOVERY & SORENESS TREND CHART                                   */}
        {/* ================================================================= */}
        <section className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Recovery Trend
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Soreness (0-10)
            </span>
          </div>

          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="mobPainGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <YAxis 
                  domain={[0, 10]} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 9 }}
                />
                <ChartTooltip 
                  contentStyle={{ 
                    borderRadius: '10px', 
                    fontSize: '11px', 
                    padding: '6px 10px',
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    color: '#ffffff'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  name="Soreness"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#mobPainGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Sleep: <strong className="text-slate-900 dark:text-white">{metrics.sleep}</strong></span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Fatigue: <strong className="text-slate-900 dark:text-white">{metrics.fatigue}</strong></span>
            <span className="text-slate-500 dark:text-slate-400 font-medium">Avg Pain: <strong className="text-slate-900 dark:text-white">{metrics.avgPain}</strong></span>
          </div>
        </section>

        {/* ================================================================= */}
        {/* PENDING BILLS NOTIFICATION                                        */}
        {/* ================================================================= */}
        {unpaidDues > 0 && (
          <div 
            onClick={() => navigate('/mobile/client/billing')}
            className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">Pending Invoices</p>
                <p className="text-xs text-amber-700 dark:text-amber-400">₹{unpaidDues.toLocaleString()} due</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-500" />
          </div>
        )}

        {/* ================================================================= */}
        {/* WORKOUT DAY PREVIEW MODAL                                         */}
        {/* ================================================================= */}
        <Dialog open={!!previewDay} onOpenChange={(open) => { if (!open) setPreviewDay(null); }}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-h-[80vh] overflow-y-auto">
            <DialogHeader className="space-y-1">
              <Badge className="w-fit bg-primary/15 text-primary uppercase text-[10px] font-semibold px-2 py-0.5">
                Protocol Details
              </Badge>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {previewDay?.title || "Workout Protocol"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                {previewDay?.items?.length || 0} prescribed movements
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2 mt-3">
              {previewDay?.items && previewDay.items.length > 0 ? (
                previewDay.items.map((item: any, idx: number) => {
                  const exerciseName = item.exercise_name || item.lift_items?.exercise?.name || `Exercise ${idx + 1}`;
                  const sets = item.sets || item.lift_items?.sets || 3;
                  const reps = item.reps || item.lift_items?.reps || "10";
                  const load = item.load_value || item.lift_items?.load_value || "Bodyweight";

                  return (
                    <div key={item.id || idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">{exerciseName}</span>
                        <Badge variant="outline" className="text-[10px] font-medium border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">{load}</Badge>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        {sets} sets × {reps} reps
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">No exercises found for this day.</p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setPreviewDay(null)} 
                className="flex-1 rounded-xl text-xs font-semibold h-9 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
              >
                Close
              </Button>
              <Button 
                size="sm"
                onClick={() => {
                  const targetId = previewDay?.id;
                  setPreviewDay(null);
                  handleLaunchWorkout(targetId);
                }} 
                className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 text-xs font-semibold h-9 gap-1 shadow-sm"
              >
                <Play className="w-3 h-3 fill-current" />
                Start
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ================================================================= */}
        {/* WELLNESS CHECK-IN MODAL                                           */}
        {/* ================================================================= */}
        <Dialog open={isWellnessModalOpen} onOpenChange={setIsWellnessModalOpen}>
          <DialogContent className="max-w-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Daily Check-In
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Log your sleep and recovery to update your daily readiness.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-3">
              <WellnessCheckinForm onComplete={() => {
                setIsWellnessModalOpen(false);
                fetchDashboardData();
              }} />
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </MobileLayout>
  );
}
