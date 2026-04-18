import React, { useState, useEffect } from "react";
import MobileLayout from "@/components/layout/MobileLayout";
import { useNavigate } from "react-router-dom";
import WellnessCheckinForm from "@/components/ams/WellnessCheckinForm";
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
  Activity, Dumbbell, Heart, Calendar as CalendarIcon,
  ArrowRight, Plus, ShieldX, Loader2, ChevronLeft, ChevronRight,
  Star, TrendingUp, Layout, Map, Info, Zap
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

export default function MobilePerformancePage() {
  const { session, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [assignedWorkouts, setAssignedWorkouts] = useState<any[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isWellnessDialogOpen, setIsWellnessDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [prs, setPrs] = useState<Record<string, any>>({});

  const hasAmsAccess = profile?.ams_role === "athlete" || profile?.ams_role === "client";

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
      const { data: assignments, error } = await supabase
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
        .eq('athlete_id', session.user.id)
        .eq('status', 'active');

      if (error) throw error;
      setAssignedWorkouts(assignments || []);
    } catch (error) {
      console.error("Assignments Error:", error);
    }
  };

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
    } catch (error) {
      console.error("Wellness Error:", error);
    }
  };

  const fetchPrs = async () => {
    if (!session?.user?.id) return;
    try {
      const { data } = await (supabase as any)
        .from('max_pr_records')
        .select('exercise_id, value, exercise:exercises(name)')
        .eq('athlete_id', session.user.id)
        .eq('is_current', true);
      
      setPrs(data?.reduce((acc: any, pr: any) => ({
        ...acc,
        [pr.exercise_id]: { value: pr.value, name: pr.exercise?.name }
      }), {}) || {});
    } catch (error) {
      console.error("PRs Error:", error);
    }
  };

  const calculateReadiness = () => {
    if (wellnessLogs.length === 0) return 0;
    const latest = wellnessLogs[0];
    const score = (latest.sleep_score + (11 - latest.stress_level) + (11 - latest.fatigue_level) + (11 - latest.soreness_level)) / 4;
    return Math.round(score * 10);
  };

  if (loading) {
     return <div className="flex items-center justify-center min-h-screen bg-slate-950"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  return (
    <MobileLayout>
      <div className="space-y-6 pb-20">
        
        {/* Mobile Header with Quick Actions */}
        <header className="flex flex-col gap-4">
           <div className="flex items-center justify-between">
              <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-tight">ISHPO <span className="text-primary text-4xl">Workout</span></h1>
              <div className="flex gap-2">
                 <Button onClick={() => setIsWellnessDialogOpen(true)} size="icon" className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                    <Heart className="w-5 h-5" />
                 </Button>
                 <Button onClick={() => window.location.href = '/mobile/client/log-activity'} size="icon" className="w-10 h-10 rounded-xl bg-white text-slate-900">
                    <Plus className="w-5 h-5" />
                 </Button>
              </div>
           </div>
        </header>

        {/* Mobile Sub-Nav */}
        <div className="sticky top-20 z-40 py-2 -mx-4 px-4 bg-slate-950/50 backdrop-blur-md overflow-x-auto no-scrollbar flex gap-2">
           {[
             { id: 'overview', label: 'Overview', icon: Layout },
             { id: 'body', label: 'Body', icon: Map },
             { id: 'schedule', label: 'Log', icon: CalendarIcon },
             { id: 'analytics', label: 'Analytics', icon: Activity }
           ].map((tab) => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={cn(
                 "flex items-center gap-2 px-6 py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all shrink-0 border",
                 activeTab === tab.id
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                  : "bg-white/5 border-white/5 text-slate-500"
               )}
             >
               <tab.icon className="w-3.5 h-3.5" />
               {tab.label}
             </button>
           ))}
        </div>

        {/* Dynamic Content */}
        <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           {activeTab === 'overview' && (
             <div className="space-y-6">
                {/* Readiness Gauge */}
                <div className="p-8 bg-white/[0.03] rounded-[40px] border border-white/5 flex flex-col items-center gap-6 text-center relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Zap className="w-32 h-32" />
                   </div>
                   <div className="relative flex items-center justify-center">
                      <div className="w-40 h-40 rounded-full border-8 border-white/5 flex flex-col items-center justify-center">
                         <svg className="absolute inset-[-8px] rotate-[-90deg] w-[176px] h-[176px] pointer-events-none">
                            <circle
                              cx="88" cy="88" r="80"
                              fill="transparent" stroke="currentColor" strokeWidth="8"
                              strokeDasharray={2 * Math.PI * 80}
                              strokeDashoffset={2 * Math.PI * 80 * (1 - calculateReadiness() / 100)}
                              className="text-primary transition-all duration-1000"
                              strokeLinecap="round"
                            />
                         </svg>
                         <span className="text-5xl font-black text-white italic tracking-tighter">{calculateReadiness()}%</span>
                         <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Readiness</span>
                      </div>
                   </div>
                   {wellnessLogs.length > 0 ? (
                      <div className="w-full h-[200px] flex items-center justify-center">
                         <WellnessRadarChart logs={wellnessLogs} />
                      </div>
                   ) : (
                      <div className="space-y-4">
                         <p className="text-xs font-bold text-slate-500 italic">No check-in data today</p>
                         <Button onClick={() => setIsWellnessDialogOpen(true)} className="rounded-2xl bg-primary text-white font-black uppercase text-[10px] tracking-widest px-8">Start Check-in</Button>
                      </div>
                   )}
                </div>

                {/* PR Cards */}
                <div className="space-y-4">
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-2 italic">Personal Records</h3>
                   <div className="grid grid-cols-2 gap-3">
                      {Object.entries(prs).map(([id, pr]: any) => (
                        <div key={id} className="p-5 bg-white/5 rounded-3xl border border-white/5">
                           <p className="text-[8px] font-black uppercase text-slate-500 mb-1">{pr.name}</p>
                           <p className="text-2xl font-black italic text-primary">{pr.value} <small className="text-[10px] opacity-40 not-italic">KG</small></p>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'body' && (
             <div className="p-6 bg-white/[0.03] rounded-[40px] border border-white/5 min-h-[400px] flex flex-col items-center">
                <div className="w-full text-center space-y-2 mb-8">
                   <h3 className="text-xl font-black italic text-white uppercase italic">Body Status</h3>
                   <Badge className="bg-amber-500/20 text-amber-500 border-none">Visual Calibration</Badge>
                </div>
                <div className="scale-90 origin-top">
                   <PerformanceSnapshot clientId={session?.user?.id} />
                </div>
             </div>
           )}

           {activeTab === 'schedule' && (
             <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                   <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Protocol Timeline</h3>
                   <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={() => setSelectedDate(subDays(selectedDate, 1))}><ChevronLeft className="w-4 h-4" /></Button>
                      <span className="text-[9px] font-black text-white px-2 italic">{format(selectedDate, 'MMM do')}</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-white" onClick={() => setSelectedDate(addDays(selectedDate, 1))}><ChevronRight className="w-4 h-4" /></Button>
                   </div>
                </div>

                <div className="space-y-4">
                   {assignedWorkouts.flatMap(w => {
                     const start = parseISO(w.start_date);
                     const diff = differenceInCalendarDays(startOfDay(selectedDate), startOfDay(start));
                     const workoutDay = w.program?.days?.find((d: any) => d.display_order === diff);
                     return workoutDay ? [{ ...workoutDay, programId: w.id }] : [];
                   }).map((workout, idx) => (
                     <div key={idx} className="p-6 bg-slate-900 rounded-[32px] border border-white/5 space-y-6">
                        <div className="space-y-1">
                           <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase tracking-widest mb-2">Prescribed Program</Badge>
                           <h4 className="text-2xl font-black italic text-white leading-tight uppercase tracking-tighter">{workout.title}</h4>
                        </div>
                        <div className="space-y-2">
                           {workout.items?.slice(0, 3).map((item: any, i: number) => (
                              <div key={item.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                 <span className="text-[9px] font-black text-slate-600">{i+1}</span>
                                 <p className="text-xs font-bold text-white uppercase italic tracking-tighter truncate">{item[item.item_type]?.exercise?.name || "Exercise"}</p>
                              </div>
                           ))}
                        </div>
                        <Button 
                          onClick={() => navigate(`/mobile/client/workout/${workout.id}`)}
                          className="w-full h-14 bg-white text-slate-900 font-black italic uppercase text-sm tracking-tight rounded-2xl gap-2"
                        >
                           Launch Session <ArrowRight className="w-5 h-5" />
                        </Button>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {activeTab === 'analytics' && (
             <div className="space-y-6">
                <div className="p-8 bg-white/[0.03] rounded-[40px] border border-white/5">
                   <div className="mb-6 flex items-center justify-between">
                       <h3 className="text-xl font-black italic uppercase text-white italic">Health Input</h3>
                       <Activity className="w-5 h-5 text-primary" />
                   </div>
                   <WellnessCheckinForm onComplete={fetchWellnessLogs} />
                </div>
                <div className="p-6 bg-slate-900 rounded-[40px] border border-white/5">
                    {session?.user?.id && <PerformanceAnalytics athleteId={session.user.id} />}
                </div>
             </div>
           )}
        </main>
      </div>

      {/* Wellness Sheet Overlay */}
      <Dialog open={isWellnessDialogOpen} onOpenChange={setIsWellnessDialogOpen}>
         <DialogContent className="max-w-md bg-slate-950 border-white/10 p-0 text-white overflow-hidden">
            <DialogHeader className="p-6 bg-[#1A1F26] border-b border-white/10">
               <DialogTitle className="flex items-center gap-2 font-black italic uppercase tracking-tighter">
                  <Heart className="w-5 h-5 text-primary" /> Health Log
               </DialogTitle>
            </DialogHeader>
            <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
               <WellnessCheckinForm onComplete={() => {
                 setIsWellnessDialogOpen(false);
                 fetchWellnessLogs();
               }} />
            </div>
         </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
