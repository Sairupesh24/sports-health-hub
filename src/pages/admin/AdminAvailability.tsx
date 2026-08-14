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

const CLINICAL_ROLES = ["consultant", "sports_physician", "physiotherapist", "nutritionist", "sports_scientist", "massage_therapist"];

export default function AdminAvailability({ hideLayout = false }: { hideLayout?: boolean }) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allowCustom, setAllowCustom] = useState(false);
    const [defaultDuration, setDefaultDuration] = useState("60");

    useEffect(() => {
        async function loadSettings() {
            if (!profile?.organization_id) return;
            try {
                const data = await apiFetch<any>(`/organizations/${profile.organization_id}/settings`);
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

    const handleSaveGlobal = async () => {
        if (!profile?.organization_id) return;
        setSaving(true);
        try {
            const durationNum = parseInt(defaultDuration, 10);
            if (isNaN(durationNum) || durationNum < 5 || durationNum > 480) {
                throw new Error("Default slot duration must be a valid number between 5 and 480 minutes.");
            }

            await apiFetch(`/organizations/${profile.organization_id}/settings`, {
                method: 'PATCH',
                data: {
                    allow_custom_duration: allowCustom,
                    default_slot_duration: durationNum
                }
            });

            toast({ title: "Settings Saved", description: "Organization scheduling preferences updated successfully." });
        } catch (err: any) {
            toast({ title: "Error Saving", description: err.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const content = (
        <div className={`space-y-6 max-w-5xl mx-auto ${hideLayout ? 'pb-2' : 'pb-10'}`}>
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Organization Availability & Settings</h1>
                <p className="text-muted-foreground text-sm mt-1">Manage global duration settings and session categories</p>
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
                                    <Label className="text-base">Allow Custom Specialist Durations</Label>
                                    <p className="text-sm text-muted-foreground">
                                        If enabled, Specialists can freely define their own specific appointment durations.
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
