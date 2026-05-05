import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, User } from "lucide-react";

interface InjuryWithProfile {
    id: string;
    injury_type: string;
    diagnosis: string;
    status: string;
    client: {
        id: string;
        first_name: string;
        last_name: string;
    };
    latest_rehab: {
        milestone: string;
    }[];
}

export default function InjuriesWidget() {
    const [injuries, setInjuries] = useState<InjuryWithProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInjuries();
    }, []);

    const fetchInjuries = async () => {
        try {
            // Ideally, we filter by injuries assigned to the logged-in therapist.
            // For now, we fetch all active/rehab injuries in the organization.
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("injuries")
                .select(`
                    id,
                    injury_type,
                    diagnosis,
                    status,
                    client:clients!injuries_client_id_fkey(id, first_name, last_name),
                    latest_rehab:rehab_progress(milestone)
                `)
                .in("status", ["Acute", "Rehab", "RTP"])
                .order("injury_date", { ascending: false })
                .limit(5);

            if (error) throw error;

            // Note: PostgREST array mapping typing can be tricky, so we cast it safely
            setInjuries(data as unknown as InjuryWithProfile[]);
        } catch (error: any) {
            console.error("Error fetching injuries:", error);
            // toast({ title: "Error", description: "Failed to load active injuries.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const getStatusVariant = (status: string) => {
        switch (status) {
            case "Acute": return "destructive";
            case "Rehab": return "default";
            case "RTP": return "secondary"; // Return to play
            default: return "outline";
        }
    };

    return (
        <Card className="h-full border-border shadow-sm">
            <CardHeader className="pb-2 border-b">
                <CardTitle className="text-lg font-display flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" /> Active Rehab Cases
                </CardTitle>
                <CardDescription>Track clinical progress and active injury phases</CardDescription>
            </CardHeader>
            <CardContent className="pt-3 divide-y">
                {loading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : injuries.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
                        <Activity className="w-8 h-8 opacity-20 mb-2" />
                        <p className="text-sm">No active rehab cases found.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {injuries.map((injury) => (
                            <div key={injury.id} className="flex items-start gap-4 pt-3 first:pt-0">
                                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <p className="font-medium text-sm truncate pr-2 text-foreground">
                                            {injury.client?.first_name} {injury.client?.last_name}
                                        </p>
                                        <Badge variant={getStatusVariant(injury.status) as any} className="text-[10px] h-5">
                                            {injury.status}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate mb-1">
                                        {injury.diagnosis || injury.injury_type}
                                    </p>
                                    {injury.latest_rehab && injury.latest_rehab.length > 0 && (
                                        <p className="text-[11px] bg-muted/50 px-2 py-1 rounded inline-block text-muted-foreground">
                                            Current: <span className="font-semibold text-foreground/80">{injury.latest_rehab[0].milestone}</span>
                                        </p>
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
