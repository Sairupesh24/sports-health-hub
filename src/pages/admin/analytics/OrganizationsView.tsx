import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Building2,
  Users,
  Search,
  Activity,
  Calendar,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  Award,
  Layers,
  ExternalLink,
  Loader2,
  Briefcase
} from "lucide-react";
import OrganizationRosterModal from "./OrganizationRosterModal";

interface OrganizationMetric {
  name: string;
  totalClients: number;
  activeClientsInPeriod: number;
  totalSessions: number;
  athletesCount: number;
  genPopCount: number;
  dominantService: string;
}

interface OrganizationsData {
  startDate: string;
  endDate: string;
  summary: {
    totalOrganizations: number;
    institutionalClients: number;
    individualClients: number;
    institutionalPct: number;
    topOrganization: string;
  };
  organizations: OrganizationMetric[];
}

interface OrganizationsViewProps {
  startDate: string;
  endDate: string;
}

export default function OrganizationsView({ startDate, endDate }: OrganizationsViewProps) {
  const [search, setSearch] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<OrganizationsData>({
    queryKey: ["analytics-organizations", startDate, endDate, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("startDate", startDate);
      params.append("endDate", endDate);
      if (search) params.append("search", search);
      const res = await apiFetch<OrganizationsData>(`/api/analytics/organizations?${params.toString()}`);
      return res;
    },
  });

  const summary = data?.summary;
  const organizations = data?.organizations || [];
  const maxClients = organizations.length > 0 ? Math.max(...organizations.map(o => o.totalClients)) : 100;

  return (
    <div className="space-y-6">
      {/* KPI Cards Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Organizations */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Partner Organizations
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-display text-foreground">
                {summary ? summary.totalOrganizations : <Loader2 className="w-5 h-5 animate-spin" />}
              </span>
              <span className="text-xs text-muted-foreground">affiliated accounts</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              Active institutional tie-ups
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Institutional Clients */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Institutional Roster
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-display text-foreground">
                {summary ? summary.institutionalClients.toLocaleString() : <Loader2 className="w-5 h-5 animate-spin" />}
              </span>
              <Badge variant="outline" className="text-[11px] font-bold text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-500/10">
                {summary?.institutionalPct || 0}% of all clients
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              vs {summary?.individualClients.toLocaleString() || 0} direct individual clients
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Top Contributing Partner */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Top Partner Account
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-base font-bold text-foreground line-clamp-1">
                {summary?.topOrganization || "N/A"}
              </span>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Highest athlete enrollment
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Active Utilization */}
        <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Institutional Usage
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-display text-foreground">
                {organizations.reduce((acc, o) => acc + o.totalSessions, 0)}
              </span>
              <span className="text-xs text-muted-foreground">sessions in period</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Across {organizations.reduce((acc, o) => acc + o.activeClientsInPeriod, 0)} active partner clients
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Organizations Directory Card */}
      <Card className="rounded-2xl border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                Institutional Accounts & Partner Directory
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Breakdown of affiliated sports academies, clubs, associations, and corporate wellness tie-ups.
              </CardDescription>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search organizations..."
                className="pl-9 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Loading institutional analytics...</p>
            </div>
          ) : organizations.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-center p-6 text-muted-foreground">
              <Building2 className="w-10 h-10 opacity-30" />
              <p className="text-sm font-medium text-foreground">No partner organizations found</p>
              <p className="text-xs max-w-sm">No organizations match your search or date criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/70 dark:bg-slate-800/40">
                  <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-foreground">Organization Name</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground">Enrolled Clients</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground">Active Usage in Period</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground">Dominant Discipline</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground">Client Mix</TableHead>
                    <TableHead className="text-xs font-semibold text-foreground text-right">Roster</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org, index) => {
                    const pctOfMax = Math.round((org.totalClients / maxClients) * 100);
                    const isTop = index === 0;

                    return (
                      <TableRow
                        key={org.name}
                        className="border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Organization Name */}
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                              {org.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-foreground flex items-center gap-2">
                                {org.name}
                                {isTop && (
                                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0">
                                    Top Partner
                                  </Badge>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                <span>{org.athletesCount > 0 ? "Sports Organization" : "Corporate / Community"}</span>
                                <span>•</span>
                                <span>{org.activeClientsInPeriod} active this period</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Enrolled Clients with Volume Bar */}
                        <TableCell className="py-4 w-48">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-foreground">{org.totalClients}</span>
                              <span className="text-[10px] text-muted-foreground">{pctOfMax}% volume</span>
                            </div>
                            <Progress value={pctOfMax} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
                          </div>
                        </TableCell>

                        {/* Active Usage */}
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-xs font-bold ${
                                org.totalSessions > 0
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                  : "bg-slate-100 text-slate-400 border-slate-200"
                              }`}
                            >
                              {org.totalSessions} sessions
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ({org.activeClientsInPeriod} clients)
                            </span>
                          </div>
                        </TableCell>

                        {/* Dominant Discipline */}
                        <TableCell className="py-4">
                          <Badge
                            variant="secondary"
                            className="text-xs font-medium bg-primary/10 text-primary border-none"
                          >
                            {org.dominantService}
                          </Badge>
                        </TableCell>

                        {/* Client Mix: Athletes vs GenPop */}
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {org.athletesCount} Athletes
                            </span>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-muted-foreground">
                              {org.genPopCount} Gen-Pop
                            </span>
                          </div>
                        </TableCell>

                        {/* Action: View Roster */}
                        <TableCell className="py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrg(org.name)}
                            className="rounded-xl text-xs gap-1.5 h-8 hover:border-primary hover:text-primary transition-all shadow-sm"
                          >
                            <span>View Roster</span>
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Organization Roster Modal */}
      <OrganizationRosterModal
        isOpen={!!selectedOrg}
        onClose={() => setSelectedOrg(null)}
        orgName={selectedOrg}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}
