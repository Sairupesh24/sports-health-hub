import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AdminBookSessionModal } from "@/components/admin/AdminBookSessionModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Clock, 
  Plus, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  Award, 
  BarChart3, 
  Loader2, 
  CalendarDays, 
  FileText, 
  Activity, 
  Filter, 
  Search,
  CalendarCheck
} from "lucide-react";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  Cell, 
  CartesianGrid 
} from "recharts";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface ProfileActivityResponse {
  profile: {
    id: string;
    first_name?: string;
    last_name?: string;
    email: string;
    current_role: string;
    profession?: string;
    ams_role?: string;
    mobile_no?: string;
    uhid?: string;
    is_approved?: boolean;
    user_created_at?: string;
    organization_id?: string;
    gender?: string;
    dob?: string;
  };
  activeTime: {
    todaySeconds: number;
    todayMinutes: number;
    lastPing?: string | null;
    total7dSeconds: number;
    avg7dMinutes: number;
    activeDays7d: number;
    total30dSeconds: number;
    avg30dMinutes: number;
    activeDays30d: number;
    dailyTrend: { date: string; activeMinutes: number }[];
  };
  productivity: {
    sessionsCount: number;
    assessmentsCount: number;
    registrationsCount: number;
  };
}

interface Appointment {
  id: string;
  client_id?: string;
  therapist_id?: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  service_type?: string;
  client_name?: string;
  therapist_name?: string;
  client?: { first_name?: string; last_name?: string };
  therapist?: { first_name?: string; last_name?: string };
}

export default function StaffProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { roles } = useAuth();

  const userRole = roles?.[0] || "admin";
  const isAdminOrFoe = roles?.includes("admin") || roles?.includes("super_admin") || roles?.includes("foe") || roles?.includes("hr_manager");

  const [activeTab, setActiveTab] = useState("overview");
  const [bookModalOpen, setBookModalOpen] = useState(false);

  // Filters for Provided Sessions (Practitioner Schedule)
  const [providerStatusFilter, setProviderStatusFilter] = useState("all");
  const [providerSearch, setProviderSearch] = useState("");

  // Filters for Received Treatments (Staff as Client)
  const [treatmentStatusFilter, setTreatmentStatusFilter] = useState("all");
  const [treatmentSearch, setTreatmentSearch] = useState("");

  // 1. Fetch Staff Profile & Active Time Metrics
  const { data: profileData, isLoading: profileLoading, isError: profileError } = useQuery<ProfileActivityResponse>({
    queryKey: ["staff-profile-activity", id],
    queryFn: async () => {
      if (!id) throw new Error("No staff ID provided");
      return await apiFetch<ProfileActivityResponse>(`/hr/users/${id}/profile-activity`);
    },
    enabled: !!id,
    refetchInterval: 15000,
  });

  // 2. Fetch Sessions Conducted as Provider (Therapist/Practitioner)
  const { data: providerSessions = [], isLoading: providerSessionsLoading } = useQuery<Appointment[]>({
    queryKey: ["staff-provider-sessions", id],
    queryFn: async () => {
      if (!id) return [];
      const res = await apiFetch<Appointment[] | { data: Appointment[] }>(`/appointments?therapist_id=${id}`);
      return Array.isArray(res) ? res : res.data || [];
    },
    enabled: !!id,
  });

  // 3. Fetch Treatments Received as Client (Staff receiving Physio/Rehab/Services)
  const { data: treatmentSessions = [], isLoading: treatmentSessionsLoading } = useQuery<Appointment[]>({
    queryKey: ["staff-treatment-sessions", id],
    queryFn: async () => {
      if (!id) return [];
      const res = await apiFetch<Appointment[] | { data: Appointment[] }>(`/appointments?client_id=${id}`);
      return Array.isArray(res) ? res : res.data || [];
    },
    enabled: !!id,
  });

  const profile = profileData?.profile;
  const activeTime = profileData?.activeTime;
  const productivity = profileData?.productivity;

  const fullName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email : "";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "ST";

  const formattedRole = (profile?.current_role || "Staff Member")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const formatDuration = (mins: number) => {
    if (!mins || mins <= 0) return "0 mins";
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    if (hrs > 0) {
      return `${hrs} hr${hrs > 1 ? 's' : ''} ${m > 0 ? `${m} m` : ''}`.trim();
    }
    return `${m} mins`;
  };

  // Filter provider sessions
  const filteredProviderSessions = providerSessions.filter((s) => {
    const matchesStatus = providerStatusFilter === "all" || s.status.toLowerCase() === providerStatusFilter.toLowerCase();
    const cName = s.client_name || (s.client ? `${s.client.first_name || ''} ${s.client.last_name || ''}`.trim() : '');
    const matchesSearch = !providerSearch.trim() || cName.toLowerCase().includes(providerSearch.toLowerCase()) || (s.service_type || '').toLowerCase().includes(providerSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filter treatment sessions
  const filteredTreatmentSessions = treatmentSessions.filter((s) => {
    const matchesStatus = treatmentStatusFilter === "all" || s.status.toLowerCase() === treatmentStatusFilter.toLowerCase();
    const tName = s.therapist_name || (s.therapist ? `${s.therapist.first_name || ''} ${s.therapist.last_name || ''}`.trim() : '');
    const matchesSearch = !treatmentSearch.trim() || tName.toLowerCase().includes(treatmentSearch.toLowerCase()) || (s.service_type || '').toLowerCase().includes(treatmentSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleBack = () => {
    if (location.pathname.startsWith("/hr")) {
      navigate("/hr/users");
    } else {
      navigate("/admin/users");
    }
  };

  const handleBookingSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["staff-treatment-sessions", id] });
    setBookModalOpen(false);
  };

  return (
    <DashboardLayout role={userRole}>
      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Back Navigation Bar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2 text-xs font-bold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Team Members
          </Button>

          {/* Admin Action: Book Treatment for Staff */}
          {isAdminOrFoe && (
            <Button onClick={() => setBookModalOpen(true)} className="gap-2 text-xs font-bold bg-primary text-primary-foreground shadow-sm rounded-xl">
              <Plus className="w-4 h-4" /> Book Treatment for Staff
            </Button>
          )}
        </div>

        {profileLoading ? (
          <Card className="gradient-card border-border py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading staff profile & session details...</p>
          </Card>
        ) : profileError || !profile ? (
          <Card className="gradient-card border-border p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Staff Member Profile Not Found</h3>
            <p className="text-xs text-muted-foreground">The requested staff profile details could not be retrieved.</p>
            <Button variant="outline" size="sm" onClick={handleBack}>Return to User List</Button>
          </Card>
        ) : (
          <>
            {/* Header Hero Banner Card */}
            <div className="relative bg-slate-900 text-white p-6 sm:p-8 rounded-3xl overflow-hidden shadow-xl border border-slate-800">
              <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
                {/* Initials Avatar */}
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-teal-400 via-emerald-500 to-teal-700 text-white flex items-center justify-center text-3xl font-black shadow-2xl shrink-0 border-2 border-white/20">
                  {initials}
                </div>

                {/* Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{fullName}</h1>
                    {profile.is_approved ? (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-bold gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Account Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs font-bold">
                        Pending Approval
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{profile.email}</span>
                    </div>
                    {profile.mobile_no && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{profile.mobile_no}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant="secondary" className="bg-white/10 text-white border-white/10 text-xs font-bold px-3 py-1">
                      {formattedRole}
                    </Badge>
                    {profile.profession && (
                      <Badge variant="outline" className="border-white/20 text-slate-300 text-xs font-medium">
                        {profile.profession}
                      </Badge>
                    )}
                    {profile.uhid && (
                      <Badge variant="outline" className="border-teal-400/40 text-teal-300 text-xs font-mono font-bold">
                        UHID: {profile.uhid}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-muted/40 p-1 rounded-2xl border border-border flex flex-wrap gap-1">
                <TabsTrigger value="overview" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <User className="w-4 h-4" /> Profile & Active App Time
                </TabsTrigger>
                <TabsTrigger value="provider-schedule" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <CalendarDays className="w-4 h-4" /> Provided Sessions ({providerSessions.length})
                </TabsTrigger>
                <TabsTrigger value="received-treatments" className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  <CalendarCheck className="w-4 h-4" /> Received Treatments ({treatmentSessions.length})
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: Profile Details & Active App Time Analytics */}
              <TabsContent value="overview" className="space-y-6">
                <Card className="gradient-card border-border">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-primary" />
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">Application Usage & Active Time Analytics</h3>
                          <p className="text-xs text-muted-foreground">Real-time console active duration tracked via ISHPO heartbeat</p>
                        </div>
                      </div>
                    </div>

                    {/* 3 Active Time Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* 1. Today's Active Time */}
                      <div className="p-5 bg-gradient-to-br from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/30 rounded-2xl space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 block">
                          Today's Active Time
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-teal-900 dark:text-teal-100 font-mono">
                          {formatDuration(activeTime?.todayMinutes || 0)}
                        </div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {activeTime?.todayMinutes && activeTime.todayMinutes > 0 ? "Active time logged today" : "No activity logged today yet"}
                        </p>
                      </div>

                      {/* 2. Last 7 Days Average */}
                      <div className="p-5 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/30 rounded-2xl space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 block">
                          Last 7 Days (Avg/Day)
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-blue-900 dark:text-blue-100 font-mono">
                          {formatDuration(activeTime?.avg7dMinutes || 0)}
                          <span className="text-xs text-slate-400 font-normal"> /day</span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Total: {formatDuration(Math.round((activeTime?.total7dSeconds || 0) / 60))} ({activeTime?.activeDays7d || 0}/7 days active)
                        </p>
                      </div>

                      {/* 3. Last 30 Days Average */}
                      <div className="p-5 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent border border-purple-500/30 rounded-2xl space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 block">
                          Last 30 Days (Avg/Day)
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-purple-900 dark:text-purple-100 font-mono">
                          {formatDuration(activeTime?.avg30dMinutes || 0)}
                          <span className="text-xs text-slate-400 font-normal"> /day</span>
                        </div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Total: {formatDuration(Math.round((activeTime?.total30dSeconds || 0) / 60))} ({activeTime?.activeDays30d || 0}/30 days active)
                        </p>
                      </div>
                    </div>

                    {/* Live 14-Day Activity Recharts Bar Heatmap */}
                    {activeTime?.dailyTrend && activeTime.dailyTrend.length > 0 && (
                      <div className="p-5 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" /> Past 14 Days Active Time Trend
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" /> Live Tracking
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">Active Minutes / Day</span>
                          </div>
                        </div>

                        <div className="h-56 w-full pt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                              data={activeTime.dailyTrend.map((d, i) => {
                                const dateObj = parseISO(d.date);
                                const mins = d.activeMinutes || 0;
                                const isToday = i === activeTime.dailyTrend.length - 1;
                                return {
                                  dateStr: format(dateObj, "d/M"),
                                  fullDateStr: format(dateObj, "dd MMM yyyy"),
                                  activeMinutes: mins,
                                  formattedTime: formatDuration(mins),
                                  isToday,
                                };
                              })} 
                              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
                              <XAxis 
                                dataKey="dateStr" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                              />
                              <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                tickFormatter={(value) => `${value}m`}
                              />
                              <RechartsTooltip 
                                cursor={{ fill: 'rgba(15, 23, 42, 0.05)' }}
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                      <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-800 space-y-1 text-xs z-50">
                                        <div className="font-bold flex items-center justify-between gap-3 text-slate-300">
                                          <span>{data.fullDateStr}</span>
                                          {data.isToday && (
                                            <span className="text-[9px] font-black uppercase text-teal-400 bg-teal-500/20 px-1.5 py-0.5 rounded border border-teal-500/30">
                                              Today (Live)
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-sm font-black text-teal-300 font-mono">
                                          Active: {data.formattedTime}
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="activeMinutes" radius={[6, 6, 0, 0]} isAnimationActive={true}>
                                {activeTime.dailyTrend.map((entry, index) => {
                                  const isToday = index === activeTime.dailyTrend.length - 1;
                                  const mins = entry.activeMinutes || 0;
                                  return (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={
                                        isToday ? '#0d9488' :
                                        mins > 60 ? '#059669' :
                                        mins > 0 ? '#0284c7' :
                                        '#cbd5e1'
                                      } 
                                    />
                                  );
                                })}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Productivity Summary (Physiotherapists, Sports Physicians, and Sports Scientists only) */}
                    {["physiotherapist", "sports_physician", "sports_scientist", "physician", "doctor"].some(r => 
                      (profile?.current_role || "").toLowerCase().includes(r) ||
                      (profile?.profession || "").toLowerCase().includes(r)
                    ) && (
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-primary" /> Work & Productivity Metrics
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Sessions Conducted</span>
                            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{productivity?.sessionsCount || 0}</p>
                          </div>

                          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Assessments Logged</span>
                            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{productivity?.assessmentsCount || 0}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Account Info Details */}
                    <div className="p-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-primary" /> Account Metadata & System Info
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Registration Date</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {profile.user_created_at ? format(parseISO(profile.user_created_at), "dd MMM yyyy") : "-"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">AMS Access Status</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                            {profile.ams_role || "No AMS Access"}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">User System ID</span>
                          <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate block">
                            {profile.id}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 2: Provided Sessions (Staff as Provider) */}
              <TabsContent value="provider-schedule" className="space-y-4">
                <Card className="gradient-card border-border">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CalendarDays className="w-5 h-5 text-primary" /> Provided Sessions Schedule
                        </CardTitle>
                        <CardDescription>
                          Appointments conducted by {fullName} for clinic clients
                        </CardDescription>
                      </div>

                      {/* Filters */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-48">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input 
                            placeholder="Filter client / service..." 
                            value={providerSearch} 
                            onChange={(e) => setProviderSearch(e.target.value)}
                            className="pl-8 h-8.5 text-xs bg-muted/30"
                          />
                        </div>

                        <Select value={providerStatusFilter} onValueChange={setProviderStatusFilter}>
                          <SelectTrigger className="h-8.5 w-32 text-xs bg-muted/30">
                            <SelectValue placeholder="All Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="Planned">Planned</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Checked In">Checked In</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {providerSessionsLoading ? (
                      <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading sessions conducted by practitioner...
                      </div>
                    ) : filteredProviderSessions.length === 0 ? (
                      <div className="text-center py-12 text-xs text-muted-foreground bg-muted/10 rounded-2xl border border-dashed">
                        No provided sessions found matching filters.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredProviderSessions.map((session) => {
                          const clientName = session.client_name || (session.client ? `${session.client.first_name || ''} ${session.client.last_name || ''}`.trim() : 'Client');

                          return (
                            <div 
                              key={session.id} 
                              className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-primary/40 transition-all"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                                    {format(new Date(session.scheduled_start), "dd MMM yyyy, hh:mm a")}
                                  </span>
                                  <Badge className={cn(
                                    "text-[9px] font-black uppercase px-2 py-0.5 border-none",
                                    session.status === 'Completed' ? 'bg-emerald-500 text-white' :
                                    session.status === 'Planned' ? 'bg-blue-600 text-white' :
                                    session.status === 'Checked In' ? 'bg-purple-600 text-white' :
                                    'bg-slate-500 text-white'
                                  )}>
                                    {session.status}
                                  </Badge>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">Client: {clientName}</span>
                                  <span>Service: <Badge variant="outline" className="font-medium text-[10px] py-0">{session.service_type || 'Performance'}</Badge></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <Button variant="outline" size="sm" className="h-8 text-xs font-bold" onClick={() => navigate(`/admin/clients/${session.client_id}`)}>
                                  View Client
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 3: Received Treatments (Staff as Client receiving Services) */}
              <TabsContent value="received-treatments" className="space-y-4">
                <Card className="gradient-card border-border">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CalendarCheck className="w-5 h-5 text-emerald-500" /> Staff Treatment & Rehabilitation History
                        </CardTitle>
                        <CardDescription>
                          Clinic service offerings (Physio, Rehab, Sports Science) received by {fullName}
                        </CardDescription>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Book Treatment Button */}
                        {isAdminOrFoe && (
                          <Button size="sm" onClick={() => setBookModalOpen(true)} className="h-8.5 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                            <Plus className="w-3.5 h-3.5" /> Book Treatment for Staff
                          </Button>
                        )}

                        <div className="relative w-44">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input 
                            placeholder="Filter therapist / service..." 
                            value={treatmentSearch} 
                            onChange={(e) => setTreatmentSearch(e.target.value)}
                            className="pl-8 h-8.5 text-xs bg-muted/30"
                          />
                        </div>

                        <Select value={treatmentStatusFilter} onValueChange={setTreatmentStatusFilter}>
                          <SelectTrigger className="h-8.5 w-32 text-xs bg-muted/30">
                            <SelectValue placeholder="All Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="Planned">Planned</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Checked In">Checked In</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {treatmentSessionsLoading ? (
                      <div className="py-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading staff treatment history...
                      </div>
                    ) : filteredTreatmentSessions.length === 0 ? (
                      <div className="text-center py-12 text-xs text-muted-foreground bg-muted/10 rounded-2xl border border-dashed space-y-3">
                        <p>No treatment appointments recorded for this staff member yet.</p>
                        {isAdminOrFoe && (
                          <Button size="sm" variant="outline" onClick={() => setBookModalOpen(true)} className="gap-1.5 text-xs font-bold">
                            <Plus className="w-3.5 h-3.5" /> Book First Treatment Session
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredTreatmentSessions.map((session) => {
                          const therapistName = session.therapist_name || (session.therapist ? `${session.therapist.first_name || ''} ${session.therapist.last_name || ''}`.trim() : 'Practitioner');

                          return (
                            <div 
                              key={session.id} 
                              className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-emerald-500/40 transition-all"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                                    {format(new Date(session.scheduled_start), "dd MMM yyyy, hh:mm a")}
                                  </span>
                                  <Badge className={cn(
                                    "text-[9px] font-black uppercase px-2 py-0.5 border-none",
                                    session.status === 'Completed' ? 'bg-emerald-500 text-white' :
                                    session.status === 'Planned' ? 'bg-blue-600 text-white' :
                                    session.status === 'Checked In' ? 'bg-purple-600 text-white' :
                                    'bg-slate-500 text-white'
                                  )}>
                                    {session.status}
                                  </Badge>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">Practitioner: {therapistName}</span>
                                  <span>Service: <Badge variant="outline" className="font-medium text-[10px] py-0">{session.service_type || 'Physiotherapy'}</Badge></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <Badge variant="secondary" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                                  Staff Benefit
                                </Badge>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Book Session Modal pre-selected with staffId as Client */}
        {id && (
          <AdminBookSessionModal
            open={bookModalOpen}
            onOpenChange={setBookModalOpen}
            onSuccess={handleBookingSuccess}
            initialData={{
              clientId: id,
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
