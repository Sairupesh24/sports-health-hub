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
    // 1. Fetch Bill and Package Details via bill_items
    const { data: bill, error: billError } = await (supabase as any)
        .from('bills')
        .select(`
            id, total, amount, discount,
            bill_items(
                id, total, amount, 
                packages(id, name, price, package_services(service_id, sessions_included, services(name)))
            )
        `)
        .eq('id', billId)
        .single();

    if (billError || !bill) throw new Error("Bill not found or error fetching details.");

    // 2. Fetch current balances for the client
    const { data: balances, error: balanceError } = await supabase.rpc('fn_compute_entitlement_balance', {
        p_client_id: clientId
    });

    if (balanceError) throw new Error("Could not fetch entitlement balances.");

    let totalRefund = 0;
    const breakdown: RefundBreakdown[] = [];

    const items = (bill.bill_items as any[]) || [];
    
    for (const item of items) {
        const pkg = item.packages;
        if (!pkg || !pkg.package_services) continue;

        const itemSubtotal = item.amount || 1;
        const itemTotal = item.total || 0;
        const itemDiscountRatio = itemTotal / itemSubtotal;

        for (const ps of pkg.package_services) {
            const serviceName = ps.services?.name || "Session";
            const balance = balances.find((b: any) => b.service_name === serviceName);
            
            const sessionsInThisItem = ps.sessions_included;
            const globalRemaining = balance ? balance.sessions_remaining : sessionsInThisItem;
            
            // Proportional sessions for this item
            const remainingForThisItem = Math.min(sessionsInThisItem, globalRemaining);
            
            const totalSessionsInPackage = (pkg.package_services as any[]).reduce((sum, s) => sum + s.sessions_included, 0);
            const pricePerSession = (itemTotal) / (totalSessionsInPackage || 1);
            
            const refundForService = remainingForThisItem * pricePerSession;
            totalRefund += refundForService;
            
            breakdown.push({
                serviceName: `${pkg.name}: ${serviceName}`,
                remaining: remainingForThisItem,
                totalPurchased: sessionsInThisItem,
                calculatedRefund: refundForService
            });
        }
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

export const generateRefundVoucher = (orgName: string, clientName: string, refund: any, isEntitlementReversed?: boolean) => {
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


    // Entitlement Status Section
    finalY += 4;
    d.setDrawColor(226, 232, 240);
    d.line(14, finalY, 196, finalY);
    finalY += 6;
    d.setFontSize(9);
    d.setTextColor(71, 85, 105);
    d.text(`Entitlement Status:`, 14, finalY);
    
    const entitlementReversed = isEntitlementReversed ?? refund.is_entitlement_reversed;
    if (entitlementReversed) {
        d.setTextColor(16, 185, 129); // emerald
        d.text(`\u2713 Reversed — Remaining sessions cancelled upon refund`, 55, finalY);
    } else {
        d.setTextColor(245, 158, 11); // amber
        d.text(`\u2014 Retained — Client session balance kept active`, 55, finalY);
    }

    // Footer
    d.setFontSize(9);
    d.setTextColor(148, 163, 184);
    d.text("This is a computer generated document.", 105, 280, { align: "center" });

    d.save(`Refund_Voucher_${refund.id.substring(0, 8)}.pdf`);
};
