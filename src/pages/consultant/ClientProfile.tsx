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
import * as XLSX from "xlsx";
import { VIPBadge, VIPName } from "@/components/ui/VIPBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText } from "lucide-react";
import PerformanceSnapshot from "@/components/consultant/PerformanceSnapshot";
import PerformanceAnalytics from "@/components/ams/PerformanceAnalytics";
import { Trophy, FileStack } from "lucide-react";
import { DocumentManager } from "@/components/admin/documents/DocumentManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";



interface ClientProfile {
    id: string;
    uhid: string;
    first_name: string;
    last_name: string;
    mobile_no: string;
    gender: string;
    age: number;
    organization_id: string;
    ams_role?: string;
    is_vip?: boolean;
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
    const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);

    const { roles, profile: currentUserProfile } = useAuth();
    const isAdmin = roles.includes('admin');
    const isClinicalSpecialist = currentUserProfile?.profession === 'Sports Physician' || 
                                 currentUserProfile?.profession === 'Physiotherapist' ||
                                 roles.includes('sports_physician') || 
                                 roles.includes('physiotherapist') ||
                                 roles.includes('consultant');
    const canAccessDocuments = isAdmin || isClinicalSpecialist;

    // Filters
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sessionTypeFilter, setSessionTypeFilter] = useState("all");

    useEffect(() => {
        if (id) {
            fetchData();
        }
    }, [id, startDate, endDate, sessionTypeFilter]);

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
            let sessionQuery = supabase
                .from('sessions')
                .select(`
                    *,
                    physio_session_details (*)
                `)
                .eq('client_id', id);

            if (startDate) {
                sessionQuery = sessionQuery.gte('scheduled_start', `${startDate}T00:00:00`);
            }
            if (endDate) {
                sessionQuery = sessionQuery.lte('scheduled_start', `${endDate}T23:59:59`);
            }
            if (sessionTypeFilter !== "all") {
                sessionQuery = sessionQuery.eq('service_type', sessionTypeFilter);
            }

            const { data: sessionData, error: sessionErr } = await sessionQuery.order('scheduled_start', { ascending: false });
            if (sessionErr) throw sessionErr;
            setSessions(sessionData || []);

        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = () => {
        if (!sessions || sessions.length === 0) {
            toast({ title: "No data to export", variant: "destructive" });
            return;
        }

        const exportData = sessions.map(s => ({
            'Date': s.scheduled_start ? format(new Date(s.scheduled_start), "dd MMM yyyy") : "-",
            'Time': s.scheduled_start ? format(new Date(s.scheduled_start), "hh:mm a") : "-",
            'Type': s.service_type || "-",
            'Status': s.status,
            'Pain Score': s.physio_session_details?.[0]?.pain_score ?? "-",
            'Clinical Notes': s.physio_session_details?.[0]?.clinical_notes || "-"
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Session History");
        XLSX.writeFile(workbook, `Session_History_${client?.last_name || id}.xlsx`);
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
                                <VIPName name={`${client.first_name} ${client.last_name}`} isVIP={client.is_vip} />
                            </h1>
                            <Badge variant="outline" className="font-mono">{client.uhid}</Badge>
                        </div>
                        <div className="flex items-center gap-6 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1"><User className="w-4 h-4" /> {client.gender || "Unknown"} • {client.age || "--"} yrs</span>
                            <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {client.mobile_no || "No phone"}</span>
                        </div>
                    </div>
                    {/* Header Actions */}
                    <div className="ml-auto flex items-center gap-2">
                        {canAccessDocuments && (
                            <Button 
                              variant="outline" 
                              className="border-primary/20 hover:bg-primary/5 gap-2"
                              onClick={() => setIsDocumentModalOpen(true)}
                            >
                                <FileStack className="w-4 h-4 text-primary" /> Documents
                            </Button>
                        )}
                        <Button onClick={() => setAdHocModalOpen(true)}>
                            <ClipboardList className="w-4 h-4 mr-2" /> Add SOAP Note
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Clinical Info */}                    <div className="lg:col-span-2 space-y-6">
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
                                <div className="mt-4 flex flex-wrap gap-3 items-end">
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Start Date</span>
                                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-[140px] text-xs bg-muted/30" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">End Date</span>
                                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-[140px] text-xs bg-muted/30" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Type</span>
                                        <Select value={sessionTypeFilter} onValueChange={setSessionTypeFilter}>
                                            <SelectTrigger className="h-9 w-[160px] text-xs bg-muted/30">
                                                <SelectValue placeholder="All Types" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Types</SelectItem>
                                                <SelectItem value="Physiotherapy">Physiotherapy</SelectItem>
                                                <SelectItem value="Sports Science">Sports Science</SelectItem>
                                                <SelectItem value="Nutrition">Nutrition</SelectItem>
                                                <SelectItem value="Active Recovery Training">Active Recovery</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="ml-auto">
                                        <Button variant="outline" size="sm" className="h-9 gap-2 text-xs" onClick={handleExportExcel}>
                                            <Download className="w-4 h-4" /> Export
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {sessions.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                                        No sessions found matching filters.
                                    </div>
                                ) : (
                                    <div className="rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Date & Time</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Type</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">Status</TableHead>
                                                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">SOAP Note</TableHead>
                                                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sessions.map((session) => (
                                                    <TableRow key={session.id} className="cursor-pointer hover:bg-muted/10 transition-colors" onClick={() => { setSelectedSession(session); setSoapModalOpen(true); }}>
                                                        <TableCell className="font-medium text-sm py-3">
                                                            {format(new Date(session.scheduled_start), "dd MMM yyyy, hh:mm a")}
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            <Badge variant="outline" className="font-normal">{session.service_type || "Performance"}</Badge>
                                                        </TableCell>
                                                         <TableCell>
                                                             <Badge variant={session.status === 'Completed' ? 'default' : 'secondary'} className="text-[10px] uppercase font-bold">
                                                                 {session.status}
                                                             </Badge>
                                                             {session.is_unentitled && (
                                                                 <Badge variant="destructive" className="ml-2 text-[8px] h-4 px-1 font-black animate-pulse">
                                                                     UN-ENTITLED
                                                                 </Badge>
                                                             )}
                                                         </TableCell>

                                                        <TableCell>
                                                            {session.physio_session_details && session.physio_session_details.length > 0 ? (
                                                                <span className="text-emerald-600 flex items-center gap-1 text-xs font-semibold">
                                                                    <FileText className="w-3.5 h-3.5" /> Pain: {session.physio_session_details[0].pain_score}/10
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground text-xs italic">No note log</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="sm" className="h-8 text-xs text-primary font-bold">
                                                                {session.physio_session_details?.length > 0 ? "View Details" : "Add SOAP"}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: AMS Load & Quick Actions */}
                    <div className="space-y-6 lg:col-span-1">
                        {id && <PerformanceSnapshot clientId={id} />}
                        <AMSTrainingLoadWidget clientId={id} />
                    </div>
                </div>

                {/* Athlete Performance Section Phase 6 */}
                {id && (
                    <Card className="border-border shadow-md">
                        <CardHeader className="bg-muted/30">
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-primary" />
                                Athlete Performance & Benchmarking
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                             <PerformanceAnalytics athleteId={id} />
                        </CardContent>
                    </Card>
                )}


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

                        {/* Document Manager Modal for Consultant */}
                        <Dialog open={isDocumentModalOpen} onOpenChange={setIsDocumentModalOpen}>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <FileStack className="w-5 h-5 text-primary" />
                                        </div>
                                        Client Documents - {client.first_name} {client.last_name}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="mt-4">
                                    <DocumentManager clientId={client.id} isVIP={client.is_vip} />
                                </div>
                            </DialogContent>
                        </Dialog>
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}
