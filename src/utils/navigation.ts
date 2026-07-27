/**
 * Centralized role-based navigation utility.
 * Returns the dashboard path for a given set of roles & profile data.
 * This eliminates duplicated redirect logic across LoginPage, ProtectedRoute,
 * PendingApprovalPage, and Index.
 */
export function getDashboardPath(
  roles: string[],
  profile?: { profession?: string | null; role?: string | null; ams_role?: string | null } | null
): string {
  if (roles.includes("super_admin")) return "/super-admin";
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("sports_scientist")) return "/sports-scientist";
  if (roles.includes("hr_manager")) return "/hr";

  // Check Nutritionist BEFORE generic consultant check
  const isNutritionist =
    roles.includes("nutritionist") ||
    (profile?.profession || "").toLowerCase().includes("nutrition") ||
    (profile?.role || "").toLowerCase().includes("nutrition") ||
    (profile?.ams_role || "").toLowerCase().includes("nutrition");

  if (isNutritionist) return "/nutritionist";

  if (roles.includes("consultant")) return "/consultant";
  if (roles.includes("sports_physician")) return "/consultant";
  if (roles.includes("physiotherapist")) return "/consultant";
  if (roles.includes("foe")) return "/admin/calendar";
  if (roles.includes("client")) return "/client";
  if (roles.includes("athlete")) return "/client";
  return "/profile";
}

/**
 * Checks whether a user is considered "approved" based on their profile and roles.
 * Admins, super-admins, and sports scientists bypass the approval gate.
 */
export function isUserApproved(
  profile: { is_approved: boolean } | null,
  roles: string[]
): boolean {
  if (!profile) return false;
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");
  const isScientist = roles.includes("sports_scientist");
  return profile.is_approved || isAdmin || isScientist;
}
