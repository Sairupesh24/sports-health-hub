import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
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

  if (requiredRole) {
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRole = rolesArray.some((role) => roles.includes(role));

    if (!hasRole) {
      if (roles.includes("super_admin")) return <Navigate to="/super-admin" replace />;
      if (roles.includes("admin")) return <Navigate to="/admin" replace />;
      if (roles.includes("consultant")) return <Navigate to="/consultant" replace />;
      if (roles.includes("foe")) return <Navigate to="/admin/calendar" replace />;
      if (roles.includes("client")) return <Navigate to="/client" replace />;
      return <Navigate to="/pending-approval" replace />;
    }
  }

  return <>{children}</>;
}
