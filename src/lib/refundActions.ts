import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

export interface RefundBreakdown {
    serviceName: string;
    remaining: number;
    totalPurchased: number;
    calculatedRefund: number;
}

export const calculateRefundAmount = async (billId: string, clientId: string) => {
    // 1. Fetch Bill and Package Details
    const { data: bill, error: billError } = await supabase
        .from('bills')
        .select(`
            id, total, amount, discount,
            packages(id, name, price, package_services(service_id, sessions_included, services(name)))
        `)
        .eq('id', billId)
        .single();

    if (billError || !bill) throw new Error("Bill not found or error fetching details.");

    // 2. Fetch current balances for the client
    const { data: balances, error: balanceError } = await supabase.rpc('fn_compute_entitlement_balance', {
        p_client_id: clientId
    });

    if (balanceError) throw new Error("Could not fetch entitlement balances.");

    const pkg = bill.packages as any;
    if (!pkg || !pkg.package_services) return { totalRefund: 0, breakdown: [] };

    let totalRefund = 0;
    const breakdown: RefundBreakdown[] = [];

    // Calculate per-service refund
    for (const ps of pkg.package_services) {
        const serviceName = ps.services?.name || "Session";

        // Find match in balances (fn_compute_entitlement_balance returns service_name)
        const balance = balances.find((b: any) => b.service_name === serviceName);
        
        // We only care about the sessions granted by THIS bill/package, 
        // but the balance is global. This is a simplification. 
        // To be exact, we'd need a specific bill-linked balance.
        // For now, we take the minimum of (purchased sessions in this bill) and (remaining sessions globally).
        const sessionsInThisBill = ps.sessions_included;
        const globalRemaining = balance ? balance.sessions_remaining : sessionsInThisBill;
        
        const remainingForThisBill = Math.min(sessionsInThisBill, globalRemaining);
        
        // Effective price for this service (proportionally)
        // Since packages can have multiple services, we assume uniform pricing or use total package price as base.
        // If package price is 1000 and it has 10 sessions, each is 100.
        // We calculate the proportional weight if there were individual prices, but here we use the package total.
        const packagePrice = pkg.price;
        const discountRatio = bill.total / bill.amount;
        const totalSessionsInPackage = (pkg.package_services as any[]).reduce((sum, item) => sum + item.sessions_included, 0);
        
        const pricePerSession = (packagePrice * discountRatio) / totalSessionsInPackage;
        
        const refundForService = remainingForThisBill * pricePerSession;
        totalRefund += refundForService;
        
        breakdown.push({
            serviceName,
            remaining: remainingForThisBill,
            totalPurchased: sessionsInThisBill,
            calculatedRefund: refundForService
        });
    }

    return { totalRefund, breakdown, billTotal: bill.total };
};

export const processRefund = async (refundData: {
    billId: string;
    clientId: string;
    organizationId: string;
    amount: number;
    refundMode: string;
    transactionId?: string;
    refundProofUrl?: string;
    notes?: string;
    isOverride?: boolean;
    authorizedBy?: string;
    reverseEntitlements: boolean;
}) => {
    // 1. Insert Refund Record
    const { data: refund, error: refundError } = await supabase
        .from('refunds')
        .insert({
            bill_id: refundData.billId,
            client_id: refundData.clientId,
            organization_id: refundData.organizationId,
            amount: refundData.amount,
            refund_mode: refundData.refundMode as any,
            transaction_id: refundData.transactionId,
            refund_proof_url: refundData.refundProofUrl,
            notes: refundData.notes,
            is_override: refundData.isOverride || false,
            authorized_by: refundData.authorizedBy || null,
            is_entitlement_reversed: refundData.reverseEntitlements
        })
        .select()
        .single();

    if (refundError) throw refundError;

    // 2. Conditionally Reverse Entitlements
    if (refundData.reverseEntitlements) {
        // This usually involves finding the specific row in client_service_entitlements 
        // linked to this bill's purchase and reducing sessions_allowed.
        // Since multiple packages might be in one bill (though the current UI inserts one bill per package),
        // we hunt by invoice_id / bill_id.
        
        const { error: revError } = await supabase
            .from('client_entitlements')
            .update({ status: 'Cancelled', notes: `Refunded on ${format(new Date(), 'dd/MM/yyyy')}` })
            .eq('invoice_id', refundData.billId);
            
        if (revError) {
            console.error("Error reversing entitlements, but refund record was created:", revError);
            toast({ title: "Refund recorded, but error reversing entitlements.", variant: "destructive" });
        }
    }

    return refund;
};

export const generateRefundVoucher = (orgName: string, clientName: string, refund: any) => {
    const d = new jsPDF();

    // Header
    d.setFontSize(22);
    d.setTextColor(15, 23, 42); 
    d.text(orgName, 14, 25);

    d.setFontSize(14);
    d.setTextColor(239, 68, 68); // red-500 for refund
    d.text("REFUND VOUCHER", 150, 25);

    // Details
    d.setFontSize(10);
    d.setTextColor(71, 85, 105);
    d.text(`Voucher # : ${refund.id.substring(0, 8).toUpperCase()}`, 14, 38);
    d.text(`Date : ${format(new Date(refund.created_at), "dd MMM yyyy, hh:mm a")}`, 14, 44);
    d.text(`Original Invoice ID : ${refund.bill_id}`, 14, 50);

    // Bill To
    d.setFontSize(11);
    d.setTextColor(15, 23, 42);
    d.text("Refund Receipt For:", 14, 62);

    d.setFontSize(10);
    d.setTextColor(71, 85, 105);
    d.text(clientName, 14, 69);

    // Table Content
    const tableData = [[
        "Refund of Services", 
        refund.refund_mode, 
        `Rs. ${Number(refund.amount).toFixed(2)}`
    ]];

    autoTable(d, {
        startY: 80,
        head: [["Description", "Mode", "Amount"]],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [239, 68, 68] }, 
    });

    let finalY = (d as any).lastAutoTable.finalY + 15;

    if (refund.transaction_id) {
        d.setFontSize(10);
        d.setTextColor(15, 23, 42);
        d.text(`Transaction ID: ${refund.transaction_id}`, 14, finalY);
        finalY += 8;
    }

    if (refund.notes) {
        d.setFontSize(9);
        d.setTextColor(71, 85, 105);
        d.text(`Notes: ${refund.notes}`, 14, finalY);
    }

    // Footer
    d.setFontSize(9);
    d.setTextColor(148, 163, 184);
    d.text("This is a computer generated document.", 105, 280, { align: "center" });

    d.save(`Refund_Voucher_${refund.id.substring(0, 8)}.pdf`);
};
