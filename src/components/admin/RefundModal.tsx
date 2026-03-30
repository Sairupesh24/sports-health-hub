import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, Smartphone, CreditCard, Landmark, Receipt, Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { calculateRefundAmount, processRefund, RefundBreakdown } from "@/lib/refundActions";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface RefundModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    billId: string;
    clientId: string;
    clientName: string;
    organizationId: string;
    onSuccess: (refund: any) => void;
}

export const RefundModal = ({ isOpen, onOpenChange, billId, clientId, clientName, organizationId, onSuccess }: RefundModalProps) => {
    const [loading, setLoading] = useState(false);
    const [calculating, setCalculating] = useState(true);
    const [refundAmount, setRefundAmount] = useState<number>(0);
    const [breakdown, setBreakdown] = useState<RefundBreakdown[]>([]);
    
    const [refundMode, setRefundMode] = useState<string>("");
    const [transactionId, setTransactionId] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    
    const [file, setFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    const [showEntitlementPrompt, setShowEntitlementPrompt] = useState(false);
    const [refundRecord, setRefundRecord] = useState<any>(null);

    useEffect(() => {
        if (isOpen && billId && clientId) {
            fetchCalculation();
        } else {
            resetForm();
        }
    }, [isOpen, billId, clientId]);

    const resetForm = () => {
        setRefundAmount(0);
        setBreakdown([]);
        setRefundMode("");
        setTransactionId("");
        setNotes("");
        setFile(null);
        setUploadProgress(0);
        setIsUploading(false);
        setShowEntitlementPrompt(false);
        setRefundRecord(null);
    };

    const fetchCalculation = async () => {
        setCalculating(true);
        try {
            const result = await calculateRefundAmount(billId, clientId);
            setRefundAmount(Number(result.totalRefund.toFixed(2)));
            setBreakdown(result.breakdown);
        } catch (error: any) {
            toast({ title: "Error calculating refund", description: error.message, variant: "destructive" });
        } finally {
            setCalculating(false);
        }
    };

    const handleFileUpload = async () => {
        if (!file) return null;
        
        setIsUploading(true);
        setUploadProgress(10);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${organizationId}/${billId}_${Date.now()}.${fileExt}`;
        const filePath = `refund-proofs/${fileName}`;

        setUploadProgress(30);
        
        const { error: uploadError, data } = await supabase.storage
            .from('client-documents') // Recalibrate: using existing bucket if specifically named one doesn't exist
            .upload(filePath, file);

        if (uploadError) {
            // If it's a bucket missing error, we just log and return null but let the refund proceed
            console.error("Upload error:", uploadError);
            setIsUploading(false);
            return null;
        }

        setUploadProgress(100);
        setIsUploading(false);
        
        const { data: { publicUrl } } = supabase.storage
            .from('client-documents')
            .getPublicUrl(filePath);
            
        return publicUrl;
    };

    const handleConfirmRefund = async () => {
        if (!refundMode) {
            toast({ title: "Please select a refund mode", variant: "destructive" });
            return;
        }

        if ((refundMode === "UPI" || refundMode === "Online Bank Transfer") && !transactionId.trim()) {
            toast({ title: `Transaction ID is required for ${refundMode}`, variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const proofUrl = await handleFileUpload();

            // We don't reverse entitlements yet, we'll ask in the second prompt
            const refund = await processRefund({
                billId,
                clientId,
                organizationId,
                amount: refundAmount,
                refundMode,
                transactionId,
                refundProofUrl: proofUrl || undefined,
                notes: refundMode === 'Cash' ? (notes ? `Handover Signature: ${notes}` : 'Cash Handover') : notes,
                reverseEntitlements: false
            });

            setRefundRecord(refund);
            setShowEntitlementPrompt(true);
        } catch (error: any) {
            toast({ title: "Refund failed", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleEntitlementChoice = async (reverse: boolean) => {
        if (reverse && refundRecord) {
            setLoading(true);
            try {
                // Update the refund record and trigger reversal
                const { error } = await supabase
                    .from('refunds')
                    .update({ is_entitlement_reversed: true })
                    .eq('id', refundRecord.id);

                if (error) throw error;

                // Re-call processRefund logic specifically for reversal 
                // (In a real app, this might be a single RPC call, 
                // but here we manually update the entitlement status)
                await supabase
                    .from('client_entitlements')
                    .update({ status: 'Cancelled', notes: `Refunded & Reversed on ${new Date().toLocaleDateString()}` })
                    .eq('invoice_id', billId);

                toast({ title: "Refund completed & entitlements reversed." });
            } catch (error: any) {
                toast({ title: "Error reversing entitlements", description: error.message, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        } else {
            toast({ title: "Refund completed. Entitlements retained." });
        }

        onSuccess({ ...refundRecord, is_entitlement_reversed: reverse });
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            {!showEntitlementPrompt ? (
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <div className="p-6 pb-2 border-b">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <Receipt className="w-5 h-5 text-primary" />
                                Process Refund
                            </DialogTitle>
                            <DialogDescription>
                                Issue a refund for <strong>{clientName}</strong> linked to Invoice <strong>#{billId.substring(0, 8)}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
                        <div className="space-y-6 p-6">
                            {/* Calculation Summary */}
                            <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-muted-foreground font-medium">Calculated Refund Amount</span>
                                    {calculating ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    ) : (
                                        <span className="text-lg font-bold text-foreground">Rs. {refundAmount.toFixed(2)}</span>
                                    )}
                                </div>
                                
                                {!calculating && breakdown.length > 0 && (
                                    <div className="space-y-1.5 pt-2 border-t">
                                        {breakdown.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-[11px]">
                                                <span className="text-muted-foreground">{item.serviceName} ({item.remaining}/{item.totalPurchased} left)</span>
                                                <span className="font-medium">Rs. {item.calculatedRefund.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Form Inputs */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Select Refund Mode <span className="text-destructive">*</span></Label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { id: 'Cash', icon: Banknote, label: 'Cash' },
                                            { id: 'UPI', icon: Smartphone, label: 'UPI' },
                                            { id: 'Online Bank Transfer', icon: Landmark, label: 'Bank' },
                                            { id: 'Clinic Credit', icon: CreditCard, label: 'Credit' }
                                        ].map((mode) => (
                                            <Button
                                                key={mode.id}
                                                type="button"
                                                variant={refundMode === mode.id ? "default" : "outline"}
                                                onClick={() => setRefundMode(mode.id)}
                                                className="h-16 flex flex-col gap-1 p-1 text-[10px]"
                                            >
                                                <mode.icon className="w-5 h-5" />
                                                {mode.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {(refundMode === "UPI" || refundMode === "Online Bank Transfer") && (
                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                        <Label className="text-xs">Transaction/Reference ID <span className="text-destructive">*</span></Label>
                                        <Input 
                                            placeholder="Enter reference ID"
                                            value={transactionId}
                                            onChange={e => setTransactionId(e.target.value)}
                                            className="h-9"
                                        />
                                    </div>
                                )}

                                {refundMode === "Cash" && (
                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                        <Label className="text-xs">Handover Signature/Note</Label>
                                        <Input 
                                            placeholder="e.g. Received by patient"
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            className="h-9"
                                        />
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Audit trail: mention who signed for the cash.
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2 pt-2">
                                    <Label className="text-xs">Refund Proof (Receipt/Screenshot)</Label>
                                    <div className={cn(
                                        "border-2 border-dashed rounded-lg p-4 transition-colors flex flex-col items-center justify-center gap-2",
                                        file ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
                                    )}>
                                        {file ? (
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-medium truncate max-w-[200px]">{file.name}</span>
                                                <Button variant="ghost" size="sm" className="h-6 text-destructive" onClick={() => setFile(null)}>Remove</Button>
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-6 h-6 text-muted-foreground" />
                                                <label className="cursor-pointer">
                                                    <span className="text-xs text-primary font-bold hover:underline">Click to upload</span>
                                                    <input 
                                                        type="file" 
                                                        className="hidden" 
                                                        accept=".jpg,.jpeg,.png,.pdf" 
                                                        onChange={e => setFile(e.target.files?.[0] || null)}
                                                    />
                                                </label>
                                                <p className="text-[10px] text-muted-foreground">JPG, PNG, or PDF</p>
                                            </>
                                        )}
                                    </div>
                                    {isUploading && (
                                        <div className="space-y-1">
                                            <Progress value={uploadProgress} className="h-1" />
                                            <p className="text-[9px] text-center text-muted-foreground">Uploading proof...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 pt-2 border-t">
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button 
                                className="bg-primary hover:bg-primary/90"
                                onClick={handleConfirmRefund}
                                disabled={loading || calculating || !refundMode}
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Confirm Refund
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            ) : (
                /* Post-Refund Entitlement Reversal Prompt */
                <DialogContent className="sm:max-w-[400px] border-emerald-500/20">
                    <DialogHeader>
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <DialogTitle className="text-center text-xl font-bold">Refund Successful!</DialogTitle>
                        <DialogDescription className="text-center pt-2 text-foreground">
                            The refund of <strong>Rs. {refundAmount.toFixed(2)}</strong> has been recorded.
                            <br /><br />
                            Would you like to <strong>reverse the remaining entitlements</strong> from the client's account now?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-2 py-4">
                        <Button 
                            variant="default" 
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleEntitlementChoice(true)}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Yes, Reverse Entitlements
                        </Button>
                        <Button 
                            variant="outline"
                            onClick={() => handleEntitlementChoice(false)}
                            disabled={loading}
                        >
                            No, Keep Entitlements Active
                        </Button>
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground italic">
                        The original Invoice status will remain "Paid" as per accounting rules.
                    </p>
                </DialogContent>
            )}
        </Dialog>
    );
};
