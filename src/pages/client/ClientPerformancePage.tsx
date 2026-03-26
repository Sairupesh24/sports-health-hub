import DashboardLayout from "@/components/layout/DashboardLayout";
import AthleteDashboard from "@/pages/ams/AthleteDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldX, HeartPulse, Activity, Dumbbell, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/* ─── No Access Screen ─────────────────────────────────────────────────────── */
function NoAmsAccess() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center ring-4 ring-muted-foreground/10">
          <ShieldX className="w-12 h-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            AMS Access Required
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You don't currently have access to the Athlete Management System (AMS).
          </p>
        </div>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-5 pb-4 space-y-1">
            <p className="text-sm font-semibold text-primary">How to get access</p>
            <p className="text-sm text-muted-foreground">
              Contact your organisation admin or sports scientist to enable AMS for your account.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ClientPerformancePage() {
  const { profile, loading } = useAuth();
  const hasAmsAccess = profile?.ams_role === "athlete";

  if (loading) {
    return (
      <DashboardLayout role="client">
        <div className="flex h-[64vh] items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!hasAmsAccess) {
    return (
      <DashboardLayout role="client">
        <NoAmsAccess />
      </DashboardLayout>
    );
  }

  // If athlete has access, render the FULL Elite Dashboard logic
  // we do this by simply returning the AthleteDashboard component
  return <AthleteDashboard />;
}
