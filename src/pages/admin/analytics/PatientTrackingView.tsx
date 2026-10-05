import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Activity,
  Building2,
  Trophy,
  Dumbbell,
  Compass,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Share2,
  Sparkles,
  Loader2,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Cell
} from "recharts";

interface PatientTrackingData {
  startDate: string;
  endDate: string;
  summary: {
    totalRegistrations: number;
    priorRegistrations: number;
    growthRate: number;
    athletesCount: number;
    athletesPct: number;
    genPopCount: number;
    genPopPct: number;
    organizationsCount: number;
    crossSellRate: number;
    totalActiveClients: number;
    crossSoldClients: number;
  };
  timeline: Array<{
    date: string;
    label: string;
    total: number;
    athletes: number;
    genPop: number;
  }>;
  sports: Array<{
    sport: string;
    count: number;
    percentage: number;
  }>;
  athleteLevels: Array<{
    level: string;
    count: number;
    percentage: number;
  }>;
  ageBuckets: Array<{
    group: string;
    count: number;
    percentage: number;
  }>;
  genderSplit: Array<{
    gender: string;
    count: number;
    percentage: number;
  }>;
  acquisitionChannels: Array<{
    source: string;
    count: number;
    percentage: number;
  }>;
}

interface PatientTrackingViewProps {
  startDate: string;
  endDate: string;
  populationFilter: "all" | "athlete" | "general";
}

const SPORT_COLORS = [
  "#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#14b8a6"
];

export default function PatientTrackingView({
  startDate,
  endDate,
  populationFilter,
}: PatientTrackingViewProps) {
  const [velocityMetric, setVelocityMetric] = useState<"total" | "athletes" | "genPop">("total");

  const { data, isLoading } = useQuery<PatientTrackingData>({
    queryKey: ["analytics-patient-tracking", startDate, endDate, populationFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("startDate", startDate);
      params.append("endDate", endDate);
      params.append("populationFilter", populationFilter);
      const res = await apiFetch<PatientTrackingData>(`/api/analytics/patient-tracking?${params.toString()}`);
      return res;
    },
  });

  const summary = data?.summary;
  const timeline = data?.timeline || [];
  const sports = data?.sports || [];
  const athleteLevels = data?.athleteLevels || [];
  const ageBuckets = data?.ageBuckets || [];
  const genderSplit = data?.genderSplit || [];
  const channels = data?.acquisitionChannels || [];

  const isPositiveGrowth = (summary?.growthRate || 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Top Metric Cards Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: New Registrations */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                New Registrations
              </span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-display text-foreground">
                {summary ? summary.totalRegistrations.toLocaleString() : <Loader2 className="w-5 h-5 animate-spin" />}
              </span>
              {summary && (
                <Badge
                  variant="outline"
                  className={`text-[11px] font-bold gap-1 ${
                    isPositiveGrowth
                      ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                      : "text-rose-600 dark:text-rose-400 border-rose-500/20 bg-rose-500/10"
                  }`}
                >
                  {isPositiveGrowth ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {summary.growthRate > 0 ? `+${summary.growthRate}%` : `${summary.growthRate}%`}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              vs {summary?.priorRegistrations.toLocaleString() || 0} in previous period
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Athletes Ratio */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Athletic Population
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-display text-foreground">
                {summary ? summary.athletesCount.toLocaleString() : <Loader2 className="w-5 h-5 animate-spin" />}
              </span>
              <Badge variant="outline" className="text-[11px] font-bold text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/10">
                {summary?.athletesPct || 0}% of intake
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <span>National, Elite, Club & Academy Athletes</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 3: General Population */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                General Population
              </span>
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-display text-foreground">
                {summary ? summary.genPopCount.toLocaleString() : <Loader2 className="w-5 h-5 animate-spin" />}
              </span>
              <Badge variant="outline" className="text-[11px] font-bold text-teal-600 dark:text-teal-400 border-teal-500/20 bg-teal-500/10">
                {summary?.genPopPct || 0}% of intake
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Rehab, Post-op, Ergonomic & Wellness clients
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Partner Organizations */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Affiliated Organizations
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-display text-foreground">
                {summary ? summary.organizationsCount : <Loader2 className="w-5 h-5 animate-spin" />}
              </span>
              <span className="text-xs text-muted-foreground">sports clubs & corporates</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Active institutional partnerships
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Registration Velocity & Intake Chart */}
      <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <CardTitle className="text-lg font-bold font-display text-foreground flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Registration Velocity & Intake Trend
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Registration volume over time across the selected date range
            </CardDescription>
          </div>

          {/* Metric toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl self-start sm:self-auto">
            <Button
              variant={velocityMetric === "total" ? "default" : "ghost"}
              size="sm"
              onClick={() => setVelocityMetric("total")}
              className="h-7 text-xs rounded-lg font-medium"
            >
              Total Intake
            </Button>
            <Button
              variant={velocityMetric === "athletes" ? "default" : "ghost"}
              size="sm"
              onClick={() => setVelocityMetric("athletes")}
              className="h-7 text-xs rounded-lg font-medium"
            >
              Athletes Only
            </Button>
            <Button
              variant={velocityMetric === "genPop" ? "default" : "ghost"}
              size="sm"
              onClick={() => setVelocityMetric("genPop")}
              className="h-7 text-xs rounded-lg font-medium"
            >
              Gen-Pop Only
            </Button>
          </div>
        </div>

        <div className="h-72 mt-6">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : timeline.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs">
              <Calendar className="w-8 h-8 opacity-30 mb-2" />
              No registrations recorded for this date window
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="athletesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="genPopGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-muted-foreground"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-muted-foreground"
                />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1">
                          <p className="font-bold text-foreground">{item.label}</p>
                          <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                            <span>Total Intake:</span>
                            <strong className="text-primary">{item.total}</strong>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                            <span>Athletes:</span>
                            <strong className="text-amber-500">{item.athletes}</strong>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
                            <span>General Pop:</span>
                            <strong className="text-teal-500">{item.genPop}</strong>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {velocityMetric === "total" && (
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#velocityGrad)"
                  />
                )}
                {velocityMetric === "athletes" && (
                  <Area
                    type="monotone"
                    dataKey="athletes"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#athletesGrad)"
                  />
                )}
                {velocityMetric === "genPop" && (
                  <Area
                    type="monotone"
                    dataKey="genPop"
                    stroke="#14b8a6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#genPopGrad)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Target Population Profiling: Sports & Athlete Levels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Sports Distribution */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold font-display text-foreground flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              Sport-Wise Distribution
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Primary athletic disciplines represented across registered clients
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : sports.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground text-xs">
                <Dumbbell className="w-8 h-8 opacity-30 mb-2" />
                No sport-specific registrations logged
              </div>
            ) : (
              sports.map((s, idx) => {
                const color = SPORT_COLORS[idx % SPORT_COLORS.length];
                const maxCount = Math.max(...sports.map(item => item.count));
                const pct = maxCount > 0 ? Math.round((s.count / maxCount) * 100) : 0;

                return (
                  <div key={s.sport} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                        {s.sport}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{s.count} clients</span>
                        <span className="text-[11px] text-muted-foreground">({s.percentage}%)</span>
                      </div>
                    </div>
                    <Progress value={pct} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right: Athlete Levels & Tiers */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold font-display text-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Athlete Level of Play
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Competitive tier breakdown of registered athletes
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : athleteLevels.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground text-xs">
                <Trophy className="w-8 h-8 opacity-30 mb-2" />
                No athlete tiers classified for this period
              </div>
            ) : (
              athleteLevels.map((lvl) => (
                <div
                  key={lvl.level}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                    <span className="font-semibold text-xs text-foreground">{lvl.level}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                      {lvl.count} athletes
                    </Badge>
                    <span className="text-xs font-semibold text-muted-foreground w-10 text-right">
                      {lvl.percentage}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Demographics & Acquisition Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Age Group Demographics */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold font-display text-foreground flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-primary" />
              Age Demographics Pyramid
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Intake distribution across junior, collegiate, active adult, and senior age brackets
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : ageBuckets.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground text-xs">
                No age distribution data available
              </div>
            ) : (
              ageBuckets.map((bucket) => {
                const maxAgeCount = Math.max(...ageBuckets.map(b => b.count));
                const pct = maxAgeCount > 0 ? Math.round((bucket.count / maxAgeCount) * 100) : 0;

                return (
                  <div key={bucket.group} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{bucket.group}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{bucket.count}</span>
                        <span className="text-[11px] text-muted-foreground">({bucket.percentage}%)</span>
                      </div>
                    </div>
                    <Progress value={pct} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right: Acquisition & Referral Channels */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold font-display text-foreground flex items-center gap-2">
              <Share2 className="w-4 h-4 text-primary" />
              Acquisition & Referral Channels
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Primary intake sources bringing new patients into the clinic
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : channels.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground text-xs">
                No referral source data logged
              </div>
            ) : (
              channels.map((chan) => (
                <div
                  key={chan.source}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <span className="font-semibold text-xs text-foreground line-clamp-1 max-w-[240px]">
                    {chan.source}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                      {chan.count} clients
                    </Badge>
                    <span className="text-xs font-semibold text-muted-foreground w-10 text-right">
                      {chan.percentage}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
