import { useState, useEffect, useMemo } from "react";
import { format, addDays } from "date-fns";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, ArrowRight, ArrowLeft, Star, Loader2, AlertCircle, Repeat, Bookmark } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
            const { data, error } = await supabase
                .from("services")
                .select("id, name, category, organization_id")
                .eq("organization_id", profile.organization_id)
                .eq("is_active", true);
            if (!error && data) setServices(data as Service[]);
        }
        fetchServices();
    }, [profile?.organization_id]);

    useEffect(() => {
        async function loadConsultants() {
            if (!profile?.organization_id) return;
            try {
                const { data: profilesData, error: profilesError } = await (supabase as any)
                    .from("profiles")
                    .select("id, first_name, last_name, profession, ams_role")
                    .eq("organization_id", profile.organization_id)
                    .eq("is_approved", true)
                    .in("profession", ["Sports Physician", "Physiotherapist", "Sports Scientist", "Massage therapist", "Nutritionist"]);

                if (profilesError) throw profilesError;

                const userIds = profilesData?.map(p => p.id) || [];
                if (userIds.length === 0) {
                    setConsultants([]);
                    return;
                }

                const { data: roleData, error: roleError } = await (supabase as any)
                    .from("user_roles")
                    .select("user_id, role")
                    .in("user_id", userIds);

                if (roleError) throw roleError;

                const specialists = (profilesData || [])
                    .filter(p => {
                        const r = roleData?.find(role => role.user_id === p.id);
                        return r && !["client", "athlete"].includes(r.role);
                    })
                    .map(p => ({
                        ...p,
                        ams_role: roleData?.find(r => r.user_id === p.id)?.role
                    }));

                setConsultants(specialists);
            } catch (err: any) {
                toast({ title: "Error loading consultants", description: err.message, variant: "destructive" });
            }
        }
        loadConsultants();
    }, [profile?.organization_id]);

    const filteredConsultants = useMemo(() => {
        const selectedService = services.find(s => s.id === selectedServiceId);
        return filterConsultantsByService(consultants, selectedService);
    }, [consultants, selectedServiceId, services]);

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
                const { data, error } = await supabase.rpc('get_available_slots' as any, {
                    p_org_id: profile.organization_id,
                    p_consultant_id: selectedConsultant,
                    p_date: formattedDate,
                    p_service: null
                });

                if (error) throw error;
                setAvailableSlots(data || []);
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

            const { error: sessionError } = await (supabase as any)
                .from('sessions')
                .insert({
                    organization_id: profile.organization_id,
                    client_id: clientId,
                    therapist_id: selectedConsultant,
                    service_id: selectedServiceId || null,
                    service_type: selectedServiceType,
                    scheduled_start: new Date(scheduledStart).toISOString(),
                    scheduled_end: new Date(scheduledEnd).toISOString(),
                    status: 'Planned',
                    created_by: profile.id,
                    session_mode: 'Individual',
                    preference_type: preferenceType,
                    is_flexible_routing: preferenceType === "Flexible"
                })
                .select()
                .single();

            if (sessionError) {
                if (sessionError.code === '23P04' || sessionError.message?.includes('overlap')) {
                    throw new Error("This timeslot was just booked. Please select another.");
                }
                throw sessionError;
            }

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
            const { error } = await (supabase as any).from("waitlist").insert({
                organization_id: profile?.organization_id,
                client_id: clientId,
                therapist_id: selectedConsultant,
                service_id: selectedServiceId || null,
                preferred_date: format(selectedDate, "yyyy-MM-dd"),
                preferred_time_slot: "09:00",
                preference_type: preferenceType,
                status: "Waiting"
            });

            if (error) throw error;
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
            <div className="space-y-8">
                {/* Mobile Wizard Header */}
                <header className="space-y-2">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary">Step {step}/3</span>
                         </div>
                         {step > 1 && step < 3 && (
                             <button onClick={() => setStep(step - 1)} className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                                 <ArrowLeft className="w-3 h-3" /> Back
                             </button>
                         )}
                    </div>
                    <h1 className="text-3xl font-black italic tracking-tighter uppercase leading-tight">
                        {step === 1 ? "Choose Service" : step === 2 ? "Select Time" : "Confirmed"}
                    </h1>
                </header>

                {/* Step 1: Service & Consultant */}
                {step === 1 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        {/* Service List */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Elite Services</h3>
                            <div className="grid grid-cols-1 gap-3">
                                {services.map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => setSelectedServiceId(service.id)}
                                        className={cn(
                                            "w-full p-5 rounded-3xl border-2 text-left transition-all duration-300 relative overflow-hidden",
                                            selectedServiceId === service.id
                                                ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                                                : 'border-white/5 bg-white/5'
                                        )}
                                    >
                                        <div className="relative z-10 flex items-center justify-between">
                                            <div>
                                                <h4 className={cn("font-black tracking-tight", selectedServiceId === service.id ? "text-primary" : "text-white")}>{service.name}</h4>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-widest">{service.category || "General Elite"}</p>
                                            </div>
                                            {selectedServiceId === service.id && <CheckCircle2 className="w-5 h-5 text-primary" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Specialist selection */}
                        {selectedServiceId && (
                            <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-bottom-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Available Specialists</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {filteredConsultants.map(consultant => (
                                        <button
                                            key={consultant.id}
                                            onClick={() => setSelectedConsultant(consultant.id)}
                                            className={cn(
                                                "w-full p-4 rounded-3xl border-2 flex items-center gap-4 transition-all duration-300",
                                                selectedConsultant === consultant.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-white/5 bg-white/5'
                                            )}
                                        >
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-transform",
                                                selectedConsultant === consultant.id ? 'bg-primary border-primary text-white scale-105' : 'bg-slate-800 border-white/5 text-slate-600'
                                            )}>
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-black text-white leading-tight">Dr. {consultant.last_name}</p>
                                                <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-none mt-1">{consultant.profession || "Consultant"}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Button
                            onClick={() => setStep(2)}
                            disabled={!selectedServiceId || !selectedConsultant}
                            className="w-full h-16 rounded-3xl bg-white text-slate-900 font-black text-lg gap-3 uppercase italic tracking-tight active:scale-95 transition-transform mt-8"
                        >
                            Select Date <ArrowRight className="w-5 h-5" />
                        </Button>
                    </div>
                )}

                {/* Step 2: Date & Time */}
                {step === 2 && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <div className="p-4 bg-white/5 rounded-[32px] border border-white/5">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                className="mx-auto"
                                disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                            />
                        </div>

                        {/* Preference Toggle */}
                        <div className="p-5 bg-primary/5 rounded-3xl border border-primary/10 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-primary border border-white/5">
                                        <Repeat className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-primary">Routing</p>
                                        <p className="text-sm font-black italic text-white uppercase">{preferenceType}</p>
                                    </div>
                                </div>
                                <Switch 
                                    checked={preferenceType === "Flexible"} 
                                    onCheckedChange={(checked) => setPreferenceType(checked ? "Flexible" : "Strict")} 
                                />
                            </div>
                            <p className="text-[10px] font-bold text-slate-500 italic leading-relaxed">
                                {preferenceType === "Flexible" ? "Get care sooner by allowing other experts to help if your primary choice is unavailable." : "Consult only with your selected specialist."}
                            </p>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-10 space-y-3">
                                <Loader2 className="animate-spin w-8 h-8 text-primary" />
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Fetching Slots</p>
                            </div>
                        ) : availableSlots.length > 0 ? (
                            <div className="grid grid-cols-3 gap-3">
                                {availableSlots.map((slot, idx) => {
                                    const isSelected = selectedSlot?.slot_start === slot.slot_start;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={cn(
                                                "py-4 rounded-2xl border-2 font-black italic transition-all active:scale-95",
                                                isSelected
                                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                                    : 'bg-white/5 text-slate-400 border-transparent'
                                            )}
                                        >
                                            {slot.slot_start?.substring(0, 5) ?? ""}
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl border border-dashed border-white/10 text-center">
                                <AlertCircle className="w-8 h-8 text-amber-500 mb-3" />
                                <p className="text-white font-black italic text-sm mb-4">No Slots Available</p>
                                <Button 
                                    variant="outline" 
                                    onClick={handleJoinWaitlist}
                                    className="rounded-2xl border-primary text-primary font-black uppercase text-[10px] tracking-widest px-6"
                                >
                                    Join Waitlist
                                </Button>
                            </div>
                        )}

                        <div className="fixed bottom-32 left-0 right-0 px-6 z-50 pointer-events-none">
                            <div className="max-w-md mx-auto pointer-events-auto">
                                <Button
                                    onClick={handleBook}
                                    disabled={!selectedSlot || booking}
                                    className="w-full h-16 rounded-3xl bg-primary text-white font-black text-lg gap-3 uppercase italic tracking-tight shadow-xl shadow-primary/20"
                                >
                                    {booking ? "Wait..." : "Confirm Booking"} <CheckCircle2 className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                    <div className="animate-in zoom-in duration-500 py-10 text-center space-y-8">
                        <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/20 rotate-6">
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        </div>
                        <div className="space-y-3 px-4">
                            <h2 className="text-4xl font-black italic tracking-tighter uppercase">Success!</h2>
                            <p className="text-slate-400 font-medium text-sm">
                                Protocol confirmed with <span className="text-white font-black underline decoration-primary underline-offset-4 decoration-2">Dr. {selectedConsultantObj?.last_name}</span>.
                            </p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-[32px] border border-white/5 flex justify-center gap-8">
                            <div className="text-center">
                                <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Date</p>
                                <p className="font-black text-white">{selectedDate ? format(selectedDate, "MMM d") : "N/A"}</p>
                            </div>
                            <div className="w-px h-8 bg-white/5" />
                            <div className="text-center">
                                <p className="text-[8px] font-black uppercase text-slate-500 mb-1">Time</p>
                                <p className="font-black text-white">{selectedSlot?.slot_start?.substring(0, 5) ?? "N/A"}</p>
                            </div>
                        </div>
                        <Button onClick={() => window.location.href = '/mobile/client'} className="w-full h-16 rounded-3xl bg-white text-slate-900 font-black text-lg uppercase italic tracking-tight">
                            Back Dashboard
                        </Button>
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}
