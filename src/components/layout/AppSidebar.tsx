import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Boxes,
  UserCheck,
  Users,
  Calendar,
  ClipboardList,
  Dumbbell,
  Activity,
  CreditCard,
  Settings,
  Target,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
  CalendarPlus,
  MessageSquare,
  CalendarClock,
  CheckSquare,
  TrendingUp,
  Flame,
  Apple,
  Layers,
  Bell,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  isUnderDevelopment?: boolean;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Staff Efficiency", icon: TrendingUp, href: "/admin/analytics/managerial" },
  { label: "Clients", icon: Users, href: "/admin/clients" },
  { label: "Billing", icon: CreditCard, href: "/admin/billing" },
  { label: "Calendar", icon: CalendarDays, href: "/admin/calendar" },
  { label: "Leads", icon: MessageSquare, href: "/admin/leads" },
  { label: "User Approvals", icon: UserCheck, href: "/admin/users" },
];

const consultantNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/consultant" },
  { label: "Clients", icon: Users, href: "/consultant/clients" },
  { label: "Schedule", icon: Calendar, href: "/consultant/schedule" },
  { label: "Reports", icon: ClipboardList, href: "/consultant/reports" },
  { label: "Injury Repo", icon: Activity, href: "/consultant/injuries" },
  { label: "My Attendance", icon: Clock, href: "/my-attendance" },
];

const clientNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/client" },
  { label: "Schedule", icon: Calendar, href: "/client/appointments" },
  { label: "My Reports", icon: ClipboardList, href: "/client/reports" },
  { label: "Performance", icon: Activity, href: "/client/performance" },
  { label: "Billing", icon: CreditCard, href: "/client/billing" },
];

const foeNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/foe" },
  { label: "Clients", icon: Users, href: "/admin/clients" },
  { label: "Calendar", icon: CalendarDays, href: "/admin/calendar" },
  { label: "Billing", icon: CreditCard, href: "/admin/billing" },
  { label: "Leads", icon: MessageSquare, href: "/admin/leads" },
  { label: "Attendance", icon: Clock, href: "/my-attendance" },
];

const sportsScientistNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/sports-scientist" },
  { label: "Schedule", icon: Calendar, href: "/sports-scientist/schedule" },
  { label: "Clients", icon: Users, href: "/sports-scientist/clients" },
  { label: "Reports", icon: ClipboardList, href: "/sports-scientist/reports" },
  { label: "Manage Memberships", icon: CreditCard, href: "/sports-scientist/billing" },
  { label: "My Attendance", icon: Clock, href: "/my-attendance" },
];

const managerNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Staff Efficiency", icon: TrendingUp, href: "/admin/analytics/managerial" },
  { label: "Clients", icon: Users, href: "/admin/clients" },
  { label: "Calendar", icon: CalendarDays, href: "/admin/calendar" },
  { label: "Reports", icon: ClipboardList, href: "/admin/reports" },
];

const hrNav: NavItem[] = [
  { label: "HR Dashboard", icon: LayoutDashboard, href: "/hr" },
  { label: "Activity Tracker", icon: Activity, href: "/hr/activity-tracker" },
  { label: "My Attendance", icon: Clock, href: "/my-attendance" },
  { label: "Day Planner", icon: CalendarDays, href: "/hr/day-planner" },
  { label: "Leave Approvals", icon: CheckSquare, href: "/hr/leave-approvals" },
  { label: "Staff Attendance Log", icon: CalendarClock, href: "/hr/attendance-logs" },
  { label: "User Approvals", icon: UserCheck, href: "/hr/users" },
  { label: "Settings & Permissions", icon: ShieldCheck, href: "/admin/settings/console-access" },
];

const settingsNav: NavItem[] = [
  { label: "Console Access Control", icon: ShieldCheck, href: "/admin/settings/console-access" },
  { label: "Service Mapping", icon: Layers, href: "/admin/settings/services" },
  { label: "Resource Schedules", icon: Clock, href: "/admin/settings/resource-schedule" },
  { label: "Injury Master Data", icon: Activity, href: "/admin/settings/injuries" },
  { label: "Custom Fields", icon: CheckSquare, href: "/admin/settings/fields" },
  { label: "Notifications", icon: Bell, href: "/admin/settings/notifications" },
];

const superAdminNav: NavItem[] = [
  { label: "Master Console", icon: LayoutDashboard, href: "/super-admin" },
  { label: "Onboard Organization", icon: Building2, href: "/super-admin/organizations/new" },
];

const athleteNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/ams/athlete-portal" },
  { label: "Performance", icon: Activity, href: "/client/performance" },
  { label: "Schedule", icon: Calendar, href: "/client/appointments" },
  { label: "My Reports", icon: ClipboardList, href: "/client/reports" },
  { label: "Billing", icon: CreditCard, href: "/client/billing" },
];

const nutritionistNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/nutritionist" },
  { label: "Nutrition Clients", icon: Users, href: "/nutritionist/clients" },
  { label: "Assessments", icon: ClipboardList, href: "/nutritionist/assessments" },
  { label: "Meal Plans", icon: Flame, href: "/nutritionist/meal-plans" },
  { label: "Schedule", icon: Calendar, href: "/nutritionist/schedule" },
  { label: "Attendance", icon: CalendarClock, href: "/my-attendance" },
];

const questionnairesNav: NavItem[] = [
  { label: "Forms & Assessments", icon: ClipboardList, href: "/ams/questionnaires" },
  { label: "Batch Testing", icon: Target, href: "/ams/batch-tests" },
];

const coachNav: NavItem[] = [
  { label: "AMS Dashboard", icon: LayoutDashboard, href: "/ams/coach-dashboard" },
  { label: "Programs", icon: Dumbbell, href: "/ams/programs" },
  { label: "Feed", icon: Activity, href: "/ams/feed" },
  { label: "Calendar", icon: CalendarDays, href: "/ams/calendar" },
  { label: "Exercise Library", icon: ClipboardList, href: "/ams/exercises" },
  { label: "Batch Testing", icon: Target, href: "/ams/batch-tests" },
];

const navMap: Record<string, NavItem[]> = {
  super_admin: superAdminNav,
  admin: adminNav,
  consultant: consultantNav,
  physiotherapist: consultantNav,
  client: clientNav,
  foe: foeNav,
  sports_scientist: sportsScientistNav,
  manager: managerNav,
  athlete: athleteNav,
  hr_manager: hrNav,
  sports_physician: consultantNav,
  nutritionist: nutritionistNav,
  coach: coachNav,
  settings: settingsNav,
  questionnaires: questionnairesNav,
};

const getPrimaryConsole = (userRoles: string[] = [], userProfile: any = null, explicitRole?: string): string => {
  if (explicitRole && explicitRole.trim()) {
    if (["consultant", "physiotherapist", "sports_physician", "massage_therapist"].includes(explicitRole)) return "consultant";
    if (explicitRole === "sports_scientist") return "sports_scientist";
    if (explicitRole === "nutritionist") return "nutritionist";
    if (explicitRole === "hr_manager") return "hr_manager";
    if (explicitRole === "foe") return "foe";
    if (explicitRole === "super_admin") return "super_admin";
    if (explicitRole === "admin") return "admin";
    if (explicitRole === "coach") return "coach";
    if (explicitRole === "client" || explicitRole === "athlete") return "client";
  }

  const prof = (userProfile?.profession || userProfile?.role || "").toLowerCase();
  const amsRole = (userProfile?.ams_role || "").toLowerCase();

  if (userRoles.includes("super_admin")) return "super_admin";
  if (userRoles.includes("admin")) return "admin";
  if (userRoles.includes("hr_manager") || prof.includes("hr")) return "hr_manager";
  if (userRoles.includes("nutritionist") || prof.includes("nutrition")) return "nutritionist";
  if (userRoles.includes("sports_scientist") || amsRole === "sports_scientist" || prof.includes("sports_scientist") || prof.includes("scientist")) return "sports_scientist";
  if (
    userRoles.includes("physiotherapist") ||
    userRoles.includes("sports_physician") ||
    userRoles.includes("consultant") ||
    userRoles.includes("massage_therapist") ||
    prof.includes("physio") ||
    prof.includes("physician")
  ) {
    return "consultant";
  }
  if (userRoles.includes("foe") || prof.includes("front office") || prof.includes("reception")) return "foe";
  if (amsRole === "coach" || userRoles.includes("coach")) return "coach";
  if (userRoles.includes("athlete") || amsRole === "athlete") return "athlete";
  if (userRoles.includes("client") || amsRole === "client") return "client";

  return "consultant";
};

interface AppSidebarProps {
  role: string;
  isMobile?: boolean;
  className?: string;
  onNavigate?: () => void;
}

export default function AppSidebar({ role, isMobile, className, onNavigate }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile, roles, loading, refreshAuth } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Effective expansion state
  const isExpanded = isMobile || !collapsed || isHovered;

  // Resolve role atomically based on explicit prop, authenticated context, and profile
  const resolvedRole = useMemo(() => {
    if (role && role.trim()) {
      return role;
    }
    if (roles?.includes("super_admin")) return "super_admin";
    if (roles?.includes("admin")) return "admin";
    if (
      roles?.includes("nutritionist") ||
      (profile?.profession || "").toLowerCase().includes("nutrition") ||
      (profile?.role || "").toLowerCase().includes("nutrition") ||
      (profile?.ams_role || "").toLowerCase().includes("nutrition")
    ) {
      return "nutritionist";
    }
    if (roles?.includes("sports_scientist")) return "sports_scientist";
    if (roles?.includes("hr_manager")) return "hr_manager";
    if (
      roles?.includes("consultant") ||
      roles?.includes("physiotherapist") ||
      roles?.includes("sports_physician")
    ) {
      return "consultant";
    }
    if (roles?.includes("foe")) return "foe";
    if (roles?.includes("manager")) return "manager";
    if (roles?.includes("athlete")) return "athlete";
    if (roles?.includes("client")) return "client";
    return "";
  }, [roles, profile, role]);

  // Fetch pending user approvals count (only for admin, hr_manager)
  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ["pending-approvals-count", profile?.organization_id],
    queryFn: async () => {
      if (!["admin", "hr_manager"].includes(resolvedRole)) return 0;
      const data = await apiFetch<any>('/hr/stats');
      return data?.data?.pendingApprovals || 0;
    },
    enabled: !!profile?.organization_id && ["admin", "hr_manager"].includes(resolvedRole),
    refetchInterval: 30000
  });

  // Subscribe to SSE to invalidate pending-approvals-count and permissions in real-time
  useEffect(() => {
    if (!profile?.id || isMobile) return;

    const token = localStorage.getItem('ishpo_jwt');
    if (!token) return;

    const streamUrl = `/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = () => {
      try {
        queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
        refreshAuth();
      } catch (err) {
        console.error('[SSE Sidebar] Failed to parse message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE Sidebar] EventSource failed:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [profile?.id, isMobile, queryClient, refreshAuth]);

  const items = useMemo(() => {
    const path = location.pathname;
    const primaryConsole = getPrimaryConsole(roles, profile, resolvedRole || role);

    const hasCalendarAccess = Boolean(
      roles?.some(r => ["admin", "super_admin", "foe"].includes(r)) ||
      profile?.has_calendar_access === true
    );

    const hasAnalyticsAccess = Boolean(
      roles?.some(r => ["admin", "super_admin", "manager", "hr_manager"].includes(r)) ||
      profile?.has_analytics_access === true
    );

    // Dynamic builders for primary console menus
    const buildConsultantNav = (): NavItem[] => {
      const nav: NavItem[] = [
        { label: "Dashboard", icon: LayoutDashboard, href: "/consultant" },
      ];
      if (hasAnalyticsAccess) {
        nav.push({ label: "Staff Efficiency", icon: TrendingUp, href: "/admin/analytics/managerial" });
      }
      nav.push(
        { label: "Clients", icon: Users, href: "/consultant/clients" },
        { label: "Schedule", icon: Calendar, href: "/consultant/schedule" }
      );
      if (hasCalendarAccess) {
        nav.push({ label: "Admin Calendar", icon: CalendarDays, href: "/admin/calendar" });
      }
      nav.push(
        { label: "Reports", icon: ClipboardList, href: "/consultant/reports" },
        { label: "Injury Repo", icon: Activity, href: "/consultant/injuries" },
        { label: "My Attendance", icon: Clock, href: "/my-attendance" }
      );
      return nav;
    };

    const buildSportsScientistNav = (): NavItem[] => {
      const nav: NavItem[] = [
        { label: "Dashboard", icon: LayoutDashboard, href: "/sports-scientist" },
      ];
      if (hasAnalyticsAccess) {
        nav.push({ label: "Staff Efficiency", icon: TrendingUp, href: "/admin/analytics/managerial" });
      }
      nav.push(
        { label: "Schedule", icon: Calendar, href: "/sports-scientist/schedule" }
      );
      if (hasCalendarAccess) {
        nav.push({ label: "Admin Calendar", icon: CalendarDays, href: "/admin/calendar" });
      }
      nav.push(
        { label: "Clients", icon: Users, href: "/sports-scientist/clients" },
        { label: "Reports", icon: ClipboardList, href: "/sports-scientist/reports" },
        { label: "Manage Memberships", icon: CreditCard, href: "/sports-scientist/billing" },
        { label: "My Attendance", icon: Clock, href: "/my-attendance" }
      );
      return nav;
    };

    const buildNutritionistNav = (): NavItem[] => {
      const nav: NavItem[] = [
        { label: "Dashboard", icon: LayoutDashboard, href: "/nutritionist" },
      ];
      if (hasAnalyticsAccess) {
        nav.push({ label: "Staff Efficiency", icon: TrendingUp, href: "/admin/analytics/managerial" });
      }
      nav.push(
        { label: "Nutrition Clients", icon: Users, href: "/nutritionist/clients" },
        { label: "Assessments", icon: ClipboardList, href: "/nutritionist/assessments" },
        { label: "Meal Plans", icon: Flame, href: "/nutritionist/meal-plans" },
        { label: "Schedule", icon: Calendar, href: "/nutritionist/schedule" }
      );
      if (hasCalendarAccess) {
        nav.push({ label: "Admin Calendar", icon: CalendarDays, href: "/admin/calendar" });
      }
      nav.push(
        { label: "Attendance", icon: CalendarClock, href: "/my-attendance" }
      );
      return nav;
    };

    const buildAdminNav = (): NavItem[] => {
      const nav: NavItem[] = [
        { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
      ];
      if (hasAnalyticsAccess) {
        nav.push({ label: "Staff Efficiency", icon: TrendingUp, href: "/admin/analytics/managerial" });
      }
      nav.push(
        { label: "Clients", icon: Users, href: "/admin/clients" },
        { label: "Billing", icon: CreditCard, href: "/admin/billing" }
      );
      if (hasCalendarAccess) {
        nav.push({ label: "Calendar", icon: CalendarDays, href: "/admin/calendar" });
      }
      nav.push(
        { label: "Leads", icon: MessageSquare, href: "/admin/leads" },
        { label: "User Approvals", icon: UserCheck, href: "/admin/users" }
      );
      return nav;
    };

    const buildHrNav = (): NavItem[] => {
      const nav: NavItem[] = [
        { label: "HR Dashboard", icon: LayoutDashboard, href: "/hr" },
        { label: "Activity Tracker", icon: Activity, href: "/hr/activity-tracker" },
      ];
      if (hasAnalyticsAccess) {
        nav.push({ label: "Staff Efficiency", icon: TrendingUp, href: "/admin/analytics/managerial" });
      }
      nav.push(
        { label: "My Attendance", icon: Clock, href: "/my-attendance" },
        { label: "Day Planner", icon: CalendarDays, href: "/hr/day-planner" }
      );
      if (hasCalendarAccess) {
        nav.push({ label: "Admin Calendar", icon: CalendarDays, href: "/admin/calendar" });
      }
      nav.push(
        { label: "Leave Approvals", icon: CheckSquare, href: "/hr/leave-approvals" },
        { label: "Staff Attendance Log", icon: CalendarClock, href: "/hr/attendance-logs" },
        { label: "User Approvals", icon: UserCheck, href: "/hr/users" },
        { label: "Settings & Permissions", icon: ShieldCheck, href: "/admin/settings/console-access" }
      );
      return nav;
    };

    const buildFoeNav = (): NavItem[] => {
      return foeNav;
    };

    const storedConsole = sessionStorage.getItem("active_console");
    const isPureFoeUser = Boolean(roles?.includes("foe") && !roles?.includes("admin") && !roles?.includes("super_admin"));

    let effectiveConsole = storedConsole;

    // Detect console from unambiguous routes
    if (path.startsWith('/admin/settings') || path.startsWith('/admin/permissions')) {
      effectiveConsole = 'settings';
      try { sessionStorage.setItem('active_console', 'settings'); } catch {}
    } else if (path.startsWith('/hr')) {
      effectiveConsole = 'hr';
      try { sessionStorage.setItem('active_console', 'hr'); } catch {}
    } else if (path.startsWith('/sports-scientist')) {
      effectiveConsole = 'sports_scientist';
      try { sessionStorage.setItem('active_console', 'sports_scientist'); } catch {}
    } else if (path.startsWith('/consultant')) {
      effectiveConsole = 'consultant';
      try { sessionStorage.setItem('active_console', 'consultant'); } catch {}
    } else if (path.startsWith('/nutritionist')) {
      effectiveConsole = 'nutritionist';
      try { sessionStorage.setItem('active_console', 'nutritionist'); } catch {}
    } else if (path.startsWith('/ams/questionnaires') || path.startsWith('/ams/batch-tests')) {
      if (storedConsole !== 'sports_scientist' && storedConsole !== 'consultant' && storedConsole !== 'coach') {
        effectiveConsole = 'questionnaires';
      }
    } else if (path.startsWith('/ams/coach-dashboard') || path.startsWith('/ams/programs') || path.startsWith('/ams/feed') || path.startsWith('/ams/calendar') || path.startsWith('/ams/exercises')) {
      effectiveConsole = 'coach';
      try { sessionStorage.setItem('active_console', 'coach'); } catch {}
    } else if (path.startsWith('/ams/athlete-portal') || path.startsWith('/ams/athlete')) {
      effectiveConsole = 'athlete';
      try { sessionStorage.setItem('active_console', 'athlete'); } catch {}
    } else if (path.startsWith('/client')) {
      effectiveConsole = 'client';
      try { sessionStorage.setItem('active_console', 'client'); } catch {}
    } else if (path.startsWith('/super-admin')) {
      effectiveConsole = 'super_admin';
      try { sessionStorage.setItem('active_console', 'super_admin'); } catch {}
    } else if (path === '/admin/foe' || path.startsWith('/admin/foe') || isPureFoeUser) {
      effectiveConsole = 'foe';
      try { sessionStorage.setItem('active_console', 'foe'); } catch {}
    } else if (path === '/admin' || (path.startsWith('/admin') && !path.startsWith('/admin/calendar') && !path.startsWith('/admin/analytics') && !path.startsWith('/admin/clients') && !path.startsWith('/admin/billing') && !path.startsWith('/admin/leads') && storedConsole === 'admin')) {
      effectiveConsole = 'admin';
      try { sessionStorage.setItem('active_console', 'admin'); } catch {}
    }

    if (!effectiveConsole) {
      effectiveConsole = primaryConsole;
    }

    let activeConsoleItems: NavItem[] = buildAdminNav();

    switch (effectiveConsole) {
      case 'settings':
        activeConsoleItems = settingsNav;
        break;
      case 'consultant':
        activeConsoleItems = buildConsultantNav();
        break;
      case 'sports_scientist':
        activeConsoleItems = buildSportsScientistNav();
        break;
      case 'nutritionist':
        activeConsoleItems = buildNutritionistNav();
        break;
      case 'hr':
      case 'hr_manager':
        activeConsoleItems = buildHrNav();
        break;
      case 'foe':
        activeConsoleItems = buildFoeNav();
        break;
      case 'coach':
        activeConsoleItems = coachNav;
        break;
      case 'questionnaires':
        activeConsoleItems = questionnairesNav;
        break;
      case 'super_admin':
        activeConsoleItems = superAdminNav;
        break;
      case 'athlete':
        activeConsoleItems = athleteNav;
        break;
      case 'client':
        activeConsoleItems = clientNav;
        break;
      case 'admin':
      default:
        activeConsoleItems = buildAdminNav();
        break;
    }

    return activeConsoleItems;
  }, [resolvedRole, role, roles, profile?.has_calendar_access, profile?.has_analytics_access, profile?.profession, profile?.ams_role, profile?.role, location.pathname]);

  const isLoadingState = loading || items.length === 0;

  return (
    <div className={cn("relative shrink-0", !isMobile && (collapsed ? "w-16" : "w-64"))}>
      <aside
        onMouseEnter={() => !isMobile && setIsHovered(true)}
        onMouseLeave={() => !isMobile && setIsHovered(false)}
        className={cn(
          "flex flex-col bg-sidebar transition-all duration-300 ease-in-out z-40",
          isMobile
            ? "w-full h-full"
            : cn(
                "h-screen border-r border-sidebar-border shadow-md",
                isExpanded ? "w-64 shadow-2xl" : "w-16",
                collapsed && isHovered && "absolute left-0 top-0 bg-sidebar/95 backdrop-blur-md"
              ),
          className
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border h-[65px] shrink-0">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <span
            className={cn(
              "font-display font-bold text-sidebar-primary-foreground text-lg tracking-tight whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden",
              isExpanded ? "opacity-100 max-w-[150px]" : "opacity-0 max-w-0 pointer-events-none"
            )}
          >
            ISHPO
          </span>
        </div>

        {/* Nav Items Container */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {/* App Gallery return link */}
          <Link
            to="/app-gallery"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 h-10 mb-2 border-b border-sidebar-border/50 pb-3",
              location.pathname === "/app-gallery"
                ? "bg-sidebar-accent text-sidebar-primary shadow-glow"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <div className="relative flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5 text-primary" />
            </div>
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-300 ease-in-out flex-1 truncate",
                isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0 pointer-events-none"
              )}
            >
              App Gallery
            </span>
          </Link>

          {isLoadingState ? (
            // Neutral Skeleton Placeholders (Zero text flash)
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg h-10">
                <div className="w-5 h-5 rounded bg-sidebar-accent/60 animate-pulse shrink-0" />
                <div
                  className={cn(
                    "h-4 bg-sidebar-accent/60 animate-pulse rounded whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden",
                    isExpanded ? "opacity-100 w-28" : "opacity-0 w-0 pointer-events-none"
                  )}
                />
              </div>
            ))
          ) : (
            items.map((item) => {
              const isDashboardRoot = [
                "/hr",
                "/admin",
                "/admin/foe",
                "/super-admin",
                "/nutritionist",
                "/consultant",
                "/ams/athlete-portal",
                "/ams/coach-dashboard",
                "/sports-scientist",
                "/client"
              ].includes(item.href);
              const isActive = isDashboardRoot
                ? location.pathname === item.href
                : (
                    location.pathname === item.href ||
                    location.pathname.startsWith(item.href + '/') ||
                    (item.href === "/admin/settings/console-access" && (
                      location.pathname === "/admin/settings" ||
                      location.pathname.startsWith("/admin/settings/permissions") ||
                      location.pathname.startsWith("/admin/permissions")
                    ))
                  );
              return (
                <Link
                  key={item.href}
                  to={item.isUnderDevelopment ? "#" : item.href}
                  onClick={(e) => {
                    if (item.isUnderDevelopment) {
                      e.preventDefault();
                      toast({
                        title: "Under Development",
                        description: `${item.label} page is currently under development and will be available in later updates.`,
                      });
                    } else if (onNavigate) {
                      onNavigate();
                    }
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 h-10",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary shadow-glow"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <div className="relative flex items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!isExpanded && item.label === "User Approvals" && pendingApprovals > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-orange-500 rounded-full border border-sidebar animate-pulse" />
                    )}
                  </div>

                  <span
                    className={cn(
                      "whitespace-nowrap transition-all duration-300 ease-in-out flex-1 flex items-center justify-between overflow-hidden",
                      isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0 pointer-events-none"
                    )}
                  >
                    <span className="truncate">{item.label}</span>
                    {item.label === "User Approvals" && pendingApprovals > 0 && (
                      <span className="ml-2 px-2 py-0.5 text-[10px] font-black rounded-full bg-orange-500 text-white animate-pulse shrink-0">
                        {pendingApprovals}
                      </span>
                    )}
                  </span>
                </Link>
              );
            })
          )}
        </nav>

        {/* Footer Actions */}
        <div className="border-t border-sidebar-border p-2 space-y-1 shrink-0">
          {!isMobile && (
            <button
              onClick={() => {
                setCollapsed(!collapsed);
                setIsHovered(false);
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors h-10"
            >
              {collapsed ? <ChevronRight className="w-5 h-5 shrink-0" /> : <ChevronLeft className="w-5 h-5 shrink-0" />}
              <span
                className={cn(
                  "whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden text-left",
                  isExpanded ? "opacity-100 max-w-[150px]" : "opacity-0 max-w-0 pointer-events-none"
                )}
              >
                {collapsed ? "Expand / Pin" : "Collapse"}
              </span>
            </button>
          )}

          <Link
            to="/profile"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors h-10"
          >
            <UserCheck className="w-5 h-5 shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden text-left",
                isExpanded ? "opacity-100 max-w-[150px]" : "opacity-0 max-w-0 pointer-events-none"
              )}
            >
              My Profile
            </span>
          </Link>

          <button
            onClick={async () => { await signOut(); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive w-full transition-colors h-10"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden text-left",
                isExpanded ? "opacity-100 max-w-[150px]" : "opacity-0 max-w-0 pointer-events-none"
              )}
            >
              Sign Out
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
}
