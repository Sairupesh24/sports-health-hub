import { useState, useEffect, useMemo } from "react";
import { format, parse } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
    Plus, 
    Trash2, 
    Repeat, 
    CheckCircle2, 
    Calendar as CalendarIcon, 
    Clock, 
    Loader2, 
    Check, 
    ChevronsUpDown, 
    AlertCircle, 
    Bookmark 
} from "lucide-react";
import { VIPName } from "@/components/ui/VIPBadge";
import { filterServicesByRole, filterConsultantsByService, type Service } from "@/utils/serviceMapping";
import { Calendar } from "@/components/ui/calendar";
import { addDays, isSameDay, startOfDay as startOfDateDay, parseISO } from "date-fns";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    initialData?: {
        clientId?: string;
        consultantId?: string;
        serviceId?: string;
        sessionDate?: string;
        startTime?: string;
        preferenceType?: "Strict" | "Flexible";
    };
}

export function AdminBookSessionModal({ open, onOpenChange, onSuccess, initialData }: Props) {
    const { profile, roles } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [consultants, setConsultants] = useState<any[]>([]);
    const [services, setServices] = useState<Service[]>([]);

    // Form State
    const [clientId, setClientId] = useState("");
    const [consultantId, setConsultantId] = useState("");
    const [preferenceType, setPreferenceType] = useState<"Strict" | "Flexible">("Flexible");
    const [serviceId, setServiceId] = useState("");
    const [serviceType, setServiceType] = useState("");
    const [sessionDate, setSessionDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [startTime, setStartTime] = useState("09:00");
    const [endTime, setEndTime] = useState("10:00");
    const [isConflict, setIsConflict] = useState(false);

    // Recurring State
    const [isRecurring, setIsRecurring] = useState(false);
    const [totalSessions, setTotalSessions] = useState(5);
    const [seriesSchedule, setSeriesSchedule] = useState<{ dayOfWeek: number, startTime: string, endTime: string }[]>([
        { dayOfWeek: 1, startTime: "17:00", endTime: "17:45" }
    ]);

    // Availability & Slot State
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [availableTherapists, setAvailableTherapists] = useState<any[]>([]);
    
    const [orgSettings, setOrgSettings] = useState<any>(null);
    const [allConsultantAvailability, setAllConsultantAvailability] = useState<any[]>([]);
    const [allBookedSessions, setAllBookedSessions] = useState<any[]>([]);

    useEffect(() => {
        if (open && profile?.organization_id) {
            fetchClients();
            fetchConsultants();
            fetchServices();
            fetchOrgSettings();

            if (initialData) {
                if (initialData.clientId) setClientId(initialData.clientId);
                if (initialData.consultantId) setConsultantId(initialData.consultantId);
                if (initialData.serviceId) setServiceId(initialData.serviceId);
                if (initialData.sessionDate) setSessionDate(initialData.sessionDate);
                if (initialData.startTime) setStartTime(initialData.startTime);
                if (initialData.preferenceType) setPreferenceType(initialData.preferenceType);
            }
        }
    }, [open, profile?.organization_id, initialData]);

    const fetchOrgSettings = async () => {
        const { data } = await supabase
            .from("organization_settings")
            .select("*")
            .eq("organization_id", profile?.organization_id)
            .maybeSingle();
        if (data) setOrgSettings(data);
    };

    const filteredServices = useMemo(() => {
        const userRole = roles.find(r => ['admin', 'clinic_admin', 'front_office', 'foe'].includes(r));
        return filterServicesByRole(services, null, userRole);
    }, [services, roles]);

    const filteredConsultants = useMemo(() => {
        const selectedService = services.find(s => s.id === serviceId);
        return filterConsultantsByService(consultants, selectedService);
    }, [consultants, serviceId, services]);

    const fetchConsultantData = async () => {
        if (!sessionDate || !profile?.organization_id) return;
        
        // Fetch availability for ALL qualified consultants for this service
        const qualifiedConsultantIds = filteredConsultants.map(c => c.id);
        if (qualifiedConsultantIds.length === 0 && consultantId) {
            qualifiedConsultantIds.push(consultantId);
        }

        if (qualifiedConsultantIds.length > 0) {
            const { data: avail } = await supabase
                .from("consultant_availability")
                .select("*")
                .in("consultant_id", qualifiedConsultantIds);
            setAllConsultantAvailability(avail || []);

            const startOfDayStr = `${sessionDate}T00:00:00Z`;
            const endOfDayStr = `${sessionDate}T23:59:59Z`;

            const { data: booked } = await supabase
                .from("sessions")
                .select("scheduled_start, scheduled_end, therapist_id, status")
                .eq("organization_id", profile.organization_id)
                .neq("status", "Cancelled")
                .in("therapist_id", qualifiedConsultantIds)
                .gte("scheduled_start", startOfDayStr)
                .lte("scheduled_start", endOfDayStr);
            
            setAllBookedSessions(booked || []);
        }
    };

    useEffect(() => {
        fetchConsultantData();
    }, [consultantId, sessionDate, filteredConsultants]);

    const fetchServices = async () => {
        const { data } = await supabase
            .from("services")
            .select("id, name, category, organization_id")
            .eq("organization_id", profile?.organization_id)
            .eq("is_active", true);
        if (data) setServices(data as Service[]);
    };

    const fetchClients = async () => {
        const { data, error } = await supabase
            .from("clients")
            .select("*")
            .eq("organization_id", profile?.organization_id);
        
        if (error) {
            console.error("Fetch Clients Error:", error);
            return;
        }
        if (data) setClients(data);
    };

    const fetchConsultants = async () => {
        if (!profile?.organization_id) return;

        const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, first_name, last_name, ams_role, profession")
            .eq("organization_id", profile.organization_id)
            .eq("is_approved", true)
            .in("profession", ["Sports Physician", "Physiotherapist", "Sports Scientist"]);

        if (profilesError || !profilesData) {
            console.error("Fetch Profiles Error:", profilesError);
            return;
        }

        const userIds = profilesData.map(p => p.id);
        const { data: roleData, error: roleError } = await supabase
            .from("user_roles")
            .select("user_id, role")
            .in("user_id", userIds);

        if (roleError) {
            console.error("Fetch Roles Error:", roleError);
            return;
        }

        if (profilesData && roleData) {
            const specialists = profilesData
                .filter(p => {
                    const r = roleData.find(role => role.user_id === p.id);
                    // Exclude clients and athletes from the specialist list
                    return r && !["client", "athlete"].includes(r.role);
                })
                .map(p => {
                    const userRole = roleData.find(r => r.user_id === p.id)?.role;
                    return {
                        id: p.id,
                        name: `${p.first_name} ${p.last_name}`,
                        role: userRole || 'consultant',
                        profession: p.profession
                    };
                });
            setConsultants(specialists);
        }
    };



    const availableSlots = useMemo(() => {
        if (!consultantId || !sessionDate || allConsultantAvailability.length === 0) return [];

        const dateObj = parse(sessionDate, "yyyy-MM-dd", new Date());
        const dayOfWeek = dateObj.getDay(); 
        
        // Use primary consultant's availability rules for slicing
        const primaryAvail = allConsultantAvailability.find(a => a.consultant_id === consultantId && a.day_of_week === dayOfWeek);
        if (!primaryAvail) return [];

        const slotDuration = primaryAvail.slot_duration_interval || orgSettings?.default_slot_duration || 60;
        const shiftStart = parse(primaryAvail.start_time, "HH:mm:ss", dateObj);
        const shiftEnd = parse(primaryAvail.end_time, "HH:mm:ss", dateObj);

        const slots: { start: string, end: string, label: string, status: 'available' | 'flex' | 'waitlist' }[] = [];
        let currentStart = shiftStart;

        while (currentStart.getTime() + (slotDuration * 60000) <= shiftEnd.getTime()) {
            const currentEnd = new Date(currentStart.getTime() + (slotDuration * 60000));
            const startT = currentStart.getTime();
            const endT = currentEnd.getTime();

            // 1. Is selected consultant free?
            const isPrimaryBusy = allBookedSessions.some(s => 
                s.therapist_id === consultantId && 
                ( (startT >= new Date(s.scheduled_start).getTime() && startT < new Date(s.scheduled_end).getTime()) || 
                  (endT > new Date(s.scheduled_start).getTime() && endT <= new Date(s.scheduled_end).getTime()) )
            );

            let status: 'available' | 'flex' | 'waitlist' = 'available';
            
            if (isPrimaryBusy) {
                // 2. Is ANY qualified specialist free?
                const freeSpecialist = filteredConsultants.find(c => {
                    if (c.id === consultantId) return false;
                    const cAvail = allConsultantAvailability.find(a => a.consultant_id === c.id && a.day_of_week === dayOfWeek);
                    if (!cAvail) return false;
                    
                    const cShiftS = parse(cAvail.start_time, "HH:mm:ss", dateObj).getTime();
                    const cShiftE = parse(cAvail.end_time, "HH:mm:ss", dateObj).getTime();
                    if (startT < cShiftS || endT > cShiftE) return false;

                    const isBusy = allBookedSessions.some(s => 
                        s.therapist_id === c.id && 
                        ( (startT >= new Date(s.scheduled_start).getTime() && startT < new Date(s.scheduled_end).getTime()) || 
                          (endT > new Date(s.scheduled_start).getTime() && endT <= new Date(s.scheduled_end).getTime()) )
                    );
                    return !isBusy;
                });

                status = freeSpecialist ? 'flex' : 'waitlist';
            }

            slots.push({
                start: format(currentStart, "HH:mm"),
                end: format(currentEnd, "HH:mm"),
                label: `${format(currentStart, "HH:mm")} (${slotDuration}m)`,
                status
            });

            currentStart = new Date(currentStart.getTime() + (slotDuration * 60000));
            if (slots.length >= 50) break;
        }

        return slots;
    }, [consultantId, sessionDate, allConsultantAvailability, allBookedSessions, orgSettings, filteredConsultants]);

    const checkSlotAvailability = async (time: string, endT: string) => {
        if (!time || !endT || !consultantId) return;
        
        setIsAvailable(null);
        setIsConflict(false);
        setCheckingAvailability(true);
        
        try {
            const dateStr = sessionDate;
            const startTimestamp = new Date(`${dateStr}T${time}:00`).getTime();
            const endTimestamp = new Date(`${dateStr}T${endT}:00`).getTime();

            const dateObj = parse(sessionDate, "yyyy-MM-dd", new Date());
            const dayOfWeek = dateObj.getDay(); 
            const dayAvail = allConsultantAvailability.find(a => a.consultant_id === consultantId && a.day_of_week === dayOfWeek);
            
            if (!dayAvail) {
                setIsAvailable(false);
                setIsConflict(true);
                return;
            }

            const shiftStart = parse(dayAvail.start_time, "HH:mm:ss", dateObj).getTime();
            const shiftEnd = parse(dayAvail.end_time, "HH:mm:ss", dateObj).getTime();

            if (startTimestamp < shiftStart || endTimestamp > shiftEnd) {
                setIsAvailable(false);
                setIsConflict(true);
                return;
            }

            const overlapping = allBookedSessions.some(s => {
                const sStart = new Date(s.scheduled_start).getTime();
                const sEnd = new Date(s.scheduled_end).getTime();
                return s.therapist_id === consultantId && 
                       ( (startTimestamp >= sStart && startTimestamp < sEnd) || 
                         (endTimestamp > sStart && endTimestamp <= sEnd) ||
                         (startTimestamp <= sStart && endTimestamp >= sEnd) );
            });

            if (overlapping) {
                setIsAvailable(false);
                setIsConflict(true);
                return;
            }

            setIsAvailable(true);
            setIsConflict(false);
        } catch (e) {
            console.error(e);
        } finally {
            setCheckingAvailability(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (startTime && endTime && sessionDate && consultantId) {
                checkSlotAvailability(startTime, endTime);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [startTime, endTime, sessionDate, consultantId, allBookedSessions, allConsultantAvailability]);

    useEffect(() => {
        const selected = services.find(s => s.id === serviceId);
        if (selected) setServiceType(selected.name);
    }, [serviceId, services]);

    const handleSave = async () => {
        if (!clientId || !consultantId || !sessionDate || !profile?.organization_id) {
            toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }

        if (!isRecurring && (!startTime || !endTime)) {
            toast({ title: "Validation Error", description: "Please select a time.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const sessionsToCreate: any[] = [];
            const seriesId = isRecurring ? `Series-${Date.now()}` : null;

            if (isRecurring) {
                let sessionsCreated = 0;
                let currentDate = parse(sessionDate, "yyyy-MM-dd", new Date());
                
                // We will loop through dates and match with schedule until totalSessions is reached
                while (sessionsCreated < totalSessions) {
                    const dayOfWeek = currentDate.getDay();
                    const dayRules = seriesSchedule.filter(r => r.dayOfWeek === dayOfWeek);
                    
                    for (const rule of dayRules) {
                        if (sessionsCreated >= totalSessions) break;
                        
                        const startTimestamp = new Date(format(currentDate, "yyyy-MM-dd") + `T${rule.startTime}:00`).toISOString();
                        const endTimestamp = new Date(format(currentDate, "yyyy-MM-dd") + `T${rule.endTime}:00`).toISOString();

                        sessionsToCreate.push({
                            organization_id: profile.organization_id,
                            client_id: clientId,
                            therapist_id: consultantId,
                            service_id: serviceId || null,
                            service_type: serviceType,
                            session_mode: "Individual",
                            scheduled_start: startTimestamp,
                            scheduled_end: endTimestamp,
                            status: "Planned",
                            group_name: seriesId,
                            preference_type: preferenceType,
                            is_flexible_routing: preferenceType === "Flexible"
                        });
                        sessionsCreated++;
                    }
                    currentDate = addDays(currentDate, 1);
                    if (sessionsToCreate.length > 100) break; // Safety cap
                }
            } else {
                // Single booking
                const startTimestamp = `${sessionDate}T${startTime}:00`;
                const endTimestamp = `${sessionDate}T${endTime}:00`;

                sessionsToCreate.push({
                    organization_id: profile.organization_id,
                    client_id: clientId,
                    therapist_id: consultantId,
                    service_id: serviceId || null,
                    service_type: serviceType,
                    session_mode: "Individual",
                    scheduled_start: new Date(startTimestamp).toISOString(),
                    scheduled_end: new Date(endTimestamp).toISOString(),
                    status: "Planned",
                    preference_type: preferenceType,
                    is_flexible_routing: preferenceType === "Flexible",
                });
            }

            const { error } = await supabase.from("sessions").insert(sessionsToCreate);
            if (error) throw error;

            toast({ 
                title: "Success", 
                description: isRecurring 
                    ? `Series of ${sessionsToCreate.length} appointments booked.` 
                    : "Appointment booked successfully." 
            });
            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleJoinWaitlist = async () => {
        setLoading(true);
        try {
            const { error } = await (supabase as any).from("waitlist").insert({
                organization_id: profile?.organization_id,
                client_id: clientId,
                therapist_id: consultantId,
                service_id: serviceId || null,
                preferred_date: sessionDate,
                preferred_time_slot: startTime,
                preference_type: preferenceType,
                status: "Waiting"
            });

            if (error) throw error;

            toast({ title: "Added to Waitlist", description: "The slot was unavailable, client added to waitlist." });
            onSuccess();
            onOpenChange(false);
            resetForm();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setClientId("");
        setConsultantId("");
        setPreferenceType("Flexible");
        setIsAvailable(null);
        setServiceType("");
        setSessionDate(format(new Date(), "yyyy-MM-dd"));
        setStartTime("09:00");
        setEndTime("10:00");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background border-none shadow-2xl rounded-xl sm:rounded-2xl">
                <div className="flex flex-col h-[90vh] sm:h-auto max-h-[90vh]">
                    <div className="p-6 pb-4 border-b border-border bg-muted/5">
                        <DialogTitle className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">New Appointment</DialogTitle>
                        <DialogDescription className="text-sm sm:text-base text-muted-foreground mt-1">Schedule a manual session or join the active waitlist.</DialogDescription>
                    </div>

                    <ScrollArea className="flex-1 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Select Patient</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full justify-between h-12", !clientId && "text-muted-foreground")}>
                                                {clientId ? (() => {
                                                    const c = clients.find(x => x.id === clientId);
                                                    return c ? <VIPName name={`${c.first_name} ${c.last_name}`} isVIP={c.is_vip} /> : "Selected";
                                                })() : "Search patients..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Type name..." />
                                                <CommandList>
                                                    <CommandEmpty>No patient found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {clients.map((c) => (
                                                            <CommandItem key={c.id} value={`${c.first_name} ${c.last_name}`} onSelect={() => setClientId(c.id)}>
                                                                <Check className={cn("mr-2 h-4 w-4", clientId === c.id ? "opacity-100" : "opacity-0")} />
                                                                <VIPName name={`${c.first_name} ${c.last_name}`} isVIP={c.is_vip} />
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">1. Service Selection</Label>
                                    <Select value={serviceId} onValueChange={(val) => { setServiceId(val); setConsultantId(""); }}>
                                        <SelectTrigger className="h-12 bg-primary/5 border-primary/20 focus:ring-primary"><SelectValue placeholder="What service is required?" /></SelectTrigger>
                                        <SelectContent>
                                            {filteredServices.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className={cn("text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-opacity", !serviceId && "opacity-50")}>2. Assign Qualified Specialist</Label>
                                        {serviceId && (
                                            <div className="flex items-center gap-2 bg-muted/30 px-2 py-1 rounded-md border border-border/40">
                                                <Label className="text-[10px] font-bold uppercase cursor-pointer" htmlFor="pref-mode">
                                                    {preferenceType === "Strict" ? "Strict" : "Flexible"}
                                                </Label>
                                                <Switch 
                                                    id="pref-mode" 
                                                    className="scale-75"
                                                    checked={preferenceType === "Flexible"} 
                                                    onCheckedChange={(checked) => setPreferenceType(checked ? "Flexible" : "Strict")} 
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {!serviceId ? (
                                        <div className="p-8 border border-dashed rounded-xl flex flex-col items-center justify-center text-center space-y-2 bg-muted/20">
                                            <Bookmark className="w-8 h-8 text-muted-foreground/30" />
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest leading-tight">Pick a service first<br />to see specialists</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-300">
                                            {filteredConsultants.map(c => (
                                                <div key={c.id} onClick={() => setConsultantId(c.id)} className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-all", consultantId === c.id ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" : "border-border/50")}>
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">{c.name?.[0]}</div>
                                                    <div className="flex-1">
                                                        <div className="text-sm font-semibold uppercase">{c.name}</div>
                                                        <div className="text-[10px] text-muted-foreground">{c.profession}</div>
                                                    </div>
                                                    {consultantId === c.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                                </div>
                                            ))}
                                            {filteredConsultants.length === 0 && (
                                                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex gap-3 text-orange-800">
                                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                                    <p className="text-[10px] font-medium leading-tight">No specialists found for this service category. Please check assignments.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
                                        <div className="flex items-center gap-2">
                                            <Repeat className="w-4 h-4 text-primary" />
                                            <Label className="text-xs font-bold uppercase cursor-pointer" htmlFor="recurring-mode">Recurring Series</Label>
                                        </div>
                                        <Switch id="recurring-mode" checked={isRecurring} onCheckedChange={setIsRecurring} />
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Session Date</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-11", !sessionDate && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                                    {sessionDate ? format(parse(sessionDate, "yyyy-MM-dd", new Date()), "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={parse(sessionDate, "yyyy-MM-dd", new Date())}
                                                    onSelect={(date) => date && setSessionDate(format(date, "yyyy-MM-dd"))}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {!isRecurring ? (
                                        <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                                            <div className="space-y-3">
                                                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between mt-4">
                                                    Time Selection
                                                    {isConflict && <Badge variant="destructive" className="animate-pulse flex items-center gap-1"><AlertCircle className="w-3 h-3" /> CONFLICT</Badge>}
                                                </Label>

                                                {availableSlots.length > 0 ? (
                                                    <div className="space-y-3">
                                                        <Label className="text-[10px] font-bold uppercase text-primary mb-2 block tracking-widest">Available Slots (Quick-Pick)</Label>
                                                        <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                                                            {availableSlots
                                                                .sort((a, b) => {
                                                                    const order = { available: 0, flex: 1, waitlist: 2 };
                                                                    return order[a.status] - order[b.status];
                                                                })
                                                                .map((slot, i) => (
                                                                    <Button 
                                                                        key={i} 
                                                                        variant={startTime === slot.start ? "default" : "outline"} 
                                                                        size="sm" 
                                                                        className={cn(
                                                                            "text-[10px] h-9 px-3 font-bold transition-all",
                                                                            startTime === slot.start 
                                                                                ? "ring-2 ring-primary ring-offset-1" 
                                                                                : slot.status === 'available' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20" :
                                                                                  slot.status === 'flex' ? "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20" :
                                                                                  "bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/20"
                                                                        )}
                                                                        onClick={() => {
                                                                            setStartTime(slot.start);
                                                                            setEndTime(slot.end);
                                                                        }}
                                                                    >
                                                                        {slot.status === 'flex' && "(FLEX) "}
                                                                        {slot.status === 'waitlist' && "(WAIT) "}
                                                                        {slot.label}
                                                                    </Button>
                                                                ))}
                                                        </div>
                                                        <p className="text-[9px] text-muted-foreground italic mt-1">
                                                            * Select a slot to confirm your time.
                                                        </p>
                                                        
                                                        <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border/50 space-y-2">
                                                            <div className="flex items-start gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1" />
                                                                <p className="text-[10px] leading-tight text-muted-foreground"><span className="font-bold text-emerald-700">AVAILABLE:</span> Your selected specialist is free and ready for booking.</p>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1" />
                                                                <p className="text-[10px] leading-tight text-muted-foreground"><span className="font-bold text-blue-700">(FLEX):</span> Selected specialist is busy, but another qualified professional is available.</p>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-orange-500 mt-1" />
                                                                <p className="text-[10px] leading-tight text-muted-foreground"><span className="font-bold text-orange-700">(WAIT):</span> All qualified specialists are busy. This session will join the waitlist.</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 border border-dashed rounded-lg text-center bg-muted/10">
                                                        <Clock className="w-5 h-5 text-muted-foreground/40 mx-auto mb-1" />
                                                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">No slots available</p>
                                                    </div>
                                                )}

                                                {/* Hidden inputs to keep state logic intact but focus on slots */}
                                                <div className="sr-only">
                                                    <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
                                                    <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
                                                </div>
                                            </div>
                                            
                                            <div className={cn("border rounded-xl p-4 flex items-center justify-between", isAvailable === true ? "bg-emerald-500/5 border-emerald-500/20" : isAvailable === false ? "bg-orange-500/5 border-orange-500/20" : "bg-muted/10 border-border/50")}>
                                                <div className="flex items-center gap-3">
                                                    {checkingAvailability ? <Loader2 className="w-5 h-5 animate-spin" /> : isAvailable === true ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : isAvailable === false ? <AlertCircle className="w-5 h-5 text-orange-500" /> : <Clock className="w-5 h-5 text-muted-foreground" />}
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold uppercase">{checkingAvailability ? "Checking..." : isAvailable === true ? "Available" : isAvailable === false ? "Booked/Off" : "Awaiting Info"}</span>
                                                        <span className="text-[10px] text-muted-foreground">Real-time cross-check</span>
                                                    </div>
                                                </div>
                                                {isAvailable !== null && !checkingAvailability && <Badge variant={isAvailable ? "secondary" : "outline"} className="text-[9px]">{isAvailable ? "READY" : "BUSY"}</Badge>}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                                            <div className="space-y-3">
                                                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Total Sessions in Series</Label>
                                                <Input type="number" value={totalSessions} onChange={e => setTotalSessions(parseInt(e.target.value))} className="h-11" min={1} max={100} />
                                            </div>

                                            <div className="space-y-3">
                                                <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Series Schedule</Label>
                                                <div className="space-y-3">
                                                    {seriesSchedule.map((rule, idx) => (
                                                        <div key={idx} className="flex items-end gap-2 p-3 bg-muted/30 rounded-lg border border-border/50 group">
                                                            <div className="flex-1 space-y-1.5">
                                                                <Label className="text-[9px] font-bold uppercase text-muted-foreground">Day</Label>
                                                                <Select value={rule.dayOfWeek.toString()} onValueChange={(val) => {
                                                                    const newSchedule = [...seriesSchedule];
                                                                    newSchedule[idx].dayOfWeek = parseInt(val);
                                                                    setSeriesSchedule(newSchedule);
                                                                }}>
                                                                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                                                                            <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="w-24 space-y-1.5">
                                                                <Label className="text-[9px] font-bold uppercase text-muted-foreground">Start</Label>
                                                                <Input type="time" value={rule.startTime} onChange={(e) => {
                                                                    const newSchedule = [...seriesSchedule];
                                                                    newSchedule[idx].startTime = e.target.value;
                                                                    setSeriesSchedule(newSchedule);
                                                                }} className="h-9 text-xs" />
                                                            </div>
                                                            <div className="w-24 space-y-1.5">
                                                                <Label className="text-[9px] font-bold uppercase text-muted-foreground">End</Label>
                                                                <Input type="time" value={rule.endTime} onChange={(e) => {
                                                                    const newSchedule = [...seriesSchedule];
                                                                    newSchedule[idx].endTime = e.target.value;
                                                                    setSeriesSchedule(newSchedule);
                                                                }} className="h-9 text-xs" />
                                                            </div>
                                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => setSeriesSchedule(prev => prev.filter((_, i) => i !== idx))} disabled={seriesSchedule.length <= 1}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                    <Button variant="outline" size="sm" className="w-full h-9 border-dashed text-xs text-primary" onClick={() => setSeriesSchedule(prev => [...prev, { dayOfWeek: 1, startTime: "09:00", endTime: "10:00" }])}>
                                                        <Plus className="w-3 h-3 mr-2" /> Add Weekly Day
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <Separator />
                    <div className="p-6 flex gap-4">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-12 uppercase text-xs font-bold">Cancel</Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={loading || checkingAvailability || !clientId || !consultantId || isAvailable === null} 
                            className={cn("flex-1 h-12 uppercase text-xs font-bold", isAvailable === false ? "bg-orange-600 hover:bg-orange-700" : "bg-primary")}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isAvailable === false ? "Join Waitlist" : "Confirm Booking"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
