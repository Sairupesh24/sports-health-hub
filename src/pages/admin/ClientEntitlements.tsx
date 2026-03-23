import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, CheckCircle, Activity, Package } from 'lucide-react';

interface ClientEntitlementsProps {
    clientId: string;
}

export const ClientEntitlements: React.FC<ClientEntitlementsProps> = ({ clientId }) => {
    const [balances, setBalances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBalances = async () => {
            if (!clientId) return;
            setLoading(true);
            try {
                // Call the new dynamic entitlement balance RPC
                const { data, error } = await supabase.rpc('fn_compute_entitlement_balance', {
                    p_client_id: clientId
                });
                
                if (error) throw error;
                setBalances(data || []);
            } catch (error: any) {
                console.error("Error fetching entitlements:", error.message);
            } finally {
                setLoading(false);
            }
        };
        
        fetchBalances();
    }, [clientId]);

    return (
        <Card className="gradient-card border-border">
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Service Entitlements
                </CardTitle>
                <CardDescription>
                    Real-time balance of purchased sessions and consumed entitlements.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex animate-pulse space-x-4 p-4">
                        <div className="flex-1 space-y-4 py-1">
                            <div className="h-4 bg-muted rounded w-3/4"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-muted rounded"></div>
                                <div className="h-4 bg-muted rounded w-5/6"></div>
                            </div>
                        </div>
                    </div>
                ) : balances.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-xl border border-dashed border-border/60">
                        <ShieldAlert className="w-12 h-12 text-muted-foreground mb-4 opacity-30" />
                        <p className="text-base font-semibold text-foreground">No Active Entitlements</p>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                            This patient does not have any active packages or purchased sessions on record.
                        </p>
                    </div>
                ) : (
                    <div className="rounded-xl border overflow-hidden">
                        <Table className="w-full text-sm">
                            <TableHeader>
                                <TableRow className="bg-muted/60 hover:bg-muted/60">
                                    <TableHead className="font-semibold text-foreground">Service Level</TableHead>
                                    <TableHead className="text-center font-semibold text-foreground">Total Purchased</TableHead>
                                    <TableHead className="text-center font-semibold text-foreground">Sessions Used</TableHead>
                                    <TableHead className="text-right font-semibold text-foreground pr-6">Remaining</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {balances.map((row: any) => (
                                    <TableRow key={row.service_id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium text-foreground flex items-center gap-2.5 py-4">
                                            <div className="p-1.5 rounded-md bg-primary/10">
                                                <Activity className="w-4 h-4 text-primary" />
                                            </div>
                                            {row.service_name}
                                        </TableCell>
                                        <TableCell className="text-center text-muted-foreground py-4 text-base">
                                            {row.total_purchased}
                                        </TableCell>
                                        <TableCell className="text-center text-muted-foreground py-4 text-base">
                                            {row.sessions_used}
                                        </TableCell>
                                        <TableCell className="text-right py-4 pr-6">
                                            {row.sessions_remaining > 0 ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-medium whitespace-nowrap">
                                                    <CheckCircle className="w-4 h-4" />
                                                    {row.sessions_remaining} remaining
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 font-medium whitespace-nowrap">
                                                    0 remaining
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
