import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle, XCircle, Users } from "lucide-react";

interface PendingUser {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  is_approved: boolean;
  created_at: string;
}

export default function UserApproval() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    if (!profile?.organization_id) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("organization_id", profile.organization_id)
      .neq("id", profile.id)
      .order("created_at", { ascending: false });
    setUsers((data as PendingUser[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [profile]);

  const approveUser = async (userId: string) => {
    const role = selectedRoles[userId];
    if (!role) {
      toast({ title: "Select a role", description: "Please assign a role before approving.", variant: "destructive" });
      return;
    }

    try {
      // Approve profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_approved: true } as any)
        .eq("id", userId);
      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role } as any);
      if (roleError) throw roleError;

      toast({ title: "User approved", description: `User has been approved as ${role}.` });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">User Approval</h1>
          <p className="text-muted-foreground text-sm mt-1">Approve new staff and assign roles</p>
        </div>

        <Card className="gradient-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Organization Members
            </CardTitle>
            <CardDescription>Manage team access and roles</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-sm">No team members yet.</p>
            ) : (
              <div className="space-y-3">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : "No name"}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {u.is_approved ? (
                        <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
                          <CheckCircle className="w-3 h-3 mr-1" /> Approved
                        </Badge>
                      ) : (
                        <>
                          <Select onValueChange={(v) => setSelectedRoles((prev) => ({ ...prev, [u.id]: v }))}>
                            <SelectTrigger className="w-[140px] h-9">
                              <SelectValue placeholder="Assign role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="consultant">Consultant</SelectItem>
                              <SelectItem value="client">Client</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => approveUser(u.id)} className="gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
