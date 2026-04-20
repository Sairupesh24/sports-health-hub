import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, ArrowRight, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if the user is in a reset password flow session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If no session, they shouldn't be here unless they just clicked a link
        // which Supabase handles by putting the session in the URL fragment.
        // If after hydration there's still no session, redirect to login.
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast({
            title: "Invalid link",
            description: "The password reset link is invalid or has expired.",
            variant: "destructive",
          });
          navigate("/login");
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setSuccess(true);
      toast({
        title: "Password updated",
        description: "Your password has been reset successfully.",
      });
      
      // Navigate to login after a short delay
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="h-screen overflow-y-auto flex items-center justify-center bg-background p-8">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display text-2xl font-bold text-foreground">Password Reset Successfully</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your account security has been updated. You will be redirected to the login page shortly.
            </p>
          </div>
          <Button 
            onClick={() => navigate("/login")}
            className="gradient-primary text-primary-foreground font-semibold px-8 h-11"
          >
            Go to Login now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto flex">
      {/* Left - Branding */}
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
            <span className="font-display text-3xl font-bold text-primary-foreground">ISHPO</span>
          </div>
          <h2 className="font-display text-4xl font-bold text-primary-foreground leading-tight mb-4">
            Security Checkpoint
          </h2>
          <p className="text-lg text-sidebar-foreground/80 leading-relaxed">
            Almost there! Please choose a new, strong password to regain access to your ISHPO account.
          </p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-background">
        <form onSubmit={handleResetPassword} className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">ISHPO</h1>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Set New Password</h2>
            <p className="text-muted-foreground mt-1">Make sure it's something you'll remember (or use a manager!).</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••" 
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input 
                id="confirmPassword" 
                type="password" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                placeholder="••••••••" 
                minLength={6}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full gradient-primary text-primary-foreground h-11 font-semibold"
          >
            {loading ? "Updating..." : "Reset Password"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>

          <div className="text-center">
            <Link 
              to="/login" 
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Cancel and go back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
