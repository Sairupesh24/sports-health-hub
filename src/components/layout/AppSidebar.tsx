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
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
  { label: "User Approvals", icon: UserCheck, href: "/admin/users" },
  { label: "Settings", icon: Settings, href: "/admin/settings", isUnderDevelopment: true },
];

const consultantNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/consultant" },
  { label: "My Clients", icon: Users, href: "/consultant/clients" },
  { label: "Schedule", icon: Calendar, href: "/consultant/schedule" },
  { label: "Availability", icon: Clock, href: "/consultant/availability" },
  { label: "Reports", icon: ClipboardList, href: "/consultant/reports" },
  { label: "Injury Repo", icon: Activity, href: "/consultant/injuries" },
];

const clientNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/client" },
  { label: "Book Session", icon: CalendarPlus, href: "/client/book" },
  { label: "Appointments", icon: Calendar, href: "/client/appointments" },
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
  { label: "User Approvals", icon: UserCheck, href: "/admin/users" },
  { label: "Settings", icon: Settings, href: "/admin/settings", isUnderDevelopment: true },
];

const sportsScientistNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/sports-scientist" },
  { label: "Schedule", icon: Calendar, href: "/sports-scientist/schedule" },
  { label: "Sessions Log", icon: ClipboardList, href: "/sports-scientist/sessions" },
  { label: "My Clients", icon: Users, href: "/sports-scientist/clients" },
  { label: "Reports", icon: ClipboardList, href: "/sports-scientist/reports" },
  { label: "Templates", icon: ClipboardList, href: "/sports-scientist/templates" },
  { label: "Analytics", icon: Activity, href: "/sports-scientist/analytics" },
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
  { label: "Leaves", icon: CalendarDays, href: "/hr/leaves" },
  { label: "User Approvals", icon: UserCheck, href: "/hr/users" },
];

const superAdminNav: NavItem[] = [
  { label: "Overview", icon: LayoutDashboard, href: "/super-admin" },
  { label: "Settings", icon: Settings, href: "/super-admin/settings" },
];

const athleteNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/ams/athlete-portal" },
  { label: "Performance", icon: Activity, href: "/client/performance" },
  { label: "Book Session", icon: CalendarPlus, href: "/client/book" },
  { label: "Appointments", icon: Calendar, href: "/client/appointments" },
  { label: "My Reports", icon: ClipboardList, href: "/client/reports" },
  { label: "Billing", icon: CreditCard, href: "/client/billing" },
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
  
  let items = navMap[role] || adminNav;


  if (role === "sports_scientist" || profile?.ams_role === "coach") {
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
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {(!collapsed || isMobile) && <span>{item.label}</span>}
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
          onClick={async () => { await signOut(); navigate("/login"); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive w-full transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {(!collapsed || isMobile) && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
