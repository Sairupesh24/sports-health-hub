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
  // Every user lands on the unified App Gallery after login
  return "/app-gallery";
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
