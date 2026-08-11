import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
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
import { 
    ChevronLeft, 
    ChevronRight, 
    Calendar as CalendarIcon, 
    ClipboardList, 
    Plus, 
    Loader2, 
    Edit,
    Clock,
    Users,
    User,
    ChevronDown
} from "lucide-react";
import { SportsScientistBookSessionModal } from "@/components/sports-scientist/SportsScientistBookSessionModal";
import { SportsScientistSessionStatusModal } from "@/components/sports-scientist/SportsScientistSessionStatusModal";
import { SportsScientistSessionLog } from "@/components/sports-scientist/SportsScientistSessionLog";
import { SportsScientistAssignWorkModal } from "@/components/sports-scientist/SportsScientistAssignWorkModal";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week" | "month";

export default function SportsScientistSchedule() {
    const { user, profile } = useAuth();
    const location = useLocation();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>("week");
    const [isBookModalOpen, setIsBookModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [activeTab, setActiveTab] = useState(location.pathname.includes("/sessions") ? "log" : "calendar");
    // Tracks which week-view day columns are NOT yet scrolled to their bottom
    const [weekColOverflows, setWeekColOverflows] = useState<Record<string, boolean>>({});
    const [weekColAtBottom, setWeekColAtBottom] = useState<Record<string, boolean>>({});

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

    const { data: rawSessions = [], isLoading, refetch } = useQuery({
        queryKey: ["sports-scientist-sessions", user?.id, dateRange.start, dateRange.end],
        queryFn: async () => {
            if (!user) return [];
            return await apiFetch(`/api/appointments?specialist_id=${user.id}&start=${dateRange.start}&end=${dateRange.end}`);
        },
        enabled: !!user && activeTab === "calendar"
    });

    const sessions = useMemo(() => {
        return (rawSessions as any[]).filter((s: any) => {
            const st = (s.status || "").toLowerCase();
            return !['cancelled', 'missed', 'rescheduled', 'deleted'].includes(st);
        });
    }, [rawSessions]);

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
        const hasEnd = !!event.actual_end;

        if (status === 'Completed') return 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400';
        if (status === 'Checked In' || (status === 'Planned' && hasStarted && !hasEnd)) return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20';
        
        switch (status) {
            case 'Planned': return 'bg-blue-500/5 border-blue-500/20 text-blue-700 dark:text-blue-400';
            case 'Missed': return 'bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-400';
            case 'Rescheduled': return 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400';
            case 'Cancelled': return 'bg-slate-500/5 border-slate-500/10 text-slate-400 dark:text-slate-500';
            default: return 'bg-primary/5 text-primary border-primary/20';
        }
    };

    const miniCalendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start for sidebar calendar
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentDate]);

    const upcomingEvents = useMemo(() => {
        const todayStart = startOfDay(new Date());
        return (sessions as any[])
            .filter(s => {
                const startD = parseISO(s.scheduled_start);
                return startD >= todayStart;
            })
            .sort((a, b) => parseISO(a.scheduled_start).getTime() - parseISO(b.scheduled_start).getTime());
    }, [sessions]);

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="grid grid-cols-7 border border-border/50 rounded-3xl overflow-hidden shadow-sm">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((dayName) => (
                    <div key={dayName} className="p-3 text-center text-xs font-black bg-slate-100/50 dark:bg-slate-900/50 border-b border-r border-border/50 uppercase tracking-wider text-muted-foreground">
                        {dayName}
                    </div>
                ))}
                {days.map((day) => {
                    const dayEvents = (sessions as any[]).filter(s => isSameDay(startOfDay(parseISO(s.scheduled_start)), startOfDay(day)));
                    return (
                        <div
                            key={day.toString()}
                            className={`min-h-[140px] p-2 border-b border-r border-border/50 transition-colors ${
                                !isSameMonth(day, monthStart) ? "bg-muted/10 text-muted-foreground/30" : 
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
                                        className={cn(
                                            "text-[10px] p-1.5 rounded-xl border truncate cursor-pointer hover:shadow-sm transition-all font-bold",
                                            getStatusColor(event)
                                        )}
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

    const calculateOccupiedMinutes = (events: any[]) => {
        const activeEvents = events.filter(e => {
            const status = (e.status || '').toLowerCase();
            return status !== 'cancelled' && status !== 'rescheduled';
        });

        if (activeEvents.length === 0) return 0;

        const intervals = activeEvents
            .map(e => ({
                start: parseISO(e.scheduled_start).getTime(),
                end: parseISO(e.scheduled_end).getTime()
            }))
            .filter(i => !isNaN(i.start) && !isNaN(i.end) && i.end > i.start)
            .sort((a, b) => a.start - b.start);

        if (intervals.length === 0) return 0;

        const merged: { start: number; end: number }[] = [];
        for (const current of intervals) {
            if (merged.length === 0) {
                merged.push({ ...current });
            } else {
                const last = merged[merged.length - 1];
                if (current.start < last.end) {
                    last.end = Math.max(last.end, current.end);
                } else {
                    merged.push({ ...current });
                }
            }
        }

        const totalMs = merged.reduce((acc, curr) => acc + (curr.end - curr.start), 0);
        return totalMs / (1000 * 60);
    };

    const renderWeekView = () => {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekDays = eachDayOfInterval({ start, end: addDays(start, 6) });

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                {weekDays.map(day => {
                    const dayEvents = (sessions as any[]).filter(s => isSameDay(parseISO(s.scheduled_start), day));
                    const totalMinutes = calculateOccupiedMinutes(dayEvents);
                    const filledHours = Number((totalMinutes / 60).toFixed(1));
                    const emptyHours = Math.max(0, Number((8 - filledHours).toFixed(1)));
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={day.toString()}
                            className={cn(
                                "bg-slate-100/50 dark:bg-slate-900/40 rounded-[2.2rem] p-4 border flex flex-col justify-between min-h-[580px] shadow-xs transition-all",
                                isToday
                                    ? "border-primary/40 bg-primary/[0.02] dark:bg-primary/[0.01] shadow-md shadow-primary/5"
                                    : "border-slate-200/40 dark:border-slate-800/40"
                            )}
                        >
                            <div>
                                {/* Day Title Header */}
                                <div className="text-center pb-3 border-b border-slate-200/30 dark:border-slate-800/30">
                                    <span className="text-[10px] uppercase text-slate-400 dark:text-slate-500 font-black tracking-widest block">
                                        {format(day, 'EEE')}
                                    </span>
                                    <span className={cn(
                                        "text-2xl font-display font-black block mt-0.5",
                                        isToday ? "text-primary" : "text-slate-800 dark:text-slate-200"
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                </div>

                                {/* Events List with scroll-more indicator */}
                                <div className="relative mt-4">
                                    <div
                                        className="space-y-2.5 overflow-y-auto max-h-[380px] no-scrollbar"
                                        ref={(el) => {
                                            if (el) {
                                                // On mount, detect if overflow exists
                                                const dayKey = day.toString();
                                                const hasOverflow = el.scrollHeight > el.clientHeight;
                                                if (hasOverflow !== weekColOverflows[dayKey]) {
                                                    setWeekColOverflows(prev => ({ ...prev, [dayKey]: hasOverflow }));
                                                }
                                            }
                                        }}
                                        onScroll={(e) => {
                                            const el = e.currentTarget;
                                            const dayKey = day.toString();
                                            const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
                                            setWeekColAtBottom(prev => ({ ...prev, [dayKey]: atBottom }));
                                        }}
                                    >
                                        {dayEvents.length === 0 ? (
                                            <div className="text-center py-16 text-slate-300 dark:text-slate-700 text-[10px] uppercase font-black tracking-wider italic">
                                                Empty
                                            </div>
                                        ) : (
                                            dayEvents.map(event => {
                                                const startD = parseISO(event.scheduled_start);
                                                const endD = parseISO(event.scheduled_end);

                                                const rawName = event.session_mode === 'Group'
                                                    ? event.group_name
                                                    : event.session_mode === 'Other'
                                                        ? event.session_type?.name
                                                        : `${event.client?.first_name || ''} ${event.client?.last_name || ''}`.trim();

                                                const serviceName = event.session_type?.name || event.service_type;

                                                return (
                                                    <div
                                                        key={event.id}
                                                        onClick={() => setSelectedSession(event)}
                                                        className={cn(
                                                            "group rounded-xl p-2 border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md flex flex-col justify-between text-center",
                                                            getStatusColor(event)
                                                        )}
                                                    >
                                                        <div>
                                                            <div className="text-[9px] font-semibold text-slate-600 dark:text-slate-300 tracking-tighter leading-none mb-1">
                                                                {format(startD, "h:mm a")} - {format(endD, "h:mm a")}
                                                            </div>
                                                            <div className="text-[10px] font-bold leading-tight text-slate-900 dark:text-white group-hover:text-primary transition-colors break-words line-clamp-2">
                                                                {event.session_mode === 'Group' && "👥 "}
                                                                {event.session_mode === 'Other' && "🏢 "}
                                                                {rawName}
                                                            </div>
                                                        </div>
                                                        {serviceName && event.session_mode !== 'Other' && (
                                                            <div className="text-[8.5px] font-medium text-slate-500 dark:text-slate-400 truncate mt-1 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                                                                {serviceName}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    {/* Scroll-more indicator: shows when overflow exists and not yet at bottom */}
                                    {weekColOverflows[day.toString()] && !weekColAtBottom[day.toString()] && (
                                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 flex flex-col items-center justify-end pb-1" style={{ background: isToday ? 'linear-gradient(to top, rgba(var(--primary-rgb, 99,102,241),0.12) 0%, transparent 100%)' : 'linear-gradient(to top, rgba(100,116,139,0.18) 0%, transparent 100%)' }}>
                                            <ChevronDown
                                                className={cn(
                                                    "w-5 h-5 animate-bounce drop-shadow-md",
                                                    isToday ? "text-primary" : "text-slate-700 dark:text-white"
                                                )}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* stats footer */}
                            <div className="pt-3 border-t border-slate-200/30 dark:border-slate-800/30 text-[9px] font-black tracking-widest text-center uppercase">
                                <div className="text-slate-500 dark:text-slate-400">{filledHours}H FILLED</div>
                                <div className="text-emerald-500 dark:text-emerald-400 mt-0.5">{emptyHours}H EMPTY</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDayView = () => {
        const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM
        const dayEvents = (sessions as any[]).filter(s => isSameDay(startOfDay(parseISO(s.scheduled_start)), startOfDay(currentDate)));

        return (
            <div className="border border-border/50 rounded-3xl overflow-hidden bg-card shadow-sm h-[700px] overflow-y-auto no-scrollbar">
                <div className="flex min-h-full">
                    {/* Time labels — sticky to left, scrolls with the outer container */}
                    <div className="w-24 shrink-0 border-r border-border/50 bg-muted/5 sticky left-0 z-20">
                        {hours.map(hour => (
                            <div key={hour} className="h-24 border-b border-border/50/50 text-[11px] text-muted-foreground text-center pt-3 font-bold uppercase tracking-widest">
                                {hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`}
                            </div>
                        ))}
                    </div>

                    {/* Events panel — no independent scroll, flows with the outer container */}
                    <div className="flex-1 relative bg-white/50 dark:bg-slate-950/20">
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

                                    // Overlap / stack calculations
                                    const eventStart = startD.getTime();
                                    const eventEnd = endD.getTime();
                                    const overlapping = dayEvents.filter((s: any) => {
                                        const sStart = parseISO(s.scheduled_start).getTime();
                                        const sEnd = parseISO(s.scheduled_end).getTime();
                                        return eventStart < sEnd && eventEnd > sStart;
                                    });

                                    const stackCount = overlapping.length;
                                    const stackIndex = overlapping.findIndex((s: any) => s.id === event.id);

                                    const cardHeight = height / (stackCount || 1);
                                    const cardTop = topPos + (stackIndex !== -1 ? stackIndex * cardHeight : 0);
                                    const isStacked = stackCount > 1;

                                    return (
                                        <div
                                            key={event.id}
                                            onClick={() => setSelectedSession(event)}
                                            className={cn(
                                                "absolute left-4 right-4 rounded-2xl border-2 p-3 overflow-hidden shadow-md hover:shadow-xl cursor-pointer transition-all hover:scale-[1.01] hover:z-30 group flex flex-col justify-center",
                                                getStatusColor(event)
                                            )}
                                            style={{ top: `${cardTop + 4}px`, height: `${cardHeight - 8}px` }}
                                        >
                                            {isStacked ? (
                                                <div className="flex flex-col justify-center h-full min-w-0">
                                                    <div className="flex items-center justify-between gap-1 w-full text-[10px]">
                                                        <div className="font-bold truncate flex-1 leading-none">
                                                            {event.session_mode === 'Group' ? (
                                                                <span>👥 {event.group_name || 'Group'}</span>
                                                            ) : event.session_mode === 'Other' ? (
                                                                <span>🏢 {event.session_type?.name}</span>
                                                            ) : (
                                                                <span>{event.client?.first_name} {event.client?.last_name || ''} ({event.client?.uhid || '-'})</span>
                                                            )}
                                                        </div>
                                                        <span className="opacity-75 font-semibold shrink-0 leading-none">
                                                            {event.session_type?.name || "Session"}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-start">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold px-2 py-0.5 bg-white/50 dark:bg-slate-800/80 rounded-full border border-current shadow-sm">
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
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <DashboardLayout role="sports_scientist">
            <div className="space-y-8">
                {/* Header Section */}
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-display font-black tracking-tight text-slate-900 dark:text-white">
                            Timetable
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Manage schedule and bookings for {profile?.first_name} {profile?.last_name}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* View selector segmented control */}
                        <div className="bg-slate-200/60 dark:bg-slate-900/60 p-1 rounded-full flex items-center gap-0.5 border border-slate-200/20 dark:border-slate-800/20 shadow-inner">
                            {[
                                { label: "Daily", mode: "day" },
                                { label: "Weekly", mode: "week" },
                                { label: "Monthly", mode: "month" }
                            ].map((opt) => (
                                <button
                                    key={opt.mode}
                                    onClick={() => setViewMode(opt.mode as any)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all",
                                        viewMode === opt.mode
                                            ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                                            : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>





                        {profile?.has_assign_work_access && (
                            <Button onClick={() => setIsAssignModalOpen(true)} variant="outline" className="rounded-full h-10 px-5 gap-2 font-bold text-xs">
                                <Edit className="w-3.5 h-3.5" /> Assign Work
                            </Button>
                        )}

                        {/* Add Slot button */}
                        <Button onClick={() => setIsBookModalOpen(true)} className="bg-primary hover:bg-primary/90 text-white rounded-full h-10 px-5 gap-2 font-bold text-xs shadow-md">
                            <Plus className="w-4 h-4" /> Add Slot
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8 p-1 bg-muted/30 rounded-xl border border-border/50">
                        <TabsTrigger value="calendar" className="rounded-lg gap-2">
                            <CalendarIcon className="w-4 h-4" /> Calendar View
                        </TabsTrigger>
                        <TabsTrigger value="log" className="rounded-lg gap-2">
                            <ClipboardList className="w-4 h-4" /> Sessions Log
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="calendar" className="mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                            {/* Main Schedule Panel */}
                            <div className="lg:col-span-3 space-y-6">
                                {/* Date Control Bar */}
                                <div className="flex items-center justify-between bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200/30 dark:border-slate-800/30">
                                    <Button variant="ghost" size="icon" onClick={handlePrev} className="h-10 w-10 rounded-xl">
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>
                                    
                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-950 px-5 py-2 rounded-xl shadow-xs border border-slate-200/50 dark:border-slate-800/50 font-black italic tracking-tight text-slate-900 dark:text-white">
                                        <CalendarIcon className="w-4 h-4 text-primary" />
                                        {getHeaderTitle()}
                                    </div>
                                    
                                    <Button variant="ghost" size="icon" onClick={handleNext} className="h-10 w-10 rounded-xl">
                                        <ChevronRight className="w-5 h-5" />
                                    </Button>
                                </div>

                                {/* Calendar content view */}
                                <div>
                                    {isLoading ? (
                                        <div className="h-[500px] flex flex-col items-center justify-center p-8 text-slate-400 animate-pulse bg-slate-100/30 dark:bg-slate-900/20 rounded-[2.2rem] border border-border/20">
                                            <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary" />
                                            <p className="font-bold text-xs uppercase tracking-widest">Loading your schedule...</p>
                                        </div>
                                    ) : (
                                        <div>
                                            {viewMode === "month" && renderMonthView()}
                                            {viewMode === "week" && renderWeekView()}
                                            {viewMode === "day" && renderDayView()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sidebar Panels */}
                            <div className="lg:col-span-1 space-y-6">
                                {/* JUMP TO DATE Calendar */}
                                <Card className="rounded-[2.2rem] border-slate-200/40 dark:border-slate-800/40 bg-slate-100/30 dark:bg-slate-900/20 shadow-xs p-5 border">
                                    <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-4 block">Jump to Date</span>
                                    
                                    {/* Month Selector */}
                                    <div className="flex justify-between items-center mb-4">
                                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => subMonths(prev, 1))} className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850">
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                                            {format(currentDate, 'MMMM yyyy')}
                                        </span>
                                        <Button variant="ghost" size="icon" onClick={() => setCurrentDate(prev => addMonths(prev, 1))} className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-850">
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Month Days Grid */}
                                    <div className="grid grid-cols-7 gap-1.5 text-center text-[10px]">
                                        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                                            <span key={d} className="font-black text-slate-400 py-1">{d}</span>
                                        ))}
                                        {miniCalendarDays.map((day) => {
                                            const isActive = isSameDay(day, currentDate);
                                            const isCurrentMonth = isSameMonth(day, currentDate);
                                            
                                            return (
                                                <button
                                                    key={day.toString()}
                                                    onClick={() => setCurrentDate(day)}
                                                    className={cn(
                                                        "h-7 w-7 rounded-full flex items-center justify-center font-black transition-all mx-auto",
                                                        isActive 
                                                            ? "bg-primary text-primary-foreground shadow-md" 
                                                            : isCurrentMonth
                                                                ? "text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                                                                : "text-slate-300 dark:text-slate-700"
                                                    )}
                                                >
                                                    {format(day, 'd')}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </Card>

                                {/* UPCOMING EVENTS List */}
                                <Card className="rounded-[2.2rem] border-slate-200/40 dark:border-slate-800/40 bg-slate-100/30 dark:bg-slate-900/20 shadow-xs p-5 border flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Upcoming Events</span>
                                        <Button variant="ghost" size="icon" onClick={() => setIsBookModalOpen(true)} className="h-6 w-6 rounded-full hover:bg-primary/10 hover:text-primary">
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="space-y-3.5 max-h-[350px] overflow-y-auto no-scrollbar">
                                        {upcomingEvents.length === 0 ? (
                                            <div className="text-center py-12 text-xs font-bold text-slate-400 dark:text-slate-600 italic">
                                                No upcoming events
                                            </div>
                                        ) : (
                                            upcomingEvents.map(event => {
                                                const startD = parseISO(event.scheduled_start);
                                                const endD = parseISO(event.scheduled_end);
                                                
                                                return (
                                                    <div 
                                                        key={event.id}
                                                        className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex justify-between items-start gap-2 group hover:border-primary/20 transition-all shadow-xs"
                                                    >
                                                        <div className="space-y-1 overflow-hidden">
                                                            <span className="text-[8px] font-black uppercase tracking-wider text-primary block">
                                                                {format(startD, "EEEE")}
                                                            </span>
                                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block truncate leading-tight">
                                                                {event.session_mode === 'Group' 
                                                                    ? event.group_name 
                                                                    : event.session_mode === 'Other' 
                                                                        ? event.session_type?.name 
                                                                        : `${event.client?.first_name} ${event.client?.last_name || ''}`}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 block truncate">
                                                                Coach: {profile?.first_name} {profile?.last_name}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block mt-1">
                                                                {format(startD, "h:mm a")} - {format(endD, "h:mm a")}
                                                            </span>
                                                        </div>
                                                        
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => setSelectedSession(event)}
                                                            className="h-7 w-7 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                        >
                                                            <Edit className="w-3.5 h-3.5 text-slate-400 hover:text-primary" />
                                                        </Button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </Card>
                            </div>
                        </div>
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

                <SportsScientistAssignWorkModal
                    open={isAssignModalOpen}
                    onOpenChange={setIsAssignModalOpen}
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
