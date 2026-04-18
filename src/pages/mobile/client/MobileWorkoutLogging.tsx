import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  CheckCircle2, 
  ChevronLeft, 
  Play, 
  RotateCcw,
  Clock,
  Zap,
  Dumbbell,
  Timer,
  ArrowLeftRight
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function MobileWorkoutLogging() {
  const { id: workoutDayId } = useParams();
  const { profile } = useAuth();
  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<Record<string, any>>({});
  const [completedSets, setCompletedSets] = useState<Record<string, boolean>>({});
  const [prs, setPrs] = useState<Record<string, number>>({});
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [sessionRpe, setSessionRpe] = useState(7);
  const [sessionNotes, setSessionNotes] = useState("");
  const [swapTargetItemId, setSwapTargetItemId] = useState<string | null>(null);
  const [selectedExerciseDetail, setSelectedExerciseDetail] = useState<any>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (workoutDayId) {
      fetchWorkout();
      fetchExercises();
    }
  }, [workoutDayId]);

  useEffect(() => {
    let interval: any;
    if (restTimer !== null && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer(prev => (prev !== null && prev > 0) ? prev - 1 : null);
      }, 1000);
    } else if (restTimer === 0) {
      setRestTimer(null);
      toast({ title: "Rest period over!", description: "Get ready for the next set." });
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  const fetchWorkout = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('workout_days')
        .select(`
          *,
          items:workout_items(
            *,
            lift:lift_items(*, exercise:exercises(*)),
            saqc:saqc_items(*, exercise:exercises(*)),
            circuit:circuit_items(*)
          )
        `)
        .eq('id', workoutDayId)
        .single();

      if (error) throw error;
      setWorkout(data);

      const exerciseIds = data.items?.map((i: any) => i[i.item_type]?.exercise_id).filter(Boolean);
      const prMap: Record<string, number> = {};
      
      if (exerciseIds.length > 0) {
        const { data: prData } = await supabase
          .from('max_pr_records')
          .select('exercise_id, value')
          .eq('athlete_id', user.id)
          .eq('is_current', true)
          .in('exercise_id', exerciseIds);
        
        prData?.forEach(pr => { prMap[pr.exercise_id] = pr.value; });
      }
      setPrs(prMap);
      
      const initialLogs: Record<string, any> = {};
      data.items?.forEach((item: any) => {
        const details = item[item.item_type];
        if (item.item_type === 'lift') {
          const prValue = prMap[details?.exercise_id] || 100;
          const weight = details?.load_type === 'percentage' 
            ? Math.round((details.load_value / 100) * prValue) 
            : details?.load_value || 0;

          initialLogs[item.id] = Array(details?.sets || 1).fill(null).map(() => ({
            weight,
            reps: parseInt(details?.reps) || 10,
            original_weight: weight
          }));
        } else if (item.item_type === 'saqc') {
           initialLogs[item.id] = Array(details?.sets || 1).fill(null).map(() => ({
            weight: 0,
            reps: parseInt(details?.reps) || 1
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

  const fetchExercises = async () => {
    const { data } = await supabase.from('exercises').select('id, name').limit(100);
    setExercises(data || []);
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
    const nextValue = !completedSets[key];
    setCompletedSets(prev => ({ ...prev, [key]: nextValue }));
    
    if (nextValue) {
       const item = workout?.items?.find((i: any) => i.id === itemId);
       const restTime = item?.[item.item_type]?.rest_time_secs;
       if (restTime) setRestTimer(restTime);
    }
  };

  const handleSwap = async (itemId: string, newExercise: any) => {
    try {
      setLoading(true);
      setWorkout((prev: any) => ({
        ...prev,
        items: prev.items.map((i: any) => {
          if (i.id === itemId) {
            const itemType = i.item_type;
            return {
              ...i,
              [itemType]: {
                ...i[itemType],
                exercise_id: newExercise.id,
                exercise: { ...newExercise }
              }
            };
          }
          return i;
        })
      }));
      setSwapTargetItemId(null);
      toast({ title: "Exercise Swapped!" });
    } catch (err: any) {
      toast({ title: "Swap Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const finishWorkout = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !workout) return;

      const { error: cError } = await supabase
        .from('athlete_workout_completions' as any)
        .insert({
          athlete_id: user.id,
          workout_day_id: workout.id,
          org_id: workout.org_id,
          completed_at: new Date().toISOString(),
          overall_notes: sessionNotes,
          completion_status: 'completed'
        } as any);

      if (cError) throw cError;

      const itemLogs = Object.entries(logs).flatMap(([itemId, sets]) => 
        sets.map((set: any, idx: number) => ({
          org_id: workout.org_id,
          workout_item_id: itemId,
          athlete_id: user.id,
          logged_at: new Date().toISOString(),
          sets_completed: [{ load: set.weight, reps: set.reps }],
          rpe: sessionRpe,
          notes: "",
          skipped: !completedSets[`${itemId}-${idx}`]
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

      navigate('/mobile/client/performance');
    } catch (error: any) {
      toast({
        title: "Error finishing workout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <MobileLayout showBack>
      <div className="min-h-[60vh] flex items-center justify-center text-white/40 font-bold uppercase tracking-widest text-xs">
        Loading Session...
      </div>
    </MobileLayout>
  );

  return (
    <MobileLayout showBack>
      <div className="space-y-6 pb-28 animate-in fade-in duration-500">
        {/* Progress Header */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                   <h2 className="text-lg sm:text-xl font-black italic uppercase tracking-tighter text-white break-words">{workout?.title || "Workout"}</h2>
                   <p className="text-[9px] font-bold text-primary uppercase tracking-widest mt-1">Strength Session</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black italic text-primary">
                    {Math.round((Object.keys(completedSets).filter(k => completedSets[k]).length / (workout?.items?.reduce((acc: number, item: any) => acc + (item[item.item_type]?.sets || 0), 0) || 1)) * 100)}%
                  </span>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Progress</p>
                </div>
            </div>
            <Progress value={(Object.keys(completedSets).filter(k => completedSets[k]).length / (workout?.items?.reduce((acc: number, item: any) => acc + (item[item.item_type]?.sets || 0), 0) || 1)) * 100} className="h-1.5 bg-white/5" />
        </div>

        {/* Workout Items */}
        <div className="space-y-4">
          {workout?.items?.map((item: any, idx: number) => {
            const details = item[item.item_type];
            return (
              <div key={item.id} className="bg-slate-900/50 backdrop-blur-md rounded-[28px] border border-white/5 overflow-hidden shadow-xl">
                 <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                        <div 
                          onClick={() => setSelectedExerciseDetail({
                            ...details?.exercise,
                            tempo: details?.tempo,
                            sets: details?.sets,
                            reps: details?.reps,
                            rest: details?.rest_time_secs,
                            notes: details?.additional_info
                          })}
                          className="flex items-center gap-3 cursor-pointer group/item min-w-0 flex-1"
                        >
                            <div className="w-9 h-9 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 text-xs font-black text-primary italic">
                                {details?.workout_grouping || idx + 1}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white group-hover/item:text-primary transition-colors flex items-center gap-2 italic">
                                  <span className="truncate">{details?.exercise?.name || "Exercise"}</span>
                                  <Play className="w-3 h-3 text-primary shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                </h3>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{details?.sets} Sets</span>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{details?.reps} Reps</span>
                                </div>
                            </div>
                        </div>
                        
                        <Dialog open={swapTargetItemId === item.id} onOpenChange={(open) => setSwapTargetItemId(open ? item.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10">
                              <ArrowLeftRight className="w-4 h-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-900 border-white/10 p-0 overflow-hidden rounded-[28px] max-w-[90vw]">
                            <Command className="bg-transparent">
                              <CommandInput placeholder="Swap exercise..." className="h-14 outline-none text-sm font-bold" />
                              <CommandList className="max-h-[60vh]">
                                <CommandEmpty className="p-8 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">No exercises found.</CommandEmpty>
                                <CommandGroup>
                                  {exercises.map(ex => (
                                    <CommandItem 
                                      key={ex.id} 
                                      onSelect={() => handleSwap(item.id, ex)}
                                      className="p-4 cursor-pointer hover:bg-white/5 text-xs font-black text-white uppercase italic tracking-tight"
                                    >
                                      {ex.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </DialogContent>
                        </Dialog>
                    </div>

                    {details?.additional_info && (
                      <div className="mb-6 bg-primary/5 border-l-4 border-primary p-4 rounded-r-2xl">
                          <p className="text-[11px] text-slate-300 italic font-medium leading-relaxed">
                            "{details.additional_info}"
                          </p>
                      </div>
                    )}

                    <div className="space-y-3">
                       {logs[item.id]?.map((set: any, setIdx: number) => {
                         const isDone = completedSets[`${item.id}-${setIdx}`];
                         return (
                           <div key={setIdx} className={cn(
                              "flex items-center gap-4 p-2 rounded-2xl transition-all duration-500",
                              isDone ? "bg-primary/5 opacity-40 scale-[0.98]" : "bg-white/[0.02]"
                           )}>
                              <div className="w-6 shrink-0 text-center text-[10px] font-black text-slate-500">{setIdx + 1}</div>
                              <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                                 <div className="h-11 bg-white/5 rounded-xl border border-white/10 flex items-center px-1.5 sm:px-3 gap-1 min-w-0">
                                    <input 
                                      type="number" 
                                      value={set.weight}
                                      onChange={(e) => handleSetUpdate(item.id, setIdx, 'weight', e.target.value)}
                                      className="bg-transparent border-none text-xs sm:text-sm font-black italic w-full min-w-0 outline-none text-white text-right"
                                    />
                                    <span className="text-[7px] font-black text-slate-500 uppercase shrink-0">KG</span>
                                 </div>
                                 <div className="h-11 bg-white/5 rounded-xl border border-white/10 flex items-center px-1.5 sm:px-3 gap-1 min-w-0">
                                    <input 
                                      type="number" 
                                      value={set.reps}
                                      onChange={(e) => handleSetUpdate(item.id, setIdx, 'reps', e.target.value)}
                                      className="bg-transparent border-none text-xs sm:text-sm font-black italic w-full min-w-0 outline-none text-white text-right"
                                    />
                                    <span className="text-[7px] font-black text-slate-500 uppercase shrink-0">REPS</span>
                                 </div>
                              </div>
                              <button 
                                onClick={() => toggleSetComplete(item.id, setIdx)}
                                className={cn(
                                  "w-10 h-10 sm:w-12 sm:h-12 rounded-xl border transition-all flex items-center justify-center shadow-lg shrink-0",
                                  isDone 
                                    ? "bg-primary border-primary text-white scale-90" 
                                    : "bg-white/5 border-white/10 text-slate-500 hover:border-primary/40 active:scale-95"
                                )}
                              >
                                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                              </button>
                           </div>
                         );
                       })}
                    </div>
                 </div>
              </div>
            );
          })}
        </div>

        {/* Finish Button */}
        <Button 
          onClick={() => setIsFinishing(true)}
          className="w-full h-16 rounded-[28px] bg-gradient-to-r from-primary to-primary/80 text-white font-black text-lg uppercase tracking-[0.2em] italic shadow-[0_20px_40px_rgba(20,184,166,0.3)]"
        >
          Finish Session
        </Button>
      </div>

      {/* Rest Timer Overlay */}
      <div className={cn(
        "fixed bottom-24 left-6 right-6 h-14 bg-slate-900/90 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl z-50 px-5 flex items-center justify-between transition-all duration-700 transform",
        restTimer === null ? "opacity-0 translate-y-20 pointer-events-none" : "opacity-100 translate-y-0"
      )}>
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                <Clock className="w-4 h-4" />
            </div>
            <div className="text-base font-black italic text-primary tabular-nums">
              Rest: {restTimer ? `${Math.floor(restTimer / 60)}:${(restTimer % 60).toString().padStart(2, '0')}` : "0:00"}
            </div>
         </div>
         <Button variant="ghost" size="sm" onClick={() => setRestTimer(null)} className="h-8 rounded-lg bg-white/5 text-[10px] font-black uppercase italic text-slate-400">
            Skip
         </Button>
      </div>

      {/* Finish Dialog */}
      <Dialog open={isFinishing} onOpenChange={setIsFinishing}>
        <DialogContent className="bg-slate-900 border-white/10 text-white rounded-[32px] max-w-[90vw] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Finish Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-8 py-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Overall Intensity (RPE)</Label>
                <span className="text-2xl font-black italic text-primary">{sessionRpe}/10</span>
              </div>
              <Slider 
                value={[sessionRpe]} 
                onValueChange={(v) => setSessionRpe(v[0])} 
                max={10} 
                min={1}
                step={1} 
                className="py-4"
              />
              <div className="flex justify-between text-[8px] font-black text-slate-600 uppercase tracking-tighter">
                <span>Recovery</span>
                <span>Active</span>
                <span>Max Heart Rate</span>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session Notes</Label>
              <Textarea 
                placeholder="Talk to your coach..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="bg-white/5 border-white/10 rounded-2xl min-h-[100px] text-sm italic font-medium placeholder:text-slate-700"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-3">
            <Button onClick={finishWorkout} className="h-14 w-full bg-primary text-white font-black uppercase text-sm italic tracking-widest rounded-2xl shadow-glow">
              FINISH & SYNC
            </Button>
            <Button variant="ghost" onClick={() => setIsFinishing(false)} className="h-10 text-[10px] font-black uppercase text-slate-600">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise Detail Dialog */}
      <Dialog open={!!selectedExerciseDetail} onOpenChange={(open) => !open && setSelectedExerciseDetail(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white rounded-[32px] max-w-[95vw] p-0 overflow-hidden shadow-2xl">
          {selectedExerciseDetail && (
            <div className="flex flex-col">
              <div className="aspect-video bg-black/60 relative flex items-center justify-center border-b border-white/5">
                {selectedExerciseDetail.video_url ? (
                  <iframe 
                    src={selectedExerciseDetail.video_url.replace("watch?v=", "embed/").split("&")[0]} 
                    className="w-full h-full"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-700">
                    <Play className="w-16 h-16 opacity-20" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">No Video Available</span>
                  </div>
                )}
              </div>

              <div className="p-8 space-y-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-primary mb-2 leading-none">{selectedExerciseDetail.name}</h2>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed italic">{selectedExerciseDetail.description || "Master technique over heavy loads. Focus on intent."}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <DetailBit label="Prescription" value={`${selectedExerciseDetail.sets} x ${selectedExerciseDetail.reps}`} icon={Zap} />
                  <DetailBit label="Tempo" value={selectedExerciseDetail.tempo || "Normal"} icon={Timer} />
                  <DetailBit label="Rest" value={selectedExerciseDetail.rest ? `${selectedExerciseDetail.rest}s` : "As Needed"} icon={Clock} />
                  <DetailBit label="Category" value={selectedExerciseDetail.category || "General"} icon={Dumbbell} />
                </div>

                {selectedExerciseDetail.notes && (
                  <div className="bg-primary/5 p-5 rounded-2xl border border-primary/10">
                    <Label className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 block italic">Coach's Directive</Label>
                    <p className="text-xs text-slate-300 italic font-medium leading-relaxed">"{selectedExerciseDetail.notes}"</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-950/50">
                <Button onClick={() => setSelectedExerciseDetail(null)} className="w-full bg-white/5 hover:bg-white/10 text-xs font-black uppercase italic tracking-widest h-14 rounded-2xl border border-white/10 text-slate-400">
                  Close Detail
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}

function DetailBit({ label, value, icon: Icon }: { label: string, value: string, icon: any }) {
  return (
    <div className="bg-white/[0.03] p-4 rounded-2xl border border-white/5 flex items-center gap-4 transition-all active:bg-white/5">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-sm font-black italic text-white tracking-tight">{value}</p>
      </div>
    </div>
  );
}
