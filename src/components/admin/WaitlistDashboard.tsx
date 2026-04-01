import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VIPName } from "@/components/ui/VIPBadge";
import { format, isAfter } from "date-fns";
import { Loader2, Phone, CheckCircle, XCircle, Bell, Clock, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function WaitlistDashboard() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [waitlist, setWaitlist] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchWaitlist = async () => {
        if (!profile?.organization_id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("waitlist")
                .select(`
                    *,
                    client:clients(id, first_name, last_name, is_vip, uhid, mobile_no),
                    therapist:profiles!waitlist_therapist_id_fkey(first_name, last_name),
                    service:services(name)
                `)
                .eq("organization_id", profile.organization_id)
                .order("created_at", { ascending: true });

            if (error) throw error;
            setWaitlist(data || []);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWaitlist();
        
        // Real-time subscription
        const channel = supabase
            .channel('waitlist_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' }, () => {
                fetchWaitlist();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.organization_id]);

    const handleAction = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from("waitlist")
                .update({ status: newStatus })
                .eq("id", id);
            
            if (error) throw error;
            toast({ title: "Success", description: `Waitlist item marked as ${newStatus}.` });
        } catch (error: any) {
            toast({ title: "Action Failed", description: error.message, variant: "destructive" });
        }
    };

    const filteredWaitlist = waitlist.filter(item => {
        const clientName = `${item.client?.first_name} ${item.client?.last_name}`.toLowerCase();
        const therapistName = item.therapist ? `Dr. ${item.therapist.first_name} ${item.therapist.last_name}`.toLowerCase() : "anyone";
        return clientName.includes(searchTerm.toLowerCase()) || therapistName.includes(searchTerm.toLowerCase());
    });

    const getStatusBadge = (status: string, expires_at?: string) => {
        const isExpired = expires_at && isAfter(new Date(), new Date(expires_at));
        
        switch (status) {
            case 'Waiting': return <Badge variant="outline" className="bg-slate-100 text-slate-800">Waiting</Badge>;
            case 'Notified': 
                return (
                    <Badge variant="outline" className={isExpired ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200"}>
                        {isExpired ? "Expired" : "Notified"}
                    </Badge>
                );
            case 'Filled': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Filled</Badge>;
            case 'Expired': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Expired</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search patient or therapist..." 
                        className="pl-10" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchWaitlist} className="h-9">
                        <Loader2 className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            <Card className="border-border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/30">
                        <TableRow>
                            <TableHead className="w-[200px]">Patient</TableHead>
                            <TableHead>Requested Specialist</TableHead>
                            <TableHead>Requested Slot</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Added On</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && waitlist.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                        <span>Loading waitlist...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredWaitlist.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                    No patients found on the waitlist.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredWaitlist.map((item) => (
                                <TableRow key={item.id} className="group hover:bg-muted/20 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <div className="font-semibold text-foreground">
                                                <VIPName name={`${item.client?.first_name} ${item.client?.last_name}`} isVIP={item.client?.is_vip} />
                                            </div>
                                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{item.client?.uhid}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {item.therapist ? `Dr. ${item.therapist.first_name} ${item.therapist.last_name}` : <span className="text-muted-foreground italic">Any Specialist</span>}
                                        <div className="text-xs text-muted-foreground">{item.service?.name || "Standard Session"}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{format(new Date(item.preferred_date), "MMM d, yyyy")}</span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {item.preferred_time_slot.substring(0, 5)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            {getStatusBadge(item.status, item.expires_at)}
                                            {item.status === 'Notified' && item.expires_at && !isAfter(new Date(), new Date(item.expires_at)) && (
                                                <span className="text-[10px] text-orange-600 font-medium whitespace-nowrap">
                                                    Expires in {Math.max(0, Math.ceil((new Date(item.expires_at).getTime() - Date.now()) / 60000))}m
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {format(new Date(item.created_at), "MMM d, HH:mm")}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            {item.status === 'Waiting' && (
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" title="Manually Notify">
                                                    <Bell className="w-4 h-4" onClick={() => handleAction(item.id, 'Notified')} />
                                                </Button>
                                            )}
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" title="Mark as Filled">
                                                <CheckCircle className="w-4 h-4" onClick={() => handleAction(item.id, 'Filled')} />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" title="Remove">
                                                <XCircle className="w-4 h-4" onClick={() => handleAction(item.id, 'Expired')} />
                                            </Button>
                                            <a href={`tel:${item.client?.mobile_no}`} className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-muted-foreground transition-colors">
                                                <Phone className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}

// Utility function if not already in @/lib/utils
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
