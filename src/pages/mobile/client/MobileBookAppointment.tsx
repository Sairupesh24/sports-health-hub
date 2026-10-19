import { useState, useEffect, useMemo } from "react";
import { format, addDays } from "date-fns";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, ArrowRight, ArrowLeft, Star, Loader2, AlertCircle, Repeat, Bookmark } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { filterConsultantsByService, type Service } from "@/utils/serviceMapping";

type Consultant = {
    id: string;
    first_name: string;
    last_name: string;
    profession?: string;
    ams_role?: string;
};

type TimeSlot = {
    slot_start: string;
    slot_end: string;
};

export default function MobileBookAppointment() {
    const { profile, clientId } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [consultants, setConsultants] = useState<Consultant[]>([]);
    const [serviceMappings, setServiceMappings] = useState<any[]>([]);

    // Booking State
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string>("");
    const [selectedServiceType, setSelectedServiceType] = useState<string>("");
    const [selectedConsultant, setSelectedConsultant] = useState<string>("");
    const [preferenceType, setPreferenceType] = useState<"Strict" | "Flexible">("Flexible");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [booking, setBooking] = useState(false);

    useEffect(() => {
        async function fetchServices() {
            if (!profile?.organization_id) return;
            try {
                const data = await apiFetch('/api/billing/services?is_active=true');
                if (data) setServices(data as Service[]);
            } catch (err) {
                console.error("Error fetching services", err);
            }
        }
        fetchServices();
    }, [profile?.organization_id]);

    useEffect(() => {
        async function loadData() {
            if (!profile?.organization_id) return;
            try {
                const [empData, mappingData] = await Promise.all([
                    apiFetch<any[]>('/hr/employees?role_type=clinical'),
                    apiFetch<any[]>('/admin/consultant-services')
                ]);
                setConsultants(empData || []);
                setServiceMappings(mappingData || []);
            } catch (err: any) {
                toast({ title: "Error loading data", description: err.message, variant: "destructive" });
            }
        }
        loadData();
    }, [profile?.organization_id]);

    const filteredConsultants = useMemo(() => {
        const selectedService = services.find(s => s.id === selectedServiceId);
        return filterConsultantsByService(consultants, selectedService, serviceMappings);
    }, [consultants, selectedServiceId, services, serviceMappings]);

    useEffect(() => {
        const selected = services.find(s => s.id === selectedServiceId);
        if (selected) setSelectedServiceType(selected.name);
    }, [selectedServiceId, services]);

    useEffect(() => {
        async function fetchSlots() {
            if (!profile?.organization_id || !selectedConsultant || !selectedDate) return;
            setLoading(true);
            setAvailableSlots([]);
            setSelectedSlot(null);
            try {
                const formattedDate = format(selectedDate, "yyyy-MM-dd");
                const data = await apiFetch(`/api/appointments/availability?therapist_id=${selectedConsultant}&date=${formattedDate}`);
                setAvailableSlots(data?.slots || []);
            } catch (err: any) {
                toast({ title: "Failed to load timeslots", description: err.message, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }

        if (step === 2) {
            fetchSlots();
        }
    }, [selectedConsultant, selectedDate, step, profile]);

    const handleBook = async () => {
        if (!profile?.organization_id || !selectedSlot || !selectedDate || !clientId) {
            if (!clientId) toast({ title: "Registration Incomplete", description: "Your client profile is not fully registered.", variant: "destructive" });
            return;
        }
        setBooking(true);

        try {
            const formattedDate = format(selectedDate, "yyyy-MM-dd");
            const scheduledStart = `${formattedDate}T${selectedSlot.slot_start}:00`;
            const scheduledEnd = `${formattedDate}T${selectedSlot.slot_end}:00`;

            await apiFetch('/api/appointments', {
                method: 'POST',
                body: JSON.stringify({
                    client_id: clientId,
                    therapist_id: selectedConsultant,
                    service_id: selectedServiceId || null,
                    service_type: selectedServiceType,
                    scheduled_start: new Date(scheduledStart).toISOString(),
                    scheduled_end: new Date(scheduledEnd).toISOString(),
                    session_mode: 'Individual',
                    preference_type: preferenceType,
                    is_flexible_routing: preferenceType === "Flexible"
                })
            });

            toast({ title: "Appointment Confirmed!" });
            setStep(3);
        } catch (err: any) {
            toast({ title: "Booking Failed", description: err.message, variant: "destructive" });
            if (err.message.includes('timeslot')) setStep(2);
        } finally {
            setBooking(false);
        }
    };

    const handleJoinWaitlist = async () => {
        if (!profile?.organization_id || !selectedDate || !clientId || !selectedConsultant) return;
        setBooking(true);
        try {
            await apiFetch('/api/appointments/waitlist', {
                method: 'POST',
                body: JSON.stringify({
                    client_id: clientId,
                    therapist_id: selectedConsultant,
                    service_id: selectedServiceId || null,
                    preferred_date: format(selectedDate, "yyyy-MM-dd"),
                    preferred_time_slot: "09:00",
                    preference_type: preferenceType
                })
            });
            toast({ title: "Added to Waitlist" });
            setStep(3);
        } catch (err: any) {
            toast({ title: "Waitlist Failed", description: err.message, variant: "destructive" });
        } finally {
            setBooking(false);
        }
    };

    const selectedConsultantObj = consultants.find(c => c.id === selectedConsultant);

    return (
        <MobileLayout>
            <div className="space-y-6 pb-20">
                {/* Mobile Wizard Header */}
                <header className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Step {step} of 3</span>
                         </div>
                         {step > 1 && step < 3 && (
                             <button onClick={() => setStep(step - 1)} className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors">
                                 <ArrowLeft className="w-3.5 h-3.5" /> Back
                             </button>
                         )}
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                        {step === 1 ? "Choose Service" : step === 2 ? "Select Date & Time" : "Booking Confirmed"}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {step === 1 ? "Select a clinical or performance specialty" : step === 2 ? "Pick an open slot on the specialist schedule" : "Your session has been recorded"}
                    </p>
                </header>

                {/* Step 1: Service & Consultant */}
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Service List */}
                        <div className="space-y-2.5">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">Available Services</h3>
                            <div className="grid grid-cols-1 gap-2.5">
                                {services.map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => setSelectedServiceId(service.id)}
                                        className={cn(
                                            "w-full p-4 rounded-2xl border text-left transition-all shadow-xs",
                                            selectedServiceId === service.id
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-700'
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold text-sm tracking-tight leading-snug">{service.name}</h4>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">{service.category || "Clinical & Performance"}</p>
                                            </div>
                                            {selectedServiceId === service.id && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Specialist selection */}
                        {selectedServiceId && (
                            <div className="space-y-2.5 pt-2 animate-in fade-in duration-200">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">Choose Specialist</h3>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {filteredConsultants.map(consultant => (
                                        <button
                                            key={consultant.id}
                                            onClick={() => setSelectedConsultant(consultant.id)}
                                            className={cn(
                                                "w-full p-3.5 rounded-2xl border flex items-center gap-3 transition-all shadow-xs",
                                                selectedConsultant === consultant.id
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-700'
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform",
                                                selectedConsultant === consultant.id 
                                                    ? 'bg-primary text-white' 
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                            )}>
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div className="text-left flex-1 min-w-0">
                                                <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">Dr. {consultant.last_name}</p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">{consultant.profession || "Consultant"}</p>
                                            </div>
                                            {selectedConsultant === consultant.id && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={() => setStep(2)}
                            disabled={!selectedServiceId || !selectedConsultant}
                            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 font-semibold text-xs gap-2 shadow-sm mt-4"
                        >
                            <span>Select Date & Time</span>
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                {/* Step 2: Date & Time */}
                {step === 2 && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                className="mx-auto"
                                disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                            />
                        </div>

                        {/* Preference Toggle */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <Repeat className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Routing Mode</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white">{preferenceType} Assignment</p>
                                    </div>
                                </div>
                                <Switch 
                                    checked={preferenceType === "Flexible"} 
                                    onCheckedChange={(checked) => setPreferenceType(checked ? "Flexible" : "Strict")} 
                                />
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                {preferenceType === "Flexible" ? "Get care sooner by allowing other experts to help if your primary choice is unavailable." : "Consult only with your selected specialist."}
                            </p>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-8 space-y-2">
                                <Loader2 className="animate-spin w-6 h-6 text-primary" />
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading open slots...</p>
                            </div>
                        ) : availableSlots.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">Available Timeslots</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {availableSlots.map((slot, idx) => {
                                        const isSelected = selectedSlot?.slot_start === slot.slot_start;
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedSlot(slot)}
                                                className={cn(
                                                    "py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all shadow-xs",
                                                    isSelected
                                                        ? 'bg-primary text-white border-primary shadow-xs font-bold'
                                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                )}
                                            >
                                                {slot.slot_start?.substring(0, 5) ?? ""}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                                <AlertCircle className="w-6 h-6 text-amber-500" />
                                <p className="text-slate-900 dark:text-white font-bold text-sm">No Slots Available</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Try selecting another date or join the priority waitlist.</p>
                                {selectedConsultantObj?.profession?.toLowerCase() !== 'sports scientist' && selectedConsultantObj?.ams_role !== 'sports_scientist' && (
                                    <Button 
                                        variant="outline" 
                                        onClick={handleJoinWaitlist}
                                        className="rounded-xl border-primary text-primary hover:bg-primary/10 font-semibold text-xs px-4 h-9 mt-2"
                                    >
                                        Join Waitlist
                                    </Button>
                                )}
                            </div>
                        )}

                        <Button
                            onClick={handleBook}
                            disabled={!selectedSlot || booking}
                            className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 font-semibold text-xs gap-2 shadow-sm mt-3"
                        >
                            {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>{booking ? "Confirming..." : "Confirm Booking"}</span>
                        </Button>
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                    <div className="animate-in zoom-in duration-300 py-6 text-center space-y-5">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-sm">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div className="space-y-1.5 px-4">
                            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Booking Confirmed!</h2>
                            <p className="text-slate-600 dark:text-slate-400 font-medium text-xs">
                                Consultation scheduled with <span className="text-slate-900 dark:text-white font-bold">Dr. {selectedConsultantObj?.last_name}</span>.
                            </p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-center gap-6 max-w-xs mx-auto">
                            <div className="text-center">
                                <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-0.5">Date</p>
                                <p className="font-bold text-sm text-slate-900 dark:text-white">{selectedDate ? format(selectedDate, "MMM d, yyyy") : "N/A"}</p>
                            </div>
                            <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 self-center" />
                            <div className="text-center">
                                <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-0.5">Time</p>
                                <p className="font-bold text-sm text-slate-900 dark:text-white">{selectedSlot?.slot_start?.substring(0, 5) ?? "N/A"}</p>
                            </div>
                        </div>
                        <Button 
                            onClick={() => window.location.href = '/mobile/client'} 
                            className="w-full max-w-xs h-11 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 font-semibold text-xs shadow-sm"
                        >
                            Return to Dashboard
                        </Button>
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
