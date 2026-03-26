import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { 
    Users, 
    Calendar, 
    ClipboardList, 
    Activity, 
    Plus, 
    TrendingUp, 
    Clock, 
    CheckCircle2,
    ArrowRight,
    LucideIcon
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SportsScientistBookSessionModal } from "@/components/sports-scientist/SportsScientistBookSessionModal";
import { SportsScientistSessionStatusModal } from "@/components/sports-scientist/SportsScientistSessionStatusModal";
import AmsStaffNav from "@/components/ams/AmsStaffNav";
import { cn } from "@/lib/utils";

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

            const { data: todaySessions } = await (supabase
                .from("sessions") as any)
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
            <div className="min-h-screen bg-[#f8fafc]">
                <AmsStaffNav />
                
                <main className="container mx-auto p-4 sm:p-8 space-y-8 max-w-[1600px] animate-in fade-in duration-700">
                    <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">
                                {format(new Date(), 'EEEE, MMMM do, yyyy')}
                            </p>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">Performance Console</h1>
                        </div>
                        <div className="flex gap-3">
                            <Button 
                                variant="outline" 
                                className="glass h-11 border-none shadow-sm font-bold gap-2"
                                onClick={() => navigate("/sports-scientist/templates")}
                            >
                                <ClipboardList className="w-4 h-4 text-primary" /> Templates
                            </Button>
                            <Button 
                                className="h-11 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 gap-2 px-6"
                                onClick={() => setIsBookModalOpen(true)}
                            >
                                <Plus className="w-5 h-5" /> Schedule Session
                            </Button>
                        </div>
                    </header>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard 
                            title="Athletes" 
                            value={dashboardData?.clientCount || 0} 
                            description="Active personnel" 
                            icon={Users} 
                        />
                        <KPICard 
                            title="Templates" 
                            value={dashboardData?.templateCount || 0} 
                            description="Reusable plans" 
                            icon={ClipboardList} 
                        />
                        <KPICard 
                            title="Today's Sessions" 
                            value={dashboardData?.todaySessions.length || 0} 
                            description="Loads scheduled" 
                            icon={Clock} 
                        />
                        <KPICard 
                            title="Compliance" 
                            value="--" 
                            description="Protocol rate" 
                            icon={CheckCircle2} 
                            color="text-emerald-500"
                        />
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
                                <Card className="bg-muted/10 border-dashed border-2 flex flex-col items-center justify-center py-12 text-muted-foreground rounded-[32px]">
                                    <Activity className="w-10 h-10 opacity-20 mb-3" />
                                    <p className="font-bold uppercase text-xs tracking-widest">No sessions scheduled today</p>
                                    <Button variant="ghost" className="mt-2 text-primary font-bold" onClick={() => setIsBookModalOpen(true)}>
                                        Schedule something now
                                    </Button>
                                </Card>
                            ) : (
                                <div className="space-y-3">
                                    {dashboardData?.todaySessions.map((session: any) => (
                                        <div 
                                            key={session.id} 
                                            className="bg-white border hover:border-primary/30 transition-all p-5 rounded-[24px] flex items-center justify-between shadow-sm group"
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className="h-14 w-14 rounded-2xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100">
                                                    <span className="text-[10px] uppercase font-black text-slate-400">{format(parseISO(session.scheduled_start), "HH:mm")}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-lg group-hover:text-primary transition-colors">
                                                        {session.session_mode === 'Group' ? `Group: ${session.group_name}` : `${session.client?.first_name} ${session.client?.last_name}`}
                                                    </h4>
                                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{session.session_type?.name || "Sports Science Session"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => setSelectedSession(session)}
                                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all hover:scale-105 active:scale-95 ${
                                                        session.status === 'Completed' 
                                                            ? 'bg-emerald-500/10 text-emerald-600' 
                                                            : session.status === 'Cancelled' || session.status === 'Missed'
                                                            ? 'bg-rose-500/10 text-rose-600'
                                                            : 'bg-primary/10 text-primary'
                                                    }`}
                                                >
                                                    {session.status}
                                                </button>
                                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/5 text-primary" onClick={() => navigate("/sports-scientist/sessions")}>
                                                    <ArrowRight className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Performance Insights Sidebar */}
                        <div className="space-y-6">
                            <div className="glass-card rounded-[32px] p-8 space-y-6 shadow-sm border-none overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <TrendingUp className="w-32 h-32 -mr-16 -mt-16" />
                                </div>
                                <h3 className="font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-primary" /> Performance Insights
                                </h3>
                                
                                <div className="space-y-6 relative z-10">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider">Weekly Target</p>
                                            <p className="text-3xl font-black">24 <span className="text-base text-muted-foreground/40 font-bold">/ 40</span></p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-emerald-500 font-black text-sm">+20%</p>
                                            <p className="text-[10px] font-bold text-muted-foreground/40">vs Last Week</p>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary w-[60%] rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] animate-in slide-in-from-left duration-1000" />
                                    </div>
                                    
                                    <p className="text-xs font-bold text-slate-500 leading-relaxed italic">
                                        "You are on track to meet your weekly training load target. Compliance is scaling well with the new group templates."
                                    </p>
                                    
                                    <Button className="w-full h-12 bg-white hover:bg-slate-50 text-foreground border shadow-sm rounded-2xl font-black text-[11px] uppercase tracking-widest" onClick={() => navigate("/sports-scientist/analytics")}>
                                        Deep Dive Analytics
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <QuickActionButton 
                                    label="My Clients" 
                                    icon={Users} 
                                    onClick={() => navigate("/sports-scientist/clients")} 
                                />
                                <QuickActionButton 
                                    label="Schedule" 
                                    icon={Calendar} 
                                    onClick={() => navigate("/sports-scientist/schedule")} 
                                />
                            </div>
                        </div>
                    </div>
                </main>
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

function KPICard({ title, value, description, icon: Icon, color = "text-primary" }: { title: string, value: any, description: string, icon: LucideIcon, color?: string }) {
    return (
        <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 group hover:border-primary/20 transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-primary/5 transition-colors", color.replace('text', 'bg-opacity-10 text'))}>
                    <Icon className={cn("w-6 h-6", color)} />
                </div>
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{title}</p>
                <h3 className="text-3xl font-black tabular-nums">{value}</h3>
                <p className="text-[10px] font-bold text-muted-foreground/40 italic">{description}</p>
            </div>
        </div>
    );
}

function QuickActionButton({ label, icon: Icon, onClick }: { label: string, icon: LucideIcon, onClick: () => void }) {
    return (
        <Button 
            variant="ghost" 
            className="h-28 flex flex-col gap-3 rounded-[24px] border-2 border-dashed border-slate-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all group"
            onClick={onClick}
        >
            <Icon className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </Button>
    );
}
