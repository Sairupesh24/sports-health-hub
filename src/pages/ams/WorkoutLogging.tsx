import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  CheckCircle2, 
  ChevronLeft, 
  Play, 
  Pause, 
  RotateCcw,
  Trophy,
  Activity,
  Target,
  Clock,
  Zap,
  Dumbbell
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AmsStaffNav from "@/components/ams/AmsStaffNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function WorkoutLogging() {
  const { id: workoutDayId } = useParams();
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<Record<string, any>>({});
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (workoutDayId) {
      fetchWorkout();
    }
  }, [workoutDayId]);

  const fetchWorkout = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workout_days')
        .select(`
          *,
          items:workout_items(
            *,
            lift:lift_items(*, exercise:exercises(*)),
            saqc:saqc_items(*, exercise:exercises(*)),
            circuit:circuit_items(*),
            science:sport_science_items(*),
            warmup:warmup_items(*),
            note:note_items(*)
          )
        `)
        .eq('id', workoutDayId)
        .single();

      if (error) throw error;
      setWorkout(data);
      
      // Initialize logs state
      const initialLogs: Record<string, any> = {};
      data.items?.forEach((item: any) => {
        if (item.item_type === 'lift') {
          initialLogs[item.id] = Array(item.lift?.sets || 1).fill(null).map(() => ({
            weight: item.lift?.load_value || 0,
            reps: parseInt(item.lift?.reps) || 10
          }));
        } else if (item.item_type === 'saqc') {
           initialLogs[item.id] = Array(item.saqc?.sets || 1).fill(null).map(() => ({
            weight: 0,
            reps: parseInt(item.saqc?.reps) || 1
          }));
        } else if (item.item_type === 'circuit') {
           initialLogs[item.id] = Array(item.circuit?.sets || 1).fill(null).map(() => ({
            weight: 0,
            reps: 1
          }));
        }
      });
      setLogs(initialLogs);
    } catch (error: any) {
      toast({
        title: "Error fetching workout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetUpdate = (itemId: string, setIdx: number, field: string, value: any) => {
    setLogs(prev => ({
      ...prev,
      [itemId]: prev[itemId].map((s: any, i: number) => 
        i === setIdx ? { ...s, [field]: value } : s
      )
    }));
  };

  const toggleSetComplete = (itemId: string, setIdx: number) => {
    const key = `${itemId}-${setIdx}`;
    setCompletedSets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const finishWorkout = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !workout) return;

      // 1. Create Workout Completion
      const { data: completion, error: cError } = await (supabase
        .from('athlete_workout_completions' as any)
        .insert({
          athlete_id: user.id,
          workout_day_id: workout.id,
          org_id: workout.org_id,
          completed_at: new Date().toISOString(),
          total_duration_mins: 60 // Mock for now
        } as any) as any)
        .select()
        .single();

      if (cError) throw cError;

      // 2. Save Item Logs
      const itemLogs = Object.entries(logs).flatMap(([itemId, sets]) => 
        sets.map((set: any, idx: number) => ({
          completion_id: completion.id,
          workout_item_id: itemId,
          athlete_id: user.id,
          org_id: workout.org_id,
          set_number: idx + 1,
          weight_kg: parseFloat(set.weight || 0),
          reps: parseInt(set.reps || 0),
          is_completed: completedSets[`${itemId}-${idx}`] || false
        }))
      );

      const { error: lError } = await supabase
        .from('athlete_item_logs' as any)
        .insert(itemLogs as any);

      if (lError) throw lError;

      toast({
        title: "Workout Completed!",
        description: "Your training data has been synced.",
      });

      navigate('/athlete/calendar');
    } catch (error: any) {
      toast({
        title: "Error finishing workout",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-white">Loading...</div>;

  return (
    <DashboardLayout role="athlete">
      <div className="min-h-screen bg-[#0f1115] text-white">
        <AmsStaffNav />
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-20 bg-[#161920]/80 backdrop-blur-xl border-b border-white/5 z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-white/5 rounded-xl">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-black uppercase tracking-tight text-lg">{workout?.title}</h1>
            <div className="flex items-center gap-2">
               <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[9px] uppercase font-black px-1.5 py-0">Focus: Strength</Badge>
               <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-40">45 MIN EST.</span>
            </div>
          </div>
        </div>

        <Button 
          onClick={finishWorkout}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] h-10 px-6 rounded-xl shadow-lg shadow-primary/20"
        >
          Finish
        </Button>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                <span>Workout Progress</span>
                <span>2 / 8 Exercises</span>
            </div>
            <Progress value={25} className="h-1.5 bg-white/5 shadow-inner" />
        </div>

        {/* Workout Items */}
        {workout?.items?.map((item: any, idx: number) => (
          <div key={item.id} className="glass-card rounded-[2rem] border-white/5 overflow-hidden ring-1 ring-white/5 hover:ring-primary/20 transition-all">
             <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 text-primary shadow-2xl">
                            {item.item_type === 'lift' ? <Dumbbell className="w-6 h-6" /> : <Zap className="w-6 h-6" />}
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-60">Exercise {idx + 1}</span>
                            <h3 className="text-xl font-bold uppercase tracking-tight">{item[item.item_type]?.exercise?.name || "Workout Item"}</h3>
                        </div>
                    </div>
                </div>

                {/* Sets Area */}
                <div className="space-y-3">
                   {logs[item.id]?.map((set: any, setIdx: number) => {
                     const isDone = completedSets[`${item.id}-${setIdx}`];
                     return (
                       <div key={setIdx} className={cn(
                          "grid grid-cols-12 gap-3 items-center group transition-all duration-500",
                          isDone && "opacity-40 grayscale"
                       )}>
                          <div className="col-span-1 text-center text-[10px] font-black text-white/20">{setIdx + 1}</div>
                          <div className="col-span-4 h-14 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center gap-2 group-focus-within:border-primary/40 transition-all overflow-hidden">
                              <input 
                                type="number" 
                                value={set.weight}
                                onChange={(e) => handleSetUpdate(item.id, setIdx, 'weight', e.target.value)}
                                className="bg-transparent border-none text-center text-lg font-black italic w-12 outline-none"
                              />
                              <span className="text-[9px] font-black opacity-20 uppercase">KG</span>
                          </div>
                          <div className="col-span-4 h-14 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-center gap-2 transition-all overflow-hidden">
                              <input 
                                type="number" 
                                value={set.reps}
                                onChange={(e) => handleSetUpdate(item.id, setIdx, 'reps', e.target.value)}
                                className="bg-transparent border-none text-center text-lg font-black italic w-10 outline-none"
                              />
                              <span className="text-[9px] font-black opacity-20 uppercase">REPS</span>
                          </div>
                          <div className="col-span-3 flex justify-center">
                              <button 
                                onClick={() => toggleSetComplete(item.id, setIdx)}
                                className={cn(
                                  "w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center transition-all",
                                  isDone ? "bg-primary text-white scale-90" : "bg-white/5 text-primary hover:bg-white/10"
                                )}
                              >
                                  <CheckCircle2 className="w-6 h-6" />
                              </button>
                          </div>
                       </div>
                     );
                   })}
                </div>
             </div>
          </div>
        ))}
      </main>

      {/* Floating Action Bar */}
      <div className="fixed bottom-8 left-4 right-4 max-w-2xl mx-auto h-20 bg-[#161920]/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl z-50 px-6 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Clock className="w-6 h-6" />
            </div>
            <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Running Time</span>
                <div className="text-xl font-black italic text-primary">12:45.00</div>
            </div>
         </div>
         <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white/5 hover:bg-white/10">
                <RotateCcw className="w-5 h-5" />
            </Button>
            <Button size="icon" className="h-12 w-12 rounded-2xl bg-primary hover:bg-primary/90">
                <Pause className="w-6 h-6" />
            </Button>
         </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
