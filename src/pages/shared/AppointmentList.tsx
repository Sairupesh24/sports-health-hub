import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, Clock, User, ClipboardList } from "lucide-react";
import { AdminSessionStatusModal } from "@/components/admin/AdminSessionStatusModal";

export default function AppointmentList({ role, hideLayout = false }: { role: 'admin' | 'consultant' | 'client', hideLayout?: boolean }) {
    const { profile } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<any>(null);

    const fetchAppointments = async () => {
        if (!profile?.organization_id || !profile?.id) return;
        try {
            let query = (supabase as any).from("sessions").select(`
          id, scheduled_start, scheduled_end, service_type, status,
          client:clients(first_name, last_name),
          therapist:profiles(first_name, last_name)
        `).eq("organization_id", profile.organization_id)
                .order('scheduled_start', { ascending: false });

            if (role === 'client') {
                query = query.eq('client_id', profile.id);
            } else if (role === 'consultant') {
                query = query.eq('consultant_id', profile.id);
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
        switch (status) {
            case 'Planned': return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Planned</span>;
            case 'Completed': return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Completed</span>;
            case 'Rescheduled': return <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">Rescheduled</span>;
            case 'Missed': return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Missed</span>;
            case 'Cancelled': return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">Cancelled</span>;
            default: return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">{status}</span>;
        }
    };

    const content = (
        <div className={`max-w-6xl mx-auto space-y-6 ${hideLayout ? 'pb-2' : 'pb-10'}`}>
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Appointments List</h1>
                <p className="text-muted-foreground mt-1">View and manage all booked sessions</p>
            </div>

            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-primary" />
                        All Appointments
                    </CardTitle>
                    <CardDescription>A chronological history of all past and upcoming appointments.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                    ) : appointments.length === 0 ? (
                        <div className="text-center p-8 bg-muted/20 rounded-lg text-muted-foreground">No appointments found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Date & Time</th>
                                        {role !== 'client' && <th className="px-4 py-3 font-medium">Client</th>}
                                        {role !== 'consultant' && <th className="px-4 py-3 font-medium">Consultant</th>}
                                        <th className="px-4 py-3 font-medium">Session Type</th>
                                        <th className="px-4 py-3 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appointments.map((apt) => (
                                        <tr
                                            key={apt.id}
                                            onClick={() => (role === 'admin' || role === 'consultant') && setSelectedSession(apt)}
                                            className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                                        >
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-medium">{format(new Date(apt.scheduled_start), "MMM d, yyyy")}</span>
                                                    <span className="text-muted-foreground ml-2">{format(new Date(apt.scheduled_start), "HH:mm")}</span>
                                                </div>
                                            </td>
                                            {role !== 'client' && (
                                                <td className="px-4 py-4 font-medium">
                                                    {apt.client?.first_name} {apt.client?.last_name}
                                                </td>
                                            )}
                                            {role !== 'consultant' && (
                                                <td className="px-4 py-4 font-medium">
                                                    Dr. {apt.therapist?.last_name}
                                                </td>
                                            )}
                                            <td className="px-4 py-4 text-muted-foreground capitalize">
                                                {apt.service_type || 'General Session'}
                                            </td>
                                            <td className="px-4 py-4">
                                                {getStatusBadge(apt.status)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

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
