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
import { Plus, Download, CheckCircle, CreditCard, Banknote, Smartphone, Trash2, ShoppingCart, Check, ChevronsUpDown, Receipt, Copy, User, MessageSquare, ShieldCheck, UserPlus, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { RefundModal } from "@/components/admin/RefundModal";
import { generateRefundVoucher } from "@/lib/refundActions";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { VIPBadge, VIPName } from "@/components/ui/VIPBadge";

type CartItem = {
    id: string; // unique cart item id
    package_id: string;
    name: string;
    price: number;
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
    status: "Pending" | "Paid";
    payment_method?: string;
    transaction_id?: string;
    date: string;
    organization?: { name: string; id: string };
    client?: { id: string; full_name: string };
    notes?: string;
    discount_authorized_by?: string;
    billing_staff_name?: string;
    referral_source_name?: string;
    include_notes_in_invoice?: boolean;
};

type Client = { id: string; first_name: string; last_name: string; uhid: string; email?: string; mobile_no?: string; is_vip?: boolean };
type Package = { id: string; name: string; price: number; service_package_items?: { service_type: string; default_sessions: number; }[] };
type ReferralSource = { id: string; name: string };

export default function BillingPage() {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const orgName = "Integration Sports Clinic";

    const [clients, setClients] = useState<Client[]>([]);
    const [bills, setBills] = useState<Bill[]>([]);
    const [referralSources, setReferralSources] = useState<ReferralSource[]>([]);
    const [packages, setPackages] = useState<Package[]>([]);

    // Form States
    const [selectedClient, setSelectedClient] = useState("");
    const [selectedReferral, setSelectedReferral] = useState("");
    const [selectedReferralName, setSelectedReferralName] = useState("");
    const [remarks, setRemarks] = useState("");
    const [includeNotesInInvoice, setIncludeNotesInInvoice] = useState(false);
    const [discountAuthorizedBy, setDiscountAuthorizedBy] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);

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
    const [paymentMethod, setPaymentMethod] = useState("");
    const [transactionId, setTransactionId] = useState("");
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Refund State
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [refundBillObj, setRefundBillObj] = useState<any>(null);

    const [openCombobox, setOpenCombobox] = useState(false);
    const [openReferralCombobox, setOpenReferralCombobox] = useState(false);
    const [referralSearch, setReferralSearch] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (profile?.organization_id) {
            fetchData();
        }
    }, [profile]);

    const fetchData = async () => {
        if (!profile?.organization_id) return;

        // Fetch Clients
        const { data: clientData } = await (supabase as any)
            .from("clients")
            .select("id, first_name, last_name, uhid, email, mobile_no, is_vip")
            .eq("organization_id", profile.organization_id);
        if (clientData) setClients(clientData as Client[]);

        // Fetch Live Packages
        const { data: pkgData } = await supabase
            .from("packages")
            .select("id, name, price, package_services(service_id)")
            .eq("organization_id", profile.organization_id)
            .order("created_at", { ascending: false });

        if (pkgData) {
            setPackages(pkgData as any[]);
        }

        // Fetch Referral Sources
        const { data: refData } = await supabase
            .from("referral_sources")
            .select("id, name")
            .eq("organization_id", profile.organization_id);
        if (refData) setReferralSources(refData as ReferralSource[]);

        // Fetch Bills
        const { data: billsData } = await (supabase as any)
            .from("bills")
            .select(`
                id, 
                amount, 
                total, 
                status, 
                created_at, 
                client_id, 
                transaction_id,
                payment_method,
                organization_id,
                organizations(id, name),
                clients(id, first_name, last_name, uhid, email, mobile_no, is_vip), 
                packages(id, name, price, package_services(sessions_included, services(name))),
                referral_sources(id, name),
                discount_authorized_by,
                billing_staff_name,
                notes,
                include_notes_in_invoice
            `)
            .eq("organization_id", profile.organization_id)
            .order("created_at", { ascending: false });

        if (billsData) {
            const formattedBills = billsData.map(b => {
                const pkg = b.packages as any;
                let entitlements: any[] = [];
                if (pkg && pkg.package_services) {
                    entitlements = pkg.package_services.map((ps: any) => ({
                        service_type: ps.services?.name || 'Session',
                        default_sessions: ps.sessions_included
                    }));
                }

                const clientObj = b.clients as any;
                const clientName = clientObj ? `${clientObj.first_name} ${clientObj.last_name}` : "Unknown";

                return {
                    id: b.id,
                    client_id: b.client_id,
                    client: { id: b.client_id, full_name: clientName, is_vip: clientObj?.is_vip },
                    organization: b.organizations,
                    client_name: clientName,
                    client_is_vip: clientObj?.is_vip,
                    client_uhid: clientObj?.uhid || "",
                    client_mobile: clientObj?.mobile_no || "",
                    items: [{ 
                        name: pkg ? pkg.name : "Custom", 
                        price: b.total,
                        entitlements
                    }],
                    referral_source: (b as any).referral_sources?.name || "-",
                    referral_source_name: (b as any).referral_sources?.name || "-",
                    subtotal: b.amount,
                    discount_type: "flat",
                    discount_value: b.discount || 0,
                    total_amount: b.total,
                    status: b.status === "Paid" ? "Paid" : "Pending",
                    transaction_id: b.transaction_id,
                    date: b.created_at,
                    notes: b.notes,
                    discount_authorized_by: b.discount_authorized_by,
                    billing_staff_name: b.billing_staff_name,
                    include_notes_in_invoice: (b as any).include_notes_in_invoice
                };
            }) as any[];
            setBills(formattedBills);
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
        const newPkg = { id: Date.now().toString(), name: newPkgName, price: Number(newPkgPrice) };
        setPackages([...packages, newPkg]);
        setCart([...cart, { id: Date.now().toString(), package_id: newPkg.id, name: newPkg.name, price: newPkg.price }]);
        setNewPkgName("");
        setNewPkgPrice("");
        setIsPkgModalOpen(false);
        toast({ title: "Package Added to Cart" });
    };

    const handleRefundSuccess = (refund: any) => {
        fetchData();
        queryClient.invalidateQueries({ queryKey: ['client-refunds'] });
        queryClient.invalidateQueries({ queryKey: ['billing-stats'] });
        
        if (refundBillObj) {
            generateRefundVoucher(
                (refundBillObj.organization as any)?.name || orgName, 
                refundBillObj.client_name, 
                refund
            );
        }
    };

    const addToCart = (pkgId: string) => {
        const pkg = packages.find(p => p.id === pkgId);
        if (pkg) {
            setCart([...cart, {
                id: Date.now().toString() + Math.random(),
                package_id: pkg.id,
                name: pkg.name,
                price: pkg.price,
                items: pkg.service_package_items
            }]);
        }
    };

    const removeFromCart = (cartItemId: string) => {
        setCart(cart.filter(item => item.id !== cartItemId));
    };

    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);

    const calculatedDiscountAmount = () => {
        const dVal = Number(discountValue) || 0;
        if (discountType === "percentage") {
            return (subtotal * dVal) / 100;
        }
        return dVal;
    };

    const totalPayable = Math.max(0, subtotal - calculatedDiscountAmount());

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

        const billingStaffName = profile ? `${profile.first_name} ${profile.last_name}` : "System";

        try {
            let referralId = selectedReferral;

            // If we have a custom referral name but no ID, create it
            if (!referralId && selectedReferralName) {
                // Check if it already exists (case insensitive)
                const existing = referralSources.find(r => r.name.toLowerCase() === selectedReferralName.toLowerCase());
                if (existing) {
                    referralId = existing.id;
                } else {
                    const { data, error: refError } = await supabase
                        .from('referral_sources')
                        .insert({
                            name: selectedReferralName,
                            organization_id: profile?.organization_id
                        })
                        .select()
                        .single();
                    
                    if (refError) throw refError;
                    referralId = data.id;
                }
            }

            for (const item of cart) {
                const itemRatio = item.price / subtotal;
                const itemDiscount = discountType === "percentage" 
                    ? (item.price * (Number(discountValue) || 0) / 100) 
                    : ((Number(discountValue) || 0) * itemRatio);
                const itemTotal = Math.max(0, item.price - itemDiscount);

                const { error } = await supabase.from('bills').insert({
                    organization_id: profile?.organization_id,
                    client_id: selectedClient,
                    package_id: item.package_id,
                    amount: item.price,
                    discount: itemDiscount,
                    total: itemTotal,
                    status: 'Pending',
                    referral_source_id: referralId || null,
                    notes: remarks,
                    include_notes_in_invoice: includeNotesInInvoice,
                    discount_authorized_by: (Number(discountValue) > 0) ? discountAuthorizedBy : null,
                    billing_staff_name: billingStaffName
                });

                if (error) throw error;
            }

            toast({ title: "Bill Created Successfully" });
            window.location.reload();
        } catch (err: any) {
            toast({ title: "Error creating bill", description: err.message, variant: "destructive" });
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
                    transaction_id: transactionId,
                    payment_method: paymentMethod
                })
                .eq('id', paymentBillId);
                
            if (error) throw error;
            
            fetchData();
            setIsPaymentModalOpen(false);
            setPaymentMethod("");
            setTransactionId("");
            setPaymentBillId("");
            toast({ title: "Payment Recorded!" });
        } catch (err: any) {
            toast({ title: "Failed to record payment", description: err.message, variant: "destructive" });
        }
    };

    const handleDownloadInvoice = (bill: Bill) => {
        const d = new jsPDF();
        const c = clients.find(x => x.id === bill.client_id);
        
        // Load Logo
        const logoUrl = "/logo.png";
        
        const addHeader = (doc: jsPDF) => {
            try {
                // Header Logo - Adjusted to aspect ratio 2.45:1 (60mm x 24.5mm)
                doc.addImage(logoUrl, 'PNG', 14, 10, 60, 24.5);
            } catch (e) {
                // Fallback if logo fails
                doc.setFontSize(22);
                doc.setTextColor(15, 23, 42); 
                doc.text(orgName, 14, 25);
            }

            doc.setFontSize(14);
            doc.setTextColor(100, 116, 139); 
            doc.text("INVOICE", 170, 25);

            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            doc.text(`Invoice # : ${bill.id.substring(0, 8)}`, 14, 45);
            doc.text(`Date : ${format(new Date(bill.date), "dd MMM yyyy, hh:mm a")}`, 14, 51);
            if (bill.billing_staff_name) doc.text(`Billed By: ${bill.billing_staff_name}`, 14, 57);
        };

        addHeader(d);

        d.setFontSize(11);
        d.setTextColor(15, 23, 42);
        d.text("Bill To:", 14, 75);

        d.setFontSize(10);
        d.setTextColor(71, 85, 105);
        d.text(bill.client_name, 14, 82);
        if (c?.uhid) d.text(`UHID : ${c.uhid}`, 14, 88);
        if (c?.mobile_no) d.text(`Mobile : ${c.mobile_no}`, 14, 94);
        
        if (bill.referral_source_name && bill.referral_source_name !== "-") {
            d.text(`Referral: ${bill.referral_source_name}`, 14, 100);
        }

        const tableData = bill.items.map((item, index) => {
            let description = item.name;
            if (item.entitlements && item.entitlements.length > 0) {
                const entitlementList = item.entitlements
                    .map(e => `  • ${e.service_type}: ${e.default_sessions} sessions`)
                    .join('\n');
                description += `\n${entitlementList}`;
            }
            return [
                (index + 1).toString(),
                description,
                `Rs. ${item.price.toFixed(2)}`
            ];
        });

        autoTable(d, {
            startY: 110,
            head: [["#", "Description", "Amount"]],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [15, 118, 110] }, 
            styles: { fontSize: 10, cellPadding: 5, overflow: 'linebreak' },
            columnStyles: {
                1: { cellWidth: 120 }
            }
        });

        const finalY = (d as any).lastAutoTable.finalY + 10;
        d.setFontSize(10);
        d.setTextColor(15, 23, 42);
        
        if (Number(bill.discount_value) > 0) {
            d.text(`Discount: Rs. ${bill.discount_value.toFixed(2)}`, 14, finalY);
            if (bill.discount_authorized_by) {
                d.text(`Auth By: ${bill.discount_authorized_by}`, 14, finalY + 6);
            }
        }
        
        d.setFontSize(12);
        d.text(`Total Amount: Rs. ${bill.total_amount.toFixed(2)}`, 140, finalY);

        if (bill.notes && bill.include_notes_in_invoice) {
            d.setFontSize(9);
            d.setTextColor(100, 116, 139);
            d.text(`Remarks:`, 14, finalY + 15);
            const splitRemarks = d.splitTextToSize(bill.notes, 180);
            d.text(splitRemarks, 14, finalY + 20);
        }

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
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Billing & Invoicing</h1>
                        <p className="text-muted-foreground mt-1">Generate invoices and record payments for packages</p>
                    </div>
                </div>

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
                                                            <CommandInput placeholder="Search client by name or UHID..." />
                                                            <CommandEmpty>No client found.</CommandEmpty>
                                                            <CommandList>
                                                                <CommandGroup>
                                                                    {clients.map((c) => (
                                                                        <CommandItem
                                                                            key={c.id}
                                                                            value={`${c.first_name} ${c.last_name} ${c.uhid}`}
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
                                                                                    <div className="text-[10px] text-muted-foreground">{c.uhid}</div>
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

                                            <div className="space-y-2">
                                                <Label>Packages / Services <span className="text-destructive">*</span></Label>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="w-full justify-start text-muted-foreground font-normal overflow-hidden">
                                                            <ShoppingCart className="w-4 h-4 mr-2" />
                                                            Search Packages...
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="p-0 w-[300px]" align="start">
                                                        <Command>
                                                            <CommandInput placeholder="Type package name..." />
                                                            <CommandList>
                                                                <CommandEmpty>No packages found.</CommandEmpty>
                                                                <CommandGroup>
                                                                    {packages.map(p => (
                                                                        <CommandItem key={p.id} onSelect={() => addToCart(p.id)}>
                                                                            <div className="flex justify-between w-full items-center">
                                                                                <span>{p.name}</span>
                                                                                <span className="font-bold text-xs">Rs. {p.price}</span>
                                                                            </div>
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>

                                                {cart.length > 0 && (
                                                    <div className="bg-muted/30 border rounded-md p-2 space-y-1 mt-2">
                                                        {cart.map(item => (
                                                            <div key={item.id} className="flex justify-between items-center text-sm p-1.5 bg-background rounded border">
                                                                <span className="truncate pr-2">{item.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-xs">Rs.{item.price}</span>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.id)}>
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
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
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                                <div className="space-y-1">
                                    <CardTitle>Recent Invoices</CardTitle>
                                    <CardDescription>Tracking your clinical revenue</CardDescription>
                                </div>
                                <div className="w-full max-w-sm">
                                    <Input 
                                        placeholder="Search by name, UHID, or mobile..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="h-9 bg-background shadow-sm"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead>Invoice #</TableHead>
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
                                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground italic">No invoices found matching your search.</TableCell>
                                                </TableRow>
                                            ) : filteredBills.map((bill) => (
                                                <TableRow key={bill.id} className="hover:bg-muted/10 transition-colors">
                                                    <TableCell className="font-mono text-[10px]">{bill.id.substring(0, 8)}</TableCell>
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
                                                        {bill.status === "Paid" ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                                                                <CheckCircle className="w-3 h-3" /> PAID
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                                                                PENDING
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right pr-4 font-bold text-xs">Rs. {bill.total_amount.toFixed(2)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            {bill.status === "Pending" && (
                                                                <Button 
                                                                    size="sm" 
                                                                    className="h-7 px-2 text-[10px] bg-primary hover:bg-primary/90" 
                                                                    onClick={() => { setPaymentBillId(bill.id); setIsPaymentModalOpen(true); }}
                                                                >
                                                                    Collect
                                                                </Button>
                                                            )}
                                                            {bill.status === "Paid" && (
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

            {/* Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <Label>Payment Mode</Label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'Cash', icon: Banknote },
                                { id: 'UPI', icon: Smartphone },
                                { id: 'Card', icon: CreditCard }
                            ].map(m => (
                                <Button 
                                    key={m.id} 
                                    variant={paymentMethod === m.id ? "default" : "outline"}
                                    onClick={() => setPaymentMethod(m.id)}
                                    className="h-16 flex flex-col gap-1"
                                >
                                    <m.icon className="w-5 h-5" />
                                    <span className="text-[10px]">{m.id}</span>
                                </Button>
                            ))}
                        </div>
                        {(paymentMethod === "UPI" || paymentMethod === "Card") && (
                            <div className="space-y-1.5 pt-2 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-xs">Transaction ID <span className="text-destructive">*</span></Label>
                                <Input 
                                    placeholder="Reference ID" 
                                    className="h-9"
                                    value={transactionId}
                                    onChange={e => setTransactionId(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button className="w-full" onClick={markAsPaid} disabled={!paymentMethod || ((paymentMethod === "UPI" || paymentMethod === "Card") && !transactionId.trim())}>
                            Confirm Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
