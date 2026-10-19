import React, { useState, useEffect, useRef, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WellnessCheckinForm from "@/components/ams/WellnessCheckinForm";
import LogSessionForm from "@/components/ams/LogSessionForm";
import PerformanceSnapshot from "@/components/consultant/PerformanceSnapshot";
import PerformanceAnalytics from "@/components/ams/PerformanceAnalytics";
import WellnessRadarChart from "@/components/ams/charts/WellnessRadarChart";
import { 
  format, 
  addDays, 
  subDays, 
  differenceInCalendarDays, 
  startOfDay,
  parseISO
} from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import {
  Activity, Dumbbell, Heart, Zap, Calendar as CalendarIcon,
  ArrowRight, Plus, ShieldX, Loader2, ChevronLeft, ChevronRight,
  Clock, Star, CheckCircle2, AlertTriangle, Info, TrendingUp, Filter,
  Layout, User, Map, FileText
} from "lucide-react";
import { AssessmentReportsList } from "@/components/shared/assessment/AssessmentReportsList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/utils/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar as MiniCalendar } from "@/components/ui/calendar";

export default function ClientPerformancePage() {
  const { user, profile, clientId, loading: authLoading } = useAuth();
  const [assignedWorkouts, setAssignedWorkouts] = useState<any[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  const [isWellnessDialogOpen, setIsWellnessDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const firstName = profile?.first_name || "Athlete";
  const hasAmsAccess = 
    profile?.ams_role === "athlete" || 
    profile?.ams_role === "client" || 
    profile?.role === "client" || 
    profile?.role === "athlete" || 
    Boolean(clientId) || 
    Boolean(profile?.uhid) || 
    true;

  const currentUserId = user?.id || profile?.id;
  const activeAthleteId = clientId || (profile as any)?.client_id || profile?.uhid || currentUserId;

  const fetchPrs = async () => {
    if (!currentUserId) return;
    try {
      const data = await apiFetch(`/api/ams/max-pr-records?athlete_id=${activeAthleteId || currentUserId}`);
      
      setPrs(data?.reduce((acc: any, pr: any) => ({
        ...acc,
        [pr.exercise_id]: { value: pr.value, name: pr.exercise?.name }
      }), {}) || {});
    } catch (error) {
      console.error("Fetch PRs Error:", error);
    }
  };

  const [prs, setPrs] = useState<Record<string, any>>({});

  useEffect(() => {
    if (currentUserId && hasAmsAccess) {
      Promise.all([fetchAssignments(), fetchWellnessLogs(), fetchPrs()]).finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [currentUserId, hasAmsAccess, authLoading, clientId]);

  const fetchAssignments = async () => {
    if (!currentUserId) return;
    try {
      const assignments = await apiFetch(`/api/ams/program-assignments?status=active${activeAthleteId ? `&athlete_id=${activeAthleteId}` : ''}`);
      setAssignedWorkouts(assignments || []);
    } catch (error) {
      console.error("PerformanceHub Sync Error:", error);
    }
  };

  const getWorkoutDaysMap = () => {
    const map: Record<string, boolean> = {};
    assignedWorkouts.forEach((w: any) => {
      const startLocal = startOfDay(parseISO(w.start_date));
      w.program?.days?.forEach((d: any) => {
        const workoutDate = addDays(startLocal, d.display_order);
        map[format(workoutDate, 'yyyy-MM-dd')] = true;
      });
    });
    return map;
  };

  const workoutDaysMap = getWorkoutDaysMap();

  const activeWorkout = useMemo(() => {
    if (!assignedWorkouts || assignedWorkouts.length === 0) return null;
    const now = startOfDay(new Date());

    // 1. Try to find an exact day match for today across active programs
    for (const w of assignedWorkouts) {
      const start = parseISO(w.start_date);
      const diffDays = differenceInCalendarDays(now, startOfDay(start));
      const days = w.program?.days || w.program_days || [];
      const match = days.find((d: any) => d.display_order === diffDays || d.day_number === (diffDays + 1));
      if (match) return { ...match, programName: w.program?.name || w.program_name };
    }

    // 2. Otherwise return the first workout day of the first active program
    for (const w of assignedWorkouts) {
      const days = w.program?.days || w.program_days || [];
      if (days.length > 0) {
        return { ...days[0], programName: w.program?.name || w.program_name };
      }
    }
    return null;
  }, [assignedWorkouts]);

  const fetchWellnessLogs = async () => {
    try {
      const data = await apiFetch(`/api/ams/wellness-logs?athlete_id=${currentUserId}&days=7`);
      setWellnessLogs(data || []);
    } catch (error: any) {
      console.error("Fetch Wellness Error:", error);
    }
  };

  const calculateReadiness = () => {
    if (wellnessLogs.length === 0) return 0;
    const latest = wellnessLogs[0];
    const score = (latest.sleep_score + (11 - latest.stress_level) + (11 - latest.fatigue_level) + (11 - latest.soreness_level)) / 4;
    return Math.round(score * 10);
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout role="client">
        <div className="flex h-[64vh] items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasAmsAccess) {
    return (
      <DashboardLayout role="client">
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 space-y-6">
           <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border-4 border-white shadow-xl">
             <ShieldX className="w-12 h-12 text-slate-400" />
           </div>
           <div className="text-center space-y-2">
             <h2 className="text-2xl font-black text-slate-900">AMS Access Required</h2>
             <p className="text-slate-500 font-medium">Contact your therapist to enable Athlete Management features.</p>
           </div>
           <Button variant="outline" onClick={() => window.location.href = '/client'} className="rounded-2xl h-12 px-6">Return to Dashboard</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="client">
      <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-700 pb-20">

        {/* REFINED HUD HEADER */}
        <header className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Elite Performance</span>
                <span className="text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">{format(new Date(), 'EEEE, MMMM do')}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Pulse <span className="text-primary">Console</span> <span className="text-slate-300 dark:text-slate-700 font-light mx-2">/</span> <span className="text-slate-600 dark:text-slate-300">{firstName}</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
               <Dialog open={isWellnessDialogOpen} onOpenChange={setIsWellnessDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-10 border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl font-bold uppercase text-[10px] tracking-wider px-5 gap-2 shadow-xs">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" /> Check-in
                    </Button>
                  </DialogTrigger>
                  <DialogContent aria-describedby={undefined} className="max-w-xl bg-white dark:bg-slate-900 rounded-2xl p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl">
                     <DialogHeader className="p-5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                        <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                          <Activity className="w-5 h-5 text-primary" />
                          Elite Health Check-in
                        </DialogTitle>
                     </DialogHeader>
                     <div className="p-6 max-h-[80vh] overflow-y-auto no-scrollbar scroll-smooth">
                        <WellnessCheckinForm onComplete={() => {
                          setIsWellnessDialogOpen(false);
                          fetchWellnessLogs();
                        }} />
                     </div>
                  </DialogContent>
               </Dialog>

               <Dialog open={isManualLogOpen} onOpenChange={setIsManualLogOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-10 bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 shadow-sm rounded-xl font-bold uppercase text-[10px] tracking-wider px-5 gap-2">
                      <Plus className="w-4 h-4" /> Log Session
                    </Button>
                  </DialogTrigger>
                  <DialogContent aria-describedby={undefined} className="max-w-xl bg-white dark:bg-slate-900 rounded-2xl p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl text-slate-900 dark:text-white">
                     <DialogHeader className="p-5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
                        <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                          <Dumbbell className="w-5 h-5 text-primary" />
                          Log Manual Activity
                        </DialogTitle>
                     </DialogHeader>
                     <div className="p-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                        <LogSessionForm onComplete={() => setIsManualLogOpen(false)} />
                     </div>
                  </DialogContent>
               </Dialog>
            </div>
          </div>
        </header>

        {/* MODULAR SUB-NAVIGATION */}
        <div className="bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl flex flex-wrap gap-1.5 w-fit border border-slate-200 dark:border-slate-800 mx-auto shadow-sm">
           {[
             { id: 'overview', label: 'Overview', icon: Layout },
             { id: 'body', label: 'Body', icon: Map },
             { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
             { id: 'analytics', label: 'Analytics', icon: Activity },
             { id: 'reports', label: 'Reports', icon: FileText }
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={cn(
                 "flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all",
                 activeTab === tab.id
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
               )}
             >
               <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-primary" : "text-slate-500 dark:text-slate-400")} />
               {tab.label}
             </button>
           ))}
         </div>

        {/* CONTENT AREA */}
        <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           {activeTab === 'overview' && (
             <PulseOverview
                readinessScore={calculateReadiness()}
                wellnessLogs={wellnessLogs}
                prs={prs}
                onStartCheckin={() => setIsWellnessDialogOpen(true)}
                 todayWorkout={activeWorkout}
             />
           )}
           {activeTab === 'body' && <BodyStatusView clientId={activeAthleteId || currentUserId} />}
           {activeTab === 'schedule' && (
             <TrainingScheduleView
                assignedWorkouts={assignedWorkouts}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                workoutDaysMap={workoutDaysMap}
             />
           )}
           {activeTab === 'analytics' && (
             <div className="space-y-6">
               <div className="bg-[#1A1F26] rounded-2xl p-8 border border-white/5 shadow-xl">
                  <div className="flex items-center justify-between mb-8">
                     <div>
                        <h3 className="text-2xl font-bold italic uppercase tracking-tight text-white">Health Check-in</h3>
                        <p className="text-white/20 font-bold uppercase text-[9px] tracking-widest mt-1">Status Calibration</p>
                     </div>
                     <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Activity className="w-6 h-6 text-primary" />
                     </div>
                  </div>
                  <WellnessCheckinForm onComplete={fetchAssignments} />
               </div>
               <div className="bg-[#1A1F26] rounded-2xl p-8 border border-white/5 shadow-xl">
                  {currentUserId && <PerformanceAnalytics athleteId={activeAthleteId || currentUserId} />}
               </div>
             </div>
           )}
           {activeTab === 'reports' && currentUserId && (
             <AssessmentReportsList clientId={activeAthleteId || currentUserId} showDelete={false} />
           )}
        </main>

      </div>
    </DashboardLayout>
  );
}

/* SUB-COMPONENTS */

 function PulseOverview({ readinessScore, wellnessLogs, todayWorkout, onStartCheckin, prs }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
       {/* Readiness Gauge */}
       <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between group overflow-hidden relative min-h-[400px]">
          <div className="flex items-center justify-between mb-2 relative z-10">
             <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Daily Readiness</h3>
             <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 rounded-lg border border-primary/20">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Live</span>
             </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8 flex-1 relative z-10">
             <div className="relative flex items-center justify-center shrink-0">
                <div className="w-44 h-44 rounded-full border-8 border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center relative shadow-inner">
                   <svg className="absolute inset-[-8px] rotate-[-90deg] w-[192px] h-[192px]">
                      <circle
                        cx="96"
                        cy="96"
                        r="84"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeDasharray={2 * Math.PI * 84}
                        strokeDashoffset={2 * Math.PI * 84 * (1 - readinessScore / 100)}
                        className="text-primary transition-all duration-1000 ease-out"
                        strokeLinecap="round"
                      />
                   </svg>
                   <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none">{readinessScore}%</span>
                   <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Readiness</span>
                </div>
             </div>

             <div className="flex-1 w-full flex flex-col justify-center gap-4">
                {wellnessLogs.length > 0 ? (
                  <div className="h-[300px] w-full flex items-center justify-center">
                     <WellnessRadarChart logs={wellnessLogs} />
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-850 rounded-2xl p-6 sm:p-8 text-center space-y-3 border border-dashed border-slate-200 dark:border-slate-700">
                     <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">No wellness data recorded for today yet.</p>
                     <Button onClick={onStartCheckin} className="bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 rounded-xl h-10 px-6 font-semibold text-xs tracking-wider">Start Check-in</Button>
                  </div>
                )}
             </div>
          </div>
       </div>

       {/* Protocol Sidebar */}
       <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 text-slate-900 dark:text-white flex flex-col justify-between group relative shadow-sm flex-1 border border-slate-200/90 dark:border-slate-800">
             <div className="relative z-10">
               <span className="text-primary font-bold uppercase tracking-wider text-[10px] mb-2 block">Current Protocol</span>
               <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight mb-2 text-slate-900 dark:text-white">
                  {todayWorkout ? todayWorkout.title : "Recovery State"}
               </h2>
               <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-medium leading-relaxed">
                  {todayWorkout
                    ? (todayWorkout.programName ? `Part of ${todayWorkout.programName}` : "Assigned protocol for your active phase.")
                    : "Focus on active tissue health and mobility metrics."}
               </p>
             </div>
 
             <div className="relative z-10 pt-6">
               {todayWorkout ? (
                 <Button
                    onClick={() => window.location.href = `/ams/athlete/workout/${todayWorkout.id}`}
                    className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 rounded-xl font-semibold text-xs gap-2 transition-all shadow-sm"
                 >
                    <span>Launch Session</span>
                    <ArrowRight className="w-4 h-4" />
                 </Button>
               ) : (
                 <Button
                    onClick={onStartCheckin}
                    className="w-full h-11 border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 rounded-xl font-semibold text-xs tracking-wider gap-2 transition-all"
                 >
                    <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                    <span>Daily Check-in</span>
                 </Button>
               )}
             </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 text-slate-900 dark:text-white border border-slate-200/90 dark:border-slate-800 shadow-sm flex-1">
             <div className="flex items-center justify-between mb-4">
                <span className="text-primary font-bold uppercase tracking-wider text-[10px]">Personal Records</span>
                <TrendingUp className="w-4 h-4 text-slate-400" />
             </div>
             <div className="space-y-3 max-h-[160px] overflow-y-auto no-scrollbar">
                {Object.entries(prs).length > 0 ? (
                  Object.entries(prs).map(([id, pr]: any) => (
                    <div key={id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                       <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight">{pr.name || "Lift"}</span>
                       <span className="text-sm font-bold text-primary">{pr.value} <small className="text-[10px] text-slate-500 dark:text-slate-400 not-italic ml-0.5">KG</small></span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No PRs recorded yet.</p>
                )}
             </div>
          </div>
       </div>
    </div>
  );
}

function BodyStatusView({ clientId }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in zoom-in-95 duration-300">
       <div className="lg:col-span-12 bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4 relative z-10">
             <div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">Physical Status</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-xs">Latest Hotspots & Soreness Calibration</p>
             </div>
             <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 font-semibold text-xs">Sensitivity Detected</Badge>
                <div className="w-9 h-9 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-center justify-center">
                   <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
             </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-6 items-start relative z-10">
             <div className="flex-1 w-full bg-slate-50 dark:bg-slate-850 rounded-2xl p-6 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 min-h-[400px]">
                <div className="scale-105 origin-center">
                   <PerformanceSnapshot clientId={clientId} />
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

function TrainingScheduleView({ assignedWorkouts, selectedDate, setSelectedDate, workoutDaysMap }: any) {
  const getDayWorkouts = (day: Date) => {
    const normalizedDay = startOfDay(day);
    return assignedWorkouts.flatMap((w: any) => {
      const startLocal = startOfDay(parseISO(w.start_date));
      const targetLocal = startOfDay(day);
      const diffDays = differenceInCalendarDays(targetLocal, startLocal);

      if (diffDays >= 0 && w.program?.days) {
        const workoutDay = w.program.days.find((d: any) => d.display_order === diffDays);
        if (workoutDay) return [{ ...workoutDay, programName: w.program.name }];
      }
      return [];
    });
  };

  const selectedDayWorkouts = getDayWorkouts(selectedDate);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-right-4 duration-300 pb-20">
       
       {/* TIMELINE (7 Cols) */}
       <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6 relative group min-h-[480px] overflow-hidden">
             <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <CalendarIcon className="w-5 h-5" />
                   </div>
                   <div>
                      <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">Workout Timeline</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Prescribed daily training protocols</p>
                   </div>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedDate(subDays(selectedDate, 1))} 
                      className="h-8 w-8 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs font-bold text-slate-900 dark:text-white px-2">
                      {format(selectedDate, 'MMM do')}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedDate(addDays(selectedDate, 1))} 
                      className="h-8 w-8 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
             </div>

             {selectedDayWorkouts.length > 0 ? (
                selectedDayWorkouts.map((workout, wIdx) => (
                  <div key={wIdx} className="relative z-10 space-y-4">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-850 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="space-y-1">
                           <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-primary/10 text-primary border-none font-semibold text-[10px] uppercase px-2 py-0.5">Performance Phase</Badge>
                           </div>
                           <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">{workout.title}</h4>
                           <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{workout.programName}</p>
                        </div>
                        <Button 
                           onClick={() => window.location.href = `/ams/athlete/workout/${workout.id}`}
                           className="bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 rounded-xl h-10 px-5 font-semibold text-xs tracking-wider gap-2 shadow-sm"
                        >
                           <span>Start Protocol</span>
                           <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {workout.items?.map((item: any, i: number) => {
                           const exerciseName = item[item.item_type]?.exercise?.name || "Movement";
                           const details = item.item_type === 'lift' ? `${item.lift_items?.sets || 0} x ${item.lift_items?.reps || 0}` : "Prescribed Movement";
                           return (
                             <div key={item.id || i} className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 shadow-xs">
                                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                   {i + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                   <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{exerciseName}</p>
                                   <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{details}</p>
                                </div>
                             </div>
                           );
                        })}
                     </div>
                  </div>
                ))
             ) : (
                <div className="flex flex-col items-center justify-center h-[260px] text-center space-y-3">
                   <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <Heart className="w-6 h-6" />
                   </div>
                   <div className="space-y-1">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">Rest & Recovery Day</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">No protocols prescribed for this date. Focus on hydration and mobility.</p>
                   </div>
                </div>
             )}
          </div>
       </div>

       {/* CALENDAR SIDEBAR (5 Cols) */}
       <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm space-y-4 border border-slate-200/90 dark:border-slate-800 flex flex-col items-center justify-center">
             <div className="w-full flex justify-between items-center px-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Calendar Sync</h4>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                   <CalendarIcon className="w-4 h-4" />
                </div>
             </div>

             <div className="bg-slate-50 dark:bg-slate-850 rounded-2xl p-3 border border-slate-200 dark:border-slate-800 w-fit">
                <MiniCalendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border-none text-slate-900 dark:text-white"
                  modifiers={{ hasWorkout: (date) => workoutDaysMap[format(date, 'yyyy-MM-dd')] }}
                  modifiersClassNames={{
                    hasWorkout: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full"
                  }}
                  classNames={{
                    head_cell: "text-slate-500 dark:text-slate-400 font-bold text-xs uppercase w-8",
                    cell: "text-center text-xs p-0 relative focus-within:relative focus-within:z-20 w-8 h-8",
                    day: "h-8 w-8 p-0 font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all",
                    day_selected: "bg-primary text-white hover:bg-primary shadow-xs font-bold",
                    day_today: "text-primary border border-primary/30",
                    nav: "text-slate-700 dark:text-slate-300 flex items-center justify-between mb-4",
                    caption: "text-xs font-bold uppercase tracking-wider mb-4 flex justify-center text-slate-700 dark:text-slate-300"
                  }}
                />
             </div>
          </div>
       </div>
    </div>
  );
}
