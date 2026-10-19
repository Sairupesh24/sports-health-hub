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
  if (roles?.includes("super_admin") || profile?.role === "super_admin") {
    return "/super-admin";
  }

  const isClient =
    roles?.includes("client") ||
    roles?.includes("athlete") ||
    profile?.role === "client" ||
    profile?.role === "athlete";

  const isStaff = roles?.some(
    (r) =>
      !["client", "athlete"].includes(r) &&
      [
        "admin",
        "super_admin",
        "sports_scientist",
        "sports_physician",
        "physiotherapist",
        "nutritionist",
        "massage_therapist",
        "consultant",
        "foe",
        "hr_manager",
      ].includes(r)
  );

  // If user is registered/assigned as client, route directly to the main client console
  if (isClient && !isStaff) {
    return "/client";
  }

  // All other users land on the unified App Gallery after login
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
