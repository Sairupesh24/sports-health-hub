/**
 * Centralized role-based navigation utility.
 * Returns the dashboard path for a given set of roles.
 * This eliminates duplicated redirect logic across LoginPage, ProtectedRoute,
 * PendingApprovalPage, and Index.
 */
export function getDashboardPath(roles: string[]): string {
  if (roles.includes("super_admin")) return "/super-admin";
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("sports_scientist")) return "/sports-scientist";
  if (roles.includes("manager")) return "/admin";
  if (roles.includes("consultant")) return "/consultant";
  if (roles.includes("sports_physician")) return "/consultant";
  if (roles.includes("physiotherapist")) return "/consultant";
  if (roles.includes("nutritionist")) return "/consultant";
  if (roles.includes("foe")) return "/admin/calendar";
  if (roles.includes("client")) return "/client";
  if (roles.includes("athlete")) return "/client";
  return "/";
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
