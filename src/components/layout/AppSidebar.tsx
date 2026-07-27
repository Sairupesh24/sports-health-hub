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
import { useState, useEffect } from "react";
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
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending user approvals count (only for admin, hr_manager, foe)
  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ["pending-approvals-count", profile?.organization_id],
    queryFn: async () => {
      if (!["admin", "hr_manager", "foe"].includes(role)) return 0;
      const data = await apiFetch<any>('/hr/stats');
      return data?.data?.pendingApprovals || 0;
    },
    enabled: !!profile?.organization_id && ["admin", "hr_manager", "foe"].includes(role),
    refetchInterval: 30000
  });

  // Subscribe to SSE to invalidate pending-approvals-count in real-time
  useEffect(() => {
    // Only connect on desktop to avoid duplicate socket connections in mobile layout drawer
    if (!profile?.id || isMobile) return;

    const token = localStorage.getItem('ishpo_jwt');
    if (!token) return;

    const streamUrl = `/api/notifications/stream?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        console.log('[SSE Sidebar] New notification received to invalidate stats');
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
  
  let items = navMap[role] || adminNav;

  // Filter and inject calendar access depending on permissions
  const hasCalendarAccess = role === "admin" || profile?.has_calendar_access === true;
  
  if (hasCalendarAccess) {
    if (!items.find(i => i.href === "/admin/calendar")) {
      const dashboardIdx = items.findIndex(i => i.label.includes("Dashboard") || i.label === "Overview");
      const insertIdx = dashboardIdx !== -1 ? dashboardIdx + 1 : 1;
      
      const newItems = [...items];
      newItems.splice(insertIdx, 0, { label: "Admin Calendar", icon: CalendarDays, href: "/admin/calendar" });
      items = newItems;
    }
  } else {
    items = items.filter(item => item.href !== "/admin/calendar");
  }

  // Filter and inject managerial analytics access depending on permissions
  const hasAnalyticsAccess = ["admin", "manager", "hr_manager"].includes(role) || profile?.has_analytics_access === true;
  
  if (hasAnalyticsAccess) {
    if (!items.find(i => i.href === "/admin/analytics/managerial")) {
      const dashboardIdx = items.findIndex(i => i.label.includes("Dashboard") || i.label === "Overview");
      const insertIdx = dashboardIdx !== -1 ? dashboardIdx + 1 : 1;
      
      const newItems = [...items];
      newItems.splice(insertIdx, 0, { label: "Staff Efficiency", icon: TrendingUp, href: "/admin/analytics/managerial" });
      items = newItems;
    }
  } else {
    items = items.filter(item => item.href !== "/admin/analytics/managerial");
  }

  if (profile?.ams_role === "coach") {
    if (!items.find(i => i.label === "AMS Dashboard")) {
      items = [
        ...items,
        { label: "AMS Dashboard", icon: LayoutDashboard, href: "/ams/coach-dashboard" },
        { label: "Batch Testing", icon: Target, href: "/ams/batch-tests" }
      ];
    }
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-sidebar transition-all duration-300",
        isMobile
          ? "w-full h-full"
          : cn("h-screen border-r border-sidebar-border", collapsed ? "w-16" : "w-64"),
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
          <Activity className="w-4 h-4 text-primary-foreground" />
        </div>
        {(!collapsed || isMobile) && (
          <span className="font-display font-bold text-sidebar-primary-foreground text-lg tracking-tight">
            ISHPO
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive =
            location.pathname === item.href ||
            (item.href !== `/${role}` && location.pathname.startsWith(item.href));
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
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary shadow-glow"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <div className="relative flex items-center justify-center">
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {collapsed && !isMobile && item.label === "User Approvals" && pendingApprovals > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-orange-500 rounded-full border border-sidebar animate-pulse" />
                )}
              </div>
              {(!collapsed || isMobile) && (
                <span className="flex-1 flex items-center justify-between">
                  <span>{item.label}</span>
                  {item.label === "User Approvals" && pendingApprovals > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-[10px] font-black rounded-full bg-orange-500 text-white animate-pulse">
                      {pendingApprovals}
                    </span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        )}
        <Link
          to="/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent w-full transition-colors"
        >
          <UserCheck className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || isMobile) && <span>My Profile</span>}
        </Link>
        <button
          onClick={async () => { await signOut(); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive w-full transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || isMobile) && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
