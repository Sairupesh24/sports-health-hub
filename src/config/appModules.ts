import React from "react";
import {
  LayoutDashboard,
  Dumbbell,
  ClipboardCheck,
  Users,
  Activity,
  BarChart3,
  Orbit,
  ShieldCheck,
  Building2,
  Apple,
  CalendarDays,
  Stethoscope,
  TrendingUp,
} from "lucide-react";

export interface AppModuleDefinition {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  gradient: string;
  badgeStyle: string;
  defaultRoles: string[];
  badge?: string;
  comingSoon?: boolean;
}

export const APP_MODULES: AppModuleDefinition[] = [
  {
    id: "super_admin",
    name: "Super Admin Console",
    description: "Platform master console: tenant organization onboarding, identity engine & security permissions control.",
    icon: Building2,
    href: "/super-admin",
    color: "text-purple-700 bg-purple-100 border-purple-300",
    gradient: "from-purple-600/20 via-indigo-600/10 to-purple-700/10",
    badgeStyle: "bg-purple-100 text-purple-900 border-purple-300 font-bold",
    defaultRoles: ["super_admin"],
  },
  {
    id: "admin",
    name: "Admin Console",
    description: "Clients, billing & payments, calendar scheduling, waitlist, roster, and leads.",
    icon: LayoutDashboard,
    href: "/admin",
    color: "text-purple-600 bg-purple-100 border-purple-200",
    gradient: "from-purple-500/20 via-purple-600/10 to-indigo-600/10",
    badgeStyle: "bg-purple-100 text-purple-800 border-purple-200",
    defaultRoles: ["admin", "super_admin"],
  },
  {
    id: "settings",
    name: "Settings & Permissions",
    description: "System settings, organization details, role access control, field configuration, and service mappings.",
    icon: ShieldCheck,
    href: "/admin/settings/console-access",
    color: "text-violet-600 bg-violet-100 border-violet-200",
    gradient: "from-violet-500/20 via-purple-500/10 to-indigo-600/10",
    badgeStyle: "bg-violet-100 text-violet-800 border-violet-200",
    defaultRoles: ["admin", "super_admin", "hr_manager"],
  },
  {
    id: "clinical",
    name: "Clinical Management",
    description: "Entire Physio Console: dashboard, client medical profiles, treatment schedule, clinical reports, and injury repo.",
    icon: Stethoscope,
    href: "/consultant",
    color: "text-teal-600 bg-teal-100 border-teal-200",
    gradient: "from-teal-500/20 to-teal-600/10",
    badgeStyle: "bg-teal-100 text-teal-800 border-teal-200",
    defaultRoles: ["admin", "super_admin", "sports_physician", "physiotherapist", "consultant"],
  },
  {
    id: "ams",
    name: "Athlete Management",
    description: "Entire Sports Scientist Console: dashboard, schedule, athlete directory, reports, and membership management.",
    icon: Dumbbell,
    href: "/sports-scientist",
    color: "text-emerald-600 bg-emerald-100 border-emerald-200",
    gradient: "from-emerald-500/20 via-emerald-600/10 to-teal-600/10",
    badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-200",
    defaultRoles: ["admin", "super_admin", "sports_scientist"],
  },
  {
    id: "nutritionist",
    name: "Nutritionist Console",
    description: "Dietary assessments, meal planning, macro tracking, and client nutrition profiles.",
    icon: Apple,
    href: "/nutritionist",
    color: "text-amber-600 bg-amber-100 border-amber-200",
    gradient: "from-amber-500/20 via-orange-500/10 to-amber-600/10",
    badgeStyle: "bg-amber-100 text-amber-800 border-amber-200",
    defaultRoles: ["admin", "super_admin", "nutritionist"],
  },
  {
    id: "hr",
    name: "HR & Workforce",
    description: "Entire HR Module: dashboard, activity tracking, staff attendance logs, day planner, leave approvals, and user onboarding.",
    icon: Building2,
    href: "/hr",
    color: "text-blue-600 bg-blue-100 border-blue-200",
    gradient: "from-blue-500/20 to-blue-600/10",
    badgeStyle: "bg-blue-100 text-blue-800 border-blue-200",
    defaultRoles: ["admin", "super_admin", "hr_manager"],
  },
  {
    id: "foe",
    name: "Front Office Console",
    description: "Master calendar schedule, client registration, appointment check-ins, and front desk operations.",
    icon: CalendarDays,
    href: "/admin/calendar",
    color: "text-indigo-600 bg-indigo-100 border-indigo-200",
    gradient: "from-indigo-500/20 to-indigo-600/10",
    badgeStyle: "bg-indigo-100 text-indigo-800 border-indigo-200",
    defaultRoles: ["admin", "super_admin", "foe"],
  },
  {
    id: "questionnaires",
    name: "Forms & Assessments",
    description: "Questionnaire library, clinical evaluation templates, and data collection tools for specialists.",
    icon: ClipboardCheck,
    href: "/ams/questionnaires",
    color: "text-orange-600 bg-orange-100 border-orange-200",
    gradient: "from-orange-500/20 to-amber-600/10",
    badgeStyle: "bg-orange-100 text-orange-800 border-orange-200",
    defaultRoles: ["admin", "super_admin", "sports_physician", "physiotherapist", "consultant", "sports_scientist", "nutritionist", "foe"],
  },
  {
    id: "planner",
    name: "OrbitFlow Planner",
    description: "Project management, work tracking, sprints, Gantt schedules, capacity planning, and roadmaps.",
    icon: Orbit,
    href: "/planner",
    color: "text-fuchsia-600 bg-fuchsia-100 border-fuchsia-200",
    gradient: "from-fuchsia-500/20 via-purple-500/10 to-violet-600/10",
    badgeStyle: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
    defaultRoles: ["admin", "super_admin", "sports_physician", "physiotherapist", "consultant", "sports_scientist", "nutritionist", "foe"],
  },
  {
    id: "analytics",
    name: "Analytics & Reports",
    description: "Executive analytics, staff efficiency, and managerial insights across operations.",
    icon: BarChart3,
    href: "/admin/analytics/managerial",
    color: "text-rose-600 bg-rose-100 border-rose-200",
    gradient: "from-rose-500/20 to-rose-600/10",
    badgeStyle: "bg-amber-100 text-amber-800 border-amber-200 font-bold",
    defaultRoles: ["admin", "super_admin", "sports_physician", "physiotherapist", "consultant"],
    badge: "Coming Soon",
    comingSoon: true,
  },
  {
    id: "client",
    name: "Client & Athlete Portal",
    description: "Self-service appointment booking, workout logs, personal reports, and health portal.",
    icon: Users,
    href: "/client",
    color: "text-sky-600 bg-sky-100 border-sky-200",
    gradient: "from-sky-500/20 to-cyan-600/10",
    badgeStyle: "bg-sky-100 text-sky-800 border-sky-200",
    defaultRoles: ["admin", "super_admin", "client", "athlete"],
  },
];

/**
 * Universal helper to evaluate whether a user is granted access to a module.
 * Admins always have access to all modules.
 * For present/unmodified users (allowedConsoles is null/undefined), defaults to role permissions matrix.
 * For customized users (allowedConsoles is an array), evaluates allowedConsoles list.
 */
export const isModuleGrantedForUser = (
  userRole: string | string[] | undefined | null,
  profession: string | undefined | null,
  allowedConsoles: string[] | string | undefined | null,
  moduleObj: AppModuleDefinition,
  orgEnabledModules?: string[] | string | undefined | null
): boolean => {
  let userRolesArray: string[] = [];
  if (Array.isArray(userRole)) {
    userRolesArray = userRole.map((r) => String(r).toLowerCase().trim());
  } else if (typeof userRole === "string" && userRole.trim()) {
    userRolesArray = [userRole.toLowerCase().trim()];
  }

  const prof = (profession || "").toLowerCase().trim();

  // Super Admin module is strictly reserved for super_admin users
  if (moduleObj.id === "super_admin") {
    return userRolesArray.includes("super_admin");
  }

  // Check if organization has disabled/revoked access to this module
  if (orgEnabledModules !== undefined && orgEnabledModules !== null) {
    let parsedOrgModules: string[] | null = null;
    if (Array.isArray(orgEnabledModules)) {
      parsedOrgModules = orgEnabledModules;
    } else if (typeof orgEnabledModules === "string" && orgEnabledModules.trim()) {
      try {
        parsedOrgModules = JSON.parse(orgEnabledModules);
      } catch {
        parsedOrgModules = orgEnabledModules.split(",").map((s) => s.trim());
      }
    }
    if (Array.isArray(parsedOrgModules) && parsedOrgModules.length > 0) {
      if (!parsedOrgModules.includes(moduleObj.id)) {
        return false;
      }
    }
  }

  // Admins always have universal access to all organization-enabled modules
  const isAdmin = userRolesArray.some((r) => r === "admin" || r === "super_admin");
  if (isAdmin) return true;

  // Parse allowedConsoles if provided
  let parsedAllowed: string[] | null = null;
  if (allowedConsoles) {
    if (Array.isArray(allowedConsoles)) {
      parsedAllowed = allowedConsoles;
    } else if (typeof allowedConsoles === "string" && allowedConsoles.trim()) {
      try {
        parsedAllowed = JSON.parse(allowedConsoles);
      } catch {
        parsedAllowed = allowedConsoles.split(",").map((s) => s.trim());
      }
    }
  }

  // If admin has customized allowedConsoles list for this non-admin user
  if (parsedAllowed && Array.isArray(parsedAllowed)) {
    return parsedAllowed.includes(moduleObj.id);
  }

  // Fallback to default role permissions matrix for non-admin users
  const isDefaultGranted =
    userRolesArray.some((r) => moduleObj.defaultRoles.includes(r)) ||
    (moduleObj.id === "nutritionist" && prof.includes("nutrition")) ||
    (moduleObj.id === "clinical" && userRolesArray.some((r) => ["consultant", "sports_physician", "physiotherapist"].includes(r))) ||
    (moduleObj.id === "ams" && userRolesArray.includes("sports_scientist")) ||
    (moduleObj.id === "hr" && userRolesArray.includes("hr_manager")) ||
    (moduleObj.id === "foe" && userRolesArray.includes("foe"));

  return isDefaultGranted;
};
