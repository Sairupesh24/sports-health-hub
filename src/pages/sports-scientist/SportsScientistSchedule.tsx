import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    format,
    addDays,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameDay,
    isSameMonth,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    subDays,
    parseISO,
    startOfDay
} from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ClipboardList, Plus, Loader2 } from "lucide-react";
import { SportsScientistBookSessionModal } from "@/components/sports-scientist/SportsScientistBookSessionModal";
import { SportsScientistSessionStatusModal } from "@/components/sports-scientist/SportsScientistSessionStatusModal";
import { SportsScientistSessionLog } from "@/components/sports-scientist/SportsScientistSessionLog";

import { useLocation } from "react-router-dom";

type ViewMode = "day" | "week" | "month";

export default function SportsScientistSchedule() {
    const { user } = useAuth();
    const location = useLocation();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("week");
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [activeTab, setActiveTab] = useState(location.pathname.includes("/sessions") ? "log" : "calendar");

    useEffect(() => {
        if (location.pathname.includes("/sessions")) {
            setActiveTab("log");
        } else if (location.pathname.includes("/schedule")) {
            setActiveTab("calendar");
        }
    }, [location.pathname]);

    const queryClient = useQueryClient();

    const dateRange = useMemo(() => {
        let start, end;
        if (viewMode === "day") {
            start = currentDate;
            end = currentDate;
        } else if (viewMode === "week") {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
        } else {
            start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
            end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
        }

        return {
            start: start.toISOString(),
            end: addDays(end, 1).toISOString()
        };
    }, [currentDate, viewMode]);

    const { data: sessions = [], isLoading, refetch } = useQuery({
        queryKey: ["sports-scientist-sessions", user?.id, dateRange.start, dateRange.end],
        queryFn: async () => {
            if (!user) return [];

            const { data, error } = await (supabase as any)
                .from("sessions")
                .select(`
                     id,
                     client_id,
                     scientist_id,
                     scheduled_start,
                     scheduled_end,
                     status,
                     session_mode,
                     group_name,
                     actual_start,
                     actual_end,
                     client:clients(first_name, last_name, uhid),
                     session_type:session_types(name)
                 `)
                .eq("scientist_id", user.id)
                .gte("scheduled_start", dateRange.start)
                .lte("scheduled_start", dateRange.end)
                .order("scheduled_start", { ascending: true });

            if (error) throw error;
            return data;
        },
        enabled: !!user && activeTab === "calendar"
    });



    // Keep selected session in sync if data refetches
    useEffect(() => {
        if (selectedSession && sessions) {
            const updated = (sessions as any[]).find(s => s.id === selectedSession.id);
            if (updated && (updated.status !== selectedSession.status || updated.actual_start !== selectedSession.actual_start || updated.actual_end !== selectedSession.actual_end)) {
                setSelectedSession(updated);
            }
        }
    }, [sessions, selectedSession]);

    const handlePrev = () => {
        if (viewMode === "day") setCurrentDate(prev => subDays(prev, 1));
        else if (viewMode === "week") setCurrentDate(prev => subWeeks(prev, 1));
        else setCurrentDate(prev => subMonths(prev, 1));
    };

    const handleNext = () => {
        if (viewMode === "day") setCurrentDate(prev => addDays(prev, 1));
        else if (viewMode === "week") setCurrentDate(prev => addWeeks(prev, 1));
        else setCurrentDate(prev => addMonths(prev, 1));
    };

    const handleToday = () => setCurrentDate(new Date());

    const getHeaderTitle = () => {
        if (viewMode === "day") return format(currentDate, "EEEE, MMMM d, yyyy");
        if (viewMode === "week") {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
        }
        return format(currentDate, "MMMM yyyy");
    };

    const getStatusColor = (event: any) => {
        if (!event) return 'bg-primary/5 text-primary border-primary/20';
        const status = event.status;
        const hasStarted = !!event.actual_start;
        const hasEnded = !!event.actual_end;

        if (status === 'Completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (status === 'Checked In' || (status === 'Planned' && hasStarted && !hasEnded)) return 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-500/20';
        
        switch (status) {
            case 'Planned': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'Missed': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'Rescheduled': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'Cancelled': return 'bg-slate-50 text-slate-500 border-slate-200';
            default: return 'bg-primary/5 text-primary border-primary/20';
        }
    };

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="grid grid-cols-7 border border-border/50 rounded-xl overflow-hidden shadow-sm">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName) => (
                    <div key={dayName} className="p-3 text-center text-xs font-semibold bg-muted/30 border-b border-r border-border/50 uppercase tracking-wider text-muted-foreground">
                        {dayName}
                    </div>
                ))}
                {days.map((day, idx) => {
                    const dayEvents = (sessions as any[]).filter(s => isSameDay(startOfDay(parseISO(s.scheduled_start)), startOfDay(day)));
                    return (
                        <div
                            key={day.toString()}
                            className={`min-h-[140px] p-2 border-b border-r border-border/50 transition-colors ${
                                !isSameMonth(day, monthStart) ? "bg-muted/10 text-muted-foreground/40" : 
                                isSameDay(startOfDay(day), startOfDay(new Date())) ? "bg-primary/[0.02]" : "bg-card"
                            }`}
                        >
                            <div className="flex justify-start">
                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                                    isSameDay(day, new Date()) ? "bg-primary text-primary-foreground shadow-sm" : ""
                                }`}>
                                    {format(day, "d")}
                                </span>
                            </div>
                            <div className="mt-2 space-y-1 overflow-y-auto max-h-[100px] no-scrollbar">
                                {dayEvents.map(event => (
                                    <div
                                        key={event.id}
                                        onClick={() => setSelectedSession(event)}
                                        className={`text-[10px] p-1.5 rounded-md border truncate cursor-pointer hover:shadow-sm transition-all font-medium ${getStatusColor(event)}`}
                                    >
                                        <div className="flex justify-between items-center mb-0.5">
                                            <span className="font-bold opacity-80">{format(parseISO(event.scheduled_start), "HH:mm")}</span>
                                        </div>
                                        <span className="truncate block">
                                            {event.session_mode === 'Group' ? `👥 ${event.group_name}` : event.session_mode === 'Other' ? `🏢 ${event.session_type?.name}` : `${event.client?.first_name} ${event.client?.last_name}`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderWeekView = () => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekDays = eachDayOfInterval({ start, end: addDays(start, 6) });
        const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM

        return (
            <div className="flex flex-col border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm">
                <div className="flex border-b border-border/50 bg-muted/20">
                    <div className="w-20 border-r border-border/50 shrink-0"></div>
                    {weekDays.map(day => (
                        <div key={day.toString()} className={`flex-1 p-3 text-center border-r border-border/50 last:border-r-0 ${isSameDay(day, new Date()) ? "bg-primary/[0.03]" : ""}`}>
                            <div className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">{format(day, 'EEE')}</div>
                            <div className={`text-xl font-display font-bold w-10 h-10 mx-auto flex items-center justify-center rounded-full mt-1 ${
                                isSameDay(day, new Date()) ? "bg-primary text-primary-foreground shadow-md" : ""
                            }`}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="relative overflow-y-auto max-h-[700px] flex">
                    <div className="w-20 shrink-0 border-r border-border/50 bg-muted/5 sticky left-0 z-20">
                        {hours.map(hour => (
                            <div key={hour} className="h-24 border-b border-border/50/50 text-[10px] text-muted-foreground text-center pt-2 font-bold uppercase tracking-tighter">
                                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-1 relative group">
                        <div className="absolute inset-0 flex">
                            {weekDays.map(day => (
                                <div key={`bg-${day}`} className="flex-1 border-r border-border/50/50 last:border-r-0">
                                    {hours.map(hour => (
                                        <div key={`cell-${day}-${hour}`} className="h-24 border-b border-border/50/50"></div>
                                    ))}
                                </div>
                            ))}
                        </div>

                        <div className="absolute inset-0 flex">
                            {weekDays.map(day => {
                                const dayEvents = (sessions as any[]).filter(s => isSameDay(parseISO(s.scheduled_start), day));
                                return (
                                    <div key={`ev-${day}`} className="flex-1 relative border-r border-transparent">
                                        {dayEvents.map(event => {
                                            const startD = parseISO(event.scheduled_start);
                                            const endD = parseISO(event.scheduled_end);
                                            const startHour = startD.getHours() + (startD.getMinutes() / 60);
                                            const durationHours = (endD.getTime() - startD.getTime()) / (1000 * 60 * 60);

                                            const topPos = Math.max(0, (startHour - 7) * 96);
                                            const height = Math.max(24, durationHours * 96);

                                            if (startHour > 21 || endD.getHours() < 7) return null;

                                            return (
                                                <div
                                                    key={event.id}
                                                    onClick={() => setSelectedSession(event)}
                                                    className={`absolute left-1 right-1 rounded-lg border-2 p-2 overflow-hidden shadow-sm hover:shadow-lg cursor-pointer transition-all hover:scale-[1.02] hover:z-30 ${(getStatusColor(event))}`}
                                                    style={{ top: `${topPos + 4}px`, height: `${height - 8}px` }}
                                                >
                                                    <div className="text-[10px] font-bold mb-0.5 flex justify-between">
                                                        <span>{format(startD, "HH:mm")} - {format(endD, "HH:mm")}</span>
                                                        {event.session_mode === 'Group' && <span className="text-[9px] bg-white/50 px-1 rounded uppercase">Group</span>}
                                                    </div>
                                                    <div className="text-xs font-bold truncate">
                                                        {event.session_mode === 'Group' ? event.group_name : event.session_mode === 'Other' ? event.session_type?.name : `${event.client?.first_name} ${event.client?.last_name}`}
                                                    </div>
                                                    <div className="text-[10px] opacity-80 font-medium truncate mt-0.5">
                                                        {event.session_type?.name || "Sports Science"}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM
        const dayEvents = (sessions as any[]).filter(s => isSameDay(startOfDay(parseISO(s.scheduled_start)), startOfDay(currentDate)));

        return (
            <div className="flex border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm h-[700px]">
                <div className="w-24 shrink-0 border-r border-border/50 bg-muted/5 sticky left-0 z-20 overflow-y-auto no-scrollbar">
                    {hours.map(hour => (
                        <div key={hour} className="h-24 border-b border-border/50/50 text-[11px] text-muted-foreground text-center pt-3 font-bold uppercase tracking-widest">
                            {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                        </div>
                    ))}
                </div>

                <div className="flex-1 relative overflow-y-auto no-scrollbar bg-white/50">
                    <div className="absolute inset-0">
                        {hours.map(hour => (
                            <div key={`grid-${hour}`} className="h-24 border-b border-border/50/50"></div>
                        ))}
                    </div>

                    <div className="absolute inset-0 relative px-4">
                        {dayEvents.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                                <CalendarIcon className="w-8 h-8" />
                                <p className="font-medium">No sessions scheduled for today</p>
                            </div>
                        ) : (
                            dayEvents.map(event => {
                                const startD = parseISO(event.scheduled_start);
                                const endD = parseISO(event.scheduled_end);
                                const startHour = startD.getHours() + (startD.getMinutes() / 60);
                                const durationHours = (endD.getTime() - startD.getTime()) / (1000 * 60 * 60);

                                const topPos = Math.max(0, (startHour - 7) * 100);
                                const height = Math.max(60, durationHours * 100);

                                if (startHour > 21 || endD.getHours() < 7) return null;

                                return (
                                    <div
                                        key={event.id}
                                        onClick={() => setSelectedSession(event)}
                                        className={`absolute left-4 right-4 rounded-2xl border-2 p-4 overflow-hidden shadow-md hover:shadow-xl cursor-pointer transition-all hover:scale-[1.01] hover:z-30 group ${getStatusColor(event)}`}
                                        style={{ top: `${topPos + 8}px`, height: `${height - 16}px` }}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold px-2 py-0.5 bg-white/50 rounded-full border border-current shadow-sm">
                                                        {format(startD, "HH:mm")} - {format(endD, "HH:mm")}
                                                    </span>
                                                    {event.session_mode === 'Group' && (
                                                        <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">Group</span>
                                                    )}
                                                </div>
                                                <h3 className="text-lg font-display font-bold leading-tight mt-1 group-hover:text-primary transition-colors">
                                                    {event.session_mode === 'Group' ? `👥 ${event.group_name}` : event.session_mode === 'Other' ? `🏢 ${event.session_type?.name}` : `${event.client?.first_name} ${event.client?.last_name}`}
                                                </h3>
                                                <div className="flex items-center gap-4 text-xs font-medium opacity-70">
                                                    <span className="flex items-center gap-1.5 capitalize">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                                        {event.session_type?.name || "Session"}
                                                    </span>
                                                    <span className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                                                        {(event.status === "Checked In" || (event.status === "Planned" && event.actual_start)) ? "In Progress" : event.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="sm" variant="outline" className="h-8 rounded-lg bg-background/50 border-current/20 hover:bg-background">View Details</Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout role="sports_scientist">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                            <CalendarIcon className="w-8 h-8 text-primary" />
                            Sessions & Schedule
                        </h1>
                        <p className="text-muted-foreground mt-1">Manage your training blocks and review all logged sessions</p>
                    </div>
                    <Button onClick={() => setIsBookModalOpen(true)} className="h-11 px-6 shadow-md hover:shadow-lg transition-all rounded-xl gap-2">
                        <Plus className="w-5 h-5" /> Schedule Session
                    </Button>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6 p-1 bg-muted/30 rounded-xl border border-border/50">
                        <TabsTrigger value="calendar" className="rounded-lg gap-2">
                            <CalendarIcon className="w-4 h-4" /> Calendar View
                        </TabsTrigger>
                        <TabsTrigger value="log" className="rounded-lg gap-2">
                            <ClipboardList className="w-4 h-4" /> Sessions Log
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="calendar" className="mt-0">
                        <Card className="border-border shadow-md rounded-2xl overflow-hidden glass-card">
                            <CardHeader className="py-6 px-6 border-b border-border/50 bg-muted/10">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1 bg-background rounded-xl border border-border p-1 shadow-sm">
                                            <Button variant="ghost" size="icon" onClick={handlePrev} className="h-9 w-9 rounded-lg">
                                                <ChevronLeft className="w-5 h-5" />
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={handleToday} className="h-9 px-4 font-bold text-xs uppercase tracking-widest text-primary">
                                                Today
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={handleNext} className="h-9 w-9 rounded-lg">
                                                <ChevronRight className="w-5 h-5" />
                                            </Button>
                                        </div>
                                        <CardTitle className="text-xl font-display font-bold min-w-[200px] text-primary">{getHeaderTitle()}</CardTitle>
                                    </div>

                                    <div className="flex items-center gap-3 bg-muted/30 p-1 rounded-xl border border-border/50">
                                        <Button 
                                            variant={viewMode === "day" ? "default" : "ghost"} 
                                            size="sm" 
                                            onClick={() => setViewMode("day")} 
                                            className="h-8 rounded-lg text-xs font-bold"
                                        >Day</Button>
                                        <Button 
                                            variant={viewMode === "week" ? "default" : "ghost"} 
                                            size="sm" 
                                            onClick={() => setViewMode("week")} 
                                            className="h-8 rounded-lg text-xs font-bold"
                                        >Week</Button>
                                        <Button 
                                            variant={viewMode === "month" ? "default" : "ghost"} 
                                            size="sm" 
                                            onClick={() => setViewMode("month")} 
                                            className="h-8 rounded-lg text-xs font-bold"
                                        >Month</Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {isLoading ? (
                                    <div className="h-[500px] flex flex-col items-center justify-center p-8 text-muted-foreground animate-pulse">
                                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                                        <p className="font-medium">Loading your schedule...</p>
                                    </div>
                                ) : (
                                    <div className="p-6">
                                        {viewMode === "month" && renderMonthView()}
                                        {viewMode === "week" && renderWeekView()}
                                        {viewMode === "day" && renderDayView()}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="log" className="mt-0">
                        <SportsScientistSessionLog />
                    </TabsContent>
                </Tabs>

                <SportsScientistBookSessionModal
                    open={isBookModalOpen}
                    onOpenChange={setIsBookModalOpen}
                    onSuccess={refetch}
                />

                <SportsScientistSessionStatusModal
                    open={!!selectedSession}
                    onOpenChange={(open) => !open && setSelectedSession(null)}
                    session={selectedSession}
                    onSuccess={async () => {
                        await queryClient.invalidateQueries({ queryKey: ["sports-scientist-sessions"] });
                    }}
                />
            </div>
        </DashboardLayout>
    );
}
