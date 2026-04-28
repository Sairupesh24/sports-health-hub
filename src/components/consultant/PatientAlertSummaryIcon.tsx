import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BadgeIndianRupee, Loader2, AlertCircle, Bookmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Props {
  clientId: string;
  isVIP?: boolean;
}

export function PatientAlertSummaryIcon({ clientId, isVIP }: Props) {
  const { roles } = useAuth();
  const isAdminOrFoe = roles?.some(r => ["admin", "super_admin", "clinic_admin", "foe"].includes(r));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ dues: number; remarks: string } | null>(null);
  const [open, setOpen] = useState(false);

  const fetchData = async () => {
    if (data || loading) return;
    setLoading(true);
    try {
      // Fetch Dues
      const { data: billsData } = await supabase
        .from("bills")
        .select("total")
        .eq("client_id", clientId)
        .neq("status", "Paid");
      
      const totalDues = (billsData || []).reduce((sum, bill) => sum + (bill.total || 0), 0);

      // Fetch Remarks
      let remarks = "";
      const isAdmin = roles.some(r => ['admin', 'super_admin', 'clinic_admin'].includes(r));
      
      if (isAdmin || roles.includes('consultant') || roles.includes('physiotherapist')) {
          const { data: remarksData } = await supabase
            .from("client_admin_notes")
            .select("remarks")
            .eq("client_id", clientId)
            .maybeSingle();
          remarks = remarksData?.remarks || "";
      }

      setData({ dues: totalDues, remarks });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchData();
    }
  };

  if (!isAdminOrFoe) return null;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button 
          className={cn(
            "p-1 rounded-full transition-all hover:bg-amber-100/50 group",
            isVIP && "text-yellow-600 hover:text-yellow-700"
          )}
          onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
          }}
        >
          <BadgeIndianRupee 
            className={cn(
              "w-3.5 h-3.5",
               (data?.dues && data.dues > 0 && isAdminOrFoe) ? "text-red-500 animate-pulse" : "text-amber-600"
            )} 
          />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-0 overflow-hidden border-amber-200 shadow-xl z-[100]" 
        align="end" 
        side="top"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-amber-50 p-3 border-b border-amber-100 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800">Patient Alert Summary</span>
            {isVIP && <span className="text-[8px] font-black bg-yellow-400 text-yellow-900 px-1 inline-block rounded">VIP</span>}
        </div>
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
            </div>
          ) : (
            <>
              {isAdminOrFoe && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] uppercase font-bold text-amber-800">Outstanding Balance</p>
                    <p className={cn(
                        "text-sm font-bold",
                        (data?.dues || 0) > 0 ? "text-red-600" : "text-emerald-600"
                    )}>
                      ₹{(data?.dues || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {data?.remarks && (
                <div className="flex items-start gap-3">
                  <Bookmark className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] uppercase font-bold text-amber-800">Admin Remark</p>
                    <p className="text-xs leading-relaxed text-slate-600 mt-0.5 italic">
                      "{data.remarks}"
                    </p>
                  </div>
                </div>
              )}

              {!(data?.dues) && !(data?.remarks) && !loading && (
                <p className="text-[10px] text-muted-foreground text-center py-2">No active alerts for this patient.</p>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
