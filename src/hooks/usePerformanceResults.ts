import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PerformanceAssessment {
    id: string;
    athlete_id: string;
    recorded_by: string;
    category: 'Jump' | 'Sprint' | 'Strength' | 'Mobility' | 'Conditioning';
    test_name: string;
    metrics: Record<string, any>;
    recorded_at: string;
    session_id?: string;
}

export function usePerformanceResults(athleteId?: string) {
    return useQuery({
        queryKey: ['performance-results', athleteId],
        queryFn: async () => {
            if (!athleteId) return [];
            
            const { data, error } = await supabase
                .from('performance_assessments')
                .select('*')
                .eq('athlete_id', athleteId)
                .order('recorded_at', { ascending: false });

            if (error) throw error;
            return data as PerformanceAssessment[];
        },
        enabled: !!athleteId
    });
}

export function usePersonalBests(athleteId?: string) {
    const { data: results, isLoading } = usePerformanceResults(athleteId);

    const personalBests = (results || []).reduce((acc, curr) => {
        const testKey = curr.test_name;
        const currentScore = curr.metrics.value || curr.metrics.score || 0;
        
        if (!acc[testKey] || currentScore > (acc[testKey].metrics.value || 0)) {
            acc[testKey] = curr;
        }
        return acc;
    }, {} as Record<string, PerformanceAssessment>);

    return { personalBests, isLoading };
}

/**
 * Helper to determine if a performance result is a PB
 * Logic depends on the test type (higher is better for jumps, lower for sprints)
 */
export const isBetterResult = (testName: string, newValue: number, oldValue?: number) => {
    if (oldValue === undefined) return true;
    
    // Default: Higher is better (Jump, Strength, Mobility)
    const lowerIsBetterTests = ['30m Sprint', '10m Sprint', 'Pro Agility', '5-10-5'];
    
    if (lowerIsBetterTests.includes(testName)) {
        return newValue < oldValue;
    }
    
    return newValue > oldValue;
};
