import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { 
    Users, 
    Calendar, 
    Clock, 
    AlertCircle, 
    Bell, 
    Search, 
    CheckCircle2, 
    XCircle,
    UserPlus,
    Phone,
    ArrowRight,
    MapPin,
    Activity,
    CreditCard,
    Plus,
    CalendarRange,
} from "lucide-react";
import { LogEnquiryModal } from "@/components/admin/LogEnquiryModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn, formatClientName } from "@/lib/utils";
import { apiFetch } from "@/utils/api";
import { formatStaffName } from "@/utils/serviceMapping";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
    startOfDay, 
    endOfDay, 
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    format, 
    parseISO, 
    isSameDay,
    getDay
} from "date-fns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VIPBadge } from "@/components/ui/VIPBadge";

const DAYS_OF_WEEK = [
    { id: 0, label: "Sunday" },
    { id: 1, label: "Monday" },
    { id: 2, label: "Tuesday" },
    { id: 3, label: "Wednesday" },
    { id: 4, label: "Thursday" },
    { id: 5, label: "Friday" },
    { id: 6, label: "Saturday" },
];

export function getSessionPopulationCategory(session: any): "Athlete" | "General Population" {
  if (!session) return "General Population";

  // 1. Explicit client occupation
  const rawOccupation = session.client?.occupation?.trim()?.toLowerCase();
  if (rawOccupation === "athlete") return "Athlete";
  if (
    rawOccupation === "general population" || 
    rawOccupation === "gen-pop" || 
    rawOccupation === "general" ||
    rawOccupation === "corporate" ||
    rawOccupation === "non-athlete"
  ) {
    return "General Population";
  }

  // 2. Client athlete flags
  if (session.client?.athlete_type) return "Athlete";
  if (
    session.client?.sport && 
    session.client.sport.trim() !== "" && 
    session.client.sport !== "--" && 
    session.client.sport.toLowerCase() !== "none"
  ) {
    return "Athlete";
  }

  // 3. Group session classification by group name
  const groupName = (session.group_name || "").trim().toLowerCase();
  if (groupName) {
    if (
      groupName.includes("gen-pop") || 
      groupName.includes("gen pop") || 
      groupName.includes("general population") || 
      groupName.includes("general pop") ||
      groupName.includes("corporate") ||
      groupName.includes("wellness") ||
      groupName.includes("rehab group")
    ) {
      return "General Population";
    }

    if (
      groupName.includes("champ") || 
      groupName.includes("athlete") || 
      groupName.includes("s&c") || 
      groupName.includes("strength") || 
      groupName.includes("squad") || 
      groupName.includes("team") || 
      groupName.includes("academy") || 
      groupName.includes("badminton") || 
      groupName.includes("cricket") || 
      groupName.includes("tennis") || 
      groupName.includes("football") || 
      groupName.includes("swimming") || 
      groupName.includes("track") ||
      groupName.includes("fencing") ||
      groupName.includes("rowing") ||
      groupName.includes("boxing") ||
      groupName.includes("elite") ||
      groupName.includes("junior") ||
      groupName.includes("senior") ||
      groupName.includes("pro")
    ) {
      return "Athlete";
    }
  }

  // 4. Session service type indicator
  const service = (session.service_type || session.session_type?.name || "").trim().toLowerCase();
  if (
    service.includes("athlete") || 
    service.includes("sports science") || 
    service.includes("s&c") || 
    service.includes("strength & conditioning") ||
    service.includes("performance testing") ||
    service.includes("combine") ||
    service.includes("vo2")
  ) {
    return "Athlete";
  }

  // 5. If group session with training/conditioning in sports hub
  const isGroup = session.session_mode?.toLowerCase() === "group" || Boolean(session.group_name);
  if (isGroup && (service.includes("training") || service.includes("conditioning"))) {
    return "Athlete";
  }

  // Default fallback for client
  if (session.client) {
    return "General Population";
  }

  return "General Population";
}

export default function FOEDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Filters for FOE Console Cards & Visits
  const [roleFilter, setRoleFilter] = useState<'all' | 'sports_scientist' | 'physiotherapist'>('all');
  const [timeFilter, setTimeFilter] = useState<'today' | 'this_week' | 'this_month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Calculate active start and end timestamps based on selected time filter
  const activeDateRange = useMemo(() => {
    const now = new Date();
    if (timeFilter === 'today') {
      return {
        start: startOfDay(now),
        end: endOfDay(now),
        label: 'Today',
      };
    }
    if (timeFilter === 'this_week') {
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
        label: 'This Week',
      };
    }
    if (timeFilter === 'this_month') {
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
        label: 'This Month',
      };
    }
    // custom
    const s = customStartDate ? startOfDay(parseISO(customStartDate)) : startOfDay(now);
    const rawEnd = customEndDate ? endOfDay(parseISO(customEndDate)) : endOfDay(now);
    const e = rawEnd < s ? endOfDay(s) : rawEnd;
    return {
      start: s,
      end: e,
      label: `${format(s, "dd MMM yyyy")} - ${format(e, "dd MMM yyyy")}`,
    };
  }, [timeFilter, customStartDate, customEndDate]);

  // 1. Sessions & Appointments Query for the selected date range
  const { data: allSessions, isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ['foe-sessions', organizationId, activeDateRange.start.toISOString(), activeDateRange.end.toISOString()],
    queryFn: async () => {
      const data = await apiFetch<any[]>(`/api/appointments?start=${activeDateRange.start.toISOString()}&end=${activeDateRange.end.toISOString()}`);
      return data || [];
    },
    enabled: !!organizationId
  });

  // 2. Waitlist Query
  const { data: waitlistItems, isLoading: waitlistLoading } = useQuery<any[]>({
    queryKey: ['foe-waitlist', organizationId],
    queryFn: async () => {
        const data = await apiFetch<any[]>(`/api/appointments/waitlist?status=Waiting`);
        return data || [];
    },
    enabled: !!organizationId
  });

  // 3. Unentitled Sessions Query
  const { data: unentitledSessions, isLoading: unentitledLoading } = useQuery<any[]>({
    queryKey: ['foe-unentitled-sessions', organizationId],
    queryFn: async () => {
        const data = await apiFetch<any[]>(`/api/appointments?is_unentitled=true`);
        return data || [];
    },
    enabled: !!organizationId
  });

  // 4. Consultant Availability Query
  const { data: consultants, isLoading: consultantsLoading, error: consultantsError } = useQuery<any[]>({
    queryKey: ['foe-consultant-availability', organizationId],
    queryFn: async () => {
        const data = await apiFetch<any[]>(`/hr/employees?role_type=clinical`);
        return data || [];
    },
    enabled: !!organizationId,
    retry: 1
  });

  // 5. Dunning Alerts Query
  const { data: dunningSubscriptions } = useQuery<any[]>({
    queryKey: ['foe-dunning-alerts', organizationId],
    queryFn: async () => {
        const data = await apiFetch<any[]>(`/api/billing/dunning-alerts`);
        return data || [];
    },
    enabled: !!organizationId
  });

  // Consultant lookup map
  const consultantsMap = useMemo(() => {
    const map = new Map<string, any>();
    (consultants || []).forEach((c: any) => {
      map.set(c.id, c);
    });
    return map;
  }, [consultants]);

  // Helper to match session against practitioner role
  const matchesRoleFilter = (session: any, role: 'all' | 'sports_scientist' | 'physiotherapist') => {
    if (role === 'all') return true;

    const specialistId = session.therapist_id || session.scientist_id;
    const consultant = specialistId ? consultantsMap.get(specialistId) : null;

    const prof = (consultant?.profession || session.therapist?.profession || '').toLowerCase();
    const r = (consultant?.role || consultant?.ams_role || session.therapist?.ams_role || '').toLowerCase();
    const service = (session.service_type || session.session_type?.name || '').toLowerCase();

    const isSportsScientist = 
      Boolean(session.scientist_id && !session.therapist_id) ||
      prof.includes('sports scientist') || 
      prof.includes('scientist') || 
      r.includes('sports_scientist') ||
      service.includes('s&c') ||
      service.includes('strength') ||
      service.includes('conditioning') ||
      service.includes('sports science') ||
      service.includes('testing') ||
      service.includes('performance');

    const isPhysio = 
      prof.includes('physio') || 
      r.includes('physio') ||
      service.includes('physio') ||
      service.includes('rehab') ||
      service.includes('therapy') ||
      service.includes('injury') ||
      service.includes('assessment');

    if (role === 'sports_scientist') return isSportsScientist;
    if (role === 'physiotherapist') return isPhysio;
    return true;
  };

  // Filtered Sessions according to active Role filter
  const filteredSessions = useMemo(() => {
    if (!allSessions) return [];
    return allSessions.filter((s: any) => matchesRoleFilter(s, roleFilter));
  }, [allSessions, roleFilter, consultantsMap]);

  // Filtered Unentitled Sessions for right column
  const filteredUnentitledSessions = useMemo(() => {
    if (!unentitledSessions) return [];
    return unentitledSessions.filter((s: any) => matchesRoleFilter(s, roleFilter));
  }, [unentitledSessions, roleFilter, consultantsMap]);

  // Derived Values
  const availableToday = useMemo(() => {
    const dayOfToday = getDay(new Date());
    return consultants?.filter((c: any) => 
        c.consultant_availability?.some((a: any) => a.day_of_week === dayOfToday)
    ) || [];
  }, [consultants]);

  const availabilityForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dayOfSelected = getDay(parseISO(selectedDate));
    return consultants?.map((c: any) => {
        const schedule = c.consultant_availability?.find((a: any) => a.day_of_week === dayOfSelected);
        const hasEmergency = c.emergency_alerts?.some((a: any) => a.status === 'unresolved');
        return {
            ...c,
            is_available: !!schedule,
            schedule: schedule,
            has_emergency: hasEmergency
        };
    }) || [];
  }, [consultants, selectedDate]);

  if (consultantsError) {
    console.error("FOEDashboard Critical Error:", consultantsError);
    toast({
        title: "Data Sync Warning",
        description: "Some clinical data could not be synchronized. Please refresh the page.",
        variant: "destructive"
    });
  }

  // 4 Cards metrics calculations
  const totalAppointments = filteredSessions.length;
  const sessionsCompleted = filteredSessions.filter((s: any) => s.status === 'Completed').length;
  const sessionsPending = filteredSessions.filter((s: any) => s.status !== 'Completed' && s.status !== 'Cancelled').length;
  const unentitledCount = filteredSessions.filter((s: any) => s.is_unentitled === true).length;

  const completionRate = totalAppointments > 0 ? Math.round((sessionsCompleted / totalAppointments) * 100) : 0;

  const roleLabel = roleFilter === 'all' 
    ? 'All Specialists' 
    : (roleFilter === 'sports_scientist' ? 'Sports Scientists' : 'Physiotherapists');

  const stats: { title: string; value: string | number; icon: any; change: string; changeType: "neutral" | "negative" | "positive" }[] = [
    { 
      title: "Total Appointments", 
      value: totalAppointments, 
      icon: Calendar, 
      change: `${roleLabel} • ${activeDateRange.label}`, 
      changeType: "neutral" 
    },
    { 
      title: "Sessions Completed", 
      value: sessionsCompleted, 
      icon: CheckCircle2, 
      change: `${completionRate}% Completion Rate`, 
      changeType: "positive" 
    },
    { 
      title: "Sessions Pending", 
      value: sessionsPending, 
      icon: Clock, 
      change: `${sessionsPending} Awaiting Completion`, 
      changeType: sessionsPending > 0 ? "neutral" : "positive" 
    },
    { 
      title: "Unentitled Sessions", 
      value: unentitledCount, 
      icon: AlertCircle, 
      change: unentitledCount > 0 ? "Requires Billing Resolution" : "No Unbilled Sessions", 
      changeType: unentitledCount > 0 ? "negative" : "positive" 
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "Good Night";
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    if (hour < 22) return "Good Evening";
    return "Good Night";
  };

  return (
    <DashboardLayout role="foe">
      <div className="space-y-6 pb-12">
        {/* Dunning Sticky Alerts */}
        {dunningSubscriptions && dunningSubscriptions.length > 0 && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-700">
            {dunningSubscriptions.map((sub: any) => (
              <div 
                key={sub.id} 
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border shadow-lg border-l-8",
                  sub.status === 'Suspended' 
                    ? "bg-rose-50 border-rose-200 border-l-rose-600" 
                    : "bg-amber-50 border-amber-200 border-l-amber-600"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                    sub.status === 'Suspended' ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                  )}>
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={cn("font-black text-sm", sub.status === 'Suspended' ? "text-rose-950" : "text-amber-950")}>
                      {sub.status === 'Suspended' ? "MEMBERSHIP SUSPENDED" : "PAYMENT OVERDUE"}
                    </h3>
                    <p className="text-xs font-bold opacity-70">
                      {formatClientName(sub.client)} ({sub.client?.uhid}) — {sub.status === 'Suspended' ? "Service access blocked due to non-payment." : `Payment reminder sent (Step ${sub.dunning_step})`}
                    </p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className={cn(
                    "font-bold rounded-xl",
                    sub.status === 'Suspended' ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700"
                  )}
                  onClick={() => navigate(`/admin/clients/${sub.client?.id}?tab=billing`)}
                >
                  Resolve Billing
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              {getGreeting()}, {profile?.first_name || 'Team'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-medium">FOE Operations Hub — Daily management console</p>
          </div>
          <div className="bg-muted/30 px-4 py-2 rounded-xl border flex items-center gap-3">
             <Clock className="w-4 h-4 text-primary animate-pulse" />
             <span className="text-sm font-bold">{format(new Date(), "PPP")}</span>
          </div>
          <Button 
            onClick={() => setIsLogModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white shadow-lg gap-2"
          >
            <Plus className="w-4 h-4" /> Quick Log Enquiry
          </Button>
        </div>

        {/* Controls & Filters Bar */}
        <div className="bg-card/75 backdrop-blur-md border border-border/80 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            {/* Role Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mr-1">
                <Users className="w-3.5 h-3.5 text-primary" />
                Staff Role:
              </span>
              <div className="inline-flex p-1 bg-muted/60 rounded-xl border border-border/50 text-xs font-bold gap-1">
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    roleFilter === 'all'
                      ? "bg-primary text-white shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  All Specialists
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('sports_scientist')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    roleFilter === 'sports_scientist'
                      ? "bg-primary text-white shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Sports Scientists
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter('physiotherapist')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    roleFilter === 'physiotherapist'
                      ? "bg-primary text-white shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Physiotherapists
                </button>
              </div>
            </div>

            {/* Time Range Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mr-1">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Time Period:
              </span>
              <div className="inline-flex p-1 bg-muted/60 rounded-xl border border-border/50 text-xs font-bold gap-1">
                <button
                  type="button"
                  onClick={() => setTimeFilter('today')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    timeFilter === 'today'
                      ? "bg-primary text-white shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('this_week')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    timeFilter === 'this_week'
                      ? "bg-primary text-white shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('this_month')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all",
                    timeFilter === 'this_month'
                      ? "bg-primary text-white shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter('custom')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
                    timeFilter === 'custom'
                      ? "bg-primary text-white shadow-xs font-black"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Custom Dates
                </button>
              </div>
            </div>
          </div>

          {/* Date Picker row when Custom Dates is active */}
          {timeFilter === 'custom' && (
            <div className="pt-2.5 border-t border-border/60 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-primary" /> From:
                </label>
                <Input 
                  type="date" 
                  value={customStartDate} 
                  onChange={(e) => setCustomStartDate(e.target.value)} 
                  className="h-8 text-xs font-semibold w-36 bg-background rounded-lg border-border" 
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-primary" /> To:
                </label>
                <Input 
                  type="date" 
                  value={customEndDate} 
                  onChange={(e) => setCustomEndDate(e.target.value)} 
                  className="h-8 text-xs font-semibold w-36 bg-background rounded-lg border-border" 
                />
              </div>
              <div className="text-[11px] font-bold text-muted-foreground ml-auto bg-muted/50 px-2.5 py-1 rounded-md border border-border/50">
                Range: <span className="text-foreground">{activeDateRange.label}</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <StatCard key={i} {...stat} className="animate-in fade-in slide-in-from-bottom-2 duration-500" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Column: Schedule & Waitlist */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Schedule & Visits Log Card */}
            <Card className="border-none shadow-premium overflow-hidden">
              <CardHeader className="bg-muted/10 border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    {timeFilter === 'today' ? "Today's Visits Log" : `Visits Log (${activeDateRange.label})`}
                  </CardTitle>
                  <CardDescription>
                    Real-time view of scheduled clinical activities • {roleLabel} ({filteredSessions.length})
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    sessionStorage.setItem("active_console", "foe");
                    navigate("/admin/foe/session-report");
                  }}
                  className="gap-2 font-bold bg-white/90 hover:bg-white text-xs sm:text-sm border-purple-200 text-purple-700 hover:text-purple-800 hover:border-purple-300 shadow-sm shrink-0 rounded-xl"
                  title="Redirect to Time Frame Session Report"
                >
                  <CalendarRange className="w-4 h-4 text-purple-600" />
                  <span>Time Frame Session Report</span>
                  <ArrowRight className="w-3.5 h-3.5 text-purple-500 ml-0.5" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[450px]">
                  {sessionsLoading ? (
                    <div className="p-12 flex justify-center"><Activity className="animate-spin text-primary" /></div>
                  ) : !filteredSessions || filteredSessions.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground italic">
                      No appointments scheduled for {timeFilter === 'today' ? 'today' : activeDateRange.label} under {roleLabel}.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {filteredSessions.map((session: any) => {
                        const isGroup = session.session_mode?.toLowerCase() === 'group' || Boolean(session.group_name);
                        const groupTitle = session.group_name?.trim() || (isGroup ? "Group Session" : "");
                        const clientTitle = formatClientName(session.client);
                        const displayName = isGroup ? groupTitle : (clientTitle || session.guest_name || "Guest Patient");
                        const populationType = getSessionPopulationCategory(session);

                        return (
                          <div key={session.id} className="p-4 hover:bg-muted/10 transition-colors flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className="text-center min-w-[60px] bg-primary/5 py-2 px-1 rounded-lg border border-primary/10">
                                <span className="block text-xs font-black text-primary uppercase">{format(parseISO(session.scheduled_start), "hh:mm")}</span>
                                <span className="block text-[10px] opacity-60 font-bold uppercase">{format(parseISO(session.scheduled_start), "aa")}</span>
                              </div>
                              <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-bold text-foreground flex items-center gap-1.5">
                                          {isGroup && <Users className="w-4 h-4 text-primary shrink-0" />}
                                          {displayName}
                                      </span>
                                      {isGroup && (
                                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md">
                                          Group
                                        </Badge>
                                      )}
                                      {!isGroup && <VIPBadge isVIP={session.client?.is_vip} />}
                                      <Badge 
                                        variant="outline"
                                        className={cn(
                                          "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md border",
                                          populationType === "Athlete"
                                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
                                            : "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-800"
                                        )}
                                      >
                                        {populationType}
                                      </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                      {session.client?.uhid && (
                                        <>
                                          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase">UHID: {session.client.uhid}</span>
                                          <span>•</span>
                                        </>
                                      )}
                                      <span className="font-medium text-primary/80">{session.service_type || 'Training'}</span>
                                      {session.client?.sport && session.client.sport !== '--' && (
                                        <>
                                          <span>•</span>
                                          <span className="text-[11px] font-medium text-muted-foreground">{session.client.sport}</span>
                                        </>
                                      )}
                                  </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right hidden sm:block">
                                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Consultant</p>
                                  <p className="text-xs font-semibold">{formatStaffName(session.therapist || session.scientist || session.staff, { useFirstName: true })}</p>
                              </div>
                              <Badge className={`uppercase text-[10px] font-black px-2 py-0.5 ${
                                  session.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                  session.status === 'Checked In' ? 'bg-purple-100 text-purple-700' :
                                  'bg-blue-100 text-blue-700'
                              }`}>
                                  {session.status}
                              </Badge>
                              <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title={session.client?.id ? "View Client Sessions" : "View in Master Calendar"}
                                  onClick={() => {
                                    if (session.client?.id) {
                                      navigate(`/admin/clients/${session.client.id}?tab=sessions`);
                                    } else {
                                      navigate('/admin/calendar');
                                    }
                                  }}
                              >
                                  <ArrowRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Appointment Waitlist Card */}
            <Card className="border-none shadow-premium overflow-hidden">
              <CardHeader className="bg-orange-50/30 border-b border-orange-100 pb-4">
                <CardTitle className="text-lg flex items-center gap-2 text-orange-950 font-black">
                  <Bell className="w-5 h-5 text-orange-600 animate-pulse" />
                  Appointment Waitlist
                </CardTitle>
                <CardDescription className="text-orange-900/60">Patients waiting for cancellations or preferred slots</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[350px]">
                  {waitlistLoading ? (
                    <div className="p-12 flex justify-center"><Activity className="animate-spin text-orange-500" /></div>
                  ) : !waitlistItems || waitlistItems.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground italic text-sm">Waitlist is currently empty.</div>
                  ) : (
                    <div className="divide-y divide-orange-100/50">
                      {waitlistItems.map((item: any) => (
                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-orange-50/20 transition-all group">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700">
                                <Users className="w-5 h-5" />
                             </div>
                             <div>
                                <div className="flex items-center gap-2">
                                    <span 
                                        className="font-bold text-orange-950 hover:text-orange-700 cursor-pointer transition-colors"
                                        onClick={() => navigate(`/admin/clients/${item.client?.id}?tab=entitlements`)}
                                    >
                                        {formatClientName(item.client)}
                                    </span>
                                    <VIPBadge isVIP={item.client?.is_vip} />
                                </div>
                                <div className="flex items-center gap-2 text-xs text-orange-900/60 mt-0.5">
                                    <span className="bg-white/50 px-1.5 py-0.5 rounded border border-orange-100 text-[10px] font-bold">UHID: {item.client?.uhid}</span>
                                    <span>•</span>
                                    <span className="font-bold uppercase text-[9px] tracking-widest">{(item.preferred_time_slot || 'Flexible').substring(0, 5)} Slot</span>
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             <Badge className={`uppercase text-[9px] font-black tracking-tighter ${
                                item.status === 'Notified' ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-700'
                             }`}>
                                {item.status}
                             </Badge>
                             <a href={`tel:${item.client?.mobile_no}`}>
                                <Button size="sm" variant="outline" className="h-8 gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 font-bold text-xs">
                                    <Phone className="w-3 h-3" /> Call
                                </Button>
                             </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Unentitled & Availability */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Unentitled Sessions Card */}
            <Card className="border-none shadow-premium overflow-hidden bg-rose-50/20 border-l-4 border-l-rose-500">
              <CardHeader className="pb-3 px-5 pt-5">
                <CardTitle className="text-lg flex items-center gap-2 text-rose-950">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  Unentitled Sessions
                </CardTitle>
                <CardDescription className="text-rose-900/60 font-medium">Review and resolve billing discrepancies</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                 <ScrollArea className="h-[300px] px-2">
                    {unentitledLoading ? (
                        <div className="py-10 flex justify-center"><Activity className="animate-spin text-rose-500" /></div>
                    ) : !filteredUnentitledSessions || filteredUnentitledSessions.length === 0 ? (
                        <div className="py-10 text-center text-xs text-rose-900/40 italic">No unentitled sessions requiring attention.</div>
                    ) : (
                        <div className="space-y-2">
                            {filteredUnentitledSessions.map((session: any) => (
                                <div key={session.id} className="p-3 bg-white/60 border border-rose-100 rounded-xl flex flex-col gap-2 group hover:border-rose-300 transition-all">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-rose-950">{formatClientName(session.client)}</span>
                                        <Badge variant="destructive" className="text-[8px] font-black uppercase tracking-tighter h-4">Unpaid</Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-bold text-rose-900/60 uppercase tracking-widest">
                                        <span>{session.service_type}</span>
                                        <span>{format(parseISO(session.scheduled_start), "dd MMM, hh:mm a")}</span>
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="w-full h-7 text-[10px] uppercase font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700 border border-dashed border-rose-200 mt-1"
                                        onClick={() => navigate(`/admin/clients/${session.client?.id}?tab=entitlements`)}
                                    >
                                        Open Profile <ArrowRight className="w-3 h-3 ml-2" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                 </ScrollArea>
              </CardContent>
            </Card>

            {/* Consultant Availability Tracker Card */}
            <Card className="border-none shadow-premium overflow-hidden sticky top-6">
              <CardHeader className="bg-primary/5 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Staff Availability
                </CardTitle>
                <CardDescription>Track consultant schedules by date</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Check Specific Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                            type="date" 
                            className="pl-10 h-11 bg-muted/20 border-none font-bold" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-muted-foreground">Consultant</span>
                        <span className="text-xs font-bold text-muted-foreground">Status</span>
                    </div>
                    
                    <ScrollArea className="h-[300px] pr-2">
                        {consultantsLoading ? (
                            <div className="py-10 flex justify-center"><Activity className="animate-spin text-primary" /></div>
                        ) : availabilityForSelectedDate.length === 0 ? (
                            <div className="py-10 text-center text-xs text-muted-foreground">No consultants found for organization.</div>
                        ) : (
                            <div className="space-y-3">
                                {availabilityForSelectedDate.map((c: any) => (
                                    <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                        c.has_emergency ? 'bg-destructive/5 border-destructive/20' :
                                        c.is_available ? 'bg-emerald-50/30 border-emerald-100 hover:border-emerald-300' : 'bg-rose-50/30 border-rose-100 hover:border-rose-300'
                                    }`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs uppercase ${
                                                c.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                            }`}>
                                                {c.first_name?.[0]}{c.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-foreground">{formatStaffName(c, { useFirstName: true })}</p>
                                                {c.is_available && (
                                                    <p className="text-[9px] font-bold text-emerald-600/70 tracking-widest uppercase">
                                                        {c.schedule?.start_time?.substring(0, 5)} - {c.schedule?.end_time?.substring(0, 5)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            {c.has_emergency ? (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive rounded-lg text-white font-black text-[8px] uppercase tracking-tighter animate-pulse">
                                                    <AlertCircle className="w-2.5 h-2.5" /> Emergency
                                                </div>
                                            ) : c.is_available ? (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500 rounded-lg text-white font-black text-[8px] uppercase tracking-tighter">
                                                    <CheckCircle2 className="w-2.5 h-2.5" /> Available
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-500 rounded-lg text-white font-black text-[8px] uppercase tracking-tighter">
                                                    <XCircle className="w-2.5 h-2.5" /> Off-Duty
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
              </CardContent>
            </Card>

          </div>

        </div>
      </div>
      <LogEnquiryModal 
        isOpen={isLogModalOpen} 
        onClose={() => setIsLogModalOpen(false)} 
      />
    </DashboardLayout>
  );
}
