import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";

export function useLastSession(exerciseId: string | null) {
  const { user, profile } = useAuth();
  const userId = user?.id || profile?.id;

  return useQuery({
    queryKey: ["exercise-history", exerciseId, userId],
    enabled: !!exerciseId && !!userId,
    queryFn: async () => {
      const data = await apiFetch(`/api/ams/exercise-history/${exerciseId}`);
      if (!data) return { last: null, best: null };
      
      return {
        last: data.last ? {
          weight_kg: data.last.weight_kg,
          reps: data.last.reps,
          date: new Date(data.last.date).toLocaleDateString(),
        } : null,
        best: data.best ? {
          weight_kg: data.best.weight_kg,
          reps: data.best.reps,
        } : null
      };
    },
  });
}
