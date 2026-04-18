import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WellnessCheckinForm from "@/components/ams/WellnessCheckinForm";
import LogSessionForm from "@/components/ams/LogSessionForm";
import PerformanceSnapshot from "@/components/consultant/PerformanceSnapshot";
import PerformanceAnalytics from "@/components/ams/PerformanceAnalytics";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Activity, Dumbbell, Heart, TrendingUp, Calendar, Zap, Award, 
  CheckCircle2, Clock, ChevronRight, ArrowRight, Star
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScientificResourcesManager } from "@/components/sports-scientist/resources/ScientificResourcesManager";

export default function AthleteDashboard() {
  const { session, profile: currentUserProfile, roles, clientId } = useAuth();
  const [assignedProgram, setAssignedProgram] = useState<any>(null);
  const [todayWorkout, setTodayWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  const todayDate = format(new Date(), 'EEEE, MMMM do');
  const firstName = currentUserProfile?.first_name || "Athlete";
  const isSportsScientist = currentUserProfile?.profession === 'Sports Scientist' || roles.includes('sports_scientist');

  useEffect(() => {
    if (session?.user?.id) {
      fetchAssignment();
    }
  }, [session?.user?.id]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      // 1. Get active assignment (Individual OR via Batch)
      const { data: assignments, error: aError } = await supabase
        .from('program_assignments' as any)
        .select(`
          *,
          program:training_programs(*),
          batch:batches(
            id,
            members:batch_members(athlete_id)
          )
        `)
        .eq('status', 'active');

      if (aError) throw aError;
      
      // Find assignment that belongs to this athlete
      const assignment = (assignments || []).find((a: any) => 
        a.athlete_id === session?.user?.id || 
        (a.batch_id && a.batch?.members?.some((m: any) => m.athlete_id === session?.user?.id))
      );

      if (!assignment) {
        setLoading(false);
        return;
      }

      setAssignedProgram(assignment as any);

      // 2. Calculate offset from start_date
      const start = new Date((assignment as any).start_date);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // 3. Fetch workout day for this offset
      const { data: workoutDay, error: wError } = await supabase
        .from('workout_days' as any)
        .select(`
          *,
          *,
          items:workout_items(
            *,
            lift:lift_items(*, exercise:exercises(name))
          )
        `)
        .eq('program_id', (assignment as any).program_id)
        .eq('display_order', diffDays)
        .maybeSingle();

      if (wError) throw wError;
      setTodayWorkout(workoutDay);
    } catch (error: any) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogging = () => {
    if (todayWorkout) {
      window.location.href = `/ams/athlete/workout/${todayWorkout.id}`;
    }
  };

  return (
    <DashboardLayout role="athlete">
      {/* Background Decor */}
      <div className="fixed inset-0 -z-10 bg-[#f8fafc] pointer-events-none" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-4 sm:p-6 lg:p-8">
        
        {/* Header / Feed Brief */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Daily Brief <span className="text-primary">/ {firstName}</span>
            </h1>
            <p className="text-slate-500 font-bold flex items-center gap-2 uppercase text-[10px] tracking-widest">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              {todayDate}
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm border border-slate-200 px-4 py-2 rounded-2xl shadow-sm">
             <div className="text-right">
                <p className="text-[10px] uppercase font-black text-slate-400 leading-none mb-1">Weekly Streak</p>
                <p className="text-lg font-black text-amber-500 italic">5 DAYS</p>
             </div>
             <div className="h-8 w-px bg-slate-200 mx-1" />
             <div className="flex -space-x-1.5">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-amber-50 flex items-center justify-center shadow-sm">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  </div>
                ))}
             </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* MAIN FEED (Left 8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* FEATURED: Today's Main Task (Hero Card) */}
            <section className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/0 rounded-[36px] blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
              <div className="relative glass-card rounded-[32px] p-8 space-y-6 border-none shadow-xl shadow-primary/5 overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150 rotate-12">
                   <Dumbbell className="w-48 h-48" />
                </div>
                
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      {todayWorkout ? "Today's Session" : "No Session Today"}
                    </span>
                    <h2 className="text-3xl font-black text-slate-900">
                      {todayWorkout ? todayWorkout.title : (assignedProgram ? "Rest Day" : "No Program Assigned")}
                    </h2>
                    <p className="text-slate-500 font-medium">
                      {assignedProgram ? assignedProgram.program.name : "Check in with your coach for a plan."}
                    </p>
                  </div>
                  {todayWorkout && (
                    <div className="bg-white p-4 rounded-2xl border shadow-sm flex flex-col items-center">
                      <Clock className="w-5 h-5 text-primary mb-1" />
                      <span className="text-sm font-black italic">60m</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-xl border">
                    <Dumbbell className="w-4 h-4 text-primary" /> Target: 85% 1RM
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-xl border">
                    <Heart className="w-4 h-4 text-rose-500" /> Target RPE: 8
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-xl border">
                    <Activity className="w-4 h-4 text-emerald-500" /> RPE History: 7.2 avg
                  </div>
                </div>

                <Button 
                  disabled={!todayWorkout}
                  onClick={navigateToLogging}
                  className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10 font-black text-lg gap-3"
                >
                  {todayWorkout ? "Start Training Feed" : "Rest Today"} <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </section>

            {/* FEED MODULES (Tabs approach upgraded) */}
            <Tabs defaultValue="training" className="w-full space-y-6">
              <TabsList className="bg-white/50 backdrop-blur-md p-1.5 border border-slate-200 rounded-[20px] shadow-sm flex justify-start gap-1 w-fit">
                <TabsTrigger value="training" className="gap-2 px-6 rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg shadow-primary/20 font-black text-[11px] uppercase tracking-widest">
                  Train
                </TabsTrigger>
                <TabsTrigger value="wellness" className="gap-2 px-6 rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg shadow-primary/20 font-black text-[11px] uppercase tracking-widest">
                  Wellness
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2 px-6 rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg shadow-primary/20 font-black text-[11px] uppercase tracking-widest">
                  Performance
                </TabsTrigger>
                {isSportsScientist && (
                  <TabsTrigger value="documents" className="gap-2 px-6 rounded-2xl data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-lg shadow-slate-900/20 font-black text-[11px] uppercase tracking-widest">
                    Documents
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="training" className="mt-0 animate-in slide-in-from-left-4 duration-500">
                <div className="glass-card rounded-[32px] border-none shadow-sm overflow-hidden bg-white/40 p-1">
                    {todayWorkout ? (
                      <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                           <h3 className="text-xl font-black uppercase">Exercise Queue</h3>
                           <Badge variant="outline">{todayWorkout.items?.length || 0} Total</Badge>
                        </div>
                        <div className="space-y-4">
                           {todayWorkout.items?.map((item: any, i: number) => {
                             const lift = item[item.item_type];
                             return (
                               <div key={item.id} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:border-primary/20 transition-all group">
                                  <div className="flex items-start justify-between gap-4">
                                     <div className="flex items-start gap-4 flex-1">
                                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-black flex-shrink-0">
                                           {lift?.workout_grouping || (i + 1)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                           <div className="flex items-center gap-2 flex-wrap">
                                              <p className="text-sm font-bold truncate">{lift?.exercise?.name || "Workout Item"}</p>
                                              {lift?.each_side && <Badge variant="outline" className="text-[8px] uppercase font-black tracking-widest border-amber-200 text-amber-600 bg-amber-50">Each Side</Badge>}
                                           </div>
                                           
                                           <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                              <span className="text-[10px] font-black uppercase text-slate-400">
                                                 {lift?.sets} x {lift?.reps} @ {lift?.load_value}KG
                                              </span>
                                              {(lift?.tempo || lift?.rest_time_secs) && (
                                                <div className="flex items-center gap-3">
                                                   <div className="w-1 h-1 rounded-full bg-slate-200" />
                                                   <span className="text-[10px] font-bold text-primary/60 italic uppercase tracking-tighter">
                                                      {lift?.tempo && `Tempo: ${lift.tempo}`}
                                                      {lift?.tempo && lift?.rest_time_secs && ' | '}
                                                      {lift?.rest_time_secs && `Rest: ${lift.rest_time_secs}s`}
                                                   </span>
                                                </div>
                                              )}
                                           </div>

                                           {lift?.additional_info && (
                                             <p className="mt-2 text-[10px] text-slate-500 font-medium leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                {lift.additional_info}
                                             </p>
                                           )}
                                        </div>
                                     </div>
                                     <div className="flex flex-col items-end gap-2 text-right">
                                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                                     </div>
                                  </div>
                               </div>
                             );
                           })}
                        </div>
                        <Button className="w-full h-14 rounded-2xl" onClick={navigateToLogging}>
                           Go to Logging Floor
                        </Button>
                      </div>
                    ) : (
                      <LogSessionForm />
                    )}
                </div>
              </TabsContent>

              <TabsContent value="wellness" className="mt-0 animate-in slide-in-from-left-4 duration-500">
                <div className="glass-card rounded-[32px] p-8 border-none shadow-sm bg-white/40">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900">Readiness Check</h3>
                      <p className="text-slate-500 font-medium">Evaluate your recovery state before training.</p>
                    </div>
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
                      <Zap className="w-7 h-7 text-amber-500 fill-amber-500/20" />
                    </div>
                  </div>
                  <WellnessCheckinForm />
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-0 animate-in slide-in-from-left-4 duration-500">
                <div className="glass-card rounded-[32px] p-8 border-none shadow-sm bg-white/40">
                  {session?.user?.id && <PerformanceAnalytics athleteId={session.user.id} />}
                </div>
              </TabsContent>

              {isSportsScientist && (
                <TabsContent value="documents" className="mt-0 animate-in slide-in-from-left-4 duration-500">
                  <div className="glass-card rounded-[32px] p-8 border-none shadow-sm bg-white/40">
                    {clientId && <ScientificResourcesManager athleteId={clientId} />}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* SIDEBAR (Right 4 cols) */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* GOAL TRACKER */}
            <Card className="glass-card rounded-[32px] border-none shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 p-6 opacity-5">
                 <Star className="w-24 h-24 rotate-12" />
              </div>
              <CardHeader className="pb-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Weekly Objective</p>
                <CardTitle className="text-2xl font-black italic">Strength Mastery</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Completion</p>
                    <p className="text-2xl font-black italic text-primary">75%</p>
                  </div>
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1">
                    <div className="h-full bg-primary w-[75%] rounded-full shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)] transition-all duration-1000" />
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 text-center leading-relaxed">
                    Finalized 3/4 planned heavy sessions. One more for a perfect week!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Vol / Last</p>
                      <p className="text-lg font-black italic text-slate-900">+12%</p>
                   </div>
                   <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-1">RPE / Avg</p>
                      <p className="text-lg font-black italic text-slate-900">7.8</p>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* PERFORMANCE SNAPSHOT */}
            <section className="space-y-4">
               <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Snapshot</h3>
                <Award className="w-4 h-4 text-primary" />
              </div>
              <div className="glass-card rounded-[32px] p-6 border shadow-sm hover:shadow-lg transition-all duration-500">
                 {session?.user?.id && <PerformanceSnapshot clientId={session.user.id} />}
              </div>
            </section>

            {/* QUICK ACTIONS */}
            <div className="grid grid-cols-2 gap-4">
              <LogActionCard label="Manual Log" icon={Plus} onClick={() => {}} />
              <LogActionCard label="View PRs" icon={Star} onClick={() => {}} />
            </div>

            {/* RESOURCE CARDS */}
            <div className="space-y-3">
               <Button variant="ghost" className="w-full justify-between h-14 rounded-2xl bg-white border shadow-sm hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all font-black text-[11px] uppercase tracking-widest px-6 group">
                  <span className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                       <CheckCircle2 className="w-4 h-4" />
                    </div>
                    Technical Standards
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary" />
               </Button>
               <Button variant="ghost" className="w-full justify-between h-14 rounded-2xl bg-white border shadow-sm hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all font-black text-[11px] uppercase tracking-widest px-6 group">
                  <span className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                       <Zap className="w-4 h-4 text-amber-500 group-hover:text-white" />
                    </div>
                    Coach Support
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500" />
               </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function LogActionCard({ label, icon: Icon, onClick }: { label: string, icon: any, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 h-28 bg-white/60 hover:bg-white border-2 border-dashed border-slate-200 hover:border-primary/50 rounded-[28px] transition-all group"
    >
      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
        <Icon className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-900 transition-colors">{label}</span>
    </button>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  );
}
