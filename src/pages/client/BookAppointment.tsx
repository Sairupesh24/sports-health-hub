import { useState, useEffect } from "react";
import { format, addDays, isSameDay } from "date-fns";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar } from "@/components/ui/calendar";

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
    const { profile } = useAuth();
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
                // 1. Fetch all consultant IDs independently to avoid RLS relational view block
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

                // 2. Fetch the profiles for those IDs within our organization
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
                    p_service: null // Passing null allows standard availability irrespective of service logic for now
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
        if (!profile?.organization_id || !selectedSlot || !selectedDate) return;
        setBooking(true);

        try {
            const formattedDate = format(selectedDate, "yyyy-MM-dd");

            // 1. Insert into appointments (Double Booking Constraint will inherently protect this transaction)
            const { data: newAppt, error: apptError } = await (supabase as any)
                .from('appointments')
                .insert({
                    organization_id: profile.organization_id,
                    client_id: profile.id,
                    consultant_id: selectedConsultant,
                    service_type: selectedService,
                    appointment_date: formattedDate,
                    start_time: selectedSlot.slot_start,
                    end_time: selectedSlot.slot_end,
                    status: 'confirmed',
                    created_by: profile.id
                })
                .select()
                .single();

            // If a Postgres exclusion constraint fails, it throws a specific error code (23P04)
            if (apptError) {
                if (apptError.code === '23P04') {
                    throw new Error("This timeslot was just booked by someone else. Please select another time.");
                }
                throw apptError;
            }

            // 2. Insert Audit History
            if (newAppt) {
                await (supabase as any).from('appointment_history').insert({
                    appointment_id: newAppt.id,
                    new_status: 'confirmed',
                    changed_by: profile.id,
                    change_reason: 'Client created via Booking Wizard'
                });
            }

            toast({ title: "Appointment Confirmed!", description: "Check your dashboard for details." });
            setStep(3);
        } catch (err: any) {
            toast({ title: "Booking Failed", description: err.message, variant: "destructive" });
            // If it failed because of double booking, refresh slots
            if (err.message.includes('timeslot')) {
                setStep(2); // Keep them on step 2 to pick a new time
            }
        } finally {
            setBooking(false);
        }
    };

    const selectedConsultantObj = consultants.find(c => c.id === selectedConsultant);

    return (
        <DashboardLayout role="client">
            <div className="max-w-3xl mx-auto space-y-6 pb-10">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">Book Appointment</h1>
                    <p className="text-muted-foreground text-sm mt-1">Schedule your next session with our experts</p>
                </div>

                {/* Wizard Progress */}
                <div className="flex items-center justify-between mb-8 relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full overflow-hidden -z-10">
                        <div
                            className="h-full bg-primary transition-all duration-500"
                            style={{ width: `${((step - 1) / 2) * 100}%` }}
                        />
                    </div>
                    {[
                        { id: 1, label: "Service" },
                        { id: 2, label: "Date & Time" },
                        { id: 3, label: "Confirmation" }
                    ].map((s) => (
                        <div key={s.id} className="flex flex-col items-center gap-2 bg-background px-4">
                            <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center font-bold transition-colors ${step >= s.id ? 'bg-primary text-primary-foreground shadow-glow' : 'bg-muted text-muted-foreground'
                                }`}>
                                {step > s.id || s.id === 3 && step === 3 ? <CheckCircle2 className="w-5 h-5" /> : s.id}
                            </div>
                            <span className={`text-xs font-semibold ${step >= s.id ? 'text-primary' : 'text-muted-foreground'}`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Step 1: Service & Consultant */}
                {step === 1 && (
                    <Card className="border-border shadow-md animate-in slide-in-from-right-4 duration-300">
                        <CardHeader>
                            <CardTitle>Select Service</CardTitle>
                            <CardDescription>Choose the type of session and your preferred consultant.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-4">
                            <div className="space-y-4">
                                <label className="text-sm font-medium">1. Service Type</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {SERVICES.map(service => (
                                        <div
                                            key={service}
                                            onClick={() => setSelectedService(service)}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedService === service
                                                ? 'border-primary bg-primary/5 shadow-glow'
                                                : 'border-border hover:border-border/80 hover:bg-muted'
                                                }`}
                                        >
                                            <h3 className="font-semibold text-sm">{service}</h3>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4">
                                <label className="text-sm font-medium">2. Choose Consultant</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {consultants.map(consultant => (
                                        <div
                                            key={consultant.id}
                                            onClick={() => setSelectedConsultant(consultant.id)}
                                            className={`p-4 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${selectedConsultant === consultant.id
                                                ? 'border-primary bg-primary/5 shadow-glow'
                                                : 'border-border hover:border-border/80 hover:bg-muted'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedConsultant === consultant.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                                }`}>
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div className="font-medium text-sm">
                                                Dr. {consultant.last_name}
                                            </div>
                                        </div>
                                    ))}
                                    {consultants.length === 0 && (
                                        <div className="col-span-full text-center p-6 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                                            No consultants found in your organization.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end pt-6 pb-6">
                            <Button
                                onClick={() => setStep(2)}
                                disabled={!selectedService || !selectedConsultant}
                                className="gap-2 px-8"
                            >
                                Next Step <ArrowRight className="w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 2: Date & Time */}
                {step === 2 && (
                    <Card className="border-border shadow-md animate-in slide-in-from-right-4 duration-300">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>Date & Time</CardTitle>
                                <CardDescription>Select an available timeslot based on {selectedConsultantObj?.last_name}'s live schedule.</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-2">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </Button>
                        </CardHeader>
                        <CardContent className="flex flex-col md:flex-row gap-8 pt-4">
                            <div className="bg-muted/30 p-2 rounded-xl border border-border">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={setSelectedDate}
                                    className="rounded-md"
                                    disabled={(date) => date < new Date() || date > addDays(new Date(), 60)}
                                />
                            </div>

                            <div className="flex-1 space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" />
                                    Available Slots
                                    {selectedDate && <span className="text-muted-foreground text-sm font-normal">for {format(selectedDate, "MMM d")}</span>}
                                </h3>

                                {loading ? (
                                    <div className="flex items-center justify-center h-40">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                ) : availableSlots.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto pr-2 pb-2">
                                        {availableSlots.map((slot, idx) => {
                                            const isSelected = selectedSlot?.slot_start === slot.slot_start;
                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => setSelectedSlot(slot)}
                                                    className={`py-2 px-4 rounded-lg border text-sm font-medium transition-all ${isSelected
                                                        ? 'bg-primary text-primary-foreground border-primary shadow-glow'
                                                        : 'bg-background hover:border-primary/50 hover:bg-muted'
                                                        }`}
                                                >
                                                    {slot.slot_start.substring(0, 5)} - {slot.slot_end.substring(0, 5)}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center p-8 border border-dashed rounded-lg bg-muted/20">
                                        <CalendarIcon className="w-8 h-8 mx-auto text-muted-foreground mb-3 opacity-50" />
                                        <p className="text-muted-foreground text-sm">No available slots on this date.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between pt-6 pb-6 border-t border-border mt-2 bg-muted/10">
                            <div className="text-sm">
                                {selectedSlot && (
                                    <p>
                                        Selected: <span className="font-bold text-primary">{format(selectedDate!, "MMM d, yyyy")}</span> at <span className="font-bold text-primary">{selectedSlot.slot_start.substring(0, 5)}</span>
                                    </p>
                                )}
                            </div>
                            <Button
                                onClick={handleBook}
                                disabled={!selectedSlot || booking}
                                className="gap-2 px-8"
                            >
                                {booking ? "Confirming..." : "Confirm Booking"} <CheckCircle2 className="w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 3: Success */}
                {step === 3 && (
                    <Card className="border-border shadow-md text-center py-12 animate-in slide-in-from-bottom-4 duration-500">
                        <CardContent className="space-y-6">
                            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-display font-bold">Booking Confirmed!</h2>
                                <p className="text-muted-foreground">
                                    Your <span className="font-medium text-foreground">{selectedService}</span> with <span className="font-medium text-foreground">Dr. {selectedConsultantObj?.last_name}</span> has been securely locked into the calendar.
                                </p>
                                {selectedDate && selectedSlot && (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 mt-2 bg-muted rounded-full text-sm font-semibold">
                                        <CalendarIcon className="w-4 h-4 text-primary" /> {format(selectedDate, "EEEE, MMMM do")}
                                        <Clock className="w-4 h-4 text-primary ml-2" /> {selectedSlot.slot_start.substring(0, 5)}
                                    </div>
                                )}
                            </div>
                            <div className="pt-6">
                                <Button onClick={() => window.location.href = '/client'} variant="outline" className="px-8">
                                    Return to Dashboard
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

            </div>
        </DashboardLayout>
    );
}
