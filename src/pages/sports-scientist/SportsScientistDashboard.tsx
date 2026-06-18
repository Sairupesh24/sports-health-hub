import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { apiFetch } from "@/utils/api";
import { SportsScientistBookSessionModal } from "@/components/sports-scientist/SportsScientistBookSessionModal";
import { SportsScientistSessionStatusModal } from "@/components/sports-scientist/SportsScientistSessionStatusModal";
import AmsStaffNav from "@/components/ams/AmsStaffNav";
import { cn } from "@/lib/utils";
import AttendanceMarker from "@/components/attendance/AttendanceMarker";
import EmergencyLeaveModal from "@/components/shared/EmergencyLeaveModal";
import { AnnouncementsManager } from "@/components/shared/AnnouncementsManager";
import { AlertCircle, Megaphone, X } from "lucide-react";


export default function SportsScientistDashboard() {
    const { user, profile } = useAuth();
    const navigate = useNavigate();
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [activePopup, setActivePopup] = useState<any | null>(null);
    const queryClient = useQueryClient();

    // Fetch unread count for sports scientist (uses hr/notifications/unread-count)
    const { data: unreadCount = 0 } = useQuery({
      queryKey: ["unread-notifications", profile?.id],
      queryFn: async () => {
        if (!profile?.id) return 0;
        const data = await apiFetch<any>(`/hr/notifications/unread-count`);
        return data?.unreadCount || 0;
      },
      enabled: !!profile?.id,
      refetchInterval: 30000 
    });

    // Subscribe to real-time notifications via SSE
    useEffect(() => {
      if (!profile?.id) return;

      const token = localStorage.getItem('ishpo_jwt');
      if (!token) return;

      const streamUrl = `/api/notifications/stream?token=${encodeURIComponent(token)}`;
      const eventSource = new EventSource(streamUrl);

      eventSource.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data);
          console.log('[SSE Specialist Console] New notification received:', notification);
          queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
          queryClient.invalidateQueries({ queryKey: ["staff-notifications-history"] });
          setActivePopup(notification);
        } catch (err) {
          console.error('[SSE] Failed to parse message:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('[SSE] EventSource failed:', err);
      };

      return () => {
        eventSource.close();
      };
    }, [profile?.id, queryClient]);

    // Auto-dismiss popup after 5 seconds
    useEffect(() => {
      if (activePopup) {
        const timer = setTimeout(() => {
          setActivePopup(null);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }, [activePopup]);

    const { data: dashboardData, isLoading, refetch } = useQuery({
        queryKey: ["sports-scientist-dashboard-stats", user?.id],
        queryFn: async () => {
            if (!user) return null;
            return await apiFetch<any>('/ams/dashboard/stats');
        },
        enabled: !!user
    });

    return (
        <DashboardLayout role="sports_scientist">
            <div className="min-h-screen bg-[#f8fafc]">
                
                <main className="container mx-auto p-4 sm:p-8 space-y-8 max-w-[1600px] animate-in fade-in duration-700">
                    <AttendanceMarker />

                    <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-black">
                                {format(new Date(), 'EEEE, MMMM do, yyyy')}
                            </p>
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">Performance Console</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <button 
                                    onClick={() => setIsAnnouncementModalOpen(true)}
                                    className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20 shadow-sm flex items-center justify-center"
                                    title="Broadcast Announcement"
                                >
                                    <Megaphone className="w-5 h-5" />
                                </button>
                                {unreadCount > 0 && (
                                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-rose-500 text-[10px] font-black text-white rounded-full border-2 border-white animate-in zoom-in duration-300">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                  </span>
                                )}
                                {activePopup && (
                                  <div className="absolute top-12 right-0 w-72 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white border border-primary/30 p-3 rounded-2xl shadow-xl z-50 animate-in slide-in-from-top-2 duration-300 font-sans pointer-events-auto">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[8px] font-black uppercase tracking-widest text-primary">New Alert</span>
                                      <button onClick={(e) => { e.stopPropagation(); setActivePopup(null); }} className="text-slate-400 hover:text-white">
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    <h5 className="text-[10px] font-black uppercase tracking-tight line-clamp-1">{activePopup.title}</h5>
                                    <p className="text-[9px] text-slate-500 dark:text-slate-300 leading-snug line-clamp-2 mt-0.5 italic">"{activePopup.content}"</p>
                                  </div>
                                )}
                            </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                                            className="bg-white border hover:border-primary/30 transition-all p-5 rounded-[24px] flex items-center justify-between shadow-sm group cursor-pointer"
                                            onClick={() => setSelectedSession(session)}
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className="h-14 w-14 rounded-2xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100">
                                                    <span className="text-[10px] uppercase font-black text-slate-400">{format(parseISO(session.scheduled_start), "HH:mm")}</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-lg group-hover:text-primary transition-colors">
                                                        {session.session_mode === 'Group' ? `Group: ${session.group_name}` : session.session_mode === 'Other' ? session.session_type?.name : `${session.client?.first_name} ${session.client?.last_name}`}
                                                    </h4>
                                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{session.session_type?.name || "Sports Science Session"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                                        session.status === 'Completed' 
                                                            ? 'bg-emerald-500/10 text-emerald-600' 
                                                            : session.status === 'Cancelled' || session.status === 'Missed'
                                                            ? 'bg-rose-500/10 text-rose-600'
                                                            : 'bg-primary/10 text-primary'
                                                    }`}
                                                >
                                                    {session.status}
                                                </div>
                                                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/5 text-primary">
                                                    <ArrowRight className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Performance Insights Sidebar (Weekly Target Removed) */}
                        <div className="space-y-6">


                            <div className="grid grid-cols-2 gap-4">
                                <QuickActionButton 
                                    label="Clients" 
                                    icon={Users} 
                                    onClick={() => navigate("/sports-scientist/clients")} 
                                />
                                <QuickActionButton 
                                    label="Schedule" 
                                    icon={Calendar} 
                                    onClick={() => navigate("/sports-scientist/schedule")} 
                                />
                                <QuickActionButton 
                                    label="Emergency Leave" 
                                    icon={AlertCircle} 
                                    onClick={() => setIsEmergencyModalOpen(true)}
                                    color="text-destructive"
                                />
                                <QuickActionButton 
                                    label="Broadcast" 
                                    icon={Megaphone} 
                                    onClick={() => setIsAnnouncementModalOpen(true)} 
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

            <EmergencyLeaveModal 
                open={isEmergencyModalOpen}
                onOpenChange={setIsEmergencyModalOpen}
            />

            <AnnouncementsManager 
                open={isAnnouncementModalOpen}
                onOpenChange={setIsAnnouncementModalOpen}
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

function QuickActionButton({ label, icon: Icon, onClick, color = "" }: { label: string, icon: LucideIcon, onClick: () => void, color?: string }) {
    return (
        <Button 
            variant="ghost" 
            className={cn(
                "h-36 flex flex-col gap-3 rounded-[24px] border-2 border-dashed border-slate-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary transition-all group",
                color === "text-destructive" && "border-destructive/20 hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
            )}
            onClick={onClick}
        >
            <Icon className={cn(
                "w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors",
                color === "text-destructive" && "text-destructive group-hover:text-destructive"
            )} />
            <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                color === "text-destructive" && "text-destructive"
            )}>{label}</span>
        </Button>
    );
}
