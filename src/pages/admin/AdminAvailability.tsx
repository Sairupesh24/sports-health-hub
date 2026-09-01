import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Search, Settings, Save, Calendar as CalendarIcon, User, Clock } from "lucide-react";

const DAYS_OF_WEEK = [
    { id: 0, label: "Sunday" },
    { id: 1, label: "Monday" },
    { id: 2, label: "Tuesday" },
    { id: 3, label: "Wednesday" },
    { id: 4, label: "Thursday" },
    { id: 5, label: "Friday" },
    { id: 6, label: "Saturday" },
];

type ScheduleRow = {
    id?: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
    slot_duration_interval?: number | null;
    buffer_time: number;
};

const CLINICAL_ROLES_DEFAULT = [
    { key: "physiotherapist", label: "Physiotherapy & Sports Physician", defaultDuration: 45, defaultCapacity: 2 },
    { key: "nutritionist", label: "Nutrition & Dietetics", defaultDuration: 45, defaultCapacity: 1 },
    { key: "sports_scientist", label: "Sports Science & S&C Testing", defaultDuration: 60, defaultCapacity: "infinity" },
    { key: "massage_therapist", label: "Massage Therapy & Recovery", defaultDuration: 60, defaultCapacity: 1 },
];

export default function AdminAvailability({ hideLayout = false }: { hideLayout?: boolean }) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allowCustom, setAllowCustom] = useState(false);
    const [defaultDuration, setDefaultDuration] = useState("60");
    const [defaultCapacity, setDefaultCapacity] = useState("2");
    const [customSettings, setCustomSettings] = useState<Record<string, { slot_duration: number; capacity: number | string }>>({
        physiotherapist: { slot_duration: 45, capacity: 2 },
        nutritionist: { slot_duration: 45, capacity: 1 },
        sports_scientist: { slot_duration: 60, capacity: "infinity" },
        massage_therapist: { slot_duration: 60, capacity: 1 }
    });

    useEffect(() => {
        async function loadSettings() {
            if (!profile?.organization_id) return;
            try {
                const data = await apiFetch<any>(`/organizations/${profile.organization_id}/settings`);
                if (data) {
                    setAllowCustom(!!data.allow_custom_duration);
                    setDefaultDuration(data.default_slot_duration?.toString() || "60");
                    setDefaultCapacity(data.default_slot_capacity?.toString() || "2");
                    if (data.custom_specialist_settings && typeof data.custom_specialist_settings === 'object') {
                        setCustomSettings(prev => ({ ...prev, ...data.custom_specialist_settings }));
                    }
                }
            } catch (err: any) {
                toast({ title: "Failed to load settings", description: err.message, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, [profile]);

    const handleSaveGlobal = async () => {
        if (!profile?.organization_id) return;
        setSaving(true);
        try {
            const durationNum = parseInt(defaultDuration, 10);
            if (isNaN(durationNum) || durationNum < 5 || durationNum > 480) {
                throw new Error("Default slot duration must be a valid number between 5 and 480 minutes.");
            }

            const capacityNum = parseInt(defaultCapacity, 10);
            if (isNaN(capacityNum) || capacityNum < 1 || capacityNum > 50) {
                throw new Error("Appointments per slot must be between 1 and 50.");
            }

            await apiFetch(`/organizations/${profile.organization_id}/settings`, {
                method: 'PATCH',
                data: {
                    allow_custom_duration: allowCustom,
                    default_slot_duration: durationNum,
                    default_slot_capacity: capacityNum,
                    custom_specialist_settings: customSettings
                }
            });

            toast({ 
                title: "Configuration Saved", 
                description: "Scheduling preferences updated. Dynamic appointment slots will reflect this configuration." 
            });
        } catch (err: any) {
            toast({ title: "Error Saving", description: err.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const updateRoleSetting = (roleKey: string, field: 'slot_duration' | 'capacity', value: any) => {
        setCustomSettings(prev => ({
            ...prev,
            [roleKey]: {
                slot_duration: prev[roleKey]?.slot_duration || parseInt(defaultDuration, 10) || 60,
                capacity: prev[roleKey]?.capacity || parseInt(defaultCapacity, 10) || 2,
                [field]: value
            }
        }));
    };

    const content = (
        <div className={`space-y-6 max-w-5xl mx-auto ${hideLayout ? 'pb-2' : 'pb-10'}`}>
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Organization Availability & Settings</h1>
                <p className="text-muted-foreground text-sm mt-1">Manage global duration settings, appointment concurrency, and dynamic slot rules</p>
            </div>

            <Card className="gradient-card border-border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" />
                        Global Appointment & Dynamic Slot Settings
                    </CardTitle>
                    <CardDescription>Configure default time slot duration and capacity limits across all specialist calendars.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-2">
                    {loading ? (
                        <p className="text-sm text-muted-foreground py-4">Loading settings...</p>
                    ) : (
                        <>
                            {/* 1. Global Default Slot Duration & Capacity */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 border border-border rounded-xl bg-card/60 backdrop-blur-sm space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-semibold flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-primary" />
                                            Global Default Slot Duration
                                        </Label>
                                        <p className="text-xs text-muted-foreground">Length of each standard calendar appointment block.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Input 
                                            type="number" 
                                            min="5" 
                                            max="480" 
                                            className="w-28 font-mono text-center font-bold text-base h-10" 
                                            value={defaultDuration} 
                                            onChange={e => setDefaultDuration(e.target.value)} 
                                        />
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Minutes</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {[15, 30, 45, 60, 90].map(mins => (
                                            <Button
                                                key={mins}
                                                type="button"
                                                variant={defaultDuration === mins.toString() ? "default" : "outline"}
                                                size="sm"
                                                className="h-7 px-2.5 text-xs font-medium"
                                                onClick={() => setDefaultDuration(mins.toString())}
                                            >
                                                {mins}m
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 border border-border rounded-xl bg-card/60 backdrop-blur-sm space-y-3">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-semibold flex items-center gap-2">
                                            <User className="w-4 h-4 text-primary" />
                                            Appointments Per Slot (Capacity)
                                        </Label>
                                        <p className="text-xs text-muted-foreground">Concurrent client appointments allowed per time slot before waitlisting.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            max="50" 
                                            className="w-28 font-mono text-center font-bold text-base h-10" 
                                            value={defaultCapacity} 
                                            onChange={e => setDefaultCapacity(e.target.value)} 
                                        />
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Slots / Booking Limit</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {[1, 2, 3, 4, 5].map(cap => (
                                            <Button
                                                key={cap}
                                                type="button"
                                                variant={defaultCapacity === cap.toString() ? "default" : "outline"}
                                                size="sm"
                                                className="h-7 px-2.5 text-xs font-medium"
                                                onClick={() => setDefaultCapacity(cap.toString())}
                                            >
                                                {cap === 1 ? "1 (1-on-1)" : `${cap} per slot`}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* 2. Custom Specialist Durations Switch */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-border rounded-xl bg-muted/20">
                                <div className="space-y-1 max-w-xl">
                                    <Label className="text-base font-semibold">Allow Custom Specialist Durations & Capacities</Label>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Enable specific clinical roles or specialists to have their own custom time slot duration and booking capacity limits. If disabled, all specialists strictly adhere to the global clinic defaults above.
                                    </p>
                                </div>
                                <Switch checked={allowCustom} onCheckedChange={setAllowCustom} />
                            </div>

                            {/* 3. Specialist Role Overrides Matrix */}
                            {allowCustom && (
                                <div className="space-y-3 p-4 border border-border rounded-xl bg-muted/10 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-sm font-bold uppercase tracking-wider text-primary">Specialist Category Overrides</Label>
                                            <p className="text-xs text-muted-foreground">Override slot durations and max appointment limits per specialty.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2.5 mt-2">
                                        {CLINICAL_ROLES_DEFAULT.map(role => {
                                            const setting = customSettings[role.key] || {
                                                slot_duration: role.defaultDuration,
                                                capacity: role.defaultCapacity
                                            };

                                            const isInfinite = setting.capacity === "infinity" || setting.capacity === Infinity;

                                            return (
                                                <div 
                                                    key={role.key}
                                                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border border-border/70 bg-card gap-3"
                                                >
                                                    <div className="min-w-[200px]">
                                                        <span className="text-sm font-semibold text-foreground">{role.label}</span>
                                                    </div>

                                                    <div className="flex items-center gap-4 flex-wrap">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">Duration:</span>
                                                            <Input
                                                                type="number"
                                                                min="5"
                                                                max="480"
                                                                className="w-20 h-8 font-mono text-center text-xs"
                                                                value={setting.slot_duration}
                                                                onChange={e => updateRoleSetting(role.key, 'slot_duration', parseInt(e.target.value, 10) || 45)}
                                                            />
                                                            <span className="text-xs text-muted-foreground font-medium">mins</span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">Capacity:</span>
                                                            {isInfinite ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="px-2.5 py-1 rounded bg-primary/10 text-primary text-xs font-bold">Unlimited</span>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 text-[10px] text-muted-foreground hover:text-foreground"
                                                                        onClick={() => updateRoleSetting(role.key, 'capacity', 3)}
                                                                    >
                                                                        Set Fixed
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        max="50"
                                                                        className="w-16 h-8 font-mono text-center text-xs"
                                                                        value={setting.capacity}
                                                                        onChange={e => updateRoleSetting(role.key, 'capacity', parseInt(e.target.value, 10) || 1)}
                                                                    />
                                                                    <span className="text-xs text-muted-foreground font-medium">slots</span>
                                                                    {role.key === 'sports_scientist' && (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="h-7 text-[10px] text-muted-foreground hover:text-foreground"
                                                                            onClick={() => updateRoleSetting(role.key, 'capacity', 'infinity')}
                                                                        >
                                                                            Unlimited
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
                <CardFooter className="bg-muted/20 border-t border-border mt-2 py-4 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                        ⚡ Changes take effect immediately on next booking or slot calculation.
                    </p>
                    <Button onClick={handleSaveGlobal} disabled={loading || saving} className="gap-2">
                        <Save className="w-4 h-4" />
                        {saving ? "Saving..." : "Save Configuration"}
                    </Button>
                </CardFooter>
            </Card>

            <SessionTypeManager organizationId={profile?.organization_id} />
        </div>
    );

    if (hideLayout) return content;

    return (
        <DashboardLayout role="admin">
            {content}
        </DashboardLayout>
    );
}

function SessionTypeManager({ organizationId }: { organizationId?: string }) {
    const queryClient = useQueryClient();
    const [newName, setNewName] = useState("");
    const [search, setSearch] = useState("");
    const [addingLocally, setAddingLocally] = useState(false);

    const STORAGE_KEY = `session_types_${organizationId || "default"}`;

    const DEFAULT_SESSION_TYPES = [
        "Performance Assessment", "Device Testing", "Testing & Training", "Training",
        "Online session", "Physiotherapy", "Studying/Research",
        "Video Production/Video shooting/Video Editing", "Site Visit/Business Development",
        "Meeting", "Travelling", "Athlete/Parent Counselling", "Initial Consultation",
        "Guest Visits(at Center and Outside)", "Off-site Testing", "Off-site Training",
        "Group Session", "Office Work", "On-Court/On-Field Observations", "Report Making",
        "Warmup/ cool down", "Data work", "Program Design/Program planning and sharing",
        "Match day/ Observation", "Doctor consultation"
    ];

    const getLocalTypes = (): { id: string; name: string; category: string }[] => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) return JSON.parse(stored);
        } catch { /* ignore */ }
        const initial = DEFAULT_SESSION_TYPES.map((name, i) => ({ id: `local-${i}`, name, category: "General" }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
    };

    const saveLocalTypes = (types: { id: string; name: string; category: string }[]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
    };

    const { data: sessionTypes, isLoading } = useQuery({
        queryKey: ["session-types", organizationId],
        queryFn: async () => {
            try {
                const data = await apiFetch<any[]>('/appointments/session-types');
                return (data && data.length > 0) ? data : getLocalTypes();
            } catch {
                return getLocalTypes();
            }
        },
        enabled: !!organizationId
    });

    const addMutation = useMutation({
        mutationFn: async (name: string) => {
            await apiFetch('/appointments/session-types', {
                method: 'POST',
                data: { name }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session-types", organizationId] });
            setNewName("");
            toast({ title: "Type Added", description: "New session type created successfully." });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (id.startsWith("local-") || id.startsWith("fallback-")) {
                const current = getLocalTypes();
                saveLocalTypes(current.filter(t => t.id !== id));
                return;
            }
            await apiFetch(`/appointments/session-types/${id}`, { method: 'DELETE' });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["session-types", organizationId] });
            toast({ title: "Type Deleted", description: "Session type removed successfully." });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const filteredTypes = sessionTypes?.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <Card className="gradient-card border-border">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Session Type Management
                </CardTitle>
                <CardDescription>Manage the list of session categories available for booking and analytics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 space-y-2">
                        <Label>Add New Session Type</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="e.g. Movement Screening"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && newName && addMutation.mutate(newName)}
                            />
                            <Button
                                onClick={() => addMutation.mutate(newName)}
                                disabled={!newName || addMutation.isPending}
                                className="shrink-0"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-base">Existing Session Types ({sessionTypes?.length || 0})</Label>
                        <div className="relative w-full max-w-[200px]">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search types..."
                                className="pl-8 h-9"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <ScrollArea className="h-[400px] border border-border rounded-lg bg-muted/5 p-2">
                        {isLoading ? (
                            <p className="text-sm text-center py-10 text-muted-foreground">Loading types...</p>
                        ) : filteredTypes.length === 0 ? (
                            <p className="text-sm text-center py-10 text-muted-foreground">No session types found.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {filteredTypes.map((type) => (
                                    <div
                                        key={type.id}
                                        className="flex items-center justify-between p-3 border border-border rounded-md bg-background hover:border-primary/30 transition-colors group"
                                    >
                                        <span className="font-medium text-sm">{type.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => {
                                                if (confirm(`Are you sure you want to delete "${type.name}"?`)) {
                                                    deleteMutation.mutate(type.id);
                                                }
                                            }}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}
