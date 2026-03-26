import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useLastSession(exerciseId: string | null) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["exercise-history", exerciseId, session?.user?.id],
    enabled: !!exerciseId && !!session?.user?.id,
    queryFn: async () => {
      // 1. Fetch Last Session
      const { data: lastData } = await supabase
        .from("workout_sets")
        .select(`
          weight_kg, reps,
          workout_logs (created_at)
        `)
        .eq("exercise_id", exerciseId)
        .order("created_at", { ascending: false })
        .limit(1);

      // 2. Fetch Best Lift (PR)
      const { data: bestData } = await supabase
        .from("workout_sets")
        .select("weight_kg, reps")
        .eq("exercise_id", exerciseId)
        .order("weight_kg", { ascending: false })
        .order("reps", { ascending: false })
        .limit(1);

      return {
        last: lastData?.[0] ? {
          weight_kg: lastData[0].weight_kg,
          reps: lastData[0].reps,
          date: new Date(lastData[0].workout_logs.created_at).toLocaleDateString(),
        } : null,
        best: bestData?.[0] ? {
          weight_kg: bestData[0].weight_kg,
          reps: bestData[0].reps,
        } : null
      };
    },
  });
}
