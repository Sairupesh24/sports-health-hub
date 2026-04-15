import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface EmergencyAlertIconProps {
  onClick: () => void;
  className?: string;
}

export default function EmergencyAlertIcon({ onClick, className }: EmergencyAlertIconProps) {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;

  const { data: unresolvedAlerts } = useQuery({
    queryKey: ["unresolved-emergency-alerts", organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("emergency_alerts")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("status", "unresolved");
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
    refetchInterval: 10000, // Poll every 10 seconds for emergencies
  });

  const count = unresolvedAlerts?.length || 0;

  if (count === 0) return null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative p-2 rounded-full bg-destructive text-destructive-foreground animate-pulse shadow-lg shadow-destructive/50 hover:scale-110 transition-transform",
        className
      )}
      title={`${count} Emergency Alert(s) Pending Review`}
    >
      <AlertCircle className="w-5 h-5" />
      <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-destructive text-[10px] font-black rounded-full flex items-center justify-center border-2 border-destructive animate-none">
        {count}
      </span>
    </button>
  );
}
