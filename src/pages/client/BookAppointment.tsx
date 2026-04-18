import { useState, useEffect, useMemo } from "react";
import { format, addDays, isSameDay } from "date-fns";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, ArrowRight, ArrowLeft, Star, Sparkles, Loader2, AlertCircle, Repeat, Bookmark } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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

// SERVICES list removed in favor of dynamic fetch

export default function BookAppointment() {
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
                // Fetch specialists by profession and role
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
            if (!clientId) toast({ title: "Registration Incomplete", description: "Your client profile is not fully registered. Please contact the administrator.", variant: "destructive" });
            return;
        }
        setBooking(true);

        try {
            const formattedDate = format(selectedDate, "yyyy-MM-dd");
            const scheduledStart = `${formattedDate}T${selectedSlot.slot_start}:00`;
            const scheduledEnd = `${formattedDate}T${selectedSlot.slot_end}:00`;

            const { data: newSession, error: sessionError } = await (supabase as any)
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
                    throw new Error("This timeslot was just booked by someone else. Please select another time.");
                }
                throw sessionError;
            }

            toast({ title: "Appointment Confirmed!", description: "Check your dashboard for details." });
            setStep(3);
        } catch (err: any) {
            toast({ title: "Booking Failed", description: err.message, variant: "destructive" });
            if (err.message.includes('timeslot')) {
                setStep(2);
            }
        } finally {
            setBooking(false);
        }
    };

    const handleJoinWaitlist = async () => {
        if (!profile?.organization_id || !selectedDate || !clientId || !selectedConsultant) {
            toast({ title: "Validation Error", description: "Please ensure all fields are selected.", variant: "destructive" });
            return;
        }
        setBooking(true);
        try {
            const { error } = await (supabase as any).from("waitlist").insert({
                organization_id: profile?.organization_id,
                client_id: clientId,
                therapist_id: selectedConsultant,
                service_id: selectedServiceId || null,
                preferred_date: format(selectedDate, "yyyy-MM-dd"),
                preferred_time_slot: "09:00", // Default or first available
                preference_type: preferenceType,
                status: "Waiting"
            });

            if (error) throw error;

            toast({ title: "Added to Waitlist", description: "We will notify you if a slot becomes available." });
            setStep(3);
        } catch (err: any) {
            toast({ title: "Waitlist Failed", description: err.message, variant: "destructive" });
        } finally {
            setBooking(false);
        }
    };

    const selectedConsultantObj = consultants.find(c => c.id === selectedConsultant);

    return (
        <DashboardLayout role="client">
            <div className="max-w-[1400px] mx-auto space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
                    <div className="space-y-1">
                        <h1 className="text-4xl font-black tracking-tight text-slate-900">Book Session</h1>
                        <p className="text-slate-500 font-medium italic">Schedule your path to recovery with our elite specialists.</p>
                    </div>
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shadow-sm relative overflow-hidden">
                       <Sparkles className="w-6 h-6 z-10" />
                       <div className="absolute inset-0 bg-gradient-to-br from-transparent to-amber-500/10" />
                    </div>
                </header>

                {/* Wizard Progress - Premium Overhaul */}
                <div className="max-w-xl mx-auto px-4">
                    <div className="flex items-center justify-between mb-8 relative">
                        <div className="absolute left-0 top-5 w-full h-1 bg-slate-100 rounded-full overflow-hidden -z-10">
                            <div
                                className="h-full bg-primary transition-all duration-700 ease-in-out"
                                style={{ width: `${((step - 1) / 2) * 100}%` }}
                            />
                        </div>
                        {[
                            { id: 1, label: "Service" },
                            { id: 2, label: "Time" },
                            { id: 3, label: "Confirm" }
                        ].map((s) => (
                            <div key={s.id} className="flex flex-col items-center gap-3 bg-transparent">
                                <div className={cn(
                                    "w-10 h-10 rounded-2xl flex items-center justify-center font-black transition-all duration-300 border-2",
                                    step >= s.id 
                                        ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-110' 
                                        : 'bg-white text-slate-400 border-slate-100'
                                )}>
                                    {step > s.id || (s.id === 3 && step === 3) ? <CheckCircle2 className="w-5 h-5" /> : s.id}
                                </div>
                                <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest transition-colors",
                                    step >= s.id ? 'text-primary' : 'text-slate-400'
                                )}>
                                    {s.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step 1: Service & Consultant */}
                {step === 1 && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in slide-in-from-right-8 duration-500">
                        <div className="lg:col-span-12 space-y-10">
                            <Card className="rounded-[40px] border-none shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
                                <CardHeader className="p-10 pb-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <Star className="w-5 h-5" />
                                        </div>
                                        <CardTitle className="text-3xl font-black italic tracking-tighter">Choose Service</CardTitle>
                                    </div>
                                    <CardDescription className="text-sm font-medium text-slate-400">Select the therapeutic protocol you wish to schedule.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-10 pt-4 space-y-10">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {services.map(service => (
                                            <div
                                                key={service.id}
                                                onClick={() => setSelectedServiceId(service.id)}
                                                className={cn(
                                                    "p-8 rounded-[32px] border-2 cursor-pointer transition-all duration-300 group relative overflow-hidden",
                                                    selectedServiceId === service.id
                                                        ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10'
                                                        : 'border-slate-50 hover:border-primary/20 hover:bg-slate-50'
                                                )}
                                            >
                                                <div className="relative z-10">
                                                    <h3 className="font-black text-lg text-slate-900 group-hover:text-primary transition-colors">{service.name}</h3>
                                                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-tight">{service.category || "Physiotherapy Elite"}</p>
                                                </div>
                                                {selectedServiceId === service.id && (
                                                    <div className="absolute top-4 right-4 text-primary">
                                                        <CheckCircle2 className="w-6 h-6 fill-primary/10" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-6 pt-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <h3 className="text-2xl font-black italic tracking-tighter">Select Specialist</h3>
                                            </div>
                                            {selectedServiceId && (
                                                <Badge variant="secondary" className="font-black text-[10px] px-3">{filteredConsultants.length} QUALIFIED</Badge>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {filteredConsultants.map(consultant => (
                                                <div
                                                    key={consultant.id}
                                                    onClick={() => setSelectedConsultant(consultant.id)}
                                                    className={cn(
                                                        "p-6 rounded-[32px] border-2 flex flex-col items-center gap-4 cursor-pointer transition-all duration-300",
                                                        selectedConsultant === consultant.id
                                                            ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10'
                                                            : 'border-slate-50 hover:border-primary/20 hover:bg-slate-50'
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-16 h-16 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-transform",
                                                        selectedConsultant === consultant.id ? 'bg-primary text-white scale-110' : 'bg-slate-100 text-slate-400'
                                                    )}>
                                                        <User className="w-8 h-8" />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-black text-slate-900 leading-tight">Dr. {consultant.last_name}</p>
                                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{consultant.profession || "Consultant"}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {selectedServiceId && filteredConsultants.length === 0 && (
                                                <div className="col-span-full p-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] text-center">
                                                    <Bookmark className="w-10 h-10 text-slate-300 mx-auto mb-4" />
                                                    <p className="text-slate-400 font-bold italic text-sm">No specialists assigned to this service category.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-10 bg-slate-50 flex justify-end">
                                    <Button
                                        onClick={() => setStep(2)}
                                        disabled={!selectedServiceId || !selectedConsultant}
                                        className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black text-lg gap-3"
                                    >
                                        Browse Times <ArrowRight className="w-5 h-5" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Step 2: Date & Time */}
                {step === 2 && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <Card className="rounded-[40px] border-none shadow-2xl shadow-slate-200/50 overflow-hidden bg-white">
                            <CardHeader className="p-10 pb-4 flex flex-row items-center justify-between space-y-0">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                            <CalendarIcon className="w-5 h-5" />
                                        </div>
                                        <CardTitle className="text-3xl font-black italic tracking-tighter">Availability</CardTitle>
                                    </div>
                                    <CardDescription className="text-sm font-medium text-slate-400">Pick a slot from Dr. {selectedConsultantObj?.last_name}'s calendar.</CardDescription>
                                </div>
                                <Button variant="ghost" onClick={() => setStep(1)} className="font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900">
                                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                                </Button>
                            </CardHeader>
                            <CardContent className="p-10 pt-4 flex flex-col lg:flex-row gap-12">
                                <div className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 shadow-inner">
                                    <Calendar
                                        mode="single"
                                        selected={selectedDate}
                                        onSelect={setSelectedDate}
                                        className="rounded-3xl pointer-events-auto"
                                        disabled={(date) => date < new Date() || date > addDays(new Date(), 60)}
                                    />
                                </div>

                                <div className="flex-1 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-black uppercase tracking-widest flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-primary" />
                                            {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Choose a date"}
                                        </h3>
                                        {availableSlots.length > 0 && <Badge variant="secondary" className="font-black text-[10px] px-3">{availableSlots.length} SLOTS</Badge>}
                                    </div>

                                    {/* Preference Type Selector */}
                                    <div className="p-6 bg-primary/5 rounded-[32px] border border-primary/10 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                                                    <Repeat className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Routing Preference</p>
                                                    <p className="text-lg font-black italic text-slate-900">
                                                        {preferenceType === "Flexible" ? "Flexible Specialist" : "Strict Specialist"}
                                                    </p>
                                                </div>
                                            </div>
                                            <Switch 
                                                checked={preferenceType === "Flexible"} 
                                                onCheckedChange={(checked) => setPreferenceType(checked ? "Flexible" : "Strict")} 
                                                className="scale-125"
                                            />
                                        </div>
                                        <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                                            {preferenceType === "Flexible" 
                                                ? "If your chosen specialist is busy, we can route you to another highly qualified expert to ensure you get care sooner." 
                                                : "You will only be booked with your selected specialist. This may limit available time slots."
                                            }
                                        </p>
                                    </div>

                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center h-48 space-y-4">
                                            <Loader2 className="animate-spin w-10 h-10 text-primary" />
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">Syncing Calendar...</p>
                                        </div>
                                    ) : availableSlots.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {availableSlots.map((slot, idx) => {
                                                const isSelected = selectedSlot?.slot_start === slot.slot_start;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSelectedSlot(slot)}
                                                        className={cn(
                                                            "py-4 px-4 rounded-2xl border-2 font-black italic transition-all duration-300",
                                                            isSelected
                                                                ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105'
                                                                : 'bg-white text-slate-600 border-slate-50 hover:border-primary/30 hover:bg-slate-50'
                                                        )}
                                                    >
                                                        {slot.slot_start?.substring(0, 5) ?? ""}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                                            <AlertCircle className="w-10 h-10 text-amber-500 mb-4" />
                                            <p className="text-slate-900 font-black italic mb-2">No Available Slots</p>
                                            <p className="text-slate-400 font-medium italic text-sm text-center mb-6">Dr. {selectedConsultantObj?.last_name} is fully booked on this day.</p>
                                            <Button 
                                                variant="outline" 
                                                onClick={handleJoinWaitlist}
                                                className="rounded-2xl border-2 border-primary text-primary font-black uppercase text-[10px] tracking-widest px-8 hover:bg-primary hover:text-white transition-all"
                                            >
                                                Join the Active Waitlist
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="p-10 bg-slate-900 flex flex-col sm:flex-row justify-between items-center gap-6">
                                <div className="text-slate-300">
                                    {selectedSlot && (
                                        <p className="flex items-center gap-2">
                                            Booking: <span className="font-black italic text-white text-lg">{selectedDate ? format(selectedDate, "MMM d") : ""} at {selectedSlot?.slot_start?.substring(0, 5) ?? ""}</span>
                                        </p>
                                    )}
                                </div>
                                <Button
                                    onClick={handleBook}
                                    disabled={!selectedSlot || booking}
                                    className="h-14 px-12 rounded-2xl bg-primary text-white hover:bg-primary/90 font-black text-lg gap-3 shadow-xl shadow-primary/20 w-full sm:w-auto"
                                >
                                    {booking ? "Processing..." : "Confirm Booking"} <CheckCircle2 className="w-5 h-5" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                    <div className="max-w-xl mx-auto animate-in zoom-in duration-700">
                        <Card className="rounded-[40px] border-none shadow-2xl py-12 px-10 text-center space-y-10 overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 to-transparent -z-10" />
                            <div className="w-24 h-24 mx-auto rounded-[32px] bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/20 rotate-12">
                                <CheckCircle2 className="w-12 h-12 text-white" />
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-4xl font-black italic tracking-tighter">Confirmation!</h2>
                                <p className="text-slate-500 font-medium">
                                    Your <span className="text-primary font-black uppercase text-xs">{selectedServiceType}</span> with <span className="font-black text-slate-800 underline decoration-primary underline-offset-4">Dr. {selectedConsultantObj?.last_name}</span> has been confirmed.
                                </p>
                            </div>

                            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                                <div className="flex items-center justify-center gap-8">
                                    <div className="text-center">
                                       <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Date</p>
                                       <p className="font-black text-slate-900">{selectedDate ? format(selectedDate, "EEE, MMM d") : "N/A"}</p>
                                    </div>
                                    <div className="w-px h-8 bg-slate-100" />
                                    <div className="text-center">
                                       <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Time</p>
                                       <p className="font-black text-slate-900">{selectedSlot?.slot_start?.substring(0, 5) ?? "N/A"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <Button onClick={() => window.location.href = '/client'} className="h-14 px-12 rounded-2xl bg-slate-900 text-white font-black text-lg gap-3 w-full">
                                    Go to Dashboard
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
