import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, Smartphone, CreditCard, Landmark, Receipt, Upload, Loader2, CheckCircle2, AlertCircle, Activity, Tag } from "lucide-react";
import { calculateRefundAmount, processRefund, RefundBreakdown } from "@/lib/refundActions";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck } from "lucide-react";

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

    const [showSuccess, setShowSuccess] = useState(false);
    const [refundRecord, setRefundRecord] = useState<any>(null);

    const [isOverride, setIsOverride] = useState(false);
    const [refundType, setRefundType] = useState<'automatic' | 'full' | 'percentage' | 'flat'>('automatic');
    const [manualValue, setManualValue] = useState<number>(0);
    const [internalRemarks, setInternalRemarks] = useState("");
    
    const [reverseEntitlements, setReverseEntitlements] = useState(true);
    const [authorizedBy, setAuthorizedBy] = useState("");
    const [billTotal, setBillTotal] = useState<number>(0);
    const [calculatedRefund, setCalculatedRefund] = useState<number>(0);

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
        setShowSuccess(false);
        setRefundRecord(null);
        setIsOverride(false);
        setRefundType('automatic');
        setManualValue(0);
        setInternalRemarks("");
        setReverseEntitlements(true);
        setAuthorizedBy("");
        setBillTotal(0);
        setCalculatedRefund(0);
    };

    useEffect(() => {
        let finalAmount = calculatedRefund;
        if (refundType === 'full') {
            finalAmount = billTotal;
        } else if (refundType === 'percentage') {
            finalAmount = (billTotal * (manualValue || 0)) / 100;
        } else if (refundType === 'flat') {
            finalAmount = manualValue || 0;
        }

        // Safety check to prevent UI crash (NaN/undefined)
        const safeAmount = (typeof finalAmount === 'number' && !isNaN(finalAmount)) ? finalAmount : 0;
        setRefundAmount(Number(safeAmount.toFixed(2)));
        setIsOverride(refundType !== 'automatic');
    }, [refundType, manualValue, billTotal, calculatedRefund]);

    const fetchCalculation = async () => {
        setCalculating(true);
        try {
            const result = await calculateRefundAmount(billId, clientId);
            const amt = Number(result.totalRefund.toFixed(2));
            setCalculatedRefund(amt);
            setRefundAmount(amt);
            setBreakdown(result.breakdown);
            setBillTotal(result.billTotal);
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
        const sanitizedName = file.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `${organizationId}/${billId}_${Date.now()}_${sanitizedName}.${fileExt}`;
        const filePath = `refund-proofs/${fileName}`;

        setUploadProgress(30);
        
        const { error: uploadError } = await supabase.storage
            .from('client-documents')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            toast({ 
                title: "File upload failed", 
                description: uploadError.message, 
                variant: "destructive" 
            });
            setIsUploading(false);
            return null;
        }

        setUploadProgress(90);
        const { data: { publicUrl } } = supabase.storage
            .from('client-documents')
            .getPublicUrl(filePath);
        
        setUploadProgress(100);
        setIsUploading(false);
        return publicUrl;
    };

    const handleConfirmRefund = async () => {
        if (isOverride && !authorizedBy.trim()) {
            toast({ title: "Authorization Required", description: "Please enter who authorized this full refund override.", variant: "destructive" });
            return;
        }

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

            const refund = await processRefund({
                billId,
                clientId,
                organizationId,
                amount: refundAmount,
                refundMode,
                transactionId,
                refundProofUrl: proofUrl || undefined,
                notes: internalRemarks || (refundMode === 'Cash' ? (notes ? `Handover Signature: ${notes}` : 'Cash Handover') : notes),
                isOverride,
                authorizedBy: isOverride ? authorizedBy : undefined,
                reverseEntitlements
            });

            setRefundRecord(refund);
            setShowSuccess(true);
            toast({ title: reverseEntitlements ? "Refund completed & entitlements reversed." : "Refund completed. Entitlements retained." });
        } catch (error: any) {
            toast({ title: "Refund failed", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (showSuccess && refundRecord) {
            onSuccess({ ...refundRecord, is_entitlement_reversed: reverseEntitlements });
        }
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            {!showSuccess ? (
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
                            <div className={cn(
                                "border rounded-lg p-4 space-y-3 transition-colors duration-200",
                                isOverride ? "bg-orange-500/5 border-orange-500/20" : "bg-muted/30 border-muted"
                            )}>
                                <div className="flex justify-between items-center text-sm">
                                    <span className={cn("font-medium", isOverride ? "text-orange-700" : "text-muted-foreground")}>
                                        {isOverride ? "Overridden Refund Amount" : "Calculated Refund Amount"}
                                    </span>
                                    {calculating ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    ) : (
                                        <div className="flex flex-col items-end">
                                            <span className={cn("text-lg font-bold", isOverride ? "text-orange-600" : "text-foreground")}>
                                                Rs. {refundAmount.toFixed(2)}
                                            </span>
                                            {isOverride && (
                                                <span className="text-[10px] text-orange-500 font-medium line-through">
                                                    Original calculation: Rs. {calculatedRefund.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {!calculating && breakdown.length > 0 && !isOverride && (
                                    <div className="space-y-1.5 pt-2 border-t">
                                        {breakdown.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-[11px]">
                                                <span className="text-muted-foreground">{item.serviceName} ({item.remaining}/{item.totalPurchased} left)</span>
                                                <span className="font-medium">Rs. {item.calculatedRefund.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {isOverride && (
                                    <div className="pt-2 border-t border-orange-500/10">
                                        <p className="text-[10px] text-orange-600/80 leading-relaxed italic">
                                            Administrative override: Full bill amount is being refunded bypassing session balance checks.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Refund Type Selection */}
                            <div className="space-y-3">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Refund Method</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        variant={refundType === 'automatic' ? "default" : "outline"}
                                        onClick={() => setRefundType('automatic')}
                                        className="h-10 text-xs justify-start px-3"
                                    >
                                        <Activity className="w-3.5 h-3.5 mr-2" />
                                        Automatic (Session-based)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={refundType === 'full' ? "default" : "outline"}
                                        onClick={() => setRefundType('full')}
                                        className="h-10 text-xs justify-start px-3 border-orange-200"
                                    >
                                        <ShieldCheck className="w-3.5 h-3.5 mr-2 text-orange-500" />
                                        Full Bill Refund
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={refundType === 'percentage' ? "default" : "outline"}
                                        onClick={() => setRefundType('percentage')}
                                        className="h-10 text-xs justify-start px-3"
                                    >
                                        <Tag className="w-3.5 h-3.5 mr-2" />
                                        Manual Percentage (%)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={refundType === 'flat' ? "default" : "outline"}
                                        onClick={() => setRefundType('flat')}
                                        className="h-10 text-xs justify-start px-3"
                                    >
                                        <Banknote className="w-3.5 h-3.5 mr-2" />
                                        Manual Flat Amount (Rs)
                                    </Button>
                                </div>
                            </div>

                            {/* Manual Value Input */}
                            {(refundType === 'percentage' || refundType === 'flat') && (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                                    <Label className="text-xs font-bold">
                                        {refundType === 'percentage' ? "Enter Refund Percentage (%)" : "Enter Refund Amount (Rs)"}
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            placeholder={refundType === 'percentage' ? "e.g. 50" : "e.g. 5000"}
                                            value={manualValue || ""}
                                            onChange={e => setManualValue(Number(e.target.value))}
                                            className="h-9 font-bold"
                                        />
                                        <span className="text-sm font-bold text-muted-foreground w-12 text-center">
                                            {refundType === 'percentage' ? "%" : "Rs"}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground italic">
                                        This will override the systematic calculation (Rs. {calculatedRefund.toFixed(2)}).
                                    </p>
                                </div>
                            )}

                            {/* Authorization Field - Conditional */}
                            {isOverride && (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                    <Label className="text-xs text-orange-700 font-bold">Authorized By <span className="text-destructive">*</span></Label>
                                    <Input 
                                        placeholder="e.g. Clinic Director / Dr. Name"
                                        value={authorizedBy}
                                        onChange={e => setAuthorizedBy(e.target.value)}
                                        className="h-9 border-orange-300 focus-visible:ring-orange-500"
                                    />
                                    <p className="text-[9px] text-orange-600">This name will be saved in the audit logs and refund history.</p>
                                </div>
                            )}

                            {/* Entitlement Reversal Choice (New Location) */}
                            <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                        <AlertCircle className="w-4 h-4 text-emerald-600" />
                                    </div>
                                    <div>
                                        <Label className="text-sm font-bold text-emerald-800">Reverse Entitlements</Label>
                                        <p className="text-[10px] text-emerald-600/80 font-medium">Cancel remaining sessions for this refund</p>
                                    </div>
                                </div>
                                <Switch
                                    checked={reverseEntitlements}
                                    onCheckedChange={setReverseEntitlements}
                                    className="data-[state=checked]:bg-emerald-500"
                                />
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
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Internal Remarks (Will not show on PDF)</Label>
                                    <textarea 
                                        placeholder="Add any internal remarks or justification for this refund..."
                                        value={internalRemarks}
                                        onChange={e => setInternalRemarks(e.target.value)}
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">
                                        These remarks are strictly for administrative audit records.
                                    </p>
                                </div>

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
                            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
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
                /* Post-Refund Success Dialog */
                <DialogContent className="sm:max-w-[400px] border-emerald-500/20">
                    <DialogHeader>
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <DialogTitle className="text-center text-xl font-bold">Refund Processed!</DialogTitle>
                        <DialogDescription className="text-center pt-2 text-foreground">
                            The refund of <strong>Rs. {refundAmount.toFixed(2)}</strong> has been recorded.
                            <br /><br />
                            Entitlements: <strong>{reverseEntitlements ? "REVERSED" : "RETAINED"}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col py-4">
                        <Button 
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={handleClose}
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            )}
        </Dialog>
    );
};
