import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Download, CheckCircle, CreditCard, Banknote, Smartphone, Trash2, ShoppingCart, Check, ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

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
    date: string;
};

type Client = { id: string; first_name: string; last_name: string; uhid: string; email?: string; mobile_no?: string };
type Package = { id: string; name: string; price: number; service_package_items?: { service_type: string; default_sessions: number; }[] };

export default function BillingPage() {
    const { profile } = useAuth();
    const orgName = "Integration Sports Clinic";

    const [clients, setClients] = useState<Client[]>([]);
    const [bills, setBills] = useState<Bill[]>([]);
    const [referralSources, setReferralSources] = useState(["Walk-in", "Dr. Smith", "Facebook Ad", "Instagram"]);
    const [packages, setPackages] = useState<Package[]>([]);

    // Form States
    const [selectedClient, setSelectedClient] = useState("");
    const [selectedReferral, setSelectedReferral] = useState("");
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
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    const [openCombobox, setOpenCombobox] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!profile?.organization_id) return;

            // Fetch Clients
            const { data: clientData } = await supabase
                .from("clients")
                .select("id, first_name, last_name, uhid, email, mobile_no")
                .eq("organization_id", profile.organization_id);
            if (clientData) setClients(clientData as Client[]);

            // Fetch Live Packages
            const { data: pkgData } = await supabase
                .from("service_packages")
                .select("id, name, price, service_package_items(service_type, default_sessions)")
                .eq("organization_id", profile.organization_id)
                .order("created_at", { ascending: false });

            if (pkgData) {
                // Map numeric types if needed, though they come back as numbers
                setPackages(pkgData as Package[]);
            }
        }
        fetchData();
    }, [profile]);

    const handleAddReferral = () => {
        if (!newReferralName.trim()) return;
        setReferralSources([...referralSources, newReferralName]);
        setSelectedReferral(newReferralName);
        setNewReferralName("");
        setIsReferralModalOpen(false);
        toast({ title: "Referral Source Added" });
    };

    const handleAddPackage = () => {
        if (!newPkgName.trim() || !newPkgPrice) return;
        const newPkg = { id: Date.now().toString(), name: newPkgName, price: Number(newPkgPrice) };
        setPackages([...packages, newPkg]);

        // Optionally auto-add to cart
        setCart([...cart, { id: Date.now().toString(), package_id: newPkg.id, name: newPkg.name, price: newPkg.price }]);

        setNewPkgName("");
        setNewPkgPrice("");
        setIsPkgModalOpen(false);
        toast({ title: "Package Added to Cart" });
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

    const handleCreateBill = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) {
            toast({ title: "Please select a client", variant: "destructive" });
            return;
        }
        if (cart.length === 0) {
            toast({ title: "Please add at least one package to the cart", variant: "destructive" });
            return;
        }

        const client = clients.find(c => c.id === selectedClient);

        const newBill: Bill = {
            id: `INV-${Math.floor(Math.random() * 10000)}`,
            client_id: selectedClient,
            client_name: client ? `${client.first_name} ${client.last_name}` : "Unknown",
            items: cart.map(item => ({ name: item.name, price: item.price, entitlements: item.items })),
            referral_source: selectedReferral || "None",
            subtotal,
            discount_type: discountType,
            discount_value: Number(discountValue) || 0,
            total_amount: totalPayable,
            status: "Pending",
            date: new Date().toISOString(),
        };

        setBills([newBill, ...bills]);
        toast({ title: "Bill Created Successfully" });

        // Reset form
        setSelectedClient("");
        setSelectedReferral("");
        setCart([]);
        setDiscountValue("0");
        setDiscountType("flat");
    };

    const markAsPaid = () => {
        if (!paymentMethod) {
            toast({ title: "Select a payment method", variant: "destructive" });
            return;
        }
        setBills(bills.map(b => b.id === paymentBillId ? { ...b, status: "Paid", payment_method: paymentMethod } : b));
        setIsPaymentModalOpen(false);
        setPaymentMethod("");
        setPaymentBillId("");
        toast({ title: "Payment Recorded!" });
    };

    const downloadInvoice = (bill: Bill) => {
        const d = new jsPDF();
        const c = clients.find(x => x.id === bill.client_id);

        // Header
        d.setFontSize(22);
        d.setTextColor(15, 23, 42); // slate-900
        d.text(orgName, 14, 25);

        d.setFontSize(14);
        d.setTextColor(100, 116, 139); // slate-500
        d.text("INVOICE", 170, 25);

        // Invoice Details
        d.setFontSize(10);
        d.setTextColor(71, 85, 105);
        d.text(`Invoice # : ${bill.id}`, 14, 38);
        d.text(`Date : ${format(new Date(bill.date), "dd MMM yyyy, hh:mm a")}`, 14, 44);

        // Bill To
        d.setFontSize(11);
        d.setTextColor(15, 23, 42);
        d.text("Bill To:", 14, 58);

        d.setFontSize(10);
        d.setTextColor(71, 85, 105);
        d.text(bill.client_name, 14, 65);
        if (c?.uhid) d.text(`UHID : ${c.uhid}`, 14, 71);
        if (c?.mobile_no) d.text(`Mobile : ${c.mobile_no}`, 14, 77);
        if (c?.email) d.text(`Email : ${c.email}`, 14, 83);

        if (bill.referral_source !== "None") {
            d.text(`Referral : ${bill.referral_source}`, 140, 65);
        }

        // Table
        const tableData = bill.items.map((item, index) => [
            (index + 1).toString(),
            item.name,
            `Rs. ${item.price.toFixed(2)}`
        ]);

        autoTable(d, {
            startY: 95,
            head: [["#", "Description", "Amount"]],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [15, 118, 110] }, // teal-700
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 40, halign: 'right' }
            }
        });

        // Loop over items and collect entitlements
        const entitlementsBody: any[] = [];
        bill.items.forEach(item => {
            if (item.entitlements && item.entitlements.length > 0) {
                item.entitlements.forEach(ent => {
                    entitlementsBody.push([
                        item.name,
                        ent.service_type,
                        `${ent.default_sessions} Sessions`
                    ]);
                });
            }
        });

        // Calculations
        let finalY = (d as any).lastAutoTable.finalY + 15;

        // Draw Entitlements Breakdown if any
        if (entitlementsBody.length > 0) {
            d.setFontSize(11);
            d.setTextColor(15, 23, 42);
            d.text("Entitlements Included:", 14, finalY);
            finalY += 5;

            autoTable(d, {
                startY: finalY,
                head: [["Package Source", "Service Type", "Granted"]],
                body: entitlementsBody,
                theme: 'grid',
                headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105] }, // slate-100, slate-600
                styles: { fontSize: 9, cellPadding: 3 },
            });
            finalY = (d as any).lastAutoTable.finalY + 15;
        }

        d.setFontSize(10);
        d.setTextColor(71, 85, 105);
        d.text("Subtotal:", 135, finalY);
        d.text(`Rs. ${bill.subtotal.toFixed(2)}`, 196, finalY, { align: 'right' });

        let nextY = finalY;

        if (bill.discount_value > 0) {
            nextY += 8;
            const discountLabel = bill.discount_type === "percentage"
                ? `Discount (${bill.discount_value}%):`
                : "Discount (Flat):";
            // Calculate derived discount amount
            const discountAmount = bill.subtotal - bill.total_amount;

            d.text(discountLabel, 135, nextY);
            d.text(`- Rs. ${discountAmount.toFixed(2)}`, 196, nextY, { align: 'right' });
        }

        nextY += 12;
        d.setFontSize(12);
        d.setTextColor(15, 23, 42);
        d.setFont("helvetica", "bold");
        d.text("Total:", 135, nextY);
        d.text(`Rs. ${bill.total_amount.toFixed(2)}`, 196, nextY, { align: 'right' });

        nextY += 15;
        d.setFontSize(10);
        d.setFont("helvetica", "normal");
        if (bill.status === "Paid") {
            d.setTextColor(16, 185, 129); // emerald-500
            d.text(`STATUS: PAID VIA ${bill.payment_method?.toUpperCase()}`, 14, nextY);
        } else {
            d.setTextColor(245, 158, 11); // amber-500
            d.text("STATUS: PENDING", 14, nextY);
        }

        // Footer
        d.setFontSize(9);
        d.setTextColor(148, 163, 184); // slate-400
        d.text("Thank you for choosing Integration Sports Clinic!", 105, 280, { align: "center" });

        // Save
        const fileName = `${bill.client_name.replace(/\s+/g, '_')}_Invoice_${bill.id}.pdf`;
        d.save(fileName);
        toast({ title: "Invoice PDF Downloaded" });
    };

    return (
        <DashboardLayout role="admin">
            <div className="max-w-6xl mx-auto space-y-6 pb-12">
                <div className="flex flex-col flex-wrap sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-display font-bold text-foreground">Billing & Invoicing</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Manage generation of invoices and track payments</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Form Section */}
                    <div>
                        <Card className="gradient-card border-border">
                            <CardHeader>
                                <CardTitle>Create New Bill</CardTitle>
                                <CardDescription>Generate an invoice for a client</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateBill} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-border/50 pb-6">
                                        <div className="space-y-1.5">
                                            <Label>Select Client <span className="text-destructive">*</span></Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        className={cn("w-full justify-between font-normal", !selectedClient && "text-muted-foreground")}
                                                    >
                                                        {selectedClient ? (() => {
                                                            const c = clients.find(x => x.id === selectedClient);
                                                            return c ? `${c.first_name} ${c.last_name} (${c.uhid})` : "Search Client...";
                                                        })() : "Search Client..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[400px] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Search client by name or UHID..." />
                                                        <CommandList>
                                                            <CommandEmpty>No clients found</CommandEmpty>
                                                            <CommandGroup>
                                                                {clients.map(c => (
                                                                    <CommandItem
                                                                        key={c.id}
                                                                        value={`${c.first_name} ${c.last_name} ${c.uhid}`}
                                                                        onSelect={() => setSelectedClient(c.id)}
                                                                    >
                                                                        <Check className={cn("mr-2 h-4 w-4", selectedClient === c.id ? "opacity-100" : "opacity-0")} />
                                                                        {c.first_name} {c.last_name} ({c.uhid})
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center mb-1">
                                                <Label>Referral Source</Label>
                                                <Dialog open={isReferralModalOpen} onOpenChange={setIsReferralModalOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="link" size="sm" className="h-auto p-0 text-xs"><Plus className="w-3 h-3 mr-1" /> Add New</Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader><DialogTitle>Add Referral Source</DialogTitle></DialogHeader>
                                                        <Input value={newReferralName} onChange={e => setNewReferralName(e.target.value)} placeholder="e.g. Dr. Adams" />
                                                        <DialogFooter><Button onClick={handleAddReferral}>Save</Button></DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                            <Select value={selectedReferral} onValueChange={setSelectedReferral}>
                                                <SelectTrigger><SelectValue placeholder="Select Source (Optional)" /></SelectTrigger>
                                                <SelectContent>
                                                    {referralSources.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Cart Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <Label className="text-base font-semibold flex items-center gap-2">
                                                    <ShoppingCart className="w-4 h-4" /> Packages Cart
                                                </Label>
                                                <Dialog open={isPkgModalOpen} onOpenChange={setIsPkgModalOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="link" size="sm" className="h-auto p-0 text-xs"><Plus className="w-3 h-3 mr-1" /> Create Custom Package</Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader><DialogTitle>Create Custom Package</DialogTitle></DialogHeader>
                                                        <div className="space-y-3">
                                                            <div><Label>Name</Label><Input value={newPkgName} onChange={e => setNewPkgName(e.target.value)} placeholder="Package Name" /></div>
                                                            <div><Label>Price (Rs)</Label><Input type="number" value={newPkgPrice} onChange={e => setNewPkgPrice(e.target.value)} placeholder="Amount" /></div>
                                                        </div>
                                                        <DialogFooter className="mt-4"><Button onClick={handleAddPackage}>Add & Save</Button></DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>

                                            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        role="combobox"
                                                        aria-expanded={openCombobox}
                                                        className="w-full justify-between font-normal"
                                                    >
                                                        Search and add package...
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Search packages..." />
                                                        <CommandEmpty>No package found.</CommandEmpty>
                                                        <CommandList>
                                                            <CommandGroup>
                                                                {packages.map((p) => (
                                                                    <CommandItem
                                                                        key={p.id}
                                                                        value={p.name}
                                                                        onSelect={() => {
                                                                            addToCart(p.id);
                                                                            setOpenCombobox(false);
                                                                        }}
                                                                    >
                                                                        <div className="flex flex-col w-full">
                                                                            <div className="flex justify-between items-center w-full">
                                                                                <span className="font-medium text-foreground">{p.name}</span>
                                                                                <span className="text-muted-foreground mr-1 text-sm font-semibold">Rs. {p.price}</span>
                                                                            </div>
                                                                            {/* Sub items info for combobox optional */}
                                                                            {p.service_package_items && p.service_package_items.length > 0 && (
                                                                                <div className="text-[10px] text-muted-foreground mt-0.5 truncate flex gap-1.5">
                                                                                    {p.service_package_items.map((spi, i) => (
                                                                                        <span key={i} className="bg-muted px-1.5 py-0.5 rounded">{spi.default_sessions}x {spi.service_type}</span>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </CommandItem>
                                                                ))}
                                                            </CommandGroup>
                                                        </CommandList>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>

                                            {cart.length > 0 ? (
                                                <div className="bg-card border rounded-md p-3 max-h-[250px] overflow-y-auto space-y-2 mt-4 text-sm shadow-sm">
                                                    {cart.map((item, idx) => (
                                                        <div key={item.id} className="flex justify-between items-start py-2 border-b last:border-0 hover:bg-muted/20 transition-colors">
                                                            <div className="flex-1 pr-2">
                                                                <div className="text-foreground font-medium">{idx + 1}. {item.name}</div>
                                                                {item.items && item.items.length > 0 && (
                                                                    <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-1">
                                                                        {item.items.map((ent, i) => (
                                                                            <span key={i} className="-mt-0.5 bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">{ent.default_sessions}x {ent.service_type}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-semibold text-foreground mt-0.5">Rs. {item.price}</span>
                                                                <Button variant="ghost" size="icon" type="button" className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.id)}>
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-8 bg-muted/30 border border-dashed rounded-md text-muted-foreground text-sm">
                                                    Cart is empty. Search to add packages.
                                                </div>
                                            )}
                                        </div>

                                        {/* Discount Section */}
                                        <div className="flex flex-col justify-end">
                                            <div className="bg-muted/30 border p-5 rounded-lg space-y-5 h-full flex flex-col justify-center shadow-sm">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-muted-foreground">Cart Subtotal</span>
                                                    <span className="font-semibold text-lg">Rs. {subtotal.toFixed(2)}</span>
                                                </div>

                                                <div className="space-y-3">
                                                    <Label className="font-semibold text-sm">Apply Discount</Label>
                                                    <RadioGroup defaultValue={discountType} onValueChange={(v) => setDiscountType(v as "percentage" | "flat")} className="flex gap-4">
                                                        <div className="flex items-center space-x-2">
                                                            <RadioGroupItem value="flat" id="flat" />
                                                            <Label htmlFor="flat" className="cursor-pointer font-normal text-sm">Flat Offset (Rs)</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <RadioGroupItem value="percentage" id="percentage" />
                                                            <Label htmlFor="percentage" className="cursor-pointer font-normal text-sm">Percentage (%)</Label>
                                                        </div>
                                                    </RadioGroup>
                                                    <Input
                                                        type="number"
                                                        value={discountValue}
                                                        onChange={e => setDiscountValue(e.target.value)}
                                                        placeholder="Enter discount amount"
                                                        className="w-full bg-background"
                                                    />
                                                </div>

                                                <div className="border-t border-border pt-4 mt-auto flex justify-between items-center text-xl font-bold">
                                                    <span className="text-foreground">Total Payable</span>
                                                    <span className="text-primary">Rs. {totalPayable.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <Button type="submit" size="lg" className="w-full" disabled={cart.length === 0}>Generate Official Invoice</Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Table Section */}
                    <div>
                        <Card className="gradient-card border-border h-full">
                            <CardHeader>
                                <CardTitle>Recent Bills</CardTitle>
                                <CardDescription>View and manage generated invoices</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {bills.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                                        No bills generated yet. Create one using the form.
                                    </div>
                                ) : (
                                    <div className="rounded-md border overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Invoice #</TableHead>
                                                    <TableHead>Client</TableHead>
                                                    <TableHead>Total Amt</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {bills.map((bill) => (
                                                    <TableRow key={bill.id}>
                                                        <TableCell className="font-medium">{bill.id}</TableCell>
                                                        <TableCell>
                                                            <div className="font-medium text-foreground">{bill.client_name}</div>
                                                            <div className="text-xs text-muted-foreground mt-0.5">{bill.items.length} item(s)</div>
                                                        </TableCell>
                                                        <TableCell className="font-semibold">Rs. {bill.total_amount.toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            {bill.status === "Paid" ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                                                                    <CheckCircle className="w-3.5 h-3.5" /> Paid
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500">
                                                                    Pending
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right flex items-center justify-end gap-2 h-[72px]">
                                                            {bill.status === "Pending" && (
                                                                <Button size="sm" variant="outline" onClick={() => { setPaymentBillId(bill.id); setIsPaymentModalOpen(true); }}>
                                                                    Mark Paid
                                                                </Button>
                                                            )}
                                                            <Button size="icon" variant="ghost" onClick={() => downloadInvoice(bill)} title="Download PDF">
                                                                <Download className="w-4 h-4 text-primary" />
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
                </div>
            </div>

            {/* Payment Modal */}
            <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
                    <div className="py-4 space-y-4">
                        <Label>Select Payment Method</Label>
                        <div className="grid grid-cols-3 gap-3">
                            <Button type="button" variant={paymentMethod === "Cash" ? "default" : "outline"} onClick={() => setPaymentMethod("Cash")} className="h-20 flex flex-col items-center justify-center gap-2">
                                <Banknote className="w-6 h-6" /> Cash
                            </Button>
                            <Button type="button" variant={paymentMethod === "UPI" ? "default" : "outline"} onClick={() => setPaymentMethod("UPI")} className="h-20 flex flex-col items-center justify-center gap-2">
                                <Smartphone className="w-6 h-6" /> UPI
                            </Button>
                            <Button type="button" variant={paymentMethod === "Card" ? "default" : "outline"} onClick={() => setPaymentMethod("Card")} className="h-20 flex flex-col items-center justify-center gap-2">
                                <CreditCard className="w-6 h-6" /> Card
                            </Button>
                        </div>
                    </div>
                    <DialogFooter><Button onClick={markAsPaid} disabled={!paymentMethod}>Confirm Payment</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
