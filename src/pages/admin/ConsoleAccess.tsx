import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    ShieldCheck, 
    Search, 
    Users, 
    RefreshCw, 
    Calendar,
    Check,
    AlertCircle,
    Lock,
    Stethoscope,
    Activity,
    Apple,
    CalendarDays,
    TrendingUp,
    Briefcase,
    Building2,
    ChevronRight,
    UserCheck,
    CheckCircle2,
    XCircle,
    SlidersHorizontal
} from "lucide-react";
import { apiFetch } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { APP_MODULES, AppModuleDefinition, isModuleGrantedForUser } from "@/config/appModules";

interface UserProfile {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    current_role: string;
    profession?: string | null;
    ams_role?: string | null;
    avatar_url?: string | null;
    has_calendar_access: boolean;
    has_analytics_access: boolean;
    has_assign_work_access: boolean;
    allowed_consoles?: string[] | string | null;
}

export default function ConsoleAccess() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeRoleFilter, setActiveRoleFilter] = useState<"all" | "clinical" | "admin" | "client">("all");
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [togglingModuleId, setTogglingModuleId] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await apiFetch<{ data: any[] }>("/hr/users");
            const allUsers = response.data || [];
            
            const formatted: UserProfile[] = allUsers.map((u: any) => {
                let parsedConsoles: string[] = [];
                if (u.allowed_consoles) {
                    try {
                        parsedConsoles = typeof u.allowed_consoles === 'string' ? JSON.parse(u.allowed_consoles) : u.allowed_consoles;
                    } catch {
                        parsedConsoles = (u.allowed_consoles as string).split(',').map(s => s.trim());
                    }
                }
                
                // Ensure primary role is included in allowed consoles by default
                const primaryRole = u.current_role || u.role || "user";
                if (primaryRole && !parsedConsoles.includes(primaryRole)) {
                    parsedConsoles.push(primaryRole);
                }

                return {
                    id: u.id,
                    first_name: u.first_name || "User",
                    last_name: u.last_name || "",
                    email: u.email || "",
                    current_role: primaryRole,
                    profession: u.profession,
                    ams_role: u.ams_role,
                    avatar_url: u.avatar_url,
                    has_calendar_access: !!u.has_calendar_access,
                    has_analytics_access: !!u.has_analytics_access,
                    has_assign_work_access: !!u.has_assign_work_access,
                    allowed_consoles: parsedConsoles
                };
            });

            setUsers(formatted);
            if (formatted.length > 0 && !selectedUserId) {
                setSelectedUserId(formatted[0].id);
            }
        } catch (error: any) {
            toast({
                title: "Error loading user directory",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    // Filtered users for left panel
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
            const email = user.email.toLowerCase();
            const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            const clinicalRoles = ["consultant", "sports_physician", "physiotherapist", "nutritionist", "sports_scientist", "massage_therapist"];
            const adminRoles = ["admin", "foe", "hr_manager", "manager"];
            const clientRoles = ["client", "athlete", "user"];

            if (activeRoleFilter === "clinical") return clinicalRoles.includes(user.current_role);
            if (activeRoleFilter === "admin") return adminRoles.includes(user.current_role);
            if (activeRoleFilter === "client") return clientRoles.includes(user.current_role);
            return true;
        });
    }, [users, searchQuery, activeRoleFilter]);

    // Keep selectedUserId valid if filtering changes
    useEffect(() => {
        if (filteredUsers.length > 0 && !filteredUsers.some(u => u.id === selectedUserId)) {
            setSelectedUserId(filteredUsers[0].id);
        }
    }, [filteredUsers, selectedUserId]);

    const selectedUser = useMemo(() => {
        return users.find(u => u.id === selectedUserId) || null;
    }, [users, selectedUserId]);

    // Helper to check if a specific console is enabled for selected user
    const isConsoleGranted = (user: UserProfile, moduleObj: AppModuleDefinition) => {
        return isModuleGrantedForUser(user.current_role, user.profession, user.allowed_consoles, moduleObj);
    };

    const handleToggleConsoleAccess = async (userId: string, moduleObj: AppModuleDefinition) => {
        const targetUser = users.find(u => u.id === userId);
        if (!targetUser) return;

        // Populate base allowed consoles array if user allowed_consoles was null/undefined
        let currentAllowed: string[];
        if (Array.isArray(targetUser.allowed_consoles)) {
            currentAllowed = [...targetUser.allowed_consoles];
        } else {
            currentAllowed = APP_MODULES.filter(m => isConsoleGranted(targetUser, m)).map(m => m.id);
        }

        const isCurrentlyGranted = isConsoleGranted(targetUser, moduleObj);

        let newAllowed: string[];
        if (isCurrentlyGranted) {
            newAllowed = currentAllowed.filter(c => c !== moduleObj.id);
        } else {
            newAllowed = Array.from(new Set([...currentAllowed, moduleObj.id]));
        }

        try {
            setTogglingModuleId(moduleObj.id);

            await apiFetch(`/hr/users/${userId}/role`, {
                method: "PATCH",
                data: {
                    allowed_consoles: newAllowed
                }
            });

            setUsers(prev => prev.map(u => u.id === userId ? { ...u, allowed_consoles: newAllowed } : u));

            toast({
                title: isCurrentlyGranted ? "Console Access Revoked" : "Console Access Granted",
                description: `Successfully ${isCurrentlyGranted ? 'revoked' : 'granted'} access to ${moduleObj.name} for ${targetUser.first_name}.`,
            });
        } catch (error: any) {
            toast({
                title: "Permission Update Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setTogglingModuleId(null);
        }
    };

    const handleToggleFeatureAccess = async (userId: string, featureKey: "has_calendar_access" | "has_analytics_access" | "has_assign_work_access", currentVal: boolean) => {
        const targetUser = users.find(u => u.id === userId);
        if (!targetUser) return;

        const targetVal = !currentVal;

        try {
            setTogglingModuleId(featureKey);

            await apiFetch(`/hr/users/${userId}/role`, {
                method: "PATCH",
                data: { [featureKey]: targetVal }
            });

            setUsers(prev => prev.map(u => u.id === userId ? { ...u, [featureKey]: targetVal } : u));

            const featureNames = {
                has_calendar_access: "Admin Calendar",
                has_analytics_access: "Staff Analytics",
                has_assign_work_access: "Work Assignment Privileges"
            };

            toast({
                title: "Module Privilege Updated",
                description: `${featureNames[featureKey]} has been ${targetVal ? 'granted' : 'revoked'}.`
            });
        } catch (error: any) {
            toast({
                title: "Update Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setTogglingModuleId(null);
        }
    };

    const formatRoleName = (role: string, profession?: string | null) => {
        if (profession) return profession;
        if (role === "admin") return "Admin";
        if (role === "consultant") return "Specialist";
        if (role === "sports_scientist") return "Sports Scientist";
        if (role === "hr_manager") return "HR Manager";
        if (role === "foe") return "Front Office";
        if (role === "manager") return "Manager";
        return role.replace(/_/g, ' ').toUpperCase();
    };

    return (
        <DashboardLayout role="admin">
            <div className="max-w-[1600px] mx-auto space-y-6 pb-12 px-4 sm:px-6 animate-in fade-in duration-300">
                
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                    <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="relative z-10 space-y-1">
                        <div className="flex items-center gap-2 text-primary text-xs font-black uppercase tracking-widest">
                            <ShieldCheck className="w-4 h-4" />
                            Multi-Console Permissions
                        </div>
                        <h1 className="text-2xl font-display font-extrabold tracking-tight">Console & Module Access Management</h1>
                        <p className="text-slate-300 text-xs max-w-2xl">
                            Select any staff member from the left panel to configure their console permissions and module access switches.
                        </p>
                    </div>

                    <div className="relative z-10 flex items-center gap-2 self-start md:self-center">
                        <Badge className="bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-xl text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5">
                            <Lock className="w-3 h-3" />
                            Administrator Access
                        </Badge>
                    </div>
                </div>

                {/* Master-Detail Split Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT PANEL: Staff Directory & Filters (5 cols) */}
                    <div className="lg:col-span-4 space-y-4">
                        <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden bg-white">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-primary" />
                                        Staff Directory
                                    </h2>
                                    <span className="text-[11px] font-bold text-slate-400">
                                        {filteredUsers.length} Users
                                    </span>
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="text"
                                        placeholder="Search user name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 rounded-2xl border-slate-200 focus-visible:ring-primary h-10 text-xs"
                                    />
                                </div>

                                {/* Filter Tabs */}
                                <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
                                    <button
                                        onClick={() => setActiveRoleFilter("all")}
                                        className={cn(
                                            "flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap text-center",
                                            activeRoleFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                                        )}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setActiveRoleFilter("clinical")}
                                        className={cn(
                                            "flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap text-center",
                                            activeRoleFilter === "clinical" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                                        )}
                                    >
                                        Clinical
                                    </button>
                                    <button
                                        onClick={() => setActiveRoleFilter("admin")}
                                        className={cn(
                                            "flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap text-center",
                                            activeRoleFilter === "admin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                                        )}
                                    >
                                        Admin
                                    </button>
                                    <button
                                        onClick={() => setActiveRoleFilter("client")}
                                        className={cn(
                                            "flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap text-center",
                                            activeRoleFilter === "client" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                                        )}
                                    >
                                        Clients
                                    </button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Staff List Container */}
                        <div className="bg-white rounded-3xl border border-border/50 overflow-hidden shadow-sm max-h-[620px] overflow-y-auto divide-y divide-slate-100">
                            {loading ? (
                                <div className="text-center py-12 text-muted-foreground text-xs font-medium">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 opacity-50 text-primary" />
                                    Loading users...
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div className="text-center py-12 px-4 text-slate-400 text-xs">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    No staff members match your criteria.
                                </div>
                            ) : (
                                filteredUsers.map((user) => {
                                    const isSelected = selectedUserId === user.id;
                                    const grantedCount = APP_MODULES.filter(m => isConsoleGranted(user, m)).length;

                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => setSelectedUserId(user.id)}
                                            className={cn(
                                                "w-full p-3.5 text-left transition-all flex items-center justify-between gap-3 group relative border-l-4",
                                                isSelected 
                                                    ? "bg-primary/5 border-l-primary shadow-inner" 
                                                    : "border-l-transparent hover:bg-slate-50"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {user.avatar_url ? (
                                                    <img 
                                                        src={user.avatar_url} 
                                                        alt={user.first_name} 
                                                        className="w-10 h-10 rounded-2xl object-cover shrink-0 ring-2 ring-slate-100"
                                                    />
                                                ) : (
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 transition-transform group-hover:scale-105",
                                                        isSelected ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
                                                    )}>
                                                        {user.first_name[0]}{user.last_name[0]}
                                                    </div>
                                                )}

                                                <div className="min-w-0 flex-1">
                                                    <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                                                        <span className="truncate">{user.first_name} {user.last_name}</span>
                                                        {user.current_role === "admin" && (
                                                            <span className="text-[9px] font-black uppercase text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full shrink-0">
                                                                Admin
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-slate-200">
                                                            {formatRoleName(user.current_role, user.profession)}
                                                        </Badge>
                                                        <span className="text-[10px] font-bold text-primary">
                                                            {grantedCount} Console{grantedCount !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <ChevronRight className={cn(
                                                "w-4 h-4 shrink-0 transition-transform",
                                                isSelected ? "text-primary translate-x-0.5" : "text-slate-300 group-hover:text-slate-500"
                                            )} />
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL: App Consoles & Toggles for Selected User (8 cols) */}
                    <div className="lg:col-span-8 space-y-4">
                        {selectedUser ? (
                            <>
                                {/* Selected User Info Bar */}
                                <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden bg-white">
                                    <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            {selectedUser.avatar_url ? (
                                                <img 
                                                    src={selectedUser.avatar_url} 
                                                    alt={selectedUser.first_name} 
                                                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-primary/20"
                                                />
                                            ) : (
                                                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary font-black text-sm flex items-center justify-center ring-2 ring-primary/20">
                                                    {selectedUser.first_name[0]}{selectedUser.last_name[0]}
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-base font-bold text-slate-900">
                                                        {selectedUser.first_name} {selectedUser.last_name}
                                                    </h3>
                                                    <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] uppercase font-bold">
                                                        {formatRoleName(selectedUser.current_role, selectedUser.profession)}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-slate-400 font-medium">{selectedUser.email}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 shrink-0">
                                            <div className="text-right">
                                                <div className="text-[10px] font-black uppercase text-slate-400">Consoles Granted</div>
                                                <div className="text-xs font-black text-primary">
                                                    {APP_MODULES.filter(m => isConsoleGranted(selectedUser, m)).length} of {APP_MODULES.length} Active
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Apps & Consoles Modules Grid */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                            <SlidersHorizontal className="w-4 h-4 text-primary" />
                                            Available Consoles & App Modules
                                        </h3>
                                        <span className="text-[11px] text-slate-400 font-medium">Toggle switch to grant or revoke access</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {APP_MODULES.map((moduleObj) => {
                                            const IconComp = moduleObj.icon;
                                            const granted = isConsoleGranted(selectedUser, moduleObj);
                                            const isPrimary = moduleObj.defaultRoles.includes(selectedUser.current_role);
                                            const isToggling = togglingModuleId === moduleObj.id;

                                            return (
                                                <Card 
                                                    key={moduleObj.id} 
                                                    className={cn(
                                                        "rounded-3xl border transition-all duration-300 shadow-sm relative overflow-hidden bg-white",
                                                        granted 
                                                            ? "border-primary/30 ring-1 ring-primary/10 shadow-md" 
                                                            : "border-slate-200/80 hover:border-slate-300"
                                                    )}
                                                >
                                                    <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-start gap-3">
                                                                <div className={cn("p-2.5 rounded-2xl shrink-0 border shadow-sm", moduleObj.color)}>
                                                                    <IconComp className="w-5 h-5" />
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5 flex-wrap">
                                                                        <span>{moduleObj.name}</span>
                                                                        {isPrimary && (
                                                                            <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md border border-slate-200">
                                                                                Primary
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11px] text-slate-500 leading-snug">
                                                                        {moduleObj.description}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                                            <div className="flex items-center gap-1.5">
                                                                {granted ? (
                                                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-black uppercase px-2 py-0.5 flex items-center gap-1">
                                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                                        Access Granted
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="outline" className="bg-slate-50 text-slate-400 border-slate-200 text-[9px] font-bold uppercase px-2 py-0.5 flex items-center gap-1">
                                                                        <XCircle className="w-3 h-3 text-slate-300" />
                                                                        Revoked
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {/* Toggle Switch */}
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold uppercase text-slate-400">
                                                                    {granted ? "Enabled" : "Disabled"}
                                                                </span>
                                                                <Switch
                                                                    checked={granted}
                                                                    disabled={isToggling}
                                                                    onCheckedChange={() => handleToggleConsoleAccess(selectedUser.id, moduleObj)}
                                                                    className="data-[state=checked]:bg-primary scale-90"
                                                                />
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Granular Feature Access Modules Card */}
                                <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden bg-white">
                                    <CardContent className="p-5 space-y-4">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-primary" />
                                                Specific Feature & Workspace Privileges
                                            </h3>
                                            <span className="text-[11px] text-slate-400">Granular rights</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {/* Admin Calendar */}
                                            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5 text-primary" />
                                                        Admin Calendar
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">Master schedule view</div>
                                                </div>
                                                <Switch
                                                    checked={selectedUser.current_role === "admin" || selectedUser.has_calendar_access}
                                                    disabled={selectedUser.current_role === "admin" || togglingModuleId === "has_calendar_access"}
                                                    onCheckedChange={() => handleToggleFeatureAccess(selectedUser.id, "has_calendar_access", selectedUser.has_calendar_access)}
                                                    className="data-[state=checked]:bg-primary scale-75"
                                                />
                                            </div>

                                            {/* Staff Analytics */}
                                            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                                                        Staff Analytics
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">Efficiency metrics</div>
                                                </div>
                                                <Switch
                                                    checked={selectedUser.current_role === "admin" || selectedUser.has_analytics_access}
                                                    disabled={selectedUser.current_role === "admin" || togglingModuleId === "has_analytics_access"}
                                                    onCheckedChange={() => handleToggleFeatureAccess(selectedUser.id, "has_analytics_access", selectedUser.has_analytics_access)}
                                                    className="data-[state=checked]:bg-primary scale-75"
                                                />
                                            </div>

                                            {/* Assign Work */}
                                            <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
                                                <div>
                                                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                                        <Briefcase className="w-3.5 h-3.5 text-primary" />
                                                        Assign Work
                                                    </div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">Task delegation</div>
                                                </div>
                                                <Switch
                                                    checked={selectedUser.current_role === "admin" || selectedUser.has_assign_work_access}
                                                    disabled={selectedUser.current_role === "admin" || togglingModuleId === "has_assign_work_access"}
                                                    onCheckedChange={() => handleToggleFeatureAccess(selectedUser.id, "has_assign_work_access", selectedUser.has_assign_work_access)}
                                                    className="data-[state=checked]:bg-primary scale-75"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <Card className="border-border/50 shadow-sm rounded-3xl bg-white p-12 text-center text-slate-400">
                                <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-sm font-bold text-slate-700">No Staff Member Selected</p>
                                <p className="text-xs text-slate-400 mt-1">Please select a user from the left directory to configure their console permissions.</p>
                            </Card>
                        )}
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}
