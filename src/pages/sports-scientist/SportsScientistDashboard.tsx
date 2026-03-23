import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
    Users, 
    Calendar, 
    ClipboardList, 
    Activity, 
    Plus, 
    TrendingUp, 
    Clock, 
    CheckCircle2,
    ArrowRight
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { SportsScientistBookSessionModal } from "@/components/sports-scientist/SportsScientistBookSessionModal";
import { SportsScientistSessionStatusModal } from "@/components/sports-scientist/SportsScientistSessionStatusModal";

export default function SportsScientistDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);

    const { data: dashboardData, isLoading, refetch } = useQuery({
        queryKey: ["sports-scientist-dashboard-stats", user?.id],
        queryFn: async () => {
            if (!user) return null;

            // 1. Get Today's Sessions
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);

            const { data: todaySessions } = await supabase
                .from("sessions")
                .select(`
                    id, 
                    scheduled_start,
                    scheduled_end,
                    actual_start,
                    actual_end,
                    status, 
                    session_mode, 
                    group_name,
                    session_notes,
                    client:clients(first_name, last_name),
                    session_type:session_types(name)
                `)
                .eq("scientist_id", user.id)
                .gte("scheduled_start", todayStart.toISOString())
                .lte("scheduled_start", todayEnd.toISOString())
                .order("scheduled_start", { ascending: true });

            // 2. Get Overall Counts
            const { count: clientCount } = await supabase
                .from("clients")
                .select("*", { count: 'exact', head: true })
                .or(`primary_scientist_id.eq.${user.id},primary_scientist_id.is.null`);

            const { count: templateCount } = await supabase
                .from("session_templates")
                .select("*", { count: 'exact', head: true })
                .eq("scientist_id", user.id);

            return {
                todaySessions: todaySessions || [],
                clientCount: clientCount || 0,
                templateCount: templateCount || 0
            };
        },
        enabled: !!user
    });

    return (
        <DashboardLayout role="sports_scientist">
            <div className="space-y-8 pb-12">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-4xl font-display font-bold text-foreground">Performance Console</h1>
                        <p className="text-muted-foreground mt-1">Operational overview for {format(new Date(), "EEEE, MMMM do")}</p>
                    </div>
                    <div className="flex gap-3">
                        <Button 
                            variant="outline" 
                            className="rounded-xl border-primary/20 text-primary hover:bg-primary/5"
                            onClick={() => navigate("/sports-scientist/templates")}
                        >
                            <ClipboardList className="w-4 h-4 mr-2" /> Templates
                        </Button>
                        <Button 
                            className="rounded-xl shadow-lg shadow-primary/20 gap-2"
                            onClick={() => setIsBookModalOpen(true)}
                        >
                            <Plus className="w-5 h-5" /> Schedule Session
                        </Button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="gradient-card border-none shadow-md overflow-hidden relative group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Athletes</CardTitle>
                            <Users className="h-5 w-5 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{dashboardData?.clientCount}</div>
                            <p className="text-xs text-muted-foreground mt-1">Manage assigned personnel</p>
                        </CardContent>
                    </Card>
                    <Card className="gradient-card border-none shadow-md overflow-hidden relative group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Active Templates</CardTitle>
                            <ClipboardList className="h-5 w-5 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{dashboardData?.templateCount}</div>
                            <p className="text-xs text-muted-foreground mt-1">Reusable workout plans</p>
                        </CardContent>
                    </Card>
                    <Card className="gradient-card border-none shadow-md overflow-hidden relative group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Today's Schedule</CardTitle>
                            <Clock className="h-5 w-5 text-primary opacity-50 group-hover:opacity-100 transition-opacity" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">{dashboardData?.todaySessions.length}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total loads scheduled</p>
                        </CardContent>
                    </Card>
                    <Card className="gradient-card border-none shadow-md overflow-hidden relative group">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/80">Completion</CardTitle>
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">--</div>
                            <p className="text-xs text-muted-foreground mt-1">Protocol compliance rate</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Today's Agenda */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-display font-bold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                Today's Agenda
                            </h2>
                            <Button variant="link" className="text-primary text-sm font-bold" onClick={() => navigate("/sports-scientist/schedule")}>
                                View Full Schedule <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>

                        {dashboardData?.todaySessions.length === 0 ? (
                            <Card className="bg-muted/10 border-dashed border-2 flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Activity className="w-10 h-10 opacity-20 mb-3" />
                                <p className="font-medium">No sessions scheduled for today</p>
                                <Button variant="ghost" className="mt-2 text-primary" onClick={() => setIsBookModalOpen(true)}>
                                    Schedule something now
                                </Button>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {dashboardData?.todaySessions.map((session: any) => (
                                    <div 
                                        key={session.id} 
                                        className="bg-card border border-border/50 hover:border-primary/50 transition-all p-4 rounded-2xl flex items-center justify-between shadow-sm group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-xl bg-primary/5 flex flex-col items-center justify-center border border-primary/10">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground">{format(parseISO(session.scheduled_start), "HH:mm")}</span>
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-base group-hover:text-primary transition-colors">
                                                    {session.session_mode === 'Group' ? `Group: ${session.group_name}` : `${session.client?.first_name} ${session.client?.last_name}`}
                                                </h4>
                                                <p className="text-sm text-muted-foreground">{session.session_type?.name || "Sports Science Session"}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={() => setSelectedSession(session)}
                                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 ${
                                                    session.status === 'Completed' 
                                                        ? 'bg-emerald-50 text-emerald-700 hover:ring-emerald-400' 
                                                        : session.status === 'Cancelled' || session.status === 'Missed'
                                                        ? 'bg-red-50 text-red-700 hover:ring-red-400'
                                                        : 'bg-blue-50 text-blue-700 hover:ring-blue-400'
                                                }`}
                                                title="Click to update session status"
                                            >
                                                {session.status}
                                            </button>
                                            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/sports-scientist/sessions")}>
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Access / Stats */}
                    <div className="space-y-6">
                        <Card className="shadow-lg border-primary/10 overflow-hidden">
                            <CardHeader className="bg-primary/5 pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-primary" />
                                    Performance Insights
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <span className="text-sm text-muted-foreground">Weekly Target</span>
                                        <span className="text-xl font-bold">24 / 40</span>
                                    </div>
                                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary w-[60%] rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed italic">
                                        "You are on track to meet your weekly training load target. Group sessions are up by 20% helping with org efficiency."
                                    </p>
                                    <Button className="w-full bg-muted hover:bg-muted/80 text-foreground border-none rounded-xl font-bold" onClick={() => navigate("/sports-scientist/analytics")}>
                                        Deep Dive Analytics
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 gap-4">
                            <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl border-dashed" onClick={() => navigate("/sports-scientist/clients")}>
                                <Users className="w-6 h-6 text-primary" />
                                <span className="text-xs font-bold uppercase">My Clients</span>
                            </Button>
                            <Button variant="outline" className="h-24 flex flex-col gap-2 rounded-2xl border-dashed" onClick={() => navigate("/sports-scientist/schedule")}>
                                <Calendar className="w-6 h-6 text-primary" />
                                <span className="text-xs font-bold uppercase">Schedule</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <SportsScientistBookSessionModal
                open={isBookModalOpen}
                onOpenChange={setIsBookModalOpen}
                onSuccess={refetch}
            />

            <SportsScientistSessionStatusModal
                open={!!selectedSession}
                onOpenChange={(open) => !open && setSelectedSession(null)}
                session={selectedSession}
                onSuccess={refetch}
            />
        </DashboardLayout>
    );
}
