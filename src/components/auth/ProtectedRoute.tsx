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

  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isScientist = roles.includes("sports_scientist");
  const isApproved = profile?.is_approved || isAdmin || isScientist;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Exempt admins and scientists from approval check
  if (profile && !isApproved) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (requiredRole) {
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    let hasRole = rolesArray.some((role) => roles.includes(role));

    // Athlete and Client are interchangeable for access to client-facing routes
    if (!hasRole && roles.includes("athlete") && rolesArray.includes("client")) {
      hasRole = true;
    }

    if (!hasRole) {
      if (roles.includes("super_admin")) return <Navigate to="/super-admin" replace />;
      if (roles.includes("admin")) return <Navigate to="/admin" replace />;
      if (roles.includes("sports_scientist")) return <Navigate to="/sports-scientist" replace />;
      if (roles.includes("manager")) return <Navigate to="/admin" replace />;
      if (roles.includes("consultant")) return <Navigate to="/consultant" replace />;
      if (roles.includes("foe")) return <Navigate to="/admin/calendar" replace />;
      if (roles.includes("client")) return <Navigate to="/client" replace />;
      if (roles.includes("athlete")) return <Navigate to="/client" replace />;
      
      // If approved but no recognized role yet, or wrong role for route
      if (isApproved) {
        return <Navigate to="/" replace />;
      }
      return <Navigate to="/pending-approval" replace />;
    }
  }

  return <>{children}</>;
}
