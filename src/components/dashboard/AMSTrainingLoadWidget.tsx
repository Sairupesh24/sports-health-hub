import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TrainingLoadWithProfile {
    id: string;
    training_date: string;
    workout_name: string;
    training_load: number;
    readiness_score: number;
    duration_minutes: number | null;
    completion_status: string | null;
    client: {
        id: string;
        first_name: string;
        last_name: string;
    };
}

export default function AMSTrainingLoadWidget({ clientId }: { clientId?: string }) {
    const [loads, setLoads] = useState<TrainingLoadWithProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrainingLoads();
    }, [clientId]);

    const fetchTrainingLoads = async () => {
        try {
            // Fetch recent training loads from the AMS integration table
            // In a real app we would limit to the consultant's assigned athletes.
            const today = new Date();
            const lastWeek = new Date(today);
            lastWeek.setDate(lastWeek.getDate() - 7);

            let query = supabase
                .from("external_training_summary")
                .select(`
                    id,
                    training_date,
                    workout_name,
                    training_load,
                    readiness_score,
                    duration_minutes,
                    completion_status,
                    client:profiles!external_training_summary_client_id_fkey(id, first_name, last_name)
                `)
                .gte("training_date", lastWeek.toISOString())
                .order("training_date", { ascending: false })
                .limit(5);

            if (clientId) {
                query = query.eq('client_id', clientId);
            }

            const { data, error } = await query;

            if (error) throw error;
            setLoads(data as unknown as TrainingLoadWithProfile[]);
        } catch (error: any) {
            console.error("Error fetching AMS data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getLoadColor = (load: number | null) => {
        if (!load) return "bg-slate-100 text-slate-800";
        if (load > 800) return "bg-red-100 text-red-800 border-red-200";
        if (load > 500) return "bg-amber-100 text-amber-800 border-amber-200";
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    };

    return (
        <Card className="h-full border-border shadow-sm">
            <CardHeader className="pb-3 border-b">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg font-display flex items-center gap-2">
                            <Flame className="w-5 h-5 text-orange-500" /> AMS Internal Load
                        </CardTitle>
                        <CardDescription>Recent external training volume (7 days)</CardDescription>
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="text-xs max-w-[200px]">Data synced directly from the athlete's integrated AMS platform (e.g., TeamBuildr, Smartabase) to guide intensity.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent className="pt-4 divide-y">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4">
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                                <Skeleton className="h-8 w-16 rounded" />
                            </div>
                        ))}
                    </div>
                ) : loads.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
                        <Flame className="w-8 h-8 opacity-20 mb-2" />
                        <p className="text-sm">No recent AMS data found.</p>
                        <p className="text-xs mt-1">Check athlete integrations.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {loads.map((load) => (
                            <div key={load.id} className="flex items-center justify-between gap-4 pt-4 first:pt-0">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate text-foreground">
                                        {load.client?.first_name} {load.client?.last_name}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                        <span className="truncate max-w-[120px]" title={load.workout_name || 'Workout'}>
                                            {load.workout_name || "Workout"}
                                        </span>
                                        <span>•</span>
                                        <span>{new Date(load.training_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                        {load.duration_minutes && (
                                            <>
                                                <span>•</span>
                                                <span>{load.duration_minutes}m</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                    <Badge variant="outline" className={`${getLoadColor(load.training_load)} text-[11px] h-6 px-2 whitespace-nowrap`}>
                                        Load: {load.training_load || "--"}
                                    </Badge>
                                        <span className={`text-[10px] font-medium ${load.readiness_score < 4 ? 'text-destructive' : 'text-emerald-600'}`}>
                                            Readiness: {load.readiness_score}/10
                                        </span>
                                    {load.completion_status && (
                                        <span className={`text-[10px] font-bold uppercase ${
                                            load.completion_status.toLowerCase() === 'completed' ? 'text-emerald-500' : 'text-amber-500'
                                        }`}>
                                            {load.completion_status}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
