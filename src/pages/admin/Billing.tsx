import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Download, CheckCircle, CreditCard, Banknote, Smartphone, Trash2, ShoppingCart, Check, ChevronsUpDown, Receipt, Copy, User, MessageSquare, ShieldCheck, UserPlus, Eye, EyeOff, ArrowLeftRight, FileText, X, TrendingUp, AlertCircle, Users, History, CalendarClock, Filter } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
import { toast } from "@/hooks/use-toast";
import { cn, getImageDimensions } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RefundModal } from "@/components/admin/RefundModal";
import { generateRefundVoucher } from "@/lib/refundActions";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { VIPBadge, VIPName } from "@/components/ui/VIPBadge";
import { TransactionDetailDrawer, TransactionDetail } from "@/components/admin/TransactionDetailDrawer";
import { SubscriptionModal } from "@/components/sports-scientist/SubscriptionModal";
import { SubscriptionDetailDrawer } from "@/components/billing/SubscriptionDetailDrawer";
import type { Database } from "@/integrations/supabase/types";

type CartItem = {
    id: string; // unique cart item id
    package_id: string;
    name: string;
    price: number;
    tax_amount: number;
    quantity: number;
    items?: { service_type: string; default_sessions: number; }[];
};

type Bill = {
    id: string;
    client_id: string;
    client_name: string;
    items: { name: string; price: number; entitlements?: { service_type: string; default_sessions: number; }[] }[];
    referral_source: string;
    subtotal: number;
    discount_type: "percentage" | "flat";
    discount_value: number;
    total_amount: number;
    status: "Pending" | "Paid" | "Partially Paid";
    payment_method?: string;
    transaction_id?: string;
    date: string;
    organization?: { name: string; id: string };
    client?: { id: string; full_name: string; is_vip?: boolean };
    notes?: string;
    discount_authorized_by?: string;
    billing_staff_name?: string;
    billed_by_id?: string;
    billed_by_name?: string;
    invoice_number?: string;
    referral_source_name?: string;
    include_notes_in_invoice?: boolean;
    organization_logo?: string;
    organization_address?: string;
    organization_official_name?: string;
    paid_amount?: number;
    remaining_due?: number;
    tax_amount?: number;
    client_uhid?: string;
    client_mobile?: string;
    client_is_vip?: boolean;
};

type Client = { id: string; first_name: string; last_name: string; uhid: string; email?: string; mobile_no?: string; is_vip?: boolean };
type Package = { id: string; name: string; price: number; category?: string; tax_amount?: number; service_package_items?: { service_type: string; default_sessions: number; }[] };
type ReferralSource = { id: string; name: string };

export default function BillingPage() {
    const { profile, roles } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const clientIdParam = searchParams.get("clientId");
    const queryClient = useQueryClient();
    const orgName = "Integration Sports Clinic";

    // 1. Fetch Billing Stats
    const { data: stats } = useQuery({
        queryKey: ["admin-billing-stats", profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return null;
            return await apiFetch<any>('/billing/stats');
        },
        enabled: !!profile?.organization_id
    });

    const [clients, setClients] = useState<Client[]>([]);
    const [referralSources, setReferralSources] = useState<ReferralSource[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);
    const [orgDetails, setOrgDetails] = useState<any>(null);

    // Fetch Invoices via React Query to enable automatic caching and reactive updates
    const { data: bills = [] } = useQuery({
        queryKey: ["admin-bills", profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return [];
            const billsData = await apiFetch<any[]>('/billing/invoices');
            return billsData.map((b): Bill => ({
                id: b.id,
                client_id: b.client_id,
                client: { id: b.client_id, full_name: b.client_name, is_vip: b.client_is_vip },
                organization: { id: b.organization_id, name: b.organization_name },
                client_name: b.client_name,
                client_is_vip: b.client_is_vip,
                client_uhid: b.client_uhid || "",
                client_mobile: b.client_mobile || "",
                items: b.items,
                referral_source: b.referral_source_name || "-",
                referral_source_name: b.referral_source_name || "-",
                subtotal: Number(b.amount),
                discount_type: "flat" as const,
                discount_value: Number(b.discount || 0),
                total_amount: Number(b.total),
                status: b.status,
                transaction_id: b.transaction_id || undefined,
                date: b.created_at,
                notes: b.notes || undefined,
                discount_authorized_by: b.discount_authorized_by || undefined,
                billing_staff_name: b.billing_staff_name || undefined,
                billed_by_id: b.billed_by_id || undefined,
                billed_by_name: b.billed_by_name || undefined,
                invoice_number: b.invoice_number || undefined,
                include_notes_in_invoice: b.include_notes_in_invoice || false,
                organization_logo: b.organization_logo,
                organization_address: b.organization_official_address,
                organization_official_name: b.organization_official_name || b.organization_name,
                paid_amount: Number(b.paid_amount),
                remaining_due: Number(b.remaining_due),
                tax_amount: Number(b.tax_amount || 0)
            }));
        },
        enabled: !!profile?.organization_id
    });

    // Form States
    const [selectedClient, setSelectedClient] = useState("");
    const [selectedReferral, setSelectedReferral] = useState("");
    const [selectedReferralName, setSelectedReferralName] = useState("");
    const [remarks, setRemarks] = useState("");
    const [includeNotesInInvoice, setIncludeNotesInInvoice] = useState(false);
    const [discountAuthorizedBy, setDiscountAuthorizedBy] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>("all");

    // Discount States
    const [discountType, setDiscountType] = useState<"percentage" | "flat">("flat");
    const [discountValue, setDiscountValue] = useState<string>("0");

    // Modals States
    const [newReferralName, setNewReferralName] = useState("");
    const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);

    const [newPkgName, setNewPkgName] = useState("");
    const [newPkgPrice, setNewPkgPrice] = useState("");
    const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);

    const [paymentBillId, setPaymentBillId] = useState("");
    const [paymentRows, setPaymentRows] = useState<Array<{ id: string, method: string, amount: number, transactionId: string }>>([
        { id: Math.random().toString(), method: "Cash", amount: 0, transactionId: "" }
    ]);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
    const [selectedSub, setSelectedSub] = useState<any>(null);
    const [isSubDrawerOpen, setIsSubDrawerOpen] = useState(false);

    // Fetch subscriptions for the new tab
    const { data: subscriptions } = useQuery({
        queryKey: ["admin-subscriptions", profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return [];
            return await apiFetch<any[]>('/billing/subscriptions');
        },
        enabled: !!profile?.organization_id
    });

    // Fetch subscription history
    const { data: subHistory, isLoading: isLoadingHistory } = useQuery({
        queryKey: ["subscription-history", selectedSub?.id],
        queryFn: async () => {
            if (!selectedSub?.id) return [];
            return await apiFetch<any[]>(`/billing/invoices`, {
                params: { subscription_id: selectedSub.id }
            });
        },
        enabled: !!selectedSub?.id
    });

    const generateEarlyInvoice = useMutation({
        mutationFn: async (subId: string) => {
            return await apiFetch('/billing/subscriptions/generate-invoice', {
                method: 'POST',
                data: { subscription_id: subId }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] }).then(() => {
                const updatedSubs: any = queryClient.getQueryData(["admin-subscriptions", profile?.organization_id]);
                if (updatedSubs && selectedSub) {
                    const found = updatedSubs.find((s: any) => s.id === selectedSub.id);
                    if (found) setSelectedSub(found);
                }
            });
            queryClient.invalidateQueries({ queryKey: ["subscription-history", selectedSub?.id] });
            queryClient.invalidateQueries({ queryKey: ["admin-bills"] });
            toast({ title: "Early invoice generated successfully" });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });

    const cancelSubscription = useMutation({
        mutationFn: async (subId: string) => {
            return await apiFetch('/billing/subscriptions/cancel', {
                method: 'POST',
                data: { subscription_id: subId }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] }).then(() => {
                const updatedSubs: any = queryClient.getQueryData(["admin-subscriptions", profile?.organization_id]);
                if (updatedSubs && selectedSub) {
                    const found = updatedSubs.find((s: any) => s.id === selectedSub.id);
                    if (found) setSelectedSub(found);
                }
            });
            toast({ title: "Membership cancelled successfully" });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });

    // Refund State
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundBillObj, setRefundBillObj] = useState<Bill | null>(null);

    // Transaction Ledger State
    // Fetch Refunds via React Query to enable automatic caching and reactive updates
    const { data: refunds = [] } = useQuery({
        queryKey: ["admin-refunds", profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return [];
            return await apiFetch<any[]>('/billing/refunds');
        },
        enabled: !!profile?.organization_id
    });
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [ledgerSearch, setLedgerSearch] = useState("");

    const [openCombobox, setOpenCombobox] = useState(false);
    const [openReferralCombobox, setOpenReferralCombobox] = useState(false);
    const [referralSearch, setReferralSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("All");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (profile?.organization_id) {
            fetchData();
        }
    }, [profile]);

    const fetchData = async () => {
        if (!profile?.organization_id) return;

        try {
            // Fetch Clients
            const clientsData = await apiFetch<any[]>('/clients');
            const parsedClients = clientsData.map(c => ({
                id: c.id, first_name: c.first_name, last_name: c.last_name, uhid: c.uhid, email: c.email, mobile_no: c.mobile_no, is_vip: c.is_vip
            }));
            setClients(parsedClients);

            if (clientIdParam && parsedClients.some(c => c.id === clientIdParam)) {
                setSelectedClient(clientIdParam);
            }

            // Fetch Packages
            const pkgData = await apiFetch<any[]>('/billing/packages');
            setPackages(pkgData);
            console.log('[FRONTEND] Fetched packages:', pkgData);

            // Fetch Referral Sources
            const refData = await apiFetch<any[]>('/billing/referral-sources');
            setReferralSources(refData);

            // Fetch Org Details
            const orgData = await apiFetch<any>(`/organizations/${profile.organization_id}`);
            if (orgData.data) setOrgDetails(orgData.data);
        } catch (err: any) {
            toast({ title: "Failed to fetch data", description: err.message, variant: "destructive" });
        }
    };

    const handleAddReferral = () => {
        if (!newReferralName.trim()) return;
        const newRef = { id: Date.now().toString(), name: newReferralName };
        setReferralSources([...referralSources, newRef]);
        setSelectedReferral(newRef.id);
        setSelectedReferralName(newRef.name);
        setNewReferralName("");
        setIsReferralModalOpen(false);
        toast({ title: "Referral Source Added" });
    };

    const handleAddPackage = () => {
        if (!newPkgName.trim() || !newPkgPrice) return;
        const newPkg = { id: Date.now().toString(), name: newPkgName, price: Number(newPkgPrice), category: "Custom", tax_amount: 0 };
        setPackages([...packages, newPkg]);
        setCart([...cart, { id: Date.now().toString(), package_id: newPkg.id, name: newPkg.name, price: newPkg.price, tax_amount: 0, quantity: 1 }]);
        setNewPkgName("");
        setNewPkgPrice("");
        setIsPkgModalOpen(false);
        toast({ title: "Package Added to Cart" });
    };

    const handleRefundSuccess = (refund: any) => {
        fetchData();
        queryClient.invalidateQueries({ queryKey: ["admin-bills"] });
        queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
        queryClient.invalidateQueries({ queryKey: ['client-refunds'] });
        queryClient.invalidateQueries({ queryKey: ['billing-stats'] });
        
        if (refundBillObj) {
            generateRefundVoucher(
                (refundBillObj.organization as any)?.name || orgName, 
                refundBillObj.client_name, 
                refund,
                refund.is_entitlement_reversed
            );
        }
    };

    // Helper to identify which bills have been refunded
    const refundedBillMap = refunds.reduce((acc, r) => {
        if (r.bill_id) acc[r.bill_id] = r;
        return acc;
    }, {} as Record<string, any>);

    // Build merged ledger from bills + refunds
    const ledgerEntries: TransactionDetail[] = [
        ...bills.map(b => ({
            id: b.id,
            type: 'invoice' as const,
            date: b.date,
            client_name: b.client_name,
            client_uhid: (b as any).client_uhid,
            client_mobile: (b as any).client_mobile,
            amount: b.total_amount,
            status: b.status,
            package_name: b.items?.map(i => i.name).join(", "),
            payment_method: (b as any).payment_method,
            transaction_id: b.transaction_id,
            referral_source: b.referral_source_name,
            billing_staff: b.billing_staff_name,
            notes: b.notes,
            discount_value: b.discount_value,
            discount_authorized_by: b.discount_authorized_by,
            paid_amount: b.paid_amount,
            remaining_due: b.remaining_due,
            subtotal: b.subtotal,
            tax_amount: b.tax_amount,
            items: b.items,
            organization_logo: b.organization_logo,
            organization_address: b.organization_address,
            organization_official_name: b.organization_official_name
        })),
        ...refunds.map(r => {
            const client = r.clients as any;
            return {
                id: r.id,
                type: 'refund' as const,
                date: r.created_at,
                client_name: client ? `${client.first_name} ${client.last_name}` : 'Unknown',
                client_uhid: client?.uhid,
                amount: r.amount,
                refund_mode: r.refund_mode,
                refund_transaction_id: r.transaction_id,
                refund_proof_url: r.refund_proof_url,
                authorized_by: r.authorized_by,
                is_override: r.is_override,
                is_entitlement_reversed: r.is_entitlement_reversed,
                original_invoice_id: r.bill_id,
            };
        })
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const filteredLedger = ledgerEntries.filter(t => {
        const s = ledgerSearch.toLowerCase();
        return (
            t.client_name.toLowerCase().includes(s) ||
            t.id.toLowerCase().includes(s) ||
            (t.client_uhid || '').toLowerCase().includes(s)
        );
    });

    const openTransactionDetail = (t: TransactionDetail) => {
        setSelectedTransaction(t);
        setIsDrawerOpen(true);
    };

    const addToCart = (pkgId: string) => {
        const pkg = packages.find(p => p.id === pkgId);
        if (pkg) {
            setCart([...cart, {
                id: Date.now().toString() + Math.random(),
                package_id: pkg.id,
                name: pkg.name,
                price: Number(pkg.price),
                tax_amount: Number(pkg.tax_amount || 0),
                quantity: 1,
                items: pkg.service_package_items
            }]);
        }
    };

    const removeFromCart = (cartItemId: string) => {
        setCart(cart.filter(item => item.id !== cartItemId));
    };

    const updateCartQuantity = (cartItemId: string, quantity: number) => {
        if (quantity < 1) return;
        setCart(cart.map(item => item.id === cartItemId ? { ...item, quantity } : item));
    };

    const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * (item.quantity || 1), 0);
    const overallTaxAmount = cart.reduce((sum, item) => sum + Number(item.tax_amount || 0) * (item.quantity || 1), 0);

    const calculatedDiscountAmount = () => {
        const dVal = Number(discountValue) || 0;
        if (discountType === "percentage") {
            return (subtotal * dVal) / 100;
        }
        return dVal;
    };

    const totalPayable = Math.max(0, subtotal + overallTaxAmount - calculatedDiscountAmount());

    const handleCreateBill = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) {
            toast({ title: "Please add at least one package to the cart", variant: "destructive" });
            return;
        }

        const dVal = Number(discountValue) || 0;
        if (dVal > 0 && !discountAuthorizedBy.trim()) {
            toast({ 
                title: "Authorizer Required", 
                description: "Please specify who authorized this discount.", 
                variant: "destructive" 
            });
            return;
        }

        try {
            let referralId = selectedReferral;

            if (!referralId && selectedReferralName) {
                const existing = referralSources.find(r => r.name.toLowerCase() === selectedReferralName.toLowerCase());
                if (existing) {
                    referralId = existing.id;
                } else {
                    const newRef = await apiFetch<any>('/billing/referral-sources', {
                        method: 'POST',
                        data: { name: selectedReferralName }
                    });
                    referralId = newRef.id;
                }
            }

            const billItems = cart.map(item => {
                const qty = item.quantity || 1;
                const linePrice = item.price * qty;
                const lineTax = item.tax_amount * qty;
                const itemRatio = linePrice / subtotal;
                const itemDiscount = discountType === "percentage" 
                    ? (linePrice * (Number(discountValue) || 0) / 100) 
                    : ((Number(discountValue) || 0) * itemRatio);
                const itemTotal = Math.max(0, linePrice - itemDiscount + lineTax);

                return {
                    package_id: item.package_id,
                    quantity: qty,
                    amount: linePrice,
                    discount: itemDiscount,
                    tax_amount: lineTax,
                    total: itemTotal
                };
            });

            const createdBill = await apiFetch<any>('/billing/invoices', {
                method: 'POST',
                data: {
                    client_id: selectedClient,
                    subtotal: subtotal,
                    discount: calculatedDiscountAmount(),
                    tax_amount: overallTaxAmount,
                    total: totalPayable,
                    referral_source_id: referralId || null,
                    notes: remarks,
                    include_notes_in_invoice: includeNotesInInvoice,
                    discount_authorized_by: (Number(discountValue) > 0) ? discountAuthorizedBy : null,
                    items: billItems
                }
            });

            toast({ title: "Bill Created Successfully" });
            fetchData();
            queryClient.invalidateQueries({ queryKey: ["admin-bills"] });
            // Reset form
            setCart([]);
            setSelectedClient("");
            setRemarks("");
            setDiscountValue("0");
            setDiscountAuthorizedBy("");

            // Automatically open cash collection modal prefilled with grand total!
            if (createdBill && createdBill.id) {
                setPaymentBillId(createdBill.id);
                setPaymentRows([{
                    id: Math.random().toString(),
                    method: "Cash",
                    amount: Number(createdBill.total || createdBill.total_amount || totalPayable),
                    transactionId: ""
                }]);
                setIsPaymentModalOpen(true);
            }
        } catch (err: any) {
            toast({ title: "Error creating bill", description: err.message, variant: "destructive" });
        }
    };

    const markAsPaid = async () => {
        const totalPaid = paymentRows.reduce((a, b) => a + (Number(b.amount) || 0), 0);
        const bill = bills.find(b => b.id === paymentBillId);
        
        if (!bill) return;
        
        const remainingDue = bill.remaining_due ?? bill.total_amount;
        
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

            fetchData();
            queryClient.invalidateQueries({ queryKey: ["admin-bills"] });
            setIsPaymentModalOpen(false);
            setPaymentRows([{ id: Math.random().toString(), method: "Cash", amount: 0, transactionId: "" }]);
            toast({ title: "Payment Recorded Successfully" });
        } catch (err: any) {
            toast({ title: "Failed to record payment", description: err.message, variant: "destructive" });
        }
    };

    const handleDownloadInvoice = async (bill: any) => {
        const d = new jsPDF();
        const c = clients.find(x => x.id === bill.client_id);
        
        const orgDisplayName = bill.organization_official_name || orgDetails?.official_name || orgDetails?.name || orgName;
        const orgAddress = bill.organization_address || orgDetails?.official_address || "";
        const logoUrl = bill.organization_logo || orgDetails?.logo_url || "/logo.png";
        
        const addHeader = async (doc: jsPDF) => {
            const topMargin = 10;
            const maxLogoHeight = 20; 
            let contentStartY = topMargin;

            if (logoUrl && logoUrl !== "/logo.png") {
                try {
                    const { width, height, img } = await getImageDimensions(logoUrl);
                    const aspectRatio = width / height;
                    const finalHeight = Math.min(20, maxLogoHeight);
                    const finalWidth = finalHeight * aspectRatio;
                    doc.addImage(img, 'PNG', 14, topMargin, finalWidth, finalHeight);
                } catch (e) {
                    doc.setFontSize(16);
                    doc.setFont("helvetica", "bold");
                    doc.setTextColor(15, 23, 42); 
                    doc.text(orgDisplayName, 14, topMargin + 10);
                }
            } else {
                doc.setFontSize(16);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(15, 23, 42); 
                doc.text(orgDisplayName, 14, topMargin + 10);
            }

            // Draw INVOICE title on the right, aligned horizontally with the logo
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42); 
            doc.text("INVOICE", 196, topMargin + 12, { align: "right" });

            return topMargin + 25; // Y coordinate where the metadata box will start
        };

        const addFooter = (doc: jsPDF) => {
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184); 
                
                doc.text("THANK YOU FOR YOUR BUSINESS! POWERED BY ISHPO", 105, 285, { align: "center" });
                doc.text(`Page ${i} of ${pageCount}`, 105, 292, { align: "center" });
            }
        };

        const metadataTopY = await addHeader(d);

        // Draw Box around metadata (Bill To vs Invoice Details)
        d.setDrawColor(226, 232, 240);
        d.setFillColor(249, 250, 251);
        d.rect(14, metadataTopY, 182, 32, "FD");
        d.line(105, metadataTopY, 105, metadataTopY + 32);

        // Left Column: Bill To
        d.setFontSize(10);
        d.setFont("helvetica", "bold");
        d.setTextColor(15, 23, 42);
        d.text("Bill To:", 18, metadataTopY + 6);

        d.setFont("helvetica", "normal");
        d.setFontSize(9);
        d.setTextColor(71, 85, 105);
        d.text(bill.client_name, 18, metadataTopY + 12);
        d.text(`UHID : ${c?.uhid || "-"}`, 18, metadataTopY + 18);
        d.text(`Mobile : ${c?.mobile_no || "-"}`, 18, metadataTopY + 24);
        
        // Right Column: Invoice Details
        d.setFontSize(10);
        d.setFont("helvetica", "bold");
        d.setTextColor(15, 23, 42);
        d.text("Invoice Details:", 110, metadataTopY + 6);
        
        d.setFont("helvetica", "normal");
        d.setFontSize(9);
        d.setTextColor(71, 85, 105);
        d.text(`Invoice # : ${bill.invoice_number || bill.id.substring(0, 8).toUpperCase()}`, 110, metadataTopY + 12);
        d.text(`Date : ${format(new Date(bill.date), "dd MMM yyyy")}`, 110, metadataTopY + 18);
        if (bill.billed_by_name || bill.billing_staff_name) {
            d.text(`Billed By: ${bill.billed_by_name || bill.billing_staff_name}`, 110, metadataTopY + 24);
        }

        const tableStartY = metadataTopY + 38;

        const tableData = bill.items.map((item: any, index: number) => {
            let description = item.name;
            if (item.entitlements && item.entitlements.length > 0) {
                const entitlementList = item.entitlements
                    .map((e: any) => `  • ${e.service_type}: ${e.default_sessions} sessions`)
                    .join('\n');
                description += `\n${entitlementList}`;
            }

            const basePrice = Number(item.amount || item.price || 0);
            const itemTax = Number(item.tax_amount || 0);
            const itemTotal = Number(item.total || (basePrice + itemTax));
            const taxPercent = basePrice > 0 ? Math.round((itemTax / basePrice) * 100) : 0;

            return [
                (index + 1).toString(),
                description,
                `Rs. ${basePrice.toFixed(2)}`,
                `Rs. ${itemTax.toFixed(2)} (${taxPercent}%)`,
                `Rs. ${itemTotal.toFixed(2)}`
            ];
        });

        autoTable(d, {
            startY: tableStartY,
            head: [["#", "Description", "Rate", "Tax", "Total"]],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [13, 148, 136] }, 
            styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak', lineColor: [226, 232, 240], lineWidth: 0.5 },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 90 },
                2: { cellWidth: 28, halign: "right" },
                3: { cellWidth: 28, halign: "right" },
                4: { cellWidth: 28, halign: "right" }
            }
        });

        let finalY = (d as any).lastAutoTable.finalY + 10;
        
        // Right-aligned summary block
        d.setFontSize(10);
        d.setFont("helvetica", "normal");
        d.setTextColor(71, 85, 105);

        // Subtotal row
        d.text("Subtotal:", 130, finalY);
        d.text(`Rs. ${Number(bill.subtotal || bill.amount || 0).toFixed(2)}`, 196, finalY, { align: "right" });
        finalY += 6;

        // Tax row
        d.text("Total Tax:", 130, finalY);
        d.text(`Rs. ${Number(bill.tax_amount || 0).toFixed(2)}`, 196, finalY, { align: "right" });
        finalY += 6;

        // Discount row (if any)
        if (Number(bill.discount_value || bill.discount || 0) > 0) {
            d.text("Discount:", 130, finalY);
            d.text(`-Rs. ${Number(bill.discount_value || bill.discount || 0).toFixed(2)}`, 196, finalY, { align: "right" });
            finalY += 6;
        }

        // Divider line
        d.setDrawColor(203, 213, 225);
        d.line(130, finalY - 2, 196, finalY - 2);

        // Grand Total row
        d.setFont("helvetica", "bold");
        d.setTextColor(13, 148, 136); // primary teal color
        d.setFontSize(11);
        d.text("Grand Total:", 130, finalY + 2);
        d.text(`Rs. ${Number(bill.total_amount || bill.total || 0).toFixed(2)}`, 196, finalY + 2, { align: "right" });
        finalY += 12;

        // Left Side metadata info
        d.setFontSize(10);
        d.setFont("helvetica", "normal");
        d.setTextColor(71, 85, 105);

        let leftSideY = (d as any).lastAutoTable.finalY + 10;
        if (Number(bill.discount_value || bill.discount || 0) > 0 && bill.discount_authorized_by) {
            d.text(`Discount Authorized By: ${bill.discount_authorized_by}`, 14, leftSideY);
            leftSideY += 6;
        }

        finalY = Math.max(finalY, leftSideY) + 4;

        if (bill.notes && bill.include_notes_in_invoice) {
            d.setFontSize(9);
            d.setTextColor(100, 116, 139);
            d.setFont("helvetica", "bold");
            d.text(`Remarks:`, 14, finalY);
            d.setFont("helvetica", "normal");
            const splitRemarks = d.splitTextToSize(bill.notes, 180);
            d.text(splitRemarks, 14, finalY + 5);
            finalY += (splitRemarks.length * 5) + 12;
        } else {
            finalY += 5;
        }

        // Add Payment Status
        d.setFontSize(11);
        d.setFont("helvetica", "bold");
        if (bill.status === "Paid") {
            d.setTextColor(16, 185, 129); // emerald-500
            const payMethodStatus = `STATUS: PAID ${bill.payment_method ? `VIA ${bill.payment_method.toUpperCase()}` : ""}${bill.transaction_id ? ` (TXN: ${bill.transaction_id})` : ""}`;
            d.text(payMethodStatus, 14, finalY);
        } else {
            d.setTextColor(245, 158, 11); // amber-500
            d.text("STATUS: PENDING PAYMENT", 14, finalY);
        }

        addFooter(d);
        d.save(`Invoice_${bill.id.substring(0, 8)}.pdf`);
    };


    const filteredBills = bills.filter(bill => {
        const s = searchTerm.toLowerCase();
        return (
            bill.client_name.toLowerCase().includes(s) ||
            (bill as any).client_uhid?.toLowerCase().includes(s) ||
            (bill as any).client_mobile?.includes(s) ||
            bill.id.toLowerCase().includes(s)
        );
    });

    return (
        <DashboardLayout role="admin">
            <div className="p-6 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
                
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="rounded-xl h-12 w-12 shadow-sm border-slate-200"
                            onClick={() => navigate("/sports-scientist/billing")}
                        >
                            <CreditCard className="w-5 h-5 text-primary" />
                        </Button>
                        <div className="space-y-1">
                            <h1 className="text-3xl font-black tracking-tight text-slate-900">Billing & Invoicing</h1>
                            <p className="text-muted-foreground text-sm font-medium">Record payments and manage invoices</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                         <Button 
                            className="h-11 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 gap-2 px-6"
                            onClick={() => setIsSubscriptionModalOpen(true)}
                        >
                            <CreditCard className="w-4 h-4" /> Memberships & Subscriptions
                        </Button>
                    </div>
                </header>

                {roles.includes('admin') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard 
                            title="Total Revenue" 
                            value={`₹${(stats?.total_revenue || 0).toLocaleString()}`} 
                            description="Cumulative collections" 
                            icon={Banknote} 
                        />
                        <KPICard 
                            title="Monthly Recurring" 
                            value={`₹${(stats?.mrr || 0).toLocaleString()}`} 
                            description="Active subscriptions" 
                            icon={TrendingUp} 
                            color="text-emerald-500"
                        />
                        <KPICard 
                            title="Active Members" 
                            value={stats?.active_members || 0} 
                            description="Athlete subscriptions" 
                            icon={Users} 
                        />
                        <KPICard 
                            title="Outstanding" 
                            value={`₹${(stats?.outstanding || 0).toLocaleString()}`} 
                            description="Pending invoices" 
                            icon={AlertCircle} 
                            color="text-amber-500"
                        />
                    </div>
                )}

                <div className="flex flex-col gap-8">
                    <div>
                        <Card className="gradient-card border-border">
                            <CardHeader>
                                <CardTitle>Create New Bill</CardTitle>
                                <CardDescription>Select client and packages to generate an invoice</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateBill} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="client">Select Client <span className="text-destructive">*</span></Label>
                                                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={openCombobox}
                                                            className="w-full justify-between font-normal"
                                                        >
                                                            {selectedClient
                                                                ? clients.find((c) => c.id === selectedClient)?.first_name + " " + clients.find((c) => c.id === selectedClient)?.last_name
                                                                : "Search for a client..."}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-0">
                                                        <Command>
                                                            <CommandInput placeholder="Search client by name, UHID, or mobile..." />
                                                            <CommandEmpty>No client found.</CommandEmpty>
                                                            <CommandList>
                                                                <CommandGroup>
                                                                    {clients.map((c) => (
                                                                        <CommandItem
                                                                            key={c.id}
                                                                            value={`${c.first_name} ${c.last_name} ${c.uhid} ${c.mobile_no || ""}`}
                                                                            onSelect={() => {
                                                                                setSelectedClient(c.id);
                                                                                setOpenCombobox(false);
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    selectedClient === c.id ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                                <div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        {c.first_name} {c.last_name}
                                                                                        <VIPBadge isVIP={c.is_vip} iconOnly size="sm" />
                                                                                    </div>
                                                                                    <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                                                                                        <span>{c.uhid}</span>
                                                                                        {c.mobile_no && (
                                                                                            <>
                                                                                                <span>•</span>
                                                                                                <span>{c.mobile_no}</span>
                                                                                            </>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Referral Source / Reference Person</Label>
                                                <Popover open={openReferralCombobox} onOpenChange={setOpenReferralCombobox}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            aria-expanded={openReferralCombobox}
                                                            className="w-full justify-between font-normal"
                                                        >
                                                            {selectedReferralName || "Select or type source..."}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[300px] p-0">
                                                        <Command>
                                                            <CommandInput 
                                                                placeholder="Search or add source..." 
                                                                value={referralSearch}
                                                                onValueChange={setReferralSearch}
                                                            />
                                                            <CommandList>
                                                                <CommandEmpty>
                                                                    <div 
                                                                        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted text-primary text-sm"
                                                                        onClick={() => {
                                                                            setSelectedReferral("");
                                                                            setSelectedReferralName(referralSearch);
                                                                            setOpenReferralCombobox(false);
                                                                        }}
                                                                    >
                                                                        <UserPlus className="w-4 h-4" />
                                                                        <span>Add "{referralSearch}"</span>
                                                                    </div>
                                                                </CommandEmpty>
                                                                <CommandGroup>
                                                                    {referralSources.map((r) => (
                                                                        <CommandItem
                                                                            key={r.id}
                                                                            value={r.name}
                                                                            onSelect={() => {
                                                                                setSelectedReferral(r.id);
                                                                                setSelectedReferralName(r.name);
                                                                                setOpenReferralCombobox(false);
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    "mr-2 h-4 w-4",
                                                                                    selectedReferral === r.id ? "opacity-100" : "opacity-0"
                                                                                )}
                                                                            />
                                                                            {r.name}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor="remarks">Remarks (if any)</Label>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox 
                                                            id="show-in-pdf" 
                                                            checked={includeNotesInInvoice}
                                                            onCheckedChange={(checked) => setIncludeNotesInInvoice(checked as boolean)}
                                                        />
                                                        <Label htmlFor="show-in-pdf" className="text-[10px] text-muted-foreground flex items-center gap-1 cursor-pointer">
                                                            {includeNotesInInvoice ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                                            Show in PDF
                                                        </Label>
                                                    </div>
                                                </div>
                                                <Textarea 
                                                    id="remarks" 
                                                    placeholder="Add any specific notes for this bill..." 
                                                    className="resize-none h-20"
                                                    value={remarks}
                                                    onChange={e => setRemarks(e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">Category</Label>
                                                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                                            <SelectTrigger className="w-full h-9 text-xs">
                                                                <SelectValue placeholder="All Categories" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="all">All Categories</SelectItem>
                                                                {Array.from(new Set(packages.map(p => p.category || "Others").filter(Boolean))).map(cat => (
                                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">Packages / Services <span className="text-destructive">*</span></Label>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <Button variant="outline" className="w-full h-9 justify-start text-muted-foreground font-normal text-xs overflow-hidden">
                                                                    <ShoppingCart className="w-3.5 h-3.5 mr-2" />
                                                                    Search Packages...
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="p-0 w-[300px]" align="start">
                                                                <Command>
                                                                    <CommandInput placeholder="Type package name..." />
                                                                    <CommandList className="max-h-[300px] overflow-y-auto">
                                                                        <CommandEmpty>No packages found.</CommandEmpty>
                                                                        {(() => {
                                                                            const filteredPkgs = selectedCategory === "all"
                                                                                ? packages
                                                                                : packages.filter(p => (p.category || "Others") === selectedCategory);
                                                                            return (
                                                                                <CommandGroup heading={`Available Packages (${filteredPkgs.length})`}>
                                                                                    {filteredPkgs.map(p => (
                                                                                        <CommandItem key={p.id} value={p.name} onSelect={() => addToCart(p.id)}>
                                                                                            <div className="flex justify-between w-full items-center text-xs">
                                                                                                <span>{p.name}</span>
                                                                                                <span className="font-bold">Rs. {p.price}</span>
                                                                                            </div>
                                                                                        </CommandItem>
                                                                                    ))}
                                                                                </CommandGroup>
                                                                            );
                                                                        })()}
                                                                    </CommandList>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                </div>

                                                {cart.length > 0 && (
                                                    <div className="bg-muted/30 border rounded-md p-2 space-y-2 mt-2">
                                                        {cart.map(item => (
                                                            <div key={item.id} className="flex flex-col gap-2 p-2 bg-background rounded border">
                                                                <div className="flex justify-between items-center text-xs">
                                                                    <span className="font-semibold truncate pr-2">{item.name}</span>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => removeFromCart(item.id)}>
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                                <div className="flex items-center justify-between gap-4 mt-1">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Base Price</span>
                                                                        <span className="text-xs font-semibold">Rs. {item.price}</span>
                                                                    </div>
                                                                    <div className="flex flex-col w-[72px]">
                                                                        <span className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Quantity</span>
                                                                        <Input
                                                                            type="number"
                                                                            min={1}
                                                                            value={item.quantity || 1}
                                                                            onChange={e => updateCartQuantity(item.id, parseInt(e.target.value) || 1)}
                                                                            className="h-7 text-xs w-full"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col w-[100px]">
                                                                        <span className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Set Tax Amount</span>
                                                                        <Input 
                                                                            type="number" 
                                                                            value={item.tax_amount} 
                                                                            readOnly 
                                                                            disabled
                                                                            className="h-7 text-xs bg-muted cursor-not-allowed w-full"
                                                                        />
                                                                    </div>
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="text-[10px] text-muted-foreground uppercase font-medium">Total</span>
                                                                        <span className="text-xs font-bold text-primary">Rs. {(item.price * (item.quantity || 1)) + (item.tax_amount * (item.quantity || 1))}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2"><User className="w-3.5 h-3.5" /> Billing Staff</Label>
                                                    <Input 
                                                        value={profile ? `${profile.first_name} ${profile.last_name}` : ""} 
                                                        readOnly 
                                                        className="bg-muted/50 cursor-not-allowed h-9 text-xs"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="flex items-center gap-2">
                                                        <ShieldCheck className="w-3.5 h-3.5" /> 
                                                        Authorized By
                                                        {Number(discountValue) > 0 && <span className="text-destructive">*</span>}
                                                    </Label>
                                                    <Input 
                                                        placeholder={Number(discountValue) > 0 ? "Required" : "Approver's Name"} 
                                                        className={cn("h-9 text-xs", Number(discountValue) > 0 && !discountAuthorizedBy && "border-destructive/50")}
                                                        value={discountAuthorizedBy}
                                                        onChange={e => setDiscountAuthorizedBy(e.target.value)}
                                                        disabled={Number(discountValue) === 0}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="bg-muted/20 border rounded-lg p-4 space-y-4">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Subtotal</span>
                                                    <span className="font-bold text-foreground">Rs. {subtotal.toFixed(2)}</span>
                                                </div>
                                                
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Tax Amount</span>
                                                    <span className="font-bold text-foreground">Rs. {overallTaxAmount.toFixed(2)}</span>
                                                </div>
                                                
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Apply Discount</Label>
                                                    <div className="flex gap-2">
                                                        <Select value={discountType} onValueChange={(v) => setDiscountType(v as any)}>
                                                            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="flat">Rs</SelectItem>
                                                                <SelectItem value="percentage">%</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <Input 
                                                            type="number" 
                                                            className="h-8 text-xs" 
                                                            value={discountValue} 
                                                            onChange={e => setDiscountValue(e.target.value)}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t flex justify-between items-end">
                                                    <span className="text-sm font-bold">Total Amount</span>
                                                    <span className="text-2xl font-black text-primary">Rs. {totalPayable.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <Button type="submit" className="w-full h-12 text-lg shadow-lg" disabled={cart.length === 0}>
                                                Generate Bill
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    <div>
                        <Card className="gradient-card border-border h-full">
                            <CardHeader className="pb-0">
                                <Tabs defaultValue="invoices">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                                        <div className="flex-1">
                                            <CardTitle>Billing Ledger</CardTitle>
                                            <CardDescription className="mt-1">Invoices, payments and refunds</CardDescription>
                                        </div>
                                    </div>
                                    <TabsList className="mb-0 grid w-full max-w-lg grid-cols-4">
                                        <TabsTrigger value="invoices" className="flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5" /> Invoices
                                        </TabsTrigger>
                                        <TabsTrigger value="payments_due" className="flex items-center gap-2">
                                            <Banknote className="w-3.5 h-3.5" /> Due
                                        </TabsTrigger>
                                        <TabsTrigger value="memberships" className="flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5" /> Memberships
                                        </TabsTrigger>
                                        <TabsTrigger value="all_transactions" className="flex items-center gap-2">
                                            <ArrowLeftRight className="w-3.5 h-3.5" /> Ledger
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* ── MEMBERSHIPS TAB ── */}
                                    <TabsContent value="memberships" className="mt-0">
                                        <CardContent className="px-0 pt-4">
                                            <div className="flex justify-end gap-3 mb-3">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="outline" className={cn(
                                                            "h-9 gap-2 rounded-xl border-slate-200 font-bold text-xs",
                                                            statusFilter !== "All" && "bg-primary/5 border-primary/20 text-primary"
                                                        )}>
                                                            <Filter className="w-3.5 h-3.5" />
                                                            {statusFilter === "All" ? "Filter Status" : statusFilter}
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2">
                                                        <DropdownMenuItem onClick={() => setStatusFilter("All")} className="rounded-xl font-medium">All Memberships</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setStatusFilter("Active")} className="rounded-xl font-medium text-emerald-600">Active Only</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setStatusFilter("Overdue")} className="rounded-xl font-medium text-rose-600">Overdue Only</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setStatusFilter("Cancelled")} className="rounded-xl font-medium text-slate-500">Cancelled Only</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                            <div className="rounded-md border overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/50">
                                                            <TableHead>Athlete</TableHead>
                                                            <TableHead>Plan</TableHead>
                                                            <TableHead>Cycle</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead className="text-right">Next Billing</TableHead>
                                                            <TableHead className="text-right pr-4">Amount</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(!subscriptions || subscriptions.filter((s: any) => statusFilter === "All" || s.status === statusFilter).length === 0) ? (
                                                            <TableRow>
                                                                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground italic">No memberships found matching the filter.</TableCell>
                                                            </TableRow>
                                                        ) : subscriptions.filter((s: any) => statusFilter === "All" || s.status === statusFilter).map((sub: any) => (
                                                            <TableRow 
                                                                key={sub.id} 
                                                                className="hover:bg-muted/10 transition-colors cursor-pointer"
                                                                onClick={() => { setSelectedSub(sub); setIsSubDrawerOpen(true); }}
                                                            >
                                                                <TableCell>
                                                                    <div className="font-bold text-xs">
                                                                        {sub.client?.first_name} {sub.client?.last_name}
                                                                    </div>
                                                                    <div className="text-[10px] text-muted-foreground">{sub.client?.uhid}</div>
                                                                </TableCell>
                                                                <TableCell className="text-[10px] font-bold text-primary uppercase">{sub.package?.name}</TableCell>
                                                                <TableCell className="text-[10px]">{sub.billing_cycle}</TableCell>
                                                                <TableCell>
                                                                    <span className={cn(
                                                                        "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                                                        sub.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                                                                    )}>
                                                                        {sub.status}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-right text-[10px]">
                                                                    {sub.next_billing_date ? format(new Date(sub.next_billing_date), "dd MMM yyyy") : '-'}
                                                                </TableCell>
                                                                <TableCell className="text-right pr-4 font-black text-xs">
                                                                    ₹{sub.amount || sub.package?.price}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </TabsContent>

                                    {/* ── INVOICES TAB ── */}
                                    <TabsContent value="invoices" className="mt-0">
                                        <CardContent className="px-0 pt-4">
                                            <div className="flex justify-end mb-3">
                                                <Input
                                                    placeholder="Search by name, UHID, or mobile..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="h-9 bg-background shadow-sm max-w-sm"
                                                />
                                            </div>
                                            <div className="rounded-md border overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/50">
                                                            <TableHead>Package</TableHead>
                                                            <TableHead>Client</TableHead>
                                                            <TableHead>Source</TableHead>
                                                            <TableHead>Staff</TableHead>
                                                            <TableHead>Status</TableHead>
                                                            <TableHead className="text-right pr-4">Amount</TableHead>
                                                            <TableHead className="text-center">Action</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredBills.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">No invoices found.</TableCell>
                                                            </TableRow>
                                                        ) : filteredBills.map((bill) => (
                                                            <TableRow key={bill.id} className="hover:bg-muted/10 transition-colors cursor-pointer" onClick={() => openTransactionDetail(ledgerEntries.find(t => t.id === bill.id && t.type === 'invoice')!)}>
                                                                <TableCell className="text-[10px] font-bold text-primary uppercase truncate max-w-[180px]" title={bill.items?.map((i: any) => i.name).join(', ')}>{bill.items?.map((i: any) => i.name).join(', ') || '-'}</TableCell>
                                                                <TableCell>
                                                                    <div className="font-medium text-xs truncate max-w-[150px]">
                                                                        <VIPName name={bill.client_name} isVIP={(bill as any).client_is_vip} />
                                                                    </div>
                                                                    {bill.notes && (
                                                                        <div className="text-[9px] text-muted-foreground italic truncate max-w-[120px]" title={bill.notes}>
                                                                            "{bill.notes}"
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-[10px] text-muted-foreground">{bill.referral_source_name || "-"}</TableCell>
                                                                <TableCell className="text-[10px] text-muted-foreground">{bill.billing_staff_name || "-"}</TableCell>
                                                                <TableCell>
                                                                    {refundedBillMap[bill.id] ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold border border-rose-500/20">
                                                                            <ArrowLeftRight className="w-2.5 h-2.5" /> REFUNDED
                                                                        </span>
                                                                    ) : bill.status === "Paid" ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                                                                            <CheckCircle className="w-3 h-3" /> PAID
                                                                        </span>
                                                                    ) : bill.status === "Partially Paid" ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-bold">
                                                                            PARTIAL
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                                                                            PENDING
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right pr-4 font-bold text-xs whitespace-nowrap">
                                                                    <div className="flex flex-col items-end">
                                                                        <span>Rs. {bill.total_amount.toFixed(2)}</span>
                                                                        {bill.paid_amount! > 0 && bill.status !== 'Paid' && (
                                                                            <span className="text-[10px] text-muted-foreground font-normal">Remaining: Rs. {bill.remaining_due?.toFixed(2)}</span>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        {(bill.status === "Pending" || bill.status === "Partially Paid") && (
                                                                            <Button
                                                                                size="sm"
                                                                                className="h-7 px-2 text-[10px] bg-primary hover:bg-primary/90"
                                                                                onClick={() => { setPaymentBillId(bill.id); setIsPaymentModalOpen(true); }}
                                                                            >
                                                                                Collect
                                                                            </Button>
                                                                        )}
                                                                        {bill.status === "Paid" && !refundedBillMap[bill.id] && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-7 px-2 text-[10px] text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                                                onClick={() => {
                                                                                    setRefundBillObj(bill);
                                                                                    setIsRefundModalOpen(true);
                                                                                }}
                                                                            >
                                                                                <Receipt className="w-3 h-3 mr-1" /> Refund
                                                                            </Button>
                                                                        )}
                                                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadInvoice(bill)}>
                                                                            <Download className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </TabsContent>
                                    
                                    {/* ── PAYMENTS DUE TAB ── */}
                                    <TabsContent value="payments_due" className="mt-0">
                                        <CardContent className="px-0 pt-4">
                                            <div className="flex flex-col gap-4 mb-4">
                                                <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600">
                                                            <Banknote className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-bold text-amber-800 uppercase tracking-widest">Total Outstanding</p>
                                                            <p className="text-xl font-black text-amber-600">
                                                                Rs. {filteredBills.filter(b => b.status !== 'Paid' && !refundedBillMap[b.id]).reduce((acc, b) => acc + (b.remaining_due || 0), 0).toLocaleString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-md border overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/50">
                                                            <TableHead>Client</TableHead>
                                                            <TableHead>Package</TableHead>
                                                            <TableHead>Created</TableHead>
                                                            <TableHead className="text-right">Balance</TableHead>
                                                            <TableHead className="text-center">Action</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredBills.filter(b => (b.status === "Pending" || b.status === "Partially Paid") && !refundedBillMap[b.id]).length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">No payments currently due.</TableCell>
                                                            </TableRow>
                                                        ) : filteredBills.filter(b => (b.status === "Pending" || b.status === "Partially Paid") && !refundedBillMap[b.id]).map((bill) => (
                                                            <TableRow key={bill.id} className="hover:bg-muted/10 transition-colors">
                                                                <TableCell>
                                                                    <div className="font-bold text-xs truncate max-w-[150px]">
                                                                        <VIPName name={bill.client_name} isVIP={(bill as any).client_is_vip} />
                                                                    </div>
                                                                    <div className="text-[10px] text-muted-foreground">UHID: {bill.client_uhid || '-'}</div>
                                                                </TableCell>
                                                                <TableCell className="text-[10px] font-bold text-primary uppercase truncate max-w-[150px]" title={bill.items?.map((i: any) => i.name).join(', ')}>{bill.items?.map((i: any) => i.name).join(', ') || '-'}</TableCell>
                                                                <TableCell className="text-[10px] text-muted-foreground">
                                                                    {format(new Date(bill.date), "dd MMM yyyy")}
                                                                </TableCell>
                                                                <TableCell className="text-right font-black text-rose-600 text-xs">
                                                                    Rs. {bill.remaining_due?.toFixed(2)}
                                                                    {bill.paid_amount! > 0 && (
                                                                        <div className="text-[9px] text-muted-foreground font-normal">Paid: Rs. {bill.paid_amount?.toFixed(2)}</div>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-7 px-3 text-[10px] font-bold bg-primary hover:bg-primary/90"
                                                                        onClick={() => { 
                                                                            setPaymentBillId(bill.id); 
                                                                            setPaymentRows([{ id: Math.random().toString(), method: "Cash", amount: bill.remaining_due || bill.total_amount, transactionId: "" }]);
                                                                            setIsPaymentModalOpen(true); 
                                                                        }}
                                                                    >
                                                                        Collect Payment
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </TabsContent>

                                    {/* ── ALL TRANSACTIONS TAB ── */}
                                    <TabsContent value="all_transactions" className="mt-0">
                                        <CardContent className="px-0 pt-4">
                                            <div className="flex justify-end mb-3">
                                                <Input
                                                    placeholder="Search by name, UHID, or ID..."
                                                    value={ledgerSearch}
                                                    onChange={(e) => setLedgerSearch(e.target.value)}
                                                    className="h-9 bg-background shadow-sm max-w-sm"
                                                />
                                            </div>
                                            <div className="rounded-md border overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow className="bg-muted/50">
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Type</TableHead>
                                                            <TableHead>Reference #</TableHead>
                                                            <TableHead>Client</TableHead>
                                                            <TableHead>Mode</TableHead>
                                                            <TableHead className="text-right pr-4">Amount</TableHead>
                                                            <TableHead>Entitlements</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {filteredLedger.length === 0 ? (
                                                            <TableRow>
                                                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">No transactions found.</TableCell>
                                                            </TableRow>
                                                        ) : filteredLedger.map((txn) => (
                                                            <TableRow
                                                                key={`${txn.type}-${txn.id}`}
                                                                className="hover:bg-muted/10 transition-colors cursor-pointer"
                                                                onClick={() => openTransactionDetail(txn)}
                                                            >
                                                                <TableCell className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                                    {format(new Date(txn.date), "dd MMM yy, HH:mm")}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {txn.type === 'refund' ? (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold border border-rose-500/20">
                                                                            <ArrowLeftRight className="w-2.5 h-2.5" /> REFUND
                                                                        </span>
                                                                    ) : (
                                                                        <span className={cn(
                                                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                                                            txn.status === 'Paid'
                                                                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                                                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                                        )}>
                                                                            <FileText className="w-2.5 h-2.5" /> {txn.status === 'Paid' ? 'PAID' : 'PENDING'}
                                                                        </span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="font-mono text-[10px]">{txn.id.substring(0, 8).toUpperCase()}</TableCell>
                                                                <TableCell>
                                                                    <div className="font-medium text-xs truncate max-w-[140px]">{txn.client_name}</div>
                                                                    {txn.client_uhid && <div className="text-[9px] text-muted-foreground">{txn.client_uhid}</div>}
                                                                </TableCell>
                                                                <TableCell className="text-[10px] text-muted-foreground">
                                                                    {txn.type === 'refund' ? txn.refund_mode : (txn.payment_method || '—')}
                                                                </TableCell>
                                                                <TableCell className="text-right pr-4">
                                                                    <span className={cn("font-bold text-xs", txn.type === 'refund' ? "text-rose-600" : "text-emerald-600")}>
                                                                        {txn.type === 'refund' ? '−' : '+'} Rs. {txn.amount.toFixed(2)}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {txn.type === 'refund' ? (
                                                                        txn.is_entitlement_reversed
                                                                            ? <span className="text-[10px] text-emerald-600 font-bold">Reversed</span>
                                                                            : <span className="text-[10px] text-amber-600 font-bold">Retained</span>
                                                                    ) : <span className="text-[10px] text-muted-foreground">—</span>}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </TabsContent>
                                </Tabs>
                            </CardHeader>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Refund Modal */}
            {refundBillObj && (
                <RefundModal 
                    isOpen={isRefundModalOpen}
                    onOpenChange={setIsRefundModalOpen}
                    billId={refundBillObj.id}
                    clientId={refundBillObj.client?.id || ""}
                    clientName={refundBillObj.client_name}
                    organizationId={profile?.organization_id || ""}
                    onSuccess={handleRefundSuccess}
                />
            )}

            {/* Transaction Detail Drawer */}
            <TransactionDetailDrawer
                open={isDrawerOpen}
                onOpenChange={setIsDrawerOpen}
                transaction={selectedTransaction}
            />

            {/* Payment Modal (Split Payments) */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent aria-describedby={undefined} className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Collect Payment</DialogTitle>
                        <p className="text-xs text-muted-foreground">
                            Invoice: {bills.find(b => b.id === paymentBillId)?.invoice_number || "..."} | 
                            Total: <span className="font-bold">Rs. {bills.find(b => b.id === paymentBillId)?.total_amount.toFixed(2)}</span> |
                            Already Paid: <span className="font-bold text-emerald-600">Rs. {bills.find(b => b.id === paymentBillId)?.paid_amount?.toFixed(2)}</span> |
                            Balance Due: <span className="font-bold text-primary">Rs. {bills.find(b => b.id === paymentBillId)?.remaining_due?.toFixed(2)}</span>
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
                                Math.abs(paymentRows.reduce((a, b) => a + (Number(b.amount) || 0), 0) - (bills.find(b => b.id === paymentBillId)?.remaining_due || 0)) < 0.01 
                                    ? "text-emerald-600" 
                                    : "text-rose-600"
                            )}>
                                Rs. {paymentRows.reduce((a, b) => a + (Number(b.amount) || 0), 0).toFixed(2)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Balance After</p>
                            <p className="text-sm font-bold">
                                Rs. {((bills.find(b => b.id === paymentBillId)?.remaining_due || 0) - paymentRows.reduce((a, b) => a + (Number(b.amount) || 0), 0)).toFixed(2)}
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
            <SubscriptionModal 
                open={isSubscriptionModalOpen}
                onOpenChange={setIsSubscriptionModalOpen}
                orgId={profile?.organization_id || ""}
                onSuccess={() => {
                    fetchData();
                    queryClient.invalidateQueries({ queryKey: ["admin-bills"] });
                    queryClient.invalidateQueries({ queryKey: ["admin-refunds"] });
                }}
            />
            <SubscriptionDetailDrawer 
                open={isSubDrawerOpen}
                onOpenChange={setIsSubDrawerOpen}
                subscription={selectedSub}
                history={subHistory || []}
                onGenerateEarlyInvoice={() => generateEarlyInvoice.mutate(selectedSub.id)}
                onCancelSubscription={() => cancelSubscription.mutate(selectedSub.id)}
                onCollectPayment={(billId: string) => {
                    setPaymentBillId(billId);
                    setIsPaymentModalOpen(true);
                }}
                isGenerating={generateEarlyInvoice.isPending}
                isCancelling={cancelSubscription.isPending}
            />
        </DashboardLayout>
    );
}



function KPICard({ title, value, description, icon: Icon, color = "text-primary" }: { title: string, value: any, description: string, icon: any, color?: string }) {
    return (
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden group hover:shadow-md transition-all bg-white p-6">
            <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-2xl bg-slate-50 border border-slate-100 group-hover:bg-primary/5 transition-colors")}>
                    <Icon className={cn("w-6 h-6", color)} />
                </div>
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{title}</p>
                <h3 className="text-3xl font-black tabular-nums text-slate-900">{value}</h3>
                <p className="text-[10px] font-bold text-muted-foreground/40 italic">{description}</p>
            </div>
        </Card>
    );
}
