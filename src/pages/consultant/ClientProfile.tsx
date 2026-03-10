import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Phone, Calendar, Activity, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AMSTrainingLoadWidget from "@/components/dashboard/AMSTrainingLoadWidget";
import LogInjuryModal from "@/components/consultant/LogInjuryModal";
import SOAPNoteModal from "@/components/consultant/SOAPNoteModal";
import ResolveInjuryModal from "@/components/consultant/ResolveInjuryModal";
import AdHocSessionModal from "@/components/consultant/AdHocSessionModal";
import { format } from "date-fns";

interface ClientProfile {
    id: string;
    uhid: string;
    first_name: string;
    last_name: string;
    mobile_no: string;
    gender: string;
    age: number;
    organization_id: string;
}

export default function ConsultantClientProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [client, setClient] = useState<ClientProfile | null>(null);
    const [injuries, setInjuries] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [soapModalOpen, setSoapModalOpen] = useState(false);

    const [selectedInjuryToResolve, setSelectedInjuryToResolve] = useState<any>(null);
    const [resolveModalOpen, setResolveModalOpen] = useState(false);

    const [adHocModalOpen, setAdHocModalOpen] = useState(false);

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch Client Info
            const { data: clientData, error: clientErr } = await supabase
                .from('clients')
                .select('*')
                .eq('id', id)
                .single();
            if (clientErr) throw clientErr;
            setClient(clientData);

            // Fetch Active Injuries
            const { data: injuryData, error: injuryErr } = await supabase
                .from('injuries')
                .select('*')
                .eq('client_id', id)
                .order('injury_date', { ascending: false });
            if (injuryErr) throw injuryErr;
            setInjuries(injuryData || []);

            // Fetch Sessions History
            const { data: sessionData, error: sessionErr } = await supabase
                .from('sessions')
                .select(`
            *,
            physio_session_details (*)
        `)
                .eq('client_id', id)
                .order('scheduled_start', { ascending: false });
            if (sessionErr) throw sessionErr;
            setSessions(sessionData || []);

        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <DashboardLayout role="consultant"><div className="p-8">Loading client profile...</div></DashboardLayout>;
    if (!client) return <DashboardLayout role="consultant"><div className="p-8">Client not found.</div></DashboardLayout>;

    return (
        <DashboardLayout role="consultant">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/consultant/clients")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-display font-bold text-foreground">
                                {client.first_name} {client.last_name}
                            </h1>
                            <Badge variant="outline" className="font-mono">{client.uhid}</Badge>
                        </div>
                        <div className="flex items-center gap-6 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="w-4 h-4" /> {client.gender || "Unknown"} • {client.age || "--"} yrs</span>
                            <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {client.mobile_no || "No phone"}</span>
                        </div>
                    </div>
                    {/* Universal Ad-Hoc Action */}
                    <div className="ml-auto">
                        <Button onClick={() => setAdHocModalOpen(true)}>
                            <ClipboardList className="w-4 h-4 mr-2" /> Add SOAP Note
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Clinical Info */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Active Injuries */}
                        <Card className="border-border shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-red-500" /> Clinical Diagnoses
                                </CardTitle>
                                <LogInjuryModal
                                    clientId={client.id}
                                    organizationId={client.organization_id}
                                    onSuccess={fetchData}
                                />
                            </CardHeader>
                            <CardContent>
                                {injuries.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg">
                                        No recorded injuries for this client.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {injuries.map(inj => (
                                            <div key={inj.id} className="p-4 border rounded-lg bg-card flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-semibold text-foreground">{inj.diagnosis}</h4>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {inj.region} • {inj.injury_type}
                                                    </p>
                                                    {inj.clinical_notes && (
                                                        <p className="text-xs text-muted-foreground mt-2 border-l-2 pl-2">
                                                            {inj.clinical_notes}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right flex flex-col items-end gap-2">
                                                    <Badge variant={inj.status === 'Resolved' ? 'secondary' : 'default'}>
                                                        {inj.status}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        Start: {format(new Date(inj.injury_date), "MMM d, yyyy")}
                                                    </span>
                                                    {inj.status === 'Resolved' && inj.resolved_date && (
                                                        <span className="text-xs text-emerald-600 font-medium whitespace-nowrap">
                                                            Resolved: {format(new Date(inj.resolved_date), "MMM d, yyyy")}
                                                        </span>
                                                    )}
                                                    {inj.status !== 'Resolved' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs mt-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedInjuryToResolve(inj);
                                                                setResolveModalOpen(true);
                                                            }}
                                                        >
                                                            Mark Resolved
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Session History & SOAP Notes */}
                        <Card className="border-border shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-primary" /> Session History & SOAP Notes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {sessions.length === 0 ? (
                                    <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-lg">
                                        No sessions recorded yet.
                                    </div>
                                ) : (
                                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                                        {sessions.map((session, i) => (
                                            <div key={session.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                {/* Timeline marker */}
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                                                    <Calendar className="w-4 h-4" />
                                                </div>
                                                {/* Card */}
                                                <div
                                                    className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-card shadow-sm cursor-pointer hover:border-primary transition-colors"
                                                    onClick={() => { setSelectedSession(session); setSoapModalOpen(true); }}
                                                >
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className="font-semibold">{format(new Date(session.scheduled_start), "MMM d, yyyy")}</div>
                                                        <Badge variant={session.status === 'Completed' ? 'default' : 'secondary'}>{session.status}</Badge>
                                                    </div>
                                                    <p className="text-sm text-foreground mb-2">{session.service_type}</p>

                                                    {/* SOAP Summary Blurb */}
                                                    {session.physio_session_details && session.physio_session_details.length > 0 ? (
                                                        <div className="bg-muted/30 p-2 rounded text-xs space-y-1 mt-2 border">
                                                            <p><span className="font-semibold">Pain:</span> {session.physio_session_details[0].pain_score}/10</p>
                                                            <p className="line-clamp-1"><span className="font-semibold">Notes:</span> {session.physio_session_details[0].clinical_notes || '—'}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-end mt-2">
                                                            <Button size="sm" variant="outline" className="h-7 text-xs">Add SOAP Note</Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                    </div>

                    {/* Right Column: AMS Load & Quick Actions */}
                    <div className="space-y-6 lg:col-span-1">
                        <div className="h-[400px]">
                            {/* Notice we pass clientId to strictly isolate the data to this athlete */}
                            <AMSTrainingLoadWidget clientId={id} />
                        </div>
                    </div>
                </div>

                {/* Modals */}
                {client && (
                    <>
                        <SOAPNoteModal
                            open={soapModalOpen}
                            onOpenChange={setSoapModalOpen}
                            session={selectedSession}
                            clientId={client.id}
                            onSuccess={fetchData}
                        />
                        <ResolveInjuryModal
                            open={resolveModalOpen}
                            onOpenChange={setResolveModalOpen}
                            injury={selectedInjuryToResolve}
                            onSuccess={fetchData}
                        />
                        <AdHocSessionModal
                            open={adHocModalOpen}
                            onOpenChange={setAdHocModalOpen}
                            preselectedClientId={client.id}
                            onSuccess={fetchData}
                        />
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
