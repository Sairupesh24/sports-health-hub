import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  CheckCircle2, 
  ChevronLeft, 
  Play, 
  Pause, 
  RotateCcw,
  Clock,
  Zap,
  Dumbbell,
  Timer,
  Search,
  MessageSquare,
  AlertCircle,
  MoreVertical,
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
import DashboardLayout from "@/components/layout/DashboardLayout";
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

      // Fetch latest PRs for all exercises in the workout
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
      
      // Initialize logs state
      const initialLogs: Record<string, any> = {};
      data.items?.forEach((item: any) => {
        const details = item[item.item_type];
        if (item.item_type === 'lift') {
          const prValue = prMap[details?.exercise_id] || 100; // Fallback
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
      // We'll update the local state for now, but in a real app we might persist the swap
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

      // 1. Create Workout Completion
      const { data: completion, error: cError } = await (supabase
        .from('athlete_workout_completions' as any)
        .insert({
          athlete_id: user.id,
          workout_day_id: workout.id,
          org_id: workout.org_id,
          completed_at: new Date().toISOString(),
          overall_notes: sessionNotes,
          completion_status: 'completed'
        } as any) as any)
        .select()
        .single();

      if (cError) throw cError;

      // 2. Save Item Logs
      const itemLogs = Object.entries(logs).flatMap(([itemId, sets]) => 
        sets.map((set: any, idx: number) => ({
          org_id: workout.org_id,
          workout_item_id: itemId,
          athlete_id: user.id,
          logged_at: new Date().toISOString(),
          sets_completed: [{ load: set.weight, reps: set.reps }],
          rpe: sessionRpe, // Applied to all for now or should it be individual?
          notes: "", // Placeholder
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

      navigate('/client/performance');
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

  if (loading) return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-white">Loading...</div>;

  return (
    <DashboardLayout role="athlete">
      <div className="min-h-screen bg-[#0F1115] text-white selection:bg-primary/30">
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#161920]/80 backdrop-blur-md border-b border-white/5 z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="hover:bg-white/5 h-9 w-9 rounded-lg">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="font-bold text-sm tracking-tight">{workout?.title || "Workout"}</h1>
            <div className="flex items-center gap-2">
               <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Strength Session</span>
            </div>
          </div>
        </div>

        <Dialog open={isFinishing} onOpenChange={setIsFinishing}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-[11px] font-bold uppercase tracking-wider h-9 px-4 rounded-lg">
              Finish
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1A1F26] border-white/10 text-white rounded-xl max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Finish Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-bold text-white/40 uppercase tracking-widest">Intensity (RPE)</Label>
                  <span className="text-lg font-bold text-primary italic">{sessionRpe}/10</span>
                </div>
                <Slider 
                  value={[sessionRpe]} 
                  onValueChange={(v) => setSessionRpe(v[0])} 
                  max={10} 
                  step={1} 
                  className="py-4"
                />
                <div className="flex justify-between text-[10px] font-bold text-white/20">
                  <span>EASY</span>
                  <span>MODERATE</span>
                  <span>MAX EFFORT</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-white/40 uppercase tracking-widest">Notes</Label>
                <Textarea 
                  placeholder="How did it feel?"
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  className="bg-white/5 border-white/10 rounded-lg min-h-[80px] text-sm"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsFinishing(false)} className="h-10 text-xs">Cancel</Button>
              <Button onClick={finishWorkout} className="h-10 flex-1 bg-primary text-xs font-bold">FINISH & SYNC</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-28 px-4 max-w-xl mx-auto space-y-4">
        {/* Progress */}
        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Workout Progress</span>
                <span className="text-[10px] font-bold text-primary">
                  {Object.keys(completedSets).filter(k => completedSets[k]).length} Sets Completed
                </span>
            </div>
            <Progress value={Math.min(100, (Object.keys(completedSets).filter(k => completedSets[k]).length / (workout?.items?.reduce((acc: number, item: any) => acc + (item[item.item_type]?.sets || 0), 0) || 1)) * 100)} className="h-1 bg-white/5" />
        </div>

        {/* Workout Items */}
        {workout?.items?.map((item: any, idx: number) => {
          const details = item[item.item_type];
          return (
            <div key={item.id} className="bg-[#1A1F26] rounded-xl border border-white/5 overflow-hidden shadow-sm">
               <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                          <div 
                            className="flex items-center gap-3 cursor-pointer group/item"
                            onClick={() => setSelectedExerciseDetail({
                              ...details?.exercise,
                              tempo: details?.tempo,
                              sets: details?.sets,
                              reps: details?.reps,
                              rest: details?.rest_time_secs,
                              notes: details?.additional_info
                            })}
                          >
                              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 text-xs font-bold text-white/20 group-hover/item:border-primary/50 group-hover/item:text-primary transition-all">
                                  {details?.workout_grouping || idx + 1}
                              </div>
                              <div>
                                  <h3 className="text-sm font-bold uppercase tracking-tight text-white mb-0.5 group-hover/item:text-primary transition-colors flex items-center gap-2">
                                    {details?.exercise?.name || "Exercise"}
                                    <Play className="w-3 h-3 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-primary tracking-wider">{details?.sets} x {details?.reps}</span>
                                    {details?.tempo && <span className="text-[9px] text-white/20 uppercase font-medium">Tempo: {details.tempo}</span>}
                                  </div>
                              </div>
                          </div>
                      </div>
                      <Dialog open={swapTargetItemId === item.id} onOpenChange={(open) => setSwapTargetItemId(open ? item.id : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white hover:bg-white/5">
                            <ArrowLeftRight className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-[#1A1F26] border-white/10 p-0 overflow-hidden rounded-xl">
                          <Command className="bg-transparent">
                            <CommandInput placeholder="Swap for another exercise..." className="h-11 outline-none text-sm" />
                            <CommandList>
                              <CommandEmpty className="p-4 text-xs opacity-40">No exercises found.</CommandEmpty>
                              <CommandGroup>
                                {exercises.map(ex => (
                                  <CommandItem 
                                    key={ex.id} 
                                    onSelect={() => handleSwap(item.id, ex)}
                                    className="p-3 cursor-pointer hover:bg-white/5 text-xs font-bold text-white uppercase"
                                  >
                                    {ex.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </DialogContent>
                      </Dialog>

                  {details?.additional_info && (
                    <div className="mb-4 bg-white/[0.02] border-l-2 border-primary/40 p-3 rounded-r-lg">
                        <p className="text-[10px] text-white/40 italic leading-relaxed">
                          "{details.additional_info}"
                        </p>
                    </div>
                  )}

                  {/* Sets */}
                  <div className="space-y-2">
                     {logs[item.id]?.map((set: any, setIdx: number) => {
                       const isDone = completedSets[`${item.id}-${setIdx}`];
                       return (
                         <div key={setIdx} className={cn(
                            "flex items-center gap-3 transition-opacity duration-300",
                            isDone && "opacity-30"
                         )}>
                            <div className="w-4 text-center text-[9px] font-bold text-white/10">{setIdx + 1}</div>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                               <div className="h-10 bg-white/5 rounded-lg border border-white/5 flex items-center px-3 gap-2">
                                  <input 
                                    type="number" 
                                    value={set.weight}
                                    onChange={(e) => handleSetUpdate(item.id, setIdx, 'weight', e.target.value)}
                                    className="bg-transparent border-none text-sm font-bold w-10 outline-none text-white"
                                  />
                                  <span className="text-[8px] font-bold text-white/20 uppercase">KG</span>
                               </div>
                               <div className="h-10 bg-white/5 rounded-lg border border-white/5 flex items-center px-3 gap-2">
                                  <input 
                                    type="number" 
                                    value={set.reps}
                                    onChange={(e) => handleSetUpdate(item.id, setIdx, 'reps', e.target.value)}
                                    className="bg-transparent border-none text-sm font-bold w-10 outline-none text-white"
                                  />
                                  <span className="text-[8px] font-bold text-white/20 uppercase">REPS</span>
                               </div>
                            </div>
                            <button 
                              onClick={() => toggleSetComplete(item.id, setIdx)}
                              className={cn(
                                "w-10 h-10 rounded-lg border transition-all flex items-center justify-center",
                                isDone 
                                  ? "bg-primary border-primary text-white" 
                                  : "bg-white/5 border-white/10 text-white/20 hover:border-primary/40"
                              )}
                            >
                                <CheckCircle2 className="w-5 h-5" />
                            </button>
                         </div>
                       );
                     })}
                  </div>
               </div>
            </div>
          );
        })}
      </main>

      {/* Floating Action Bar / Timer */}
      <div className={cn(
        "fixed bottom-6 left-4 right-4 max-w-xl mx-auto h-16 bg-[#161920]/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl z-50 px-5 flex items-center justify-between transition-all duration-500 transform translate-y-0",
        restTimer === null && "opacity-0 translate-y-20 pointer-events-none"
      )}>
         <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                <Clock className="w-4 h-4" />
            </div>
            <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">Rest Timer</span>
                <div className="text-lg font-bold italic text-primary tabular-nums">
                  {restTimer ? `${Math.floor(restTimer / 60)}:${(restTimer % 60).toString().padStart(2, '0')}` : "0:00"}
                </div>
            </div>
         </div>
         <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setRestTimer(null)} className="h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10">
                <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button onClick={() => setRestTimer(null)} className="bg-primary hover:bg-primary/90 rounded-xl px-6 h-10 text-[10px] font-bold uppercase tracking-widest">
                Skip
            </Button>
         </div>
      </div>
      </div>

      <Dialog open={!!selectedExerciseDetail} onOpenChange={(open) => !open && setSelectedExerciseDetail(null)}>
        <DialogContent className="bg-[#1A1F26] border-white/10 text-white rounded-2xl max-w-lg p-0 overflow-hidden">
          {selectedExerciseDetail && (
            <div className="flex flex-col">
              {/* Image/Video Preview */}
              <div className="aspect-video bg-black/40 relative flex items-center justify-center border-b border-white/5">
                {selectedExerciseDetail.video_url ? (
                  <iframe 
                    src={selectedExerciseDetail.video_url.replace("watch?v=", "embed/").split("&")[0]} 
                    className="w-full h-full"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-white/20">
                    <Play className="w-12 h-12" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">No Video Preview Available</span>
                  </div>
                )}
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-primary mb-1">{selectedExerciseDetail.name}</h2>
                  <p className="text-xs text-white/40 leading-relaxed">{selectedExerciseDetail.description || "No description provided."}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <DetailBit label="Prescription" value={`${selectedExerciseDetail.sets} x ${selectedExerciseDetail.reps}`} icon={Zap} />
                  <DetailBit label="Tempo" value={selectedExerciseDetail.tempo || "Normal"} icon={Timer} />
                  <DetailBit label="Rest" value={selectedExerciseDetail.rest ? `${selectedExerciseDetail.rest}s` : "As Needed"} icon={Clock} />
                  <DetailBit label="Category" value={selectedExerciseDetail.category || "General"} icon={Dumbbell} />
                </div>

                {selectedExerciseDetail.notes && (
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <Label className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 block">Coach's Notes</Label>
                    <p className="text-xs text-white/60 italic leading-relaxed">"{selectedExerciseDetail.notes}"</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-white/5">
                <Button onClick={() => setSelectedExerciseDetail(null)} className="w-full bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest h-12 rounded-xl border border-white/5">
                  Close Detail
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function DetailBit({ label, value, icon: Icon }: { label: string, value: string, icon: any }) {
  return (
    <div className="bg-white/[0.03] p-3 rounded-xl border border-white/5 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-xs font-black text-white">{value}</p>
      </div>
    </div>
  );
}
