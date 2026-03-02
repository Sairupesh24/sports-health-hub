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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { CreditCard, Plus, Search, Receipt, Building2 } from "lucide-react";
import { format } from "date-fns";

export default function Billing() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showNewBill, setShowNewBill] = useState(false);
  const [showAddReferral, setShowAddReferral] = useState(false);
  const [showAddPackage, setShowAddPackage] = useState(false);
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
  const total = Math.max(0, amount - discountNum);

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
        amount,
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

  const inputClass = "bg-muted/30 border-border focus:border-primary";

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Billing</h1>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground text-sm">
                {org?.name || "Loading organization..."}
              </span>
            </div>
          </div>
          <Button onClick={() => setShowNewBill(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Bill
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="gradient-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bills</p>
                  <p className="text-2xl font-bold text-foreground">{bills?.length ?? 0}</p>
                </div>
                <Receipt className="w-8 h-8 text-primary/60" />
              </div>
            </CardContent>
          </Card>
          <Card className="gradient-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-foreground">
                    {bills?.filter((b) => b.status === "pending").length ?? 0}
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-yellow-500/60" />
              </div>
            </CardContent>
          </Card>
          <Card className="gradient-card border-border">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground">
                    ₹{bills?.reduce((sum, b) => sum + Number(b.total), 0).toLocaleString("en-IN") ?? 0}
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-green-500/60" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bills Table */}
        <Card className="gradient-card border-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                All Bills
              </CardTitle>
              <div className="relative w-72">
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
          <CardContent>
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
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Date</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Referral</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(new Date(bill.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {(bill as any).clients
                            ? `${(bill as any).clients.first_name} ${(bill as any).clients.last_name}`
                            : "—"}
                        </TableCell>
                        <TableCell>{(bill as any).packages?.name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {(bill as any).referral_sources?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">₹{Number(bill.amount).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ₹{Number(bill.discount).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{Number(bill.total).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              bill.status === "paid"
                                ? "bg-green-500/10 text-green-500"
                                : "bg-yellow-500/10 text-yellow-500"
                            }
                          >
                            {bill.status}
                          </Badge>
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

      {/* New Bill Dialog */}
      <Dialog open={showNewBill} onOpenChange={setShowNewBill}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Bill</DialogTitle>
            <DialogDescription>
              Organization: <span className="font-semibold text-foreground">{org?.name ?? "—"}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
                <span>₹{amount.toLocaleString("en-IN")}</span>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewBill(false)}>Cancel</Button>
            <Button onClick={createBill} disabled={submitting}>
              {submitting ? "Creating..." : "Create Bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Referral Source Dialog */}
      <Dialog open={showAddReferral} onOpenChange={setShowAddReferral}>
        <DialogContent className="sm:max-w-sm">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddReferral(false)}>Cancel</Button>
            <Button onClick={() => addReferral.mutate()} disabled={addReferral.isPending || !newReferralName.trim()}>
              {addReferral.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Package Dialog */}
      <Dialog open={showAddPackage} onOpenChange={setShowAddPackage}>
        <DialogContent className="sm:max-w-sm">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPackage(false)}>Cancel</Button>
            <Button onClick={() => addPackage.mutate()} disabled={addPackage.isPending || !newPackageName.trim()}>
              {addPackage.isPending ? "Adding..." : "Add Package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
