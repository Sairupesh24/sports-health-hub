import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MobileSpecialistLayout from "@/components/layout/MobileSpecialistLayout";
import { 
  CreditCard, 
  Search, 
  ChevronRight,
  ShieldCheck,
  AlertTriangle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { haptic } from "@/utils/haptic";
import MobileAthleteDrawer from "@/components/sports-scientist/MobileAthleteDrawer";

export default function MobileMemberships() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("Active");

  // Fetch memberships (subscriptions) for the specialist's organization
  const { data: memberships, isLoading } = useQuery({
    queryKey: ["mobile-memberships", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Get specialist's organization
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single();

      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          client:clients(
            id, 
            first_name, 
            last_name, 
            uhid, 
            mobile_no,
            is_vip, 
            sport
          ),
          package:packages(name, price)
        `)
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (error) return [];
      return data || [];
    },
    enabled: !!user
  });

  const activeCount = memberships?.filter(m => m.status === "Active" || m.status === "Past Due").length || 0;
  const cancelledCount = memberships?.filter(m => m.status === "Cancelled").length || 0;
  const totalCount = memberships?.length || 0;
  const complianceRate = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

  const filteredMemberships = memberships?.filter(m => {
    const firstName = m.client?.first_name || "";
    const lastName = m.client?.last_name || "";
    const fullName = `${firstName} ${lastName}`.toLowerCase();
    const uhid = (m.client?.uhid || "").toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    
    const matchesSearch = fullName.includes(query) || uhid.includes(query);
    
    // If searching, ignore the status filter and show all matches (Global Search)
    if (query) {
      return matchesSearch;
    }
    
    // If not searching, respect the status filter
    if (statusFilter === "All") return true;
    if (statusFilter === "Active") return m.status === "Active" || m.status === "Past Due" || m.status === "Overdue";
    if (statusFilter === "Cancelled") return m.status === "Cancelled";
    
    return true;
  });

  const handleAthleteClick = (athlete: any) => {
    haptic.light();
    setSelectedAthlete(athlete);
    setIsDrawerOpen(true);
  };

  return (
    <MobileSpecialistLayout title="Memberships">
      <div className="space-y-6 pb-20">
        
        {/* Search Header */}
        <div className="sticky top-16 z-30 -mx-4 px-4 py-3 bg-[#f8fafc]/80 dark:bg-[#020617]/80 backdrop-blur-md border-b border-border/30">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search Athlete Compliance..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 bg-white dark:bg-slate-900 border-border/50 rounded-2xl pl-12 shadow-sm"
            />
          </div>
        </div>

        {/* Compliance Summary */}
        <div className="grid grid-cols-2 gap-4">
           <button 
             onClick={() => { haptic.light(); setStatusFilter("Active"); }}
             className={cn(
               "bg-emerald-500/10 border p-4 rounded-3xl flex flex-col items-center text-center transition-all",
               statusFilter === "Active" ? "border-emerald-500 bg-emerald-500/20 shadow-lg shadow-emerald-500/10 scale-[1.02]" : "border-emerald-500/20 grayscale opacity-60"
             )}
           >
              <ShieldCheck className="w-6 h-6 text-emerald-500 mb-2" />
              <h4 className="text-sm font-black text-emerald-700">Active</h4>
              <p className="text-[10px] font-bold text-emerald-600/70">{complianceRate}% of Athletes</p>
           </button>
           <button 
             onClick={() => { haptic.light(); setStatusFilter("Cancelled"); }}
             className={cn(
               "bg-rose-500/10 border p-4 rounded-3xl flex flex-col items-center text-center transition-all",
               statusFilter === "Cancelled" ? "border-rose-500 bg-rose-500/20 shadow-lg shadow-rose-500/10 scale-[1.02]" : "border-rose-500/20 grayscale opacity-60"
             )}
           >
              <AlertTriangle className="w-6 h-6 text-rose-500 mb-2" />
              <h4 className="text-sm font-black text-rose-700">Cancelled</h4>
              <p className="text-[10px] font-bold text-rose-600/70">{cancelledCount} Athletes</p>
           </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
           {["Active", "Cancelled", "All"].map((status) => (
             <button
               key={status}
               onClick={() => { haptic.light(); setStatusFilter(status); }}
               className={cn(
                 "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                 statusFilter === status 
                   ? "bg-slate-900 text-white border-slate-900 shadow-md" 
                   : "bg-white text-slate-400 border-slate-100"
               )}
             >
               {status}
             </button>
           ))}
        </div>

        {/* Athlete List */}
        <div className="space-y-4">
           <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 px-2">Athlete Directory</h3>
           {isLoading ? (
             <div className="space-y-4">
                {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 dark:bg-slate-900 rounded-3xl animate-pulse" />)}
             </div>
           ) : filteredMemberships?.length === 0 ? (
             <div className="text-center py-12 opacity-50">
                <Search className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">No matching athletes</p>
             </div>
           ) : (
             filteredMemberships?.map((membership) => {
               const athlete = membership.client;
               if (!athlete) return null;

               const status = membership.status;
               const isCancelled = status === "Cancelled";
               const isActive = status === "Active" || status === "Past Due";
               const isOverdue = status === "Overdue";

               return (
                 <button
                   key={membership.id}
                   onClick={() => handleAthleteClick(athlete)}
                   className={cn(
                     "w-full bg-white dark:bg-slate-900 p-4 rounded-3xl border border-border/50 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all text-left",
                     athlete.is_vip && "vip-border"
                   )}
                 >
                    <div className="flex items-center gap-4">
                       <div className={cn(
                         "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg",
                         athlete.is_vip ? "bg-amber-500" : "bg-slate-800"
                       )}>
                          {athlete.first_name?.[0]}{athlete.last_name?.[0]}
                       </div>
                       <div>
                          <h4 className="font-black text-slate-900 dark:text-white leading-none">
                            {athlete.first_name} {athlete.last_name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1.5">
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{athlete.uhid}</span>
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">•</span>
                             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{membership.package?.name || "General"}</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                       {isActive ? (
                         <div className="flex flex-col items-end">
                            <Badge className="bg-emerald-500 text-white border-none text-[9px] font-black uppercase px-2 py-0.5">Active</Badge>
                            <p className="text-[9px] font-bold text-muted-foreground mt-1">
                               {membership.billing_cycle} Cycle
                            </p>
                         </div>
                       ) : isCancelled ? (
                         <Badge className="bg-slate-400 text-white border-none text-[9px] font-black uppercase px-2 py-0.5">Cancelled</Badge>
                       ) : isOverdue ? (
                         <Badge className="bg-rose-500 text-white border-none text-[9px] font-black uppercase px-2 py-0.5 animate-pulse">Overdue</Badge>
                       ) : (
                         <Badge className="bg-slate-200 text-slate-500 border-none text-[9px] font-black uppercase px-2 py-0.5">Inactive</Badge>
                       )}
                       <ChevronRight className="w-4 h-4 text-slate-300" />
                    </div>
                 </button>
               );
             })
           )}
        </div>
      </div>

      <MobileAthleteDrawer 
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        athlete={selectedAthlete}
      />
    </MobileSpecialistLayout>
  );
}
