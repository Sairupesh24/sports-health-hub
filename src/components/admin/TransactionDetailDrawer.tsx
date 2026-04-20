import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Receipt, Banknote, Smartphone, Landmark, CreditCard,
    FileDown, ExternalLink, CheckCircle2, XCircle, ShieldCheck,
    CalendarDays, User, Hash, ArrowLeftRight, Tag, FileText,
    ImageOff
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type TransactionType = "invoice" | "refund";

export interface TransactionDetail {
    id: string;
    type: TransactionType;
    date: string;
    client_name: string;
    client_uhid?: string;
    amount: number;
    status?: string; // For invoices: Paid / Pending
    // Invoice-specific
    package_name?: string;
    payment_method?: string;
    transaction_id?: string;
    referral_source?: string;
    billing_staff?: string;
    notes?: string;
    discount_value?: number;
    discount_authorized_by?: string;
    paid_amount?: number;
    remaining_due?: number;
    // Refund-specific
    refund_mode?: string;
    refund_transaction_id?: string;
    refund_proof_url?: string;
    authorized_by?: string;
    is_override?: boolean;
    is_entitlement_reversed?: boolean;
    original_invoice_id?: string;
}

interface TransactionDetailDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction: TransactionDetail | null;
}

const modeIcon = (mode?: string) => {
    if (!mode) return <Banknote className="w-4 h-4" />;
    if (mode.toLowerCase().includes("upi")) return <Smartphone className="w-4 h-4" />;
    if (mode.toLowerCase().includes("bank")) return <Landmark className="w-4 h-4" />;
    if (mode.toLowerCase().includes("credit") || mode.toLowerCase().includes("card")) return <CreditCard className="w-4 h-4" />;
    return <Banknote className="w-4 h-4" />;
};

function DetailRow({ label, value, className }: { label: string; value?: React.ReactNode; className?: string }) {
    if (!value && value !== false) return null;
    return (
        <div className={cn("flex items-start justify-between gap-4 py-2.5 border-b border-border/50 last:border-0", className)}>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">{label}</span>
            <span className="text-xs text-foreground font-semibold text-right">{value}</span>
        </div>
    );
}

export function TransactionDetailDrawer({ open, onOpenChange, transaction }: TransactionDetailDrawerProps) {
    if (!transaction) return null;

    const isRefund = transaction.type === "refund";
    const accentColor = isRefund ? "text-rose-500" : "text-emerald-500";
    const accentBg = isRefund ? "bg-rose-500/10 border-rose-500/20" : "bg-emerald-500/10 border-emerald-500/20";
    const badgeClass = isRefund
        ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
        : transaction.status === "Paid"
            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
            : transaction.status === "Partially Paid"
                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                : "bg-amber-500/10 text-amber-600 border-amber-500/20";
    const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto p-0">
                {/* Header */}
                <div className={cn("p-6 border-b", isRefund ? "bg-rose-500/5" : "bg-emerald-500/5")}>
                    <SheetHeader className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", accentBg)}>
                                {isRefund
                                    ? <ArrowLeftRight className={cn("w-5 h-5", accentColor)} />
                                    : <Receipt className={cn("w-5 h-5", accentColor)} />
                                }
                            </div>
                            <div>
                                <SheetTitle className="text-base font-bold">
                                    {isRefund ? "Refund Details" : "Invoice Details"}
                                </SheetTitle>
                                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                    #{transaction.id.substring(0, 8).toUpperCase()}
                                </p>
                            </div>
                            <div className="ml-auto">
                                <Badge className={cn("border text-[10px] font-bold px-2 py-0.5", badgeClass)}>
                                    {isRefund ? "REFUND" : transaction.status?.toUpperCase() || "PENDING"}
                                </Badge>
                            </div>
                        </div>

                        {/* Amount hero */}
                        <div className={cn("rounded-xl p-4 border flex items-center justify-between", accentBg)}>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                                    {isRefund ? "Refund Amount" : "Invoice Amount"}
                                </p>
                                <p className={cn("text-2xl font-black", accentColor)}>
                                    {isRefund ? "−" : "+"}Rs. {transaction.amount.toFixed(2)}
                                </p>
                                {!isRefund && transaction.paid_amount! > 0 && transaction.status !== 'Paid' && (
                                    <p className="text-[10px] text-muted-foreground font-semibold mt-1">
                                        Remaining: Rs. {transaction.remaining_due?.toFixed(2)}
                                    </p>
                                )}
                            </div>
                            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", accentBg)}>
                                {modeIcon(isRefund ? transaction.refund_mode : transaction.payment_method)}
                            </div>
                        </div>
                    </SheetHeader>
                </div>

                <div className="p-6 space-y-6">
                    {/* Client Info */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <User className="w-3.5 h-3.5 text-primary" />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Client</h3>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 space-y-0 divide-y divide-border/40">
                            <DetailRow label="Name" value={transaction.client_name} />
                            {transaction.client_uhid && <DetailRow label="UHID" value={transaction.client_uhid} />}
                        </div>
                    </section>

                    {/* Transaction Info */}
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <Hash className="w-3.5 h-3.5 text-primary" />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Transaction Details</h3>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 space-y-0 divide-y divide-border/40">
                            <DetailRow label="Date" value={format(new Date(transaction.date), "dd MMM yyyy, hh:mm a")} />

                            {isRefund ? (
                                <>
                                    <DetailRow label="Mode" value={
                                        <span className="flex items-center gap-1.5">
                                            {modeIcon(transaction.refund_mode)}
                                            {transaction.refund_mode}
                                        </span>
                                    } />
                                    {transaction.refund_transaction_id && (
                                        <DetailRow label="Txn ID" value={transaction.refund_transaction_id} />
                                    )}
                                    {transaction.original_invoice_id && (
                                        <DetailRow label="Original Invoice" value={`#${transaction.original_invoice_id.substring(0, 8).toUpperCase()}`} />
                                    )}
                                </>
                            ) : (
                                <>
                                    {transaction.package_name && <DetailRow label="Packages" value={
                                        <div className="flex flex-col items-end gap-1">
                                            {transaction.package_name.split(", ").map((ps, i) => (
                                                <span key={i}>{ps}</span>
                                            ))}
                                        </div>
                                    } />}
                                    {transaction.payment_method && (
                                        <DetailRow label="Payment" value={
                                            <span className="flex items-center gap-1.5">
                                                {modeIcon(transaction.payment_method)}
                                                {transaction.payment_method}
                                            </span>
                                        } />
                                    )}
                                    {transaction.transaction_id && <DetailRow label="Txn ID" value={transaction.transaction_id} />}
                                    {transaction.referral_source && <DetailRow label="Referral" value={transaction.referral_source} />}
                                    {transaction.billing_staff && <DetailRow label="Billed By" value={transaction.billing_staff} />}
                                    {(transaction.discount_value ?? 0) > 0 && (
                                        <DetailRow label="Discount" value={`Rs. ${Number(transaction.discount_value).toFixed(2)}`} />
                                    )}
                                    {transaction.discount_authorized_by && (
                                        <DetailRow label="Discount Auth" value={transaction.discount_authorized_by} />
                                    )}
                                    {transaction.notes && <DetailRow label="Notes" value={transaction.notes} />}
                                </>
                            )}
                        </div>
                    </section>

                    {/* Refund-specific: Authorization & Entitlements */}
                    {isRefund && (
                        <>
                            <section>
                                <div className="flex items-center gap-2 mb-3">
                                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Authorization</h3>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3 space-y-0 divide-y divide-border/40">
                                    {transaction.authorized_by && (
                                        <DetailRow label="Authorized By" value={transaction.authorized_by} />
                                    )}
                                    {transaction.is_override && (
                                        <DetailRow label="Override" value={
                                            <span className="inline-flex items-center gap-1 text-orange-600 font-bold text-[10px]">
                                                <ShieldCheck className="w-3 h-3" /> Full Override Applied
                                            </span>
                                        } />
                                    )}
                                </div>
                            </section>

                            {/* Entitlement Reversal Status */}
                            <section>
                                <div className={cn(
                                    "rounded-xl p-4 border flex items-center gap-4",
                                    transaction.is_entitlement_reversed
                                        ? "bg-emerald-500/5 border-emerald-500/20"
                                        : "bg-amber-500/5 border-amber-500/20"
                                )}>
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                        transaction.is_entitlement_reversed
                                            ? "bg-emerald-500/15"
                                            : "bg-amber-500/15"
                                    )}>
                                        {transaction.is_entitlement_reversed
                                            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            : <XCircle className="w-5 h-5 text-amber-500" />
                                        }
                                    </div>
                                    <div>
                                        <p className={cn("text-xs font-bold", transaction.is_entitlement_reversed ? "text-emerald-700" : "text-amber-700")}>
                                            Entitlements {transaction.is_entitlement_reversed ? "Reversed" : "Retained"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {transaction.is_entitlement_reversed
                                                ? "Remaining sessions were cancelled upon refund."
                                                : "Client's session balance was kept active."
                                            }
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Refund Proof */}
                            {transaction.refund_proof_url && (
                                <section>
                                    <div className="flex items-center gap-2 mb-3">
                                        <FileText className="w-3.5 h-3.5 text-primary" />
                                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Refund Proof</h3>
                                    </div>
                                    <div className="rounded-xl overflow-hidden border border-border bg-muted/20">
                                        {isImageUrl(transaction.refund_proof_url) ? (
                                            <img
                                                src={transaction.refund_proof_url}
                                                alt="Refund proof"
                                                className="w-full max-h-64 object-contain bg-black/5"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="p-6 flex flex-col items-center gap-3 text-center">
                                                <FileDown className="w-10 h-10 text-muted-foreground/40" />
                                                <p className="text-xs text-muted-foreground">Proof document attached</p>
                                            </div>
                                        )}
                                        <div className="p-3 border-t border-border/50 flex justify-end">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-[10px] gap-1.5"
                                                onClick={() => window.open(transaction.refund_proof_url, '_blank')}
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                                Open Full View
                                            </Button>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {!transaction.refund_proof_url && (
                                <div className="rounded-lg border border-dashed border-border p-4 flex items-center gap-3 text-muted-foreground/50">
                                    <ImageOff className="w-5 h-5" />
                                    <p className="text-xs">No proof attachment uploaded for this refund.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
