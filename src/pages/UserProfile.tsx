import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Mail, 
  Phone, 
  Clock, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  Award, 
  BarChart3,
  Loader2
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

export default function UserProfile() {
  const { profile: authProfile, roles } = useAuth();
  const userId = authProfile?.id;

  const { data, isLoading, isError, error } = useQuery<ProfileActivityResponse>({
    queryKey: ["my-user-profile-activity", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User not authenticated");
      return await apiFetch<ProfileActivityResponse>(`/hr/users/${userId}/profile-activity`);
    },
    enabled: !!userId,
    refetchInterval: 15000,
  });

  const formatDuration = (mins: number) => {
    if (!mins || mins <= 0) return "0 mins";
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    if (hrs > 0) {
      return `${hrs} hr${hrs > 1 ? 's' : ''} ${m > 0 ? `${m} m` : ''}`.trim();
    }
    return `${m} mins`;
  };

  const userRole = roles?.[0] || "user";
  const userProfile: any = data?.profile || authProfile;
  const activeTime = data?.activeTime;
  const productivity = data?.productivity;

  const fullName = userProfile ? [userProfile.first_name, userProfile.last_name].filter(Boolean).join(" ") || userProfile.email : "";
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "US";

  const formattedRole = (userProfile?.current_role || userRole)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <DashboardLayout role={userRole}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <User className="w-6 h-6 text-primary" /> User Profile & Activity Center
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              View account credentials and application active time statistics
            </p>
          </div>
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1 font-bold">
            ISHPO Console Active
          </Badge>
        </div>

        {isLoading ? (
          <Card className="gradient-card border-border py-20 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Loading profile & application usage stats...</p>
          </Card>
        ) : isError ? (
          <Card className="gradient-card border-border p-8 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Unable to load active time analytics</h3>
            <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : "Error fetching profile activity"}</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Hero Profile Banner Card */}
            <div className="relative bg-slate-900 text-white p-6 sm:p-8 rounded-3xl overflow-hidden shadow-xl border border-slate-800">
              <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
                {/* Initials Avatar */}
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-teal-400 via-emerald-500 to-teal-700 text-white flex items-center justify-center text-3xl font-black shadow-2xl shrink-0 border-2 border-white/20">
                  {initials}
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{fullName}</h2>
                    {userProfile?.is_approved ? (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-bold gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Account Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs font-bold">
                        Pending Access Approval
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>{userProfile?.email}</span>
                    </div>
                    {userProfile?.mobile_no && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{userProfile.mobile_no}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant="secondary" className="bg-white/10 text-white border-white/10 text-xs font-bold px-3 py-1">
                      {formattedRole}
                    </Badge>
                    {userProfile?.profession && (
                      <Badge variant="outline" className="border-white/20 text-slate-300 text-xs font-medium">
                        {userProfile.profession}
                      </Badge>
                    )}
                    {userProfile?.uhid && (
                      <Badge variant="outline" className="border-teal-400/40 text-teal-300 text-xs font-mono font-bold">
                        UHID: {userProfile.uhid}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Time Analytics Header */}
            <Card className="gradient-card border-border">
              <CardContent className="p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">Application Usage & Active Time Analytics</h3>
                      <p className="text-xs text-muted-foreground">Monitored in real-time while logged in to the application</p>
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
                  (userProfile?.current_role || "").toLowerCase().includes(r) ||
                  (userProfile?.profession || "").toLowerCase().includes(r)
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
                        {userProfile?.user_created_at ? format(parseISO(userProfile.user_created_at), "dd MMM yyyy") : "-"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">AMS Access Status</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        {userProfile?.ams_role || "No AMS Access"}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">User System ID</span>
                      <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate block">
                        {userProfile?.id}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
