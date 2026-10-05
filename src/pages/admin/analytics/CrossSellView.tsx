import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GitMerge,
  ArrowRight,
  TrendingUp,
  Layers,
  Sparkles,
  Repeat,
  CheckCircle2,
  Activity,
  Users,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Dumbbell,
  Stethoscope,
  Apple
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface CrossSellPair {
  pair: string;
  source: string;
  destination: string;
  clientCount: number;
  percentage: number;
}

interface ServiceDistributionItem {
  service: string;
  sessionsCount: number;
  uniqueClients: number;
}

interface CrossSellClient {
  id: string;
  name: string;
  uhid: string;
  orgName: string;
  services: string[];
  serviceCount: number;
  totalSessions: number;
  lastSession?: string;
}

interface CrossSellData {
  startDate: string;
  endDate: string;
  summary: {
    totalActiveClients: number;
    singleServiceCount: number;
    singleServicePct: number;
    dualServiceCount: number;
    dualServicePct: number;
    multiServiceCount: number;
    multiServicePct: number;
    crossSoldTotal: number;
    crossSellRate: number;
    avgSingleSessions: number;
    avgMultiSessions: number;
    retentionMultiplier: number;
  };
  topPairs: CrossSellPair[];
  serviceDistribution: ServiceDistributionItem[];
  topCrossSellClients: CrossSellClient[];
}

interface CrossSellViewProps {
  startDate: string;
  endDate: string;
}

export default function CrossSellView({ startDate, endDate }: CrossSellViewProps) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<CrossSellData>({
    queryKey: ["analytics-cross-sell", startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("startDate", startDate);
      params.append("endDate", endDate);
      const res = await apiFetch<CrossSellData>(`/api/analytics/cross-sell?${params.toString()}`);
      return res;
    },
  });

  const summary = data?.summary;
  const topPairs = data?.topPairs || [];
  const serviceDistribution = data?.serviceDistribution || [];
  const topClients = data?.topCrossSellClients || [];

  return (
    <div className="space-y-6">
      {/* Top Metric Cards Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Overall Cross-Sell Rate */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Cross-Sell Adoption Rate
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <GitMerge className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-display text-foreground">
                {summary ? `${summary.crossSellRate}%` : <Loader2 className="w-5 h-5 animate-spin" />}
              </span>
              <Badge variant="outline" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 border-indigo-500/20 bg-indigo-500/10">
                {summary ? `${summary.crossSoldTotal} clients` : "..."}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Clients attending $\ge 2$ distinct service lines
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Retention / Visit Multiplier */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Care Retention Multiplier
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Repeat className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-display text-emerald-600 dark:text-emerald-400">
                {summary ? `${summary.retentionMultiplier}x` : <Loader2 className="w-5 h-5 animate-spin" />}
              </span>
              <span className="text-xs font-medium text-muted-foreground">more sessions</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Cross-sold clients attend {summary?.avgMultiSessions || 0} vs {summary?.avgSingleSessions || 0} sessions
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Dual-Discipline Clients */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Dual Discipline Stack
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-display text-foreground">
                {summary ? summary.dualServiceCount : <Loader2 className="w-5 h-5 animate-spin" />}
              </span>
              <Badge variant="outline" className="text-[11px] font-bold text-sky-600 dark:text-sky-400 border-sky-500/20 bg-sky-500/10">
                {summary?.dualServicePct || 0}% share
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              e.g., Physiotherapy + Strength & Conditioning
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Multi-Discipline (3+ Services) */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Comprehensive Care (3+ Services)
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-display text-foreground">
                {summary ? summary.multiServiceCount : <Loader2 className="w-5 h-5 animate-spin" />}
              </span>
              <Badge variant="outline" className="text-[11px] font-bold text-rose-600 dark:text-rose-400 border-rose-500/20 bg-rose-500/10">
                {summary?.multiServicePct || 0}% share
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Full performance & rehab stack adoption
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Discipline Adoption Distribution Bar */}
      <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Multi-Disciplinary Adoption Stack</h3>
            <p className="text-xs text-muted-foreground">Distribution of active client base across service breadth</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-400"></span>
              <span>1 Discipline ({summary?.singleServicePct || 0}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-indigo-500"></span>
              <span>2 Disciplines ({summary?.dualServicePct || 0}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500"></span>
              <span>3+ Disciplines ({summary?.multiServicePct || 0}%)</span>
            </div>
          </div>
        </div>

        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div
            style={{ width: `${summary?.singleServicePct || 0}%` }}
            className="bg-slate-400 transition-all duration-500"
            title={`Single Service: ${summary?.singleServiceCount || 0} clients`}
          />
          <div
            style={{ width: `${summary?.dualServicePct || 0}%` }}
            className="bg-indigo-500 transition-all duration-500"
            title={`Dual Services: ${summary?.dualServiceCount || 0} clients`}
          />
          <div
            style={{ width: `${summary?.multiServicePct || 0}%` }}
            className="bg-rose-500 transition-all duration-500"
            title={`3+ Services: ${summary?.multiServiceCount || 0} clients`}
          />
        </div>
      </Card>

      {/* Top Cross-Sell Transition Pathways */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Cross-Sell Conversion Pairs */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold font-display text-foreground flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-primary" />
              High-Velocity Cross-Sell Pathways
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Most common inter-disciplinary service combinations chosen by clients
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : topPairs.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground">
                <GitMerge className="w-8 h-8 opacity-30 mb-2" />
                <p className="text-xs">No cross-sell pairs logged for this period</p>
              </div>
            ) : (
              topPairs.map((pair, idx) => (
                <div
                  key={pair.pair}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">{pair.source}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-xs text-primary">{pair.destination}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                      {pair.clientCount} clients
                    </Badge>
                    <span className="text-xs font-semibold text-muted-foreground w-12 text-right">
                      {pair.percentage}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Service Volume Breakdown */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold font-display text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Service Line Activity Breakdown
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Total sessions and client reach per clinical / performance discipline
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : serviceDistribution.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground">
                <Activity className="w-8 h-8 opacity-30 mb-2" />
                <p className="text-xs">No service sessions recorded</p>
              </div>
            ) : (
              serviceDistribution.map((item) => {
                const maxSessions = Math.max(...serviceDistribution.map(s => s.sessionsCount));
                const pct = maxSessions > 0 ? Math.round((item.sessionsCount / maxSessions) * 100) : 0;

                return (
                  <div key={item.service} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        {item.service}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{item.sessionsCount} sessions</span>
                        <span className="text-[11px] text-muted-foreground">({item.uniqueClients} clients)</span>
                      </div>
                    </div>
                    <Progress value={pct} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cross-Sold Clients Directory Table */}
      <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold font-display text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Multi-Disciplinary Client Directory
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Active clients who have adopted two or more specialized services
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 font-bold">
              {topClients.length} Featured Cross-Sold Clients
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : topClients.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground p-6">
              <Users className="w-8 h-8 opacity-30 mb-2" />
              <p className="text-xs">No multi-service clients found for this period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70 dark:bg-slate-800/40">
                  <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-foreground">Client Name & UHID</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground">Organization</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground">Adopted Disciplines</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground text-center">Total Sessions</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <TableCell className="py-3">
                        <div className="font-semibold text-sm text-foreground">{client.name}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">{client.uhid}</div>
                      </TableCell>

                      <TableCell className="py-3 text-xs text-muted-foreground">
                        {client.orgName || "Individual"}
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {client.services.map((srv) => (
                            <Badge
                              key={srv}
                              variant="secondary"
                              className="text-[10px] font-medium bg-primary/10 text-primary border-none"
                            >
                              {srv}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell className="py-3 text-center">
                        <Badge
                          variant="outline"
                          className="text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        >
                          {client.totalSessions} sessions
                        </Badge>
                      </TableCell>

                      <TableCell className="py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-lg gap-1"
                          onClick={() => navigate(`/admin/clients/${client.id}`)}
                        >
                          <span>Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
