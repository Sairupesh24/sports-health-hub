import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

export default function AdminAvailability({ hideLayout = false }: { hideLayout?: boolean }) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allowCustom, setAllowCustom] = useState(false);
    const [defaultDuration, setDefaultDuration] = useState("60");

    // Consultant override state
    const [selectedConsultant, setSelectedConsultant] = useState<string>("");
    const [schedules, setSchedules] = useState<ScheduleRow[]>(DAYS_OF_WEEK.map(d => ({
        day_of_week: d.id, start_time: "09:00", end_time: "17:00", is_active: false, buffer_time: 0
    })));
    const [consultantLoading, setConsultantLoading] = useState(false);
    const [consultantSaving, setConsultantSaving] = useState(false);

    const { data: consultants } = useQuery({
        queryKey: ['org-consultants', profile?.organization_id],
        queryFn: async () => {
            const { data: roleData } = await supabase.from("user_roles").select("user_id").eq("role", "consultant");
            if (!roleData || roleData.length === 0) return [];
            const consultantIds = roleData.map(r => r.user_id);
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("id, first_name, last_name")
                .eq("organization_id", profile?.organization_id)
                .in("id", consultantIds)
                .eq("is_approved", true);
            return profilesData || [];
        },
        enabled: !!profile?.organization_id
    });

    useEffect(() => {
        async function loadSettings() {
            if (!profile?.organization_id) return;
            try {
                const { data, error } = await supabase
                    .from("organization_settings")
                    .select("allow_custom_duration, default_slot_duration")
                    .eq("organization_id", profile.organization_id)
                    .maybeSingle();

                if (error) throw error;
                if (data) {
                    setAllowCustom(!!data.allow_custom_duration);
                    setDefaultDuration(data.default_slot_duration?.toString() || "60");
                }
            } catch (err: any) {
                toast({ title: "Failed to load settings", description: err.message, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, [profile]);

    useEffect(() => {
        async function loadConsultantSchedule() {
            if (!selectedConsultant) {
                setSchedules(DAYS_OF_WEEK.map(d => ({ day_of_week: d.id, start_time: "09:00", end_time: "17:00", is_active: false, buffer_time: 0 })));
                return;
            }
            setConsultantLoading(true);
            try {
                const { data: availData, error } = await supabase
                    .from("consultant_availability")
                    .select("*")
                    .eq("consultant_id", selectedConsultant);

                if (error) throw error;
                if (availData && availData.length > 0) {
                    const loadedSchedules: ScheduleRow[] = DAYS_OF_WEEK.map(day => {
                        const existing = availData.find(a => a.day_of_week === day.id);
                        if (existing) {
                            return {
                                id: existing.id, day_of_week: day.id,
                                start_time: existing.start_time.substring(0, 5), end_time: existing.end_time.substring(0, 5),
                                is_active: true, slot_duration_interval: existing.slot_duration_interval, buffer_time: existing.buffer_time
                            };
                        }
                        return { day_of_week: day.id, start_time: "09:00", end_time: "17:00", is_active: false, buffer_time: 0 };
                    });
                    setSchedules(loadedSchedules);
                } else {
                    setSchedules(DAYS_OF_WEEK.map(d => ({ day_of_week: d.id, start_time: "09:00", end_time: "17:00", is_active: false, buffer_time: 0 })));
                }
            } catch (err: any) {
                toast({ title: "Failed to load consultant schedule", description: err.message, variant: "destructive" });
            } finally {
                setConsultantLoading(false);
            }
        }
        loadConsultantSchedule();
    }, [selectedConsultant]);

    const handleSaveGlobal = async () => {
        if (!profile?.organization_id) return;
        setSaving(true);
        try {
            const durationNum = parseInt(defaultDuration, 10);
            if (isNaN(durationNum) || durationNum < 5 || durationNum > 480) {
                throw new Error("Default slot duration must be a valid number between 5 and 480 minutes.");
            }

            const { error } = await supabase
                .from("organization_settings")
                .upsert({
                    organization_id: profile.organization_id,
                    allow_custom_duration: allowCustom,
                    default_slot_duration: durationNum,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            toast({ title: "Settings Saved", description: "Organization scheduling preferences updated successfully." });
        } catch (err: any) {
            toast({ title: "Error Saving", description: err.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleToggleDay = (dayId: number, active: boolean) => {
        setSchedules(prev => prev.map(s => s.day_of_week === dayId ? { ...s, is_active: active } : s));
    };

    const handleTimeChange = (dayId: number, field: 'start_time' | 'end_time', value: string) => {
        setSchedules(prev => prev.map(s => s.day_of_week === dayId ? { ...s, [field]: value } : s));
    };

    const handleDurationChange = (dayId: number, value: string) => {
        const valObj = value === "default" ? null : parseInt(value, 10);
        setSchedules(prev => prev.map(s => s.day_of_week === dayId ? { ...s, slot_duration_interval: valObj } : s));
    };

    const handleSaveConsultant = async () => {
        if (!profile?.organization_id || !selectedConsultant) return;
        setConsultantSaving(true);
        try {
            const { error: deleteError } = await supabase
                .from("consultant_availability")
                .delete()
                .eq("consultant_id", selectedConsultant);

            if (deleteError) throw deleteError;

            const inserts = schedules.filter(s => s.is_active).map(s => ({
                organization_id: profile.organization_id,
                consultant_id: selectedConsultant,
                day_of_week: s.day_of_week,
                start_time: `${s.start_time}:00`,
                end_time: `${s.end_time}:00`,
                slot_duration_interval: allowCustom ? s.slot_duration_interval : null,
                buffer_time: s.buffer_time
            }));

            if (inserts.length > 0) {
                const { error: insertError } = await supabase.from("consultant_availability").insert(inserts);
                if (insertError) throw insertError;
            }

            toast({ title: "Schedule Saved", description: "Consultant availability has been updated." });
        } catch (err: any) {
            toast({ title: "Failed to Save", description: err.message, variant: "destructive" });
        } finally {
            setConsultantSaving(false);
        }
    };

    const content = (
        <div className={`space-y-6 max-w-5xl mx-auto ${hideLayout ? 'pb-2' : 'pb-10'}`}>
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Organization Availability</h1>
                <p className="text-muted-foreground text-sm mt-1">Manage global duration settings and oversee consultant schedules</p>
            </div>

            <Card className="gradient-card border-border">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" />
                        Global Appointment Settings
                    </CardTitle>
                    <CardDescription>Configure how appointment durations are calculated across your clinic.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-4">
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading settings...</p>
                    ) : (
                        <>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-border rounded-lg bg-muted/20">
                                <div className="space-y-1 max-w-lg">
                                    <Label className="text-base">Allow Custom Consultant Durations</Label>
                                    <p className="text-sm text-muted-foreground">
                                        If enabled, Consultants can freely define their own specific appointment durations.
                                        If disabled, all appointments use the global firm default.
                                    </p>
                                </div>
                                <Switch checked={allowCustom} onCheckedChange={setAllowCustom} />
                            </div>

                            {!allowCustom && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-border rounded-lg bg-muted/20 animate-in fade-in zoom-in duration-200">
                                    <div className="space-y-1">
                                        <Label className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> Global Default Duration</Label>
                                        <p className="text-sm text-muted-foreground">All calendar blocks will be exactly this length (in minutes).</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input type="number" min="5" max="480" className="w-24 font-mono text-center" value={defaultDuration} onChange={e => setDefaultDuration(e.target.value)} />
                                        <span className="text-sm font-medium text-foreground">mins</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
                <CardFooter className="bg-muted/30 border-t border-border mt-6 py-4 flex justify-end">
                    <Button onClick={handleSaveGlobal} disabled={loading || saving} className="gap-2">
                        <Save className="w-4 h-4" />
                        {saving ? "Saving..." : "Save Configuration"}
                    </Button>
                </CardFooter>
            </Card>

            <Card className="gradient-card border-border">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-primary" />
                        Consultant Schedules Override
                    </CardTitle>
                    <CardDescription>Select a consultant below to explicitly manage their working hours.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-border rounded-lg bg-muted/20">
                        <User className="w-8 h-8 text-primary/50" />
                        <div className="w-full max-w-sm">
                            <Label className="mb-2 block">Select Consultant</Label>
                            <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a consultant..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {consultants?.map(c => (
                                        <SelectItem key={c.id} value={c.id}>Dr. {c.first_name} {c.last_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {selectedConsultant && (
                        <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            {consultantLoading ? (
                                <p className="text-sm text-muted-foreground">Loading consultant schedule...</p>
                            ) : (
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-lg text-foreground mb-4">Weekly Time Blocks</h4>
                                    {schedules.map((schedule) => {
                                        const dayName = DAYS_OF_WEEK.find(d => d.id === schedule.day_of_week)?.label;
                                        return (
                                            <div key={schedule.day_of_week} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-border rounded-lg bg-background group hover:border-primary/50 transition-colors">
                                                <div className="flex items-center gap-4 min-w-[150px]">
                                                    <Switch
                                                        checked={schedule.is_active}
                                                        onCheckedChange={(v) => handleToggleDay(schedule.day_of_week, v)}
                                                    />
                                                    <Label className={`text-base font-medium ${!schedule.is_active && 'text-muted-foreground'}`}>{dayName}</Label>
                                                </div>

                                                {schedule.is_active ? (
                                                    <div className="flex flex-wrap items-center gap-4 flex-1 animate-in fade-in zoom-in duration-200">
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                type="time"
                                                                value={schedule.start_time}
                                                                onChange={e => handleTimeChange(schedule.day_of_week, 'start_time', e.target.value)}
                                                                className="w-[120px]"
                                                            />
                                                            <span className="text-muted-foreground">to</span>
                                                            <Input
                                                                type="time"
                                                                value={schedule.end_time}
                                                                onChange={e => handleTimeChange(schedule.day_of_week, 'end_time', e.target.value)}
                                                                className="w-[120px]"
                                                            />
                                                        </div>

                                                        {allowCustom && (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-muted-foreground">Duration:</span>
                                                                <Select
                                                                    value={schedule.slot_duration_interval ? schedule.slot_duration_interval.toString() : "default"}
                                                                    onValueChange={(v) => handleDurationChange(schedule.day_of_week, v)}
                                                                >
                                                                    <SelectTrigger className="w-[130px] h-9">
                                                                        <SelectValue placeholder="Org Default" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="default">Org Default</SelectItem>
                                                                        <SelectItem value="15">15 mins</SelectItem>
                                                                        <SelectItem value="30">30 mins</SelectItem>
                                                                        <SelectItem value="45">45 mins</SelectItem>
                                                                        <SelectItem value="60">60 mins</SelectItem>
                                                                        <SelectItem value="90">90 mins</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground flex-1 italic">Unavailable</p>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <div className="flex justify-end pt-4">
                                        <Button onClick={handleSaveConsultant} disabled={consultantLoading || consultantSaving} className="gap-2">
                                            <Save className="w-4 h-4" />
                                            {consultantSaving ? "Saving..." : "Save Consultant Override"}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
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
                const { data, error } = await supabase
                    .from("session_types")
                    .select("*")
                    .eq("organization_id", organizationId)
                    .order("name");

                if (error) {
                    console.warn("DB unavailable for session_types, using local storage:", error.message);
                    return getLocalTypes();
                }

                return (data && data.length > 0) ? data : getLocalTypes();
            } catch {
                return getLocalTypes();
            }
        },
        enabled: !!organizationId
    });

    const addMutation = useMutation({
        mutationFn: async (name: string) => {
            // Try DB first
            const { error } = await supabase
                .from("session_types")
                .insert({ organization_id: organizationId, name });
            if (error) {
                // DB unavailable — add locally instead
                console.warn("DB insert failed, saving locally:", error.message);
                const current = getLocalTypes();
                if (current.some(t => t.name.toLowerCase() === name.toLowerCase())) {
                    throw new Error("A session type with that name already exists.");
                }
                current.push({ id: `local-${Date.now()}`, name, category: "General" });
                saveLocalTypes(current);
                return; // success via local
            }
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
                // Local-only type — remove from localStorage
                const current = getLocalTypes();
                saveLocalTypes(current.filter(t => t.id !== id));
                return;
            }
            const { error } = await supabase
                .from("session_types")
                .delete()
                .eq("id", id);
            if (error) {
                // DB unavailable — remove locally
                console.warn("DB delete failed, removing locally:", error.message);
                const current = getLocalTypes();
                saveLocalTypes(current.filter(t => t.id !== id));
            }
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
