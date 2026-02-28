import { Activity, Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function PendingApprovalPage() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="max-w-md text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-warning" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Pending Approval</h2>
          <p className="text-muted-foreground mt-2">
            Your account <strong className="text-foreground">{user?.email}</strong> has been created
            but is awaiting admin approval. You'll be able to access the platform once approved.
          </p>
        </div>
        <Button variant="outline" onClick={signOut} className="gap-2">
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
}
