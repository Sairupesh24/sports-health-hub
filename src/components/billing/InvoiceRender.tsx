import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface InvoiceRenderProps {
    transaction: {
        id: string;
        date: string;
        client_name: string;
        client_uhid?: string;
        amount: number;
        status?: string;
        package_name?: string;
        payment_method?: string;
        transaction_id?: string;
        referral_source?: string;
        billing_staff?: string;
        notes?: string;
        discount_value?: number;
        discount_authorized_by?: string;
        items?: any[];
    };
    orgDetails?: {
        official_name?: string;
        name?: string;
        official_address?: string;
        logo_url?: string;
    } | null;
}

export function InvoiceRender({ transaction, orgDetails }: InvoiceRenderProps) {
    const orgDisplayName = orgDetails?.official_name || orgDetails?.name || "Integrated Sports Clinic";
    const orgAddress = orgDetails?.official_address || "123 Sports Health Way, Hub City";
    
    // Sum of items base price
    const subtotal = transaction.items?.reduce((sum, item) => sum + Number(item.amount || item.price || 0), 0) || transaction.amount;
    // Sum of items tax
    const totalTax = transaction.items?.reduce((sum, item) => sum + Number(item.tax_amount || 0), 0) || 0;
    
    return (
        <div 
            className="invoice-container-halfpage border border-gray-300 rounded-md p-4 bg-white text-black font-sans flex flex-col justify-between"
            style={{ 
                height: '148mm', 
                maxHeight: '148mm', 
                width: '100%', 
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                color: '#000000',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
        >
            <div className="space-y-3">
                {/* Header Grid: Logo/Title and Invoice Details */}
                <div className="grid grid-cols-2 border-b border-gray-200 pb-2 gap-4">
                    <div>
                        <h2 className="text-xs font-bold text-teal-800 tracking-wide uppercase">{orgDisplayName}</h2>
                        <p className="text-[9px] text-gray-500 leading-normal">{orgAddress}</p>
                        <div className="text-xs font-bold text-gray-900 mt-1.5 tracking-wider">INVOICE</div>
                    </div>
                    <div className="text-right border-l border-gray-100 pl-4">
                        <div className="text-[9px] text-gray-400 uppercase font-bold tracking-widest">Invoice Details</div>
                        <div className="text-[10px] font-bold text-gray-900 mt-1">Invoice #: {transaction.id.substring(0, 8).toUpperCase()}</div>
                        <div className="text-[9px] text-gray-600 mt-0.5">Date: {format(new Date(transaction.date), "dd MMM yyyy")}</div>
                        <div className="text-[9px] text-gray-600 mt-0.5">Billed By: {transaction.billing_staff || "Staff"}</div>
                    </div>
                </div>

                {/* Client Billing Info */}
                <div className="grid grid-cols-2 border-b border-gray-200 pb-2 gap-4">
                    <div>
                        <div className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Bill To:</div>
                        <div className="text-[11px] font-bold text-gray-800">{transaction.client_name}</div>
                        {transaction.client_uhid && <div className="text-[9px] text-gray-500 font-mono mt-0.5">UHID: {transaction.client_uhid}</div>}
                    </div>
                    <div className="text-right">
                        <div className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">Payment Details:</div>
                        <div className="text-[11px] font-semibold text-gray-800">{transaction.payment_method || "Pending"}</div>
                        {transaction.transaction_id && <div className="text-[9px] text-gray-500 mt-0.5">Txn: {transaction.transaction_id}</div>}
                        <div className="text-[9px] mt-1">
                            <span className={cn(
                                "inline-flex items-center px-1.5 py-0.2 rounded-full text-[8px] font-bold border uppercase",
                                transaction.status === "Paid"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                                {transaction.status || "PENDING"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="border border-gray-200 rounded overflow-hidden">
                    <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[8px]">
                                <th className="p-1 px-2 border-r border-gray-200">#</th>
                                <th className="p-1 px-2 border-r border-gray-200 w-3/5">Description</th>
                                <th className="p-1 px-2 text-right border-r border-gray-200">Rate</th>
                                <th className="p-1 px-2 text-right border-r border-gray-200">Tax</th>
                                <th className="p-1 px-2 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {transaction.items && transaction.items.length > 0 ? (
                                transaction.items.map((item, idx) => {
                                    const basePrice = Number(item.amount || item.price || 0);
                                    const tax = Number(item.tax_amount || 0);
                                    const disc = Number(item.discount || 0);
                                    const lineTotal = basePrice + tax - disc;
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50/50">
                                            <td className="p-1 px-2 border-r border-gray-200 text-gray-500">{idx + 1}</td>
                                            <td className="p-1 px-2 border-r border-gray-200 font-medium text-gray-800">{item.name || item.package_name}</td>
                                            <td className="p-1 px-2 text-right border-r border-gray-200 text-gray-600 font-mono">Rs.{basePrice.toFixed(2)}</td>
                                            <td className="p-1 px-2 text-right border-r border-gray-200 text-gray-600 font-mono">Rs.{tax.toFixed(2)}</td>
                                            <td className="p-1 px-2 text-right font-bold text-gray-900 font-mono">Rs.{lineTotal.toFixed(2)}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td className="p-1 px-2 border-r border-gray-200 text-gray-500">1</td>
                                    <td className="p-1 px-2 border-r border-gray-200 font-medium text-gray-800">{transaction.package_name || "Service Package"}</td>
                                    <td className="p-1 px-2 text-right border-r border-gray-200 text-gray-600 font-mono">Rs.{(subtotal).toFixed(2)}</td>
                                    <td className="p-1 px-2 text-right border-r border-gray-200 text-gray-600 font-mono">Rs.{totalTax.toFixed(2)}</td>
                                    <td className="p-1 px-2 text-right font-bold text-gray-900 font-mono">Rs.{transaction.amount.toFixed(2)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bottom Section: Totals, Remarks & Footer */}
            <div className="space-y-1.5 border-t border-gray-200 pt-2 mt-auto">
                <div className="flex justify-between items-end gap-4">
                    <div className="max-w-[60%]">
                        {transaction.notes && (
                            <div className="text-[8px] text-gray-500 italic bg-gray-50 p-1 rounded border border-gray-100 leading-normal">
                                <span className="font-bold not-italic">Notes:</span> {transaction.notes}
                            </div>
                        )}
                    </div>
                    <div className="w-[40%] space-y-0.5 text-right text-[10px] shrink-0 border-l border-gray-100 pl-3">
                        <div className="flex justify-between text-gray-600">
                            <span>Subtotal:</span>
                            <span className="font-mono">Rs. {subtotal.toFixed(2)}</span>
                        </div>
                        {totalTax > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Tax:</span>
                                <span className="font-mono">Rs. {totalTax.toFixed(2)}</span>
                            </div>
                        )}
                        {(transaction.discount_value ?? 0) > 0 && (
                            <div className="flex justify-between text-gray-600">
                                <span>Discount:</span>
                                <span className="font-mono">-Rs. {Number(transaction.discount_value).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-[11px] border-t border-gray-200 pt-1 text-teal-800 mt-1">
                            <span>Grand Total:</span>
                            <span className="font-mono">Rs. {transaction.amount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                {/* Clinic Footer */}
                <div className="text-[7px] text-center text-gray-400 border-t border-gray-100 pt-1 uppercase tracking-wide">
                    Thank you for choosing {orgDisplayName}! Powered by ISHPO
                </div>
            </div>
        </div>
    );
}
