import { useState, useEffect } from "react";
import { apiFetch } from "@/utils/api";
import { formatStaffName } from "@/utils/serviceMapping";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
    Loader2, Phone, CheckCircle, Bell, Clock, User, UserPlus, ChevronLeft, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { VIPName } from "@/components/ui/VIPBadge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
    selectedDate: Date;
    onBook: (waitlistItem: any) => void;
}

export function WaitlistSidebar({ selectedDate, onBook }: Props) {
    const { profile }       = useAuth();
    const { toast }         = useToast();
    const [loading, setLoading]     = useState(true);
    const [waitlist, setWaitlist]   = useState<any[]>([]);
    
    // Default to collapsed strip mode as requested
    const [collapsed, setCollapsed] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    const isExpanded = !collapsed || isHovered;

    const fetchWaitlist = async () => {
        if (!profile?.organization_id) return;
        setLoading(true);
        try {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const data = await apiFetch<any[]>('/appointments/waitlist', {
                params: { start: dateStr, end: dateStr, status: "Waiting" }
            });
            setWaitlist(data || []);
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWaitlist();
        const interval = setInterval(fetchWaitlist, 30000);
        return () => clearInterval(interval);
    }, [selectedDate, profile?.organization_id]);

    const handleNotify = async (id: string) => {
        try {
            await apiFetch(`/appointments/waitlist/${id}`, {
                method: 'PATCH',
                data: { status: 'Notified' }
            });
            toast({ title: "Patient Notified", description: "Waitlist status updated." });
            fetchWaitlist();
        } catch (error: any) {
            toast({ title: "Action Failed", description: error.message, variant: "destructive" });
        }
    };

    return (
        <div className="relative shrink-0 w-[48px] h-full min-h-[600px]">
            <div
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className={cn(
                    "flex flex-col h-full bg-white/90 backdrop-blur-md border-l border-border/50 shadow-2xl z-40 transition-all duration-300 ease-in-out overflow-hidden",
                    isExpanded 
                        ? "w-[300px] absolute right-0 top-0 shadow-2xl bg-white/95" 
                        : "w-[48px]"
                )}
            >
                {/* ── Collapsed Strip view ─────────────────────────────────── */}
                {!isExpanded ? (
                    <div
                        onClick={() => {
                            setCollapsed(false);
                            setIsHovered(false);
                        }}
                        title="Hover or click to expand Active Waitlist"
                        className="flex flex-col items-center w-full h-full py-4 gap-3 cursor-pointer hover:bg-primary/5 transition-colors group"
                    >
                        {/* Arrow icon */}
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors text-primary shrink-0">
                            <ChevronLeft className="w-4 h-4" />
                        </div>

                        {/* Count bubble */}
                        <div className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 font-black text-xs leading-none transition-all",
                            waitlist.length > 0
                                ? "bg-primary text-white border-primary shadow-md animate-pulse"
                                : "bg-muted text-muted-foreground border-border"
                        )}>
                            {waitlist.length}
                        </div>

                        {/* Rotated label */}
                        <div className="flex-1 flex items-center justify-center overflow-hidden">
                            <span
                                className="text-[9px] font-black uppercase tracking-widest text-primary whitespace-nowrap select-none"
                                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                            >
                                Active Waitlist
                            </span>
                        </div>

                        {/* Waiting indicator dot */}
                        {waitlist.length > 0 && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse mb-1 shrink-0 shadow-sm" />
                        )}
                    </div>
                ) : (
                    /* ── Expanded panel view ───────────────────────────────── */
                    <>
                        {/* Header */}
                        <div className="p-4 bg-primary/5 border-b border-primary/10 shrink-0">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-sm font-display font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-primary" /> Active Waitlist
                                </h3>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[9px] bg-primary/10 border-primary/20 text-primary font-bold">
                                        {waitlist.length} Waiting
                                    </Badge>

                                    {/* Collapse / Pin button */}
                                    <button
                                        onClick={() => {
                                            setCollapsed(!collapsed);
                                            setIsHovered(false);
                                        }}
                                        className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center hover:bg-primary/20 transition-colors text-primary"
                                        title={collapsed ? "Expand / Pin" : "Collapse"}
                                    >
                                        {collapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground italic font-medium">{format(selectedDate, "EEEE, MMM d")}</p>
                        </div>

                        {/* Queue list */}
                        <ScrollArea className="flex-1 px-3">
                            <div className="py-3 space-y-3">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                                        <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
                                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Loading Queue...</span>
                                    </div>
                                ) : waitlist.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-2 opacity-60">
                                        <User className="w-9 h-9 text-muted-foreground/40" />
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">Empty Queue</p>
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
                                                    : "bg-white/90 border-border/50"
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
                                                        {item.preferred_time_slot ? item.preferred_time_slot.substring(0, 5) : "Anytime"}
                                                    </Badge>
                                                </div>

                                                <div className="text-[10px] space-y-0.5">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                                                        <span className="font-semibold uppercase text-foreground/80">{item.therapist ? formatStaffName(item.therapist, { useFirstName: false }) : "Any Specialist"}</span>
                                                    </div>
                                                    <div className="text-[9px] pl-3 italic opacity-60">{item.service?.name || "Standard Session"}</div>
                                                </div>

                                                <div className="flex gap-1.5 pt-1 mt-2 border-t border-dashed border-primary/10">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        className="h-7 flex-1 text-[10px] font-bold uppercase tracking-tight hover:bg-primary/5 hover:text-primary transition-colors"
                                                        onClick={() => handleNotify(item.id)}
                                                    >
                                                        <Bell className="w-3 h-3 mr-1.5" /> Notify
                                                    </Button>
                                                    <Button 
                                                        size="sm" 
                                                        variant="default" 
                                                        className="h-7 flex-1 text-[10px] font-bold uppercase tracking-tight bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/10"
                                                        onClick={() => onBook(item)}
                                                    >
                                                        <UserPlus className="w-3 h-3 mr-1.5" /> Book
                                                    </Button>
                                                </div>

                                                <a 
                                                    href={`tel:${item.client?.mobile_no}`} 
                                                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-primary text-white shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:right-2 transition-all p-0"
                                                >
                                                    <Phone className="w-3 h-3 fill-white" />
                                                </a>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>

                        {/* Footer */}
                        <div className="p-2.5 border-t border-border bg-muted/20 shrink-0">
                            <p className="text-[9px] text-center text-muted-foreground uppercase font-bold tracking-widest">Administrator Manual Sync</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
