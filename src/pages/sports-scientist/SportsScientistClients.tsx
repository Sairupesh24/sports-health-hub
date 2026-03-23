import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Search, Users, Calendar, Activity, Filter } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function SportsScientistClients() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [search, setSearch] = useState("");
    const [populationFilter, setPopulationFilter] = useState("all");
    const [orgFilter, setOrgFilter] = useState("all");

    // Fetch unique organizations/academies for the filter
    const { data: organizations } = useQuery({
        queryKey: ["client-organizations", user?.id],
        queryFn: async () => {
            if (!user) return [];
            const { data: profile } = await supabase
                .from("profiles")
                .select("organization_id")
                .eq("id", user.id)
                .single();
            if (!profile) return [];

            const { data, error } = await supabase
                .from("clients")
                .select("org_name")
                .eq("organization_id", profile.organization_id)
                .is("deleted_at", null)
                .not("org_name", "is", null);
            
            if (error) throw error;
            const uniqueOrgs = Array.from(new Set(data.map(d => d.org_name))).sort();
            return uniqueOrgs;
        },
        enabled: !!user
    });

    const { data: clients, isLoading } = useQuery({
        queryKey: ["sports-scientist-clients", search, populationFilter, orgFilter, user?.id],
        queryFn: async () => {
            if (!user) return [];
            
            // Fetch clients assigned to this scientist OR unassigned in the same org
            // First get the scientist's profile to know their organization_id
            const { data: profile } = await supabase
                .from("profiles")
                .select("organization_id")
                .eq("id", user.id)
                .single();

            if (!profile) return [];

            let query = supabase
                .from("clients")
                .select(`
                    *,
                    sessions:sessions(count),
                    last_session:sessions(scheduled_start)
                `)
                .eq("organization_id", profile.organization_id)
                .is("deleted_at", null);

            // Visibility rules: own assigned clients OR unassigned clients
            query = query.or(`primary_scientist_id.eq.${user.id},primary_scientist_id.is.null`);

            if (search.trim()) {
                query = query.or(
                    `first_name.ilike.%${search}%,last_name.ilike.%${search}%,uhid.ilike.%${search}%,sport.ilike.%${search}%`
                );
            }

            if (populationFilter === "athlete") {
                query = query.not("sport", "is", null);
            } else if (populationFilter === "general") {
                query = query.is("sport", null);
            }

            if (orgFilter !== "all") {
                query = query.eq("org_name", orgFilter);
            }

            const { data, error } = await query.order("last_name", { ascending: true }).limit(100);
            if (error) throw error;

            // Post-process to get last session date and counts
            // Note: Supabase count/select might need optimization for large datasets
            return data.map(c => ({
                ...c,
                total_sessions: c.sessions?.[0]?.count || 0,
                last_session_date: c.last_session?.sort((a: any, b: any) => 
                    new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime()
                )?.[0]?.scheduled_start || null
            }));
        },
        enabled: !!user
    });

    return (
        <DashboardLayout role="sports_scientist">
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground">My Clients</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage athletes and track their performance sessions</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="gradient-card border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Athletes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{clients?.length || 0}</div>
                        </CardContent>
                    </Card>
                    <Card className="gradient-card border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Sessions This Week</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">--</div>
                        </CardContent>
                    </Card>
                    <Card className="gradient-card border-border">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Active Today</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">--</div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="gradient-card border-border">
                    <CardHeader className="pb-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Athlete Directory
                            </CardTitle>
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Select value={populationFilter} onValueChange={setPopulationFilter}>
                                        <SelectTrigger className="w-full sm:w-[160px] bg-muted/30 border-border">
                                            <SelectValue placeholder="Population" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Population</SelectItem>
                                            <SelectItem value="athlete">Athletes Only</SelectItem>
                                            <SelectItem value="general">General Population</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select value={orgFilter} onValueChange={setOrgFilter}>
                                        <SelectTrigger className="w-full sm:w-[200px] bg-muted/30 border-border">
                                            <SelectValue placeholder="Organization" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Organizations</SelectItem>
                                            {organizations?.map(org => (
                                                <SelectItem key={org} value={org!}>{org}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="relative w-full sm:w-80">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name, UHID, or sport..."
                                        className="pl-9 bg-muted/30 border-border"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="text-center py-12 text-muted-foreground">Loading athletes...</div>
                        ) : !clients?.length ? (
                            <div className="text-center py-12 space-y-3">
                                <Users className="w-10 h-10 mx-auto text-muted-foreground/40" />
                                <p className="text-muted-foreground">No athletes found matching your search</p>
                            </div>
                        ) : (
                            <div className="rounded-lg border border-border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead>Athlete Name</TableHead>
                                            <TableHead>Sport</TableHead>
                                            <TableHead>Organization/Academy</TableHead>
                                            <TableHead>Last Session</TableHead>
                                            <TableHead className="text-center">Total Sessions</TableHead>
                                            <TableHead className="text-right">Analytics</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {clients.map((c) => (
                                            <TableRow
                                                key={c.id}
                                                className="hover:bg-muted/20"
                                            >
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span>{[c.honorific, c.first_name, c.last_name].filter(Boolean).join(" ")}</span>
                                                        <span className="text-xs text-muted-foreground font-mono">{c.uhid}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{c.sport || "—"}</TableCell>
                                                <TableCell>{c.org_name || "—"}</TableCell>
                                                <TableCell>
                                                    {c.last_session_date ? new Date(c.last_session_date).toLocaleDateString() : "No sessions"}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                        {c.total_sessions}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => navigate(`/sports-scientist/analytics?client=${c.id}`)}
                                                            className="h-8 w-8 p-0"
                                                            title="View Analytics"
                                                        >
                                                            <Activity className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => navigate(`/sports-scientist/schedule?client=${c.id}`)}
                                                            className="h-8 w-8 p-0"
                                                            title="Schedule Session"
                                                        >
                                                            <Calendar className="w-4 h-4" />
                                                        </Button>
                                                    </div>
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
        </DashboardLayout>
    );
}
