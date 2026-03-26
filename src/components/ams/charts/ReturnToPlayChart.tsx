import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, subDays, startOfDay } from "date-fns";
import { Loader2, TrendingUp } from "lucide-react";

interface ReturnToPlayChartProps {
    athleteId: string;
    days?: number;
}

export default function ReturnToPlayChart({ athleteId, days = 30 }: ReturnToPlayChartProps) {
    const { data: chartData, isLoading } = useQuery({
        queryKey: ["return_to_play_data", athleteId, days],
        queryFn: async () => {
            const startDate = subDays(new Date(), days).toISOString();

            // Fetch Trainnig Loads
            const { data: loads } = await supabase
                .from("training_sessions")
                .select("session_date, calculated_load")
                .eq("athlete_id", athleteId)
                .gte("session_date", startDate);

            // Fetch Pain Scores from SOAP Notes
            const { data: notes } = await supabase
                .from("physio_session_details")
                .select(`
                    pain_score,
                    sessions!inner(scheduled_start)
                `)
                .eq("sessions.client_id", athleteId)
                .gte("sessions.scheduled_start", startDate);

            // Combine data by date
            const dateMap: Record<string, { date: string, load: number, pain: number | null }> = {};

            // Initialize last 30 days
            for (let i = days; i >= 0; i--) {
                const date = format(subDays(new Date(), i), "MMM dd");
                dateMap[date] = { date, load: 0, pain: null };
            }

            loads?.forEach(l => {
                const d = format(new Date(l.session_date), "MMM dd");
                if (dateMap[d]) dateMap[d].load += l.calculated_load;
            });

            notes?.forEach(n => {
                const d = format(new Date(n.sessions.scheduled_start), "MMM dd");
                if (dateMap[d]) dateMap[d].pain = n.pain_score;
            });

            return Object.values(dateMap);
        },
        enabled: !!athleteId
    });

    if (isLoading) return <div className="h-[300px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

    return (
        <Card className="shadow-lg border-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2 font-display">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Return-to-Play Progression
                    </CardTitle>
                    <CardDescription className="text-xs">Correlating Clinical Pain vs. Training Load (Last {days} Days)</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-[350px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                            <XAxis 
                                dataKey="date" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                minTickGap={10}
                            />
                            <YAxis 
                                yAxisId="left" 
                                label={{ value: 'Training Load', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#888' }}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                stroke="#f97316"
                            />
                            <YAxis 
                                yAxisId="right" 
                                orientation="right" 
                                label={{ value: 'Pain Score', angle: 90, position: 'insideRight', fontSize: 10, fill: '#888' }}
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                stroke="#ef4444"
                                domain={[0, 10]}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                            <Bar 
                                yAxisId="left" 
                                dataKey="load" 
                                name="Daily Training Load" 
                                fill="#f97316" 
                                radius={[4, 4, 0, 0]} 
                                opacity={0.6}
                                barSize={20}
                            />
                            <Line 
                                yAxisId="right" 
                                type="monotone" 
                                dataKey="pain" 
                                name="Pain Score" 
                                stroke="#ef4444" 
                                strokeWidth={3} 
                                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }} 
                                connectNulls
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
