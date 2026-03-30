import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function SetupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Check if any admin already exists
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      if (count && count > 0) {
        toast({ title: "Setup already complete", description: "An admin user already exists. Please log in.", variant: "destructive" });
        navigate("/login");
        return;
      }

      // Sign up the admin user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { first_name: firstName, last_name: lastName },
        },
      });
      if (authError) throw authError;
      if (!authData.session) throw new Error("Signup succeeded but no session. Check email confirmation settings.");

      // Call edge function to finalize admin setup
      const { data: setupResult, error: setupError } = await supabase.functions.invoke("setup-admin", {
        headers: { Authorization: `Bearer ${authData.session.access_token}` },
        body: { orgCode }
      });
      if (setupError) throw setupError;

      toast({
        title: "Admin account created!",
        description: "You can now log in as admin.",
      });
      navigate("/login");
    } catch (err: any) {
      toast({ title: "Setup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <form onSubmit={handleSetup} className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">ISHPO</h1>
        </div>

        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">First-Time Setup</span>
          </div>
          <p className="text-xs text-muted-foreground">Create the first admin account for your organization. This can only be done once.</p>
        </div>

        <div className="space-y-2">
          <Label>Organization Code</Label>
          <Input value={orgCode} onChange={(e) => setOrgCode(e.target.value.toUpperCase())} required placeholder="e.g. CLINIC01" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>First Name</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="John" />
          </div>
          <div className="space-y-2">
            <Label>Last Name</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Doe" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@clinic.com" />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
        </div>

        <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground h-11 font-semibold">
          {loading ? "Setting up..." : "Create Admin Account"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </form>
    </div>
  );
}
