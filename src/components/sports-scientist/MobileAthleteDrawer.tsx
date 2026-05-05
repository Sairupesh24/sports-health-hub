import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  AlertTriangle,
  History,
  CreditCard,
  ShieldAlert,
  ChevronRight,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface MobileAthleteDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athlete: any;
}

export default function MobileAthleteDrawer({ open, onOpenChange, athlete }: MobileAthleteDrawerProps) {
  // Fetch detailed context for the athlete
  const { data: contextData, isLoading } = useQuery({
    queryKey: ["athlete-context", athlete?.id],
    queryFn: async () => {
      if (!athlete?.id) return null;

      // 1. Fetch Admin Notes
      const { data: adminNotes } = await supabase
        .from("client_admin_notes")
        .select("remarks, created_at")
        .eq("client_id", athlete.id)
        .order("created_at", { ascending: false })
        .limit(1);



      // 3. Fetch Session History
      const { data: sessionHistory } = await supabase
        .from("sessions")
        .select(`
          id, scheduled_start, status, session_mode, session_notes,
          session_types ( name )
        `)
        .eq("client_id", athlete.id)
        .order("scheduled_start", { ascending: false })
        .limit(3);

      // 4. Fetch Subscriptions and Bills
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select(`
          *,
          package:packages(name, price)
        `)
        .eq("client_id", athlete.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      let bills = [];
      if (subscription) {
        const { data: billData } = await supabase
          .from("bills")
          .select(`
            *,
            payments:bill_payments(
              amount,
              payment_method,
              created_at
            )
          `)
          .eq("subscription_id", subscription.id)
          .order("created_at", { ascending: false })
          .limit(5);
        bills = billData || [];
      }

      return {
        remarks: adminNotes?.[0]?.remarks || null,
        sessions: sessionHistory || [],
        subscription,
        bills
      };
    },
    enabled: open && !!athlete?.id
  });

  if (!athlete) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[85vw] sm:w-[400px] p-0 border-l-0 bg-[#f8fafc] dark:bg-[#020617] overflow-y-auto">
        {/* Header Section */}
        <div className="relative h-48 bg-slate-900 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-black/80 z-10" />
          {/* Background pattern or image could go here */}
          <div className="absolute bottom-6 left-6 right-6 z-20">
            <div className="flex items-end gap-4">
              <div className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl border-2 border-white/20 shadow-2xl",
                athlete.is_vip ? "bg-amber-500 text-white" : "bg-white/10 text-white backdrop-blur-md"
              )}>
                {athlete.first_name?.[0]}{athlete.last_name?.[0]}
              </div>
              <div className="flex-1 pb-1">
                <SheetTitle className="text-xl font-black text-white italic tracking-tight">
                  {athlete.first_name} {athlete.last_name}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="bg-white/10 border-white/20 text-white text-[9px] font-black uppercase">
                    {athlete.uhid}
                  </Badge>
                  {athlete.is_vip && (
                    <Badge className="bg-amber-500 text-white text-[9px] font-black uppercase border-none">
                      VIP
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border/50 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Sport</p>
                <p className="font-bold text-slate-900 dark:text-white">{athlete.sport || "General"}</p>
             </div>
             <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border/50 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Squad</p>
                <p className="font-bold text-slate-900 dark:text-white">{athlete.org_name || "Unassigned"}</p>
             </div>
          </div>

          {/* Sections */}
          <div className="space-y-6">
            {/* 1. Admin Remarks */}
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-rose-500">
                <ShieldAlert className="w-4 h-4" /> Admin Remarks
              </h3>
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-4 min-h-[80px] flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-rose-500/30" />
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic w-full">
                    {contextData?.remarks || "No high-priority administrative notes for this athlete."}
                  </p>
                )}
              </div>
            </section>



            {/* 3. Payment Status & History */}
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-500">
                <CreditCard className="w-4 h-4" /> Membership & Payments
              </h3>
              
              {isLoading ? (
                <div className="h-24 w-full bg-slate-100 animate-pulse rounded-2xl" />
              ) : contextData?.subscription ? (
                <div className="space-y-3">
                  {/* Current Active Plan */}
                  <div className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between",
                    contextData.subscription.status === 'Active' 
                      ? "bg-emerald-500/5 border-emerald-500/20" 
                      : "bg-amber-500/5 border-amber-500/20"
                  )}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Current Plan</p>
                      <p className="font-black text-slate-900 dark:text-white uppercase">
                        {contextData.subscription.package?.name || "Standard Membership"}
                      </p>
                    </div>
                    <div className="text-right">
                       <p className={cn(
                         "text-[11px] font-black uppercase px-3 py-1 rounded-full",
                         contextData.subscription.status === 'Active' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                       )}>
                         {contextData.subscription.status}
                       </p>
                    </div>
                  </div>

                  {/* Payment History List */}
                  <div className="space-y-2 mt-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Recent Invoices</h4>
                    {contextData.bills && contextData.bills.length > 0 ? (
                      contextData.bills.map((bill: any) => (
                        <div key={bill.id} className="p-3 bg-white dark:bg-slate-900 border border-border/50 rounded-xl space-y-2 shadow-sm">
                           <div className="flex justify-between items-start">
                              <div>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">
                                  {new Date(bill.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">
                                  Invoice #{bill.invoice_number || bill.id.substring(0, 8).toUpperCase()}
                                </p>
                              </div>
                              <Badge className={cn(
                                "text-[9px] font-black uppercase px-2 py-0",
                                bill.status === 'Paid' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                              )}>
                                {bill.status}
                              </Badge>
                           </div>
                           
                           {bill.payments && bill.payments.length > 0 && (
                             <div className="pt-2 border-t border-slate-50 flex flex-wrap gap-2">
                                {bill.payments.map((p: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-100">
                                     <CreditCard className="w-3 h-3 text-slate-400" />
                                     <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400">{p.payment_method}</span>
                                  </div>
                                ))}
                             </div>
                           )}
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-muted/30 rounded-xl text-center border border-dashed border-border">
                        <p className="text-[10px] text-muted-foreground italic uppercase tracking-widest">No payment history found</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-100/50 rounded-3xl border border-dashed border-slate-200 text-center">
                  <p className="text-xs text-muted-foreground font-medium">No active membership found for this athlete.</p>
                </div>
              )}
            </section>

            {/* 4. Session History */}
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-indigo-500">
                <History className="w-4 h-4" /> Recent Sessions
              </h3>
              <div className="space-y-2">
                {isLoading ? (
                   <div className="h-16 w-full bg-slate-100 animate-pulse rounded-2xl" />
                ) : contextData?.sessions && contextData.sessions.length > 0 ? (
                   contextData.sessions.map((session: any) => (
                     <div key={session.id} className="p-3 bg-white dark:bg-slate-900 border border-border/50 rounded-xl flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold">{session.session_types?.name || session.session_mode}</span>
                          <Badge variant="outline" className={cn(
                            "text-[9px]", 
                            session.status === 'Completed' ? "text-emerald-500 border-emerald-200" : "text-amber-500 border-amber-200"
                          )}>
                            {session.status}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(session.scheduled_start).toLocaleDateString()}
                        </span>
                     </div>
                   ))
                ) : (
                   <div className="p-4 bg-muted/50 rounded-xl text-center">
                     <p className="text-xs text-muted-foreground italic">No recent sessions found.</p>
                   </div>
                )}
              </div>
            </section>
          </div>
        </div>


      </SheetContent>
    </Sheet>
  );
}
