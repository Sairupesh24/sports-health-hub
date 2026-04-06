import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardPath, isUserApproved } from "@/utils/navigation";

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

  // Profile hasn't loaded yet (shouldn't happen if loading is false, but be defensive)
  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  // Check approval status using shared utility
  if (!isUserApproved(profile, roles)) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (requiredRole) {
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    let hasRole = rolesArray.some((role) => roles.includes(role));

    // Specialized consultant roles are interchangeable with generic consultant access
    const consultantRoles = ["consultant", "sports_physician", "physiotherapist", "nutritionist"];
    if (!hasRole && roles.some(role => consultantRoles.includes(role)) && rolesArray.includes("consultant")) {
      hasRole = true;
    }

    // Athlete and Client are interchangeable for access to client-facing routes
    if (!hasRole && roles.includes("athlete") && rolesArray.includes("client")) {
      hasRole = true;
    }

    if (!hasRole) {
      // User is approved but accessing a route for a different role —
      // redirect to their own dashboard using the shared utility.
      return <Navigate to={getDashboardPath(roles)} replace />;
    }
  }

  return <>{children}</>;
}
