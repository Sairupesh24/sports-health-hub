import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Activity, 
  ArrowLeft, 
  Loader2, 
  ShieldAlert,
  CalendarDays,
  Percent
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";
import { cn } from "@/lib/utils";

export default function ManagerialAnalytics() {
  const { roles, profile } = useAuth();
  const navigate = useNavigate();

  // Date Presets state
  const [preset, setPreset] = useState<"this-month" | "last-month" | "last-30" | "custom">("this-month");
  
  // Custom Date state
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  // Table header filter states
  const [staffSearch, setStaffSearch] = useState("");
  const [professionFilter, setProfessionFilter] = useState("");
  const [utilizationFilter, setUtilizationFilter] = useState<"all" | "high" | "stable" | "under">("all");

  // Calculate actual Date objects based on preset
  const dateRange = useMemo(() => {
    const today = new Date();
    switch (preset) {
      case "this-month":
        return {
          start: format(startOfMonth(today), "yyyy-MM-dd"),
          end: format(endOfMonth(today), "yyyy-MM-dd")
        };
      case "last-month":
        const lastMonth = subMonths(today, 1);
        return {
          start: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
          end: format(endOfMonth(lastMonth), "yyyy-MM-dd")
        };
      case "last-30":
        return {
          start: format(subDays(today, 30), "yyyy-MM-dd"),
          end: format(today, "yyyy-MM-dd")
        };
      case "custom":
      default:
        return {
          start: customStart,
          end: customEnd
        };
    }
  }, [preset, customStart, customEnd]);

  // Auth Guard check: allowed roles OR explicit has_analytics_access flag
  const allowedRoles = ["admin", "manager", "hr_manager"];
  const isAuthorized = roles?.some(r => allowedRoles.includes(r)) || profile?.has_analytics_access === true;

  // Fetch managerial analytics data
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["managerial-analytics", dateRange.start, dateRange.end],
    queryFn: async () => {
      const response = await apiFetch<any>(
        `/api/analytics/managerial-view?startDate=${dateRange.start}&endDate=${dateRange.end}`
      );
      return response;
    },
    enabled: isAuthorized && !!profile?.organization_id,
  });

  // Extract unique professions from the loaded team data
  const professions = useMemo(() => {
    if (!data?.teamData) return [];
    const uniqueProfs = new Set<string>();
    data.teamData.forEach((member: any) => {
      if (member.profession) {
        uniqueProfs.add(member.profession);
      }
    });
    return Array.from(uniqueProfs).sort();
  }, [data?.teamData]);

  // Filtered team data for both chart and table
  const filteredTeamData = useMemo(() => {
    if (!data?.teamData) return [];
    return data.teamData.filter((member: any) => {
      // 1. Staff Member Search (Matches name or email)
      const fullName = `${member.firstName || ""} ${member.lastName || ""}`.toLowerCase();
      const email = (member.email || "").toLowerCase();
      const matchesSearch =
        !staffSearch ||
        fullName.includes(staffSearch.toLowerCase()) ||
        email.includes(staffSearch.toLowerCase());

      // 2. Profession filter
      const matchesProfession =
        !professionFilter ||
        member.profession === professionFilter;

      // 3. Utilization rate filter
      let matchesUtil = true;
      if (utilizationFilter === "high") {
        matchesUtil = member.utilizationRate >= 80;
      } else if (utilizationFilter === "stable") {
        matchesUtil = member.utilizationRate >= 50 && member.utilizationRate < 80;
      } else if (utilizationFilter === "under") {
        matchesUtil = member.utilizationRate < 50;
      }

      return matchesSearch && matchesProfession && matchesUtil;
    });
  }, [data?.teamData, staffSearch, professionFilter, utilizationFilter]);

  if (!isAuthorized) {
    return (
      <DashboardLayout role={roles?.[0] || "client"}>
        <div className="h-[75vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You do not have the required permissions to view the staff scheduling analytics page. Please contact your system administrator if you believe this is an error.
          </p>
          <Button onClick={() => navigate(-1)} variant="outline">
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Helper color for utilization
  const getUtilColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-500 bg-emerald-500/10";
    if (rate >= 50) return "text-primary bg-primary/10";
    if (rate >= 30) return "text-amber-500 bg-amber-500/10";
    return "text-destructive bg-destructive/10";
  };

  const getUtilBarColor = (rate: number) => {
    if (rate >= 80) return "bg-emerald-500";
    if (rate >= 50) return "bg-indigo-500";
    if (rate >= 30) return "bg-amber-500";
    return "bg-rose-500";
  };

  // Recharts color palette
  const CHART_COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#f43f5e"];

  return (
    <DashboardLayout role={roles?.[0] || "admin"}>
      <div className="space-y-6 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-primary" />
              Staff Efficiency Analytics
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Aggregated staff utilization, booked hours, and scheduling metrics.
            </p>
          </div>

          {/* Date range filters */}
          <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm self-start md:self-auto">
            <Button
              variant={preset === "this-month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreset("this-month")}
              className="rounded-xl text-xs font-bold"
            >
              This Month
            </Button>
            <Button
              variant={preset === "last-month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreset("last-month")}
              className="rounded-xl text-xs font-bold"
            >
              Last Month
            </Button>
            <Button
              variant={preset === "last-30" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreset("last-30")}
              className="rounded-xl text-xs font-bold"
            >
              Last 30 Days
            </Button>
            <Button
              variant={preset === "custom" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreset("custom")}
              className="rounded-xl text-xs font-bold"
            >
              Custom
            </Button>
            
            {preset === "custom" && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-100 ml-2 animate-in fade-in duration-300">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-8 text-xs border-slate-200 focus-visible:ring-primary w-32 rounded-xl"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-8 text-xs border-slate-200 focus-visible:ring-primary w-32 rounded-xl"
                />
              </div>
            )}
          </div>
        </div>

        {/* Loading / Error States */}
        {isLoading ? (
          <div className="h-[50vh] flex flex-col items-center justify-center text-muted-foreground font-medium text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            Compiling staff schedule metrics...
          </div>
        ) : isError ? (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl flex gap-3 items-center max-w-2xl mx-auto">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Failed to retrieve analytics</h4>
              <p className="text-xs mt-0.5 opacity-80">{(error as any)?.message || "A network error occurred."}</p>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Avg Utilization Rate */}
              <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Avg Staff Utilization</p>
                      <h3 className="text-3xl font-display font-black text-slate-900">
                        {data?.summary?.avgUtilizationRate}%
                      </h3>
                    </div>
                    <div className={cn("p-2.5 rounded-2xl", getUtilColor(data?.summary?.avgUtilizationRate))}>
                      <Percent className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4 space-y-1">
                    <Progress 
                      value={data?.summary?.avgUtilizationRate} 
                      className="h-1.5 bg-slate-100" 
                      indicatorClassName={getUtilBarColor(data?.summary?.avgUtilizationRate)} 
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground font-semibold uppercase">
                      <span>Working Hours filled by appointments</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Hours Booked */}
              <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Total Booked Hours</p>
                      <h3 className="text-3xl font-display font-black text-slate-900">
                        {data?.summary?.totalHoursBooked} hrs
                      </h3>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-500">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">
                      Combined session duration
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Number of slots booked */}
              <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Slots Filled</p>
                      <h3 className="text-3xl font-display font-black text-slate-900">
                        {data?.summary?.totalSlotsBooked} slots
                      </h3>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-cyan-50 text-cyan-500">
                      <CalendarDays className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">
                      Total appointments scheduled
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Working Days count */}
              <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Working Days</p>
                      <h3 className="text-3xl font-display font-black text-slate-900">
                        {data?.workingDays} days
                      </h3>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-500">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">
                      Standard weekdays in range
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recharts Staff Utilization Comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Chart Panel */}
              <Card className="lg:col-span-2 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-500" />
                    Workload Distribution & Utilization Comparison
                  </CardTitle>
                  <CardDescription>
                    Compare working hours filled across clinical and training staff.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredTeamData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="lastName" 
                          tickFormatter={(val, idx) => `${filteredTeamData[idx]?.firstName?.[0] || ""}. ${val}`}
                          tickLine={false}
                          axisLine={false}
                          className="text-[10px] fill-slate-400 font-bold uppercase" 
                        />
                        <YAxis 
                          tickLine={false}
                          axisLine={false}
                          className="text-[10px] fill-slate-400 font-bold"
                          unit="%"
                        />
                        <ChartTooltip 
                          cursor={{ fill: '#f8fafc' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const item = payload[0].payload;
                              return (
                                <div className="bg-slate-950/95 text-white p-3 rounded-xl text-xs space-y-1.5 shadow-2xl border border-white/10 backdrop-blur-md">
                                  <p className="font-bold">{item.firstName} {item.lastName}</p>
                                  <p className="text-slate-300">{item.profession}</p>
                                  <div className="pt-1.5 border-t border-white/10 space-y-0.5">
                                    <p>Utilization: <span className="text-indigo-400 font-bold">{item.utilizationRate}%</span></p>
                                    <p>Booked Hours: {item.totalHoursBooked} hrs</p>
                                    <p>Shift Hours: {item.totalShiftHours} hrs</p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="utilizationRate" radius={[6, 6, 0, 0]} maxBarSize={45}>
                          {filteredTeamData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Insights panel */}
              <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-500" />
                    Efficiency Summary
                  </CardTitle>
                  <CardDescription>
                    Key scheduler metrics and benchmarks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Benchmarks explanation */}
                  <div className="bg-slate-50 p-4 rounded-2xl text-xs text-slate-600 leading-relaxed border border-slate-100">
                    <span className="font-bold text-slate-700 block mb-1">Efficiency Benchmarks:</span>
                    <ul className="list-disc pl-4 space-y-1 mt-1 font-medium">
                      <li><span className="text-emerald-600 font-bold">&gt;= 80%</span>: Optimum occupancy / High booking</li>
                      <li><span className="text-indigo-600 font-bold">50% - 79%</span>: Stable load / Room for capacity</li>
                      <li><span className="text-rose-500 font-bold">&lt; 50%</span>: Under-utilization or schedule adjustments required</li>
                    </ul>
                  </div>

                  {/* Top Performer */}
                  {data?.teamData && data.teamData.length > 0 && (
                    <div className="space-y-3.5 pt-2">
                      <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Top Utilization</h4>
                      {(() => {
                        const top = [...data.teamData].sort((a, b) => b.utilizationRate - a.utilizationRate)[0];
                        return (
                          <div className="flex items-center justify-between p-4 border rounded-2xl bg-white shadow-sm border-slate-100">
                            <div>
                              <p className="font-bold text-sm text-slate-900">{top.firstName} {top.lastName}</p>
                              <p className="text-xs text-muted-foreground">{top.profession}</p>
                            </div>
                            <Badge className="font-bold font-display" variant="secondary">
                              {top.utilizationRate}% Utilized
                            </Badge>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Detailed Staff list table */}
            <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-lg">Staff Utilization Details</CardTitle>
                <CardDescription>
                  Detailed scheduling breakdown, shift hour configurations, and appointment occupancy by user.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <th className="px-6 py-4">Staff Member</th>
                        <th className="px-6 py-4">Profession</th>
                        <th className="px-6 py-4">Slots Filled</th>
                        <th className="px-6 py-4">Hours Booked</th>
                        <th className="px-6 py-4">Shift Details</th>
                        <th className="px-6 py-4">Total Shift Hrs</th>
                        <th className="px-6 py-4 text-right">Utilization Rate</th>
                      </tr>
                      <tr className="border-b border-slate-100 bg-slate-50/10">
                        <th className="px-6 py-2">
                          <Input
                            placeholder="Filter by name..."
                            value={staffSearch}
                            onChange={(e) => setStaffSearch(e.target.value)}
                            className="h-8 text-xs font-normal bg-white dark:bg-slate-900 border-slate-200/80 rounded-xl max-w-[180px] focus-visible:ring-primary"
                          />
                        </th>
                        <th className="px-6 py-2">
                          <select
                            value={professionFilter}
                            onChange={(e) => setProfessionFilter(e.target.value)}
                            className="h-8 px-2 py-1 text-xs font-normal bg-white dark:bg-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-slate-700 dark:text-slate-200 w-full max-w-[160px]"
                          >
                            <option value="">All Professions</option>
                            {professions.map((prof) => (
                              <option key={prof} value={prof}>
                                {prof}
                              </option>
                            ))}
                          </select>
                        </th>
                        <th className="px-6 py-2"></th>
                        <th className="px-6 py-2"></th>
                        <th className="px-6 py-2"></th>
                        <th className="px-6 py-2"></th>
                        <th className="px-6 py-2 text-right">
                          <div className="flex justify-end">
                            <select
                              value={utilizationFilter}
                              onChange={(e) => setUtilizationFilter(e.target.value as any)}
                              className="h-8 px-2 py-1 text-xs font-normal bg-white dark:bg-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-slate-700 dark:text-slate-200 w-full max-w-[150px]"
                            >
                              <option value="all">All Rates</option>
                              <option value="high">Optimum (≥80%)</option>
                              <option value="stable">Stable (50%-79%)</option>
                              <option value="under">Under-utilized (&lt;50%)</option>
                            </select>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredTeamData.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium bg-slate-50/20">
                            No matching staff members found.
                          </td>
                        </tr>
                      ) : (
                        filteredTeamData.map((member: any) => (
                          <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-bold text-slate-900">{member.firstName} {member.lastName}</div>
                                <div className="text-xs text-slate-400">{member.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-medium">
                              {member.profession}
                            </td>
                            <td className="px-6 py-4 text-slate-900 font-bold">
                              {member.slotsBooked}
                            </td>
                            <td className="px-6 py-4 text-slate-900 font-bold">
                              {member.totalHoursBooked} hrs
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs text-slate-500 font-semibold">
                                {member.shiftStart} - {member.shiftEnd}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                ({member.shiftHoursPerDay} hrs/day)
                              </div>
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-medium">
                              {member.totalShiftHours} hrs
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-3.5">
                                <div className="w-24 hidden sm:block">
                                  <Progress 
                                    value={member.utilizationRate} 
                                    className="h-2 bg-slate-100" 
                                    indicatorClassName={getUtilBarColor(member.utilizationRate)}
                                  />
                                </div>
                                <span className={cn(
                                  "inline-flex px-2.5 py-1 rounded-full text-xs font-bold border",
                                  member.utilizationRate >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                  member.utilizationRate >= 50 ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                                  member.utilizationRate >= 30 ? "bg-amber-50 text-amber-700 border-amber-100" :
                                  "bg-rose-50 text-rose-700 border-rose-100"
                                )}>
                                  {member.utilizationRate}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
