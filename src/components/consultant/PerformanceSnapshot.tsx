import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Moon, Zap, AlertTriangle } from "lucide-react";
import { format, subDays } from "date-fns";
import { Progress } from "@/components/ui/progress";
import SorenessHeatmap from "@/components/ams/SorenessHeatmap";
import { cn } from "@/lib/utils";


interface PerformanceSnapshotProps {
    clientId: string;
}

export default function PerformanceSnapshot({ clientId }: PerformanceSnapshotProps) {
    const { data: logs, isLoading } = useQuery({
        queryKey: ["client_performance_snapshot", clientId],
        queryFn: async () => {
            const sevenDaysAgo = subDays(new Date(), 7).toISOString();
            const { data, error } = await supabase
                .from("wellness_logs")
                .select("*")
                .eq("athlete_id", clientId)
                .gte("created_at", sevenDaysAgo)
                .order("created_at", { ascending: false });
            
            if (error) throw error;
            return data;
        },
        enabled: !!clientId
    });

    if (isLoading) return <div className="space-y-3 animate-pulse">
        <div className="h-20 bg-muted rounded-md" />
        <div className="h-20 bg-muted rounded-md" />
    </div>;

    if (!logs || logs.length === 0) return (
        <div className="p-4 bg-muted/20 border border-dashed rounded-lg text-center text-xs text-muted-foreground">
            No AMS wellness data recorded in the last 7 days.
        </div>
    );

    const latest = logs[0];
    const avgSleep = logs.reduce((acc, log) => acc + log.sleep_score, 0) / logs.length;
    const avgStress = logs.reduce((acc, log) => acc + log.stress_level, 0) / logs.length;
    const avgFatigue = logs.reduce((acc, log) => acc + log.fatigue_level, 0) / logs.length;

    const getScoreColor = (score: number) => {
        if (score >= 7) return "text-emerald-500";
        if (score >= 4) return "text-amber-500";
        return "text-red-500";
    };

    const getProgressColor = (score: number) => {
        if (score >= 7) return "bg-emerald-500";
        if (score >= 4) return "bg-amber-500";
        return "bg-red-500";
    };

    return (
        <Card className="border-border/50 bg-muted/10">
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    7-Day Performance Snapshot
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-background border border-border/50">
                        <Moon className="w-3 h-3 mx-auto mb-1 text-blue-500" />
                        <span className={cn("text-lg font-bold font-display", getScoreColor(avgSleep))}>{avgSleep.toFixed(1)}</span>
                        <p className="text-[10px] text-muted-foreground uppercase">Sleep</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-background border border-border/50">
                        <Zap className="w-3 h-3 mx-auto mb-1 text-orange-500" />
                        <span className={cn("text-lg font-bold font-display", getScoreColor(11 - avgStress))}>{(11 - avgStress).toFixed(1)}</span>
                        <p className="text-[10px] text-muted-foreground uppercase">Stress</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-background border border-border/50">
                        <Activity className="w-3 h-3 mx-auto mb-1 text-red-500" />
                        <span className={cn("text-lg font-bold font-display", getScoreColor(11 - avgFatigue))}>{(11 - avgFatigue).toFixed(1)}</span>
                        <p className="text-[10px] text-muted-foreground uppercase">Energy</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-medium uppercase text-muted-foreground">
                            <span>Muscle Soreness</span>
                            <span className={getScoreColor(11 - latest.soreness_level)}>{latest.soreness_level}/10</span>
                        </div>
                        <Progress value={latest.soreness_level * 10} className={cn("h-1", getProgressColor(11 - latest.soreness_level))} />
                    </div>

                    {latest.soreness_data && (latest.soreness_data as string[]).length > 0 && (
                        <div className="space-y-3">
                            <div className="p-2 rounded bg-red-50 border border-red-100 flex items-start gap-2">
                                <AlertTriangle className="w-3 h-3 text-red-600 mt-0.5" />
                                <div className="text-[10px] text-red-800 leading-tight">
                                    <span className="font-bold">Hotspots: </span>
                                    {(latest.soreness_data as string[]).join(", ").replace(/_/g, " ")}
                                </div>
                            </div>
                            <SorenessHeatmap selectedZones={latest.soreness_data as string[]} readOnly />
                        </div>
                    )}

                </div>

                <p className="text-[10px] text-center text-muted-foreground italic">
                    Latest check-in: {format(new Date(latest.created_at), "MMM d, h:mm a")}
                </p>
            </CardContent>
        </Card>
    );
}


