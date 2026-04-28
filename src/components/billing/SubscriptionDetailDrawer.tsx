import { 
    Sheet, 
    SheetContent, 
    SheetHeader, 
    SheetTitle, 
    SheetDescription 
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    CalendarDays, 
    History, 
    CalendarClock,
    Users,
    CreditCard
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SubscriptionDetailDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subscription: any;
    history: any[];
    onGenerateEarlyInvoice: () => void;
    onCancelSubscription: () => void;
    onCollectPayment: (billId: string) => void;
    isGenerating: boolean;
    isCancelling: boolean;
    hideRevenue?: boolean;
}

export function SubscriptionDetailDrawer({ 
    open, 
    onOpenChange, 
    subscription, 
    history, 
    onGenerateEarlyInvoice, 
    onCancelSubscription,
    onCollectPayment,
    isGenerating,
    isCancelling,
    hideRevenue = false
}: SubscriptionDetailDrawerProps) {
    if (!subscription) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl overflow-y-auto bg-white border-l border-slate-100">
                <SheetHeader className="space-y-4 pr-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <SheetTitle className="text-2xl font-black text-slate-900 tracking-tight">Membership Details</SheetTitle>
                            <SheetDescription className="font-medium text-slate-500">Full history and status for {subscription.client?.first_name} {subscription.client?.last_name}</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="mt-8 space-y-8">
                    {/* Status Card */}
                    <div className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 flex justify-between items-center">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Current Plan</p>
                            <h4 className="text-xl font-bold text-slate-900 uppercase">{subscription.package?.name}</h4>
                            <p className="text-xs text-muted-foreground">{subscription.billing_cycle} Billing Cycle</p>
                        </div>
                        <div className="text-right space-y-1">
                             <span className={cn(
                                "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                subscription.status === 'Active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                                subscription.status === 'Overdue' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                "bg-slate-50 text-slate-600 border-slate-100"
                            )}>
                                {subscription.status}
                            </span>
                            {!hideRevenue && <p className="text-lg font-black text-primary">₹{(subscription.amount || subscription.package?.price || 0).toLocaleString()}</p>}
                        </div>
                    </div>

                    {/* Next Payment Section */}
                    <div className="p-6 rounded-[32px] border border-primary/20 bg-primary/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-2xl bg-white shadow-sm">
                                <CalendarClock className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Next Payment Due</p>
                                <h4 className="text-xl font-bold text-slate-900">
                                    {subscription.next_billing_date ? format(new Date(subscription.next_billing_date), "dd MMMM yyyy") : 'Not Scheduled'}
                                </h4>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            {!hideRevenue && (
                                <Button 
                                    className="rounded-2xl gap-2 font-bold shadow-lg shadow-primary/20 h-9"
                                    onClick={onGenerateEarlyInvoice}
                                    disabled={isGenerating || subscription.status === 'Cancelled'}
                                >
                                    {isGenerating ? "Generating..." : "Collect Next Payment Early"}
                                </Button>
                            )}
                            {subscription.status !== 'Cancelled' && (
                                <Button 
                                    variant="outline"
                                    className="rounded-2xl gap-2 font-bold h-9 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                    onClick={() => {
                                        if (confirm("Are you sure you want to stop this membership? This will prevent future automated renewals.")) {
                                            onCancelSubscription();
                                        }
                                    }}
                                    disabled={isCancelling}
                                >
                                    {isCancelling ? "Stopping..." : "Stop Membership"}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5 text-muted-foreground" />
                            <h3 className="font-black uppercase tracking-widest text-xs text-muted-foreground">Renewal & Payment History</h3>
                        </div>

                        <div className="space-y-3 pb-8">
                            {history.length === 0 ? (
                                <p className="text-sm text-muted-foreground italic p-4 text-center">No history found for this membership.</p>
                            ) : history.map((bill: any) => (
                                <div key={bill.id} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{format(new Date(bill.created_at), "dd MMM yyyy")}</p>
                                                <p className="text-sm font-bold">Invoice #{bill.invoice_number || bill.id.substring(0, 8)}</p>
                                                {bill.notes && <p className="text-[10px] text-primary font-medium mt-0.5">{bill.notes}</p>}
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                {!hideRevenue && <p className="text-sm font-black text-slate-900">₹{(bill.total || 0).toLocaleString()}</p>}
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                                                        bill.status === 'Paid' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
                                                    )}>
                                                        {bill.status}
                                                    </span>
                                                    {bill.status === 'Pending' && !hideRevenue && (
                                                        <Button 
                                                            size="sm" 
                                                            className="h-6 px-2 text-[9px] font-bold bg-primary hover:bg-primary/90"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onCollectPayment(bill.id);
                                                            }}
                                                        >
                                                            Collect
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    
                                    {bill.payments && bill.payments.length > 0 && (
                                        <div className="pt-2 border-t border-slate-50 space-y-2">
                                            {bill.payments.map((pay: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center bg-slate-50/50 p-2 rounded-xl border border-slate-50">
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                                                        <span>{pay.payment_method}</span>
                                                        <span>•</span>
                                                        <span>By {pay.staff?.first_name}</span>
                                                    </div>
                                                    {!hideRevenue && <p className="font-bold text-slate-700">₹{(pay.amount || 0).toLocaleString()}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
