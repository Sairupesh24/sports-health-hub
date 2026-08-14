import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutGrid,
  Home,
  Briefcase,
  FolderKanban,
  Map,
  CalendarDays,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Orbit,
  LogOut,
  UserCircle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

const navItems: NavItem[] = [
  { label: "Home", icon: Home, href: "/planner" },
  { label: "My Work", icon: Briefcase, href: "/planner/my-work" },
  { label: "Projects", icon: FolderKanban, href: "/planner/projects" },
  { label: "Portfolios", icon: LayoutGrid, href: "/planner/portfolios" },
  { label: "Roadmaps", icon: Map, href: "/planner/roadmaps" },
  { label: "Calendar", icon: CalendarDays, href: "/planner/calendar" },
  { label: "Resources", icon: Users, href: "/planner/resources" },
  { label: "Reports", icon: BarChart3, href: "/planner/reports" },
  { label: "Settings", icon: Settings, href: "/planner/settings" },
];

interface PlannerSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobile?: boolean;
  onNavigate?: () => void;
}

export default function PlannerSidebar({
  collapsed,
  onToggleCollapse,
  isMobile = false,
  onNavigate,
}: PlannerSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const initials = profile
    ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  const isActive = (href: string) => {
    if (href === "/planner") return location.pathname === "/planner";
    return location.pathname.startsWith(href);
  };

  const handleNav = (href: string) => {
    navigate(href);
    onNavigate?.();
  };

  const sidebarWidth = collapsed && !isMobile ? "w-16" : "w-60";

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={cn(
          "flex flex-col h-full transition-all duration-200 relative select-none",
          sidebarWidth,
          "border-r"
        )}
        style={{
          background: "hsl(var(--planner-sidebar-bg))",
          borderColor: "hsl(var(--planner-sidebar-border))",
        }}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center h-14 px-3 border-b flex-shrink-0",
            collapsed && !isMobile ? "justify-center" : "justify-between"
          )}
          style={{ borderColor: "hsl(var(--planner-sidebar-border))" }}
        >
          {(!collapsed || isMobile) && (
            <button
              onClick={() => handleNav("/app-gallery")}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, hsl(174 72% 40%), hsl(251 74% 60%))" }}
              >
                <Orbit className="w-4 h-4 text-white" />
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-white text-sm font-bold font-display leading-tight tracking-tight whitespace-nowrap">
                  OrbitFlow
                </p>
                <p className="text-[10px] leading-tight" style={{ color: "hsl(var(--planner-sidebar-fg))" }}>
                  ISHPO Planner
                </p>
              </div>
            </button>
          )}

          {collapsed && !isMobile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleNav("/app-gallery")}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                  style={{ background: "linear-gradient(135deg, hsl(174 72% 40%), hsl(251 74% 60%))" }}
                >
                  <Orbit className="w-4 h-4 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">App Gallery</TooltipContent>
            </Tooltip>
          )}

          {!isMobile && (
            <button
              onClick={onToggleCollapse}
              className="w-6 h-6 rounded-md flex items-center justify-center transition-colors hover:bg-white/10 flex-shrink-0"
              style={{ color: "hsl(var(--planner-sidebar-fg))" }}
            >
              {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* App Gallery return button */}
        <div className="px-2 pt-3 pb-1 flex-shrink-0">
          {collapsed && !isMobile ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleNav("/app-gallery")}
                  className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto transition-colors hover:bg-white/10"
                  style={{ color: "hsl(var(--planner-sidebar-fg))" }}
                >
                  <LayoutGrid className="w-4.5 h-4.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">App Gallery</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => handleNav("/app-gallery")}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-sm font-medium hover:bg-white/10 group"
              style={{ color: "hsl(var(--planner-sidebar-fg))" }}
            >
              <LayoutGrid className="w-4 h-4 flex-shrink-0 opacity-70 group-hover:opacity-100" />
              <span className="text-xs">App Gallery</span>
            </button>
          )}
          <div
            className="mt-2 mb-1 mx-2"
            style={{ height: "1px", background: "hsl(var(--planner-sidebar-border))" }}
          />
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            if (collapsed && !isMobile) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleNav(item.href)}
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center mx-auto transition-all duration-150",
                        active
                          ? "text-white"
                          : "hover:bg-white/10"
                      )}
                      style={
                        active
                          ? { background: "hsl(var(--planner-primary))" }
                          : { color: "hsl(var(--planner-sidebar-fg))" }
                      }
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            return (
              <button
                key={item.href}
                onClick={() => handleNav(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  active
                    ? "text-white shadow-sm"
                    : "hover:bg-white/10"
                )}
                style={
                  active
                    ? { background: "hsl(var(--planner-primary))" }
                    : { color: "hsl(var(--planner-sidebar-fg))" }
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer — User profile */}
        <div
          className="flex-shrink-0 border-t p-2"
          style={{ borderColor: "hsl(var(--planner-sidebar-border))" }}
        >
          {collapsed && !isMobile ? (
            <div className="flex flex-col items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleNav("/profile")}
                    className="rounded-full"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs font-semibold" style={{ background: "hsl(var(--planner-primary))", color: "white" }}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {profile?.first_name} {profile?.last_name}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={signOut}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
                    style={{ color: "hsl(var(--planner-sidebar-fg))" }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="space-y-1">
              <button
                onClick={() => handleNav("/profile")}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs font-semibold" style={{ background: "hsl(var(--planner-primary))", color: "white" }}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left overflow-hidden flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">
                    {profile?.first_name} {profile?.last_name}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "hsl(var(--planner-sidebar-fg))" }}>
                    {profile?.email}
                  </p>
                </div>
              </button>
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-xs"
                style={{ color: "hsl(var(--planner-sidebar-fg))" }}
              >
                <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
