import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle, Users, UserX, Plus, Copy, ExternalLink, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PendingUser {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  is_approved: boolean;
  created_at: string;
  current_role?: string;
  uhid?: string;
  ams_role?: string | null;
  profession?: string | null;
}

export default function UserApproval() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter((u) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    return (
      fullName.includes(query) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.current_role && u.current_role.toLowerCase().includes(query)) ||
      (u.uhid && u.uhid.toLowerCase().includes(query))
    );
  });

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");
  const [newRole, setNewRole] = useState("sports_physician");
  const [newUhid, setNewUhid] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState<{ email: string, password: string } | null>(null);

  const [pendingAction, setPendingAction] = useState<{ type: "change_role" | "approve", userId: string, role: string } | null>(null);
  const [pendingActionUhid, setPendingActionUhid] = useState("");
  const [pendingActionAmsRole, setPendingActionAmsRole] = useState<string>("none");
  const [pendingActionProfession, setPendingActionProfession] = useState<string>("none");

  const fetchUsers = async () => {
    if (!profile?.organization_id) return;

    try {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .neq("id", profile.id)
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const userIds = profiles?.map(p => p.id) || [];
      let rolesData: any[] = [];

      if (userIds.length > 0) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        rolesData = roles || [];
      }

      if (profiles) {
        const merged = profiles.map(p => {
          const userRole = rolesData.find(r => r.user_id === p.id);
          return {
            ...p,
            current_role: userRole ? userRole.role : undefined
          };
        });

        setUsers(merged as PendingUser[]);

        const initialRoles: Record<string, string> = {};
        merged.forEach(u => {
          if (u.current_role) {
            initialRoles[u.id] = u.current_role;
          }
        });
        setSelectedRoles(initialRoles);
      }
    } catch (err: any) {
      console.error("Error fetching users:", err);
      toast({ title: "Failed to load users", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [profile]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newRole) return;
    if (newRole === "client" && !newUhid.trim()) {
      toast({ title: "UHID Required", description: "You must provide a valid UHID to create a Client account.", variant: "destructive" });
      return;
    }

    setIsAdding(true);
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase URL or Service Role Key in environment variables.");
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const userOrgId = profile?.organization_id;
      if (!userOrgId) throw new Error("You are not associated with any organization.");

      if (newRole === "client" && newUhid.trim()) {
        const { data: clientCheck, error: clientCheckError } = await supabaseAdmin
          .from("clients")
          .select("id")
          .eq("organization_id", userOrgId)
          .eq("uhid", newUhid.trim())
          .maybeSingle();

        if (clientCheckError) throw clientCheckError;
        if (!clientCheck) {
          throw new Error(`The UHID '${newUhid}' was not found in your clinic's records.`);
        }
      }

      const tempPassword = `${Math.random().toString(36).slice(-6)}${Math.random().toString(36).slice(-6).toUpperCase()}!8z`;

      const { data: authData, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
        email: newEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { first_name: newFirst, last_name: newLast }
      });

      if (authCreateError) throw new Error(`Account Creation Failed: ${authCreateError.message}`);

      const newUserId = authData.user.id;

      await new Promise(resolve => setTimeout(resolve, 800)); // Wait for handle_new_user trigger

      const profileUpdate: any = {
        organization_id: userOrgId,
        is_approved: true,
        first_name: newFirst,
        last_name: newLast,
      };
      if (newUhid.trim()) profileUpdate.uhid = newUhid.trim();

      const { error: profileUpdateErr } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdate)
        .eq("id", newUserId);

      if (profileUpdateErr) console.warn("Profile update warning:", profileUpdateErr);

      const { error: roleInsertErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUserId, role: newRole as any });

      if (roleInsertErr) console.warn("Role insert warning:", roleInsertErr);

      setGeneratedCreds({ email: newEmail, password: tempPassword });
      toast({ title: "User created", description: "Successfully created user and bypassed email verification." });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error creating user", description: err.message, variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const copyCredentials = () => {
    if (!generatedCreds) return;
    const text = `Welcome to ISHPO!\n\nYour account has been created.\nLogin URL: ${window.location.origin}/login\nEmail: ${generatedCreds.email}\nTemporary Password: ${generatedCreds.password}\n\nPlease log in and change your password.`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Credentials copied to clipboard." });
    setAddUserOpen(false);
    setGeneratedCreds(null);
    setNewEmail("");
    setNewFirst("");
    setNewLast("");
    setNewUhid("");
  };

  const approveUser = async (userId: string, providedUhid?: string, amsRole?: string | null, profession?: string | null) => {
    const role = pendingAction?.role || selectedRoles[userId];
    if (!role) {
      toast({ title: "Select a role", description: "Please assign a role before approving.", variant: "destructive" });
      return;
    }

    const uhid = providedUhid;
    if ((role === "client" || role === "athlete") && !uhid?.trim()) {
      toast({ title: "UHID Required", description: "You must enter the client's UHID before approving their access.", variant: "destructive" });
      return;
    }

    try {
      let prof = (profession as string) !== "none" ? (profession as string) : null;
      
      if (!prof) {
          if (role === 'sports_physician') prof = 'Sports Physician';
          else if (role === 'physiotherapist') prof = 'Physiotherapist';
          else if (role === 'nutritionist') prof = 'Nutritionist';
          else if (role === 'sports_scientist') prof = 'Sports Scientist';
      }

      const profileUpdate: any = { 
        is_approved: true,
        ams_role: amsRole !== undefined ? amsRole : null,
        profession: prof
      };

      if (role === "client" && uhid?.trim()) {
        const cleanUhid = uhid.trim();
        const { data: clientCheck, error: checkError } = await supabase.from("clients").select("id").eq("uhid", cleanUhid).maybeSingle();
        if (checkError) throw checkError;
        if (!clientCheck) {
          toast({ title: "Invalid UHID", description: "This UHID does not exist in your clinic's records.", variant: "destructive" });
          return;
        }
        profileUpdate.uhid = cleanUhid;
      }
      
      if (role === "athlete" && !amsRole) {
        profileUpdate.ams_role = "athlete";
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", userId);
      if (profileError) throw profileError;

      const { data: existingRole, error: fetchError } = await supabase.from("user_roles").select("*").eq("user_id", userId).maybeSingle();
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existingRole) {
        const { error: roleUpdateError } = await supabase.from("user_roles").update({ role } as any).eq("user_id", userId);
        if (roleUpdateError) throw roleUpdateError;
      } else {
        const { error: roleInsertError } = await supabase.from("user_roles").insert({ user_id: userId, role } as any);
        if (roleInsertError) throw roleInsertError;
      }

      toast({ title: "User approved", description: `User has been approved as ${role}.` });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const changeUserRole = async (userId: string, newRole: string, providedUhid?: string, amsRole?: string | null, profession?: string | null) => {
    const uhid = providedUhid;
    if ((newRole === "client" || newRole === "athlete") && !uhid?.trim()) {
      toast({ title: "UHID Required", description: "You must supply a UHID before converting the user to this role.", variant: "destructive" });
      return;
    }

    setSelectedRoles(prev => ({ ...prev, [userId]: newRole }));

    try {
      const profileUpdate: any = {};
      if (amsRole !== undefined) {
        profileUpdate.ams_role = amsRole;
      }
      if (profession !== undefined) {
        let prof = (profession as string) !== "none" ? (profession as string) : null;
        
        if (!prof) {
            if (newRole === 'sports_physician') prof = 'Sports Physician';
            else if (newRole === 'physiotherapist') prof = 'Physiotherapist';
            else if (newRole === 'nutritionist') prof = 'Nutritionist';
            else if (newRole === 'sports_scientist') prof = 'Sports Scientist';
        }
        
        profileUpdate.profession = prof;
      }

      if (newRole === "client" && uhid?.trim()) {
        const cleanUhid = uhid.trim();
        const { data: clientCheck, error: checkError } = await supabase.from("clients").select("id").eq("uhid", cleanUhid).maybeSingle();
        if (checkError) throw checkError;
        if (!clientCheck) {
          toast({ title: "Invalid UHID", description: "This UHID does not exist in your clinic's records.", variant: "destructive" });
          fetchUsers();
          return;
        }
        profileUpdate.uhid = cleanUhid;
      }

      if (Object.keys(profileUpdate).length > 0) {
        const { error: profileError } = await supabase.from("profiles").update(profileUpdate).eq("id", userId);
        if (profileError) throw profileError;
      }

      const { data: existingRole, error: fetchError } = await supabase.from("user_roles").select("*").eq("user_id", userId).maybeSingle();
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existingRole) {
        const { error: roleUpdateError } = await supabase.from("user_roles").update({ role: newRole } as any).eq("user_id", userId);
        if (roleUpdateError) throw roleUpdateError;
      } else {
        const { error: roleInsertError } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole } as any);
        if (roleInsertError) throw roleInsertError;
      }

      toast({ title: "Role updated", description: "User's role has been changed successfully." });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error updating role", description: err.message, variant: "destructive" });
      fetchUsers();
    }
  };

  const revokeAccess = async (userId: string) => {
    if (!confirm("Are you sure you want to revoke this user's access to the organization?")) return;

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_approved: false } as any)
        .eq("id", userId);
      if (profileError) throw profileError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (roleError) throw roleError;

      toast({ title: "Access Revoked", description: "User has been removed from active members." });

      setSelectedRoles(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });

      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error revoking access", description: err.message, variant: "destructive" });
    }
  };

  const deleteUserAtAuth = async (userId: string) => {
    if (!confirm("Are you sure you want to PERMANENTLY delete this user account? This cannot be undone.")) return;

    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase URL or Service Role Key in environment variables.");
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (authError) {
        if (authError.message === "User not found") {
          console.warn("Auth user not found, cleaning up database records anyway...");
          const { error: dbError } = await supabaseAdmin.from("profiles").delete().eq("id", userId);
          if (dbError) throw dbError;
        } else {
          throw authError;
        }
      }

      toast({ title: "User Deleted", description: "User account and all related data have been removed." });
      fetchUsers();
    } catch (err: any) {
      console.error("Error deleting user:", err);
      let errMsg = err.message || "Unknown error";
      if (errMsg.toLowerCase().includes("foreign key constraint")) {
        errMsg = "This user cannot be deleted because they are referenced by other records (e.g. sessions, clients, or audits). Consider revoking access instead.";
      }
      toast({ title: "Error deleting user", description: errMsg, variant: "destructive" });
    }
  };


  const handleRoleSelect = (userId: string, newRole: string) => {
    const currentUser = users.find(u => u.id === userId);
    let defaultAmsRole = currentUser?.ams_role || "none";
    if (newRole === "athlete") defaultAmsRole = "athlete";
    setPendingActionAmsRole(defaultAmsRole);
    setPendingAction({ type: "change_role", userId, role: newRole });
    setPendingActionUhid(currentUser?.uhid || "");
    
    let profession = currentUser?.profession || "none";
    if (profession === "none") {
        if (newRole === 'sports_physician') profession = 'Sports Physician';
        else if (newRole === 'physiotherapist') profession = 'Physiotherapist';
        else if (newRole === 'nutritionist') profession = 'Nutritionist';
        else if (newRole === 'sports_scientist') profession = 'Sports Scientist';
    }
    setPendingActionProfession(profession);
  };

  const handleApproveClick = (userId: string) => {
    const role = selectedRoles[userId];
    if (!role && !pendingAction?.role) {
      toast({ title: "Select a role", description: "Please assign an initial role before approving.", variant: "destructive" });
      return;
    }
    const currentUser = users.find(u => u.id === userId);
    setPendingActionAmsRole(currentUser?.ams_role || "none");
    setPendingAction({ type: "approve", userId, role: role || pendingAction?.role || "client" });
    setPendingActionUhid(currentUser?.uhid || "");
    setPendingActionProfession(currentUser?.profession || "none");
  };

  const confirmPendingAction = () => {
    if (!pendingAction) return;
    if ((pendingAction.role === "client" || pendingAction.role === "athlete") && !pendingActionUhid.trim()) {
      toast({ title: "UHID Required", description: "You must enter a UHID to assign this role.", variant: "destructive" });
      return;
    }

    const amsRole = pendingActionAmsRole === "none" ? null : pendingActionAmsRole;
    const profession = pendingActionProfession;

    if (pendingAction.type === "change_role") {
      changeUserRole(pendingAction.userId, pendingAction.role, pendingActionUhid, amsRole, profession);
    } else {
      approveUser(pendingAction.userId, pendingActionUhid, amsRole, profession);
    }

    setPendingAction(null);
  };

  const handleViewClientDetails = async (uhid?: string) => {
    if (!uhid) {
      toast({ title: "No UHID Link", description: "This user does not have a UHID assigned to their profile yet.", variant: "destructive" });
      return;
    }
    toast({ title: "Information Only", description: "Client profiles are managed by the Clinical Administration team." });
  };

  return (
    <DashboardLayout role="hr_manager">
      <div className="space-y-6 pb-10">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">User Approval</h1>
          <p className="text-muted-foreground text-sm mt-1">Approve new staff, manage access, and assign roles</p>
        </div>

        <Card className="gradient-card border-border">
          <CardHeader className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Organization Members
              </CardTitle>
              <CardDescription>Manage your team's access to the platform</CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  className="pl-9 bg-muted/30 border-border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <Dialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{pendingAction?.type === 'approve' ? 'Approve User & Assign Roles' : 'Confirm Role Change'}</DialogTitle>
                    <DialogDescription>
                      Specify the core ISHPO system role and optionally assign an AMS functionality role.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    {(pendingAction?.role === "client" || pendingAction?.role === "athlete") && (
                      <div className="space-y-2 animate-in fade-in zoom-in duration-200">
                        <Label>Client UHID <span className="text-destructive">*</span></Label>
                        <Input
                          value={pendingActionUhid}
                          onChange={e => setPendingActionUhid(e.target.value)}
                          required
                          placeholder="e.g. CSH03260001"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>AMS Role (Athlete Monitoring System)</Label>
                      <Select value={pendingActionAmsRole} onValueChange={setPendingActionAmsRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select AMS Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No AMS Access</SelectItem>
                          <SelectItem value="coach">AMS Coach</SelectItem>
                          <SelectItem value="athlete">AMS Athlete</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Select an AMS functional tier if this user requires tracking/coaching within the Athlete workflow.</p>
                    </div>

                    {(pendingAction?.role === "consultant" || pendingAction?.role === "sports_physician" || pendingAction?.role === "physiotherapist" || pendingAction?.role === "nutritionist" || pendingAction?.role === "sports_scientist") && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <Label>Specialist Designation / Profession</Label>
                        <Select value={pendingActionProfession} onValueChange={setPendingActionProfession}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Profession" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">General / No Specific Specialization</SelectItem>
                            <SelectItem value="Physiotherapist">Physiotherapist</SelectItem>
                            <SelectItem value="Sports Scientist">Sports Scientist</SelectItem>
                            <SelectItem value="Nutritionist">Nutritionist</SelectItem>
                            <SelectItem value="Sports Physician">Sports Physician</SelectItem>
                            <SelectItem value="Massage therapist">Massage therapist</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button onClick={confirmPendingAction} className="w-full">
                      Confirm Action
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={addUserOpen} onOpenChange={(open) => {
                setAddUserOpen(open);
                if (!open) {
                  setGeneratedCreds(null);
                  setNewEmail(""); setNewFirst(""); setNewLast(""); setNewUhid("");
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" /> Add New User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                    <DialogDescription>
                      Directly create an approved account without requiring them to wait for email verification.
                    </DialogDescription>
                  </DialogHeader>

                  {generatedCreds ? (
                    <div className="space-y-4 pt-4">
                      <div className="bg-muted p-4 rounded-md space-y-2 font-mono text-sm break-all">
                        <p><strong>Email:</strong> {generatedCreds.email}</p>
                        <p><strong>Password:</strong> {generatedCreds.password}</p>
                      </div>
                      <Button onClick={copyCredentials} className="w-full gap-2">
                        <Copy className="w-4 h-4" /> Copy Credentials to Share
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleAddUser} className="space-y-4 pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>First Name</Label>
                          <Input value={newFirst} onChange={e => setNewFirst(e.target.value)} placeholder="John" />
                        </div>
                        <div className="space-y-2">
                          <Label>Last Name</Label>
                          <Input value={newLast} onChange={e => setNewLast(e.target.value)} placeholder="Doe" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required placeholder="employee@clinic.com" />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={newRole} onValueChange={setNewRole}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="sports_physician">Sports Physician</SelectItem>
                            <SelectItem value="physiotherapist">Physiotherapist</SelectItem>
                            <SelectItem value="nutritionist">Nutritionist</SelectItem>
                            <SelectItem value="sports_scientist">Sports Scientist</SelectItem>
                            <SelectItem value="foe">Front Office Executive</SelectItem>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="athlete">Athlete</SelectItem>
                            <SelectItem value="hr_manager">HR Manager</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {(newRole === "client" || newRole === "athlete") && (
                        <div className="space-y-2 animate-in fade-in zoom-in duration-200">
                          <Label>Client UHID <span className="text-destructive">*</span></Label>
                          <Input value={newUhid} onChange={e => setNewUhid(e.target.value)} required placeholder="e.g. CSH03260001" />
                        </div>
                      )}
                      <Button type="submit" disabled={isAdding} className="w-full">
                        {isAdding ? "Creating User..." : "Create User"}
                      </Button>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading members...</p>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-sm">No team members joined your organization yet.</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No members match your search.</p>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg bg-muted/30 border border-border gap-4">
                    <div className="w-full md:w-auto">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : "No name provided"}
                        </p>
                        {u.ams_role && (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase font-bold border-primary/50 text-primary">
                            AMS {u.ams_role}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground break-all">{u.email}</p>
                    </div>

                    <div className="flex flex-row flex-wrap items-center gap-2 w-full md:w-auto mt-1 md:mt-0">
                      {(selectedRoles[u.id] === "client" || (!selectedRoles[u.id] && u.current_role === "client")) && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleViewClientDetails(u.uhid)}
                          className="h-9 w-9 shrink-0"
                          title="View Data Status"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      {u.is_approved ? (
                        <>
                          <div className="flex items-center gap-2 flex-1 md:flex-none">
                            <Badge variant="secondary" className="bg-success/10 text-success border-success/20 h-9 hidden xl:flex">
                              <CheckCircle className="w-3 h-3 mr-1" /> Approved
                            </Badge>
                            <Select value={selectedRoles[u.id] || ""} onValueChange={(v) => handleRoleSelect(u.id, v)}>
                              <SelectTrigger className="w-full md:w-[130px] h-9">
                                <SelectValue placeholder="Role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="sports_physician">Sports Physician</SelectItem>
                                <SelectItem value="physiotherapist">Physiotherapist</SelectItem>
                                <SelectItem value="nutritionist">Nutritionist</SelectItem>
                                <SelectItem value="sports_scientist">Sports Scientist</SelectItem>
                                <SelectItem value="foe">Front Office Executive</SelectItem>
                                <SelectItem value="client">Client</SelectItem>
                                <SelectItem value="athlete">Athlete</SelectItem>
                                <SelectItem value="hr_manager">HR Manager</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => revokeAccess(u.id)}
                              className="h-9 w-9 shrink-0 opacity-80 hover:opacity-100"
                              title="Revoke Access"
                            >
                              <UserX className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => deleteUserAtAuth(u.id)}
                              className="h-9 w-9 shrink-0 opacity-80 hover:opacity-100 bg-red-600 hover:bg-red-700"
                              title="Delete Permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 md:flex-none">
                            <Select value={selectedRoles[u.id] || ""} onValueChange={(v) => setSelectedRoles((prev) => ({ ...prev, [u.id]: v }))}>
                              <SelectTrigger className="w-full md:w-[140px] h-9">
                                <SelectValue placeholder="Assign role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="sports_physician">Sports Physician</SelectItem>
                                <SelectItem value="physiotherapist">Physiotherapist</SelectItem>
                                <SelectItem value="nutritionist">Nutritionist</SelectItem>
                                <SelectItem value="sports_scientist">Sports Scientist</SelectItem>
                                <SelectItem value="foe">Front Office Executive</SelectItem>
                                <SelectItem value="client">Client</SelectItem>
                                <SelectItem value="athlete">Athlete</SelectItem>
                                <SelectItem value="hr_manager">HR Manager</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button size="sm" onClick={() => handleApproveClick(u.id)} className="gap-1 whitespace-nowrap h-9 px-4">
                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                          </Button>
                          <Button 
                            size="icon" 
                            variant="destructive" 
                            onClick={() => deleteUserAtAuth(u.id)}
                            className="h-9 w-9 shrink-0 bg-red-600 hover:bg-red-700"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-4 h-4" />
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
