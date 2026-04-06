import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, Phone, MapPin, Shield, Activity, CalendarDays, FileText, Download, Users, Banknote, Smartphone, Landmark, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { ClientEntitlements } from "./ClientEntitlements";
import { DocumentManager } from "@/components/admin/documents/DocumentManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx';
import { Badge } from "@/components/ui/badge";
import { RefundModal } from "@/components/admin/RefundModal";
import { generateRefundVoucher } from "@/lib/refundActions";
import { Copy, Receipt, Save, RefreshCw } from "lucide-react";
import { VIPBadge, VIPName } from "@/components/ui/VIPBadge";
import { useAuth } from "@/contexts/AuthContext";
import { TherapistAssignmentCard } from "@/components/client/TherapistAssignmentCard";



export default function ClientProfile() {
    const queryClient = useQueryClient();
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "profile";

    const handleTabChange = (value: string) => {
        setSearchParams({ tab: value });
    };
    const [client, setClient] = useState<any>(null);
    const fullName = client ? `${client.honorific ? client.honorific + " " : ""}${client.first_name} ${client.last_name}` : "";
    const [loading, setLoading] = useState(true);
    const [paymentBillId, setPaymentBillId] = useState<string>("");
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("");
    const [transactionId, setTransactionId] = useState("");

    const [amsRole, setAmsRole] = useState<string | null>(null);
    const [profileId, setProfileId] = useState<string | null>(null);
    const { roles, profile: currentUserProfile } = useAuth();
    const isAdmin = roles.includes('admin');
    const isFOE = roles.includes('foe');
    const isSportsPhysician = currentUserProfile?.profession === 'Sports Physician' || roles.includes('sports_physician') || roles.includes('consultant');
    const canAccessDocuments = (isAdmin && !isFOE) || isSportsPhysician;
    
    const [adminRemarks, setAdminRemarks] = useState("");
    const [isUpdatingRemarks, setIsUpdatingRemarks] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sessionTypeFilter, setSessionTypeFilter] = useState("all");

    // Refund State
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundBillId, setRefundBillId] = useState("");

    useEffect(() => {
        async function fetchClient() {
            if (!id) return;
            const { data, error } = await supabase
                .from("clients")
                .select("*")
                .eq("id", id)
                .single();

            if (!error && data) {
                setClient(data);
                
                if (data.uhid) {
                    let { data: profileData } = await supabase
                        .from("profiles")
                        .select("id, ams_role, email")
                        .eq("uhid", data.uhid)
                        .maybeSingle();

                    if (!profileData && data.email) {
                        const { data: profileByEmail } = await supabase
                            .from("profiles")
                            .select("id, ams_role, email")
                            .eq("email", data.email)
                            .maybeSingle();
                        
                        if (profileByEmail) {
                            profileData = profileByEmail;
                        }
                    }

                    if (profileData) {
                        setAmsRole(profileData.ams_role);
                        setProfileId(profileData.id);
                    }
                }

                // Fetch Admin Remarks if admin
                if (isAdmin) {
                    const { data: remarksData } = await (supabase as any)
                        .from("client_admin_notes")
                        .select("remarks")
                        .eq("client_id", id)
                        .maybeSingle();
                    if (remarksData) {
                        setAdminRemarks(remarksData.remarks);
                    }
                }
            }
            setLoading(false);
        }
        fetchClient();
    }, [id]);

    const { data: sessions, isLoading: sessionsLoading } = useQuery({
        queryKey: ['client-sessions', id, startDate, endDate, sessionTypeFilter],
        queryFn: async () => {
            if (!id) return [];
            let query = supabase
                .from('sessions')
                .select(`
                    *,
                    therapist:profiles!sessions_therapist_id_fkey(first_name, last_name),
                    physio_session_details(*)
                `)
                .eq('client_id', id);

            if (startDate) {
                query = query.gte('scheduled_start', `${startDate}T00:00:00`);
            }
            if (endDate) {
                query = query.lte('scheduled_start', `${endDate}T23:59:59`);
            }
            if (sessionTypeFilter !== "all") {
                query = query.eq('service_type', sessionTypeFilter);
            }

            const { data, error } = await query.order('scheduled_start', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!id
    });

    const { data: bills, isLoading: billsLoading } = useQuery({
        queryKey: ['client-bills', id],
        queryFn: async () => {
            if (!id) return [];
            const { data, error } = await supabase
                .from('bills')
                .select(`
                    id,
                    created_at,
                    total,
                    status,
                    notes,
                    transaction_id,
                    payment_method,
                    packages(name, package_services(sessions_included, services(name)))
                `)
                .eq('client_id', id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!id
    });

    const { data: refunds, isLoading: refundsLoading } = useQuery({
        queryKey: ['client-refunds', id],
        queryFn: async () => {
            if (!id) return [];
            const { data, error } = await supabase
                .from('refunds')
                .select('*')
                .eq('client_id', id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!id
    });

    const toggleAmsAccess = async (checked: boolean) => {
        let currentProfileId = profileId;

        // Auto-link profile if not linked but email matches
        if (!currentProfileId && client?.email) {
            const { data: profileByEmail } = await supabase
                .from("profiles")
                .select("id")
                .eq("email", client.email)
                .maybeSingle();
            
            if (profileByEmail) {
                currentProfileId = profileByEmail.id;
                // Auto-link the UHID to bridge the gap
                await supabase.from("profiles").update({ uhid: client.uhid }).eq("id", currentProfileId);
                setProfileId(currentProfileId);
            }
        }

        if (!currentProfileId) {
            toast({
                title: "No Login Credentials",
                description: "This client only has a clinical record. They must sign up for an ISHPO login account (using their email) before AMS access can be granted.",
                variant: "destructive"
            });
            return;
        }

        const newRole = checked ? "athlete" : null;
        // Optimistic UI update
        setAmsRole(newRole);

        const { error } = await supabase
            .from("profiles")
            .update({ ams_role: newRole as any })
            .eq("id", currentProfileId);
        if (!error) {
          setAmsRole(newRole);
          toast({ title: "AMS Access Updated", description: `Client has been ${checked ? 'granted' : 'revoked'} access to the Athlete Monitoring System.` });
        } else {
          toast({ title: "Failed to update AMS access", description: error.message, variant: "destructive" });
        }
    };

    const markAsPaid = async () => {
        if (!paymentMethod) {
            toast({ title: "Select a payment method", variant: "destructive" });
            return;
        }

        if ((paymentMethod === "UPI" || paymentMethod === "Card") && !transactionId.trim()) {
            toast({ title: "Transaction ID is mandatory for UPI/Card payments", variant: "destructive" });
            return;
        }

        try {
            const { error } = await supabase.from('bills')
                .update({ 
                    status: 'Paid', 
                    notes: `Paid via ${paymentMethod}${transactionId ? ` (TXN: ${transactionId})` : ''}`,
                    transaction_id: transactionId
                })
                .eq('id', paymentBillId);

            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['client-bills', id] });

            setIsPaymentModalOpen(false);
            setPaymentMethod("");
            setTransactionId("");
            setPaymentBillId("");
            toast({ title: "Payment Recorded!" });
        } catch (err: any) {
            toast({ title: "Failed to record payment", description: err.message, variant: "destructive" });
        }
    };

    const handleDownloadInvoice = (bill: any) => {
        if (!client) return;
        const d = new jsPDF();

        // Header
        d.setFontSize(22);
        d.setTextColor(15, 23, 42);
        d.text(client.org_name || "Clinic", 14, 25);

        d.setFontSize(14);
        d.setTextColor(100, 116, 139);
        d.text("INVOICE", 170, 25);

        // Invoice Details
        d.setFontSize(10);
        d.setTextColor(71, 85, 105);
        d.text(`Invoice # : ${bill.id}`, 14, 38);
        d.text(`Date : ${format(new Date(bill.created_at), "dd MMM yyyy, hh:mm a")}`, 14, 44);

        // Bill To
        d.setFontSize(11);
        d.setTextColor(15, 23, 42);
        d.text("Bill To:", 14, 58);

        d.setFontSize(10);
        d.setTextColor(71, 85, 105);
        d.text(fullName, 14, 65);
        if (client.uhid) d.text(`UHID : ${client.uhid}`, 14, 71);
        if (client.mobile_no) d.text(`Mobile : ${client.mobile_no}`, 14, 77);
        if (client.email) d.text(`Email : ${client.email}`, 14, 83);

        // Table
        const pkgName = bill.packages ? bill.packages.name : "Custom Package";
        const tableData = [["1", pkgName, `Rs. ${bill.total}`]];

        autoTable(d, {
            startY: 95,
            head: [["#", "Description", "Amount"]],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [15, 118, 110] },
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 40, halign: 'right' }
            }
        });

        // Entitlements breakdown
        const entitlementsBody: any[] = [];
        if (bill.packages && bill.packages.package_services) {
            bill.packages.package_services.forEach((ps: any) => {
                entitlementsBody.push([
                    pkgName,
                    ps.services?.name || 'Session',
                    `${ps.sessions_included} Sessions`
                ]);
            });
        }

        let finalY = (d as any).lastAutoTable.finalY + 15;

        if (entitlementsBody.length > 0) {
            d.setFontSize(11);
            d.setTextColor(15, 23, 42);
            d.text("Entitlements Included:", 14, finalY);

            autoTable(d, {
                startY: finalY + 5,
                head: [["Package", "Service", "Sessions Included"]],
                body: entitlementsBody,
                theme: 'plain',
                headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105] },
                styles: { fontSize: 9, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.1 },
            });
            finalY = (d as any).lastAutoTable.finalY + 15;
        }

        // Calculations
        d.setFontSize(10);
        d.setTextColor(71, 85, 105);
        d.text("Subtotal:", 140, finalY);
        d.setTextColor(15, 23, 42);
        d.text(`Rs. ${bill.total}`, 185, finalY, { align: "right" });

        d.setFontSize(10);
        d.setFont("helvetica", "normal");
        if (bill.status === "Paid") {
            d.setTextColor(16, 185, 129); // emerald-500
            const payMethodStatus = `STATUS: PAID VIA ${bill.payment_method?.toUpperCase() || (bill.notes?.split('via ')[1]?.split(' (')[0]?.toUpperCase()) || 'N/A'}${bill.transaction_id ? ` (TXN: ${bill.transaction_id})` : ''}`;
            d.text(payMethodStatus, 14, finalY + 20);
        } else {
            d.setTextColor(245, 158, 11); // amber-500
            d.text("STATUS: PENDING", 14, finalY + 20);
        }

        d.save(`Invoice_${bill.id.substring(0, 8)}.pdf`);
    };

    const handleRefundSuccess = (refund: any) => {
        queryClient.invalidateQueries({ queryKey: ['client-bills', id] });
        queryClient.invalidateQueries({ queryKey: ['client-refunds', id] });
        queryClient.invalidateQueries({ queryKey: ['client-entitlements', id] });
        
        // Auto-download refund voucher
        generateRefundVoucher(client.org_name || "Clinic", fullName, refund);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard" });
    };

    const handleUpdateAdminRemarks = async () => {
        if (!id) return;
        setIsUpdatingRemarks(true);
        try {
            const { error } = await (supabase as any)
                .from("client_admin_notes")
                .upsert({ 
                    client_id: id, 
                    remarks: adminRemarks 
                });

            if (error) throw error;
            toast({ title: "Remarks updated successfully" });
        } catch (err: any) {
            toast({ title: "Failed to update remarks", description: err.message, variant: "destructive" });
        } finally {
            setIsUpdatingRemarks(false);
        }
    };

    const handleToggleVIP = async (val: boolean) => {
        if (!id) return;
        try {
            const { error } = await supabase
                .from("clients")
                .update({ is_vip: val } as any)
                .eq("id", id);

            if (error) throw error;
            setClient({ ...client, is_vip: val });
            toast({ title: val ? "Client marked as VIP" : "VIP status removed" });
        } catch (err: any) {
            toast({ title: "Failed to update VIP status", description: err.message, variant: "destructive" });
        }
    };

    if (loading) {
        return <DashboardLayout role="admin"><div className="flex justify-center py-20">Loading profile...</div></DashboardLayout>;
    }

    if (!client) {
        return <DashboardLayout role="admin">
            <div className="flex flex-col items-center justify-center py-20">
                <h2 className="text-xl font-bold mb-4">Client not found</h2>
                <Button onClick={() => navigate("/admin/clients")}>Go Back to Clients List</Button>
            </div>
        </DashboardLayout>;
    }

    const {
        first_name, last_name, uhid, honorific, gender, age, dob, blood_group,
        mobile_no, email, occupation, sport, org_name,
        address, locality, city, state, pincode, country,
        has_insurance, insurance_provider, insurance_policy_no, insurance_coverage_amount,
        registered_on
    } = client;

    const handleExportExcel = () => {
        if (!sessions || sessions.length === 0) {
            toast({ title: "No data to export", variant: "destructive" });
            return;
        }

        const exportData = sessions.map(s => ({
            'Date & Time': s.scheduled_start ? format(new Date(s.scheduled_start), "dd MMM yyyy, hh:mm a") : "-",
            'Type': s.service_type || "-",
            'Provider': s.therapist
                ? (s.service_type === 'Physiotherapy' ? `Dr. ${s.therapist.first_name} ${s.therapist.last_name}` : `${s.therapist.first_name} ${s.therapist.last_name}`)
                : (s.therapist_id || "-"),
            'Status': s.status,
            'Pain Score': s.physio_session_details?.[0]?.pain_score ?? "-",
            'Clinical Notes': s.physio_session_details?.[0]?.clinical_notes || "-"
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sessions");
        XLSX.writeFile(workbook, `Sessions_${uhid || id}.xlsx`);
    };

    return (
        <DashboardLayout role="admin">
            <div className="max-w-5xl mx-auto space-y-6 pb-12">
                {/* Header */}
                <div className="flex items-center gap-4 border-b pb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/admin/clients")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-display font-bold text-foreground">
                                    {fullName}
                                </h1>
                                <VIPBadge isVIP={client.is_vip} size="lg" />
                            </div>
                            <p className="text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-semibold">UHID: {uhid}</span>
                                <span>•</span>
                                <span>Registered on: {format(new Date(registered_on), "dd MMM yyyy")}</span>
                                {client.is_vip && <span className="text-yellow-600 font-bold ml-2">★ PREMIUM TIER</span>}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border">
                           <Label htmlFor="ams-toggle" className="text-sm font-semibold cursor-pointer">
                               {amsRole === "athlete" ? "AMS Access: Active" : "AMS Access: Inactive"}
                           </Label>
                           <Switch 
                             id="ams-toggle" 
                             className="data-[state=checked]:bg-green-500"
                             checked={amsRole === "athlete"}
                             onCheckedChange={toggleAmsAccess}
                             disabled={isFOE}
                           />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className={`mb-6 grid w-full ${canAccessDocuments ? 'max-w-3xl grid-cols-5' : 'max-w-2xl grid-cols-4'}`}>
                        <TabsTrigger value="profile">Profile Details</TabsTrigger>
                        <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
                        <TabsTrigger value="sessions">Session History</TabsTrigger>
                        <TabsTrigger value="billing">Billing History</TabsTrigger>
                        {canAccessDocuments && <TabsTrigger value="documents">Documents</TabsTrigger>}
                    </TabsList>


                    {/* PROFILE TAB */}
                    <TabsContent value="profile" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Info */}
                            <Card className="gradient-card border-border">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <User className="w-5 h-5 text-primary" />
                                        Personal Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                                        <div><span className="text-muted-foreground block mb-1">Gender</span><span className="font-medium">{gender || "-"}</span></div>
                                        <div><span className="text-muted-foreground block mb-1">Age / DOB</span><span className="font-medium">{age || "-"} yrs {dob ? `(${format(new Date(dob), "dd/MM/yyyy")})` : ""}</span></div>
                                        <div><span className="text-muted-foreground block mb-1">Blood Group</span><span className="font-medium">{blood_group || "-"}</span></div>
                                        <div><span className="text-muted-foreground block mb-1">Occupation</span><span className="font-medium">{occupation || "-"}</span></div>
                                        <div><span className="text-muted-foreground block mb-1">Sport</span><span className="font-medium">{sport || "-"}</span></div>
                                        <div><span className="text-muted-foreground block mb-1">Organization</span><span className="font-medium">{org_name || "-"}</span></div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Contact Info */}
                            <Card className="gradient-card border-border">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Phone className="w-5 h-5 text-primary" />
                                        Contact & Address
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 gap-y-4 text-sm">
                                        <div><span className="text-muted-foreground block mb-1">Mobile</span><span className="font-medium">{mobile_no}</span></div>
                                        {email && <div><span className="text-muted-foreground block mb-1">Email</span><span className="font-medium">{email}</span></div>}
                                        <div>
                                            <span className="text-muted-foreground block mb-1">Address</span>
                                            <span className="font-medium">
                                                {[address, locality, city, state, pincode, country].filter(Boolean).join(", ") || "-"}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Therapist Assignment */}
                            {!isFOE && (
                                <div className="md:col-span-2">
                                    <TherapistAssignmentCard clientId={id!} orgId={client.organization_id} />
                                </div>
                            )}

                            {/* Insurance */}
                            <Card className="gradient-card border-border md:col-span-2">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-primary" />
                                        Insurance Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {!has_insurance ? (
                                        <p className="text-sm text-muted-foreground">No insurance details provided.</p>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
                                            <div><span className="text-muted-foreground block mb-1">Provider</span><span className="font-medium">{insurance_provider || "-"}</span></div>
                                            <div><span className="text-muted-foreground block mb-1">Policy No</span><span className="font-medium">{insurance_policy_no || "-"}</span></div>
                                            <div><span className="text-muted-foreground block mb-1">Coverage Amount</span><span className="font-medium">{insurance_coverage_amount ? `Rs. ${insurance_coverage_amount}` : "-"}</span></div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Admin Remarks Section - ONLY FOR ADMINS (NOT FOE) */}
                            {isAdmin && !isFOE && (
                                <Card className="gradient-card border-border md:col-span-2 border-l-4 border-l-yellow-500">
                                    <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Shield className="w-5 h-5 text-yellow-600" />
                                                Administrative Remarks & VIP Management
                                            </CardTitle>
                                            <CardDescription>Private notes visible only to system administrators.</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-4 bg-yellow-500/5 px-4 py-2 rounded-full border border-yellow-500/20">
                                            <Label htmlFor="vip-toggle" className="text-sm font-bold text-yellow-800 cursor-pointer">
                                                VIP Status
                                            </Label>
                                            <Switch 
                                                id="vip-toggle"
                                                checked={client.is_vip}
                                                onCheckedChange={handleToggleVIP}
                                                className="data-[state=checked]:bg-yellow-500"
                                            />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <Textarea
                                            value={adminRemarks}
                                            onChange={(e) => setAdminRemarks(e.target.value)}
                                            placeholder="Write strategic internal notes here..."
                                            className="min-h-[120px] bg-muted/20 font-medium"
                                        />
                                        <div className="flex justify-end">
                                            <Button 
                                                onClick={handleUpdateAdminRemarks} 
                                                disabled={isUpdatingRemarks}
                                                className="gap-2 bg-yellow-600 hover:bg-yellow-700 text-white"
                                            >
                                                {isUpdatingRemarks ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                Save Internal Notes
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                    {/* ENTITLEMENTS TAB */}
                    <TabsContent value="entitlements">
                        <ClientEntitlements clientId={id!} />
                    </TabsContent>

                    {/* SESSION HISTORY TAB */}
                    <TabsContent value="sessions">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="gradient-card border-border lg:col-span-2">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <CalendarDays className="w-5 h-5 text-primary" />
                                            Session History
                                        </CardTitle>
                                        <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold" onClick={handleExportExcel}>
                                            <Download className="w-4 h-4" /> Export to Excel
                                        </Button>
                                    </div>
                                    <CardDescription>
                                        All past and upcoming appointments for this client.
                                    </CardDescription>
                                    <div className="mt-4 flex flex-wrap gap-3 items-end">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Start Date</span>
                                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 w-[150px] text-xs bg-muted/50" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">End Date</span>
                                            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 w-[150px] text-xs bg-muted/50" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold">Session Type</span>
                                            <Select value={sessionTypeFilter} onValueChange={setSessionTypeFilter}>
                                                <SelectTrigger className="h-9 w-[160px] text-xs bg-muted/50">
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
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {sessionsLoading ? (
                                        <p className="text-sm text-muted-foreground p-4">Loading sessions...</p>
                                    ) : !sessions || sessions.length === 0 ? (
                                        <p className="text-sm text-muted-foreground p-4 text-center py-10">No sessions found for this client.</p>
                                    ) : (
                                        <div className="rounded-md border overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b bg-muted/50 text-left">
                                                        <th className="p-3 font-medium text-muted-foreground">Date & Time</th>
                                                        <th className="p-3 font-medium text-muted-foreground">Type</th>
                                                        <th className="p-3 font-medium text-muted-foreground">Provider</th>
                                                        <th className="p-3 font-medium text-muted-foreground">Status</th>
                                                        <th className="p-3 font-medium text-muted-foreground">Notes/SOAP</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sessions.map((session: any) => (
                                                        <tr key={session.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors text-xs">
                                                            <td className="p-3 font-medium text-foreground">
                                                                {session.scheduled_start ? format(new Date(session.scheduled_start), "dd MMM, hh:mm a") : "-"}
                                                            </td>
                                                            <td className="p-3">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${session.service_type === 'Physiotherapy' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                                                                    }`}>
                                                                    {session.service_type || 'Performance'}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-muted-foreground flex items-center gap-1.5 min-w-[150px]">
                                                                <User className="w-3.5 h-3.5 text-muted-foreground/50" />
                                                                {session.therapist
                                                                    ? (session.service_type === 'Physiotherapy' ? `Dr. ${session.therapist.first_name} ${session.therapist.last_name}` : `${session.therapist.first_name} ${session.therapist.last_name}`)
                                                                    : (session.therapist_id || "-")}
                                                            </td>
                                                            <td className="p-3">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase
                                                                    ${session.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' :
                                                                        session.status === 'Planned' ? 'bg-blue-500/10 text-blue-600' :
                                                                            session.status === 'Checked In' ? 'bg-purple-500/10 text-purple-600' :
                                                                                'bg-gray-500/10 text-gray-500'}`}>
                                                                    {session.status}
                                                                </span>
                                                                {session.is_unentitled && (
                                                                    <Badge variant="destructive" className="ml-2 text-[8px] h-4 px-1 font-black animate-pulse">
                                                                        UN-ENTITLED
                                                                    </Badge>
                                                                )}
                                                            </td>


                                                            <td className="p-3 text-muted-foreground">
                                                                {session.physio_session_details && session.physio_session_details.length > 0 ? (
                                                                    <span className="text-emerald-600 flex items-center gap-1 font-bold">
                                                                        <FileText className="w-3 h-3" /> SOAP
                                                                    </span>
                                                                ) : session.session_mode === 'Group' ? (
                                                                    <span className="italic text-[10px]">Group: {session.group_name}</span>
                                                                ) : "-"}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="space-y-6">
                            </div>
                        </div>
                    </TabsContent>



                    {/* BILLING HISTORY TAB */}
                    <TabsContent value="billing">
                        <Card className="gradient-card border-border">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-primary" />
                                    Billing History
                                </CardTitle>
                                <CardDescription>
                                    Recent invoices generated for this client.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50 text-left">
                                                <th className="p-3 font-medium text-muted-foreground">Invoice #</th>
                                                <th className="p-3 font-medium text-muted-foreground">Date</th>
                                                <th className="p-3 font-medium text-muted-foreground">Package</th>
                                                <th className="p-3 font-medium text-muted-foreground text-right">Amount</th>
                                                <th className="p-3 font-medium text-muted-foreground text-center">Status</th>
                                                <th className="p-3 font-medium text-muted-foreground text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {billsLoading ? (
                                                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Loading bills...</td></tr>
                                            ) : !bills || bills.length === 0 ? (
                                                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No billing history found.</td></tr>
                                            ) : bills.map((bill: any) => (
                                                <tr key={bill.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                                    <td className="p-3 font-medium text-foreground">{bill.id.substring(0, 8)}...</td>
                                                    <td className="p-3 text-muted-foreground">{format(new Date(bill.created_at), "dd MMM yyyy")}</td>
                                                    <td className="p-3 text-muted-foreground">{bill.packages ? bill.packages.name : "Custom"}</td>
                                                    <td className="p-3 text-right font-medium">Rs. {bill.total}</td>
                                                    <td className="p-3 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${bill.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                                            {bill.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {bill.status === "Pending" && (
                                                                <Button size="sm" variant="outline" onClick={() => {
                                                                    setPaymentBillId(bill.id);
                                                                    setIsPaymentModalOpen(true);
                                                                }}>
                                                                    Mark Paid
                                                                </Button>
                                                            )}
                                                            {bill.status === "Paid" && (
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="ghost" 
                                                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                                    onClick={() => {
                                                                        setRefundBillId(bill.id);
                                                                        setIsRefundModalOpen(true);
                                                                    }}
                                                                >
                                                                    <Receipt className="w-4 h-4 mr-1.5" /> Refund
                                                                </Button>
                                                            )}
                                                            <Button size="sm" variant="ghost" onClick={() => handleDownloadInvoice(bill)}>
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Refund History */}
                                <div className="mt-8 space-y-4">
                                    <h3 className="text-sm font-bold flex items-center gap-2 text-foreground">
                                        <Receipt className="w-4 h-4 text-amber-500" /> Refund History
                                    </h3>
                                    <div className="rounded-md border overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-muted/50 text-left">
                                                    <th className="p-3 font-medium text-muted-foreground">ID</th>
                                                    <th className="p-3 font-medium text-muted-foreground">Date</th>
                                                    <th className="p-3 font-medium text-muted-foreground">Invoice #</th>
                                                    <th className="p-3 font-medium text-muted-foreground text-right">Amount</th>
                                                    <th className="p-3 font-medium text-muted-foreground">Mode</th>
                                                    <th className="p-3 font-medium text-muted-foreground">Txn ID</th>
                                                    <th className="p-3 font-medium text-muted-foreground text-right">Proof</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {refundsLoading ? (
                                                    <tr><td colSpan={7} className="p-4 text-center text-muted-foreground text-xs">Loading refunds...</td></tr>
                                                ) : !refunds || refunds.length === 0 ? (
                                                    <tr><td colSpan={7} className="p-4 text-center text-muted-foreground text-xs italic">No refunds processed for this client.</td></tr>
                                                ) : refunds.map((ref: any) => (
                                                    <tr key={ref.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors text-xs">
                                                        <td className="p-3 font-medium">{ref.id.substring(0, 8)}</td>
                                                        <td className="p-3 text-muted-foreground">{format(new Date(ref.created_at), "dd MMM yyyy")}</td>
                                                        <td className="p-3 font-mono text-[10px]">{ref.bill_id.substring(0, 8)}...</td>
                                                        <td className="p-3 text-right font-bold text-red-600">Rs. {ref.amount}</td>
                                                        <td className="p-3">
                                                            <span className="flex items-center gap-1.5">
                                                                {ref.refund_mode === 'Cash' && <Banknote className="w-3 h-3" />}
                                                                {ref.refund_mode === 'UPI' && <Smartphone className="w-3 h-3" />}
                                                                {ref.refund_mode === 'Online Bank Transfer' && <Landmark className="w-3 h-3" />}
                                                                {ref.refund_mode === 'Clinic Credit' && <CreditCard className="w-3 h-3" />}
                                                                {ref.refund_mode}
                                                            </span>
                                                        </td>
                                                        <td className="p-3">
                                                            {ref.transaction_id ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded">{ref.transaction_id}</span>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(ref.transaction_id)}>
                                                                        <Copy className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : "-"}
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            {ref.refund_proof_url ? (
                                                                <a href={ref.refund_proof_url} target="_blank" rel="noreferrer" className="text-primary hover:underline font-bold text-[10px]">View Proof</a>
                                                            ) : "-"}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* DOCUMENTS TAB */}
                    {canAccessDocuments && (
                        <TabsContent value="documents">
                            <DocumentManager clientId={id!} isVIP={client.is_vip} />
                        </TabsContent>
                    )}
                </Tabs>
            </div>

            {/* Refund Modal */}
            {client && (
                <RefundModal 
                    isOpen={isRefundModalOpen}
                    onOpenChange={setIsRefundModalOpen}
                    billId={refundBillId}
                    clientId={id!}
                    clientName={fullName}
                    organizationId={client.organization_id}
                    onSuccess={handleRefundSuccess}
                />
            )}

            {/* Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={(open) => {
                setIsPaymentModalOpen(open);
                if (!open) {
                    setPaymentMethod("");
                    setTransactionId("");
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Payment Method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="Card">Card / POS</SelectItem>
                                <SelectItem value="UPI">UPI / Digital</SelectItem>
                                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            </SelectContent>
                        </Select>

                        {(paymentMethod === "UPI" || paymentMethod === "Card") && (
                            <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2">
                                <Label htmlFor="transactionId" className="text-xs font-semibold">Transaction ID <span className="text-destructive">*</span></Label>
                                <Input 
                                    id="transactionId"
                                    placeholder="Enter transaction/reference ID" 
                                    value={transactionId}
                                    onChange={(e) => setTransactionId(e.target.value)}
                                    className="h-9 text-sm"
                                    required
                                />
                            </div>
                        )}

                        <Button 
                            onClick={markAsPaid} 
                            className="w-full"
                            disabled={!paymentMethod || ((paymentMethod === "UPI" || paymentMethod === "Card") && !transactionId.trim())}
                        >
                            Confirm Payment
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
