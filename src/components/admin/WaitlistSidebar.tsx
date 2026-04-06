import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
    Loader2, Phone, CheckCircle, Bell, Clock, User, UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { VIPName } from "@/components/ui/VIPBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface Props {
    selectedDate: Date;
    onBook: (waitlistItem: any) => void;
}

export function WaitlistSidebar({ selectedDate, onBook }: Props) {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [waitlist, setWaitlist] = useState<any[]>([]);

    const fetchWaitlist = async () => {
        if (!profile?.organization_id) return;
        setLoading(true);
        try {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const { data, error } = await supabase
                .from("waitlist")
                .select(`
                    *,
                    client:clients(id, first_name, last_name, is_vip, uhid, mobile_no),
                    therapist:profiles!waitlist_therapist_id_fkey(first_name, last_name),
                    service:services(name)
                `)
                .eq("organization_id", profile.organization_id)
                .eq("preferred_date", dateStr)
                .eq("status", "Waiting")
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

        const channel = supabase
            .channel('waitlist_sidebar_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' }, () => {
                fetchWaitlist();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedDate, profile?.organization_id]);

    const handleNotify = async (id: string) => {
        try {
            const { error } = await supabase
                .from("waitlist")
                .update({ status: 'Notified' })
                .eq("id", id);
            
            if (error) throw error;
            toast({ title: "Patient Notified", description: "Waitlist status updated." });
        } catch (error: any) {
            toast({ title: "Action Failed", description: error.message, variant: "destructive" });
        }
    };

    return (
        <div className="flex flex-col h-full bg-white/40 backdrop-blur-md border-l border-border/50 shadow-2xl animate-in slide-in-from-right duration-300 w-[300px]">
            <div className="p-4 bg-primary/5 border-b border-primary/10">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-display font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Active Waitlist
                    </h3>
                    <Badge variant="outline" className="text-[9px] bg-primary/10 border-primary/20 text-primary">{waitlist.length} Waiting</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground italic">{format(selectedDate, "EEEE, MMM d")}</p>
            </div>

            <ScrollArea className="flex-1 px-4">
                <div className="py-4 space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Loading Queue</span>
                        </div>
                    ) : waitlist.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-2 opacity-50">
                            <User className="w-10 h-10 text-muted-foreground/30" />
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-tight">Empty Queue</p>
                            <p className="text-[10px] text-muted-foreground">No patients waiting for this date.</p>
                        </div>
                    ) : (
                        waitlist.map((item) => (
                            <div 
                                key={item.id} 
                                className={cn(
                                    "group relative p-3 rounded-xl border transition-all hover:shadow-lg hover:-translate-y-0.5",
                                    item.client?.is_vip 
                                        ? "bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-amber-500/5" 
                                        : "bg-white/80 border-border/50"
                                )}
                            >
                                {item.client?.is_vip && (
                                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse border border-amber-900/10" />
                                )}

                                <div className="space-y-2">
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                            <VIPName name={`${item.client?.first_name} ${item.client?.last_name}`} isVIP={item.client?.is_vip} className="text-sm font-bold" />
                                            <span className="text-[9px] font-mono text-muted-foreground font-bold tracking-widest">{item.client?.uhid}</span>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] h-5 bg-white border-primary/20 text-primary font-mono font-normal">
                                            {item.preferred_time_slot.substring(0, 5)}
                                        </Badge>
                                    </div>

                                    <div className="text-[10px] space-y-0.5">
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                            <span className="font-semibold uppercase text-foreground/80">Dr. {item.therapist?.last_name || "Any Specialist"}</span>
                                        </div>
                                        <div className="text-[9px] pl-3 italic opacity-60">{item.service?.name || "Standard Session"}</div>
                                    </div>

                                    <div className="flex gap-1.5 pt-1 mt-2 border-t border-dashed border-primary/10">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="h-8 flex-1 text-[10px] font-bold uppercase tracking-tight hover:bg-primary/5 hover:text-primary transition-colors"
                                            onClick={() => handleNotify(item.id)}
                                        >
                                            <Bell className="w-3 h-3 mr-1.5" /> Notify
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="default" 
                                            className="h-8 flex-1 text-[10px] font-bold uppercase tracking-tight bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10"
                                            onClick={() => onBook(item)}
                                        >
                                            <UserPlus className="w-3 h-3 mr-1.5" /> Book
                                        </Button>
                                    </div>

                                    <a 
                                        href={`tel:${item.client?.mobile_no}`} 
                                        className="absolute -right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary text-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:right-2 transition-all p-0"
                                    >
                                        <Phone className="w-3.5 h-3.5 fill-white" />
                                    </a>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            <div className="p-3 border-t border-border bg-muted/20">
                <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-widest">Administrator Manual Sync</p>
            </div>
        </div>
    );
}
