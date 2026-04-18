import React, { useState, useEffect, useRef } from "react";
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
  Layout, User, Map
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar as MiniCalendar } from "@/components/ui/calendar";

export default function ClientPerformancePage() {
  const { session, profile, loading: authLoading } = useAuth();
  const [assignedWorkouts, setAssignedWorkouts] = useState<any[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isManualLogOpen, setIsManualLogOpen] = useState(false);
  const [isWellnessDialogOpen, setIsWellnessDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const firstName = profile?.first_name || "Athlete";
  const hasAmsAccess = profile?.ams_role === "athlete" || profile?.ams_role === "client";

  const fetchPrs = async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await (supabase as any)
        .from('max_pr_records')
        .select(`
          exercise_id,
          value,
          exercise:exercises(name)
        `)
        .eq('athlete_id', session.user.id)
        .eq('is_current', true)
        .order('updated_at', { ascending: false });
      
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
    if (session?.user?.id && hasAmsAccess) {
      Promise.all([fetchAssignments(), fetchWellnessLogs(), fetchPrs()]).finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [session?.user?.id, hasAmsAccess, authLoading]);

  const fetchAssignments = async () => {
    if (!session?.user?.id) return;
    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('email, uhid')
        .eq('id', session.user.id)
        .single();

      if (!currentProfile?.email) throw new Error("User email not found");

      const profileFilters = [`email.eq.${currentProfile.email}`];
      if (currentProfile.uhid) profileFilters.push(`uhid.eq.${currentProfile.uhid}`);

      const { data: linkedProfiles } = await supabase
        .from('profiles')
        .select('id')
        .or(profileFilters.join(','));

      const profileIds = linkedProfiles?.map(p => p.id) || [session.user.id];

      const { data: individualAssignments, error: err1 } = await supabase
        .from('program_assignments' as any)
        .select(`
          *,
          program:training_programs(
            *,
            days:workout_days(
              *,
              items:workout_items(
                *,
                lift:lift_items(*, exercise:exercises(name))
              )
            )
          )
        `)
        .in('athlete_id', profileIds)
        .eq('status', 'active');

      if (err1) throw err1;

      const { data: batchMemberships } = await supabase
        .from('batch_members' as any)
        .select('batch_id')
        .in('athlete_id', profileIds);

      const batchIds = (batchMemberships as any)?.map((m: any) => m.batch_id) || [];

      let batchAssignments: any[] = [];
      if (batchIds.length > 0) {
        const { data: bData, error: err2 } = await supabase
          .from('program_assignments' as any)
          .select(`
            *,
            program:training_programs(
              *,
              days:workout_days(
                *,
                items:workout_items(
                  *,
                  lift:lift_items(*, exercise:exercises(name))
                )
              )
            )
          `)
          .in('batch_id', batchIds)
          .eq('status', 'active');

        if (err2) throw err2;
        batchAssignments = bData || [];
      }

      const consolidated = [...(individualAssignments || []), ...batchAssignments];
      const uniqueConsolidated = consolidated.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );

      setAssignedWorkouts(uniqueConsolidated);
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

  const fetchWellnessLogs = async () => {
    try {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const { data, error } = await supabase
        .from("wellness_logs")
        .select("*")
        .eq("athlete_id", session?.user?.id)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false });

      if (error) throw error;
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
        <header className="bg-[#1A1F26] text-white p-6 sm:p-8 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em]">Elite Performance</span>
                <span className="text-white/20 font-bold text-[9px] uppercase tracking-wider">{format(new Date(), 'EEEE, MMMM do')}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white/90">
                PULSE <span className="text-primary italic">CONSOLE</span> <span className="text-white/20 font-light mx-2">/</span> <span className="text-white/60">{firstName}</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
               <Dialog open={isWellnessDialogOpen} onOpenChange={setIsWellnessDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="h-11 border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider px-6 gap-2">
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" /> Check-in
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl bg-slate-950 rounded-2xl p-0 overflow-hidden border border-white/10 shadow-2xl">
                     <DialogHeader className="p-6 bg-[#1A1F26] text-white border-b border-white/5">
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 uppercase italic">
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
                    <Button className="h-11 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl font-bold uppercase text-[10px] tracking-wider px-6 gap-2 border-none">
                      <Plus className="w-4 h-4" /> Log Session
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl bg-white rounded-2xl p-0 overflow-hidden border-none shadow-2xl text-slate-900">
                     <DialogHeader className="p-6 bg-slate-900 text-white">
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 uppercase italic">
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
        <div className="bg-slate-900 p-1.5 rounded-2xl flex flex-wrap gap-1.5 w-fit border border-white/5 mx-auto shadow-2xl">
           {[
             { id: 'overview', label: 'Overview', icon: Layout },
             { id: 'body', label: 'Body', icon: Map },
             { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
             { id: 'analytics', label: 'Analytics', icon: Activity }
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={cn(
                 "flex items-center gap-2.5 px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all",
                 activeTab === tab.id
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
               )}
             >
               <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-white" : "text-primary/60")} />
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
                 todayWorkout={assignedWorkouts.flatMap(w => {
                   const start = parseISO(w.start_date);
                   const diffDays = differenceInCalendarDays(startOfDay(new Date()), startOfDay(start));
                   if (diffDays >= 0 && w.program?.days) {
                     const workoutDay = w.program.days.find((d: any) => d.display_order === diffDays);
                     if (workoutDay) return [{ ...workoutDay, programName: w.program.name }];
                   }
                   return [];
                 })[0]}
             />
           )}
           {activeTab === 'body' && <BodyStatusView clientId={session?.user?.id} />}
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
                  {session?.user?.id && <PerformanceAnalytics athleteId={session.user.id} />}
               </div>
             </div>
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
       <div className="lg:col-span-8 bg-[#1A1F26] rounded-2xl p-8 border border-white/5 shadow-xl flex flex-col justify-between group overflow-hidden relative min-h-[400px]">
          <div className="flex items-center justify-between mb-2 relative z-10">
             <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/20 italic">Daily Readiness</h3>
             <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10">
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Live</span>
             </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-8 flex-1 relative z-10">
             <div className="relative flex items-center justify-center shrink-0">
                <div className="w-44 h-44 rounded-full border-8 border-white/5 flex flex-col items-center justify-center relative shadow-inner">
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
                   <span className="text-5xl font-bold text-white italic tracking-tighter leading-none">{readinessScore}</span>
                   <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-1">Percent</span>
                </div>
             </div>

             <div className="flex-1 w-full flex flex-col justify-center gap-4">
                {wellnessLogs.length > 0 ? (
                  <div className="h-[320px] w-full flex items-center justify-center">
                     <WellnessRadarChart logs={wellnessLogs} />
                  </div>
                ) : (
                  <div className="bg-white/5 rounded-2xl p-8 text-center space-y-4 border border-dashed border-white/10">
                     <p className="text-xs font-medium text-white/20 leading-relaxed">No data for today yet.</p>
                     <Button onClick={onStartCheckin} className="bg-primary text-white rounded-xl h-10 px-6 font-bold uppercase text-[9px] tracking-wider">Start Check-in</Button>
                  </div>
                )}
             </div>
          </div>
       </div>

       {/* Protocol Sidebar */}
       <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#1A1F26] rounded-2xl p-8 text-white flex flex-col justify-between group relative shadow-xl flex-1 border border-white/5">
             <div className="relative z-10">
               <span className="text-primary font-bold uppercase tracking-wider text-[9px] mb-4 block">Current Protocol</span>
               <h2 className="text-2xl font-bold italic tracking-tight leading-tight mb-4 uppercase text-white/90">
                  {todayWorkout ? todayWorkout.title : "Recovery State"}
               </h2>
               <p className="text-white/40 text-sm font-medium leading-relaxed">
                  {todayWorkout
                    ? "Assigned high-intensity protocol for today."
                    : "Focus on active tissue health and mobility metrics."}
               </p>
             </div>
 
             <div className="relative z-10 pt-6">
               {todayWorkout ? (
                 <Button
                    onClick={() => window.location.href = `/ams/athlete/workout/${todayWorkout.id}`}
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-lg gap-2 transition-all italic uppercase tracking-tight shadow-lg shadow-primary/20"
                 >
                    Launch <ArrowRight className="w-5 h-5" />
                 </Button>
               ) : (
                 <Button
                    onClick={onStartCheckin}
                    className="w-full h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider gap-3 transition-all"
                 >
                    Check-in <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                 </Button>
               )}
             </div>
          </div>

          <div className="bg-[#1A1F26] rounded-2xl p-8 text-white border border-white/5 shadow-xl flex-1">
             <div className="flex items-center justify-between mb-6">
                <span className="text-primary font-bold uppercase tracking-wider text-[9px]">Personal Records</span>
                <TrendingUp className="w-4 h-4 text-white/20" />
             </div>
             <div className="space-y-4 max-h-[160px] overflow-y-auto no-scrollbar">
                {Object.entries(prs).length > 0 ? (
                  Object.entries(prs).map(([id, pr]: any) => (
                    <div key={id} className="flex items-center justify-between border-b border-white/5 pb-3">
                       <span className="text-xs font-bold text-white/60 tracking-tight uppercase">{pr.name || "Lift"}</span>
                       <span className="text-sm font-black italic text-primary">{pr.value} <small className="text-[10px] uppercase opacity-40 not-italic ml-1">KG</small></span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-white/20 font-medium italic">No PRs recorded yet.</p>
                )}
             </div>
          </div>
       </div>
    </div>
  );
}

function BodyStatusView({ clientId }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in zoom-in-95 duration-500">
       <div className="lg:col-span-12 bg-[#1A1F26] rounded-2xl p-8 border border-white/5 shadow-xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6 relative z-10">
             <div>
                <h3 className="text-2xl font-bold italic uppercase tracking-tight text-white mb-1">Physical Status</h3>
                <p className="text-white/20 font-bold uppercase text-[9px] tracking-widest">Latest Hotspots & Soreness Calibration</p>
             </div>
             <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-red-500/20 text-red-400 bg-red-500/5 px-3 py-1 font-bold uppercase text-[9px]">Sensitivity Detected</Badge>
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                   <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
             </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-8 items-start relative z-10">
             <div className="flex-1 w-full bg-white/[0.02] rounded-2xl p-8 flex flex-col items-center justify-center border border-white/5 min-h-[400px]">
                <div className="scale-110 origin-center">
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-right-8 duration-500 pb-20">
       
       {/* TIMELINE (6 Cols) */}
       <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#1A1F26] rounded-2xl border border-white/5 shadow-xl p-8 space-y-8 relative group min-h-[500px] overflow-hidden">
             <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                      <CalendarIcon className="w-5 h-5" />
                   </div>
                   <div>
                      <h3 className="text-xl font-bold italic uppercase tracking-tight text-white">Timeline</h3>
                      <p className="text-white/20 font-bold uppercase text-[9px] tracking-widest mt-1">Protocols</p>
                   </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-white/10 shadow-inner">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedDate(subDays(selectedDate, 1))} 
                      className="h-8 w-8 rounded-lg text-white hover:text-primary hover:bg-white/5 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 italic text-white/90">
                      {format(selectedDate, 'MMM do')}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedDate(addDays(selectedDate, 1))} 
                      className="h-8 w-8 rounded-lg text-white hover:text-primary hover:bg-white/5 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
             </div>

             {selectedDayWorkouts.length > 0 ? (
                selectedDayWorkouts.map((workout, wIdx) => (
                  <div key={wIdx} className="relative z-10 space-y-6">
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                        <div className="space-y-1">
                           <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-primary/20 text-primary border border-primary/20 font-bold text-[8px] uppercase tracking-widest px-2">Performance Phase</Badge>
                           </div>
                           <h4 className="text-xl font-bold italic uppercase tracking-tight text-white/90">{workout.title}</h4>
                           <p className="text-white/20 font-bold uppercase text-[9px] tracking-widest italic">{workout.programName}</p>
                        </div>
                        <Button 
                           onClick={() => window.location.href = `/ams/athlete/workout/${workout.id}`}
                           className="bg-white text-slate-900 hover:bg-white/90 rounded-xl h-11 px-6 font-bold text-[10px] uppercase tracking-wider gap-2 shadow-xl"
                        >
                           Start Protocol <ArrowRight className="w-4 h-4" />
                        </Button>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {workout.items?.map((item: any, i: number) => {
                           const exerciseName = item[item.item_type]?.exercise?.name || "Movement";
                           const details = item.item_type === 'lift' ? `${item.lift_items?.sets || 0} x ${item.lift_items?.reps || 0}` : "Tactical Flow";
                           return (
                             <div key={item.id} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:border-primary/30 transition-all flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold border border-white/5 text-white/20">
                                   {i + 1}
                                </div>
                                <div>
                                   <p className="text-[10px] font-bold text-white uppercase tracking-tighter truncate w-32">{exerciseName}</p>
                                   <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{details}</p>
                                </div>
                             </div>
                           );
                        })}
                     </div>
                  </div>
                ))
             ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-6">
                   <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-white/10 shadow-inner">
                      <Heart className="w-8 h-8" />
                   </div>
                   <div className="space-y-1">
                      <h4 className="text-lg font-bold italic uppercase tracking-tight text-white/40">Rest & Recovery</h4>
                      <p className="text-white/20 font-bold uppercase text-[9px] tracking-widest max-w-[200px] mx-auto">No protocols prescribed for this date.</p>
                   </div>
                </div>
             )}
          </div>
       </div>

       {/* CALENDAR SIDEBAR (5 Cols) */}
       <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#1A1F26] rounded-2xl p-6 shadow-xl space-y-6 border border-white/5 flex flex-col items-center justify-center">
             <div className="w-full flex justify-between items-center px-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/20 italic">Sync</h4>
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                   <CalendarIcon className="w-4 h-4 text-primary" />
                </div>
             </div>

             <div className="bg-white/5 rounded-2xl p-3 border border-white/5 w-fit">
                <MiniCalendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border-none text-white"
                  modifiers={{ hasWorkout: (date) => workoutDaysMap[format(date, 'yyyy-MM-dd')] }}
                  modifiersClassNames={{
                    hasWorkout: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full"
                  }}
                  classNames={{
                    head_cell: "text-white/20 font-bold text-[10px] uppercase w-8",
                    cell: "text-center text-xs p-0 relative focus-within:relative focus-within:z-20 w-8 h-8",
                    day: "h-8 w-8 p-0 font-bold aria-selected:opacity-100 hover:bg-white/10 rounded-lg transition-all text-white/60",
                    day_selected: "bg-primary text-white hover:bg-primary shadow-lg shadow-primary/20",
                    day_today: "text-primary border border-primary/20",
                    nav: "text-white flex items-center justify-between mb-4",
                    caption: "text-[10px] font-bold uppercase tracking-widest mb-4 flex justify-center italic text-white/40"
                  }}
                />
             </div>
          </div>
       </div>
    </div>
  );
}
