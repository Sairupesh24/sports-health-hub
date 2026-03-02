import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { CreditCard, Plus, Search, Receipt, Building2, CheckCircle2, Download } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";

const PAYMENT_METHODS = ["Cash", "UPI", "Card"] as const;

export default function Billing() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showNewBill, setShowNewBill] = useState(false);
  const [showAddReferral, setShowAddReferral] = useState(false);
  const [showAddPackage, setShowAddPackage] = useState(false);
  const [showMarkPaid, setShowMarkPaid] = useState(false);
  const [markPaidBillId, setMarkPaidBillId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [newReferralName, setNewReferralName] = useState("");
  const [newPackageName, setNewPackageName] = useState("");
  const [newPackagePrice, setNewPackagePrice] = useState("");
  const [newPackageDesc, setNewPackageDesc] = useState("");

  // Bill form state
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedReferral, setSelectedReferral] = useState("");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const orgId = profile?.organization_id;

  // Fetch organization name
  const { data: org } = useQuery({
    queryKey: ["organization", orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  // Fetch clients for dropdown
  const { data: clients } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name, uhid")
        .is("deleted_at", null)
        .order("first_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch packages
  const { data: packages } = useQuery({
    queryKey: ["packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch referral sources
  const { data: referralSources } = useQuery({
    queryKey: ["referral_sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referral_sources")
        .select("*")
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch bills
  const { data: bills, isLoading: billsLoading } = useQuery({
    queryKey: ["bills", search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("*, clients(first_name, last_name, uhid), packages(name), referral_sources(name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const selectedPkg = packages?.find((p) => p.id === selectedPackage);
  const amount = selectedPkg?.price ?? 0;
  const discountNum = parseFloat(discount) || 0;
  const total = Math.max(0, Number(amount) - discountNum);

  // Add referral source
  const addReferral = useMutation({
    mutationFn: async () => {
      if (!newReferralName.trim() || !orgId) return;
      const { error } = await supabase.from("referral_sources").insert({
        organization_id: orgId,
        name: newReferralName.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referral_sources"] });
      setNewReferralName("");
      setShowAddReferral(false);
      toast({ title: "Referral source added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Add package
  const addPackage = useMutation({
    mutationFn: async () => {
      if (!newPackageName.trim() || !orgId) return;
      const { error } = await supabase.from("packages").insert({
        organization_id: orgId,
        name: newPackageName.trim(),
        price: parseFloat(newPackagePrice) || 0,
        description: newPackageDesc || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages"] });
      setNewPackageName("");
      setNewPackagePrice("");
      setNewPackageDesc("");
      setShowAddPackage(false);
      toast({ title: "Package added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Mark bill as paid
  const markAsPaid = useMutation({
    mutationFn: async () => {
      if (!markPaidBillId || !paymentMethod) return;
      const { error } = await supabase
        .from("bills")
        .update({
          status: "paid",
          payment_method: paymentMethod.toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", markPaidBillId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      setShowMarkPaid(false);
      setMarkPaidBillId(null);
      setPaymentMethod("");
      toast({ title: "Bill marked as paid" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Create bill
  const createBill = async () => {
    if (!selectedClient || !selectedPackage || !orgId) {
      toast({ title: "Missing fields", description: "Select a client and package", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("bills").insert({
        organization_id: orgId,
        client_id: selectedClient,
        package_id: selectedPackage,
        referral_source_id: selectedReferral || null,
        amount: Number(amount),
        discount: discountNum,
        total,
        notes: notes || null,
        status: "pending",
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast({ title: "Bill created", description: `Total: ₹${total}` });
      resetForm();
      setShowNewBill(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedClient("");
    setSelectedPackage("");
    setSelectedReferral("");
    setDiscount("0");
    setNotes("");
  };

  const openMarkPaid = (billId: string) => {
    setMarkPaidBillId(billId);
    setPaymentMethod("");
    setShowMarkPaid(true);
  };

  // PDF Invoice generation
  const generateInvoice = (bill: any) => {
    const doc = new jsPDF();
    const orgName = org?.name || "Organization";
    const clientName = bill.clients
      ? `${bill.clients.first_name} ${bill.clients.last_name}`
      : "—";
    const clientUhid = bill.clients?.uhid || "—";
    const packageName = bill.packages?.name || "—";
    const referral = bill.referral_sources?.name || "—";
    const billDate = format(new Date(bill.created_at), "dd MMM yyyy");
    const billId = bill.id.slice(0, 8).toUpperCase();

    // Header
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, 210, 45, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(orgName, 20, 22);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("INVOICE", 20, 34);
    doc.text(`#${billId}`, 190, 34, { align: "right" });

    // Bill info
    doc.setTextColor(51, 65, 85);
    let y = 60;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Date:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(billDate, 55, y);

    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Status:", 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(bill.status.toUpperCase(), 55, y);

    if (bill.payment_method) {
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Payment:", 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(bill.payment_method.toUpperCase(), 55, y);
    }

    // Client section
    y += 16;
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(15, y - 5, 180, 28, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Client Details", 20, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${clientName}`, 20, y + 12);
    doc.text(`UHID: ${clientUhid}`, 20, y + 20);

    // Line items table
    y += 40;
    doc.setFillColor(30, 41, 59);
    doc.rect(15, y, 180, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Description", 20, y + 7);
    doc.text("Amount", 175, y + 7, { align: "right" });

    y += 10;
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    doc.text(packageName, 20, y + 7);
    doc.text(`₹${Number(bill.amount).toLocaleString("en-IN")}`, 175, y + 7, { align: "right" });

    if (referral !== "—") {
      y += 10;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.text(`Referral: ${referral}`, 20, y + 7);
    }

    // Totals
    y += 20;
    doc.setDrawColor(203, 213, 225);
    doc.line(100, y, 195, y);
    y += 8;
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Subtotal:", 120, y);
    doc.text(`₹${Number(bill.amount).toLocaleString("en-IN")}`, 175, y, { align: "right" });

    if (Number(bill.discount) > 0) {
      y += 8;
      doc.setTextColor(220, 38, 38);
      doc.text("Discount:", 120, y);
      doc.text(`- ₹${Number(bill.discount).toLocaleString("en-IN")}`, 175, y, { align: "right" });
    }

    y += 10;
    doc.setDrawColor(203, 213, 225);
    doc.line(100, y, 195, y);
    y += 10;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Total:", 120, y);
    doc.text(`₹${Number(bill.total).toLocaleString("en-IN")}`, 175, y, { align: "right" });

    // Notes
    if (bill.notes) {
      y += 20;
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text(`Notes: ${bill.notes}`, 20, y);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Generated from billing system", 105, 285, { align: "center" });

    doc.save(`Invoice-${billId}-${clientUhid}.pdf`);
    toast({ title: "Invoice downloaded" });
  };

  const inputClass = "bg-muted/30 border-border focus:border-primary";

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground">Billing</h1>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground text-sm">
                {org?.name || "Loading organization..."}
              </span>
            </div>
          </div>
          <Button onClick={() => setShowNewBill(true)} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            New Bill
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="gradient-card border-border">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Bills</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">{bills?.length ?? 0}</p>
                </div>
                <Receipt className="w-7 h-7 sm:w-8 sm:h-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
          <Card className="gradient-card border-border">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    {bills?.filter((b) => b.status === "pending").length ?? 0}
                  </p>
                </div>
                <CreditCard className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-500/60" />
              </div>
            </CardContent>
          </Card>
          <Card className="gradient-card border-border">
            <CardContent className="pt-4 sm:pt-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground">
                    ₹{bills?.reduce((sum, b) => sum + Number(b.total), 0).toLocaleString("en-IN") ?? 0}
                  </p>
                </div>
                <CreditCard className="w-7 h-7 sm:w-8 sm:h-8 text-green-500/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bills Table */}
        <Card className="gradient-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                All Bills
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search bills..."
                  className="pl-9 bg-muted/30 border-border"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            {billsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading bills...</div>
            ) : !bills?.length ? (
              <div className="text-center py-12 space-y-3">
                <Receipt className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="text-muted-foreground">No bills yet</p>
                <Button variant="outline" onClick={() => setShowNewBill(true)}>
                  Create First Bill
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Client</TableHead>
                      <TableHead className="whitespace-nowrap hidden md:table-cell">Package</TableHead>
                      <TableHead className="whitespace-nowrap hidden lg:table-cell">Referral</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                      <TableHead className="whitespace-nowrap hidden sm:table-cell">Payment</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap">
                          {format(new Date(bill.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm">
                          {(bill as any).clients
                            ? `${(bill as any).clients.first_name} ${(bill as any).clients.last_name}`
                            : "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{(bill as any).packages?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell text-sm">
                          {(bill as any).referral_sources?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-xs sm:text-sm whitespace-nowrap">
                          ₹{Number(bill.total).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {bill.payment_method ? (
                            <Badge variant="outline" className="capitalize text-xs">{bill.payment_method}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              bill.status === "paid"
                                ? "bg-green-500/10 text-green-600 text-xs"
                                : "bg-yellow-500/10 text-yellow-600 text-xs"
                            }
                          >
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {bill.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1 text-green-600 hover:text-green-700"
                                onClick={() => openMarkPaid(bill.id)}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Mark Paid</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-primary hover:text-primary/80"
                              onClick={() => generateInvoice(bill)}
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Invoice</span>
                            </Button>
                          </div>
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

      {/* Mark as Paid Dialog */}
      <Dialog open={showMarkPaid} onOpenChange={setShowMarkPaid}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark Bill as Paid</DialogTitle>
            <DialogDescription>Select the payment method used.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Payment Method <span className="text-destructive">*</span></Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className={inputClass}><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowMarkPaid(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button
              onClick={() => markAsPaid.mutate()}
              disabled={markAsPaid.isPending || !paymentMethod}
              className="gap-1 w-full sm:w-auto"
            >
              <CheckCircle2 className="w-4 h-4" />
              {markAsPaid.isPending ? "Updating..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Bill Dialog */}
      <Dialog open={showNewBill} onOpenChange={setShowNewBill}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Bill</DialogTitle>
            <DialogDescription>
              Organization: <span className="font-semibold text-foreground">{org?.name ?? "—"}</span>
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-4 py-2 pr-2">
              {/* Client */}
              <div className="space-y-1.5">
                <Label>Client <span className="text-destructive">*</span></Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className={inputClass}><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clients?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} ({c.uhid})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Package */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Package <span className="text-destructive">*</span></Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAddPackage(true)}>
                    <Plus className="w-3 h-3" /> Add Package
                  </Button>
                </div>
                <Select value={selectedPackage} onValueChange={setSelectedPackage}>
                  <SelectTrigger className={inputClass}><SelectValue placeholder="Select package" /></SelectTrigger>
                  <SelectContent>
                    {packages?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — ₹{Number(p.price).toLocaleString("en-IN")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPkg?.description && (
                  <p className="text-xs text-muted-foreground">{selectedPkg.description}</p>
                )}
              </div>

              {/* Referral Source */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Referral Source</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAddReferral(true)}>
                    <Plus className="w-3 h-3" /> Add Source
                  </Button>
                </div>
                <Select value={selectedReferral} onValueChange={setSelectedReferral}>
                  <SelectTrigger className={inputClass}><SelectValue placeholder="Select referral source" /></SelectTrigger>
                  <SelectContent>
                    {referralSources?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Discount */}
              <div className="space-y-1.5">
                <Label>Discount (₹)</Label>
                <Input
                  type="number"
                  className={inputClass}
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  min={0}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional notes" />
              </div>

              <Separator />

              {/* Summary */}
              <div className="space-y-2 bg-muted/30 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span>₹{Number(amount).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">- ₹{discountNum.toLocaleString("en-IN")}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowNewBill(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={createBill} disabled={submitting} className="w-full sm:w-auto">
              {submitting ? "Creating..." : "Create Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Referral Source Dialog */}
      <Dialog open={showAddReferral} onOpenChange={setShowAddReferral}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Referral Source</DialogTitle>
            <DialogDescription>Add a new referral source to the dropdown list.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Name</Label>
            <Input
              className={inputClass}
              value={newReferralName}
              onChange={(e) => setNewReferralName(e.target.value)}
              placeholder="e.g. Hospital Referral"
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowAddReferral(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={() => addReferral.mutate()} disabled={addReferral.isPending || !newReferralName.trim()} className="w-full sm:w-auto">
              {addReferral.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Package Dialog */}
      <Dialog open={showAddPackage} onOpenChange={setShowAddPackage}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Package</DialogTitle>
            <DialogDescription>Add a new billing package.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Package Name <span className="text-destructive">*</span></Label>
              <Input className={inputClass} value={newPackageName} onChange={(e) => setNewPackageName(e.target.value)} placeholder="e.g. Premium Plan" />
            </div>
            <div className="space-y-1.5">
              <Label>Price (₹) <span className="text-destructive">*</span></Label>
              <Input type="number" className={inputClass} value={newPackagePrice} onChange={(e) => setNewPackagePrice(e.target.value)} placeholder="0" min={0} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea className={inputClass} value={newPackageDesc} onChange={(e) => setNewPackageDesc(e.target.value)} rows={2} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowAddPackage(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={() => addPackage.mutate()} disabled={addPackage.isPending || !newPackageName.trim()} className="w-full sm:w-auto">
              {addPackage.isPending ? "Adding..." : "Add Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
