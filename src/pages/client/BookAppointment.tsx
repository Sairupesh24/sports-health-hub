import { useState, useEffect } from "react";
import { format, addDays, isSameDay } from "date-fns";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, ArrowRight, ArrowLeft, Star, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type Consultant = {
    id: string;
    first_name: string;
    last_name: string;
};

type TimeSlot = {
    slot_start: string;
    slot_end: string;
};

const SERVICES = [
    "Physiotherapy Initial Consultation",
    "Physiotherapy Follow-up",
    "Sports Massage",
    "Rehabilitation Session",
    "Strength & Conditioning"
];

export default function BookAppointment() {
    const { profile, clientId } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [consultants, setConsultants] = useState<Consultant[]>([]);

    // Booking State
    const [selectedService, setSelectedService] = useState<string>("");
    const [selectedConsultant, setSelectedConsultant] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [booking, setBooking] = useState(false);

    useEffect(() => {
        async function loadConsultants() {
            if (!profile?.organization_id) return;
            try {
                const { data: rolesData, error: rolesError } = await (supabase as any)
                    .from("user_roles")
                    .select("user_id")
                    .eq("role", "consultant");

                if (rolesError) throw rolesError;

                const consultantIds = rolesData?.map((r: any) => r.user_id) || [];

                if (consultantIds.length === 0) {
                    setConsultants([]);
                    return;
                }

                const { data, error } = await (supabase as any)
                    .from("profiles")
                    .select("id, first_name, last_name")
                    .eq("organization_id", profile.organization_id)
                    .in("id", consultantIds);

                if (error) throw error;
                setConsultants(data || []);
            } catch (err: any) {
                toast({ title: "Error loading consultants", description: err.message, variant: "destructive" });
            }
        }
        loadConsultants();
    }, [profile]);

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
            const scheduledStart = `${formattedDate}T${selectedSlot.slot_start}`;
            const scheduledEnd = `${formattedDate}T${selectedSlot.slot_end}`;

            const { data: newSession, error: sessionError } = await (supabase as any)
                .from('sessions')
                .insert({
                    organization_id: profile.organization_id,
                    client_id: clientId,
                    therapist_id: selectedConsultant,
                    service_type: selectedService,
                    scheduled_start: scheduledStart,
                    scheduled_end: scheduledEnd,
                    status: 'Planned',
                    created_by: profile.id
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
                                        {SERVICES.map(service => (
                                            <div
                                                key={service}
                                                onClick={() => setSelectedService(service)}
                                                className={cn(
                                                    "p-8 rounded-[32px] border-2 cursor-pointer transition-all duration-300 group relative overflow-hidden",
                                                    selectedService === service
                                                        ? 'border-primary bg-primary/5 shadow-2xl shadow-primary/10'
                                                        : 'border-slate-50 hover:border-primary/20 hover:bg-slate-50'
                                                )}
                                            >
                                                <div className="relative z-10">
                                                    <h3 className="font-black text-lg text-slate-900 group-hover:text-primary transition-colors">{service}</h3>
                                                    <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-tight">Physiotherapy Elite</p>
                                                </div>
                                                {selectedService === service && (
                                                    <div className="absolute top-4 right-4 text-primary">
                                                        <CheckCircle2 className="w-6 h-6 fill-primary/10" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-6 pt-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-2xl font-black italic tracking-tighter">Select Specialist</h3>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {consultants.map(consultant => (
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
                                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Consultant</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-10 bg-slate-50 flex justify-end">
                                    <Button
                                        onClick={() => setStep(2)}
                                        disabled={!selectedService || !selectedConsultant}
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

                                    {loading ? (
                                        <div className="flex flex-col items-center justify-center h-60 space-y-4">
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
                                                        {slot.slot_start.substring(0, 5)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-12 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                                            <CalendarIcon className="w-10 h-10 text-slate-200 mb-4" />
                                            <p className="text-slate-400 font-bold italic">No slots available for this date.</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="p-10 bg-slate-900 flex flex-col sm:flex-row justify-between items-center gap-6">
                                <div className="text-slate-300">
                                    {selectedSlot && (
                                        <p className="flex items-center gap-2">
                                            Booking: <span className="font-black italic text-white text-lg">{format(selectedDate!, "MMM d")} at {selectedSlot.slot_start.substring(0, 5)}</span>
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
                                    Your <span className="text-primary font-black uppercase text-xs">{selectedService}</span> with <span className="font-black text-slate-800 underline decoration-primary underline-offset-4">Dr. {selectedConsultantObj?.last_name}</span> has been confirmed.
                                </p>
                            </div>

                            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                                <div className="flex items-center justify-center gap-8">
                                    <div className="text-center">
                                       <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Date</p>
                                       <p className="font-black text-slate-900">{format(selectedDate!, "EEE, MMM d")}</p>
                                    </div>
                                    <div className="w-px h-8 bg-slate-100" />
                                    <div className="text-center">
                                       <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Time</p>
                                       <p className="font-black text-slate-900">{selectedSlot?.slot_start.substring(0, 5)}</p>
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
