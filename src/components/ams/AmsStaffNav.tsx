import React, { useState } from "react";
import { 
  ChevronDown, 
  LayoutDashboard, 
  Calendar as CalendarIcon,
  Dumbbell,
  Activity,
  ClipboardList,
  Target,
  LayoutTemplate,
  Boxes,
  LogOut,
  User,
  Menu,
  Sparkles,
  ArrowRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function AmsStaffNav() {
  const { user, roles, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userRoles = [...(roles || []), profile?.role, user?.role].filter(Boolean) as string[];
  const isAdmin = userRoles.includes("admin") || userRoles.includes("super_admin");
  const isSpecialist = userRoles.some(r => ["coach", "sports_scientist", "sports_physician", "physiotherapist", "nutritionist"].includes(r));

  let allowedList: string[] = [];
  if (profile?.allowed_consoles) {
    try {
      allowedList = typeof profile.allowed_consoles === 'string'
        ? JSON.parse(profile.allowed_consoles)
        : profile.allowed_consoles;
    } catch {
      allowedList = (profile.allowed_consoles as string).split(',').map((s) => s.trim());
    }
  }
  const hasConsoleGrant = allowedList.includes('ams') || allowedList.includes('coach') || allowedList.includes('sports_scientist');

  const hasAmsAccess = isAdmin || profile?.ams_role === 'coach' || isSpecialist || hasConsoleGrant;
  
  if (!hasAmsAccess) return null;

  const userFullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  const userDisplayName = userFullName || profile?.full_name || user?.email?.split('@')[0] || profile?.email?.split('@')[0] || "Coach";
  
  const userInitials = (
    (profile?.first_name ? `${profile.first_name[0]}${profile.last_name?.[0] || ''}` : '') ||
    userDisplayName.split(" ").filter(Boolean).map((n: string) => n[0]).join("") ||
    user?.email?.slice(0, 2) ||
    "AV"
  ).slice(0, 2).toUpperCase();

  const formatRoleName = (r: string) => {
    if (!r) return "Staff";
    if (r.toLowerCase() === 'ams' || r.toLowerCase() === 'coach') return "Coach";
    if (r.toLowerCase() === 'sports_scientist') return "Sports Scientist";
    if (r.toLowerCase() === 'admin') return "Admin";
    if (r.toLowerCase() === 'super_admin') return "Super Admin";
    return r
      .split(/[_-\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const primaryRole = 
    profile?.ams_role ||
    profile?.profession ||
    (roles && roles.length > 0 ? roles[0] : null) ||
    profile?.role ||
    user?.role ||
    "Staff";

  const userDisplayRole = formatRoleName(primaryRole);
  const userEmail = profile?.email || user?.email || "";

  return (
    <nav className="h-16 border-b border-slate-200 bg-white sticky top-0 z-40 px-4 md:px-6 flex items-center justify-between text-slate-900 shadow-xs">
      <div className="flex items-center gap-4 lg:gap-6">
        {/* Branding Logo */}
        <div 
          onClick={() => navigate('/ams/coach-dashboard')}
          className="flex items-center gap-2.5 mr-2 group/logo cursor-pointer shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center transition-transform group-hover/logo:scale-105 border border-primary/20">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-black tracking-tight text-lg leading-tight text-slate-900">
              ISHPO <span className="text-primary font-bold italic">AMS</span>
            </span>
            <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase hidden sm:block leading-none mt-0.5">
              Activity Monitoring System
            </span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden xl:flex items-center gap-1 font-black text-[11px] uppercase tracking-wider text-slate-500">
          <NavLink label="Daily Brief" to="/ams/coach-dashboard" icon={LayoutDashboard} />
          <NavLink label="Programs" to="/ams/programs" icon={Dumbbell} />
          <NavLink label="Feed" to="/ams/feed" icon={Activity} />
          <NavLink label="Calendar" to="/ams/calendar" icon={CalendarIcon} />
          <NavLink 
            label="Batch Testing" 
            to="/ams/performance-testing/grid" 
            icon={Target} 
            active={location.pathname === '/ams/batch-tests' || location.pathname.startsWith('/ams/performance-testing')} 
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-2 hover:bg-slate-50 hover:text-green-600 rounded-xl transition-all flex items-center gap-1.5 group font-black uppercase text-[11px] tracking-wider text-slate-600 outline-none">
                <span>Tools</span>
                <ChevronDown className="w-3.5 h-3.5 group-data-[state=open]:rotate-180 transition-transform opacity-40 group-hover:text-green-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-white border border-slate-200 shadow-xl mt-2 rounded-2xl p-1 z-50" align="start">
              <div className="p-2.5 border-b border-slate-100 mb-1 bg-slate-50/50 rounded-t-xl">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">Specialist Tools</p>
              </div>
              <ToolItem label="Performance Testing Hub" icon={Target} to="/ams/performance-testing" />
              <ToolItem label="Questionnaires & Intake" icon={ClipboardList} to="/ams/questionnaires" />
              <ToolItem label="Workout Templates" icon={LayoutTemplate} to="/ams/templates" />
              <ToolItem label="Documents & Resources" icon={ClipboardList} to="/sports-scientist/resources" />
              <ToolItem label="Scientific Reporting" icon={Activity} to="/sports-scientist/reports" />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Medium Screens (lg to xl): Compact Nav Links */}
        <div className="hidden lg:flex xl:hidden items-center gap-1 font-black text-[11px] uppercase tracking-wider text-slate-500">
          <NavLink label="Daily Brief" to="/ams/coach-dashboard" icon={LayoutDashboard} />
          <NavLink label="Programs" to="/ams/programs" icon={Dumbbell} />
          <NavLink label="Feed" to="/ams/feed" icon={Activity} />
          <NavLink label="Calendar" to="/ams/calendar" icon={CalendarIcon} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-2 hover:bg-slate-50 hover:text-green-600 rounded-xl transition-all flex items-center gap-1.5 group font-black uppercase text-[11px] tracking-wider text-slate-600 outline-none">
                <span>More</span>
                <ChevronDown className="w-3.5 h-3.5 group-data-[state=open]:rotate-180 transition-transform opacity-40 group-hover:text-green-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-white border border-slate-200 shadow-xl mt-2 rounded-2xl p-1 z-50" align="start">
              <div className="p-2.5 border-b border-slate-100 mb-1 bg-slate-50/50 rounded-t-xl">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">Activity Modules</p>
              </div>
              <ToolItem label="Exercises" icon={ClipboardList} to="/ams/exercises" />
              <ToolItem label="Batch Testing" icon={Target} to="/ams/performance-testing/grid" />
              <DropdownMenuSeparator className="bg-slate-100" />
              <div className="p-2.5 border-b border-slate-100 mb-1 bg-slate-50/50">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">Specialist Tools</p>
              </div>
              <ToolItem label="Performance Testing Hub" icon={Target} to="/ams/performance-testing" />
              <ToolItem label="Questionnaires & Intake" icon={ClipboardList} to="/ams/questionnaires" />
              <ToolItem label="Workout Templates" icon={LayoutTemplate} to="/ams/templates" />
              <ToolItem label="Documents & Resources" icon={ClipboardList} to="/sports-scientist/resources" />
              <ToolItem label="Scientific Reporting" icon={Activity} to="/sports-scientist/reports" />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* App Gallery Switcher Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/app-gallery')}
          className="rounded-xl border-slate-200 text-xs font-bold gap-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-xs h-9 px-3"
        >
          <Boxes className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">App Gallery</span>
        </Button>

        {/* User Profile & Sign Out Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100/80 transition-colors outline-none cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                {userInitials}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-white border border-slate-200 shadow-xl rounded-2xl p-1 z-50" align="end">
            <div className="p-3 border-b border-slate-100 mb-1 bg-slate-50/50 rounded-t-xl">
              <p className="font-bold text-xs text-slate-900 truncate">{userDisplayName}</p>
              {userEmail && (
                <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">{userEmail}</p>
              )}
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                  {userDisplayRole}
                </span>
              </div>
            </div>
            <DropdownMenuItem asChild className="cursor-pointer rounded-xl text-xs font-semibold py-2">
              <Link to="/profile" className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-slate-500" />
                <span>My Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer rounded-xl text-xs font-semibold py-2">
              <Link to="/app-gallery" className="flex items-center gap-2.5">
                <Boxes className="w-4 h-4 text-primary" />
                <span>Switch Console</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem 
              onClick={async () => { await signOut(); }}
              className="cursor-pointer rounded-xl text-xs font-semibold py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              <div className="flex items-center gap-2.5 w-full">
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>Sign Out</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile / Tablet Drawer Toggle */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden p-2 h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[360px] p-0 flex flex-col bg-white">
            <SheetHeader className="p-5 border-b border-slate-100 text-left bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-base font-black tracking-tight text-slate-900 leading-tight">
                    ISHPO <span className="text-primary italic">AMS</span>
                  </SheetTitle>
                  <p className="text-[9px] font-bold text-slate-500 tracking-wider uppercase">
                    Activity Monitoring System
                  </p>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Primary Nav Links */}
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 mb-2">Navigation</p>
                <MobileNavItem label="Daily Brief" to="/ams/coach-dashboard" icon={LayoutDashboard} onSelect={() => setMobileMenuOpen(false)} />
                <MobileNavItem label="Programs" to="/ams/programs" icon={Dumbbell} onSelect={() => setMobileMenuOpen(false)} />
                <MobileNavItem label="Feed" to="/ams/feed" icon={Activity} onSelect={() => setMobileMenuOpen(false)} />
                <MobileNavItem label="Calendar" to="/ams/calendar" icon={CalendarIcon} onSelect={() => setMobileMenuOpen(false)} />
                <MobileNavItem label="Exercises" to="/ams/exercises" icon={ClipboardList} onSelect={() => setMobileMenuOpen(false)} />
                <MobileNavItem label="Batch Testing" to="/ams/performance-testing/grid" icon={Target} onSelect={() => setMobileMenuOpen(false)} />
              </div>

              {/* Specialist Tools */}
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 mb-2">Specialist Tools</p>
                <MobileNavItem label="Performance Testing Hub" to="/ams/performance-testing" icon={Target} onSelect={() => setMobileMenuOpen(false)} />
                <MobileNavItem label="Questionnaires & Intake" to="/ams/questionnaires" icon={ClipboardList} onSelect={() => setMobileMenuOpen(false)} />
                <MobileNavItem label="Workout Templates" to="/ams/templates" icon={LayoutTemplate} onSelect={() => setMobileMenuOpen(false)} />
                <MobileNavItem label="Documents & Resources" to="/sports-scientist/resources" icon={ClipboardList} onSelect={() => setMobileMenuOpen(false)} />
                <MobileNavItem label="Scientific Reporting" to="/sports-scientist/reports" icon={Activity} onSelect={() => setMobileMenuOpen(false)} />
              </div>

              {/* Portal Switch */}
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-3 mb-2">Consoles</p>
                <MobileNavItem label="App Gallery" to="/app-gallery" icon={Boxes} onSelect={() => setMobileMenuOpen(false)} />
                <MobileNavItem label="My Profile" to="/profile" icon={User} onSelect={() => setMobileMenuOpen(false)} />
              </div>
            </div>

            {/* Mobile Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50">
              <Button
                variant="outline"
                onClick={async () => {
                  setMobileMenuOpen(false);
                  await signOut();
                }}
                className="w-full justify-center gap-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 font-bold text-xs rounded-xl h-10"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

function NavLink({ label, to, icon: Icon, active }: { label: string; to: string; icon?: any; active?: boolean }) {
  const location = useLocation();
  const isCurrentlyActive = active || location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={cn(
        "px-3 py-2 rounded-xl transition-all font-black uppercase text-[11px] tracking-wider whitespace-nowrap flex items-center gap-1.5",
        isCurrentlyActive 
          ? "text-green-600 bg-green-50 shadow-xs border border-green-200/60" 
          : "text-slate-500 hover:bg-slate-50 hover:text-green-600"
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5 opacity-70" />}
      <span>{label}</span>
    </Link>
  );
}

function ToolItem({ label, icon: Icon, to }: { label: string; icon: any; to?: string }) {
  const content = (
    <>
      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center group-data-[highlighted]:bg-green-600 transition-colors">
        <Icon className="w-4 h-4 text-green-600 group-data-[highlighted]:text-white" />
      </div>
      <span className="font-bold text-xs text-slate-700 group-data-[highlighted]:text-green-700 transition-colors">{label}</span>
    </>
  );

  if (to) {
    return (
      <DropdownMenuItem asChild className="group flex items-center gap-3 p-2 cursor-pointer data-[highlighted]:bg-green-50/50 rounded-xl transition-all outline-none">
        <Link to={to} className="w-full h-full flex items-center gap-3">
          {content}
        </Link>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem className="group flex items-center gap-3 p-2.5 cursor-pointer data-[highlighted]:bg-green-50/50 rounded-xl transition-all outline-none">
      {content}
    </DropdownMenuItem>
  );
}

function MobileNavItem({ label, to, icon: Icon, onSelect }: { label: string; to: string; icon: any; onSelect: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
        isActive 
          ? "bg-green-50 text-green-700 border border-green-200/60 shadow-xs" 
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      )}
    >
      <Icon className={cn("w-4 h-4", isActive ? "text-green-600" : "text-slate-400")} />
      <span className="flex-1">{label}</span>
      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-green-600" />}
    </Link>
  );
}
