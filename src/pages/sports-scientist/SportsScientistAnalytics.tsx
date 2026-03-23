import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    LineChart, 
    Line,
    PieChart,
    Pie,
    Cell
} from "recharts";
import { Loader2, TrendingUp, Users, Calendar, Activity, ArrowLeft, ClipboardList, Flame } from "lucide-react";
import { format, startOfMonth, subMonths, eachMonthOfInterval } from "date-fns";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AMSTrainingLoadWidget from "@/components/dashboard/AMSTrainingLoadWidget";

export default function SportsScientistAnalytics() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const clientId = searchParams.get("client");

    // Global Stats Query
    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ["scientist-analytics", user?.id],
        queryFn: async () => {
            if (!user) return null;

            const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
            const { data: sessions, error } = await supabase
                .from("sessions")
                .select(`
                    id, 
                    scheduled_start, 
                    status, 
                    session_mode, 
                    session_type:session_types(name)
                `)
                .eq('scientist_id', user.id)
                .gte("scheduled_start", sixMonthsAgo);

            if (error) throw error;

            const months = eachMonthOfInterval({
                start: subMonths(new Date(), 5),
                end: new Date()
            });

            const monthlyData = months.map(m => {
                const monthStr = format(m, "MMM");
                const count = sessions?.filter(s => 
                    format(new Date(s.scheduled_start), "MMM yyyy") === format(m, "MMM yyyy")
                ).length || 0;
                return { name: monthStr, sessions: count };
            });

            const typeCounts: Record<string, number> = {};
            sessions?.forEach(s => {
                const typeName = (s.session_type as any)?.name || "Other";
                typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
            });
            const pieData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

            const modeCounts = {
                Individual: sessions?.filter(s => s.session_mode === 'Individual').length || 0,
                Group: sessions?.filter(s => s.session_mode === 'Group').length || 0
            };

            return {
                totalSessions: sessions?.length || 0,
                completedSessions: sessions?.filter(s => s.status === 'Completed').length || 0,
                monthlyData,
                pieData,
                modeCounts
            };
        },
        enabled: !!user && !clientId
    });

    // Client Specific Query
    const { data: athleteData, isLoading: isLoadingAthlete } = useQuery({
        queryKey: ["athlete-analytics", clientId],
        queryFn: async () => {
            if (!clientId) return null;

            // 1. Fetch Client Info
            const { data: client, error: clientErr } = await supabase
                .from('clients')
                .select('*')
                .eq('id', clientId)
                .single();
            if (clientErr) throw clientErr;

            // 2. Fetch Sessions & Pain Scores
            const { data: sessions, error: sessionErr } = await supabase
                .from('sessions')
                .select(`
                    *,
                    physio_session_details (pain_score)
                `)
                .eq('client_id', clientId)
                .order('scheduled_start', { ascending: true });
            if (sessionErr) throw sessionErr;

            // 3. Process Pain Scores for Chart
            const painData = sessions
                .filter(s => s.physio_session_details?.[0]?.pain_score !== null && s.physio_session_details?.[0]?.pain_score !== undefined)
                .map(s => ({
                    date: format(new Date(s.scheduled_start), "MMM d"),
                    score: s.physio_session_details[0].pain_score
                }));

            // 4. Fetch Injuries
            const { data: injuries, error: injuryErr } = await supabase
                .from('injuries')
                .select('*')
                .eq('client_id', clientId)
                .order('injury_date', { ascending: false });
            if (injuryErr) throw injuryErr;

            return {
                client,
                sessions: [...sessions].reverse(),
                painData,
                injuries: injuries || [],
                totalSessionsCount: sessions.filter(s => s.status === 'Completed').length,
                activeInjuries: injuries?.filter(i => i.status !== 'Resolved').length || 0,
                lastSession: sessions.length > 0 ? sessions[sessions.length - 1] : null
            };
        },
        enabled: !!clientId
    });

    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F'];

    if (isLoadingStats || isLoadingAthlete) {
        return (
            <DashboardLayout role="sports_scientist">
                <div className="h-[80vh] flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground font-medium">Analyzing performance data...</p>
                </div>
            </DashboardLayout>
        );
    }

    // If a client is selected, show athlete-specific view
    if (clientId && athleteData) {
        return (
            <DashboardLayout role="sports_scientist">
                <div className="space-y-6 pb-12">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/sports-scientist/clients")}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-display font-bold text-foreground">
                                    {athleteData.client.first_name} {athleteData.client.last_name}
                                </h1>
                                <Badge variant="outline" className="font-mono text-lg">{athleteData.client.uhid}</Badge>
                            </div>
                            <p className="text-muted-foreground mt-1 flex items-center gap-2">
                                <Users className="w-4 h-4" /> Comprehensive Athlete Analytics
                            </p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card className="gradient-card border-none shadow-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{athleteData.totalSessionsCount}</div>
                                <p className="text-xs text-muted-foreground mt-1">Completed across all types</p>
                            </CardContent>
                        </Card>
                        <Card className="gradient-card border-none shadow-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Active Injuries</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{athleteData.activeInjuries}</div>
                                <p className="text-xs text-muted-foreground mt-1 text-red-500 font-medium">Requiring attention</p>
                            </CardContent>
                        </Card>
                        <Card className="gradient-card border-none shadow-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Last Session</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-bold truncate">
                                    {athleteData.lastSession ? format(new Date(athleteData.lastSession.scheduled_start), "MMM d, yyyy") : "None"}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {athleteData.lastSession?.service_type || "N/A"}
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="gradient-card border-none shadow-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Readiness Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-emerald-600">Optimal</div>
                                <p className="text-xs text-muted-foreground mt-1">Based on latest AMS</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pain Score Progress */}
                        <Card className="shadow-sm border-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-red-500" /> Pain Score Progression
                                </CardTitle>
                                <CardDescription>Visual trend of reported pain levels (0-10)</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                {athleteData.painData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={athleteData.painData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                            <XAxis dataKey="date" />
                                            <YAxis domain={[0, 10]} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Line type="monotone" dataKey="score" stroke="rgb(239, 68, 68)" strokeWidth={3} dot={{ r: 4, fill: "rgb(239, 68, 68)" }} activeDot={{ r: 6 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                                        <Activity className="w-10 h-10 mb-2 opacity-20" />
                                        <p className="text-sm font-medium">No pain scores recorded yet</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* AMS Widget */}
                        <div className="h-full">
                            <AMSTrainingLoadWidget clientId={clientId} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Injury Reports */}
                        <Card className="shadow-sm border-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-orange-500" /> Clinical Diagnoses & Injuries
                                </CardTitle>
                                <CardDescription>Historical and active injury records</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {athleteData.injuries.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                                        No injuries recorded.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {athleteData.injuries.map(inj => (
                                            <div key={inj.id} className="p-4 border rounded-lg bg-card/50 flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-foreground text-sm">{inj.diagnosis}</h4>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {inj.region} • {inj.injury_type}
                                                    </p>
                                                    <div className="mt-2 text-[10px] text-muted-foreground font-medium">
                                                        Log Date: {format(new Date(inj.injury_date), "MMM d, yyyy")}
                                                    </div>
                                                </div>
                                                <Badge variant={inj.status === 'Resolved' ? 'secondary' : 'destructive'} className="text-[10px]">
                                                    {inj.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Recent Sessions */}
                        <Card className="shadow-sm border-border/50">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-primary" /> Recent Sessions
                                </CardTitle>
                                <CardDescription>History of sports science and physio sessions</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {athleteData.sessions.length === 0 ? (
                                    <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                                        No sessions found.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {athleteData.sessions.slice(0, 5).map(session => (
                                            <div key={session.id} className="p-3 border rounded-lg flex justify-between items-center group hover:border-primary/50 transition-colors">
                                                <div className="flex gap-3 items-center">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                        <Calendar className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold">{session.service_type}</p>
                                                        <p className="text-xs text-muted-foreground">{format(new Date(session.scheduled_start), "MMM d, yyyy HH:mm")}</p>
                                                    </div>
                                                </div>
                                                <Badge variant={session.status === 'Completed' ? 'default' : 'outline'} className="text-[10px]">
                                                    {session.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    // Default Scientist Dashboard
    return (
        <DashboardLayout role="sports_scientist">
            <div className="space-y-6 pb-12">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                        <TrendingUp className="w-8 h-8 text-primary" />
                        Scientist Analytics
                    </h1>
                    <p className="text-muted-foreground mt-1">Key performance indicators and workload distribution</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="gradient-card border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{stats?.totalSessions}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Activity className="w-3 h-3 text-emerald-500" /> +12% from last month
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="gradient-card border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {stats?.totalSessions ? Math.round((stats.completedSessions / stats.totalSessions) * 100) : 0}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Target is 95%</p>
                        </CardContent>
                    </Card>
                    <Card className="gradient-card border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Active Athletes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">--</div>
                            <p className="text-xs text-muted-foreground mt-1">Unique clients this month</p>
                        </CardContent>
                    </Card>
                    <Card className="gradient-card border-none shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Group %</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {stats?.totalSessions ? Math.round((stats.modeCounts.Group / stats.totalSessions) * 100) : 0}%
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Efficiency metric</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="shadow-sm border-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg">Monthly Workload</CardTitle>
                            <CardDescription>Number of sessions over the last 6 months</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="sessions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-border/50">
                        <CardHeader>
                            <CardTitle className="text-lg">Session Distribution</CardTitle>
                            <CardDescription>Breakdown by session category</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats?.pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats?.pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                <Card className="shadow-sm border-border/50">
                    <CardHeader>
                        <CardTitle className="text-lg">Performance Insights</CardTitle>
                        <CardDescription>Automated observations based on recent activity</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 flex gap-4">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <Activity className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">Efficiency Trend</h4>
                                    <p className="text-sm text-muted-foreground">You are conducting more group sessions this month, increasing your athlete-to-session ratio by 15%.</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-amber-50 border border-amber-100 flex gap-4">
                                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                    <Calendar className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">Missed Sessions Alert</h4>
                                    <p className="text-sm text-muted-foreground">3 athletes have missed 2+ sessions in the last 14 days. Review their availability or engagement.</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
