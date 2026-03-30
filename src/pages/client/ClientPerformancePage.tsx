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
  const [activeTab, setActiveTab] = useState("overview");

  const firstName = profile?.first_name || "Athlete";
  const hasAmsAccess = profile?.ams_role === "athlete" || profile?.ams_role === "client";

  useEffect(() => {
    if (session?.user?.id && hasAmsAccess) {
      Promise.all([fetchAssignments(), fetchWellnessLogs()]).finally(() => setLoading(false));
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [session?.user?.id, hasAmsAccess, authLoading]);

  const fetchAssignments = async () => {
    if (!session?.user?.id) return;
    try {
      console.log("PerformanceHub: Initiating Serialized Sync...");

      // 1. Get current user's identity
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('email, uhid')
        .eq('id', session.user.id)
        .single();

      if (!currentProfile?.email) throw new Error("User email not found");
      console.log("PerformanceHub: Syncing via context:", currentProfile.email);

      // 2. Fetch ALL athlete IDs for this identity (Email or UHID)
      const profileFilters = [`email.eq.${currentProfile.email}`];
      if (currentProfile.uhid) profileFilters.push(`uhid.eq.${currentProfile.uhid}`);

      const { data: linkedProfiles } = await supabase
        .from('profiles')
        .select('id')
        .or(profileFilters.join(','));

      const profileIds = linkedProfiles?.map(p => p.id) || [session.user.id];

      // 3. Serialized Fetch Phase 1: Individual Assignments
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
                lift_items(*, exercise:exercises(name))
              )
            )
          )
        `)
        .in('athlete_id', profileIds)
        .eq('status', 'active');

      if (err1) throw err1;

      // 4. Serialized Fetch Phase 2: Batch Assignments
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
                  lift_items(*, exercise:exercises(name))
                )
              )
            )
          `)
          .in('batch_id', batchIds)
          .eq('status', 'active');

        if (err2) throw err2;
        batchAssignments = bData || [];
      }

      // Final JS Consolidation
      const consolidated = [...(individualAssignments || []), ...batchAssignments];

      // Deduplicate by assignment ID
      const uniqueConsolidated = consolidated.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );

      console.log("PerformanceHub: Serialized sync complete. Found unique protocols:", uniqueConsolidated.length);
      setAssignedWorkouts(uniqueConsolidated);

      // Update Debug Trace
      (window as any).debugPerformanceHub = {
        email: currentProfile.email,
        profileIds,
        batchIds,
        protocols: uniqueConsolidated
      };

    } catch (error) {
      console.error("PerformanceHub: Serialized Sync Error:", error);
    }
  };

  // Logic to determine which days have workouts for the current month/view
  const getWorkoutDaysMap = () => {
    const map: Record<string, boolean> = {};
    assignedWorkouts.forEach((w: any) => {
      // Robustly parse the start_date to local midnight
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
        <header className="bg-slate-900 text-white p-8 sm:p-10 rounded-[45px] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12">
             <TrendingUp className="w-64 h-64" />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="bg-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.4em] px-4 py-1.5 rounded-full border border-primary/20">Elite Performance</span>
                <span className="text-white/40 font-black text-[10px] uppercase tracking-widest">{format(new Date(), 'EEEE, MMMM do')}</span>
              </div>
              <h1 className="text-5xl sm:text-6xl font-black tracking-tighter italic uppercase leading-none">
                PULSE <span className="text-primary">CONSOLE</span> <span className="text-white/10 font-thin">/</span> <span className="text-white/60">{firstName}</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
               <Dialog open={isManualLogOpen} onOpenChange={setIsManualLogOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-14 bg-white text-slate-900 hover:bg-white/90 rounded-2xl font-black uppercase text-[11px] tracking-[0.2em] px-8 gap-3 shadow-xl group/btn">
                      <Plus className="w-5 h-5 transition-transform group-hover/btn:rotate-90" /> Log Session
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-white rounded-[40px] p-0 overflow-hidden border-none shadow-2xl">
                     <DialogHeader className="p-8 bg-slate-900 text-white">
                        <DialogTitle className="text-2xl font-black flex items-center gap-3 italic uppercase italic">
                          <Dumbbell className="w-6 h-6 text-primary" />
                          Log Manual Activity
                        </DialogTitle>
                     </DialogHeader>
                     <div className="p-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                        <LogSessionForm onComplete={() => setIsManualLogOpen(false)} />
                     </div>
                  </DialogContent>
               </Dialog>
            </div>
          </div>
        </header>

        {/* MODULAR SUB-NAVIGATION */}
        <div className="bg-slate-100 p-2 rounded-[32px] flex flex-wrap gap-2 w-fit border border-slate-200 shadow-sm mx-auto">
           {[
             { id: 'overview', label: 'Overview', icon: Layout },
             { id: 'body', label: 'Body Status', icon: Map },
             { id: 'schedule', label: 'Training Schedule', icon: CalendarIcon },
             { id: 'analytics', label: 'Deep Analytics', icon: Activity }
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={cn(
                 "flex items-center gap-3 px-8 py-4 rounded-3xl font-black text-[11px] uppercase tracking-widest transition-all duration-300",
                 activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-2xl scale-105"
                  : "text-slate-500 hover:bg-slate-200"
               )}
             >
               <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-primary" : "text-slate-400")} />
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
                 todayWorkout={assignedWorkouts.flatMap(w => {
                   const start = parseISO(w.start_date);
                   const diffDays = differenceInCalendarDays(startOfDay(new Date()), startOfDay(start));
                   if (diffDays >= 0 && w.program?.days) {
                     const workoutDay = w.program.days.find((d: any) => d.display_order === diffDays);
                     if (workoutDay) return [{ ...workoutDay, programName: w.program.name }];
                   }
                   return [];
                 })[0]}
                onStartCheckin={() => setActiveTab('analytics')} // Analytics tab has the form or I should put it in Overview
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
             <div className="space-y-8">
               <div className="bg-white rounded-[45px] p-10 shadow-2xl border border-slate-50">
                  <div className="flex items-center justify-between mb-12">
                     <div>
                        <h3 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Health Check-in</h3>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Status Calibration</p>
                     </div>
                     <div className="w-16 h-16 bg-slate-900 rounded-[28px] flex items-center justify-center">
                        <Activity className="w-8 h-8 text-primary" />
                     </div>
                  </div>
                  <WellnessCheckinForm onComplete={fetchAssignments} />
               </div>
               <div className="bg-white rounded-[45px] p-10 shadow-2xl border border-slate-100">
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

function PulseOverview({ readinessScore, wellnessLogs, todayWorkout, onStartCheckin }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
       {/* Readiness Gauge */}
       <div className="lg:col-span-8 glass-card bg-white rounded-[45px] p-10 border-none shadow-xl flex flex-col justify-between group overflow-hidden relative min-h-[450px]">
          <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:scale-110 transition-transform duration-700">
             <Zap className="w-64 h-64" />
          </div>

          <div className="flex items-center justify-between mb-4 relative z-10">
             <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Daily Readiness</h3>
             <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-full border border-primary/10">
                <Activity className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Live Sync</span>
             </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-12 flex-1 relative z-10">
             <div className="relative flex items-center justify-center shrink-0">
                <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full scale-50 group-hover:scale-100 transition-transform duration-1000 opacity-40" />
                <div className="w-56 h-56 rounded-full border-[14px] border-slate-50 flex flex-col items-center justify-center relative shadow-inner">
                   <svg className="absolute inset-[-14px] rotate-[-90deg] w-[252px] h-[252px] drop-shadow-[0_0_15px_rgba(20,184,166,0.4)]">
                      <circle
                        cx="126"
                        cy="126"
                        r="112"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="14"
                        strokeDasharray={2 * Math.PI * 112}
                        strokeDashoffset={2 * Math.PI * 112 * (1 - readinessScore / 100)}
                        className="text-primary transition-all duration-1000 ease-out"
                        strokeLinecap="round"
                      />
                   </svg>
                   <span className="text-7xl font-black text-slate-900 italic tracking-tighter leading-none">{readinessScore}</span>
                   <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Percent</span>
                </div>
             </div>

             <div className="flex-1 w-full flex flex-col justify-center gap-8">
                {wellnessLogs.length > 0 ? (
                  <div className="h-[280px] w-full bg-slate-50/50 rounded-[40px] p-6 border border-slate-100/50">
                     <WellnessRadarChart logs={wellnessLogs} />
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-[40px] p-10 text-center space-y-4 border border-dashed border-slate-200">
                     <Info className="w-10 h-10 text-slate-200 mx-auto" />
                     <p className="text-sm font-bold text-slate-400 leading-relaxed">No data recorded for today yet. Complete your performance pulse.</p>
                     <Button onClick={onStartCheckin} className="bg-slate-900 text-white rounded-2xl h-12 px-8 font-black uppercase text-[10px] tracking-[0.2em]">Start Check-in</Button>
                  </div>
                )}
             </div>
          </div>
       </div>

       {/* Protocol Sidebar */}
       <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-slate-900 rounded-[45px] p-10 text-white flex flex-col justify-between group overflow-hidden relative shadow-2xl flex-1 border border-white/5">
             <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-1000">
                <Dumbbell className="w-40 h-40" />
             </div>

             <div className="relative z-10">
               <span className="text-primary font-black uppercase tracking-[0.3em] text-[10px] mb-6 block">Current Protocol</span>
               <h2 className="text-4xl font-black italic tracking-tighter leading-tight mb-6 uppercase">
                  {todayWorkout ? todayWorkout.title : "Recovery State"}
               </h2>
               <p className="text-white/40 text-lg font-medium leading-relaxed max-w-[280px]">
                  {todayWorkout
                    ? "Your coach has assigned a high-intensity protocol today."
                    : "Focus on active tissue health and mobility metrics."}
               </p>
             </div>

             <div className="relative z-10 pt-10">
               {todayWorkout ? (
                 <Button
                    onClick={() => window.location.href = `/ams/athlete/workout/${todayWorkout.id}`}
                    className="w-full h-20 bg-primary hover:bg-primary/90 text-white rounded-[30px] font-black text-xl gap-3 shadow-[0_15px_50px_-5px_rgba(20,184,166,0.4)] group-hover:translate-y-[-6px] transition-all italic uppercase tracking-tighter"
                 >
                    Launch <ArrowRight className="w-8 h-8" />
                 </Button>
               ) : (
                 <Button
                    onClick={onStartCheckin}
                    className="w-full h-16 bg-white/10 hover:bg-white/20 text-white rounded-[28px] font-black text-[12px] uppercase tracking-[0.2em] gap-4 transition-all"
                 >
                    Perform Check-in <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                 </Button>
               )}
             </div>
          </div>

      </div>
    </div>
  );
}

function BodyStatusView({ clientId }: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in-95 duration-500">
       <div className="lg:col-span-12 glass-card bg-white rounded-[45px] p-10 border-none shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03]">
             <Map className="w-64 h-64" />
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6 relative z-10">
             <div>
                <h3 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 underline decoration-primary/30 decoration-8 underline-offset-8">Physical Status</h3>
                <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.3em] mt-2">Latest Hotspots & Soreness Calibration</p>
             </div>
             <div className="flex items-center gap-3">
                <Badge variant="outline" className="border-red-200 text-red-500 bg-red-50 px-4 py-2 font-black uppercase text-[10px]">High Sensitivity Detected</Badge>
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center">
                   <AlertTriangle className="w-7 h-7 text-amber-500" />
                </div>
             </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-12 items-start relative z-10">
             <div className="flex-1 w-full bg-slate-50 rounded-[40px] p-10 flex flex-col items-center justify-center border border-slate-100 min-h-[500px]">
                <div className="scale-125 origin-center">
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
      // Use local-time normalization for both to avoid timezone shift
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in slide-in-from-right-8 duration-500 pb-20">
       
       {/* TIMELINE (6 Cols) */}
       <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-[45px] border border-slate-100 shadow-2xl p-10 space-y-10 relative group min-h-[600px] overflow-hidden">
             <div className="absolute left-10 top-24 bottom-24 w-px bg-slate-100 z-0" />
             
             <div className="flex items-center justify-between relative z-10 px-4">
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-primary shadow-xl">
                      <CalendarIcon className="w-7 h-7" />
                   </div>
                   <div>
                      <h3 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Training Timeline</h3>
                      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Prescribed Protocols</p>
                   </div>
                </div>
                <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="rounded-xl"><ChevronLeft className="w-5 h-5" /></Button>
                    <span className="text-sm font-black uppercase tracking-widest px-4 italic">{format(selectedDate, 'MMMM do')}</span>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="rounded-xl"><ChevronRight className="w-5 h-5" /></Button>
                </div>
             </div>

             {selectedDayWorkouts.length > 0 ? (
                selectedDayWorkouts.map((workout, wIdx) => (
                  <div key={wIdx} className="relative z-10 pl-16 space-y-10">
                     <div className="absolute left-[-5px] top-4 w-3 h-3 rounded-full bg-primary shadow-[0_0_15px_rgba(20,184,166,1)] ring-4 ring-white" />
                     
                     <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50 p-8 rounded-[40px] border border-slate-100">
                        <div>
                           <div className="flex items-center gap-3 mb-2">
                              <Badge className="bg-primary text-white border-none font-black text-[9px] uppercase tracking-widest px-3">Performance Phase</Badge>
                              <span className="text-slate-300 font-black text-[10px] uppercase tracking-widest">Protocol {wIdx + 1}</span>
                           </div>
                           <h4 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">{workout.title}</h4>
                           <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.4em] mt-3">{workout.programName}</p>
                        </div>
                        <Button 
                           onClick={() => window.location.href = `/ams/athlete/workout/${workout.id}`}
                           className="bg-slate-900 text-white hover:bg-slate-800 rounded-3xl h-14 px-10 font-black text-xs uppercase tracking-[0.2em] gap-3 shadow-2xl group/link"
                        >
                           Open Protocol <ArrowRight className="w-5 h-5 transition-transform group-hover/link:translate-x-2" />
                        </Button>
                     </div>

                     <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {workout.items?.map((item: any, i: number) => {
                           const exerciseName = item[item.item_type]?.exercise?.name || "Movement";
                           const details = item.item_type === 'lift' ? `${item.lift_items.sets} x ${item.lift_items.reps}` : "Tactical Flow";
                           return (
                             <div key={item.id} className="p-6 bg-white rounded-[32px] border border-slate-100 hover:border-primary/30 hover:shadow-2xl transition-all group/item">
                                <div className="flex items-center gap-5">
                                   <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200 group-hover/item:text-primary group-hover/item:bg-primary/5 transition-all text-sm font-black border border-slate-100">
                                      {i + 1}
                                   </div>
                                   <div>
                                      <p className="text-xs font-black text-slate-900 leading-tight mb-1.5 uppercase tracking-tighter">{exerciseName}</p>
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{details}</p>
                                   </div>
                                </div>
                             </div>
                           );
                        })}
                     </div>
                  </div>
                ))
             ) : (
                <div className="flex flex-col items-center justify-center h-[500px] text-center space-y-8 group/empty">
                   <div className="w-32 h-32 rounded-[45px] bg-slate-50 flex items-center justify-center text-slate-200 scale-110 rotate-6 group-hover/empty:rotate-0 transition-all duration-1000 shadow-inner">
                      <Heart className="w-16 h-16 opacity-20" />
                   </div>
                   <div className="space-y-3">
                      <h4 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">Rest Calibration</h4>
                      <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.2em] max-w-[300px] mx-auto leading-relaxed">No protocols prescribed for {format(selectedDate, 'MMM do')}. Priority: Biometric Recovery.</p>
                   </div>
                </div>
             )}
          </div>
       </div>

       {/* CALENDAR SIDEBAR (6 Cols) */}
       <div className="lg:col-span-6 space-y-6">
          <div className="glass-card bg-white rounded-[45px] p-8 shadow-2xl space-y-8 border-none relative overflow-hidden group">
             <div className="absolute top-0 left-0 p-10 opacity-[0.03] scale-150 rotate-[-12deg]">
                <CalendarIcon className="w-48 h-48 text-slate-900" />
             </div>
             
             <div className="flex justify-between items-center relative z-10">
                <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Schedule Sync</h4>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                   <CalendarIcon className="w-4 h-4 text-primary" />
                </div>
             </div>

             <div className="bg-slate-50/50 rounded-[40px] p-2 border border-slate-100 relative z-10 shadow-inner flex justify-center">
                <MiniCalendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  className="rounded-md border-none"
                  modifiers={{ hasWorkout: (date) => workoutDaysMap[format(date, 'yyyy-MM-dd')] }}
                  modifiersClassNames={{
                    hasWorkout: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full after:shadow-[0_0_5px_rgba(20,184,166,0.8)]"
                  }}
                  classNames={{
                    head_cell: "text-slate-400 font-black text-[10px] uppercase w-9",
                    cell: "text-center text-xs p-0 relative focus-within:relative focus-within:z-20 w-9 h-9",
                    day: "h-9 w-9 p-0 font-bold aria-selected:opacity-100 hover:bg-slate-200 rounded-full transition-all text-slate-600",
                    day_selected: "bg-slate-900 text-white hover:bg-slate-800 focus:bg-slate-900 shadow-2xl",
                    day_today: "text-primary border border-primary/20",
                    nav: "text-slate-900 flex items-center justify-between mb-6",
                    caption: "text-sm font-black uppercase tracking-widest mb-6 flex justify-center italic text-slate-900"
                  }}
                />
             </div>
          </div>
       </div>

    </div>
  );
}
