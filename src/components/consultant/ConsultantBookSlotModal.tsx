import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Calendar as CalendarIcon, Clock, User, Plus, Loader2, Check, ChevronsUpDown, Lock, Search, AlertCircle, Ban } from "lucide-react";
import { format } from "date-fns";
import { VIPName } from "@/components/ui/VIPBadge";
import { filterServicesByRole, Service } from "@/utils/serviceMapping";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultDate?: Date;
    onSuccess?: () => void;
}

interface SlotItem {
    startTime: string; // "09:00"
    endTime: string;   // "09:45"
    label: string;     // "09:00 AM - 09:45 AM"
    isBooked: boolean;
}

export function ConsultantBookSlotModal({ open, onOpenChange, defaultDate, onSuccess }: Props) {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    
    // Data states
    const [clients, setClients] = useState<any[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [clientOpen, setClientOpen] = useState(false);

    // Permitted Services state
    const [permittedServices, setPermittedServices] = useState<Service[]>([]);
    const [loadingServices, setLoadingServices] = useState(false);
    
    // Form states
    const [selectedClientId, setSelectedClientId] = useState("");
    const [serviceType, setServiceType] = useState("");
    const [serviceId, setServiceId] = useState<string | null>(null);
    const [sessionDate, setSessionDate] = useState(format(defaultDate || new Date(), "yyyy-MM-dd"));
    const [startTime, setStartTime] = useState("");
    const [durationMinutes, setDurationMinutes] = useState("60");
    const [sessionMode, setSessionMode] = useState("In-Person");
    const [notes, setNotes] = useState("");

    // Availability, Org Settings & Booked Sessions state
    const [orgSettings, setOrgSettings] = useState<any>(null);
    const [availabilityRules, setAvailabilityRules] = useState<any[]>([]);
    const [bookedSessions, setBookedSessions] = useState<any[]>([]);
    const [loadingBookings, setLoadingBookings] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);

    useEffect(() => {
        if (open) {
            fetchClients();
            fetchPermittedServices();
            fetchAvailabilityRules();
            fetchOrgSettings();
            setSelectedSlot(null);
            setStartTime("");
            if (defaultDate) {
                setSessionDate(format(defaultDate, "yyyy-MM-dd"));
            }
        }
    }, [open, defaultDate, profile?.id, profile?.organization_id]);

    useEffect(() => {
        if (open && sessionDate && profile?.id) {
            fetchBookedSessions(sessionDate);
            setSelectedSlot(null);
            setStartTime("");
        }
    }, [open, sessionDate, profile?.id]);

    const fetchOrgSettings = async () => {
        try {
            if (profile?.organization_id) {
                const data = await apiFetch<any>(`/organizations/${profile.organization_id}/settings`);
                if (data && data.default_slot_duration) {
                    setOrgSettings(data);
                    setDurationMinutes(String(data.default_slot_duration));
                }
            }
        } catch (err) {
            console.warn("Failed to fetch organization settings:", err);
        }
    };

    const fetchClients = async () => {
        try {
            setLoadingClients(true);
            const data = await apiFetch<any[]>("/clients");
            if (data && Array.isArray(data)) {
                setClients(data);
            }
        } catch (error) {
            console.error("Error fetching clients:", error);
        } finally {
            setLoadingClients(false);
        }
    };

    // Fetch services permitted for this specific therapist based on Service Mapping
    const fetchPermittedServices = async () => {
        try {
            setLoadingServices(true);
            const [allServices, mappings] = await Promise.all([
                apiFetch<Service[]>("/billing/services?is_active=true").catch(() => []),
                apiFetch<any[]>("/admin/consultant-services").catch(() => []),
            ]);

            if (allServices && Array.isArray(allServices) && allServices.length > 0) {
                const therapistId = profile?.id;
                const myMappings = (mappings || []).filter((m: any) => m.consultant_id === therapistId);

                let allowed: Service[] = [];
                if (myMappings.length > 0) {
                    const mappedIds = new Set(myMappings.map((m: any) => m.service_id));
                    allowed = allServices.filter(s => mappedIds.has(s.id));
                }

                if (allowed.length === 0) {
                    allowed = filterServicesByRole(allServices, profile?.profession, profile?.role || "consultant");
                }

                if (allowed.length === 0) {
                    allowed = allServices;
                }

                setPermittedServices(allowed);
                if (allowed.length > 0) {
                    setServiceType(allowed[0].name);
                    setServiceId(allowed[0].id);
                }
            }
        } catch (error) {
            console.error("Error fetching permitted services:", error);
        } finally {
            setLoadingServices(false);
        }
    };

    const fetchAvailabilityRules = async () => {
        try {
            const res = await apiFetch<any[]>("/appointments/availability/bulk");
            if (res && Array.isArray(res)) {
                setAvailabilityRules(res);
            }
        } catch (err) {
            console.warn("Failed to load availability rules:", err);
        }
    };

    const fetchBookedSessions = async (dateStr: string) => {
        try {
            setLoadingBookings(true);
            const start = `${dateStr}T00:00:00.000Z`;
            const end = `${dateStr}T23:59:59.999Z`;
            const res = await apiFetch<any[]>(`/api/appointments?specialist_id=${profile?.id}&start=${start}&end=${end}`);
            if (res && Array.isArray(res)) {
                setBookedSessions(res.filter(s => s.status !== "Cancelled"));
            }
        } catch (err) {
            console.warn("Failed to load booked sessions:", err);
        } finally {
            setLoadingBookings(false);
        }
    };

    // Calculate dynamic slot duration based on Admin org settings / availability rules
    const slotDurationNum = useMemo(() => {
        const dateObj = new Date(`${sessionDate}T00:00:00`);
        const dayOfWeek = dateObj.getDay();
        const rule = availabilityRules.find(
            (r) => r.consultant_id === profile?.id && Number(r.day_of_week) === dayOfWeek
        );
        return rule?.slot_duration_interval || orgSettings?.default_slot_duration || parseInt(durationMinutes, 10) || 60;
    }, [availabilityRules, profile?.id, sessionDate, orgSettings, durationMinutes]);

    // Calculate end time string from selected slot or start time + duration
    const endTime = useMemo(() => {
        if (selectedSlot) return selectedSlot.endTime;
        if (!startTime) return "";
        const [h, m] = startTime.split(":").map(Number);
        const totalMin = h * 60 + m + slotDurationNum;
        const endH = Math.floor(totalMin / 60) % 24;
        const endM = totalMin % 60;
        const formatTwoDigits = (num: number) => (num < 10 ? `0${num}` : `${num}`);
        return `${formatTwoDigits(endH)}:${formatTwoDigits(endM)}`;
    }, [selectedSlot, startTime, slotDurationNum]);

    // Generate time slots bounded by therapist shift hours and calculate occupancy
    const timeSlots = useMemo(() => {
        const dateObj = new Date(`${sessionDate}T00:00:00`);
        const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

        const rule = availabilityRules.find(
            (r) => r.consultant_id === profile?.id && Number(r.day_of_week) === dayOfWeek
        );

        let startMinutes = 9 * 60;  // Default 09:00 AM
        let endMinutes = 18 * 60;   // Default 06:00 PM

        if (rule) {
            if (rule.start_time) {
                const parts = rule.start_time.split(":");
                startMinutes = (parseInt(parts[0], 10) || 9) * 60 + (parseInt(parts[1], 10) || 0);
            }
            if (rule.end_time) {
                const parts = rule.end_time.split(":");
                endMinutes = (parseInt(parts[0], 10) || 18) * 60 + (parseInt(parts[1], 10) || 0);
            }
        }

        const slotDur = slotDurationNum;
        const stepInterval = slotDur; // Step by exact slot duration set by Admin
        const slots: SlotItem[] = [];

        let current = startMinutes;
        while (current + slotDur <= endMinutes) {
            const startH = Math.floor(current / 60);
            const startM = current % 60;
            const endTotal = current + slotDur;
            const endH = Math.floor(endTotal / 60);
            const endM = endTotal % 60;

            const formatTwoDigits = (num: number) => (num < 10 ? `0${num}` : `${num}`);

            const startFormatted = `${formatTwoDigits(startH)}:${formatTwoDigits(startM)}`;
            const endFormatted = `${formatTwoDigits(endH)}:${formatTwoDigits(endM)}`;

            const formatAmPm = (hh: number, mm: number) => {
                const ampm = hh >= 12 ? "PM" : "AM";
                const displayH = hh % 12 === 0 ? 12 : hh % 12;
                return `${displayH}:${formatTwoDigits(mm)} ${ampm}`;
            };

            const label = `${formatAmPm(startH, startM)} - ${formatAmPm(endH, endM)}`;

            // Check if slot overlaps any existing booked session for this therapist
            const isBooked = bookedSessions.some((b) => {
                if (!b.scheduled_start) return false;
                
                const bStart = new Date(b.scheduled_start);
                let bEnd: Date;
                if (b.scheduled_end) {
                    bEnd = new Date(b.scheduled_end);
                } else {
                    bEnd = new Date(bStart.getTime() + slotDur * 60000);
                }

                const slotStartObj = new Date(`${sessionDate}T${startFormatted}:00`);
                const slotEndObj = new Date(`${sessionDate}T${endFormatted}:00`);

                return slotStartObj < bEnd && slotEndObj > bStart;
            });

            slots.push({
                startTime: startFormatted,
                endTime: endFormatted,
                label,
                isBooked,
            });

            current += stepInterval;
        }

        return slots;
    }, [sessionDate, bookedSessions, slotDurationNum, availabilityRules, profile?.id]);

    // Available (unoccupied) slots only
    const availableSlots = useMemo(() => {
        return timeSlots.filter(s => !s.isBooked);
    }, [timeSlots]);

    const selectedClient = useMemo(() => {
        return clients.find(c => c.id === selectedClientId);
    }, [clients, selectedClientId]);

    const handleSelectService = (name: string) => {
        setServiceType(name);
        const match = permittedServices.find(s => s.name === name);
        if (match) setServiceId(match.id);
    };

    const handleSelectSlot = (slot: SlotItem) => {
        setSelectedSlot(slot);
        setStartTime(slot.startTime);
    };

    const handleSave = async () => {
        if (!selectedClientId) {
            toast({
                title: "Client Required",
                description: "Please select a client to book the slot for.",
                variant: "destructive",
            });
            return;
        }

        if (!sessionDate || !startTime || !selectedSlot) {
            toast({
                title: "Time Slot Required",
                description: "Please select an available time slot above to schedule.",
                variant: "destructive",
            });
            return;
        }

        try {
            setSubmitting(true);
            const startISO = new Date(`${sessionDate}T${selectedSlot.startTime}:00`).toISOString();
            const endISO = new Date(`${sessionDate}T${selectedSlot.endTime}:00`).toISOString();

            const payload = {
                client_id: selectedClientId,
                therapist_id: profile?.id,
                service_id: serviceId || undefined,
                service_type: serviceType,
                scheduled_start: startISO,
                scheduled_end: endISO,
                session_mode: sessionMode,
                session_notes: notes || undefined,
                status: "Planned",
            };

            await apiFetch("/api/appointments", {
                method: "POST",
                body: JSON.stringify(payload),
            });

            toast({
                title: "Slot Booked Successfully",
                description: `Slot (${selectedSlot.label}) for ${selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : "Client"} has been scheduled. Note: Changes or cancellations must be made through an Admin.`,
            });

            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error("Booking error:", error);
            toast({
                title: "Booking Failed",
                description: error.message || "Failed to book slot. Please check availability and try again.",
                variant: "destructive",
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[580px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-display">
                        <Plus className="w-5 h-5 text-primary" />
                        Book Client Consultation Slot
                    </DialogTitle>
                    <DialogDescription>
                        Schedule a consultation slot for your client. Only available (unoccupied) slots and permitted services are displayed.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Notice Callout */}
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2.5">
                        <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div>
                            <span className="font-semibold">Important Policy:</span> Once booked, this slot is fixed in the schedule engine. To reschedule or cancel a booked slot, you must contact an Admin.
                        </div>
                    </div>

                    {/* Practitioner Info */}
                    <div className="p-3 bg-muted/40 rounded-lg border border-border flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-primary" />
                            <span className="text-muted-foreground">Practitioner:</span>
                        </div>
                        <span className="font-medium text-foreground">
                            {profile?.first_name} {profile?.last_name} {profile?.profession ? `(${profile.profession})` : ""}
                        </span>
                    </div>

                    {/* Client Selection */}
                    <div className="space-y-1.5">
                        <Label className="font-medium">Client / Patient *</Label>
                        <Popover open={clientOpen} onOpenChange={setClientOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={clientOpen}
                                    className="w-full justify-between font-normal text-left h-10"
                                >
                                    {selectedClient ? (
                                        <div className="flex items-center gap-2 truncate">
                                            <User className="w-4 h-4 text-primary shrink-0" />
                                            <VIPName name={`${selectedClient.first_name} ${selectedClient.last_name}`} isVIP={selectedClient.is_vip} />
                                            {selectedClient.uhid && (
                                                <span className="text-xs text-muted-foreground">({selectedClient.uhid})</span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            {loadingClients ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 opacity-50" />}
                                            Search and select client...
                                        </span>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[480px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search client name, mobile, UHID..." />
                                    <CommandList className="max-h-60">
                                        <CommandEmpty>No client found.</CommandEmpty>
                                        <CommandGroup>
                                            {clients.map((c) => (
                                                <CommandItem
                                                    key={c.id}
                                                    value={`${c.first_name} ${c.last_name} ${c.uhid || ""} ${c.mobile_no || ""}`}
                                                    onSelect={() => {
                                                        setSelectedClientId(c.id);
                                                        setClientOpen(false);
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedClientId === c.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    <div className="flex flex-col">
                                                        <div className="font-medium text-sm">
                                                            <VIPName name={`${c.first_name} ${c.last_name}`} isVIP={c.is_vip} />
                                                        </div>
                                                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                            {c.uhid && <span>UHID: {c.uhid}</span>}
                                                            {c.sport && <span>• {c.sport}</span>}
                                                        </div>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Service Type - Strictly Filtered by Service Mapping Permissions */}
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="font-medium">Service / Consultation Type *</Label>
                            <span className="text-[11px] text-muted-foreground">
                                Filtered by Service Mapping ({permittedServices.length} permitted)
                            </span>
                        </div>
                        <Select value={serviceType} onValueChange={handleSelectService}>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder={loadingServices ? "Loading allowed services..." : "Select service"} />
                            </SelectTrigger>
                            <SelectContent>
                                {permittedServices.map(s => (
                                    <SelectItem key={s.id} value={s.name}>
                                        {s.name} {s.category ? `(${s.category})` : ""}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date & Mode Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="font-medium">Date *</Label>
                            <div className="relative">
                                <Input
                                    type="date"
                                    value={sessionDate}
                                    onChange={(e) => setSessionDate(e.target.value)}
                                    className="h-10 pl-9"
                                />
                                <CalendarIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="font-medium">Session Mode</Label>
                            <Select value={sessionMode} onValueChange={setSessionMode}>
                                <SelectTrigger className="h-10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="In-Person">In-Person</SelectItem>
                                    <SelectItem value="Virtual">Virtual / Online</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Available Time Slots Grid */}
                    <div className="space-y-2 border border-border/60 rounded-xl p-3 bg-muted/20">
                        <div className="flex items-center justify-between">
                            <Label className="font-medium text-xs flex items-center gap-1.5 text-foreground">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                Available Time Slots ({format(new Date(`${sessionDate}T00:00:00`), "MMM d")}) • {slotDurationNum} mins/slot
                            </Label>
                            {loadingBookings && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                        </div>

                        {availableSlots.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                                {availableSlots.map((slot) => {
                                    const isSelected = selectedSlot?.startTime === slot.startTime;
                                    return (
                                        <button
                                            key={slot.startTime}
                                            type="button"
                                            onClick={() => handleSelectSlot(slot)}
                                            className={cn(
                                                "px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left flex items-center justify-between",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                                                    : "bg-card hover:bg-muted border-border text-foreground"
                                            )}
                                        >
                                            <span>{slot.label}</span>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground shrink-0 ml-1" />}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                <Ban className="w-4 h-4 text-amber-600 shrink-0" />
                                <span>No open slots available on this date. All slots are currently occupied or outside shift hours.</span>
                            </div>
                        )}
                    </div>

                    {/* Selected Slot Summary Card */}
                    {selectedSlot ? (
                        <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
                            <div className="flex items-center gap-2.5">
                                <Clock className="w-4 h-4 text-primary shrink-0" />
                                <div>
                                    <span className="font-medium text-muted-foreground">Selected Time Slot:</span>{" "}
                                    <span className="font-mono font-bold text-foreground text-sm">{selectedSlot.label}</span>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 bg-primary/20 text-primary font-bold rounded-md text-[10px]">
                                {slotDurationNum} Mins
                            </span>
                        </div>
                    ) : (
                        <div className="p-3 bg-muted/40 border border-dashed border-border rounded-xl text-xs text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>Please select an available time slot chip above to confirm your booking.</span>
                        </div>
                    )}

                    {/* Optional Notes */}
                    <div className="space-y-1.5">
                        <Label className="font-medium">Session Notes (Optional)</Label>
                        <Textarea
                            placeholder="Initial notes or remarks for this booking..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={submitting || !selectedSlot} className="gap-2">
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirm Booking
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
