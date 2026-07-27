import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
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
  { label: "Clients", icon: Users, href: "/admin/clients" },
  { label: "Leads", icon: MessageSquare, href: "/admin/leads" },
  { label: "Calendar", icon: CalendarDays, href: "/admin/calendar" },
  { label: "Reports", icon: ClipboardList, href: "/admin/reports" },
  { label: "Billing", icon: CreditCard, href: "/admin/billing" },
  { label: "Questionnaires", icon: ClipboardList, href: "/ams/questionnaires" },
  { label: "User Approvals", icon: UserCheck, href: "/admin/users" },
  { label: "Attendance", icon: CalendarClock, href: "/my-attendance" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
];

const consultantNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/consultant" },
  { label: "Clients", icon: Users, href: "/consultant/clients" },
  { label: "Schedule", icon: Calendar, href: "/consultant/schedule" },
  { label: "Availability", icon: Clock, href: "/consultant/availability" },
  { label: "Reports", icon: ClipboardList, href: "/consultant/reports" },
  { label: "Injury Repo", icon: Activity, href: "/consultant/injuries" },
  { label: "Questionnaires", icon: ClipboardList, href: "/ams/questionnaires" },
  { label: "Attendance", icon: CalendarClock, href: "/my-attendance" },
];

const clientNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/client" },
  { label: "Schedule", icon: Calendar, href: "/client/appointments" },
  { label: "My Reports", icon: ClipboardList, href: "/client/reports" },
  { label: "Performance", icon: Activity, href: "/client/performance" },
  { label: "Billing", icon: CreditCard, href: "/client/billing" },
];

const foeNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Clients", icon: Users, href: "/admin/clients" },
  { label: "Leads", icon: MessageSquare, href: "/admin/leads" },
  { label: "Calendar", icon: CalendarDays, href: "/admin/calendar" },
  { label: "Reports", icon: ClipboardList, href: "/admin/reports" },
  { label: "Billing", icon: CreditCard, href: "/admin/billing" },
  { label: "Questionnaires", icon: ClipboardList, href: "/ams/questionnaires" },
  { label: "User Approvals", icon: UserCheck, href: "/admin/users" },
  { label: "Attendance", icon: CalendarClock, href: "/my-attendance" },
];

const sportsScientistNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/sports-scientist" },
  { label: "Schedule", icon: Calendar, href: "/sports-scientist/schedule" },
  { label: "Clients", icon: Users, href: "/sports-scientist/clients" },
  { label: "Reports", icon: ClipboardList, href: "/sports-scientist/reports" },
  { label: "Analytics", icon: Activity, href: "/sports-scientist/analytics" },
  { label: "Questionnaires", icon: ClipboardList, href: "/ams/questionnaires" },
  { label: "Manage Memberships", icon: CreditCard, href: "/sports-scientist/billing" },
  { label: "Attendance", icon: CalendarClock, href: "/my-attendance" },
];

const managerNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin" },
  { label: "Clients", icon: Users, href: "/admin/clients" },
  { label: "Calendar", icon: CalendarDays, href: "/admin/calendar" },
  { label: "Reports", icon: ClipboardList, href: "/admin/reports" },
];

const hrNav: NavItem[] = [
  { label: "HR Dashboard", icon: LayoutDashboard, href: "/hr" },
  { label: "Directory", icon: Users, href: "/hr/employees" },
  { label: "Contracts", icon: ClipboardList, href: "/hr/contracts" },
  { label: "Leave Approvals", icon: CheckSquare, href: "/hr/leave-approvals" },
  { label: "Attendance Log", icon: CalendarClock, href: "/hr/attendance-logs" },
  { label: "User Approvals", icon: UserCheck, href: "/hr/users" },
];

const superAdminNav: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/super-admin" },
  { label: "Settings", icon: Settings, href: "/super-admin/settings" },
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
  const { signOut, profile, roles, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Effective expansion state
  const isExpanded = isMobile || !collapsed || isHovered;

  // Resolve role atomically based on authenticated context and profile
  const resolvedRole = useMemo(() => {
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
    return role || "";
  }, [roles, profile, role]);

  // Fetch pending user approvals count (only for admin, hr_manager, foe)
  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ["pending-approvals-count", profile?.organization_id],
    queryFn: async () => {
      if (!["admin", "hr_manager", "foe"].includes(resolvedRole)) return 0;
      const data = await apiFetch<any>('/hr/stats');
      return data?.data?.pendingApprovals || 0;
    },
    enabled: !!profile?.organization_id && ["admin", "hr_manager", "foe"].includes(resolvedRole),
    refetchInterval: 30000
  });

  // Subscribe to SSE to invalidate pending-approvals-count in real-time
  useEffect(() => {
    if (!profile?.id || isMobile) return;

    const token = localStorage.getItem('ishpo_jwt');
    if (!token) return;

    const streamUrl = `/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = () => {
      try {
        queryClient.invalidateQueries({ queryKey: ["pending-approvals-count"] });
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
  }, [profile?.id, isMobile, queryClient]);

  const items = useMemo(() => {
    let baseItems = navMap[resolvedRole] || navMap[role] || [];

    if (baseItems.length === 0) return [];

    // Filter and inject calendar access depending on permissions
    const hasCalendarAccess = resolvedRole === "admin" || profile?.has_calendar_access === true;
    if (hasCalendarAccess) {
      if (!baseItems.find(i => i.href === "/admin/calendar")) {
        const dashboardIdx = baseItems.findIndex(i => i.label.includes("Dashboard") || i.label === "Overview");
        const insertIdx = dashboardIdx !== -1 ? dashboardIdx + 1 : 1;
        const newItems = [...baseItems];
        newItems.splice(insertIdx, 0, { label: "Admin Calendar", icon: CalendarDays, href: "/admin/calendar" });
        baseItems = newItems;
      }
    } else {
      baseItems = baseItems.filter(item => item.href !== "/admin/calendar");
    }

    // Filter and inject managerial analytics access depending on permissions
    const hasAnalyticsAccess = ["admin", "manager", "hr_manager"].includes(resolvedRole) || profile?.has_analytics_access === true;
    if (hasAnalyticsAccess) {
      if (!baseItems.find(i => i.href === "/admin/analytics/managerial")) {
        const dashboardIdx = baseItems.findIndex(i => i.label.includes("Dashboard") || i.label === "Overview");
        const insertIdx = dashboardIdx !== -1 ? dashboardIdx + 1 : 1;
        const newItems = [...baseItems];
        newItems.splice(insertIdx, 0, { label: "Staff Efficiency", icon: TrendingUp, href: "/admin/analytics/managerial" });
        baseItems = newItems;
      }
    } else {
      baseItems = baseItems.filter(item => item.href !== "/admin/analytics/managerial");
    }

    if (profile?.ams_role === "coach") {
      if (!baseItems.find(i => i.label === "AMS Dashboard")) {
        baseItems = [
          ...baseItems,
          { label: "AMS Dashboard", icon: LayoutDashboard, href: "/ams/coach-dashboard" },
          { label: "Batch Testing", icon: Target, href: "/ams/batch-tests" }
        ];
      }
    }

    return baseItems;
  }, [resolvedRole, role, profile?.has_calendar_access, profile?.has_analytics_access, profile?.ams_role]);

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
              const isActive =
                location.pathname === item.href ||
                (item.href !== `/${resolvedRole}` && location.pathname.startsWith(item.href));
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
