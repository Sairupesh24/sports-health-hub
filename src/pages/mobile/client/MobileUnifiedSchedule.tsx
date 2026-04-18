import React, { useState, useEffect, useMemo } from "react";
import { format, addDays, startOfDay, parseISO, differenceInCalendarDays, isSameDay } from "date-fns";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Loader2, 
  AlertCircle, 
  Dumbbell, 
  Activity,
  ChevronRight,
  TrendingUp,
  History,
  Info
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { filterConsultantsByService, type Service } from "@/utils/serviceMapping";
import { useNavigate } from "react-router-dom";

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

export default function MobileUnifiedSchedule() {
    const { profile, clientId, session } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState<"timeline" | "book">("timeline");
    const [loading, setLoading] = useState(true);
    
    // Timeline State
    const [appointments, setAppointments] = useState<any[]>([]);
    const [assignedWorkouts, setAssignedWorkouts] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Booking Wizard State
    const [step, setStep] = useState(1);
    const [consultants, setConsultants] = useState<Consultant[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string>("");
    const [selectedServiceType, setSelectedServiceType] = useState<string>("");
    const [selectedConsultant, setSelectedConsultant] = useState<string>("");
    const [preferenceType, setPreferenceType] = useState<"Strict" | "Flexible">("Flexible");
    const [bookingDate, setBookingDate] = useState<Date | undefined>(new Date());
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [isBooking, setIsBooking] = useState(false);
    const [showMonthView, setShowMonthView] = useState(false);
    const [monthlyActivities, setMonthlyActivities] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (session?.user?.id && profile?.organization_id && clientId) {
            fetchTimelineData();
        }
    }, [session?.user?.id, profile?.organization_id, clientId, selectedDate]);

    const fetchTimelineData = async () => {
        if (!profile?.organization_id || !clientId || !session?.user?.id) return;
        setLoading(true);
        try {
            const start = startOfDay(selectedDate).toISOString();
            const end = addDays(startOfDay(selectedDate), 1).toISOString();

            // Fetch Sessions
            const { data: sessionData } = await (supabase as any).from("sessions")
                .select(`
                    id, scheduled_start, scheduled_end, service_type, status,
                    therapist:profiles!sessions_therapist_id_fkey(first_name, last_name, profession)
                `)
                .eq("organization_id", profile?.organization_id)
                .eq("client_id", clientId)
                .gte("scheduled_start", start)
                .lt("scheduled_start", end)
                .order('scheduled_start', { ascending: true });

            setAppointments(sessionData || []);

            // Fetch Workouts
            const { data: assignments } = await supabase
                .from('program_assignments' as any)
                .select(`
                    *,
                    program:training_programs(
                        *,
                        days:workout_days(
                            *,
                            items:workout_items(*)
                        )
                    )
                `)
                .eq('athlete_id', session?.user?.id)
                .eq('status', 'active');

            const workoutsToday = assignments?.flatMap(w => {
                 const progStart = parseISO(w.start_date);
                 const diff = differenceInCalendarDays(startOfDay(selectedDate), startOfDay(progStart));
                 const workoutDay = w.program?.days?.find((d: any) => d.display_order === diff);
                 return workoutDay ? [{ ...workoutDay, programName: w.program.title }] : [];
            }) || [];

            setAssignedWorkouts(workoutsToday);

        } catch (error) {
            console.error("Timeline Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthlyActivities = async (monthDate: Date) => {
        if (!profile?.organization_id || !clientId || !session?.user?.id) return;
        
        try {
            const start = startOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)).toISOString();
            const end = addDays(startOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)), 1).toISOString();

            // Fetch Sessions for the month
            const { data: sessionData } = await (supabase as any).from("sessions")
                .select('scheduled_start')
                .eq("organization_id", profile?.organization_id)
                .eq("client_id", clientId)
                .gte("scheduled_start", start)
                .lt("scheduled_start", end);

            const dates = new Set<string>();
            sessionData?.forEach((s: any) => dates.add(format(parseISO(s.scheduled_start), 'yyyy-MM-dd')));

            // Fetch Workouts (simplification: showing if any workout is active)
            // For a robust implementation, we'd calculate each day, but for performance we can just check sessions for now
            // or fetch the assignments and calculate.
            
            setMonthlyActivities(dates);
        } catch (err) {
            console.error("Monthly Activity Error:", err);
        }
    };

    useEffect(() => {
        if (showMonthView) {
            fetchMonthlyActivities(selectedDate);
        }
    }, [showMonthView, selectedDate, profile?.organization_id, clientId]);

    // Booking Flow Handlers (Adapted from MobileBookAppointment)
    useEffect(() => {
        async function loadServices() {
            if (!profile?.organization_id || view !== 'book') return;
            const { data } = await supabase.from("services").select("id, name, category").eq("organization_id", profile.organization_id).eq("is_active", true);
            setServices(data as Service[] || []);
        }
        loadServices();
    }, [profile?.organization_id, view]);

    useEffect(() => {
        async function loadConsultants() {
            if (!profile?.organization_id || view !== 'book') return;
            const { data: profilesData } = await (supabase as any).from("profiles").select("id, first_name, last_name, profession").eq("organization_id", profile.organization_id).eq("is_approved", true).in("profession", ["Sports Physician", "Physiotherapist", "Sports Scientist", "Massage therapist", "Nutritionist"]);
            setConsultants(profilesData || []);
        }
        loadConsultants();
    }, [profile?.organization_id, view]);

    useEffect(() => {
        async function fetchSlots() {
            if (!profile?.organization_id || !selectedConsultant || !bookingDate || step !== 2) return;
            setLoading(true);
            const formattedDate = format(bookingDate, "yyyy-MM-dd");
            const { data } = await supabase.rpc('get_available_slots' as any, {
                p_org_id: profile.organization_id,
                p_consultant_id: selectedConsultant,
                p_date: formattedDate,
                p_service: null
            });
            setAvailableSlots(data || []);
            setLoading(false);
        }
        fetchSlots();
    }, [selectedConsultant, bookingDate, step, profile, view]);

    const filteredConsultants = useMemo(() => {
        const selectedService = services.find(s => s.id === selectedServiceId);
        return filterConsultantsByService(consultants, selectedService);
    }, [consultants, selectedServiceId, services]);

    const handleBookSubmit = async () => {
        if (!selectedSlot || !bookingDate) return;
        setIsBooking(true);
        try {
            const scheduledStart = `${format(bookingDate, "yyyy-MM-dd")}T${selectedSlot.slot_start}:00`;
            const scheduledEnd = `${format(bookingDate, "yyyy-MM-dd")}T${selectedSlot.slot_end}:00`;
            
            const selected = services.find(s => s.id === selectedServiceId);

            const { error: sessionError } = await (supabase as any).from('sessions').insert({
                organization_id: profile?.organization_id,
                client_id: clientId,
                therapist_id: selectedConsultant,
                service_id: selectedServiceId || null,
                service_type: selected?.name || "General",
                scheduled_start: new Date(scheduledStart).toISOString(),
                scheduled_end: new Date(scheduledEnd).toISOString(),
                status: 'Planned',
                created_by: profile?.id,
                session_mode: 'Individual',
                preference_type: preferenceType,
                is_flexible_routing: preferenceType === "Flexible"
            });

            if (sessionError) throw sessionError;
            toast({ title: "Appointment Booked!" });
            setStep(1);
            setView("timeline");
            fetchTimelineData();
        } catch (err: any) {
            toast({ title: "Booking Failed", description: err.message, variant: "destructive" });
        } finally {
            setIsBooking(false);
        }
    };

    if (view === 'book') {
        return (
            <MobileLayout>
                <div className="space-y-6 pb-20">
                    <header className="flex items-center justify-between">
                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">Book Session</h2>
                        <Button variant="ghost" size="icon" onClick={() => { setView('timeline'); setStep(1); }} className="text-slate-500"><ArrowLeft /></Button>
                    </header>
                    
                    {step === 1 && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                             <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">ISHPO Services</Label>
                                <div className="grid grid-cols-1 gap-3">
                                    {services.map(s => (
                                        <button key={s.id} onClick={() => setSelectedServiceId(s.id)} className={cn("p-5 rounded-3xl border-2 text-left transition-all", selectedServiceId === s.id ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/5')}>
                                            <h4 className={cn("font-black tracking-tight", selectedServiceId === s.id ? "text-primary" : "text-white")}>{s.name}</h4>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">{s.category || "ISHPO"}</p>
                                        </button>
                                    ))}
                                </div>
                             </div>
                             
                             {selectedServiceId && (
                                <div className="space-y-4">
                                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Specialists</Label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {filteredConsultants.map(c => (
                                            <button key={c.id} onClick={() => setSelectedConsultant(c.id)} className={cn("p-4 rounded-3xl border-2 flex items-center gap-4 transition-all", selectedConsultant === c.id ? 'border-primary bg-primary/5' : 'border-white/5 bg-white/5')}>
                                                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400"><User className="w-5 h-5" /></div>
                                                <div className="text-left"><p className="font-black text-white leading-tight">Dr. {c.last_name}</p><p className="text-[8px] font-black uppercase text-slate-500">{c.profession}</p></div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                             )}

                             <Button onClick={() => setStep(2)} disabled={!selectedConsultant} className="w-full h-14 bg-white text-slate-900 font-black italic uppercase tracking-tight rounded-2xl mt-4">Select Date & Time <ArrowRight className="ml-2 w-4 h-4" /></Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                             <div className="p-4 bg-white/5 rounded-[32px] border border-white/5">
                                <Calendar mode="single" selected={bookingDate} onSelect={setBookingDate} disabled={(date) => date < new Date() || date > addDays(new Date(), 30)} className="mx-auto" />
                             </div>
                             
                             {loading ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                             ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    {availableSlots.map((slot, i) => (
                                        <button key={i} onClick={() => setSelectedSlot(slot)} className={cn("p-3 rounded-xl border-2 font-black italic text-xs", selectedSlot === slot ? 'bg-primary text-white border-primary' : 'bg-white/5 text-slate-400 border-transparent')}>
                                            {slot.slot_start.substring(0, 5)}
                                        </button>
                                    ))}
                                </div>
                             )}

                             <Button onClick={handleBookSubmit} disabled={!selectedSlot || isBooking} className="w-full h-14 bg-primary text-white font-black italic uppercase tracking-tight rounded-2xl mt-4">
                                {isBooking ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 w-5 h-5" />} Confirm Booking
                             </Button>
                        </div>
                    )}
                </div>
            </MobileLayout>
        );
    }

    return (
        <MobileLayout>
            <div className="space-y-6 pb-20">
                <header className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white leading-tight">Your <span className="text-primary">Schedule</span></h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 italic">Workouts Timeline</p>
                    </div>
                    <Button 
                        onClick={() => setView('book')} 
                        size="icon" 
                        className="w-12 h-12 rounded-2xl bg-white text-slate-900 shadow-xl active:scale-95 transition-transform"
                    >
                        <Plus className="w-6 h-6" />
                    </Button>
                </header>

                {/* Quick Date Select & Month Toggle */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
                        {[...Array(14)].map((_, i) => {
                            const date = addDays(new Date(), i);
                            const isSelected = isSameDay(date, selectedDate);
                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(date)}
                                    className={cn(
                                        "flex-shrink-0 w-14 flex flex-col items-center py-2.5 rounded-xl transition-all",
                                        isSelected ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-500 hover:text-white"
                                    )}
                                >
                                    <span className="text-[8px] font-black uppercase tracking-widest mb-1">{format(date, 'EEE')}</span>
                                    <span className="text-sm font-black italic">{format(date, 'd')}</span>
                                </button>
                            );
                        })}
                    </div>
                    <button 
                        onClick={() => setShowMonthView(!showMonthView)}
                        className={cn(
                            "w-12 h-12 rounded-2xl border-2 transition-all flex flex-shrink-0 items-center justify-center",
                            showMonthView ? "bg-primary/20 border-primary text-primary" : "bg-white/5 border-white/5 text-slate-500"
                        )}
                    >
                        <CalendarIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Collapsible Month View */}
                {showMonthView && (
                    <div className="animate-in fade-in zoom-in-95 duration-300 p-4 bg-white/5 rounded-[32px] border border-white/5">
                        <Calendar 
                            mode="single" 
                            selected={selectedDate} 
                            onSelect={(date) => date && setSelectedDate(date)}
                            className="mx-auto"
                            modifiers={{
                                hasActivity: (date) => monthlyActivities.has(format(date, 'yyyy-MM-dd'))
                            }}
                            modifiersStyles={{
                                hasActivity: {
                                    fontWeight: '900',
                                    borderBottom: '2px solid #14b8a6'
                                }
                            }}
                        />
                    </div>
                )}
                <div className="space-y-6 relative">
                    <div className="absolute left-[27px] top-4 bottom-4 w-px bg-white/10" />
                    
                    {loading ? (
                        <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : appointments.length === 0 && assignedWorkouts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-[40px] border border-dashed border-white/10 text-center space-y-4">
                            <History className="w-10 h-10 text-slate-700" />
                            <p className="text-xs font-bold text-slate-500 uppercase italic">No activities planned for today</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Sessions */}
                            {appointments.map(apt => (
                                <div key={apt.id} className="flex gap-6 relative group">
                                    <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 z-10 shrink-0 shadow-lg shadow-primary/10">
                                        <Activity className="w-6 h-6 text-primary" />
                                    </div>
                                    <div className="flex-1 bg-white/5 p-5 rounded-[28px] border border-white/5 group-hover:bg-white/[0.08] transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge className="bg-primary/20 text-primary border-none text-[8px] font-black uppercase tracking-widest">Appointment</Badge>
                                            <span className="text-[10px] font-black text-slate-500 tabular-nums italic">{format(new Date(apt.scheduled_start), "hh:mm a")}</span>
                                        </div>
                                        <h3 className="text-base font-black italic uppercase text-white tracking-tight">{apt.service_type}</h3>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center"><User className="w-3 h-3 text-slate-400" /></div>
                                            <p className="text-[10px] font-bold text-slate-400 italic">Dr. {apt.therapist?.last_name || "Specialist"}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Workouts */}
                            {assignedWorkouts.map(workout => (
                                <div key={workout.id} className="flex gap-6 relative group">
                                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/20 z-10 shrink-0 shadow-lg shadow-amber-500/10">
                                        <Dumbbell className="w-6 h-6 text-amber-500" />
                                    </div>
                                    <div className="flex-1 bg-white/5 p-5 rounded-[28px] border border-white/5 group-hover:bg-white/[0.08] transition-all cursor-pointer" onClick={() => navigate(`/mobile/client/workout/${workout.id}`)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <Badge className="bg-amber-500/20 text-amber-500 border-none text-[8px] font-black uppercase tracking-widest">Training</Badge>
                                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-500 transition-colors" />
                                        </div>
                                        <h3 className="text-base font-black italic uppercase text-white tracking-tight">{workout.title}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{workout.programName}</p>
                                        <div className="flex items-center gap-4 mt-4">
                                            <div className="flex -space-x-1.5 pt-1">
                                                {workout.items?.slice(0, 3).map((item: any, i: number) => (
                                                    <div key={i} className="w-4 h-4 rounded-full border border-slate-900 bg-slate-800" />
                                                ))}
                                            </div>
                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-tight">{workout.items?.length || 0} Components</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-4 grid grid-cols-1 gap-4">
                    <div className="p-6 bg-emerald-500/10 rounded-[32px] border border-emerald-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500"><TrendingUp className="w-5 h-5" /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Next Consistency Check</p>
                                <p className="text-sm font-black italic text-white">Tomorrow Morning</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MobileLayout>
    );
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
    return <label className={cn("block text-sm font-medium", className)}>{children}</label>;
}
