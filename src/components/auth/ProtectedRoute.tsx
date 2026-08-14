import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardPath, isUserApproved } from "@/utils/navigation";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
  checkCalendarAccess?: boolean;
}

export default function ProtectedRoute({ children, requiredRole, checkCalendarAccess }: ProtectedRouteProps) {
  const { user, profile, roles, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen overflow-y-auto flex items-center justify-center bg-background">
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

  if (checkCalendarAccess) {
    const isAdmin = roles.includes("admin");
    const isGranted = profile?.has_calendar_access === true;
    if (!isAdmin && !isGranted) {
      return <Navigate to={getDashboardPath(roles, profile)} replace />;
    }
  }

  if (requiredRole) {
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    // Strict requirement check for super_admin routes
    if (rolesArray.includes("super_admin")) {
      const isSuperAdmin = roles.includes("super_admin") || profile?.role === "super_admin";
      if (!isSuperAdmin) {
        return <Navigate to={getDashboardPath(roles, profile)} replace />;
      }
    }

    // Organization module permission check: block access if module is disabled for the organization
    const isSuperAdminUser = roles.includes("super_admin") || profile?.role === "super_admin";
    if (!isSuperAdminUser && profile?.organization_enabled_modules) {
      let parsedOrgModules: string[] | null = null;
      if (Array.isArray(profile.organization_enabled_modules)) {
        parsedOrgModules = profile.organization_enabled_modules;
      } else if (typeof profile.organization_enabled_modules === "string" && profile.organization_enabled_modules.trim()) {
        try {
          parsedOrgModules = JSON.parse(profile.organization_enabled_modules);
        } catch {
          parsedOrgModules = (profile.organization_enabled_modules as string).split(',').map(s => s.trim());
        }
      }

      if (Array.isArray(parsedOrgModules) && parsedOrgModules.length > 0) {
        const routeModuleMap: Record<string, string> = {
          hr_manager: "hr",
          nutritionist: "nutritionist",
          consultant: "clinical",
          sports_physician: "clinical",
          physiotherapist: "clinical",
          sports_scientist: "ams",
          foe: "foe",
          client: "client",
          athlete: "client",
        };
        const requiresDisabledOrgModule = rolesArray.some(role => {
          const modId = routeModuleMap[role];
          return modId && !parsedOrgModules!.includes(modId);
        });

        if (requiresDisabledOrgModule) {
          return <Navigate to={getDashboardPath(roles, profile)} replace />;
        }
      }
    }

    const isAdmin = roles.includes("admin") || roles.includes("super_admin") || profile?.role === "admin";
    
    if (!isAdmin) {
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

      // Multi-console permissions check from profile.allowed_consoles
      let allowedConsolesList: string[] = [];
      if (profile?.allowed_consoles) {
        try {
          allowedConsolesList = typeof profile.allowed_consoles === 'string'
            ? JSON.parse(profile.allowed_consoles)
            : profile.allowed_consoles;
        } catch {
          allowedConsolesList = (profile.allowed_consoles as string).split(',').map(s => s.trim());
        }
      }

      if (!hasRole && allowedConsolesList.length > 0) {
        hasRole = rolesArray.some(role => {
          if (allowedConsolesList.includes(role)) return true;
          if (role === "client" && (allowedConsolesList.includes("client") || allowedConsolesList.includes("athlete"))) return true;
          if (role === "consultant" && (allowedConsolesList.includes("consultant") || allowedConsolesList.includes("clinical"))) return true;
          if (role === "sports_scientist" && (allowedConsolesList.includes("sports_scientist") || allowedConsolesList.includes("ams"))) return true;
          if (role === "hr_manager" && (allowedConsolesList.includes("hr_manager") || allowedConsolesList.includes("hr"))) return true;
          if (role === "nutritionist" && allowedConsolesList.includes("nutritionist")) return true;
          if (role === "foe" && allowedConsolesList.includes("foe")) return true;
          return false;
        });
      }

      if (!hasRole) {
        // User is approved but accessing a route for a different role —
        // redirect to their own dashboard using the shared utility.
        return <Navigate to={getDashboardPath(roles, profile)} replace />;
      }
    }
  }

  return <>{children}</>;
}
