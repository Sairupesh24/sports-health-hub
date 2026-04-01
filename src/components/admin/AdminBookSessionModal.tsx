import { useState, useEffect, useMemo } from "react";
import { format, parse, isBefore, addDays, addWeeks, addMonths, startOfWeek } from "date-fns";
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
import { filterServicesByRole, Service } from "@/utils/serviceMapping";
import { CheckCircle2, Calendar as CalendarIcon, Clock, Loader2, Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { VIPName } from "@/components/ui/VIPBadge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AdminBookSessionModal({ open, onOpenChange, onSuccess }: Props) {
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
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    // Availability & Slot State
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [availableTherapists, setAvailableTherapists] = useState<any[]>([]);
    
    const [orgSettings, setOrgSettings] = useState<any>(null);
    const [consultantAvailability, setConsultantAvailability] = useState<any[]>([]);
    const [bookedSessions, setBookedSessions] = useState<any[]>([]);

    useEffect(() => {
        if (open && profile?.organization_id) {
            fetchClients();
            fetchConsultants();
            fetchServices();
            fetchOrgSettings();
        }
    }, [open, profile?.organization_id]);

    const fetchOrgSettings = async () => {
        const { data } = await supabase
            .from("organization_settings")
            .select("*")
            .eq("organization_id", profile?.organization_id)
            .maybeSingle();
        if (data) setOrgSettings(data);
    };

    const fetchConsultantData = async () => {
        if (!consultantId || !sessionDate) return;
        
        // 1. Fetch Availability for this consultant
        const { data: avail } = await supabase
            .from("consultant_availability")
            .select("*")
            .eq("consultant_id", consultantId);
        setConsultantAvailability(avail || []);

        // 2. Fetch Booked Sessions for this day
        const startOfDay = `${sessionDate}T00:00:00Z`;
        const endOfDay = `${sessionDate}T23:59:59Z`;

        const { data: booked } = await supabase
            .from("sessions")
            .select("scheduled_start, scheduled_end, therapist_id, status")
            .eq("organization_id", profile?.organization_id)
            .neq("status", "Cancelled")
            .gte("scheduled_start", startOfDay)
            .lte("scheduled_start", endOfDay);
        
        setBookedSessions(booked || []);
    };

    useEffect(() => {
        fetchConsultantData();
    }, [consultantId, sessionDate]);

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
        
        if (data) {
            setClients(data);
        }
    };

    const fetchConsultants = async () => {
        const { data: roleData } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "consultant");

        if (roleData && roleData.length > 0) {
            const consultantIds = roleData.map(r => r.user_id);
            const profilesData = await supabase
                .from("profiles")
                .select("id, first_name, last_name, ams_role, profession")
                .eq("organization_id", profile?.organization_id)
                .in("id", consultantIds)
                .eq("is_approved", true);

            if (profilesData?.data) {
                setConsultants((profilesData.data as any[]).map(p => ({
                    id: p.id,
                    name: `${p.first_name} ${p.last_name}`,
                    role: p.ams_role === 'coach' ? 'sports_scientist' : 'consultant',
                    profession: p.profession
                })));
            }
        }
    };

    const filteredServices = useMemo(() => {
        const selectedConsultant = consultants.find(c => c.id === consultantId);
        const userRole = roles.find(r => ['admin', 'clinic_admin', 'front_office', 'foe'].includes(r)) || selectedConsultant?.role;
        return filterServicesByRole(services, selectedConsultant?.profession, userRole);
    }, [services, consultantId, consultants, roles]);

    const slots = useMemo(() => {
        if (!consultantId || !sessionDate) return [];
        
        const dateObj = parse(sessionDate, "yyyy-MM-dd", new Date());
        const dayOfWeek = dateObj.getDay(); // 0=Sun, 6=Sat
        
        const dayAvail = consultantAvailability.find(a => a.day_of_week === dayOfWeek);
        if (!dayAvail) return [];

        const startStr = dayAvail.start_time;
        const endStr = dayAvail.end_time;
        const interval = dayAvail.slot_duration_interval || orgSettings?.default_slot_duration || 60;

        const generated = [];
        let current = parse(startStr, "HH:mm:ss", dateObj);
        const end = parse(endStr, "HH:mm:ss", dateObj);

        while (current < end) {
            const timeStr = format(current, "HH:mm");
            const slotEndTime = format(new Date(current.getTime() + interval * 60000), "HH:mm");
            
            // Check if therapist is booked at this exact time
            const isBooked = bookedSessions.some(s => {
                const sStart = format(new Date(s.scheduled_start), "HH:mm");
                return s.therapist_id === consultantId && sStart === timeStr;
            });

            // For flexible: check if *anyone* else is available
            let anyoneElseAvailable = false;
            if (isBooked && preferenceType === "Flexible") {
                const bookedAtThisTime = bookedSessions
                    .filter(s => format(new Date(s.scheduled_start), "HH:mm") === timeStr)
                    .map(s => s.therapist_id);
                anyoneElseAvailable = consultants.some(c => !bookedAtThisTime.includes(c.id));
            }

            generated.push({
                time: timeStr,
                endTime: slotEndTime,
                isBooked,
                anyoneElseAvailable
            });
            current = new Date(current.getTime() + interval * 60000);
        }
        return generated;
    }, [consultantId, sessionDate, consultantAvailability, orgSettings, bookedSessions, preferenceType, consultants]);

    const checkSlotAvailability = async (time: string, endT: string) => {
        setStartTime(time);
        setEndTime(endT);
        setIsAvailable(null);
        setCheckingAvailability(true);
        
        // Detailed check (duplicate of slot generation logic but more robust)
        try {
            const dateStr = sessionDate;
            const startTimestamp = `${dateStr}T${time}:00`;
            const endTimestamp = `${dateStr}T${endT}:00`;

            const { data: overlapping } = await supabase
                .from("sessions")
                .select("therapist_id")
                .eq("organization_id", profile?.organization_id)
                .neq("status", "Cancelled")
                .gte("scheduled_start", startTimestamp)
                .lt("scheduled_start", endTimestamp);

            const bookedTherapistIds = overlapping?.map(s => s.therapist_id) || [];
            
            if (preferenceType === "Strict") {
                const isBooked = bookedTherapistIds.includes(consultantId);
                setIsAvailable(!isBooked);
            } else {
                const available = consultants.filter(c => !bookedTherapistIds.includes(c.id));
                setAvailableTherapists(available);
                const isPreferredAvailable = !bookedTherapistIds.includes(consultantId);
                setIsAvailable(isPreferredAvailable || available.length > 0);
            }
        } finally {
            setCheckingAvailability(false);
        }
    };

    useEffect(() => {
        const selected = services.find(s => s.id === serviceId);
        if (selected) setServiceType(selected.name);
    }, [serviceId, services]);

    const handleSave = async () => {
        if (!clientId || !consultantId || !sessionDate || !startTime || !endTime || !profile?.organization_id) {
            toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }

        if (isAvailable === false) {
            handleJoinWaitlist();
            return;
        }

        let finalTherapistId = consultantId;
        if (isAvailable === true && preferenceType === "Flexible") {
            const bookedTherapistIds = (await supabase.from("sessions").select("therapist_id").eq("scheduled_start", `${sessionDate}T${startTime}:00`)).data?.map(s => s.therapist_id) || [];
            if (bookedTherapistIds.includes(consultantId) && availableTherapists.length > 0) {
                finalTherapistId = availableTherapists[0].id;
            }
        }

        setLoading(true);
        try {
            const startTimestamp = `${sessionDate}T${startTime}:00`;
            const endTimestamp = `${sessionDate}T${endTime}:00`;

            const { error } = await supabase.from("sessions").insert({
                organization_id: profile.organization_id,
                client_id: clientId,
                therapist_id: finalTherapistId,
                service_id: serviceId || null,
                service_type: serviceType,
                session_mode: "Individual",
                scheduled_start: new Date(startTimestamp).toISOString(),
                scheduled_end: new Date(endTimestamp).toISOString(),
                status: "Planned",
            });

            if (error) throw error;

            toast({ title: "Success", description: "Appointment booked successfully." });
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
                    {/* Header: Fixed */}
                    <div className="p-6 pb-4 border-b border-border bg-muted/5">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">New Appointment</DialogTitle>
                                <DialogDescription className="text-sm sm:text-base text-muted-foreground mt-1">Fill in the details below to schedule a session or join the waitlist.</DialogDescription>
                            </div>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                            {/* Left Column: Patient & Specialist */}
                            <div className="space-y-8">
                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Select Patient</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn("w-full justify-between font-normal h-12 text-base", !clientId && "text-muted-foreground")}
                                            >
                                                {clientId ? (() => {
                                                    const c = clients.find(x => x.id === clientId);
                                                    return c ? <VIPName name={`${c.first_name || ''} ${c.last_name || ''}`} isVIP={c.isVIP || c.is_vip} /> : "Selected";
                                                })() : "Search patients..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[300px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Type name..." />
                                                <CommandList>
                                                    <CommandEmpty>No patient found.</CommandEmpty>
                                                    <CommandGroup>
                                                        {clients.length === 0 && <p className="p-2 text-xs text-muted-foreground">Loading clients...</p>}
                                                        {clients.map((c) => (
                                                            <CommandItem
                                                                key={c.id}
                                                                value={`${c.first_name} ${c.last_name}`}
                                                                onSelect={() => setClientId(c.id)}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", clientId === c.id ? "opacity-100" : "opacity-0")} />
                                                                <VIPName name={`${c.first_name} ${c.last_name}`} isVIP={c.isVIP || c.is_vip} />
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Assign Specialist</Label>
                                    <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {consultants.map(c => (
                                            <div 
                                                key={c.id}
                                                onClick={() => setConsultantId(c.id)}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50",
                                                    consultantId === c.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border/50"
                                                )}
                                            >
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                                                    {c.name?.[0]}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold uppercase tracking-tighter">{c.name}</div>
                                                    <div className="text-[10px] text-muted-foreground">{c.profession || "Sports Specialist"}</div>
                                                </div>
                                                {consultantId === c.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Time & Service */}
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Session Date</Label>
                                    <div className="relative">
                                        <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input type="date" className="pl-9 h-11" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Available Slots</Label>
                                    {slots.length === 0 ? (
                                        <div className="p-4 border border-dashed rounded-lg text-center text-xs text-muted-foreground italic">
                                            {consultantId ? "No availability set for this day." : "Select a specialist to see slots."}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                            {slots.map(s => (
                                                <Button
                                                    key={s.time}
                                                    variant={startTime === s.time ? "default" : "outline"}
                                                    size="sm"
                                                    className={cn(
                                                        "h-10 sm:h-8 text-[11px] px-1 font-mono",
                                                        startTime === s.time && "ring-2 ring-primary ring-offset-2",
                                                        s.isBooked && !s.anyoneElseAvailable && "bg-orange-500/10 text-orange-600 border-orange-200 line-through opacity-60",
                                                        s.isBooked && s.anyoneElseAvailable && "bg-blue-500/10 text-blue-600 border-blue-200"
                                                    )}
                                                    onClick={() => checkSlotAvailability(s.time, s.endTime)}
                                                >
                                                    {s.time}
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                    {slots.length > 0 && (
                                        <div className="flex gap-4 mt-2">
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full border border-border"></div><span className="text-[9px] uppercase opacity-60">Free</span></div>
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500/20 border border-blue-200"></div><span className="text-[9px] uppercase opacity-60">Flexi</span></div>
                                            <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-500/20 border border-orange-200"></div><span className="text-[9px] uppercase opacity-60">Busy</span></div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Service Selection</Label>
                                    <Select value={serviceId} onValueChange={setServiceId}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select service..." /></SelectTrigger>
                                        <SelectContent>
                                            {filteredServices.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Separator />

                                <div className="bg-muted/30 p-4 rounded-xl space-y-4">
                                    <Label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Routing Mode</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button 
                                            variant={preferenceType === "Flexible" ? "default" : "outline"}
                                            className="h-12 flex-col gap-0 items-center justify-center"
                                            onClick={() => setPreferenceType("Flexible")}
                                        >
                                            <span className="text-xs font-bold uppercase">Flexible</span>
                                            <span className="text-[9px] opacity-70">Assign anyone</span>
                                        </Button>
                                        <Button 
                                            variant={preferenceType === "Strict" ? "default" : "outline"}
                                            className="h-12 flex-col gap-0 items-center justify-center"
                                            onClick={() => setPreferenceType("Strict")}
                                        >
                                            <span className="text-xs font-bold uppercase">Strict</span>
                                            <span className="text-[9px] opacity-70">Specialist only</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* Availability Indicator */}
                                <div className={cn(
                                    "border rounded-xl p-4 flex items-center justify-between transition-all",
                                    isAvailable === true ? "bg-emerald-500/5 border-emerald-500/20" :
                                    isAvailable === false ? "bg-orange-500/5 border-orange-500/20" :
                                    "bg-muted/10 border-border/50"
                                )}>
                                    <div className="flex items-center gap-3">
                                        {checkingAvailability ? (
                                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                                        ) : isAvailable === true ? (
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500"><CheckCircle2 className="w-5 h-5" /></div>
                                        ) : isAvailable === false ? (
                                            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500"><AlertCircle className="w-5 h-5" /></div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><Clock className="w-5 h-5" /></div>
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold uppercase tracking-tight">
                                                {checkingAvailability ? "Checking..." : 
                                                 isAvailable === true ? "Slot Available" : 
                                                 isAvailable === false ? "Fully Booked" : "Select Inputs"}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground leading-none">
                                                {isAvailable === false ? "Fallback to waitlist active" : "Real-time verification"}
                                            </span>
                                        </div>
                                    </div>
                                    {isAvailable !== null && !checkingAvailability && (
                                        <Badge variant={isAvailable ? "secondary" : "outline"} className={cn("text-[9px] uppercase", isAvailable && "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 border-none")}>
                                            {isAvailable ? "READY" : "BUSY"}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    <Separator />

                    <div className="flex gap-4 pt-2 pb-2">
                        <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-12 uppercase tracking-widest text-xs font-bold">Cancel</Button>
                        <Button 
                            onClick={handleSave} 
                            disabled={loading || checkingAvailability || !clientId || !consultantId || isAvailable === null} 
                            className={cn(
                                "flex-1 h-12 uppercase tracking-widest text-xs font-bold shadow-lg transition-transform active:scale-95",
                                isAvailable === false ? "bg-orange-600 hover:bg-orange-700" : "bg-primary hover:bg-primary/90"
                            )}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                             isAvailable === false ? "Join Waitlist" : "Confirm Booking"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
