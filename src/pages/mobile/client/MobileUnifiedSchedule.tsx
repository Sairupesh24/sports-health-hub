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
import { apiFetch } from "@/utils/api";
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
    const { profile, clientId, user } = useAuth();
    const currentUserId = user?.id || profile?.id;
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
    const [serviceMappings, setServiceMappings] = useState<any[]>([]);
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
        if (currentUserId && profile?.organization_id && clientId) {
            fetchTimelineData();
        }
    }, [currentUserId, profile?.organization_id, clientId, selectedDate]);

    const fetchTimelineData = async () => {
        if (!profile?.organization_id || !clientId || !currentUserId) return;
        setLoading(true);
        try {
            const start = startOfDay(selectedDate).toISOString();
            const end = addDays(startOfDay(selectedDate), 1).toISOString();

            // Fetch Sessions
            const sessionData = await apiFetch(`/api/appointments?client_id=${clientId}&start=${start}&end=${end}`);
            setAppointments(sessionData || []);

            // Fetch Workouts
            const assignments = await apiFetch('/api/ams/program-assignments');

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
        if (!profile?.organization_id || !clientId || !currentUserId) return;
        
        try {
            const start = startOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)).toISOString();
            const end = addDays(startOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)), 1).toISOString();

            // Fetch Sessions for the month
            const sessionData = await apiFetch(`/api/appointments?client_id=${clientId}&start=${start}&end=${end}`);

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
            try {
                const data = await apiFetch("/api/billing/services?is_active=true");
                setServices(data as Service[] || []);
            } catch (e) {
                // ignore
            }
        }
        loadServices();
    }, [profile?.organization_id, view]);

    useEffect(() => {
        async function loadData() {
            if (!profile?.organization_id || view !== 'book') return;
            try {
                const [empData, mappingData] = await Promise.all([
                    apiFetch<any[]>('/hr/employees?role_type=clinical'),
                    apiFetch<any[]>('/admin/consultant-services')
                ]);
                setConsultants(empData || []);
                setServiceMappings(mappingData || []);
            } catch (err: any) {
                console.error("Error loading data", err);
            }
        }
        loadData();
    }, [profile?.organization_id, view]);

    useEffect(() => {
        async function fetchSlots() {
            if (!profile?.organization_id || !selectedConsultant || !bookingDate || step !== 2) return;
            setLoading(true);
            const formattedDate = format(bookingDate, "yyyy-MM-dd");
            try {
                const data = await apiFetch(`/api/appointments/availability?therapist_id=${selectedConsultant}&date=${formattedDate}`);
                setAvailableSlots(data?.slots || []);
            } catch (e) {
                setAvailableSlots([]);
            }
            setLoading(false);
        }
        fetchSlots();
    }, [selectedConsultant, bookingDate, step, profile, view]);

    const filteredConsultants = useMemo(() => {
        const selectedService = services.find(s => s.id === selectedServiceId);
        return filterConsultantsByService(consultants, selectedService, serviceMappings);
    }, [consultants, selectedServiceId, services, serviceMappings]);

    const handleBookSubmit = async () => {
        if (!selectedSlot || !bookingDate) return;
        setIsBooking(true);
        try {
            const scheduledStart = `${format(bookingDate, "yyyy-MM-dd")}T${selectedSlot.slot_start}:00`;
            const scheduledEnd = `${format(bookingDate, "yyyy-MM-dd")}T${selectedSlot.slot_end}:00`;
            
            const selected = services.find(s => s.id === selectedServiceId);

            await apiFetch('/api/appointments', {
                method: 'POST',
                body: JSON.stringify({
                    client_id: clientId,
                    therapist_id: selectedConsultant,
                    service_id: selectedServiceId || null,
                    service_type: selected?.name || "General",
                    scheduled_start: new Date(scheduledStart).toISOString(),
                    scheduled_end: new Date(scheduledEnd).toISOString(),
                    status: 'Planned',
                    session_mode: 'Individual',
                    preference_type: preferenceType,
                    is_flexible_routing: preferenceType === "Flexible"
                })
            });

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
                <div className="space-y-4 pb-20">
                    <header className="flex items-center justify-between pt-1">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Book Session</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Select a service and specialist</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => { setView('timeline'); setStep(1); }} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </header>
                    
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                             <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Select Service</Label>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {services.map(s => (
                                        <button 
                                            key={s.id} 
                                            onClick={() => setSelectedServiceId(s.id)} 
                                            className={cn(
                                                "p-4 rounded-2xl border text-left transition-all shadow-xs", 
                                                selectedServiceId === s.id 
                                                    ? 'border-primary bg-primary/10 text-primary' 
                                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:border-slate-300'
                                            )}
                                        >
                                            <h4 className="font-bold text-sm tracking-tight">{s.name}</h4>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{s.category || "Consultation & Performance"}</p>
                                        </button>
                                    ))}
                                </div>
                             </div>
                             
                             {selectedServiceId && (
                                <div className="space-y-2 pt-2">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Available Specialists</Label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {filteredConsultants.map(c => (
                                            <button 
                                                key={c.id} 
                                                onClick={() => setSelectedConsultant(c.id)} 
                                                className={cn(
                                                    "p-3.5 rounded-2xl border flex items-center gap-3 transition-all shadow-xs", 
                                                    selectedConsultant === c.id 
                                                        ? 'border-primary bg-primary/10 text-primary' 
                                                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:border-slate-300'
                                                )}
                                            >
                                                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                                                    <User className="w-4 h-4" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-sm leading-tight text-slate-900 dark:text-white">Dr. {c.last_name}</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.profession || "Specialist"}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                             )}

                             <Button 
                                onClick={() => setStep(2)} 
                                disabled={!selectedConsultant} 
                                className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 font-semibold text-xs rounded-xl mt-3 shadow-sm"
                             >
                                <span>Select Date & Time</span>
                                <ArrowRight className="ml-2 w-4 h-4" />
                             </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                             <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                <Calendar mode="single" selected={bookingDate} onSelect={setBookingDate} disabled={(date) => date < new Date() || date > addDays(new Date(), 30)} className="mx-auto" />
                             </div>
                             
                             {loading ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                             ) : (
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Available Slots</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {availableSlots.map((slot, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => setSelectedSlot(slot)} 
                                                className={cn(
                                                    "p-2.5 rounded-xl border text-xs font-semibold transition-all", 
                                                    selectedSlot === slot 
                                                        ? 'bg-primary text-white border-primary shadow-xs' 
                                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                                )}
                                            >
                                                {slot.slot_start.substring(0, 5)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                             )}

                             <Button 
                                onClick={handleBookSubmit} 
                                disabled={!selectedSlot || isBooking} 
                                className="w-full h-11 bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 font-semibold text-xs rounded-xl mt-3 shadow-sm"
                             >
                                {isBooking ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <CheckCircle2 className="mr-2 w-4 h-4" />} Confirm Booking
                             </Button>
                        </div>
                    )}
                </div>
            </MobileLayout>
        );
    }

    return (
        <MobileLayout>
            <div className="space-y-4 pb-20">
                <header className="flex items-center justify-between pt-1">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                            <span className="text-slate-900 dark:text-white">Your</span> <span className="text-primary">Schedule</span>
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            Workouts and consultations timeline
                        </p>
                    </div>
                    <Button 
                        onClick={() => setView('book')} 
                        size="sm"
                        className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-slate-950 font-semibold text-xs gap-1.5 shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Book</span>
                    </Button>
                </header>

                {/* Quick Date Select & Month Toggle */}
                <div className="flex items-center gap-2">
                    <div className="flex-1 flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                        {[...Array(14)].map((_, i) => {
                            const date = addDays(new Date(), i);
                            const isSelected = isSameDay(date, selectedDate);
                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelectedDate(date)}
                                    className={cn(
                                        "flex-shrink-0 w-12 flex flex-col items-center py-2 rounded-xl transition-all",
                                        isSelected 
                                            ? "bg-primary text-white shadow-xs font-bold" 
                                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                    )}
                                >
                                    <span className="text-[10px] font-semibold uppercase tracking-wider">{format(date, 'EEE')}</span>
                                    <span className="text-sm font-bold mt-0.5">{format(date, 'd')}</span>
                                </button>
                            );
                        })}
                    </div>
                    <button 
                        onClick={() => setShowMonthView(!showMonthView)}
                        className={cn(
                            "w-11 h-11 rounded-2xl border transition-all flex flex-shrink-0 items-center justify-center",
                            showMonthView 
                                ? "bg-primary/10 border-primary text-primary" 
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                        )}
                        title="Toggle Month Calendar"
                    >
                        <CalendarIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Collapsible Month View */}
                {showMonthView && (
                    <div className="animate-in fade-in duration-300 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
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
                                    fontWeight: '700',
                                    borderBottom: '2px solid hsl(var(--primary))'
                                }
                            }}
                        />
                    </div>
                )}

                <div className="space-y-3 pt-1">
                    {loading ? (
                        <div className="flex justify-center p-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                    ) : appointments.length === 0 && assignedWorkouts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                            <History className="w-8 h-8 text-slate-400" />
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No scheduled sessions for this day</p>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setView('book')} 
                                className="rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold mt-1"
                            >
                                Schedule an Appointment
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Sessions */}
                            {appointments.map(apt => (
                                <div key={apt.id} className="flex gap-3 relative group">
                                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 z-10 shrink-0 text-primary">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
                                        <div className="flex justify-between items-start mb-1.5">
                                            <Badge className="bg-primary/10 text-primary border-none text-[9px] font-semibold uppercase px-2 py-0.5">Appointment</Badge>
                                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{format(new Date(apt.scheduled_start), "hh:mm a")}</span>
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{apt.service_type || "Consultation"}</h3>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                                                <User className="w-3 h-3" />
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Dr. {apt.therapist?.last_name || "Specialist"}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Workouts */}
                            {assignedWorkouts.map(workout => (
                                <div key={workout.id} className="flex gap-3 relative group cursor-pointer" onClick={() => navigate(`/mobile/client/workout/${workout.id}`)}>
                                    <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center border border-amber-200 dark:border-amber-800/60 z-10 shrink-0 text-amber-600 dark:text-amber-400">
                                        <Dumbbell className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                        <div className="flex justify-between items-start mb-1.5">
                                            <Badge className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[9px] font-semibold uppercase px-2 py-0.5">Training</Badge>
                                            <ChevronRight className="w-4 h-4 text-slate-400" />
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">{workout.title}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{workout.programName}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{workout.items?.length || 0} prescribed movements</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </MobileLayout>
    );
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
    return <label className={cn("block text-sm font-medium", className)}>{children}</label>;
}
