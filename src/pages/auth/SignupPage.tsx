import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [orgCode, setOrgCode] = useState("");
  const [role, setRole] = useState("consultant"); // Default to consultant
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate the organization code
      const { data: orgId, error: orgError } = await supabase.rpc('get_org_by_code' as any, { p_code: orgCode });

      if (orgError) throw new Error("Failed to validate organization code.");
      if (!orgId) throw new Error("Invalid organization code. Please check and try again.");

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { first_name: firstName, last_name: lastName, organization_id: orgId, role },
        },
      });
      if (error) throw error;

      // Update the auto-created profile with name
      setSent(true);
      toast({ title: "Check your email", description: "We sent a verification link to " + email });
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center mx-auto">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">Verify your email</h2>
          <p className="text-muted-foreground">
            We've sent a confirmation link to <strong className="text-foreground">{email}</strong>.
            Please verify your email, then an admin will approve your account.
          </p>
          <Link to="/login" className="text-primary text-sm hover:underline inline-block mt-4">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-dark items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-primary blur-[100px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-accent blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-primary-foreground">ISHPO</h1>
          </div>
          <h2 className="font-display text-4xl font-bold text-primary-foreground leading-tight mb-4">
            Join the platform
          </h2>
          <p className="text-lg text-sidebar-foreground leading-relaxed">
            Create your account to access clinical workflows, patient management, and performance tracking.
          </p>
        </div>
      </div>

      {/* Right Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background">
        <form onSubmit={handleSignup} className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">ISHPO</h1>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Create account</h2>
            <p className="text-muted-foreground mt-1">Your account will need admin approval before access is granted.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="John" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Doe" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgCode">Organization Code</Label>
            <Input id="orgCode" value={orgCode} onChange={(e) => setOrgCode(e.target.value)} required placeholder="6-digit code provided by your clinic" maxLength={10} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="consultant">Consultant</option>
              <option value="admin">S&C Coach / Administrator</option>
              <option value="foe">Front Office Executive (FOE)</option>
              <option value="client">Client</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@clinic.com" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
          </div>

          <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground h-11 font-semibold">
            {loading ? "Creating..." : "Sign Up"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
