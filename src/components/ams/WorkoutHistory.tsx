import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Calendar, Dumbbell, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface WorkoutHistoryProps {
  athleteId: string;
}

export default function WorkoutHistory({ athleteId }: WorkoutHistoryProps) {
  const [emblaRef] = useEmblaCarousel({ align: "start", dragFree: true });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['workout-history', athleteId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('athlete_workout_completions' as any)
        .select(`
          id,
          completed_at,
          total_duration_mins,
          logs:athlete_item_logs(
            weight_kg,
            reps,
            workout_item:workout_items(
              lift:lift_items(
                exercise:exercises(name)
              )
            )
          )
        `)
        .eq('athlete_id', athleteId)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;

      // Map to consistent format
      return (data as any[]).map(comp => ({
        id: comp.id,
        created_at: comp.completed_at,
        duration_mins: comp.total_duration_mins,
        workout_sets: comp.logs.map((L: any) => ({
          weight_kg: L.weight_kg,
          reps: L.reps,
          exercise_name: L.workout_item.lift?.exercise?.name || "Exercise"
        }))
      }));
    }
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  if (history.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-transparent">
        <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Calendar className="w-8 h-8 mb-2 opacity-20" />
          <p>No workout history found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Recent Workout History
        </h3>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {history.map((log) => (
            <div key={log.id} className="flex-[0_0_85%] sm:flex-[0_0_45%] min-w-0">
              <Card className="h-full shadow-md border-none bg-card/60 backdrop-blur-sm hover:bg-card/80 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-md font-bold">{format(new Date(log.created_at), 'MMMM d')}</CardTitle>
                      <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'yyyy')}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-primary/5">{log.duration_mins} mins</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Unique exercises in this log */}
                    {Array.from(new Set(log.workout_sets.map((s: any) => s.exercise_name))).slice(0, 3).map((exName: any) => {
                      const sets = log.workout_sets.filter((s: any) => s.exercise_name === exName);
                      const bestSet = [...sets].sort((a, b) => b.weight_kg - a.weight_kg)[0];
                      return (
                        <div key={exName} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Dumbbell className="w-3 h-3 text-primary flex-shrink-0" />
                            <span className="truncate font-medium">{exName}</span>
                          </div>
                          <span className="text-xs font-semibold whitespace-nowrap ml-2">
                            {sets.length} × {bestSet?.weight_kg}kg
                          </span>
                        </div>
                      );
                    })}
                    {new Set(log.workout_sets.map((s: any) => s.exercise_name)).size > 3 && (
                      <p className="text-[10px] text-muted-foreground italic">
                        + {new Set(log.workout_sets.map((s: any) => s.exercise_name)).size - 3} more exercises
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function History({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}
