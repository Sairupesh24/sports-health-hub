import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Settings, ArrowLeft, Link2, Save, Loader2, Search, UserCheck, Layers, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Service {
    id: string;
    name: string;
    category: string | null;
}

interface Specialist {
    id: string;
    name: string;
    profession: string | null;
    role: string;
}

interface Mapping {
    consultant_id: string;
    service_id: string;
    first_name: string;
    last_name: string;
    profession: string;
    service_name: string;
}

export default function ServiceMapping() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [services, setServices] = useState<Service[]>([]);
    const [specialists, setSpecialists] = useState<Specialist[]>([]);
    const [mappings, setMappings] = useState<Mapping[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
    const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [specialistSearch, setSpecialistSearch] = useState("");
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        if (profile?.organization_id) fetchAll();
    }, [profile?.organization_id]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [servicesData, specialistsData, mappingsData] = await Promise.all([
                apiFetch<any[]>('/billing/services', { params: { is_active: true } }),
                apiFetch<any[]>('/hr/employees', { params: { role_type: 'clinical' } }),
                apiFetch<Mapping[]>('/admin/consultant-services'),
            ]);

            setServices(servicesData || []);
            setSpecialists((specialistsData || []).map((p: any) => ({
                id: p.id,
                name: `${p.first_name} ${p.last_name}`,
                profession: p.profession,
                role: p.role || 'consultant',
            })));
            setMappings(mappingsData || []);
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    // When a service is selected, populate the assigned set from existing mappings
    useEffect(() => {
        if (selectedServiceId) {
            const ids = mappings.filter(m => m.service_id === selectedServiceId).map(m => m.consultant_id);
            setAssignedIds(new Set(ids));
            setHasUnsavedChanges(false);
        }
    }, [selectedServiceId, mappings]);

    const toggleSpecialist = (specId: string) => {
        setAssignedIds(prev => {
            const next = new Set(prev);
            if (next.has(specId)) {
                next.delete(specId);
            } else {
                next.add(specId);
            }
            return next;
        });
        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        if (!selectedServiceId) return;
        setSaving(true);
        try {
            await apiFetch('/admin/consultant-services', {
                method: 'POST',
                data: {
                    service_id: selectedServiceId,
                    consultant_ids: Array.from(assignedIds),
                },
            });

            // Refresh mappings
            const updatedMappings = await apiFetch<Mapping[]>('/admin/consultant-services');
            setMappings(updatedMappings || []);
            setHasUnsavedChanges(false);

            toast({ title: "Saved", description: "Service mapping updated successfully." });
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const selectedService = services.find(s => s.id === selectedServiceId);

    const filteredSpecialists = useMemo(() => {
        const q = specialistSearch.toLowerCase().trim();
        if (!q) return specialists;
        return specialists.filter(s =>
            s.name.toLowerCase().includes(q) ||
            (s.profession || '').toLowerCase().includes(q)
        );
    }, [specialists, specialistSearch]);

    // Compute per-service assigned count from mappings
    const serviceMappingCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        mappings.forEach(m => {
            counts[m.service_id] = (counts[m.service_id] || 0) + 1;
        });
        return counts;
    }, [mappings]);

    if (loading) {
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
                    <Button variant="ghost" size="icon" onClick={() => navigate("/admin/settings")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Service Mapping</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Assign which specialists are qualified for each service</p>
                    </div>
                    {hasUnsavedChanges && selectedServiceId && (
                        <Button 
                            onClick={handleSave} 
                            disabled={saving} 
                            className="gap-2 min-w-[140px] h-11 rounded-xl bg-primary shadow-lg shadow-primary/20 font-bold"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Mapping
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Panel: Service List */}
                    <div className="lg:col-span-4 space-y-3">
                        <Card className="border-none shadow-xl bg-white overflow-hidden rounded-xl">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-primary" />
                                    Services
                                </CardTitle>
                                <CardDescription className="text-xs">Select a service to manage its specialists</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="max-h-[60vh] overflow-y-auto">
                                    {services.map((service) => {
                                        const isSelected = selectedServiceId === service.id;
                                        const count = serviceMappingCounts[service.id] || 0;
                                        return (
                                            <button
                                                key={service.id}
                                                onClick={() => { 
                                                    setSelectedServiceId(service.id); 
                                                    setSpecialistSearch(""); 
                                                }}
                                                className={cn(
                                                    "w-full text-left px-5 py-4 flex items-center justify-between border-b border-slate-50 transition-all duration-200 group",
                                                    isSelected
                                                        ? "bg-primary/5 border-l-4 border-l-primary"
                                                        : "hover:bg-slate-50/80 border-l-4 border-l-transparent"
                                                )}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn(
                                                        "text-sm font-semibold truncate",
                                                        isSelected ? "text-primary" : "text-slate-900"
                                                    )}>
                                                        {service.name}
                                                    </p>
                                                    {service.category && (
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium mt-0.5">
                                                            {service.category}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge 
                                                    variant={count > 0 ? "secondary" : "outline"} 
                                                    className={cn(
                                                        "text-[10px] font-bold ml-3 shrink-0 min-w-[28px] justify-center",
                                                        count > 0 
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                                            : "bg-orange-50 text-orange-500 border-orange-200"
                                                    )}
                                                >
                                                    {count}
                                                </Badge>
                                            </button>
                                        );
                                    })}
                                    {services.length === 0 && (
                                        <div className="p-8 text-center text-muted-foreground">
                                            <Layers className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-xs font-bold uppercase tracking-wider">No active services</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Panel: Specialist Assignment */}
                    <div className="lg:col-span-8">
                        {!selectedServiceId ? (
                            <Card className="border-none shadow-xl bg-white p-16 text-center rounded-xl">
                                <Link2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-slate-900">Select a Service</h3>
                                <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm">
                                    Choose a service from the left panel to view and manage which specialists are qualified to provide it.
                                </p>
                            </Card>
                        ) : (
                            <Card className="border-none shadow-xl bg-white overflow-hidden rounded-xl">
                                <CardHeader className="border-b border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <UserCheck className="w-5 h-5 text-primary" />
                                                {selectedService?.name}
                                            </CardTitle>
                                            <CardDescription className="mt-1">
                                                Toggle specialists who can deliver this service. {assignedIds.size} specialist{assignedIds.size !== 1 ? 's' : ''} assigned.
                                            </CardDescription>
                                        </div>
                                        {hasUnsavedChanges && (
                                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 animate-pulse text-[10px] font-bold uppercase">
                                                Unsaved
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="relative mt-3">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="Filter specialists..."
                                            className="pl-10 h-10 bg-slate-50 border-slate-200"
                                            value={specialistSearch}
                                            onChange={(e) => setSpecialistSearch(e.target.value)}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="max-h-[55vh] overflow-y-auto divide-y divide-slate-50">
                                        {filteredSpecialists.map((spec) => {
                                            const isAssigned = assignedIds.has(spec.id);
                                            return (
                                                <div
                                                    key={spec.id}
                                                    className={cn(
                                                        "flex items-center justify-between px-5 py-4 transition-all duration-200 cursor-pointer group",
                                                        isAssigned 
                                                            ? "bg-emerald-50/40 hover:bg-emerald-50/60" 
                                                            : "hover:bg-slate-50/80"
                                                    )}
                                                    onClick={() => toggleSpecialist(spec.id)}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className={cn(
                                                            "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0 transition-colors",
                                                            isAssigned 
                                                                ? "bg-emerald-100 text-emerald-700" 
                                                                : "bg-slate-100 text-slate-500"
                                                        )}>
                                                            {spec.name.split(' ').map(w => w[0]).join('').substring(0, 2)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-slate-900 truncate">{spec.name}</p>
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                                                                {spec.profession || spec.role}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0">
                                                        {isAssigned && (
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                        )}
                                                        <Switch 
                                                            checked={isAssigned} 
                                                            onCheckedChange={() => toggleSpecialist(spec.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {filteredSpecialists.length === 0 && (
                                            <div className="p-12 text-center">
                                                <UserCheck className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                    No specialists match your search
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                                
                                {/* Sticky Save Footer */}
                                {hasUnsavedChanges && (
                                    <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex items-center gap-2 text-amber-600">
                                            <AlertCircle className="w-4 h-4" />
                                            <span className="text-xs font-semibold">You have unsaved changes</span>
                                        </div>
                                        <Button 
                                            onClick={handleSave} 
                                            disabled={saving} 
                                            size="sm"
                                            className="gap-2 rounded-lg font-bold"
                                        >
                                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                            Save
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
