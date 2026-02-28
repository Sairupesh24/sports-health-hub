import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, profile, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && !profile.is_approved) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (requiredRole && !roles.includes(requiredRole)) {
    // Redirect to first available role dashboard
    if (roles.includes("admin")) return <Navigate to="/admin" replace />;
    if (roles.includes("consultant")) return <Navigate to="/consultant" replace />;
    if (roles.includes("client")) return <Navigate to="/client" replace />;
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
}
