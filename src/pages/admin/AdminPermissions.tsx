import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    ShieldCheck, 
    ArrowLeft, 
    Search, 
    Users, 
    RefreshCw, 
    Calendar,
    Check,
    AlertCircle,
    UserCheck,
    Lock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface StaffUser {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    current_role: string;
    profession?: string | null;
    avatar_url?: string | null;
    has_calendar_access: boolean;
    has_analytics_access: boolean;
    has_assign_work_access: boolean;
}

export default function AdminPermissions() {
    const navigate = useNavigate();
    const { profile: currentAuthProfile, refreshAuth } = useAuth();
    const [users, setUsers] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"all" | "clinical" | "admin">("all");
    const [togglingId, setTogglingId] = useState<string | null>(null);

    useEffect(() => {
        fetchStaffUsers();
    }, []);

    const fetchStaffUsers = async () => {
        try {
            setLoading(true);
            const response = await apiFetch<{ data: any[] }>("/hr/users");
            const allUsers = response.data || [];
            
            // Filter only staff members (exclude athletes, general users, and super admins)
            const staff = allUsers
                .filter((u: any) => 
                    u.current_role !== "athlete" && 
                    u.current_role !== "client" && 
                    u.current_role !== "user" &&
                    u.current_role !== "super_admin"
                )
                .map((u: any) => ({
                    id: u.id,
                    first_name: u.first_name,
                    last_name: u.last_name,
                    email: u.email,
                    current_role: u.current_role,
                    profession: u.profession,
                    avatar_url: u.avatar_url,
                    has_calendar_access: !!u.has_calendar_access,
                    has_analytics_access: !!u.has_analytics_access,
                    has_assign_work_access: !!u.has_assign_work_access
                }));

            setUsers(staff);
        } catch (error: any) {
            toast({
                title: "Error fetching staff directory",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleToggleCalendarAccess = async (userId: string, currentVal: boolean) => {
        try {
            setTogglingId(userId);
            const targetVal = !currentVal;

            await apiFetch(`/hr/users/${userId}/role`, {
                method: "PATCH",
                data: {
                    has_calendar_access: targetVal
                }
            });

            setUsers(prev => 
                prev.map(u => u.id === userId ? { ...u, has_calendar_access: targetVal } : u)
            );

            if (userId === currentAuthProfile?.id) {
                await refreshAuth();
            }

            toast({
                title: "Permission Updated",
                description: `Admin Calendar access has been successfully ${targetVal ? 'granted' : 'revoked'}.`,
                variant: "default"
            });
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setTogglingId(null);
        }
    };

    const handleToggleAnalyticsAccess = async (userId: string, currentVal: boolean) => {
        try {
            setTogglingId(userId);
            const targetVal = !currentVal;

            await apiFetch(`/hr/users/${userId}/role`, {
                method: "PATCH",
                data: {
                    has_analytics_access: targetVal
                }
            });

            setUsers(prev => 
                prev.map(u => u.id === userId ? { ...u, has_analytics_access: targetVal } : u)
            );

            if (userId === currentAuthProfile?.id) {
                await refreshAuth();
            }

            toast({
                title: "Permission Updated",
                description: `Managerial Analytics access has been successfully ${targetVal ? 'granted' : 'revoked'}.`,
                variant: "default"
            });
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setTogglingId(null);
        }
    };

    const handleToggleAssignWorkAccess = async (userId: string, currentVal: boolean) => {
        try {
            setTogglingId(userId);
            const targetVal = !currentVal;

            await apiFetch(`/hr/users/${userId}/role`, {
                method: "PATCH",
                data: {
                    has_assign_work_access: targetVal
                }
            });

            setUsers(prev => 
                prev.map(u => u.id === userId ? { ...u, has_assign_work_access: targetVal } : u)
            );

            toast({
                title: "Permission Updated",
                description: `Assign Work access has been successfully ${targetVal ? 'granted' : 'revoked'}.`,
                variant: "default"
            });
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setTogglingId(null);
        }
    };

    // Helper to format roles nicely
    const formatRole = (role: string, profession?: string | null) => {
        if (role === "admin") return "Admin";
        if (role === "foe") return "Front Office Executive";
        if (role === "hr_manager") return "HR Manager";
        if (role === "manager") return "Manager";
        
        // Return profession if present, otherwise format the system role
        if (profession) return profession;
        return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    // Filter staff members based on search and tab selections
    const filteredUsers = users.filter(user => {
        const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
        const email = user.email.toLowerCase();
        const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        const clinicalRoles = ["consultant", "sports_physician", "physiotherapist", "nutritionist", "sports_scientist", "massage_therapist"];
        const adminRoles = ["admin", "foe", "hr_manager", "manager"];

        if (activeTab === "clinical") {
            return clinicalRoles.includes(user.current_role);
        }
        if (activeTab === "admin") {
            return adminRoles.includes(user.current_role);
        }
        return true;
    });

    return (
        <DashboardLayout role="admin">
            <div className="max-w-5xl mx-auto space-y-6 pb-10 fade-in animate-in duration-300">
                {/* Back Link */}
                <button
                    onClick={() => navigate("/admin/settings")}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary transition-colors mb-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Settings
                </button>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-primary" />
                            Roles & Module Access Control
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Manage access permissions and control which staff members can access specific consoles, calendars, analytics, and administrative features.
                        </p>
                    </div>
                </div>

                {/* Filters card */}
                <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden bg-white">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Search bar */}
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder="Search staff by name or email..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 rounded-2xl border-slate-200 focus-visible:ring-primary h-11 text-sm"
                                />
                            </div>

                            {/* Tab Filters */}
                            <div className="flex bg-slate-100 p-1.5 rounded-2xl space-x-1 shrink-0 self-start md:self-auto">
                                <button
                                    onClick={() => setActiveTab("all")}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                        activeTab === "all" 
                                            ? "bg-white text-slate-900 shadow-sm" 
                                            : "text-slate-500 hover:text-slate-900"
                                    )}
                                >
                                    All Staff
                                </button>
                                <button
                                    onClick={() => setActiveTab("clinical")}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                        activeTab === "clinical" 
                                            ? "bg-white text-slate-900 shadow-sm" 
                                            : "text-slate-500 hover:text-slate-900"
                                    )}
                                >
                                    Clinical Staff
                                </button>
                                <button
                                    onClick={() => setActiveTab("admin")}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                                        activeTab === "admin" 
                                            ? "bg-white text-slate-900 shadow-sm" 
                                            : "text-slate-500 hover:text-slate-900"
                                    )}
                                >
                                    Admin / Front Desk
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Staff list card */}
                <div className="rounded-3xl border border-border/50 bg-card overflow-hidden shadow-sm bg-white">
                    <div className="px-6 py-4 border-b border-border/50 bg-muted/20">
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Staff Permissions Directory
                        </h2>
                    </div>

                    {loading ? (
                        <div className="text-center py-16 text-muted-foreground font-medium text-xs">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50 text-primary" />
                            Retrieving staff profiles and access states...
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="flex flex-col items-center justify-center text-muted-foreground px-4">
                                <AlertCircle className="w-10 h-10 mb-2 opacity-20 text-slate-500" />
                                <p className="text-sm font-bold text-slate-700">No Staff Members Found</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-md">
                                    {searchQuery ? "No staff matches your search query." : "No staff members matching this category are currently approved in your organization."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredUsers.map((user) => {
                                const isUserAdmin = user.current_role === "admin";
                                return (
                                    <div 
                                        key={user.id} 
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-slate-50/50 transition-colors gap-4"
                                    >
                                        {/* Staff Info */}
                                        <div className="flex items-center gap-4">
                                            {user.avatar_url ? (
                                                <img 
                                                    src={user.avatar_url} 
                                                    alt={`${user.first_name} ${user.last_name}`} 
                                                    className="w-11 h-11 rounded-2xl object-cover ring-2 ring-slate-100"
                                                />
                                            ) : (
                                                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm ring-2 ring-slate-100">
                                                    {user.first_name[0]}{user.last_name[0]}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-slate-900 flex items-center gap-2">
                                                    {user.first_name} {user.last_name}
                                                    {isUserAdmin && (
                                                        <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                                                            <Lock className="w-2.5 h-2.5" />
                                                            System Admin
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-400 font-medium">{user.email}</div>
                                                <div className="text-xs text-slate-500 mt-0.5 font-bold">
                                                    Role: <span className="text-primary">{formatRole(user.current_role, user.profession)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Toggle Action */}
                                        <div className="flex items-center gap-4 self-end sm:self-auto shrink-0">
                                            {isUserAdmin ? (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100">
                                                        <Check className="w-4 h-4" />
                                                        Unconditional Access
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-3 sm:items-end">
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "text-[10px] font-bold tracking-wide uppercase",
                                                            user.has_calendar_access ? "text-primary" : "text-slate-400"
                                                        )}>
                                                            Calendar: {user.has_calendar_access ? "Granted" : "Revoked"}
                                                        </span>
                                                        <Switch
                                                            checked={user.has_calendar_access}
                                                            disabled={togglingId === user.id}
                                                            onCheckedChange={() => handleToggleCalendarAccess(user.id, user.has_calendar_access)}
                                                            className="data-[state=checked]:bg-primary scale-90"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "text-[10px] font-bold tracking-wide uppercase",
                                                            user.has_analytics_access ? "text-primary" : "text-slate-400"
                                                        )}>
                                                            Analytics: {user.has_analytics_access ? "Granted" : "Revoked"}
                                                        </span>
                                                        <Switch
                                                            checked={user.has_analytics_access}
                                                            disabled={togglingId === user.id}
                                                            onCheckedChange={() => handleToggleAnalyticsAccess(user.id, user.has_analytics_access)}
                                                            className="data-[state=checked]:bg-primary scale-90"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={cn(
                                                            "text-[10px] font-bold tracking-wide uppercase",
                                                            user.has_assign_work_access ? "text-primary" : "text-slate-400"
                                                        )}>
                                                            Assign Work: {user.has_assign_work_access ? "Granted" : "Revoked"}
                                                        </span>
                                                        <Switch
                                                            checked={user.has_assign_work_access}
                                                            disabled={togglingId === user.id}
                                                            onCheckedChange={() => handleToggleAssignWorkAccess(user.id, user.has_assign_work_access)}
                                                            className="data-[state=checked]:bg-primary scale-90"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Notes */}
                <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden bg-slate-50/50">
                    <CardContent className="p-6 flex gap-3 text-slate-500 text-xs leading-relaxed">
                        <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold text-slate-700">Security Notes:</span>
                            <ul className="list-disc pl-4 space-y-1.5 mt-1.5">
                                <li>Administrators always have permanent, full access to the Admin Calendar and cannot be toggled.</li>
                                <li>Granting access will immediately display the "Admin Calendar" sidebar route and allow the user to view all appointments, schedules, and book slots in the master workspace.</li>
                                <li>Revoking access hides the navigation controls instantly, and any direct URL requests to `/admin/calendar` will be automatically blocked by the router gate.</li>
                                <li>Granting "Assign Work" access allows selected staff members (such as Department Heads) to assign work and tasks to other staff members directly from their console.</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
