import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    CreditCard, 
    Users, 
    TrendingUp, 
    AlertCircle, 
    Plus, 
    Calendar, 
    MoreHorizontal,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    Settings2,
    RefreshCcw,
    CheckCircle2,
    Clock,
    XCircle
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SubscriptionModal } from "@/components/sports-scientist/SubscriptionModal";
import { PackageModal } from "@/components/sports-scientist/PackageModal";
import { SubscriptionDetailDrawer } from "@/components/billing/SubscriptionDetailDrawer";
import { PaymentModal } from "@/components/billing/PaymentModal";

export default function SportsScientistBilling() {
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [isSubModalOpen, setIsSubModalOpen] = useState(false);
    const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);
    const [selectedSub, setSelectedSub] = useState<any>(null);
    const [isSubDrawerOpen, setIsSubDrawerOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentBillId, setPaymentBillId] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("All");

    // 1. Fetch Subscriptions
    const { data: subscriptions, isLoading: subsLoading } = useQuery({
        queryKey: ["ss-subscriptions", profile?.organization_id],
        queryFn: async () => {
            if (!profile?.organization_id) return [];
            const { data, error } = await supabase
                .from("subscriptions")
                .select(`
                    *,
                    client:clients(first_name, last_name, uhid),
                    package:packages(name, price)
                `)
                .eq("organization_id", profile.organization_id)
                .order("created_at", { ascending: false });
            
            if (error) throw error;
            return data;
        },
        enabled: !!profile?.organization_id
    });

    // 2. Fetch subscription history
    const { data: subHistory } = useQuery({
        queryKey: ["subscription-history", selectedSub?.id],
        queryFn: async () => {
            if (!selectedSub?.id) return [];
            const { data, error } = await supabase
                .from("bills")
                .select(`
                    *,
                    payments:bill_payments(
                        amount,
                        payment_method,
                        created_at,
                        staff:profiles(first_name, last_name)
                    )
                `)
                .eq("subscription_id", selectedSub.id)
                .order("created_at", { ascending: false });
            
            if (error) throw error;
            return data;
        },
        enabled: !!selectedSub?.id
    });

    const generateEarlyInvoice = useMutation({
        mutationFn: async (subId: string) => {
            const { data, error } = await supabase.rpc('fn_generate_subscription_invoice', {
                p_subscription_id: subId
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ss-subscriptions"] }).then(() => {
                const updatedSubs: any = queryClient.getQueryData(["ss-subscriptions", profile?.organization_id]);
                if (updatedSubs && selectedSub) {
                    const found = updatedSubs.find((s: any) => s.id === selectedSub.id);
                    if (found) setSelectedSub(found);
                }
            });
            queryClient.invalidateQueries({ queryKey: ["subscription-history", selectedSub?.id] });
            toast.success("Early invoice generated successfully");
        },
        onError: (err: any) => toast.error(err.message)
    });

    const cancelSubscription = useMutation({
        mutationFn: async (subId: string) => {
            const { error } = await supabase.rpc('fn_cancel_subscription', {
                p_subscription_id: subId
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["ss-subscriptions"] }).then(() => {
                const updatedSubs: any = queryClient.getQueryData(["ss-subscriptions", profile?.organization_id]);
                if (updatedSubs && selectedSub) {
                    const found = updatedSubs.find((s: any) => s.id === selectedSub.id);
                    if (found) setSelectedSub(found);
                }
            });
            toast.success("Membership cancelled successfully");
        },
        onError: (err: any) => toast.error(err.message)
    });

    const filteredSubs = subscriptions?.filter(s => {
        const matchesSearch = `${s.client?.first_name} ${s.client?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             s.client?.uhid?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "All" || s.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <DashboardLayout role="sports_scientist">
            <div className="min-h-screen bg-[#f8fafc] p-4 sm:p-8 space-y-8 animate-in fade-in duration-700">
                <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight text-slate-900">Manage Memberships</h1>
                    </div>
                    <div className="flex gap-3">
                    </div>
                </header>

                <div className="space-y-6">
                    <div className="flex items-center justify-end">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search athletes..." 
                                    className="pl-10 h-10 w-64 bg-white border-slate-200 rounded-xl"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className={cn(
                                        "h-10 gap-2 rounded-xl border-slate-200 font-bold",
                                        statusFilter !== "All" && "bg-primary/5 border-primary/20 text-primary"
                                    )}>
                                        <Filter className="w-4 h-4" />
                                        {statusFilter === "All" ? "Filter" : statusFilter}
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
                    </div>

                    <Card className="border-none shadow-sm rounded-[32px] overflow-hidden">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="hover:bg-transparent border-slate-100">
                                        <TableHead className="py-5 pl-8 text-[10px] uppercase font-black tracking-widest text-slate-400">Athlete</TableHead>
                                        <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400">Plan</TableHead>
                                        <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400">Status</TableHead>
                                        <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400">Next Billing</TableHead>
                                        <TableHead className="text-[10px] uppercase font-black tracking-widest text-slate-400 text-right pr-8">Payment Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSubs?.map((sub) => (
                                        <TableRow 
                                            key={sub.id} 
                                            className="group hover:bg-slate-50/50 transition-colors border-slate-100 cursor-pointer"
                                            onClick={() => {
                                                setSelectedSub(sub);
                                                setIsSubDrawerOpen(true);
                                            }}
                                        >
                                            <TableCell className="py-5 pl-8">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 group-hover:text-primary transition-colors">
                                                        {sub.client?.first_name} {sub.client?.last_name}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {sub.client?.uhid}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-slate-700">{sub.package?.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub.billing_cycle}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={sub.status} />
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-bold text-sm text-slate-600">
                                                    {sub.next_billing_date ? format(new Date(sub.next_billing_date), "MMM dd, yyyy") : "N/A"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <div className="flex flex-col items-end">
                                                    <span className={cn(
                                                        "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                        sub.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                                                        sub.status === 'Overdue' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                        "bg-slate-50 text-slate-600 border-slate-100"
                                                    )}>
                                                        {sub.status === 'Active' ? 'PAID' : sub.status === 'Overdue' ? 'PENDING' : sub.status}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <SubscriptionModal 
                    open={isSubModalOpen} 
                    onOpenChange={setIsSubModalOpen} 
                    orgId={profile?.organization_id || ""} 
                />

                <PackageModal 
                    open={isPkgModalOpen} 
                    onOpenChange={setIsPkgModalOpen} 
                    orgId={profile?.organization_id || ""} 
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
                    hideRevenue={true}
                />
            </div>
        </DashboardLayout>
    );
}

function StatusBadge({ status }: { status: string }) {
    const variants: Record<string, string> = {
        Active: "bg-emerald-50 text-emerald-600 border-emerald-100",
        "Past Due": "bg-amber-50 text-amber-600 border-amber-100",
        Suspended: "bg-rose-50 text-rose-600 border-rose-100",
        Cancelled: "bg-slate-100 text-slate-600 border-slate-200",
    };

    const icons: Record<string, any> = {
        Active: CheckCircle2,
        "Past Due": Clock,
        Suspended: AlertCircle,
        Cancelled: XCircle,
    };

    const Icon = icons[status] || Clock;

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
            variants[status] || "bg-slate-100 text-slate-600 border-slate-200"
        )}>
            <Icon className="w-3 h-3" />
            {status}
        </span>
    );
}
