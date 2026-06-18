import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
    Settings,
    ArrowLeft,
    Layers,
    UserCheck,
    Plus,
    Search,
    Save,
    Loader2,
    Edit2,
    Trash2,
    Check,
    X,
    ChevronDown,
    Award
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Service {
    id: string;
    name: string;
    category: string | null;
    base_price: number | string;
    min_duration: number;
    max_duration: number;
    is_universal: boolean;
    is_active: boolean;
}

interface Consultant {
    id: string;
    first_name: string;
    last_name: string;
    profession: string | null;
    email: string;
    role: string;
    service_ids: string[];
}

export default function ServiceMapping() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    
    // Core State
    const [services, setServices] = useState<Service[]>([]);
    const [consultants, setConsultants] = useState<Consultant[]>([]);
    const [selectedConsultantId, setSelectedConsultantId] = useState<string | null>(null);
    const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([]);
    
    // Search/Filter State
    const [serviceSearch, setServiceSearch] = useState("");
    const [consultantSearch, setConsultantSearch] = useState("");
    
    // Loading State
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Dialog State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    
    // Form State
    const [formData, setFormData] = useState({
        name: "",
        category: "General",
        base_price: "0",
        min_duration: 30,
        max_duration: 60,
        is_universal: true,
        is_active: true
    });

    const isPremiumSession = (name: string) => {
        const n = name.toLowerCase();
        return n.includes("assessment") || n.includes("testing") || n.includes("diagnostic") || n.includes("device") || n.includes("elite");
    };

    useEffect(() => {
        if (profile?.organization_id) {
            fetchData();
        }
    }, [profile?.organization_id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [servicesData, consultantsData] = await Promise.all([
                apiFetch<Service[]>('/billing/services'),
                apiFetch<Consultant[]>('/admin/consultants')
            ]);
            setServices(servicesData || []);
            setConsultants(consultantsData || []);
            
            // If there are consultants, select the first one by default
            if (consultantsData && consultantsData.length > 0 && !selectedConsultantId) {
                const firstId = consultantsData[0].id;
                setSelectedConsultantId(firstId);
                setAssignedServiceIds(consultantsData[0].service_ids || []);
            }
        } catch (err: any) {
            toast({
                title: "Error loading config",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSelectConsultant = (consultant: Consultant) => {
        setSelectedConsultantId(consultant.id);
        setAssignedServiceIds(consultant.service_ids || []);
    };

    const handleToggleServiceForConsultant = (serviceId: string) => {
        setAssignedServiceIds(prev => {
            if (prev.includes(serviceId)) {
                return prev.filter(id => id !== serviceId);
            } else {
                return [...prev, serviceId];
            }
        });
    };

    const handleSaveOverrides = async () => {
        if (!selectedConsultantId) return;
        setSaving(true);
        try {
            await apiFetch(`/admin/consultants/${selectedConsultantId}/services`, {
                method: 'POST',
                data: {
                    service_ids: assignedServiceIds
                }
            });
            toast({
                title: "Permitted Services Updated",
                description: "Overwrites successfully saved and logged to audit ledger."
            });
            
            // Refresh data to synchronize state
            const updatedConsultants = await apiFetch<Consultant[]>('/admin/consultants');
            setConsultants(updatedConsultants || []);
        } catch (err: any) {
            toast({
                title: "Failed to save updates",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    // Global Service config handlers
    const handleOpenCreate = () => {
        setFormData({
            name: "",
            category: "General",
            base_price: "0",
            min_duration: 30,
            max_duration: 60,
            is_universal: true,
            is_active: true
        });
        setIsCreateOpen(true);
    };

    const handleOpenEdit = (service: Service) => {
        setSelectedService(service);
        setFormData({
            name: service.name,
            category: service.category || "General",
            base_price: service.base_price.toString(),
            min_duration: service.min_duration || 30,
            max_duration: service.max_duration || 60,
            is_universal: service.is_universal ?? true,
            is_active: service.is_active ?? true
        });
        setIsEditOpen(true);
    };

    const handleCreateService = async () => {
        if (!formData.name.trim()) {
            toast({ title: "Name is required", variant: "destructive" });
            return;
        }
        try {
            await apiFetch('/admin/services', {
                method: 'POST',
                data: formData
            });
            toast({ title: "Service Created", description: "The custom session type has been configured." });
            setIsCreateOpen(false);
            fetchData();
        } catch (err: any) {
            toast({ title: "Failed to create service", description: err.message, variant: "destructive" });
        }
    };

    const handleUpdateService = async () => {
        if (!selectedService) return;
        try {
            await apiFetch(`/admin/services/${selectedService.id}`, {
                method: 'PATCH',
                data: formData
            });
            toast({ title: "Service Updated", description: "Service configuration changes saved successfully." });
            setIsEditOpen(false);
            fetchData();
        } catch (err: any) {
            toast({ title: "Failed to update service", description: err.message, variant: "destructive" });
        }
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm("Are you sure you want to delete this session type? If active sessions use it, it will be deactivated instead.")) return;
        try {
            const res = await apiFetch<any>(`/admin/services/${id}`, {
                method: 'DELETE'
            });
            toast({ 
                title: "Action completed", 
                description: res.message || "Session type deleted successfully." 
            });
            fetchData();
        } catch (err: any) {
            toast({ title: "Failed to delete service", description: err.message, variant: "destructive" });
        }
    };

    // Filters
    const filteredServices = useMemo(() => {
        const q = serviceSearch.toLowerCase().trim();
        return services.filter(s => 
            s.name.toLowerCase().includes(q) || 
            (s.category || '').toLowerCase().includes(q)
        );
    }, [services, serviceSearch]);

    const filteredConsultants = useMemo(() => {
        const q = consultantSearch.toLowerCase().trim();
        return consultants.filter(c => 
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
            (c.profession || '').toLowerCase().includes(q)
        );
    }, [consultants, consultantSearch]);

    const selectedConsultant = consultants.find(c => c.id === selectedConsultantId);

    const activeServicesList = useMemo(() => {
        return services.filter(s => s.is_active);
    }, [services]);

    const renderServiceConfigurator = () => (
        <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-2xl overflow-hidden h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                            <Layers className="w-5 h-5 text-primary" />
                            Global Service Configurator
                        </CardTitle>
                        <CardDescription className="text-xs">Create and edit base pricing, duration, and visibility bounds</CardDescription>
                    </div>
                    <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 h-9 rounded-xl font-bold">
                        <Plus className="w-4 h-4" /> Add Custom
                    </Button>
                </div>
                <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search services/categories..."
                        className="pl-9 h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        value={serviceSearch}
                        onChange={(e) => setServiceSearch(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[65vh]">
                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredServices.map(service => {
                        const isPremium = isPremiumSession(service.name);
                        return (
                            <div 
                                key={service.id} 
                                className={cn(
                                    "p-4 transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/30 flex items-center justify-between border-l-4",
                                    isPremium ? "border-l-amber-500 bg-amber-500/[0.01]" : "border-l-transparent",
                                    !service.is_active && "opacity-50"
                                )}
                            >
                                <div className="min-w-0 flex-1 pr-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{service.name}</span>
                                        {isPremium && (
                                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300/40 hover:bg-amber-100 flex gap-0.5 items-center px-1.5 py-0.2 text-[9px] font-bold">
                                                <Award className="w-3 h-3" /> Elite
                                            </Badge>
                                        )}
                                        {!service.is_active && (
                                            <Badge variant="secondary" className="text-[9px] font-bold">Inactive</Badge>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-400">
                                        <span className="font-bold uppercase tracking-wider text-primary text-[9px]">{service.category || 'General'}</span>
                                        <span>•</span>
                                        <span>₹{parseFloat(service.base_price as string || "0").toLocaleString()}</span>
                                        <span>•</span>
                                        <span>{service.min_duration}-{service.max_duration} mins</span>
                                        <span>•</span>
                                        <span>{service.is_universal ? 'Universal' : 'Role-specific'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleOpenEdit(service)}
                                        className="h-8 w-8 text-slate-500 hover:text-primary rounded-lg"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleDeleteService(service.id)}
                                        className="h-8 w-8 text-slate-400 hover:text-red-500 rounded-lg"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                    {filteredServices.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                            <Layers className="w-8 h-8 mx-auto mb-2 opacity-25" />
                            <p className="text-xs font-bold uppercase tracking-wider">No service configurations found</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    const renderStaffMatrix = () => (
        <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-2xl overflow-hidden h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                            <UserCheck className="w-5 h-5 text-primary" />
                            Staff Override Matrix
                        </CardTitle>
                        <CardDescription className="text-xs">Select a specialist and toggle their permitted session capacities</CardDescription>
                    </div>
                </div>
                <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search clinic practitioners..."
                        className="pl-9 h-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        value={consultantSearch}
                        onChange={(e) => setConsultantSearch(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 grid grid-cols-1 md:grid-cols-5 divide-x divide-slate-100 dark:divide-slate-800 min-h-[60vh] max-h-[70vh]">
                {/* Column A: Practitioner List */}
                <div className="md:col-span-2 overflow-y-auto max-h-[70vh] divide-y divide-slate-50 dark:divide-slate-800">
                    {filteredConsultants.map(c => {
                        const isSelected = selectedConsultantId === c.id;
                        return (
                            <button
                                key={c.id}
                                onClick={() => handleSelectConsultant(c)}
                                className={cn(
                                    "w-full text-left p-4 flex items-center justify-between transition-all duration-200",
                                    isSelected 
                                        ? "bg-primary/5 dark:bg-primary/10 border-r-4 border-r-primary" 
                                        : "hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                                )}
                            >
                                <div className="min-w-0">
                                    <p className={cn("text-sm font-semibold truncate", isSelected ? "text-primary" : "text-slate-900 dark:text-slate-100")}>
                                        {c.first_name} {c.last_name}
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-medium tracking-wider mt-0.5">
                                        {c.profession || c.role}
                                    </p>
                                </div>
                                <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px]">
                                    {c.service_ids?.length || 0} services
                                </Badge>
                            </button>
                        );
                    })}
                    {filteredConsultants.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground">
                            <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-25" />
                            <p className="text-xs font-bold uppercase tracking-wider">No clinical staff found</p>
                        </div>
                    )}
                </div>

                {/* Column B: Permission Panel */}
                <div className="md:col-span-3 p-5 overflow-y-auto max-h-[70vh] flex flex-col justify-between">
                    {selectedConsultant ? (
                        <div className="space-y-5 h-full flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase">
                                        {selectedConsultant.first_name[0]}{selectedConsultant.last_name[0]}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                            {selectedConsultant.first_name} {selectedConsultant.last_name}
                                        </h3>
                                        <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5 tracking-wider">
                                            {selectedConsultant.profession || selectedConsultant.role} • {selectedConsultant.email}
                                        </p>
                                    </div>
                                </div>
                                <Separator className="my-4" />
                                
                                <div className="space-y-3">
                                    <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                                        Permitted Session Capabilities (Tag Pills)
                                    </Label>
                                    
                                    {/* Multi-select Grid / Tag Box */}
                                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl min-h-[120px] max-h-[220px] overflow-y-auto">
                                        {activeServicesList.map(s => {
                                            const isPermitted = assignedServiceIds.includes(s.id);
                                            const isPremium = isPremiumSession(s.name);
                                            return (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => handleToggleServiceForConsultant(s.id)}
                                                    style={{ minHeight: "44px", minWidth: "44px" }} // Touch targets >= 44px
                                                    className={cn(
                                                        "px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all select-none border",
                                                        isPermitted
                                                            ? isPremium
                                                                ? "bg-[#D4AF37]/10 text-[#d9a818] border-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.2)]"
                                                                : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-400"
                                                            : "bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50/50"
                                                    )}
                                                >
                                                    {isPermitted ? (
                                                        <Check className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Plus className="w-3.5 h-3.5 opacity-60" />
                                                    )}
                                                    {s.name}
                                                </button>
                                            );
                                        })}
                                        {activeServicesList.length === 0 && (
                                            <p className="text-xs text-slate-400 italic">No services seeded. Configure services in Panel A.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Button 
                                onClick={handleSaveOverrides}
                                disabled={saving}
                                className="w-full mt-6 gap-2 rounded-xl font-bold h-11 shadow-lg shadow-primary/10"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Override Permitted Services
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-8">
                            <UserCheck className="w-12 h-12 mb-3 text-slate-200" />
                            <p className="text-sm font-semibold">Select a staff member</p>
                            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Click on any practitioner on the left side to edit their permitted capability mapping overrides.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <DashboardLayout role="admin">
                <div className="flex items-center justify-center h-screen">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="admin">
            <div className="max-w-[1400px] mx-auto space-y-6 px-4 sm:px-6 py-6 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/admin/settings")} className="rounded-lg h-9 w-9">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight flex items-center gap-2">
                            <Settings className="w-7 h-7 text-primary" />
                            Unified Service & Session Manager
                        </h1>
                        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                            Auto-populate defaults, configure pricing constraints, and manage custom staff capabilities
                        </p>
                    </div>
                </div>

                {/* DESKTOP SIDE-BY-SIDE SPLIT SCREEN VIEW */}
                <div className="hidden md:grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    <div className="lg:col-span-5">
                        {renderServiceConfigurator()}
                    </div>
                    <div className="lg:col-span-7">
                        {renderStaffMatrix()}
                    </div>
                </div>

                {/* MOBILE PAGE LAYOUT - ACCORDION COLLAPSE */}
                <div className="md:hidden">
                    <Accordion type="single" collapsible defaultValue="services" className="w-full space-y-4">
                        <AccordionItem value="services" className="border-none">
                            <AccordionTrigger className="px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold flex justify-between hover:no-underline">
                                <span className="flex items-center gap-2 text-sm"><Layers className="w-4 h-4 text-primary" /> Panel A: Service Configurator</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 px-0 pb-0">
                                {renderServiceConfigurator()}
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="matrix" className="border-none">
                            <AccordionTrigger className="px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl font-bold flex justify-between hover:no-underline">
                                <span className="flex items-center gap-2 text-sm"><UserCheck className="w-4 h-4 text-primary" /> Panel B: Staff Override Matrix</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 px-0 pb-0">
                                {renderStaffMatrix()}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </div>

            {/* Create Service Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Configure Custom Session Type</DialogTitle>
                        <DialogDescription className="text-xs">Specify pricing, category, and default scheduling constraints</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Session Name</Label>
                            <Input 
                                placeholder="e.g. Elite Biomechanical Analysis" 
                                value={formData.name} 
                                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Category</Label>
                                <Select 
                                    value={formData.category} 
                                    onValueChange={(val) => setFormData({...formData, category: val})}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Sports Science">Sports Science</SelectItem>
                                        <SelectItem value="Physiotherapy">Physiotherapy</SelectItem>
                                        <SelectItem value="Medical">Medical</SelectItem>
                                        <SelectItem value="Nutrition">Nutrition</SelectItem>
                                        <SelectItem value="Recovery">Recovery</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Base Price (₹)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0" 
                                    value={formData.base_price} 
                                    onChange={(e) => setFormData({...formData, base_price: e.target.value})} 
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Min Duration (mins)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="30" 
                                    value={formData.min_duration} 
                                    onChange={(e) => setFormData({...formData, min_duration: parseInt(e.target.value, 10) || 30})} 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Max Duration (mins)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="120" 
                                    value={formData.max_duration} 
                                    onChange={(e) => setFormData({...formData, max_duration: parseInt(e.target.value, 10) || 60})} 
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex flex-col space-y-0.5">
                                <Label className="text-xs font-bold text-slate-700">Universally Available?</Label>
                                <span className="text-[10px] text-slate-400">If true, this session shows up for all staff profiles</span>
                            </div>
                            <Switch 
                                checked={formData.is_universal} 
                                onCheckedChange={(val) => setFormData({...formData, is_universal: val})} 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreateOpen(false)} className="rounded-xl font-bold text-xs">Cancel</Button>
                        <Button onClick={handleCreateService} className="rounded-xl font-bold text-xs px-5">Configure Service</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Service Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Edit Session Configuration</DialogTitle>
                        <DialogDescription className="text-xs">Update pricing, bounds, and universal visibility tags</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Session Name</Label>
                            <Input 
                                placeholder="e.g. Elite Biomechanical Analysis" 
                                value={formData.name} 
                                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Category</Label>
                                <Select 
                                    value={formData.category} 
                                    onValueChange={(val) => setFormData({...formData, category: val})}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="General">General</SelectItem>
                                        <SelectItem value="Sports Science">Sports Science</SelectItem>
                                        <SelectItem value="Physiotherapy">Physiotherapy</SelectItem>
                                        <SelectItem value="Medical">Medical</SelectItem>
                                        <SelectItem value="Nutrition">Nutrition</SelectItem>
                                        <SelectItem value="Recovery">Recovery</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Base Price (₹)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="0" 
                                    value={formData.base_price} 
                                    onChange={(e) => setFormData({...formData, base_price: e.target.value})} 
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Min Duration (mins)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="30" 
                                    value={formData.min_duration} 
                                    onChange={(e) => setFormData({...formData, min_duration: parseInt(e.target.value, 10) || 30})} 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Max Duration (mins)</Label>
                                <Input 
                                    type="number" 
                                    placeholder="120" 
                                    value={formData.max_duration} 
                                    onChange={(e) => setFormData({...formData, max_duration: parseInt(e.target.value, 10) || 60})} 
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex flex-col space-y-0.5">
                                <Label className="text-xs font-bold text-slate-700">Universally Available?</Label>
                                <span className="text-[10px] text-slate-400">If true, this session shows up for all staff profiles</span>
                            </div>
                            <Switch 
                                checked={formData.is_universal} 
                                onCheckedChange={(val) => setFormData({...formData, is_universal: val})} 
                            />
                        </div>
                        <div className="flex items-center justify-between pt-1">
                            <div className="flex flex-col space-y-0.5">
                                <Label className="text-xs font-bold text-slate-700">Active Service status?</Label>
                                <span className="text-[10px] text-slate-400">Toggle whether this service is active and bookable</span>
                            </div>
                            <Switch 
                                checked={formData.is_active} 
                                onCheckedChange={(val) => setFormData({...formData, is_active: val})} 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditOpen(false)} className="rounded-xl font-bold text-xs">Cancel</Button>
                        <Button onClick={handleUpdateService} className="rounded-xl font-bold text-xs px-5">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
