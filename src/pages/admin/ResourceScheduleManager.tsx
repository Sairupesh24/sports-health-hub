import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
    Clock, 
    ArrowLeft, 
    Plus, 
    Trash2, 
    Save, 
    Loader2, 
    Search, 
    CalendarDays,
    Coffee
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminAvailability from "./AdminAvailability";

interface Clinician {
    id: string;
    name: string;
    profession: string | null;
    role: string;
}

interface BreakBlock {
    name: string;
    start_time: string;
    end_time: string;
}

interface BreaksState {
    all: BreakBlock[];
    "0": BreakBlock[];
    "1": BreakBlock[];
    "2": BreakBlock[];
    "3": BreakBlock[];
    "4": BreakBlock[];
    "5": BreakBlock[];
    "6": BreakBlock[];
}

export default function ResourceScheduleManager() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const { toast } = useToast();

    // Data lists
    const [clinicians, setClinicians] = useState<Clinician[]>([]);
    const [selectedClinicianId, setSelectedClinicianId] = useState<string | null>(null);
    
    // Page state
    const [loadingClinicians, setLoadingClinicians] = useState(true);
    const [loadingSchedule, setLoadingSchedule] = useState(false);
    const [saving, setSaving] = useState(false);
    const [clinicianSearch, setClinicianSearch] = useState("");

    // Form settings state
    const [shiftStart, setShiftStart] = useState("08:00");
    const [shiftEnd, setShiftEnd] = useState("17:00");
    const [applySameBreaks, setApplySameBreaks] = useState(true);
    const [activeDayTab, setActiveDayTab] = useState("1"); // Default: Monday (1)
    
    const [breaks, setBreaks] = useState<BreaksState>({
        all: [],
        "0": [], // Sunday
        "1": [], // Monday
        "2": [], // Tuesday
        "3": [], // Wednesday
        "4": [], // Thursday
        "5": [], // Friday
        "6": []  // Saturday
    });

    const DAYS = [
        { value: "0", label: "Sunday" },
        { value: "1", label: "Monday" },
        { value: "2", label: "Tuesday" },
        { value: "3", label: "Wednesday" },
        { value: "4", label: "Thursday" },
        { value: "5", label: "Friday" },
        { value: "6", label: "Saturday" }
    ];

    // Fetch clinical employees on load
    useEffect(() => {
        if (profile?.organization_id) {
            fetchClinicians();
        }
    }, [profile?.organization_id]);

    const fetchClinicians = async () => {
        setLoadingClinicians(true);
        try {
            const employees = await apiFetch<any[]>('/hr/employees', {
                params: { role_type: 'clinical' }
            });
            setClinicians((employees || []).map((p: any) => ({
                id: p.id,
                name: `${p.first_name} ${p.last_name}`,
                profession: p.profession,
                role: p.role || 'consultant',
            })));
        } catch (err: any) {
            toast({
                title: "Error",
                description: err.message || "Failed to load clinicians.",
                variant: "destructive"
            });
        } finally {
            setLoadingClinicians(false);
        }
    };

    // Load clinician schedule when selection changes
    useEffect(() => {
        if (selectedClinicianId) {
            fetchClinicianSchedule(selectedClinicianId);
        }
    }, [selectedClinicianId]);

    const fetchClinicianSchedule = async (id: string) => {
        setLoadingSchedule(true);
        try {
            const data = await apiFetch<any>(`/hr/staff-schedules/${id}`);
            if (data) {
                setShiftStart(data.shift_start ? data.shift_start.slice(0, 5) : "08:00");
                setShiftEnd(data.shift_end ? data.shift_end.slice(0, 5) : "17:00");
                
                const loadedBreaks = data.breaks || {};
                
                const formatBreaksList = (list: any[]) => {
                    return (list || []).map((b: any) => ({
                        name: b.name || "Break",
                        start_time: b.start_time ? b.start_time.slice(0, 5) : "13:00",
                        end_time: b.end_time ? b.end_time.slice(0, 5) : "14:00"
                    }));
                };

                if (Array.isArray(loadedBreaks)) {
                    setApplySameBreaks(true);
                    setBreaks({
                        all: formatBreaksList(loadedBreaks),
                        "0": [], "1": [], "2": [], "3": [], "4": [], "5": [], "6": []
                    });
                } else if (loadedBreaks.all) {
                    setApplySameBreaks(true);
                    setBreaks({
                        all: formatBreaksList(loadedBreaks.all),
                        "0": [], "1": [], "2": [], "3": [], "4": [], "5": [], "6": []
                    });
                } else {
                    setApplySameBreaks(false);
                    setBreaks({
                        all: [],
                        "0": formatBreaksList(loadedBreaks["0"]),
                        "1": formatBreaksList(loadedBreaks["1"]),
                        "2": formatBreaksList(loadedBreaks["2"]),
                        "3": formatBreaksList(loadedBreaks["3"]),
                        "4": formatBreaksList(loadedBreaks["4"]),
                        "5": formatBreaksList(loadedBreaks["5"]),
                        "6": formatBreaksList(loadedBreaks["6"])
                    });
                }
            } else {
                // Fallback to default
                resetScheduleToDefaults();
            }
        } catch (err: any) {
            // If none exists, default to Shift Start: 08:00, Shift End: 17:00, and no breaks
            resetScheduleToDefaults();
        } finally {
            setLoadingSchedule(false);
        }
    };

    const resetScheduleToDefaults = () => {
        setShiftStart("08:00");
        setShiftEnd("17:00");
        setApplySameBreaks(true);
        setBreaks({
            all: [],
            "0": [], "1": [], "2": [], "3": [], "4": [], "5": [], "6": []
        });
    };

    // Break Block management functions
    const addBreakBlock = () => {
        const key = applySameBreaks ? "all" : activeDayTab;
        const newBlock: BreakBlock = { name: "Break", start_time: "13:00", end_time: "14:00" };
        setBreaks(prev => ({
            ...prev,
            [key]: [...(prev[key] || []), newBlock]
        }));
    };

    const deleteBreakBlock = (index: number) => {
        const key = applySameBreaks ? "all" : activeDayTab;
        setBreaks(prev => ({
            ...prev,
            [key]: (prev[key] || []).filter((_, i) => i !== index)
        }));
    };

    const updateBreakBlock = (index: number, field: keyof BreakBlock, value: string) => {
        const key = applySameBreaks ? "all" : activeDayTab;
        setBreaks(prev => {
            const list = [...(prev[key] || [])];
            list[index] = { ...list[index], [field]: value };
            return {
                ...prev,
                [key]: list
            };
        });
    };

    const handleSave = async () => {
        if (!selectedClinicianId) return;
        setSaving(true);
        try {
            let constructedBreaks: any = {};
            if (applySameBreaks) {
                constructedBreaks = {
                    all: breaks.all || []
                };
            } else {
                constructedBreaks = {
                    "0": breaks["0"] || [],
                    "1": breaks["1"] || [],
                    "2": breaks["2"] || [],
                    "3": breaks["3"] || [],
                    "4": breaks["4"] || [],
                    "5": breaks["5"] || [],
                    "6": breaks["6"] || []
                };
            }

            await apiFetch('/hr/staff-schedules', {
                method: 'POST',
                data: {
                    consultant_id: selectedClinicianId,
                    shift_start: shiftStart,
                    shift_end: shiftEnd,
                    breaks: constructedBreaks
                }
            });

            // Also sync shift windows to bulk availability table for all days of the week
            const bulkSchedules = [0, 1, 2, 3, 4, 5, 6].map(dayId => ({
                day_of_week: dayId,
                start_time: shiftStart.length === 5 ? `${shiftStart}:00` : shiftStart,
                end_time: shiftEnd.length === 5 ? `${shiftEnd}:00` : shiftEnd,
                is_active: true
            }));

            try {
                await apiFetch('/appointments/availability/bulk-update', {
                    method: 'POST',
                    data: {
                        consultant_id: selectedClinicianId,
                        schedules: bulkSchedules
                    }
                });
            } catch (bulkErr) {
                console.warn("Sync to bulk availability warning:", bulkErr);
            }

            toast({
                title: "Schedule Saved",
                description: "Shift and break windows updated and saved successfully."
            });
        } catch (err: any) {
            toast({
                title: "Save Failed",
                description: err.message || "An error occurred while saving the schedule.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const filteredClinicians = useMemo(() => {
        const q = clinicianSearch.toLowerCase().trim();
        if (!q) return clinicians;
        return clinicians.filter(c =>
            c.name.toLowerCase().includes(q) ||
            (c.profession || '').toLowerCase().includes(q)
        );
    }, [clinicians, clinicianSearch]);

    const selectedClinician = clinicians.find(c => c.id === selectedClinicianId);

    const activeKey = applySameBreaks ? "all" : activeDayTab;
    const activeBlocks = breaks[activeKey] || [];

    if (loadingClinicians) {
        return (
            <DashboardLayout role="admin">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="admin">
            <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-6 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/admin/settings")} className="rounded-xl">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Resource Schedule Manager</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Configure working hours and shift break windows for clinicians.</p>
                    </div>
                </div>

                <Tabs defaultValue="shifts" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-xl bg-slate-100/80 p-1 rounded-2xl mb-6">
                        <TabsTrigger value="shifts" className="rounded-xl font-bold py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                            Shift & Break Windows
                        </TabsTrigger>
                        <TabsTrigger value="availability" className="rounded-xl font-bold py-2.5 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                            Weekly Availability & Session Types
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="shifts" className="mt-0 outline-none">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Left Column: Clinicians List */}
                            <div className="lg:col-span-4 space-y-3">
                                <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
                                    <CardHeader className="pb-3 border-b border-slate-50">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-primary" />
                                            Clinicians
                                        </CardTitle>
                                        <CardDescription className="text-xs">Select a specialist to edit their schedule</CardDescription>
                                        <div className="relative mt-2">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <Input
                                                placeholder="Filter clinicians..."
                                                className="pl-10 h-10 bg-slate-50 border-slate-200 rounded-xl text-xs"
                                                value={clinicianSearch}
                                                onChange={(e) => setClinicianSearch(e.target.value)}
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="max-h-[50vh] overflow-y-auto">
                                            {filteredClinicians.map((clinician) => {
                                                const isSelected = selectedClinicianId === clinician.id;
                                                return (
                                                    <button
                                                        key={clinician.id}
                                                        onClick={() => {
                                                            setSelectedClinicianId(clinician.id);
                                                        }}
                                                        className={cn(
                                                            "w-full text-left px-5 py-4 flex items-center justify-between border-b border-slate-50 transition-all duration-200 group",
                                                            isSelected
                                                                ? "bg-primary/5 border-l-4 border-l-primary"
                                                                : "hover:bg-slate-50/80 border-l-4 border-l-transparent"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className={cn(
                                                                "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0 transition-colors",
                                                                isSelected 
                                                                    ? "bg-primary text-white" 
                                                                    : "bg-slate-100 text-slate-500"
                                                            )}>
                                                                {clinician.name.split(' ').map(w => w[0]).join('').substring(0, 2)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className={cn(
                                                                    "text-sm font-semibold truncate",
                                                                    isSelected ? "text-primary" : "text-slate-900"
                                                                )}>
                                                                    {clinician.name}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mt-0.5">
                                                                    {clinician.profession || clinician.role}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                            {filteredClinicians.length === 0 && (
                                                <div className="p-8 text-center text-muted-foreground">
                                                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                                    <p className="text-xs font-bold uppercase tracking-wider">No Clinicians Found</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column: Schedule Settings */}
                            <div className="lg:col-span-8">
                                {!selectedClinicianId ? (
                                    <Card className="border-none shadow-xl bg-white p-16 text-center rounded-2xl h-full flex flex-col justify-center items-center">
                                        <CalendarDays className="w-12 h-12 text-slate-200 mb-4" />
                                        <h3 className="text-lg font-bold text-slate-900">Select a Clinician</h3>
                                        <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm">
                                            Choose a clinician from the left panel to configure their daily shift windows and breaks.
                                        </p>
                                    </Card>
                                ) : (
                                    <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
                                        <CardHeader className="border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            <div>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Clock className="w-5 h-5 text-primary" />
                                                    {selectedClinician?.name}
                                                </CardTitle>
                                                <CardDescription className="mt-1">
                                                    Manage shift hours and break schedules.
                                                </CardDescription>
                                            </div>
                                            <Button
                                                onClick={handleSave}
                                                disabled={saving || loadingSchedule}
                                                className="gap-2 rounded-xl font-bold bg-primary shadow-lg shadow-primary/10 hover:shadow-primary/20 shrink-0 self-start sm:self-center"
                                            >
                                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                Save Schedule
                                            </Button>
                                        </CardHeader>

                                        <CardContent className="p-6 space-y-6">
                                            {loadingSchedule ? (
                                                <div className="flex items-center justify-center h-48">
                                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Shift Windows Section */}
                                                    <div className="space-y-4">
                                                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">1. Shift Windows</h3>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs font-semibold text-slate-600">Shift Start Time</Label>
                                                                <input
                                                                    type="time"
                                                                    value={shiftStart}
                                                                    onChange={(e) => setShiftStart(e.target.value)}
                                                                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs font-semibold text-slate-600">Shift End Time</Label>
                                                                <input
                                                                    type="time"
                                                                    value={shiftEnd}
                                                                    onChange={(e) => setShiftEnd(e.target.value)}
                                                                    className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Breaks Configuration */}
                                                    <div className="space-y-4 pt-4 border-t border-slate-50">
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                            <div>
                                                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">2. Break Schedule</h3>
                                                                <p className="text-xs text-muted-foreground mt-0.5">Specify times when bookings cannot be scheduled.</p>
                                                            </div>
                                                            <Button 
                                                                onClick={addBreakBlock} 
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-1.5 rounded-xl border-dashed border-slate-300 font-semibold self-start sm:self-center"
                                                            >
                                                                <Plus className="w-4 h-4 text-primary" />
                                                                Add Break
                                                            </Button>
                                                        </div>

                                                        {/* Toggle Mode */}
                                                        <div className="flex items-center justify-between p-4 bg-slate-50/80 border border-slate-100 rounded-2xl">
                                                            <div className="space-y-0.5">
                                                                <Label className="text-sm font-bold text-slate-800">Apply same breaks to all days</Label>
                                                                <p className="text-xs text-slate-500">Disable to configure specific breaks for separate weekdays.</p>
                                                            </div>
                                                            <Switch 
                                                                checked={applySameBreaks}
                                                                onCheckedChange={(checked) => setApplySameBreaks(checked)}
                                                            />
                                                        </div>

                                                        {/* Day-specific tabs selector */}
                                                        {!applySameBreaks && (
                                                            <div className="flex flex-wrap gap-1 p-1.5 bg-slate-100/60 border border-slate-100 rounded-2xl animate-in slide-in-from-top-2 duration-300">
                                                                {DAYS.map((day) => {
                                                                    const isActive = activeDayTab === day.value;
                                                                    const count = breaks[day.value as keyof BreaksState]?.length || 0;
                                                                    return (
                                                                        <button
                                                                            key={day.value}
                                                                            type="button"
                                                                            onClick={() => setActiveDayTab(day.value)}
                                                                            className={cn(
                                                                                "flex-1 min-w-[65px] text-xs font-semibold py-2.5 px-1.5 rounded-xl transition-all text-center flex flex-col items-center justify-center",
                                                                                isActive 
                                                                                    ? "bg-white text-primary shadow-sm ring-1 ring-slate-100" 
                                                                                    : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
                                                                            )}
                                                                        >
                                                                            <span>{day.label.slice(0, 3)}</span>
                                                                            {count > 0 && (
                                                                                <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/15 border-none h-4 px-1 text-[8px] font-black rounded-md mt-0.5">
                                                                                    {count}
                                                                                </Badge>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}

                                                        {/* Break Blocks List */}
                                                        <div className="space-y-3 pt-2">
                                                            {activeBlocks.map((block, index) => (
                                                                <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl animate-in fade-in duration-200">
                                                                    <div className="flex-1 space-y-1">
                                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Label</Label>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="e.g. Lunch Break"
                                                                            value={block.name}
                                                                            onChange={(e) => updateBreakBlock(index, 'name', e.target.value)}
                                                                            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                                                        />
                                                                    </div>
                                                                    <div className="w-full sm:w-[130px] space-y-1">
                                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Start Time</Label>
                                                                        <input
                                                                            type="time"
                                                                            value={block.start_time}
                                                                            onChange={(e) => updateBreakBlock(index, 'start_time', e.target.value)}
                                                                            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                                                        />
                                                                    </div>
                                                                    <div className="w-full sm:w-[130px] space-y-1">
                                                                        <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">End Time</Label>
                                                                        <input
                                                                            type="time"
                                                                            value={block.end_time}
                                                                            onChange={(e) => updateBreakBlock(index, 'end_time', e.target.value)}
                                                                            className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                                                        />
                                                                    </div>
                                                                    <div className="sm:self-end pt-2 sm:pt-0">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => deleteBreakBlock(index)}
                                                                            className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-xl"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {activeBlocks.length === 0 && (
                                                                <div className="p-8 border border-dashed rounded-2xl flex flex-col items-center justify-center text-center space-y-2 bg-slate-50/20">
                                                                    <Coffee className="w-8 h-8 text-slate-300" />
                                                                    <p className="text-xs text-slate-500 font-medium">No breaks configured for this {applySameBreaks ? "schedule" : "day"}.</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="availability" className="mt-0 outline-none">
                        <AdminAvailability hideLayout />
                    </TabsContent>
                </Tabs>
            </div>
        </DashboardLayout>
    );
}
