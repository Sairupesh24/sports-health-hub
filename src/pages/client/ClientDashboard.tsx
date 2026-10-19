import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { 
  Calendar, Activity, CreditCard, Clock, 
  ChevronRight, Dumbbell, Play, Eye,
  ArrowRight, TrendingUp, Zap, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { format, isToday, differenceInCalendarDays, subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as ChartTooltip, ResponsiveContainer 
} from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import WellnessCheckinForm from "@/components/ams/WellnessCheckinForm";
import ThemeToggle from "@/components/shared/ThemeToggle";

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { profile, clientId, user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [assignedWorkouts, setAssignedWorkouts] = useState<any[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<any[]>([]);
  const [unpaidDues, setUnpaidDues] = useState<number>(0);
  const [insights, setInsights] = useState<{ physio: any; program: any }>({ physio: null, program: null });
  const [loading, setLoading] = useState(true);

  // Active program & day selection state
  const [selectedProgramIndex, setSelectedProgramIndex] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [previewDay, setPreviewDay] = useState<any | null>(null);
  const [isWellnessModalOpen, setIsWellnessModalOpen] = useState(false);

  const linkedUhid = profile?.uhid || (profile as any)?.client_uhid || user?.uhid || null;

  const fetchDashboardData = async () => {
    setLoading(true);
    const activeId = clientId || (profile as any)?.client_id || profile?.uhid || profile?.id || user?.id;

    try {
      const [apptsRes, assignmentsRes, logsRes, billsRes, injuriesRes] = await Promise.allSettled([
        apiFetch(`/api/appointments?client_id=${activeId || ''}&start=${subDays(new Date(), 30).toISOString()}`),
        apiFetch(`/api/ams/program-assignments?status=active${activeId ? `&athlete_id=${activeId}` : ''}`),
        apiFetch(`/api/ams/wellness-logs?days=30${activeId ? `&athlete_id=${activeId}` : ''}`),
        apiFetch(`/api/billing/invoices?client_id=${activeId || ''}`),
        apiFetch(`/api/clinical/injuries?client_id=${activeId || ''}`)
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

      const injuries = injuriesRes.status === 'fulfilled' && Array.isArray(injuriesRes.value) ? injuriesRes.value : [];
      setInsights({
        physio: injuries?.[0] || null,
        program: assignments?.[0]?.program || null
      });
    } catch (err) {
      console.error("Error fetching client dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [clientId, profile?.id, profile?.uhid, user?.id]);

  const activeProgram = assignedWorkouts[selectedProgramIndex] || assignedWorkouts[0] || null;
  const programDays: any[] = useMemo(() => {
    if (!activeProgram) return [];
    return activeProgram.program?.days || activeProgram.program_days || [];
  }, [activeProgram]);

  // Resolve today's scheduled workout or closest upcoming workout
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

  // Current active day to display
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
        { day: 'Fri', score: 1 },
        { day: 'Sat', score: 2 },
        { day: 'Sun', score: 1 }
      ];
    }
    return wellnessLogs.slice(-7).map(l => ({
      day: l.created_at ? format(new Date(l.created_at), 'EEE') : 'N/A',
      score: l.soreness_level ?? 2
    }));
  }, [wellnessLogs]);

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter(a => a.scheduled_start && new Date(a.scheduled_start) >= new Date())
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime())
      .slice(0, 3);
  }, [appointments]);

  const handleLaunchWorkout = (dayId?: string) => {
    if (dayId) {
      navigate(`/ams/athlete/workout/${dayId}`);
    } else {
      navigate('/client/performance');
    }
  };

  return (
    <DashboardLayout role="client">
      <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
        
        {/* ================================================================= */}
        {/* 1. TOP HEADER & PROFILE OVERVIEW BAR                              */}
        {/* ================================================================= */}
        <header className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-6 sm:p-7 text-white border border-slate-800 shadow-sm relative overflow-hidden transition-colors">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-400">
                  {format(new Date(), 'EEEE, MMMM d')}
                </span>
                <span className="text-slate-600">•</span>
                {linkedUhid ? (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    UHID: {linkedUhid}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-slate-700 text-slate-300 text-xs">
                    Client Console
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                {greeting}, <span className="text-primary">{profile?.first_name || 'Athlete'}</span>
              </h1>
              
              <p className="text-sm text-slate-400 font-normal">
                {activeProgram 
                  ? `Active regimen: ${activeProgram.program?.name || activeProgram.program_name || 'Training Plan'}`
                  : `Health & Performance Portal. Track daily recovery and scheduled sessions.`}
              </p>
            </div>

            {/* Quick Action Buttons & Theme Switcher */}
            <div className="flex flex-wrap items-center gap-2.5">
              <ThemeToggle showLabel className="border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWellnessModalOpen(true)}
                className="h-10 px-4 rounded-xl border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-800 hover:text-white text-xs font-semibold gap-2"
              >
                <Activity className="w-4 h-4 text-primary" />
                {metrics.hasLoggedToday ? "Update Check-in" : "Daily Check-in"}
              </Button>

              <Button
                size="sm"
                onClick={() => navigate('/client/appointments')}
                className="h-10 px-4 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-semibold gap-2 shadow-sm"
              >
                <Calendar className="w-4 h-4 text-primary" />
                Book Session
              </Button>
            </div>
          </div>
        </header>

        {/* ================================================================= */}
        {/* 2. REFINED 4-STAT SUMMARY RIBBON                                  */}
        {/* ================================================================= */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Readiness */}
          <div 
            onClick={() => setIsWellnessModalOpen(true)}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Readiness Score</span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{metrics.readiness}%</span>
              <Badge variant="outline" className="text-[10px] font-semibold text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/40 py-0 px-1.5">
                {metrics.readiness >= 80 ? "Optimal" : metrics.readiness >= 65 ? "Moderate" : "Needs Rest"}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {metrics.hasLoggedToday ? "Logged today" : "Tap to complete daily log"}
            </p>
          </div>

          {/* Active Training Plan */}
          <div 
            onClick={() => navigate('/client/performance')}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Training Regimen</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Dumbbell className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-base font-bold text-slate-900 dark:text-white truncate tracking-tight">
                {activeProgram?.program?.name || activeProgram?.program_name || "Assessment Cycle"}
              </p>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {programDays.length > 0 ? `${programDays.length} prescribed workout days` : "Personalized protocol"}
            </p>
          </div>

          {/* Next Consultation */}
          <div 
            onClick={() => navigate('/client/appointments')}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Next Consultation</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {upcomingAppointments[0] ? format(new Date(upcomingAppointments[0].scheduled_start), "hh:mm a") : "None Booked"}
              </p>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
              {upcomingAppointments[0] 
                ? `${isToday(new Date(upcomingAppointments[0].scheduled_start)) ? 'Today' : format(new Date(upcomingAppointments[0].scheduled_start), 'MMM d')} • ${upcomingAppointments[0].service_type || 'Consultation'}`
                : "Tap to schedule an appointment"}
            </p>
          </div>

          {/* Invoices / Account */}
          <div 
            onClick={() => navigate('/client/billing')}
            className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border shadow-sm transition-all cursor-pointer group ${
              unpaidDues > 0 ? "border-amber-200 dark:border-amber-800" : "border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Billing Status</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                unpaidDues > 0 ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400" : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
              }`}>
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className={`text-base font-bold tracking-tight ${unpaidDues > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                {unpaidDues > 0 ? `₹${unpaidDues.toLocaleString()}` : "All Clear"}
              </span>
              <Badge variant="outline" className={`text-[10px] font-semibold py-0 px-1.5 ${
                unpaidDues > 0 ? "text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40" : "text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40"
              }`}>
                {unpaidDues > 0 ? "Due" : "Paid"}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {unpaidDues > 0 ? "Pending invoice payment" : "Account in good standing"}
            </p>
          </div>
        </section>

        {/* ================================================================= */}
        {/* 3. MAIN DASHBOARD GRID                                            */}
        {/* ================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: TODAY'S WORKOUT & UPCOMING APPOINTMENTS */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* WORKOUT SECTION */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-800 text-primary flex items-center justify-center shrink-0">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                      Today's Workout Protocol
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                      {activeProgram ? (activeProgram.program?.name || activeProgram.program_name) : "No assigned regimen"}
                    </p>
                  </div>
                </div>

                {assignedWorkouts.length > 1 && (
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {assignedWorkouts.map((w, idx) => (
                      <button
                        key={w.id || idx}
                        onClick={() => {
                          setSelectedProgramIndex(idx);
                          setSelectedDayIndex(null);
                        }}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                          selectedProgramIndex === idx 
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs" 
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        Plan {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {activeProgram && currentSelectedDay ? (
                <div className="space-y-4">
                  {/* Day Picker Pills Strip */}
                  {programDays.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-slate-100 dark:border-slate-800 pb-3">
                      {programDays.map((day: any, idx: number) => {
                        const isSelected = (selectedDayIndex !== null ? selectedDayIndex === idx : todayDayIndex === idx);
                        const isTodayTarget = todayDayIndex === idx;

                        return (
                          <button
                            key={day.id || idx}
                            onClick={() => setSelectedDayIndex(idx)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                              isSelected
                                ? "bg-slate-900 text-white dark:bg-primary dark:text-slate-950 shadow-xs font-semibold"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700"
                            }`}
                          >
                            <span>Day {idx + 1}</span>
                            {isTodayTarget && (
                              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary dark:bg-slate-950" : "bg-slate-400"}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Active Selected Day Overview Box */}
                  <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            Day {(currentSelectedDay.display_order !== undefined ? currentSelectedDay.display_order + 1 : (currentSelectedDay.dayIndex ?? 0) + 1)}
                          </span>
                          {currentSelectedDay.dayIndex === todayDayIndex && (
                            <Badge className="bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-semibold py-0 px-1.5">
                              Scheduled Today
                            </Badge>
                          )}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                          {currentSelectedDay.title || "Prescribed Movement Session"}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                          {currentSelectedDay.items?.length 
                            ? `${currentSelectedDay.items.length} prescribed movements and strength sets`
                            : "Prescribed mobility & strength sets"}
                        </p>
                      </div>

                      <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-slate-800 text-primary flex items-center justify-center shrink-0 shadow-xs">
                        <Play className="w-5 h-5 fill-primary" />
                      </div>
                    </div>

                    {/* Quick Mini Movement Preview Strip */}
                    {currentSelectedDay.items && currentSelectedDay.items.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Key Prescriptions
                        </p>
                        <div className="space-y-1.5">
                          {currentSelectedDay.items.slice(0, 3).map((item: any, idx: number) => {
                            const name = item.exercise_name || item.lift_items?.exercise?.name || `Exercise ${idx + 1}`;
                            const sets = item.sets || item.lift_items?.sets || 3;
                            const reps = item.reps || item.lift_items?.reps || "10";
                            const load = item.load_value || item.lift_items?.load_value || "Bodyweight";

                            return (
                              <div key={item.id || idx} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700">
                                <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">{name}</span>
                                <span className="text-slate-500 dark:text-slate-400 font-normal shrink-0">{sets} × {reps} ({load})</span>
                              </div>
                            );
                          })}
                          {currentSelectedDay.items.length > 3 && (
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 pl-1 font-medium">
                              +{currentSelectedDay.items.length - 3} additional movements in protocol
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                      <Button
                        onClick={() => handleLaunchWorkout(currentSelectedDay.id)}
                        className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 text-xs font-semibold gap-2 shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Start Session
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => setPreviewDay(currentSelectedDay)}
                        className="h-10 px-4 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        Preview Protocol
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={() => navigate('/client/performance')}
                        className="h-10 px-3 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-medium gap-1 ml-auto"
                      >
                        Performance Hub
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Clean Empty State */
                <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                    <Dumbbell className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      No Training Plan Prescribed
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                      Your coach will assign your training plan linked to UHID {linkedUhid ? `[${linkedUhid}]` : ''}.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate('/client/appointments')}
                    className="rounded-xl bg-slate-900 dark:bg-primary text-white dark:text-slate-950 text-xs font-semibold px-4 h-9"
                  >
                    Schedule Assessment
                  </Button>
                </div>
              )}
            </section>

            {/* UPCOMING CONSULTATIONS SECTION */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    Upcoming Appointments
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                    Scheduled consultations with your health and sports science team
                  </p>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/client/appointments')} 
                  className="text-xs font-semibold text-primary hover:text-primary/90 h-8 gap-1"
                >
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-2.5">
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((apt) => {
                    const dateObj = new Date(apt.scheduled_start);
                    const isSessionToday = isToday(dateObj);

                    return (
                      <div 
                        key={apt.id} 
                        onClick={() => navigate('/client/appointments')}
                        className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isSessionToday 
                              ? "bg-primary/10 text-primary" 
                              : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                          }`}>
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {format(dateObj, "EEE, MMM d")}
                              </p>
                              {isSessionToday && (
                                <Badge className="bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 text-[10px] font-semibold py-0 px-1.5">
                                  Today
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                              {format(dateObj, "hh:mm a")} • {apt.service_type || 'Consultation'}
                            </p>
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No consultations scheduled</p>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/client/appointments')}
                      className="rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 h-8"
                    >
                      Book an Appointment
                    </Button>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: RECOVERY TREND & CLINICAL ADVISORY */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* RECOVERY & SORENESS CHART */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Recovery & Soreness</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">7-day soreness tracking (0 = fresh, 10 = sore)</p>
                </div>
                <Badge variant="outline" className="text-xs font-medium border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                  Last 7 Days
                </Badge>
              </div>

              <div className="h-[200px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="painGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                      dy={6}
                    />
                    <YAxis 
                      domain={[0, 10]} 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    <ChartTooltip 
                      contentStyle={{ 
                        borderRadius: '12px', 
                        backgroundColor: '#0f172a',
                        border: '1px solid #334155',
                        color: '#ffffff',
                        fontSize: '12px',
                        padding: '8px 12px'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      name="Soreness"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#painGradient)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Recovery Vitals Row */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider block">Sleep</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{metrics.sleep}</span>
                </div>
                <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider block">Fatigue</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{metrics.fatigue}</span>
                </div>
                <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider block">Avg Pain</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{metrics.avgPain} / 10</span>
                </div>
              </div>
            </section>

            {/* CLINICAL / THERAPIST GUIDANCE (CONDITIONAL) */}
            {insights.physio ? (
              <section className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-5 border border-slate-800 space-y-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Clinical Guidance Note
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">
                  {insights.physio.injury_name || "Active Physiotherapy Observation"}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {insights.physio.clinical_notes || "Maintain targeted mobility routines and report any spike in soreness to your specialist."}
                </p>
              </section>
            ) : null}

            {/* QUICK LINK TO FULL PERFORMANCE HUB */}
            <div 
              onClick={() => navigate('/client/performance')}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-900 dark:to-slate-850 border border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                    Performance & Testing Hub
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                    Review assessment test results, PRs, and radar metrics
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>

          </div>
        </div>

        {/* ================================================================= */}
        {/* 4. WORKOUT PROTOCOL PREVIEW MODAL                                 */}
        {/* ================================================================= */}
        <Dialog open={!!previewDay} onOpenChange={(open) => { if (!open) setPreviewDay(null); }}>
          <DialogContent className="max-w-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-h-[85vh] overflow-y-auto">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2 py-0.5">
                  Day Protocol
                </Badge>
                {previewDay && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    {previewDay.items?.length || 0} Movements
                  </span>
                )}
              </div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {previewDay?.title || "Workout Session Protocol"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Target sets, repetitions, load, and rest periods prescribed by coach.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2.5 mt-3">
              {previewDay?.items && previewDay.items.length > 0 ? (
                previewDay.items.map((item: any, idx: number) => {
                  const exerciseName = item.exercise_name || item.lift_items?.exercise?.name || `Exercise ${idx + 1}`;
                  const sets = item.sets || item.lift_items?.sets || 3;
                  const reps = item.reps || item.lift_items?.reps || "10";
                  const load = item.load_value || item.lift_items?.load_value || "Bodyweight";
                  const tempo = item.tempo || item.lift_items?.tempo || null;
                  const rest = item.rest_time_secs || item.lift_items?.rest_time_secs || null;
                  const notes = item.notes || item.additional_info || item.lift_items?.additional_info || null;

                  return (
                    <div 
                      key={item.id || idx}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <h5 className="text-sm font-semibold text-slate-900 dark:text-white">
                              {exerciseName}
                            </h5>
                            {notes && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                                {notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <Badge variant="outline" className="text-xs font-medium border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                          {load}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {sets} Sets × {reps} Reps
                        </span>
                        {tempo && (
                          <span className="text-slate-500 dark:text-slate-400">• Tempo: {tempo}</span>
                        )}
                        {rest && (
                          <span className="text-slate-500 dark:text-slate-400">• Rest: {rest}s</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs font-normal">
                  No individual movement items found for this day.
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setPreviewDay(null)}
                className="rounded-xl border-slate-200 dark:border-slate-700 text-xs font-medium px-4 h-9 text-slate-700 dark:text-slate-300"
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
                className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 text-xs font-semibold gap-1.5 px-5 h-9"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Workout
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* ================================================================= */}
        {/* 5. WELLNESS DAILY CHECK-IN MODAL                                  */}
        {/* ================================================================= */}
        <Dialog open={isWellnessModalOpen} onOpenChange={setIsWellnessModalOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Daily Wellness Check-In
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                Log your sleep, stress, fatigue, and muscle soreness for personalized load management.
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
    </DashboardLayout>
  );
}
