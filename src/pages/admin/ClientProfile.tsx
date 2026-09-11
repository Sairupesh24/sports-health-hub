import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SessionCategoryFilterBar from "@/components/shared/SessionCategoryFilterBar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, Phone, MapPin, Shield, Activity, CalendarDays, FileText, Download, Users, Banknote, Smartphone, Landmark, CreditCard, Plus, X, ClipboardList, Clock } from "lucide-react";
import { apiFetch } from "@/utils/api";
import { formatStaffName } from "@/utils/serviceMapping";
import { format, parse } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { ClientEntitlements } from "./ClientEntitlements";
import { DocumentManager } from "@/components/admin/documents/DocumentManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx';
import { cn, formatClientName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RefundModal } from "@/components/admin/RefundModal";
import { generateRefundVoucher } from "@/lib/refundActions";
import { Copy, Receipt, Save, RefreshCw } from "lucide-react";
import { VIPBadge, VIPName } from "@/components/ui/VIPBadge";
import { useAuth } from "@/contexts/AuthContext";
import { TherapistAssignmentCard } from "@/components/client/TherapistAssignmentCard";
import { ShieldCheck, History } from "lucide-react";
import { EnquiryContextWindow } from "@/components/admin/EnquiryContextWindow";
import { AssessmentReportsList } from "@/components/shared/assessment/AssessmentReportsList";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { UpcomingPlanManager } from "@/components/sports-scientist/UpcomingPlanManager";
import ClientQuestionnairesTab from "@/components/client/ClientQuestionnairesTab";

const SESSION_CATEGORY_CONFIG: Record<string, { label: string; badgeClass: string }> = {
    physiotherapy: {
        label: "Physiotherapy",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
    },
    sports_science: {
        label: "Sports Science",
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
    },
    device_assessment: {
        label: "Device Assessments",
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
    },
    nutrition: {
        label: "Nutrition",
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
    },
    active_recovery: {
        label: "Active Recovery",
        badgeClass: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800"
    },
    other: {
        label: "Other",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
    }
};



const parseDDMMYYYY = (val: string): string | null => {
    if (!/^\d{2}-\d{2}-\d{4}$/.test(val)) return null;
    const parts = val.split("-");
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(year, month, day);
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
};

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
    const fullName = formatClientName(client, { includeHonorific: true });
    const [loading, setLoading] = useState(true);
    const [paymentBillId, setPaymentBillId] = useState<string>("");
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentRows, setPaymentRows] = useState<Array<{ id: string, method: string, amount: number, transactionId: string }>>([
        { id: Math.random().toString(), method: "Cash", amount: 0, transactionId: "" }
    ]);

    const [amsRole, setAmsRole] = useState<string | null>(null);
    const [profileId, setProfileId] = useState<string | null>(null);
    const { roles, profile: currentUserProfile } = useAuth();
    const isAdmin = roles.includes('admin');
    const isFOE = roles.includes('foe');
    const isClinicalSpecialist = currentUserProfile?.profession === 'Sports Physician' || 
                                 currentUserProfile?.profession === 'Physiotherapist' ||
                                 roles.includes('sports_physician') || 
                                 roles.includes('physiotherapist') ||
                                 roles.includes('consultant');
    const isAdminOrFoe = roles?.some(r => ["admin", "super_admin", "clinic_admin", "foe"].includes(r));
    const canAccessDocuments = (isAdmin && !isFOE) || isClinicalSpecialist;
    
    const [adminRemarks, setAdminRemarks] = useState("");
    const [isUpdatingRemarks, setIsUpdatingRemarks] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [startDateInput, setStartDateInput] = useState("");
    const [endDateInput, setEndDateInput] = useState("");
    const [sessionTypeFilter, setSessionTypeFilter] = useState("all");
    const [mobileViewMode, setMobileViewMode] = useState<'table' | 'cards'>('table');

    // Refund State
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundBillId, setRefundBillId] = useState("");

    // Edit Profile State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState({
        honorific: "",
        first_name: "",
        last_name: "",
        dob: "",
        age: "",
        mobile_no: "",
        email: "",
        address: "",
        locality: "",
        city: "",
        state: "",
        pincode: "",
        country: ""
    });

    useEffect(() => {
        async function fetchClient() {
            if (!id) return;
            try {
                const data = await apiFetch<any>(`/clients/${id}`);
                setClient(data);
                
                if (data.linked_profile) {
                    setAmsRole(data.linked_profile.ams_role);
                    setProfileId(data.linked_profile.id);
                }

                if (isAdmin) {
                    setAdminRemarks(data.admin_remarks || "");
                }
            } catch (err: any) {
                console.error("Error fetching client:", err);
                toast({ 
                    title: "Error", 
                    description: err.message || "Failed to load client profile", 
                    variant: "destructive" 
                });
            } finally {
                setLoading(false);
            }
        }
        fetchClient();
    }, [id, isAdmin]);

    useEffect(() => {
        if (client) {
            setEditForm({
                honorific: client.honorific || "",
                first_name: client.first_name || "",
                last_name: client.last_name || "",
                dob: client.dob ? format(new Date(client.dob), "yyyy-MM-dd") : "",
                age: client.age !== null && client.age !== undefined ? String(client.age) : "",
                mobile_no: client.mobile_no || "",
                email: client.email || "",
                address: client.address || "",
                locality: client.locality || "",
                city: client.city || "",
                state: client.state || "",
                pincode: client.pincode || "",
                country: client.country || ""
            });
        }
    }, [client, isEditModalOpen]);

    const handleSaveProfile = async () => {
        if (!id) return;
        try {
            const payload = {
                honorific: editForm.honorific,
                first_name: editForm.first_name,
                last_name: editForm.last_name,
                dob: editForm.dob || null,
                age: editForm.age ? parseInt(editForm.age, 10) : null,
                mobile_no: editForm.mobile_no,
                email: editForm.email || null,
                address: editForm.address,
                locality: editForm.locality,
                city: editForm.city,
                state: editForm.state,
                pincode: editForm.pincode,
                country: editForm.country
            };
            
            await apiFetch(`/clients/${id}`, {
                method: 'PATCH',
                data: payload
            });

            setClient((prev: any) => ({
                ...prev,
                ...payload
            }));

            queryClient.invalidateQueries({ queryKey: ['client-bills', id] });
            
            setIsEditModalOpen(false);
            toast({ title: "Profile updated successfully" });
        } catch (err: any) {
            toast({ title: "Failed to update profile", description: err.message, variant: "destructive" });
        }
    };

    const { data: rawSessions = [], isLoading: sessionsLoading } = useQuery({
        queryKey: ['client-sessions', id, startDate, endDate],
        queryFn: async () => {
            if (!id) return [];
            return apiFetch<any[]>(`/clients/${id}/sessions`, {
                params: { startDate, endDate }
            });
        },
        enabled: !!id
    });

    const categoryCounts = useMemo(() => {
        const counts = {
            all: rawSessions.length,
            completed: 0,
            physiotherapy: 0,
            sports_science: 0,
            device_assessment: 0,
            nutrition: 0,
            active_recovery: 0,
            other: 0,
        };
        rawSessions.forEach((s: any) => {
            if (s.status === 'Completed') counts.completed++;
            const cat = (s.session_category || 'other') as keyof typeof counts;
            if (counts[cat] !== undefined) {
                counts[cat]++;
            } else {
                counts.other++;
            }
        });
        return counts;
    }, [rawSessions]);

    const filteredSessions = useMemo(() => {
        if (!sessionTypeFilter || sessionTypeFilter === 'all') return rawSessions;
        return rawSessions.filter((s: any) => {
            return s.session_category === sessionTypeFilter || 
                   (s.service_type || '').toLowerCase() === sessionTypeFilter.toLowerCase();
        });
    }, [rawSessions, sessionTypeFilter]);

    const { data: bills, isLoading: billsLoading } = useQuery({
        queryKey: ['client-bills', id],
        queryFn: async () => {
            if (!id) return [];
            return apiFetch<any[]>(`/clients/${id}/bills`);
        },
        enabled: !!id
    });

    const { data: refunds, isLoading: refundsLoading } = useQuery({
        queryKey: ['client-refunds', id],
        queryFn: async () => {
            if (!id) return [];
            return apiFetch<any[]>(`/clients/${id}/refunds`);
        },
        enabled: !!id
    });

    const toggleAmsAccess = async (checked: boolean) => {
        if (!id) return;
        try {
            const result = await apiFetch<any>(`/clients/${id}/ams-access`, {
                method: 'POST',
                data: { enabled: checked }
            });
            setAmsRole(result.ams_role);
            toast({ 
                title: "AMS Access Updated", 
                description: `Client has been ${checked ? 'granted' : 'revoked'} access to the Athlete Monitoring System.` 
            });
        } catch (err: any) {
            toast({ 
                title: "Failed to update AMS access", 
                description: err.message || "No login account found for this client.", 
                variant: "destructive" 
            });
        }
    };

    const markAsPaid = async () => {
        const totalPaid = paymentRows.reduce((a, b) => a + (Number(b.amount) || 0), 0);
        const bill = bills?.find(b => b.id === paymentBillId);
        
        if (!bill) return;

        const paidAmount = bill.paid_amount || 0;
        const remainingDue = bill.remaining_due ?? bill.total;

        if (totalPaid <= 0) {
            toast({ title: "Invalid amount", description: "Payment amount must be greater than zero", variant: "destructive" });
            return;
        }

        if (totalPaid > remainingDue + 0.01) {
            toast({ title: "Amount mismatch", description: `Total payments (Rs. ${totalPaid}) exceeds remaining due (Rs. ${remainingDue.toFixed(2)})`, variant: "destructive" });
            return;
        }

        const invalidRow = paymentRows.find(r => (r.method === 'UPI' || r.method === 'Card') && !r.transactionId?.trim());
        if (invalidRow) {
            toast({ title: "Missing Transaction ID", description: `Please provide a transaction ID for the ${invalidRow.method} payment line.`, variant: "destructive" });
            return;
        }

        try {
            await apiFetch('/billing/payments', {
                method: 'POST',
                data: {
                    bill_id: paymentBillId,
                    payments: paymentRows.map(r => ({
                        amount: r.amount,
                        method: r.method,
                        transactionId: r.transactionId
                    }))
                }
            });

            queryClient.invalidateQueries({ queryKey: ['client-bills', id] });

            setIsPaymentModalOpen(false);
            setPaymentRows([{ id: Math.random().toString(), method: "Cash", amount: 0, transactionId: "" }]);
            toast({ title: "Payment Recorded Successfully" });
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
        const tableData = (bill.bill_items as any[])?.map((bi, index) => [
            (index + 1).toString(),
            bi.packages ? bi.packages.name : "Custom Package",
            `Rs. ${bi.total}`
        ]) || [];

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
        if (bill.bill_items) {
            bill.bill_items.forEach((bi: any) => {
                const pkg = bi.packages;
                if (pkg && pkg.package_services) {
                    pkg.package_services.forEach((ps: any) => {
                        entitlementsBody.push([
                            pkg.name,
                            ps.services?.name || 'Session',
                            `${ps.sessions_included} Sessions`
                        ]);
                    });
                }
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

        // Add Payment Status
        d.setFontSize(11);
        d.setFont("helvetica", "bold");
        if (bill.status === "Paid") {
            d.setTextColor(16, 185, 129); // emerald-500
            const payMethodStatus = `STATUS: PAID VIA ${bill.payment_method?.toUpperCase() || (bill.notes?.split('via ')[1]?.split(' (')[0]?.toUpperCase()) || 'N/A'}${bill.transaction_id ? ` (TXN: ${bill.transaction_id})` : ''}`;
            d.text(payMethodStatus, 14, finalY + 20);
        } else {
            d.setTextColor(245, 158, 11); // amber-500
            d.text("STATUS: PENDING PAYMENT", 14, finalY + 20);
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
            await apiFetch(`/clients/${id}`, {
                method: 'PATCH',
                data: { admin_remarks: adminRemarks }
            });
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
            await apiFetch(`/clients/${id}`, {
                method: 'PATCH',
                data: { is_vip: val }
            });
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
        registered_on, referral_source, referral_source_detail
    } = client;

    const handleExportExcel = () => {
        if (!filteredSessions || filteredSessions.length === 0) {
            toast({ title: "No data to export", description: "No sessions match the selected duration or filter.", variant: "destructive" });
            return;
        }

        const clientFullName = fullName || formatClientName(client, { includeHonorific: true });
        const clientUHID = uhid || client?.uhid || "-";

        const exportData = filteredSessions.map((s: any) => {
            const psd = s.physio_session_details?.[0] || {};
            const startTime = s.scheduled_start ? new Date(s.scheduled_start) : null;
            const endTime = s.scheduled_end ? new Date(s.scheduled_end) : null;

            let durationStr = "-";
            if (s.duration_minutes !== undefined && s.duration_minutes !== null) {
                durationStr = `${s.duration_minutes} mins`;
            } else if (startTime && endTime) {
                const diffMins = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)));
                durationStr = `${diffMins} mins`;
            }

            const specialistName = s.therapist
                ? formatStaffName({ ...s.therapist, service_type: s.service_type }, { useFirstName: true })
                : (s.therapist_id || "-");

            const loggedByName = s.logged_by?.first_name || s.logged_by?.last_name
                ? `${s.logged_by.first_name || ""} ${s.logged_by.last_name || ""}`.trim()
                : (specialistName !== "-" ? specialistName : "System Staff");

            const catDisplay = SESSION_CATEGORY_CONFIG[s.session_category]?.label || s.session_category || s.service_type || "General";

            let entitlementDisplay = "Entitled";
            if (s.session_category === 'sports_science') {
                entitlementDisplay = "Exempt (Sports Science)";
            } else if (s.is_unentitled) {
                entitlementDisplay = "UN-ENTITLED";
            }

            const notes = psd.clinical_notes || s.session_notes || "-";
            const recommendations = psd.next_plan || "-";
            const modalities = psd.modality_used || psd.treatment_type || "-";

            return {
                'Client Name': clientFullName,
                'UHID': clientUHID,
                'Category': catDisplay,
                'Session Type': s.service_type || "-",
                'Session Mode': s.session_mode || "Individual",
                'Date': startTime ? format(startTime, "dd MMM yyyy") : "-",
                'From Time': startTime ? format(startTime, "hh:mm a") : "-",
                'To Time': endTime ? format(endTime, "hh:mm a") : "-",
                'Duration': durationStr,
                'Specialist / Consultant': specialistName,
                'Logged By': loggedByName,
                'Status': s.status || "-",
                'Pain Score': psd.pain_score !== undefined && psd.pain_score !== null ? `${psd.pain_score}/10` : "-",
                'Treatment / Modality': modalities,
                'Clinical Notes / Remarks': notes,
                'Recommendations / Next Plan': recommendations,
                'Entitlement Status': entitlementDisplay
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        worksheet['!cols'] = [
            { wch: 22 }, // Client Name
            { wch: 14 }, // UHID
            { wch: 20 }, // Category
            { wch: 22 }, // Session Type
            { wch: 14 }, // Session Mode
            { wch: 14 }, // Date
            { wch: 12 }, // From Time
            { wch: 12 }, // To Time
            { wch: 12 }, // Duration
            { wch: 22 }, // Specialist
            { wch: 22 }, // Logged By
            { wch: 12 }, // Status
            { wch: 12 }, // Pain Score
            { wch: 22 }, // Modality
            { wch: 36 }, // Clinical Notes
            { wch: 32 }, // Recommendations
            { wch: 24 }, // Entitlement Status
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Session Records");
        const categorySlug = sessionTypeFilter === 'all' ? 'All_Sessions' : (SESSION_CATEGORY_CONFIG[sessionTypeFilter]?.label || sessionTypeFilter).replace(/\s+/g, '_');
        XLSX.writeFile(workbook, `Sessions_${uhid || id}_${categorySlug}.xlsx`);
    };

    return (
        <DashboardLayout role="admin">
            <div className="w-full space-y-6 pb-28 md:pb-12">
                
                {/* Top Back Bar & Action Buttons */}
                <div className="flex items-center justify-between gap-3">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate(-1)}
                        className="h-9 px-3 rounded-xl border-border/60 text-slate-700 dark:text-slate-200 font-bold text-xs gap-1.5 shadow-xs"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Button>

                    <div className="flex items-center gap-2">
                        {isAdminOrFoe && (
                            <Button
                                onClick={() => setIsEditModalOpen(true)}
                                variant="outline"
                                size="sm"
                                className="h-9 px-3 rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-bold text-xs gap-1.5"
                            >
                                <User className="w-3.5 h-3.5" /> Edit Profile
                            </Button>
                        )}
                        {isAdminOrFoe && (
                            <Button
                                onClick={() => navigate(`/admin/billing?clientId=${client.id}`)}
                                variant="default"
                                size="sm"
                                className="h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> Generate Bill
                            </Button>
                        )}
                    </div>
                </div>

                {/* Athlete Hero Card Banner */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 md:p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden border border-slate-800">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                        <Activity className="w-64 h-64" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-start sm:items-center gap-4">
                            <div className={cn(
                                "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center font-black text-xl sm:text-2xl border-2 border-white/20 shadow-2xl shrink-0",
                                client.is_vip ? "bg-amber-500 text-white" : "bg-white/10 text-white backdrop-blur-md"
                            )}>
                                {client.first_name?.[0]}{client.last_name?.[0]}
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl sm:text-3xl font-black italic tracking-tight text-white">
                                        {fullName}
                                    </h1>
                                    <VIPBadge isVIP={client.is_vip} size="lg" />
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-300">
                                    <Badge variant="outline" className="bg-white/10 border-white/20 text-white text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5">
                                        UHID: {uhid}
                                    </Badge>
                                    <span>•</span>
                                    <span className="text-slate-300">Registered: {format(new Date(registered_on), "dd MMM yyyy")}</span>
                                    {client.sport && (
                                        <>
                                            <span>•</span>
                                            <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px]">{client.sport}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* AMS Access Switch Card */}
                        <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 flex items-center justify-between gap-4 shrink-0 sm:self-start md:self-auto">
                            <div className="space-y-0.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 block">AMS System Access</span>
                                <span className="text-xs font-bold text-white">
                                    {amsRole === "athlete" ? "Active Portal" : "Inactive"}
                                </span>
                            </div>
                            <Switch 
                                id="ams-toggle" 
                                className="data-[state=checked]:bg-emerald-500"
                                checked={amsRole === "athlete"}
                                onCheckedChange={toggleAmsAccess}
                                disabled={isFOE}
                            />
                        </div>
                    </div>
                </div>

                {/* Content Tabs - Full-width evenly distributed */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <div className="w-full overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain mb-4 border-b border-border/40 pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
                        <TabsList className="inline-flex w-max min-w-full h-10 items-center rounded-xl bg-muted/60 p-0.5 text-muted-foreground gap-1 shrink-0">
                            <TabsTrigger value="upcoming" className="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold tracking-tight transition-all data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5 justify-center">
                                <CalendarDays className="w-3.5 h-3.5 shrink-0" /> <span>Upcoming Events & Plan</span>
                            </TabsTrigger>
                            <TabsTrigger value="profile" className="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold tracking-tight transition-all data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5 justify-center">
                                <User className="w-3.5 h-3.5 shrink-0" /> <span>Profile Details</span>
                            </TabsTrigger>
                            <TabsTrigger value="sessions" className="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold tracking-tight transition-all data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5 justify-center">
                                <History className="w-3.5 h-3.5 shrink-0" /> <span>Physio Sessions History</span>
                            </TabsTrigger>
                            {isAdminOrFoe && (
                                <TabsTrigger value="entitlements" className="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold tracking-tight transition-all data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5 justify-center">
                                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> <span>Entitlements</span>
                                </TabsTrigger>
                            )}
                            {isAdminOrFoe && (
                                <TabsTrigger value="billing" className="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold tracking-tight transition-all data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5 justify-center">
                                    <Banknote className="w-3.5 h-3.5 shrink-0" /> <span>Billing History</span>
                                </TabsTrigger>
                            )}
                            {canAccessDocuments && (
                                <TabsTrigger value="documents" className="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold tracking-tight transition-all data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5 justify-center">
                                    <FileText className="w-3.5 h-3.5 shrink-0" /> <span>Documents</span>
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="assessment-reports" className="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold tracking-tight transition-all data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5 justify-center">
                                <Activity className="w-3.5 h-3.5 shrink-0" /> <span>Assessment Reports</span>
                            </TabsTrigger>
                            <TabsTrigger value="questionnaires" className="shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold tracking-tight transition-all data-[state=active]:bg-primary data-[state=active]:text-white gap-1.5 justify-center">
                                <ClipboardList className="w-3.5 h-3.5 shrink-0" /> <span>Questionnaires</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* UPCOMING EVENTS & PLAN TAB */}
                    <TabsContent value="upcoming" className="space-y-6">
                        <UpcomingPlanManager clientId={id!} clientName={fullName} />
                    </TabsContent>

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

                            {/* Dual-Insight Panel System - Admin & FOE Access */}
                            {isAdminOrFoe && (
                                <div className="md:col-span-2 space-y-6">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="h-px flex-1 bg-slate-200" />
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 bg-background px-4">Dual-Insight Profile System</span>
                                        <div className="h-px flex-1 bg-slate-200" />
                                    </div>

                                    {/* Desktop: Side-by-Side Layout */}
                                    <div className="hidden lg:grid grid-cols-2 gap-6 items-stretch">
                                        {/* Panel A: Admin Remarks (Strategic Notes) */}
                                        <Card className="gradient-card border-border border-l-4 border-l-yellow-500 h-full flex flex-col">
                                            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                                                <div className="space-y-1">
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        <Shield className="w-5 h-5 text-yellow-600" />
                                                        Admin Remarks
                                                    </CardTitle>
                                                    <CardDescription className="text-[10px]">Strategic notes for long-term management.</CardDescription>
                                                </div>
                                                {isAdmin && (
                                                    <div className="flex items-center gap-2 bg-yellow-500/5 px-3 py-1 rounded-full border border-yellow-500/20">
                                                        <Label htmlFor="vip-toggle-desktop" className="text-[10px] font-bold text-yellow-800 cursor-pointer">
                                                            VIP
                                                        </Label>
                                                        <Switch 
                                                            id="vip-toggle-desktop"
                                                            checked={client.is_vip}
                                                            onCheckedChange={handleToggleVIP}
                                                            className="h-4 w-7 data-[state=checked]:bg-yellow-500"
                                                        />
                                                    </div>
                                                )}
                                            </CardHeader>
                                            <CardContent className="space-y-4 flex-1 flex flex-col">
                                                <Textarea
                                                    value={adminRemarks}
                                                    onChange={(e) => setAdminRemarks(e.target.value)}
                                                    placeholder="Write strategic internal notes here (e.g. Sponsored athlete, Payment via corporate)..."
                                                    className="flex-1 min-h-[150px] bg-muted/20 font-medium text-sm leading-relaxed"
                                                    disabled={isFOE}
                                                />
                                                {!isFOE && (
                                                    <div className="flex justify-end pt-2">
                                                        <Button 
                                                            onClick={handleUpdateAdminRemarks} 
                                                            disabled={isUpdatingRemarks}
                                                            className="gap-2 bg-yellow-600 hover:bg-yellow-700 text-white h-9 text-xs"
                                                        >
                                                            {isUpdatingRemarks ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                            Update Admin Remarks
                                                        </Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>

                                        {/* Panel B: Enquiry Context (Historical Notes) */}
                                        <EnquiryContextWindow clientId={id!} />
                                    </div>

                                    {/* Mobile: Tabbed Overlay Layout */}
                                    <div className="lg:hidden">
                                        <Tabs defaultValue="admin" className="w-full">
                                            <TabsList className="grid w-full grid-cols-2 mb-4 bg-muted/50 p-1">
                                                <TabsTrigger value="admin" className="text-xs font-bold gap-2">
                                                    <Shield className="w-3.5 h-3.5" /> Admin Remarks
                                                </TabsTrigger>
                                                <TabsTrigger value="enquiry" className="text-xs font-bold gap-2">
                                                    <History className="w-3.5 h-3.5" /> Enquiry Context
                                                </TabsTrigger>
                                            </TabsList>
                                            
                                            <TabsContent value="admin">
                                                <Card className="gradient-card border-border border-l-4 border-l-yellow-500">
                                                    <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
                                                        <CardTitle className="text-md flex items-center gap-2">
                                                            <Shield className="w-4 h-4 text-yellow-600" />
                                                            Admin Remarks
                                                        </CardTitle>
                                                        {isAdmin && (
                                                            <Switch 
                                                                checked={client.is_vip}
                                                                onCheckedChange={handleToggleVIP}
                                                                className="data-[state=checked]:bg-yellow-500 scale-75"
                                                            />
                                                        )}
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        <Textarea
                                                            value={adminRemarks}
                                                            onChange={(e) => setAdminRemarks(e.target.value)}
                                                            placeholder="Internal notes..."
                                                            className="min-h-[120px] bg-muted/20 font-medium text-sm"
                                                            disabled={isFOE}
                                                        />
                                                        {!isFOE && (
                                                            <Button 
                                                                onClick={handleUpdateAdminRemarks} 
                                                                disabled={isUpdatingRemarks}
                                                                className="w-full gap-2 bg-yellow-600 text-white"
                                                            >
                                                                Save Notes
                                                            </Button>
                                                        )}
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>
                                            
                                            <TabsContent value="enquiry">
                                                <EnquiryContextWindow clientId={id!} isMobile={true} />
                                            </TabsContent>
                                        </Tabs>
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* ENTITLEMENTS TAB */}
                    <TabsContent value="entitlements">
                        <ClientEntitlements clientId={id!} />
                    </TabsContent>

                    {/* SESSION HISTORY TAB */}
                    <TabsContent value="sessions" className="w-full space-y-6">
                        <Card className="gradient-card border-border w-full shadow-xs -mx-4 sm:mx-0 rounded-none sm:rounded-2xl border-x-0 sm:border-x">
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <CalendarDays className="w-5 h-5 text-primary" />
                                            Sessions History & Clinical Records
                                        </CardTitle>
                                        <CardDescription>
                                            Unified record of all client sessions, clinical SOAP notes, provider logs, and entitlement tracking.
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2 self-start sm:self-auto">
                                        <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-xl border border-border/40 md:hidden">
                                            <button
                                                type="button"
                                                onClick={() => setMobileViewMode('table')}
                                                className={cn(
                                                    "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                                                    mobileViewMode === 'table' ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                Table View
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMobileViewMode('cards')}
                                                className={cn(
                                                    "px-2.5 py-1 text-xs font-bold rounded-lg transition-all",
                                                    mobileViewMode === 'cards' ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                                                )}
                                            >
                                                Card View
                                            </button>
                                        </div>
                                        <Button variant="outline" size="sm" className="h-9 gap-2 text-xs font-bold" onClick={handleExportExcel}>
                                            <Download className="w-4 h-4" /> Export to Excel
                                        </Button>
                                    </div>
                                </div>

                                    {/* Quick Summary Counts */}
                                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                                        <div className="px-3 py-1 bg-muted/60 rounded-xl font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 border border-border/40">
                                            <span className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Total:</span>
                                            <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-mono font-bold bg-background">
                                                {categoryCounts.all}
                                            </Badge>
                                        </div>
                                        <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl font-medium flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800/40">
                                            <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Completed:</span>
                                            <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-mono font-bold bg-white dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                                                {categoryCounts.completed}
                                            </Badge>
                                        </div>
                                        {sessionTypeFilter !== 'all' && (
                                            <div className="px-3 py-1 bg-primary/10 text-primary rounded-xl font-medium flex items-center gap-1.5 border border-primary/20">
                                                <span className="font-bold text-[11px] uppercase tracking-wider">Filtered ({SESSION_CATEGORY_CONFIG[sessionTypeFilter]?.label || sessionTypeFilter}):</span>
                                                <Badge variant="secondary" className="px-1.5 py-0 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-primary">
                                                    {filteredSessions.length}
                                                </Badge>
                                            </div>
                                        )}
                                    </div>

                                    {/* Filters Bar */}
                                    <div className="mt-4 grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 items-end">
                                        <div className="flex flex-col gap-1 col-span-1">
                                            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Start Date</span>
                                            <div className="relative flex items-center h-8.5 w-full sm:w-[145px] bg-muted/50 rounded-xl border border-input focus-within:ring-1 focus-within:ring-ring">
                                                <Input 
                                                    type="text" 
                                                    placeholder="DD-MM-YYYY" 
                                                    value={startDateInput} 
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setStartDateInput(val);
                                                        if (!val) {
                                                            setStartDate("");
                                                        } else {
                                                            const parsed = parseDDMMYYYY(val);
                                                            if (parsed) {
                                                                setStartDate(parsed);
                                                            }
                                                        }
                                                    }} 
                                                    className="w-full h-full bg-transparent px-2.5 py-1 text-[11px] border-none focus-visible:ring-0 focus-visible:ring-offset-0 pr-7 font-mono" 
                                                />
                                                <div className="absolute right-1 flex items-center">
                                                    {startDateInput && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-6 w-6 hover:bg-transparent text-muted-foreground hover:text-foreground"
                                                            onClick={() => {
                                                                setStartDate("");
                                                                setStartDateInput("");
                                                            }}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-6 w-6 hover:bg-transparent text-muted-foreground hover:text-foreground"
                                                            >
                                                                <CalendarDays className="h-3.5 w-3.5 text-primary opacity-70" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="end">
                                                            <Calendar
                                                                mode="single"
                                                                selected={startDate ? parse(startDate, "yyyy-MM-dd", new Date()) : undefined}
                                                                onSelect={(date) => {
                                                                    if (date) {
                                                                        setStartDate(format(date, "yyyy-MM-dd"));
                                                                        setStartDateInput(format(date, "dd-MM-yyyy"));
                                                                    } else {
                                                                        setStartDate("");
                                                                        setStartDateInput("");
                                                                    }
                                                                }}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 col-span-1">
                                            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">End Date</span>
                                            <div className="relative flex items-center h-8.5 w-full sm:w-[145px] bg-muted/50 rounded-xl border border-input focus-within:ring-1 focus-within:ring-ring">
                                                <Input 
                                                    type="text" 
                                                    placeholder="DD-MM-YYYY" 
                                                    value={endDateInput} 
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setEndDateInput(val);
                                                        if (!val) {
                                                            setEndDate("");
                                                        } else {
                                                            const parsed = parseDDMMYYYY(val);
                                                            if (parsed) {
                                                                setEndDate(parsed);
                                                            }
                                                        }
                                                    }} 
                                                    className="w-full h-full bg-transparent px-2.5 py-1 text-[11px] border-none focus-visible:ring-0 focus-visible:ring-offset-0 pr-7 font-mono" 
                                                />
                                                <div className="absolute right-1 flex items-center">
                                                    {endDateInput && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-6 w-6 hover:bg-transparent text-muted-foreground hover:text-foreground"
                                                            onClick={() => {
                                                                setEndDate("");
                                                                setEndDateInput("");
                                                            }}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-6 w-6 hover:bg-transparent text-muted-foreground hover:text-foreground"
                                                            >
                                                                <CalendarDays className="h-3.5 w-3.5 text-primary opacity-70" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="end">
                                                            <Calendar
                                                                mode="single"
                                                                selected={endDate ? parse(endDate, "yyyy-MM-dd", new Date()) : undefined}
                                                                onSelect={(date) => {
                                                                    if (date) {
                                                                        setEndDate(format(date, "yyyy-MM-dd"));
                                                                        setEndDateInput(format(date, "dd-MM-yyyy"));
                                                                    } else {
                                                                        setEndDate("");
                                                                        setEndDateInput("");
                                                                    }
                                                                }}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                                            <span className="text-[9px] text-muted-foreground uppercase font-black tracking-wider">Session Category</span>
                                            <Select value={sessionTypeFilter} onValueChange={setSessionTypeFilter}>
                                                <SelectTrigger className="h-8.5 w-full sm:w-[190px] text-[11px] bg-muted/50 rounded-xl font-medium">
                                                    <SelectValue placeholder="All Categories" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Categories ({categoryCounts.all})</SelectItem>
                                                    <SelectItem value="physiotherapy">Physiotherapy ({categoryCounts.physiotherapy})</SelectItem>
                                                    <SelectItem value="sports_science">Sports Science ({categoryCounts.sports_science})</SelectItem>
                                                    <SelectItem value="device_assessment">Device Assessments ({categoryCounts.device_assessment})</SelectItem>
                                                    <SelectItem value="nutrition">Nutrition ({categoryCounts.nutrition})</SelectItem>
                                                    <SelectItem value="active_recovery">Active Recovery Training ({categoryCounts.active_recovery})</SelectItem>
                                                    <SelectItem value="other">Other ({categoryCounts.other})</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {(startDate || endDate || sessionTypeFilter !== 'all') && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => {
                                                    setStartDate("");
                                                    setStartDateInput("");
                                                    setEndDate("");
                                                    setEndDateInput("");
                                                    setSessionTypeFilter("all");
                                                }}
                                                className="h-8.5 px-2.5 text-[11px] text-muted-foreground hover:text-foreground col-span-2 sm:col-span-1"
                                            >
                                                Reset Filters
                                            </Button>
                                        )}
                                    </div>

                                    {/* Quick Category Filter Pills with Sideways Scroller & Controls */}
                                    <SessionCategoryFilterBar 
                                        selectedCategory={sessionTypeFilter} 
                                        onSelectCategory={setSessionTypeFilter} 
                                        categoryCounts={categoryCounts} 
                                        className="mt-3"
                                    />
                                </CardHeader>
                                <CardContent className="p-0 sm:p-6 pt-0 sm:pt-0">
                                    {sessionsLoading ? (
                                        <p className="text-xs text-muted-foreground p-4 text-center">Loading session history...</p>
                                    ) : !filteredSessions || filteredSessions.length === 0 ? (
                                        <p className="text-xs text-muted-foreground p-4 text-center py-10">No sessions found matching filters.</p>
                                    ) : (
                                        <>
                                            {/* Mobile Session Cards (Visible on Mobile Viewports when Card View is selected) */}
                                            {mobileViewMode === 'cards' && (
                                                <div className="block md:hidden space-y-2.5 p-3 sm:p-0">
                                                    {filteredSessions.map((session: any) => {
                                                        const providerName = session.therapist
                                                            ? formatStaffName({ ...session.therapist, service_type: session.service_type }, { useFirstName: true })
                                                            : (session.therapist_id || "-");
                                                        const loggedByName = session.logged_by?.first_name || session.logged_by?.last_name
                                                            ? `${session.logged_by.first_name || ""} ${session.logged_by.last_name || ""}`.trim()
                                                            : providerName;
                                                        const catConfig = SESSION_CATEGORY_CONFIG[session.session_category] || SESSION_CATEGORY_CONFIG.other;

                                                        return (
                                                            <div 
                                                                key={session.id}
                                                                className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs space-y-2.5"
                                                            >
                                                                {/* Top Row: Date/Time + Status Badge */}
                                                                <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                                                                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white font-mono">
                                                                        <CalendarDays className="w-3.5 h-3.5 text-primary shrink-0" />
                                                                        <span>{session.scheduled_start ? format(new Date(session.scheduled_start), "dd MMM yyyy, hh:mm a") : "-"}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 flex-wrap justify-end">
                                                                        <Badge className={cn(
                                                                            "text-[9px] font-black uppercase px-2 py-0.5 border-none",
                                                                            session.status === 'Completed' ? 'bg-emerald-500 text-white' :
                                                                            session.status === 'Planned' ? 'bg-blue-600 text-white' :
                                                                            session.status === 'Checked In' ? 'bg-purple-600 text-white' :
                                                                            'bg-slate-500 text-white'
                                                                        )}>
                                                                            {session.status}
                                                                        </Badge>
                                                                        {session.session_category === 'sports_science' ? (
                                                                            <Badge variant="outline" className="text-[8px] h-4 px-1 font-bold text-indigo-600 border-indigo-200 dark:text-indigo-400">
                                                                                Exempt (SS)
                                                                            </Badge>
                                                                        ) : session.is_unentitled && isAdminOrFoe ? (
                                                                            <Badge className="text-[9px] font-black px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white border-none whitespace-nowrap leading-none tracking-wider shadow-2xs">
                                                                                UN-ENTITLED
                                                                            </Badge>
                                                                        ) : null}
                                                                    </div>
                                                                </div>

                                                                {/* Category, Service & Specialist Grid */}
                                                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                                                                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Category & Type</span>
                                                                        <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0 mb-1 inline-block", catConfig.badgeClass)}>
                                                                            {catConfig.label}
                                                                        </Badge>
                                                                        <p className="font-semibold text-foreground truncate">{session.service_type || 'Performance'}</p>
                                                                    </div>

                                                                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                                                                        <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Specialist / Logged By</span>
                                                                        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                                                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                            <span className="truncate">{providerName}</span>
                                                                        </div>
                                                                        <span className="text-[9px] text-muted-foreground block truncate mt-0.5">By: {loggedByName}</span>
                                                                    </div>
                                                                </div>

                                                                {/* Notes / SOAP Footer */}
                                                                {(session.physio_session_details && session.physio_session_details.length > 0) || session.session_notes || session.session_mode === 'Group' ? (
                                                                    <div className="pt-1.5 border-t border-border/40 text-[10px] flex items-center justify-between">
                                                                        {session.physio_session_details && session.physio_session_details.length > 0 ? (
                                                                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                                                                                <FileText className="w-3.5 h-3.5" /> SOAP Note Available {session.physio_session_details[0]?.pain_score !== undefined ? `(Pain: ${session.physio_session_details[0].pain_score}/10)` : ''}
                                                                            </span>
                                                                        ) : session.session_notes ? (
                                                                            <span className="text-slate-600 dark:text-slate-300 truncate max-w-[200px]">{session.session_notes}</span>
                                                                        ) : null}
                                                                        {session.session_mode === 'Group' && (
                                                                            <span className="italic text-slate-500">Group: {session.group_name}</span>
                                                                        )}
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Full-Width Table View (Spans 100% width on Desktop, and adjusted to entire screen width on Mobile with smooth horizontal scroll) */}
                                            <div 
                                                className={cn(
                                                    "w-full overflow-x-auto rounded-none sm:rounded-xl border-y sm:border border-border/60 touch-pan-x touch-pan-y overscroll-x-contain",
                                                    mobileViewMode === 'cards' ? "hidden md:block" : "block"
                                                )}
                                                style={{ WebkitOverflowScrolling: "touch" }}
                                            >
                                                <table className="w-full text-xs min-w-[760px]">
                                                    <thead>
                                                        <tr className="border-b bg-muted/40 text-left">
                                                            <th className="p-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Date & Time</th>
                                                            <th className="p-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Category & Service</th>
                                                            <th className="p-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Specialist</th>
                                                            <th className="p-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Logged By</th>
                                                            <th className="p-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap">Duration</th>
                                                            <th className="p-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground whitespace-nowrap min-w-[130px]">Status & Entitlement</th>
                                                            <th className="p-3 font-bold uppercase tracking-wider text-[10px] text-muted-foreground min-w-[200px]">Notes / SOAP</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredSessions.map((session: any) => {
                                                            const catConfig = SESSION_CATEGORY_CONFIG[session.session_category] || SESSION_CATEGORY_CONFIG.other;
                                                            const providerName = session.therapist
                                                                ? formatStaffName({ ...session.therapist, service_type: session.service_type }, { useFirstName: true })
                                                                : (session.therapist_id || "-");
                                                            const loggedByName = session.logged_by?.first_name || session.logged_by?.last_name
                                                                ? `${session.logged_by.first_name || ""} ${session.logged_by.last_name || ""}`.trim()
                                                                : providerName;

                                                            const startTime = session.scheduled_start ? new Date(session.scheduled_start) : null;
                                                            const endTime = session.scheduled_end ? new Date(session.scheduled_end) : null;
                                                            const durationMins = session.duration_minutes !== undefined && session.duration_minutes !== null
                                                                ? session.duration_minutes
                                                                : (startTime && endTime ? Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))) : 0);

                                                            return (
                                                                <tr key={session.id} className="border-b last:border-0 hover:bg-muted/15 transition-colors text-xs">
                                                                    <td className="p-3 font-medium text-foreground whitespace-nowrap">
                                                                        <div className="font-semibold text-xs text-foreground">{session.scheduled_start ? format(new Date(session.scheduled_start), "dd MMM yyyy") : "-"}</div>
                                                                        <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 leading-normal mt-0.5">
                                                                            <Clock className="w-3 h-3 shrink-0 text-muted-foreground/70" />
                                                                            {session.scheduled_start ? format(new Date(session.scheduled_start), "hh:mm a") : ""}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <div className="space-y-1">
                                                                            <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0", catConfig.badgeClass)}>
                                                                                {catConfig.label}
                                                                            </Badge>
                                                                            <div className="font-medium text-foreground text-xs">{session.service_type || 'Performance'}</div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 text-muted-foreground">
                                                                        <div className="flex items-center gap-1.5 min-w-[130px]">
                                                                            <User className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                                                                            <span>{providerName}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 text-muted-foreground">
                                                                        <span className="text-[11px] font-medium">{loggedByName}</span>
                                                                    </td>
                                                                    <td className="p-3 font-mono text-muted-foreground">
                                                                        {durationMins > 0 ? `${durationMins}m` : "-"}
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <div className="flex flex-col gap-1 items-start whitespace-nowrap">
                                                                            <Badge className={cn(
                                                                                "text-[9px] font-black uppercase px-2 py-0.5 border-none shadow-2xs leading-none whitespace-nowrap",
                                                                                session.status === 'Completed' ? 'bg-emerald-600 text-white' :
                                                                                session.status === 'Planned' ? 'bg-sky-600 text-white' :
                                                                                session.status === 'Checked In' ? 'bg-purple-600 text-white' :
                                                                                'bg-slate-600 text-white'
                                                                            )}>
                                                                                {session.status}
                                                                            </Badge>
                                                                            {session.session_category === 'sports_science' ? (
                                                                                <Badge variant="outline" className="text-[8px] px-1.5 py-0.5 font-bold text-indigo-600 border-indigo-200 bg-indigo-50/60 dark:text-indigo-300 dark:border-indigo-800 dark:bg-indigo-950/40 whitespace-nowrap leading-none">
                                                                                    Exempt (SS)
                                                                                </Badge>
                                                                            ) : session.is_unentitled && isAdminOrFoe ? (
                                                                                <Badge className="text-[9px] font-black px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white border-none whitespace-nowrap leading-none tracking-wider shadow-2xs">
                                                                                    UN-ENTITLED
                                                                                </Badge>
                                                                            ) : null}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 text-muted-foreground min-w-[200px]">
                                                                        {session.physio_session_details && session.physio_session_details.length > 0 ? (
                                                                            <span className="text-emerald-600 flex items-center gap-1 font-bold">
                                                                                <FileText className="w-3 h-3 shrink-0" /> Pain: {session.physio_session_details[0].pain_score ?? "-"}/10
                                                                            </span>
                                                                        ) : session.session_notes ? (
                                                                            <span className="text-xs text-muted-foreground block" title={session.session_notes}>
                                                                                {session.session_notes}
                                                                            </span>
                                                                        ) : session.session_mode === 'Group' ? (
                                                                            <span className="italic text-[10px]">Group: {session.group_name}</span>
                                                                        ) : "-"}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
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
                                                    <td className="p-3 text-muted-foreground">{bill.bill_items?.map((bi: any) => bi.packages?.name).join(", ") || "Custom"}</td>
                                                    <td className="p-3 text-right font-medium">Rs. {bill.total}</td>
                                                    <td className="p-3 text-center">
                                                        {bill.status === "Paid" ? (
                                                            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold uppercase text-[10px]">
                                                                PAID
                                                            </Badge>
                                                        ) : bill.status === "Partially Paid" ? (
                                                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-blue-500/20 font-bold uppercase text-[10px]">
                                                                PARTIAL
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold uppercase text-[10px]">
                                                                PENDING
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {(bill.status === "Pending" || bill.status === "Partially Paid") && (
                                                                <Button 
                                                                    size="sm" 
                                                                    className="h-7 px-3 text-[10px] font-bold"
                                                                    onClick={() => {
                                                                        setPaymentBillId(bill.id);
                                                                        setPaymentRows([{ id: Math.random().toString(), method: "Cash", amount: bill.remaining_due || bill.total, transactionId: "" }]);
                                                                        setIsPaymentModalOpen(true);
                                                                    }}
                                                                >
                                                                    Collect
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
                                                    <th className="p-3 font-medium text-muted-foreground">Authorizer</th>
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
                                                        <td className="p-3 font-medium">
                                                            {ref.is_override ? (
                                                                <div className="flex items-center gap-1.5 text-orange-600 font-bold">
                                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                                    {ref.authorized_by || "Administrator"}
                                                                </div>
                                                            ) : (
                                                                <span className="text-muted-foreground italic text-[10px]">Standard System Calc</span>
                                                            )}
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

                    {/* ASSESSMENT REPORTS TAB */}
                    <TabsContent value="assessment-reports">
                        <AssessmentReportsList clientId={id!} showDelete={true} />
                    </TabsContent>

                    {/* QUESTIONNAIRES TAB */}
                    <TabsContent value="questionnaires" className="space-y-6">
                        <ClientQuestionnairesTab
                            clientId={id!}
                            clientName={fullName}
                            clientAge={client?.age}
                            clientGender={client?.gender}
                            clientContact={client?.mobile_no}
                            clientObj={client}
                        />
                    </TabsContent>
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
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent aria-describedby={undefined} className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Collect Payment</DialogTitle>
                        <p className="text-xs text-muted-foreground">
                            Invoice: {paymentBillId.substring(0, 8).toUpperCase()} | 
                            Total: <span className="font-bold">Rs. {bills?.find(b => b.id === paymentBillId)?.total}</span> |
                            Already Paid: <span className="font-bold text-emerald-600">Rs. {bills?.find(b => b.id === paymentBillId)?.paid_amount}</span> |
                            Balance Due: <span className="font-bold text-primary">Rs. {bills?.find(b => b.id === paymentBillId)?.remaining_due}</span>
                        </p>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                        {paymentRows.map((row, index) => (
                            <div key={row.id} className="p-4 rounded-xl border bg-muted/20 space-y-3 relative">
                                {paymentRows.length > 1 && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                                        onClick={() => setPaymentRows(paymentRows.filter(r => r.id !== row.id))}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                )}
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Mode</Label>
                                        <Select 
                                            value={row.method} 
                                            onValueChange={(val) => {
                                                const newRows = [...paymentRows];
                                                newRows[index].method = val;
                                                setPaymentRows(newRows);
                                            }}
                                        >
                                            <SelectTrigger className="h-9 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Cash">Cash</SelectItem>
                                                <SelectItem value="UPI">UPI / Digital</SelectItem>
                                                <SelectItem value="Card">Card</SelectItem>
                                                <SelectItem value="Online Bank Transfer">Bank Transfer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Amount (Rs.)</Label>
                                        <Input 
                                            type="number" 
                                            className="h-9 text-xs font-bold"
                                            value={row.amount}
                                            onChange={(e) => {
                                                const newRows = [...paymentRows];
                                                newRows[index].amount = Number(e.target.value);
                                                setPaymentRows(newRows);
                                            }}
                                        />
                                    </div>
                                </div>
                                
                                {(row.method === 'UPI' || row.method === 'Card' || row.method === 'Online Bank Transfer') && (
                                    <div className="space-y-1.5 pt-1">
                                        <Label className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Transaction ID / Ref</Label>
                                        <Input 
                                            placeholder="Mandatory for digital payments"
                                            className="h-9 text-xs"
                                            value={row.transactionId}
                                            onChange={(e) => {
                                                const newRows = [...paymentRows];
                                                newRows[index].transactionId = e.target.value;
                                                setPaymentRows(newRows);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        <Button 
                            variant="outline" 
                            className="w-full h-9 border-dashed gap-2 text-xs"
                            onClick={() => setPaymentRows([...paymentRows, { id: Math.random().toString(), method: "UPI", amount: 0, transactionId: "" }])}
                        >
                            <Plus className="w-3 h-3" /> Add Split Payment Mode
                        </Button>
                    </div>

                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total Collected</p>
                            <p className={cn(
                                "text-lg font-black",
                                Math.abs(paymentRows.reduce((a, b) => a + (Number(b.amount) || 0), 0) - (bills?.find(b => b.id === paymentBillId)?.remaining_due || 0)) < 0.01 
                                    ? "text-emerald-600" 
                                    : "text-rose-600"
                            )}>
                                Rs. {paymentRows.reduce((a, b) => a + (Number(b.amount) || 0), 0).toFixed(2)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Balance After</p>
                            <p className="text-sm font-bold">
                                Rs. {((bills?.find(b => b.id === paymentBillId)?.remaining_due || 0) - paymentRows.reduce((a, b) => a + (Number(b.amount) || 0), 0)).toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            className="w-full font-bold" 
                            onClick={markAsPaid}
                        >
                            Confirm & Post Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Profile Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent aria-describedby={undefined} className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Client Profile</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4 text-xs">
                        {/* Name Section */}
                        <div className="space-y-2">
                            <h4 className="font-bold text-primary uppercase tracking-wide text-[10px]">Name & Honorific</h4>
                            <div className="grid grid-cols-6 gap-3">
                                <div className="col-span-2 space-y-1.5">
                                    <Label htmlFor="edit-honorific">Honorific</Label>
                                    <Select 
                                        value={editForm.honorific} 
                                        onValueChange={(val) => setEditForm(prev => ({ ...prev, honorific: val }))}
                                    >
                                        <SelectTrigger id="edit-honorific" className="h-9 text-xs">
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Mr.">Mr.</SelectItem>
                                            <SelectItem value="Mrs.">Mrs.</SelectItem>
                                            <SelectItem value="Ms.">Ms.</SelectItem>
                                            <SelectItem value="Dr.">Dr.</SelectItem>
                                            <SelectItem value="Master">Master</SelectItem>
                                            <SelectItem value="Baby">Baby</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <Label htmlFor="edit-first-name">First Name *</Label>
                                    <Input 
                                        id="edit-first-name"
                                        className="h-9 text-xs" 
                                        value={editForm.first_name} 
                                        onChange={e => setEditForm(prev => ({ ...prev, first_name: e.target.value }))} 
                                    />
                                </div>
                                <div className="col-span-2 space-y-1.5">
                                    <Label htmlFor="edit-last-name">Last Name *</Label>
                                    <Input 
                                        id="edit-last-name"
                                        className="h-9 text-xs" 
                                        value={editForm.last_name} 
                                        onChange={e => setEditForm(prev => ({ ...prev, last_name: e.target.value }))} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Personal Details: Age, DOB, Gender, Blood Group */}
                        <div className="space-y-2">
                            <h4 className="font-bold text-primary uppercase tracking-wide text-[10px]">Personal Information</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-dob">Date of Birth</Label>
                                    <Input 
                                        id="edit-dob"
                                        type="date"
                                        className="h-9 text-xs" 
                                        value={editForm.dob} 
                                        onChange={e => {
                                            const dobVal = e.target.value;
                                            let computedAge = editForm.age;
                                            if (dobVal) {
                                                const birthDate = new Date(dobVal);
                                                const today = new Date();
                                                let ageNum = today.getFullYear() - birthDate.getFullYear();
                                                const m = today.getMonth() - birthDate.getMonth();
                                                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                                    ageNum--;
                                                }
                                                computedAge = String(ageNum >= 0 ? ageNum : 0);
                                            }
                                            setEditForm(prev => ({ ...prev, dob: dobVal, age: computedAge }));
                                        }} 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-age">Age (Years)</Label>
                                    <Input 
                                        id="edit-age"
                                        type="number"
                                        className="h-9 text-xs" 
                                        value={editForm.age} 
                                        onChange={e => setEditForm(prev => ({ ...prev, age: e.target.value }))} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Contact details */}
                        <div className="space-y-2">
                            <h4 className="font-bold text-primary uppercase tracking-wide text-[10px]">Contact Details</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-mobile">Mobile Number *</Label>
                                    <Input 
                                        id="edit-mobile"
                                        className="h-9 text-xs" 
                                        value={editForm.mobile_no} 
                                        onChange={e => setEditForm(prev => ({ ...prev, mobile_no: e.target.value }))} 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-email">Email Address</Label>
                                    <Input 
                                        id="edit-email"
                                        type="email"
                                        className="h-9 text-xs" 
                                        value={editForm.email} 
                                        onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Address details */}
                        <div className="space-y-2">
                            <h4 className="font-bold text-primary uppercase tracking-wide text-[10px]">Address Details</h4>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="edit-address">Flat/House/Street Address</Label>
                                    <Input 
                                        id="edit-address"
                                        className="h-9 text-xs" 
                                        value={editForm.address} 
                                        onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))} 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-locality">Locality</Label>
                                        <Input 
                                            id="edit-locality"
                                            className="h-9 text-xs" 
                                            value={editForm.locality} 
                                            onChange={e => setEditForm(prev => ({ ...prev, locality: e.target.value }))} 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-city">City</Label>
                                        <Input 
                                            id="edit-city"
                                            className="h-9 text-xs" 
                                            value={editForm.city} 
                                            onChange={e => setEditForm(prev => ({ ...prev, city: e.target.value }))} 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-state">State</Label>
                                        <Input 
                                            id="edit-state"
                                            className="h-9 text-xs" 
                                            value={editForm.state} 
                                            onChange={e => setEditForm(prev => ({ ...prev, state: e.target.value }))} 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-pincode">Pincode</Label>
                                        <Input 
                                            id="edit-pincode"
                                            className="h-9 text-xs" 
                                            value={editForm.pincode} 
                                            onChange={e => setEditForm(prev => ({ ...prev, pincode: e.target.value }))} 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="edit-country">Country</Label>
                                        <Input 
                                            id="edit-country"
                                            className="h-9 text-xs" 
                                            value={editForm.country} 
                                            onChange={e => setEditForm(prev => ({ ...prev, country: e.target.value }))} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t mt-2">
                        <Button 
                            variant="outline" 
                            className="text-xs"
                            onClick={() => setIsEditModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button 
                            className="text-xs font-bold" 
                            disabled={!editForm.first_name.trim() || !editForm.last_name.trim() || !editForm.mobile_no.trim()}
                            onClick={handleSaveProfile}
                        >
                            Save Updates
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
