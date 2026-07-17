import { format } from "date-fns";

export type InvoiceRenderProps = {
    bill: {
        id: string;
        invoice_number?: string;
        date: string;
        client_name: string;
        client_uhid?: string;
        client_mobile?: string;
        referral_source_name?: string;
        billed_by_name?: string;
        billing_staff_name?: string;
        subtotal?: number;
        amount?: number;
        discount_value?: number;
        discount?: number;
        tax_amount?: number;
        total_amount?: number;
        total?: number;
        status?: string;
        payment_method?: string;
        transaction_id?: string;
        notes?: string;
        include_notes_in_invoice?: boolean;
        organization_logo?: string;
        organization_address?: string;
        organization_official_name?: string;
        items?: Array<{
            id: string;
            name: string;
            amount: number;
            price?: number;
            tax_amount?: number;
            total: number;
            entitlements?: Array<{ service_type: string; default_sessions: number }>;
        }>;
    };
};

export function InvoiceRender({ bill }: InvoiceRenderProps) {
    const orgName = bill.organization_official_name || "Center for Spine & Sports Health (CSSH)";
    const orgAddress = bill.organization_address || "";
    const logoUrl = bill.organization_logo || "";

    const discountAmount = Number(bill.discount_value || bill.discount || 0);
    const taxAmount = Number(bill.tax_amount || 0);
    const subtotal = Number(bill.subtotal || bill.amount || 0);
    const totalAmount = Number(bill.total_amount || bill.total || bill.amount || 0);

    return (
        <div id="print-invoice-box" className="w-full bg-white text-slate-800 border border-slate-300 p-8 font-sans text-xs flex flex-col justify-between" style={{ boxSizing: "border-box", minHeight: "140mm" }}>
            
            {/* Header section with Logo & Organization Details */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="max-h-16 object-contain" />
                    ) : (
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 tracking-tight">{orgName}</span>
                            {orgAddress && <span className="text-[9px] text-slate-400 max-w-[250px] mt-0.5">{orgAddress}</span>}
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <h1 className="text-2xl font-black text-slate-900 tracking-wider">INVOICE</h1>
                </div>
            </div>

            {/* Metadata Info (Bill To vs Invoice details) inside a clean border box */}
            <div className="grid grid-cols-2 gap-4 border border-slate-200 p-4 mb-6 rounded-none bg-slate-50/30">
                <div className="space-y-1 text-[11px]">
                    <h3 className="font-bold text-slate-900 mb-1 text-xs">Bill To:</h3>
                    <p className="font-semibold text-slate-800 uppercase">{bill.client_name}</p>
                    <p className="text-slate-600"><span className="text-slate-400 font-medium">UHID :</span> {bill.client_uhid || "-"}</p>
                    <p className="text-slate-600"><span className="text-slate-400 font-medium">Mobile :</span> {bill.client_mobile || "-"}</p>
                    {bill.referral_source_name && bill.referral_source_name !== "-" && (
                        <p className="text-slate-600"><span className="text-slate-400 font-medium">Referral :</span> {bill.referral_source_name}</p>
                    )}
                </div>

                <div className="space-y-1 text-left pl-6 border-l border-slate-200 text-[11px]">
                    <h3 className="font-bold text-slate-900 mb-1 text-xs">Invoice Details:</h3>
                    <p className="text-slate-600">
                        <span className="text-slate-400 font-medium">Invoice # :</span> {bill.invoice_number || bill.id.substring(0, 8).toUpperCase()}
                    </p>
                    <p className="text-slate-600">
                        <span className="text-slate-400 font-medium">Date :</span> {format(new Date(bill.date), "dd MMM yyyy")}
                    </p>
                    {(bill.billed_by_name || bill.billing_staff_name) && (
                        <p className="text-slate-600">
                            <span className="text-slate-400 font-medium">Billed By:</span> {bill.billed_by_name || bill.billing_staff_name}
                        </p>
                    )}
                </div>
            </div>

            {/* Line Items Table with Border and Dividers */}
            <div className="flex-1 min-h-[50px] mb-6">
                <table className="w-full text-[11px] leading-normal text-left border border-slate-200 border-collapse">
                    <thead>
                        <tr className="bg-[#0d9488] text-white font-bold text-[10px] uppercase tracking-wider">
                            <th className="py-2.5 px-3 border border-slate-200 w-8">#</th>
                            <th className="py-2.5 px-3 border border-slate-200">Description</th>
                            <th className="py-2.5 px-3 border border-slate-200 text-right w-28">Rate</th>
                            <th className="py-2.5 px-3 border border-slate-200 text-right w-28">Tax</th>
                            <th className="py-2.5 px-3 border border-slate-200 text-right w-28">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {bill.items?.map((item, idx) => {
                            const basePrice = Number(item.amount || item.price || 0);
                            const itemTax = Number(item.tax_amount || 0);
                            const total = Number(item.total || (basePrice + itemTax));
                            const taxPercent = basePrice > 0 ? Math.round((itemTax / basePrice) * 100) : 0;

                            return (
                                <tr key={item.id || idx} className="text-slate-700">
                                    <td className="py-3 px-3 border border-slate-200 font-medium align-top">{idx + 1}</td>
                                    <td className="py-3 px-3 border border-slate-200 align-top">
                                        <p className="font-semibold text-slate-800 uppercase">{item.name}</p>
                                        {item.entitlements && item.entitlements.length > 0 && (
                                            <ul className="mt-1 list-none pl-0 text-[10px] text-slate-500 space-y-0.5">
                                                {item.entitlements.map((ent, eIdx) => (
                                                    <li key={eIdx}>• {ent.service_type}: {ent.default_sessions} sessions</li>
                                                ))}
                                            </ul>
                                        )}
                                    </td>
                                    <td className="py-3 px-3 border border-slate-200 text-right align-top font-medium text-slate-600">Rs. {basePrice.toFixed(2)}</td>
                                    <td className="py-3 px-3 border border-slate-200 text-right align-top font-medium text-slate-600">Rs. {itemTax.toFixed(2)} ({taxPercent}%)</td>
                                    <td className="py-3 px-3 border border-slate-200 text-right align-top font-bold text-slate-800">Rs. {total.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Calculations Summary Panel & Footer */}
            <div className="border-t border-slate-200 pt-4 flex flex-col gap-4">
                
                <div className="flex justify-between items-end">
                    {/* Status on Left */}
                    <div className="space-y-1 text-left">
                        {bill.status === "Paid" ? (
                            <span className="text-xs font-black text-emerald-600 uppercase tracking-wide">
                                STATUS: PAID {bill.payment_method ? `VIA ${bill.payment_method.toUpperCase()}` : ""}
                            </span>
                        ) : (
                            <span className="text-xs font-black text-amber-600 uppercase tracking-wide">
                                STATUS: PENDING PAYMENT
                            </span>
                        )}
                        {bill.notes && bill.include_notes_in_invoice && (
                            <p className="text-[10px] text-slate-400 mt-1 max-w-[300px]">Remarks: {bill.notes}</p>
                        )}
                    </div>

                    {/* Totals table on Right */}
                    <div className="w-[240px] text-[11px] font-medium text-slate-500 space-y-1.5">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="text-slate-800 font-semibold">Rs. {subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Total Tax:</span>
                            <span className="text-slate-800 font-semibold">Rs. {taxAmount.toFixed(2)}</span>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-rose-600">
                                <span>Discount:</span>
                                <span>-Rs. {discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xs font-black text-[#0d9488] border-t border-slate-200 pt-2 mt-2">
                            <span className="font-bold">Grand Total:</span>
                            <span className="text-sm font-black">Rs. {totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Brand Label */}
                <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase tracking-wider pt-4 border-t border-slate-100">
                    <div></div>
                    <div className="text-center text-slate-400 font-medium">
                        THANK YOU FOR YOUR BUSINESS! POWERED BY ISHPO
                    </div>
                    <div></div>
                </div>

            </div>

        </div>
    );
}
