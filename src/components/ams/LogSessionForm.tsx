import React, { useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Plus, Trash2, Dumbbell, Search, ChevronDown, 
  RotateCcw, Scale, Hash, Timer, Award, Zap, CheckCircle2,
  Trophy, Clock, Activity
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useLastSession } from "@/hooks/useLastSession";
import { Badge } from "@/components/ui/badge";
import RestTimer from "./RestTimer";
import { cn } from "@/lib/utils";
import { Exercise, WorkoutLog, WorkoutSet } from "@/types/ams";

const setSchema = z.object({
  weight_kg: z.coerce.number().min(0, "Weight must be positive"),
  reps: z.coerce.number().min(0, "Reps must be positive"),
  rpe: z.coerce.number().min(1).max(10).optional(),
});

const exerciseSchema = z.object({
  exercise_id: z.string().min(1, "Select an exercise"),
  exercise_name: z.string(),
  equipment_type: z.string().default("Barbell"),
  sets: z.array(setSchema).min(1, "At least one set required"),
});

const workoutSchema = z.object({
  sport_type: z.string().default("Weightlifting"),
  duration_mins: z.coerce.number().min(1, "Enter duration"),
  rpe: z.coerce.number().min(1).max(10),
  exercises: z.array(exerciseSchema).min(1, "Add at least one exercise"),
});

type WorkoutFormValues = z.infer<typeof workoutSchema>;

export default function LogSessionForm() {
  const { clientId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [gymEnvironment, setGymEnvironment] = useState<string>("heavy_gym");
  const [exerciseSearchOpen, setExerciseSearchOpen] = useState<number | null>(null);
  const [showRestTimer, setShowRestTimer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Master Exercise Library with filtering
  const { data: exerciseLibrary = [] } = useQuery<Exercise[]>({
    queryKey: ['exercise-library', gymEnvironment],
    queryFn: async () => {
      let query = supabase
        .from('exercises')
        .select('id, name, category, equipment_type')
        .order('name');
      
      // Hierarchical filtering
      if (gymEnvironment === "average_gym") {
        query = query.in('equipment_type', ['average_gym', 'minimal_equipment', 'calisthenics']);
      } else if (gymEnvironment === "minimal_equipment") {
        query = query.in('equipment_type', ['minimal_equipment', 'calisthenics']);
      } else if (gymEnvironment === "calisthenics") {
        query = query.eq('equipment_type', 'calisthenics');
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      sport_type: "Weightlifting",
      duration_mins: 60,
      rpe: 7,
      exercises: [
        {
          exercise_id: "",
          exercise_name: "",
          equipment_type: "Barbell",
          sets: [{ weight_kg: 0, reps: 0, rpe: 7 }],
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });

  const handleSubmit = async (values: WorkoutFormValues) => {
    if (!clientId) return;
    setIsSubmitting(true);

    try {
      // 1. Create Workout Completion
      const { data: completion, error: cError } = await (supabase
        .from('athlete_workout_completions' as any)
        .insert({
          athlete_id: clientId,
          org_id: profile?.organization_id,
          completed_at: new Date().toISOString(),
          total_duration_mins: values.duration_mins,
          status: 'completed'
        } as any) as any)
        .select()
        .single();

      if (cError) throw cError;

      // 2. Create Ad-hoc Workout Items & Logs
      // For ad-hoc, we first need to create workout_items for each exercise
      for (const ex of values.exercises) {
        // a. Create the workout_item entry
        const { data: item, error: iError } = await (supabase
          .from('workout_items' as any)
          .insert({
            workout_day_id: null, // Ad-hoc has no workout_day
            item_type: 'lift',
            display_order: 0,
            org_id: profile?.organization_id
          } as any) as any)
          .select()
          .single();

        if (iError) throw iError;

        // b. Create the lift_item detail
        const { error: liError } = await (supabase
          .from('lift_items' as any)
          .insert({
            workout_item_id: item.id,
            exercise_id: ex.exercise_id,
            sets: ex.sets.length,
            reps: ex.sets[0].reps.toString(),
            load_value: ex.sets[0].weight_kg,
            org_id: profile?.organization_id
          } as any));

        if (liError) throw liError;

        // c. Create the actual logs for each set
        const setLogs = ex.sets.map((set, idx) => ({
          completion_id: completion.id,
          workout_item_id: item.id,
          athlete_id: clientId,
          org_id: profile?.organization_id,
          set_number: idx + 1,
          weight_kg: set.weight_kg,
          reps: set.reps,
          is_completed: true
        }));

        const { error: lError } = await supabase
          .from('athlete_item_logs' as any)
          .insert(setLogs as any);

        if (lError) throw lError;
      }

      toast({
        title: "Session Logged Successfully!",
        description: `Great work! Your ad-hoc session has been recorded.`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["athlete_workout_completions"] });
      queryClient.invalidateQueries({ queryKey: ["athlete_item_logs"] });
      
      form.reset();
    } catch (error: any) {
      toast({
        title: "Logging Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8 animate-in fade-in duration-500">
        <div className="px-6 pt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">Gym Environment</label>
            <ToggleGroup 
              type="single" 
              value={gymEnvironment}
              onValueChange={(val) => val && setGymEnvironment(val)}
              className="justify-start gap-2"
            >
              <ToggleGroupItem value="heavy_gym" className="rounded-xl px-4 py-2 h-auto flex flex-col items-center gap-1 border-2 border-transparent data-[state=on]:border-primary data-[state=on]:bg-primary/5">
                <Dumbbell className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase">Heavy Gym</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="average_gym" className="rounded-xl px-4 py-2 h-auto flex flex-col items-center gap-1 border-2 border-transparent data-[state=on]:border-primary data-[state=on]:bg-primary/5">
                <Scale className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase">Average Gym</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="minimal_equipment" className="rounded-xl px-4 py-2 h-auto flex flex-col items-center gap-1 border-2 border-transparent data-[state=on]:border-primary data-[state=on]:bg-primary/5">
                <Zap className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase">Minimal</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="calisthenics" className="rounded-xl px-4 py-2 h-auto flex flex-col items-center gap-1 border-2 border-transparent data-[state=on]:border-primary data-[state=on]:bg-primary/5">
                <Activity className="w-4 h-4" />
                <span className="text-[9px] font-black uppercase">Bodyweight</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col sm:row gap-4">
            <FormField
              control={form.control}
              name="duration_mins"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Duration (min)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="glass-card border-none h-12 text-lg font-bold italic" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rpe"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                    <Zap className="w-3 h-3 text-amber-500" /> Overall RPE (1-10)
                  </FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="glass-card border-none h-12 text-lg font-bold italic" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="space-y-6 px-4">
          {fields.map((field, index) => (
            <ExerciseField 
              key={field.id} 
              index={index} 
              remove={remove} 
              form={form} 
              exerciseLibrary={exerciseLibrary}
              isSearchOpen={exerciseSearchOpen === index}
              setSearchOpen={(open) => setExerciseSearchOpen(open ? index : null)}
              onSetComplete={() => setShowRestTimer(true)}
            />
          ))}
        </div>

        <div className="flex flex-col gap-4 px-6 pb-8">
            <Button
                type="button"
                variant="outline"
                onClick={() => append({
                    exercise_id: "",
                    exercise_name: "",
                    equipment_type: "Barbell",
                    sets: [{ weight_kg: 0, reps: 0, rpe: 7 }],
                })}
                className="w-full h-14 rounded-2xl border-dashed border-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5 text-primary font-bold gap-2 transition-all"
            >
                <Plus className="w-5 h-5" /> Add Another Exercise
            </Button>

            <Button 
                type="submit" 
                className="w-full h-16 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-black text-xl uppercase tracking-widest shadow-[0_8px_30px_rgb(20,184,166,0.3)] hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50"
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <RotateCcw className="w-6 h-6 animate-spin" />
                ) : (
                    <span className="flex items-center gap-3">
                        <CheckCircle2 className="w-6 h-6" /> Finish & Log Workout
                    </span>
                )}
            </Button>
        </div>

        {/* Floating Rest Timer */}
        {showRestTimer && (
          <div className="fixed bottom-6 right-6 z-50 w-64">
             <RestTimer onClose={() => setShowRestTimer(false)} />
          </div>
        )}
      </form>
    </Form>
  );
}

function ExerciseField({ 
  index, 
  remove, 
  form, 
  exerciseLibrary,
  isSearchOpen,
  setSearchOpen,
  onSetComplete
}: { 
  index: number; 
  remove: (index: number) => void; 
  form: any;
  exerciseLibrary: Exercise[];
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  onSetComplete: () => void;
}) {
  const { fields: sets, append: appendSet, remove: removeSet } = useFieldArray({
    control: form.control,
    name: `exercises.${index}.sets`,
  });

  const exerciseId = useWatch({
    control: form.control,
    name: `exercises.${index}.exercise_id`
  });

  const { data: history } = useLastSession(exerciseId);

  const handleAddSet = () => {
    const currentSets = form.getValues(`exercises.${index}.sets`);
    const lastSet = currentSets[currentSets.length - 1];
    appendSet({ 
      weight_kg: lastSet?.weight_kg || 0, 
      reps: lastSet?.reps || 0, 
      rpe: lastSet?.rpe || 7 
    });
  };

  return (
    <div className="glass-card rounded-3xl p-5 space-y-4 border-l-4 border-l-primary/30 relative group">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
        <div className="flex-1 w-full">
          <Popover open={isSearchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start text-left font-black text-xl px-0 hover:bg-transparent h-auto gap-2"
              >
                <Dumbbell className="w-5 h-5 text-primary" />
                {form.getValues(`exercises.${index}.exercise_name`) || "Select Exercise"}
                <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 glass border-none" align="start">
              <Command>
                <CommandInput placeholder="Search exercises..." />
                <CommandList>
                  <CommandEmpty>No exercise found.</CommandEmpty>
                  <CommandGroup>
                    {exerciseLibrary.map((ex) => (
                      <CommandItem
                        key={ex.id}
                        onSelect={() => {
                          form.setValue(`exercises.${index}.exercise_id`, ex.id);
                          form.setValue(`exercises.${index}.exercise_name`, ex.name);
                          setSearchOpen(false);
                        }}
                        className="p-3 cursor-pointer hover:bg-primary/10 transition-colors"
                      >
                        {ex.name}
                        <div className="ml-auto flex gap-1">
                          <Badge variant="outline" className="text-[8px] uppercase px-1 h-4">{ex.category}</Badge>
                          <Badge variant="secondary" className="text-[8px] uppercase px-1 h-4">{ex.equipment_type.replace('_', ' ')}</Badge>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          <div className="flex items-center gap-3 mt-1">
            <ToggleGroup 
              type="single" 
              value={form.watch(`exercises.${index}.equipment_type`)}
              onValueChange={(val) => val && form.setValue(`exercises.${index}.equipment_type`, val)}
              className="justify-start scale-90 -ml-4"
            >
              <ToggleGroupItem value="Barbell" className="rounded-lg">Barbell</ToggleGroupItem>
              <ToggleGroupItem value="Dumbbell" className="rounded-lg">Dumbbell</ToggleGroupItem>
              <ToggleGroupItem value="Machine" className="rounded-lg">Machine</ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          onClick={() => remove(index)}
          className="text-muted-foreground hover:text-destructive transition-colors group-hover:opacity-100 sm:opacity-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {(history?.last || history?.best) && (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
           {history.last && (
             <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap bg-muted/30 px-3 py-1.5 rounded-full">
                <RotateCcw className="w-3 h-3" /> Last: {history.last.weight_kg}kg × {history.last.reps}
             </div>
           )}
           {history.best && (
             <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary whitespace-nowrap bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 shadow-glow animate-in fade-in slide-in-from-left-2 delay-150">
                <Trophy className="w-3 h-3 fill-primary/20" /> Best: {history.best.weight_kg}kg × {history.best.reps}
             </div>
           )}
        </div>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-12 gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 transition-opacity">
          <div className="col-span-1 text-center">Set</div>
          <div className="col-span-4 pl-4 flex items-center gap-1"><Scale className="w-2.5 h-2.5" /> Weight</div>
          <div className="col-span-4 pl-4 flex items-center gap-1"><Hash className="w-2.5 h-2.5" /> Reps</div>
          <div className="col-span-3"></div>
        </div>

        {sets.map((setField, setIndex) => (
          <SetRow 
            key={setField.id} 
            index={index} 
            setIndex={setIndex} 
            form={form} 
            removeSet={removeSet} 
            onComplete={onSetComplete}
            bestLift={history?.best}
          />
        ))}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAddSet}
          className="w-full rounded-xl hover:bg-primary/5 text-xs font-bold gap-2 py-6 border border-dashed border-primary/10"
        >
          <Plus className="w-4 h-4" /> Add Set
        </Button>
      </div>
    </div>
  );
}

function SetRow({ 
    index, 
    setIndex, 
    form, 
    removeSet, 
    onComplete,
    bestLift
}: { 
    index: number; 
    setIndex: number; 
    form: any; 
    removeSet: (idx: number) => void;
    onComplete: () => void;
    bestLift?: { weight_kg: number, reps: number } | null;
}) {
    const [isCompleted, setIsCompleted] = useState(false);
    const weight = useWatch({ control: form.control, name: `exercises.${index}.sets.${setIndex}.weight_kg` });
    const reps = useWatch({ control: form.control, name: `exercises.${index}.sets.${setIndex}.reps` });

    const isPR = bestLift && (
        weight > bestLift.weight_kg || 
        (weight === bestLift.weight_kg && reps > bestLift.reps)
    );

    return (
        <div className={cn(
            "grid grid-cols-12 gap-2 items-center group/row p-2 rounded-2xl transition-all duration-300",
            isCompleted ? "bg-primary/5 opacity-70" : "hover:bg-muted/30"
        )}>
            <div className="col-span-1 text-center font-black text-xs text-muted-foreground">{setIndex + 1}</div>
            
            <div className="col-span-4 relative">
                <Input 
                    type="number" 
                    {...form.register(`exercises.${index}.sets.${setIndex}.weight_kg`)}
                    className="h-11 rounded-xl glass-card border-none text-center font-bold italic pr-6" 
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/40 italic">kg</span>
            </div>

            <div className="col-span-4">
               <Input 
                    type="number" 
                    {...form.register(`exercises.${index}.sets.${setIndex}.reps`)}
                    className="h-11 rounded-xl glass-card border-none text-center font-bold italic" 
                />
            </div>

            <div className="col-span-3 flex items-center justify-end gap-1">
                {isPR && !isCompleted && weight > 0 && (
                    <div className="animate-in zoom-in-50 duration-500">
                        <Badge className="bg-amber-500 hover:bg-amber-600 text-[9px] h-5 px-1 font-black uppercase">PR</Badge>
                    </div>
                )}
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                        setIsCompleted(!isCompleted);
                        if (!isCompleted) {
                            onComplete();
                        }
                    }}
                    className={cn(
                        "h-10 w-10 rounded-xl transition-all",
                        isCompleted ? "bg-primary text-primary-foreground" : "hover:bg-primary/10 text-primary"
                    )}
                >
                   {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <RotateCcw className="w-4 h-4 opacity-50" />}
                </Button>
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeSet(setIndex)}
                    className="h-10 w-10 text-muted-foreground hover:text-destructive opacity-0 group-hover/row:opacity-100 transition-all"
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
