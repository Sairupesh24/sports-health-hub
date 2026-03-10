import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building, Activity, Copy, CheckCircle, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import OrganizationPackages from "./OrganizationPackages";
import OrganizationInjuries from "./OrganizationInjuries";
import OrganizationUsers from "./OrganizationUsers";
import { Users } from "lucide-react";

interface Organization {
    id: string;
    name: string;
    org_code: string;
    slug: string;
    subscription_plan: string;
    status: string;
    created_at: string;
    location_count: number;
    consultant_count: number;
    client_count: number;
}

export default function OrganizationDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [org, setOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (id) fetchOrganization();
    }, [id]);

    const fetchOrganization = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.rpc('get_platform_organizations' as any);
            if (error) throw error;

            const found = (data as unknown as Organization[]).find((o) => o.id === id);
            if (found) {
                setOrg(found);
            } else {
                toast({ title: "Not Found", description: "Organization not found.", variant: "destructive" });
                navigate("/super-admin");
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!id || updating) return;
        try {
            setUpdating(true);
            const { error } = await supabase.rpc('update_organization_status' as any, { p_org_id: id, p_status: newStatus });
            if (error) throw error;

            setOrg(prev => prev ? { ...prev, status: newStatus } : null);
            toast({ title: "Status Updated", description: `Organization is now ${newStatus}.` });
        } catch (err: any) {
            toast({ title: "Update Failed", description: err.message, variant: "destructive" });
        } finally {
            setUpdating(false);
        }
    };

    const handleCopyCode = () => {
        if (org?.org_code) {
            navigator.clipboard.writeText(org.org_code);
            toast({ title: "Code Copied", description: "Organization code copied to clipboard." });
        }
    };

    if (loading) {
        return (
            <DashboardLayout role="super_admin">
                <div className="flex items-center justify-center h-64 text-muted-foreground">Loading details...</div>
            </DashboardLayout>
        );
    }

    if (!org) return null;

    return (
        <DashboardLayout role="super_admin">
            <div className="space-y-6">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/super-admin")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-display font-bold text-foreground">{org.name}</h1>
                            <Badge variant={org.status === 'active' ? 'default' : 'destructive'} className="capitalize">
                                {org.status}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground mt-1">Organization Details & Status Control</p>
                    </div>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="mb-6">
                        <TabsTrigger value="overview" className="flex gap-2 items-center">
                            <Activity className="w-4 h-4" /> Overview
                        </TabsTrigger>
                        <TabsTrigger value="packages" className="flex gap-2 items-center">
                            <Package className="w-4 h-4" /> Service Packages
                        </TabsTrigger>
                        <TabsTrigger value="injuries" className="flex gap-2 items-center">
                            <Activity className="w-4 h-4" /> Injury Master Data
                        </TabsTrigger>
                        <TabsTrigger value="users" className="flex gap-2 items-center">
                            <Users className="w-4 h-4" /> User Onboarding
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="rounded-xl border border-border bg-card p-6">
                                    <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                                        <Building className="w-5 h-5 text-primary" />
                                        General Information
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">Organization ID</p>
                                            <p className="font-mono text-sm">{org.id}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">Created At</p>
                                            <p>{new Date(org.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">URL Slug</p>
                                            <p>{org.slug}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground mb-1">Subscription Plan</p>
                                            <p className="capitalize">{org.subscription_plan}</p>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <p className="text-sm font-medium text-muted-foreground mb-2">Organization Code</p>
                                            <div className="flex items-center gap-3">
                                                <code className="text-lg bg-muted px-4 py-2 rounded-md tracking-widest font-bold text-primary">
                                                    {org.org_code}
                                                </code>
                                                <Button variant="outline" size="sm" onClick={handleCopyCode}>
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Copy Code
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                Distribute this code to independent consultants so they can link their accounts to this organization upon signup.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border bg-card p-6">
                                    <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-primary" />
                                        Usage Metrics
                                    </h3>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-muted/30 p-4 rounded-lg text-center">
                                            <p className="text-3xl font-bold text-foreground">{org.location_count}</p>
                                            <p className="text-sm text-muted-foreground mt-1">Locations</p>
                                        </div>
                                        <div className="bg-muted/30 p-4 rounded-lg text-center">
                                            <p className="text-3xl font-bold text-foreground">{org.consultant_count}</p>
                                            <p className="text-sm text-muted-foreground mt-1">Consultants</p>
                                        </div>
                                        <div className="bg-muted/30 p-4 rounded-lg text-center">
                                            <p className="text-3xl font-bold text-foreground">{org.client_count}</p>
                                            <p className="text-sm text-muted-foreground mt-1">Clients</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="rounded-xl border border-border bg-card p-6">
                                    <h3 className="font-display font-semibold text-lg mb-4">Status Control</h3>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        Disabling an organization will prevent all its users (consultants, admins, clients) from logging in or accessing the APIs.
                                    </p>

                                    <div className="space-y-3">
                                        {org.status !== 'active' && (
                                            <Button
                                                className="w-full bg-success hover:bg-success/90 text-success-foreground"
                                                onClick={() => handleStatusChange('active')}
                                                disabled={updating}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Enable Organization
                                            </Button>
                                        )}

                                        {org.status !== 'disabled' && (
                                            <Button
                                                variant="destructive"
                                                className="w-full"
                                                onClick={() => handleStatusChange('disabled')}
                                                disabled={updating}
                                            >
                                                Disable Organization
                                            </Button>
                                        )}

                                        {org.status !== 'suspended' && (
                                            <Button
                                                variant="outline"
                                                className="w-full border-destructive text-destructive hover:bg-destructive/10"
                                                onClick={() => handleStatusChange('suspended')}
                                                disabled={updating}
                                            >
                                                Suspend (Billing Issue)
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="packages">
                        <OrganizationPackages organizationId={org.id} />
                    </TabsContent>

                    <TabsContent value="injuries">
                        <OrganizationInjuries organizationId={org.id} />
                    </TabsContent>

                    <TabsContent value="users">
                        <OrganizationUsers organizationId={org.id} />
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
