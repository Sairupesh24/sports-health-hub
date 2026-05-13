import { apiFetch } from "@/utils/api";
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
    return await apiFetch<any>(`/billing/invoices/${billId}/calculate-refund`);
};

export const processRefund = async (refundData: any) => {
    return await apiFetch<any>('/billing/refunds', {
        method: 'POST',
        data: refundData
    });
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
