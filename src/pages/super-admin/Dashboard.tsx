import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { Users, Building, Activity, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type OrgMetrics = Database['public']['Functions']['get_platform_metrics']['Returns'];
type Organization = Database['public']['Functions']['get_platform_organizations']['Returns'][number];

export default function SuperAdminDashboard() {
    const [metrics, setMetrics] = useState<OrgMetrics | null>(null);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: metricsData, error: metricsErr } = await supabase.rpc('get_platform_metrics');
            if (metricsErr) throw metricsErr;

            const { data: orgsData, error: orgsErr } = await supabase.rpc('get_platform_organizations');
            if (orgsErr) throw orgsErr;

            setMetrics(metricsData);
            setOrganizations(orgsData || []);
        } catch (err: unknown) {
            const error = err as Error;
            toast({ title: "Error fetching data", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const stats = [
        { title: "Total Organizations", value: metrics?.total_organizations || 0, icon: Building, change: "All time", changeType: "neutral" as const },
        { title: "Active Organizations", value: metrics?.active_organizations || 0, icon: Activity, change: "Currently active", changeType: "positive" as const },
        { title: "Disabled/Suspended", value: metrics?.disabled_organizations || 0, icon: AlertTriangle, change: "Requires review", changeType: "neutral" as const },
        { title: "Total Consultants", value: metrics?.total_consultants || 0, icon: Users, change: "Across all orgs", changeType: "positive" as const },
    ];

    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        toast({ title: "Code Copied", description: "Organization code copied to clipboard." });
    };

    return (
        <DashboardLayout role="super_admin">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-display font-bold text-foreground">Platform Master Console</h1>
                        <p className="text-muted-foreground mt-1">Centralized visibility over all tenant organizations</p>
                    </div>
                    <Button asChild className="gradient-primary">
                        <Link to="/super-admin/organizations/new">
                            <Plus className="w-4 h-4 mr-2" />
                            Onboard Organization
                        </Link>
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat) => (
                        <StatCard key={stat.title} {...stat} className="animate-fade-in" />
                    ))}
                </div>

                {/* Organizations Table */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="p-4 border-b border-border bg-muted/20">
                        <h3 className="font-display font-semibold text-card-foreground">Organizations</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Organization Details</TableHead>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Locations</TableHead>
                                    <TableHead>Users</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            Loading organizations...
                                        </TableCell>
                                    </TableRow>
                                ) : organizations.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            No organizations found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    organizations.map((org) => (
                                        <TableRow key={org.id}>
                                            <TableCell>
                                                <p className="font-medium">{org.name}</p>
                                                <p className="text-xs text-muted-foreground mt-1">ID: {org.id.split('-')[0]}...</p>
                                            </TableCell>
                                            <TableCell>
                                                <div
                                                    className="flex items-center gap-2 cursor-pointer group"
                                                    onClick={() => handleCopyCode(org.org_code)}
                                                >
                                                    <code className="bg-muted px-2 py-1 rounded text-xs font-semibold tracking-wider text-primary">
                                                        {org.org_code}
                                                    </code>
                                                </div>
                                            </TableCell>
                                            <TableCell className="capitalize">{org.subscription_plan}</TableCell>
                                            <TableCell>{org.location_count}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span>{org.consultant_count} Consultants</span>
                                                    <span className="text-xs text-muted-foreground">{org.client_count} Clients</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={org.status === 'active' ? 'default' : 'destructive'} className="capitalize">
                                                    {org.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" asChild>
                                                    <Link to={`/super-admin/organizations/${org.id}`}>View Details</Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
