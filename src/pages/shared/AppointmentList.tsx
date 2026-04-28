import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, Clock, User, ClipboardList, ChevronRight, MapPin } from "lucide-react";
import { AdminSessionStatusModal } from "@/components/admin/AdminSessionStatusModal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { VIPBadge, VIPName } from "@/components/ui/VIPBadge";

export default function AppointmentList({ role, hideLayout = false }: { role: 'admin' | 'consultant' | 'client', hideLayout?: boolean }) {
    const { profile, clientId, roles } = useAuth();
    const isAdminOrFoe = roles?.some(r => ["admin", "super_admin", "clinic_admin", "foe"].includes(r));
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<any>(null);

    const fetchAppointments = async () => {
        if (!profile?.organization_id || !profile?.id) return;
        try {
            let query = (supabase as any).from("sessions").select(`
          id, scheduled_start, scheduled_end, service_type, status, is_unentitled,
          client:clients!sessions_client_id_fkey(first_name, last_name, uhid, is_vip),
        therapist:profiles!sessions_therapist_id_fkey(first_name, last_name)
        `).eq("organization_id", profile.organization_id)
                .order('scheduled_start', { ascending: false });

            if (role === 'client') {
                if (clientId) {
                    query = query.eq('client_id', clientId);
                } else {
                    setAppointments([]);
                    setLoading(false);
                    return;
                }
            } else if (role === 'consultant') {
                query = query.eq('therapist_id', profile.id);
            }

            const { data } = await query;
            if (data) setAppointments(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppointments();
    }, [profile, role]);

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'Planned': 'bg-blue-50 text-blue-600 border-blue-100',
            'Completed': 'bg-emerald-50 text-emerald-600 border-emerald-100',
            'Rescheduled': 'bg-amber-50 text-amber-600 border-amber-100',
            'Missed': 'bg-rose-50 text-rose-600 border-rose-100',
            'Cancelled': 'bg-rose-50 text-rose-600 border-rose-100',
            'Checked In': 'bg-purple-50 text-purple-600 border-purple-100',
        };
        
        return (
            <Badge variant="outline" className={cn("px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-widest border", styles[status] || 'bg-slate-50 text-slate-600')}>
                {status}
            </Badge>
        );
    };

    const content = (
        <div className={`max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ${hideLayout ? 'pb-2' : 'pb-20'}`}>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">Your Sessions</h1>
                    <p className="text-slate-500 font-medium font-body italic">A dedicated view of your recovery journey schedule.</p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                   <Calendar className="w-6 h-6" />
                </div>
            </header>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-1">
                {loading ? (
                    <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div></div>
                ) : appointments.length === 0 ? (
                    <div className="text-center p-12 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold italic">No appointments found in your history.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Mobile & Tablet Card View (Hidden on Desktop table?) No, let's just make a unified premium list */}
                        {appointments.map((apt) => (
                            <div 
                                key={apt.id}
                                onClick={() => (role === 'admin' || role === 'consultant') && setSelectedSession(apt)}
                                className={cn(
                                    "group flex flex-col md:flex-row md:items-center justify-between p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300",
                                    (role === 'admin' || role === 'consultant') && "cursor-pointer"
                                )}
                            >
                                <div className="flex flex-col md:flex-row gap-6 md:items-center flex-1">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-primary/70">{format(new Date(apt.scheduled_start), "MMM")}</span>
                                            <span className="text-xl font-black italic tracking-tighter">{format(new Date(apt.scheduled_start), "d")}</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Clock className="w-3.5 h-3.5 text-primary" />
                                                <span className="text-sm font-black text-slate-900">{format(new Date(apt.scheduled_start), "hh:mm a")}</span>
                                            </div>
                                            <h3 className="font-bold text-slate-800 tracking-tight capitalize">{apt.service_type || 'Physiotherapy Session'}</h3>
                                        </div>
                                    </div>

                                    <div className="hidden md:block w-px h-10 bg-slate-100" />

                                    <div className="flex flex-col gap-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Specialist</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                                                <User className="w-3 h-3 text-slate-500" />
                                            </div>
                                            <span className="text-sm font-bold text-slate-700">{apt.therapist?.first_name} {apt.therapist?.last_name}</span>
                                        </div>
                                    </div>
                                    
                                    {role !== 'client' && (
                                        <>
                                            <div className="hidden md:block w-px h-10 bg-slate-100" />
                                            <div className="flex flex-col gap-1">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client</p>
                                                <VIPName name={`${apt.client?.first_name} ${apt.client?.last_name}`} isVIP={apt.client?.is_vip} className="text-sm font-bold text-slate-700" />
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 mt-6 md:mt-0 pt-6 md:pt-0 border-t md:border-t-0 border-slate-50">
                                    {getStatusBadge(apt.status)}
                                    {apt.is_unentitled && isAdminOrFoe && (
                                        <Badge variant="destructive" className="text-[8px] h-4 px-1 font-black animate-pulse uppercase">
                                            UN-ENTITLED
                                        </Badge>
                                    )}
                                    {(role === 'admin' || role === 'consultant') && (
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-transform group-hover:translate-x-1" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AdminSessionStatusModal
                open={!!selectedSession}
                onOpenChange={(open) => !open && setSelectedSession(null)}
                session={selectedSession}
                onSuccess={fetchAppointments}
            />
        </div>
    );

    if (hideLayout) return content;

    return (
        <DashboardLayout role={role}>
            {content}
        </DashboardLayout>
    );
}
