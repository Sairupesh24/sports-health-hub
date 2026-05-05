import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardPath, isUserApproved } from "@/utils/navigation";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, profile, roles, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Effect-driven redirect ──────────────────────────────────────────
  // Once AuthContext finishes loading after a sign-in (or if the user is
  // already authenticated), redirect to the correct console.  This
  // replaces the old inline redirect that raced with AuthContext.
  useEffect(() => {
    if (authLoading || !user) return;

    // Profile is still being fetched — wait for AuthContext to finish
    // authLoading being false means the fetch completed. If profile is
    // STILL null at that point, the user's profile row is missing.
    if (!profile) {
      toast({
        title: "Account error",
        description: "Your profile could not be found. Please contact an administrator.",
        variant: "destructive",
      });
      setLoading(false);
      supabase.auth.signOut();
      return;
    }

    if (!isUserApproved(profile, roles)) {
      navigate("/pending-approval", { replace: true });
      return;
    }

    navigate(getDashboardPath(roles), { replace: true });
  }, [user, profile, roles, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Navigation is handled by the useEffect above once AuthContext
      // finishes hydrating profile & roles.  No redundant fetch needed.
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-y-auto flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-dark items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-primary blur-[100px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-accent blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-lg">
          {/* CSSH Logo */}
          <div className="mb-8">
            <img
              src="/cssh_logo.jpg"
              alt="CSSH Logo"
              className="h-24 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Activity className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-primary-foreground">ISHPO</h1>
          </div>
          <h2 className="font-display text-4xl font-bold text-primary-foreground leading-tight mb-4">
            Integrated Sports Health & Physio Operating System
          </h2>
          <p className="text-lg text-sidebar-foreground leading-relaxed mb-4">
            Streamline clinical workflows, track patient progress, and manage your practice — all in one platform built for sports health professionals.
          </p>
          <p className="text-sm text-sidebar-foreground/70">
            ISHPO is a product of <span className="font-semibold">CSSH</span> (Center For Spine and Sports Health)
          </p>
        </div>
      </div>

      {/* Right - Login */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background">
        <form onSubmit={handleLogin} className="w-full max-w-md space-y-6">
          {/* Mobile: CSSH Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <img
              src="/cssh_logo.jpg"
              alt="CSSH Logo"
              className="h-12 w-auto object-contain"
            />
          </div>
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">ISHPO</h1>
          </div>
          <p className="lg:hidden text-xs text-muted-foreground mb-4">
            ISHPO is a product of CSSH (Center For Spine and Sports Health)
          </p>

          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="text-muted-foreground mt-1">Sign in to your account</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@clinic.com" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link 
                  to="/forgot-password" 
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" autoComplete="current-password" />
            </div>
          </div>

          <Button type="submit" disabled={loading || authLoading} className="w-full gradient-primary text-primary-foreground h-11 font-semibold">
            {loading ? "Signing in..." : "Sign In"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <p className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
