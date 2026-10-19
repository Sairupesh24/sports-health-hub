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
import { apiFetch } from "@/utils/api";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function MobileWorkoutLogging() {
  const { id: workoutDayId } = useParams();
  const { profile, user } = useAuth();
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
      if (!user) return;

      const data = await apiFetch<any>(`/ams/workout-days/${workoutDayId}`);
      setWorkout(data);

      const exerciseIds = data.items?.map((i: any) => i[i.item_type]?.exercise_id).filter(Boolean);
      const prMap: Record<string, number> = {};
      
      if (exerciseIds.length > 0) {
        const prData = await apiFetch<any[]>(`/ams/max-pr-records?exercise_ids=${exerciseIds.join(',')}`);
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
    try {
      const data = await apiFetch<any[]>('/ams/exercises?limit=100');
      setExercises(data || []);
    } catch (err) {
      console.error("Failed to fetch exercises", err);
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
      if (!user || !workout) return;

      await apiFetch('/ams/workout-completions', {
        method: 'POST',
        body: {
          athlete_id: user.id,
          workout_day_id: workout.id,
          org_id: workout.org_id,
          completed_at: new Date().toISOString(),
          overall_notes: sessionNotes,
          completion_status: 'completed'
        }
      });

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

      await apiFetch('/ams/item-logs', {
        method: 'POST',
        body: itemLogs
      });

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
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500 dark:text-slate-400 font-semibold text-xs">
        Loading Session...
      </div>
    </MobileLayout>
  );

  return (
    <MobileLayout showBack>
      <div className="space-y-4 pb-28 animate-in fade-in duration-300">
        {/* Progress Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                   <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white break-words">{workout?.title || "Workout"}</h2>
                   <p className="text-[10px] font-bold text-primary uppercase tracking-wider mt-0.5">Strength Session</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary tracking-tight">
                    {Math.round((Object.keys(completedSets).filter(k => completedSets[k]).length / (workout?.items?.reduce((acc: number, item: any) => acc + (item[item.item_type]?.sets || 0), 0) || 1)) * 100)}%
                  </span>
                  <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Progress</p>
                </div>
            </div>
            <Progress value={(Object.keys(completedSets).filter(k => completedSets[k]).length / (workout?.items?.reduce((acc: number, item: any) => acc + (item[item.item_type]?.sets || 0), 0) || 1)) * 100} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
        </div>

        {/* Workout Items */}
        <div className="space-y-3">
          {workout?.items?.map((item: any, idx: number) => {
            const details = item[item.item_type];
            return (
              <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-xs">
                 <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between mb-4">
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
                            <div className="w-8 h-8 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-xs font-bold text-primary">
                                {details?.workout_grouping || idx + 1}
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white group-hover/item:text-primary transition-colors flex items-center gap-2">
                                  <span className="truncate">{details?.exercise?.name || "Exercise"}</span>
                                  <Play className="w-3 h-3 text-primary shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity" />
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{details?.sets} Sets</span>
                                  <span className="text-slate-300 dark:text-slate-700">•</span>
                                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{details?.reps} Reps</span>
                                </div>
                            </div>
                        </div>
                        
                        <Dialog open={swapTargetItemId === item.id} onOpenChange={(open) => setSwapTargetItemId(open ? item.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent aria-describedby={undefined} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0 overflow-hidden rounded-2xl max-w-[90vw] text-slate-900 dark:text-white shadow-xl">
                            <Command className="bg-transparent">
                              <CommandInput placeholder="Swap exercise..." className="h-12 outline-none text-xs font-semibold" />
                              <CommandList className="max-h-[60vh]">
                                <CommandEmpty className="p-6 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">No exercises found.</CommandEmpty>
                                <CommandGroup>
                                  {exercises.map(ex => (
                                    <CommandItem 
                                      key={ex.id} 
                                      onSelect={() => handleSwap(item.id, ex)}
                                      className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
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
                      <div className="mb-4 bg-primary/5 border-l-4 border-primary p-3 rounded-r-xl">
                          <p className="text-xs text-slate-700 dark:text-slate-300 italic font-medium leading-relaxed">
                            "{details.additional_info}"
                          </p>
                      </div>
                    )}

                    <div className="space-y-2">
                       {logs[item.id]?.map((set: any, setIdx: number) => {
                         const isDone = completedSets[`${item.id}-${setIdx}`];
                         return (
                           <div key={setIdx} className={cn(
                              "flex items-center gap-3 p-2 rounded-xl transition-all duration-300",
                              isDone ? "bg-primary/5 opacity-60" : "bg-slate-50 dark:bg-slate-800/40"
                           )}>
                              <div className="w-5 shrink-0 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400">{setIdx + 1}</div>
                              <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                                 <div className="h-9 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center px-2 gap-1 min-w-0">
                                    <input 
                                      type="number" 
                                      value={set.weight}
                                      onChange={(e) => handleSetUpdate(item.id, setIdx, 'weight', e.target.value)}
                                      className="bg-transparent border-none text-xs font-bold w-full min-w-0 outline-none text-slate-900 dark:text-white text-right"
                                    />
                                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase shrink-0">KG</span>
                                 </div>
                                 <div className="h-9 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center px-2 gap-1 min-w-0">
                                    <input 
                                      type="number" 
                                      value={set.reps}
                                      onChange={(e) => handleSetUpdate(item.id, setIdx, 'reps', e.target.value)}
                                      className="bg-transparent border-none text-xs font-bold w-full min-w-0 outline-none text-slate-900 dark:text-white text-right"
                                    />
                                    <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase shrink-0">REPS</span>
                                 </div>
                              </div>
                              <button 
                                onClick={() => toggleSetComplete(item.id, setIdx)}
                                className={cn(
                                  "w-9 h-9 rounded-lg border transition-all flex items-center justify-center shrink-0",
                                  isDone 
                                    ? "bg-primary border-primary text-white scale-95 shadow-xs" 
                                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-primary/40 active:scale-95"
                                )}
                              >
                                  <CheckCircle2 className="w-4 h-4" />
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
          className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 font-semibold text-xs tracking-wider shadow-sm mt-2"
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
        <DialogContent aria-describedby={undefined} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl max-w-md p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Finish Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overall Intensity (RPE)</Label>
                <span className="text-xl font-bold text-primary">{sessionRpe}/10</span>
              </div>
              <Slider 
                value={[sessionRpe]} 
                onValueChange={(v) => setSessionRpe(v[0])} 
                max={10} 
                min={1} 
                step={1} 
                className="py-2"
              />
              <div className="flex justify-between text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <span>Recovery</span>
                <span>Moderate</span>
                <span>Maximum</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Session Notes</Label>
              <Textarea 
                placeholder="Notes for your trainer or personal log..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl min-h-[80px] text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 pt-2">
            <Button onClick={finishWorkout} className="h-11 w-full bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 font-semibold text-xs tracking-wider rounded-xl shadow-sm">
              Finish & Sync Protocol
            </Button>
            <Button variant="ghost" onClick={() => setIsFinishing(false)} className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exercise Detail Dialog */}
      <Dialog open={!!selectedExerciseDetail} onOpenChange={(open) => !open && setSelectedExerciseDetail(null)}>
        <DialogContent aria-describedby={undefined} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl max-w-lg p-0 overflow-hidden shadow-2xl">
          {selectedExerciseDetail && (
            <div className="flex flex-col">
              <div className="aspect-video bg-black/80 relative flex items-center justify-center border-b border-slate-200 dark:border-slate-800">
                {selectedExerciseDetail.video_url ? (
                  <iframe 
                    src={selectedExerciseDetail.video_url.replace("watch?v=", "embed/").split("&")[0]} 
                    className="w-full h-full"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <Play className="w-12 h-12 opacity-30" />
                    <span className="text-xs font-medium uppercase tracking-wider">No Video Demo Available</span>
                  </div>
                )}
              </div>

              <div className="p-6 space-y-5 max-h-[50vh] overflow-y-auto">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{selectedExerciseDetail.name}</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">{selectedExerciseDetail.description || "Maintain control and focus on proper form throughout the movement."}</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <DetailBit label="Prescription" value={`${selectedExerciseDetail.sets} x ${selectedExerciseDetail.reps}`} icon={Zap} />
                  <DetailBit label="Tempo" value={selectedExerciseDetail.tempo || "Normal"} icon={Timer} />
                  <DetailBit label="Rest" value={selectedExerciseDetail.rest ? `${selectedExerciseDetail.rest}s` : "As Needed"} icon={Clock} />
                  <DetailBit label="Category" value={selectedExerciseDetail.category || "General"} icon={Dumbbell} />
                </div>

                {selectedExerciseDetail.notes && (
                  <div className="bg-primary/5 p-3.5 rounded-xl border border-primary/10">
                    <Label className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1 block">Coach Directive</Label>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">"{selectedExerciseDetail.notes}"</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800">
                <Button onClick={() => setSelectedExerciseDetail(null)} className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold h-10 rounded-xl text-slate-800 dark:text-slate-200">
                  Close
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
    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none mb-1">{label}</p>
        <p className="text-xs font-bold text-slate-900 dark:text-white tracking-tight truncate">{value}</p>
      </div>
    </div>
  );
}
