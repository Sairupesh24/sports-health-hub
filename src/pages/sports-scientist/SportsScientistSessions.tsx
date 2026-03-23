import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Search, ClipboardList, Filter, Users, Calendar, Clock,
    CheckCircle2, XCircle, TrendingUp, ChevronLeft, ChevronRight,
    Lock, AlertTriangle, Pencil, BarChart3,
} from "lucide-react";
import { format, parseISO, startOfDay, differenceInCalendarDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { SportsScientistSessionStatusModal } from "@/components/sports-scientist/SportsScientistSessionStatusModal";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getEditability(session: any) {
    const scheduledDay = startOfDay(parseISO(session.scheduled_start));
    const today = startOfDay(new Date());
    const daysAgo = differenceInCalendarDays(today, scheduledDay);
    return {
        isLocked: daysAgo >= 2,
        isFuture: daysAgo < 0,
        isToday: daysAgo === 0,
        isYesterday: daysAgo === 1,
        daysAgo,
    };
}

const STATUS_COLORS: Record<string, string> = {
    Planned: "bg-blue-100 text-blue-800 border-blue-300",
    Completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
    Missed: "bg-rose-100 text-rose-800 border-rose-300",
    Cancelled: "bg-slate-100 text-slate-600 border-slate-300",
    Rescheduled: "bg-amber-100 text-amber-800 border-amber-300",
};

function StatusPill({ status }: { status: string }) {
    const cls = STATUS_COLORS[status] || "bg-muted text-muted-foreground border-border";
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${cls}`}>
            {status === "Completed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {status === "Missed" && <XCircle className="w-3 h-3 mr-1 text-rose-500" />}
            {status === "Planned" && <Clock className="w-3 h-3 mr-1 text-blue-500" />}
            {status}
        </span>
    );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function SportsScientistSessions() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [selectedSession, setSelectedSession] = useState<any>(null);

    // Date range: defaults to current month, navigable by month
    const [monthOffset, setMonthOffset] = useState(0);
    const dateRange = useMemo(() => {
        const ref = subMonths(new Date(), -monthOffset); // monthOffset 0 = current, -1 = next, 1 = prev
        const base = subMonths(new Date(), monthOffset);
        return {
            start: startOfMonth(base).toISOString(),
            end: endOfMonth(base).toISOString(),
            label: format(base, "MMMM yyyy"),
        };
    }, [monthOffset]);

    // ── fetch sessions ────────────────────────────────────────────────────────
    const { data: rawSessions = [], isLoading, refetch } = useQuery({
        queryKey: ["ss-sessions-log", user?.id, dateRange.start, dateRange.end],
        queryFn: async () => {
            if (!user) return [];
            const { data, error } = await (supabase as any)
                .from("sessions")
                .select(`
                    id, scheduled_start, scheduled_end,
                    actual_start, actual_end, status,
                    session_mode, group_name, session_notes,
                    client:clients(first_name, last_name, uhid),
                    session_type:session_types(name)
                `)
                .eq("scientist_id", user.id)
                .gte("scheduled_start", dateRange.start)
                .lte("scheduled_start", dateRange.end)
                .order("scheduled_start", { ascending: false });
            if (error) throw error;
            return (data ?? []) as any[];
        },
        enabled: !!user,
    });

    // ── auto-miss stale Planned sessions ─────────────────────────────────────
    const autoMissMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            if (!ids.length) return;
            await supabase
                .from("sessions")
                .update({ status: "Missed", updated_at: new Date().toISOString() })
                .in("id", ids);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ss-sessions-log"] });
        },
    });

    useEffect(() => {
        const stale = rawSessions.filter(s => {
            const info = getEditability(s);
            return s.status === "Planned" && info.isLocked; // 2+ days old, still Planned
        }).map(s => s.id);
        if (stale.length > 0) autoMissMutation.mutate(stale);
    }, [rawSessions]);

    // ── unique session types for filter ──────────────────────────────────────
    const sessionTypeOptions = useMemo(() => {
        const types = new Set(rawSessions.map(s => s.session_type?.name).filter(Boolean));
        return Array.from(types) as string[];
    }, [rawSessions]);

    // ── apply filters ─────────────────────────────────────────────────────────
    const sessions = useMemo(() => {
        let list = rawSessions;
        if (statusFilter !== "all") list = list.filter(s => s.status === statusFilter);
        if (typeFilter !== "all") list = list.filter(s => s.session_type?.name === typeFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(s =>
                s.client?.first_name?.toLowerCase().includes(q) ||
                s.client?.last_name?.toLowerCase().includes(q) ||
                s.client?.uhid?.toLowerCase().includes(q) ||
                s.group_name?.toLowerCase().includes(q) ||
                s.session_type?.name?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [rawSessions, statusFilter, typeFilter, search]);

    // ── stats ─────────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total = rawSessions.length;
        const completed = rawSessions.filter(s => s.status === "Completed").length;
        const missed = rawSessions.filter(s => s.status === "Missed").length;
        const planned = rawSessions.filter(s => s.status === "Planned").length;
        const compliance = total > 0 ? Math.round((completed / Math.max(completed + missed, 1)) * 100) : 0;
        const totalMins = rawSessions
            .filter(s => s.actual_start && s.actual_end)
            .reduce((acc, s) => {
                const mins = (new Date(s.actual_end).getTime() - new Date(s.actual_start).getTime()) / 60000;
                return acc + mins;
            }, 0);
        const totalHours = Math.round(totalMins / 60 * 10) / 10;
        return { total, completed, missed, planned, compliance, totalHours };
    }, [rawSessions]);

    const getDuration = (s: any) => {
        const startT = s.actual_start || s.scheduled_start;
        const endT = s.actual_end || s.scheduled_end;
        if (!startT || !endT) return null;
        const mins = Math.round((new Date(endT).getTime() - new Date(startT).getTime()) / 60000);
        if (mins < 60) return `${mins}m`;
        return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ""}`.trim();
    };

    return (
        <DashboardLayout role="sports_scientist">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                            <ClipboardList className="w-8 h-8 text-primary" />
                            Sessions Log
                        </h1>
                        <p className="text-muted-foreground mt-1">Track, review, and manage all performance sessions</p>
                    </div>
                    {/* Month navigator */}
                    <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border/50">
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMonthOffset(p => p + 1)}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-bold min-w-[130px] text-center">{dateRange.label}</span>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMonthOffset(p => p - 1)} disabled={monthOffset <= 0}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                        {monthOffset !== 0 && (
                            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-primary" onClick={() => setMonthOffset(0)}>
                                This Month
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { label: "Total", value: stats.total, icon: <BarChart3 className="w-4 h-4" />, color: "text-foreground" },
                        { label: "Completed", value: stats.completed, icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, color: "text-emerald-600" },
                        { label: "Missed", value: stats.missed, icon: <XCircle className="w-4 h-4 text-rose-500" />, color: "text-rose-600" },
                        { label: "Upcoming", value: stats.planned, icon: <Clock className="w-4 h-4 text-blue-500" />, color: "text-blue-600" },
                        { label: "Compliance", value: `${stats.compliance}%`, icon: <TrendingUp className="w-4 h-4 text-primary" />, color: "text-primary" },
                    ].map(stat => (
                        <Card key={stat.label} className="border-border/50 shadow-sm">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-muted/40">{stat.icon}</div>
                                <div>
                                    <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Compliance bar */}
                {stats.total > 0 && (
                    <div className="flex items-center gap-3 bg-muted/20 rounded-xl border border-border/50 p-4">
                        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Session Compliance</span>
                        <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${stats.compliance >= 80 ? "bg-emerald-500" : stats.compliance >= 60 ? "bg-amber-500" : "bg-rose-500"}`}
                                style={{ width: `${stats.compliance}%` }}
                            />
                        </div>
                        <span className="text-sm font-bold">{stats.compliance}%</span>
                        {stats.totalHours > 0 && (
                            <span className="text-xs text-muted-foreground ml-2">· {stats.totalHours}h logged</span>
                        )}
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search athlete, UHID, group, or session type..."
                            className="pl-9 h-11 bg-muted/30"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-44 h-11">
                            <Filter className="w-4 h-4 mr-2" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="Planned">Planned</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Missed">Missed</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                            <SelectItem value="Rescheduled">Rescheduled</SelectItem>
                        </SelectContent>
                    </Select>
                    {sessionTypeOptions.length > 0 && (
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full sm:w-52 h-11">
                                <ClipboardList className="w-4 h-4 mr-2" />
                                <SelectValue placeholder="Session Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {sessionTypeOptions.map(t => (
                                    <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Sessions list */}
                {isLoading ? (
                    <div className="py-16 text-center text-muted-foreground">
                        <ClipboardList className="w-10 h-10 mx-auto mb-3 animate-pulse opacity-30" />
                        <p>Loading sessions...</p>
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="font-medium">No sessions found</p>
                        <p className="text-sm">Try adjusting your filters or navigate to a different month.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sessions.map(s => {
                            const info = getEditability(s);
                            const duration = getDuration(s);
                            const isGroup = s.session_mode === "Group";
                            const scheduledDate = parseISO(s.scheduled_start);

                            return (
                                <div
                                    key={s.id}
                                    className={`group flex items-center gap-4 bg-card border rounded-2xl p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30 ${info.isLocked ? "opacity-80" : ""}`}
                                >
                                    {/* Date block */}
                                    <div className="shrink-0 w-14 text-center">
                                        <div className={`text-2xl font-display font-black leading-none ${info.isLocked ? "text-muted-foreground" : "text-foreground"}`}>
                                            {format(scheduledDate, "d")}
                                        </div>
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">
                                            {format(scheduledDate, "MMM")}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground font-medium">
                                            {format(scheduledDate, "EEE")}
                                        </div>
                                    </div>

                                    {/* Divider */}
                                    <div className={`w-px h-12 rounded-full shrink-0 ${STATUS_COLORS[s.status]?.includes("emerald") ? "bg-emerald-300" : STATUS_COLORS[s.status]?.includes("blue") ? "bg-blue-300" : STATUS_COLORS[s.status]?.includes("rose") ? "bg-rose-300" : "bg-border"}`} />

                                    {/* Main info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold text-base truncate">
                                                {isGroup ? `👥 ${s.group_name}` : `${s.client?.first_name ?? ""} ${s.client?.last_name ?? ""}`}
                                            </span>
                                            {!isGroup && s.client?.uhid && (
                                                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{s.client.uhid}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                                            <span className="font-medium">{s.session_type?.name || "Sports Science"}</span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {format(scheduledDate, "HH:mm")}
                                                {s.scheduled_end && ` – ${format(parseISO(s.scheduled_end), "HH:mm")}`}
                                                {duration && <span className="text-primary font-semibold">({duration})</span>}
                                            </span>
                                            {isGroup && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Group</span>}
                                        </div>
                                        {s.session_notes && (
                                            <p className="text-xs text-muted-foreground mt-1.5 italic truncate max-w-md">
                                                📝 {s.session_notes}
                                            </p>
                                        )}
                                    </div>

                                    {/* Right: status + action */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <StatusPill status={s.status} />

                                        {info.isLocked ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="w-8 h-8 flex items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
                                                            <Lock className="w-3.5 h-3.5" />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="text-xs">Locked — older than 1 day</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : info.isFuture && s.status === "Planned" ? (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-full hover:bg-amber-50 hover:text-amber-700"
                                                            onClick={() => setSelectedSession(s)}
                                                        >
                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p className="text-xs">Future session — click to cancel if needed</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => setSelectedSession(s)}
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <SportsScientistSessionStatusModal
                open={!!selectedSession}
                onOpenChange={open => !open && setSelectedSession(null)}
                session={selectedSession}
                onSuccess={refetch}
            />
        </DashboardLayout>
    );
}
