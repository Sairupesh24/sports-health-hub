import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Dumbbell,
  ClipboardCheck,
  Users,
  Activity,
  BarChart3,
  Orbit,
  ChevronRight,
  Bell,
  ShieldCheck,
  LogOut,
  Building2,
  Search,
  Sparkles,
  ArrowUpRight,
  Lock,
  CheckCircle2,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

import { APP_MODULES, AppModuleDefinition, isModuleGrantedForUser } from "@/config/appModules";

// Helper map for custom hover glow/highlight styles per module ID
const MODULE_HOVER_GLOWS: Record<string, { hoverBorder: string; hoverRing: string; hoverShadow: string; textHover: string }> = {
  super_admin: {
    hoverBorder: "hover:border-purple-500",
    hoverRing: "hover:ring-4 hover:ring-purple-500/10",
    hoverShadow: "hover:shadow-xl hover:shadow-purple-500/10",
    textHover: "group-hover:text-purple-700",
  },
  admin: {
    hoverBorder: "hover:border-purple-400",
    hoverRing: "hover:ring-4 hover:ring-purple-500/10",
    hoverShadow: "hover:shadow-xl hover:shadow-purple-500/10",
    textHover: "group-hover:text-purple-600",
  },
  settings: {
    hoverBorder: "hover:border-violet-400",
    hoverRing: "hover:ring-4 hover:ring-violet-500/10",
    hoverShadow: "hover:shadow-xl hover:shadow-violet-500/10",
    textHover: "group-hover:text-violet-600",
  },
  clinical: {
    hoverBorder: "hover:border-teal-400",
    hoverRing: "hover:ring-4 hover:ring-teal-500/10",
    hoverShadow: "hover:shadow-xl hover:shadow-teal-500/10",
    textHover: "group-hover:text-teal-600",
  },
  ams: {
    hoverBorder: "hover:border-emerald-400",
    hoverRing: "hover:ring-4 hover:ring-emerald-500/10",
    hoverShadow: "hover:shadow-xl hover:shadow-emerald-500/10",
    textHover: "group-hover:text-emerald-600",
  },
  nutritionist: {
    hoverBorder: "hover:border-amber-400",
    hoverRing: "hover:ring-4 hover:ring-amber-500/10",
    hoverShadow: "hover:shadow-xl hover:shadow-amber-500/10",
    textHover: "group-hover:text-amber-600",
  },
  hr: {
    hoverBorder: "hover:border-blue-400",
    hoverRing: "hover:ring-4 hover:ring-blue-500/10",
    hoverShadow: "hover:shadow-xl hover:shadow-blue-500/10",
    textHover: "group-hover:text-blue-600",
  },
  foe: {
    hoverBorder: "hover:border-indigo-400",
    hoverRing: "hover:ring-4 hover:ring-indigo-500/10",
    hoverShadow: "hover:shadow-xl hover:shadow-indigo-500/10",
    textHover: "group-hover:text-indigo-600",
  },
  questionnaires: {
    hoverBorder: "hover:border-orange-400",
    hoverRing: "hover:ring-4 hover:ring-orange-500/10",
    hoverShadow: "hover:shadow-xl hover:shadow-orange-500/10",
    textHover: "group-hover:text-orange-600",
  },
  planner: {
    hoverBorder: "hover:border-fuchsia-400",
    hoverRing: "hover:ring-4 hover:ring-fuchsia-500/10",
    hoverShadow: "hover:shadow-xl hover:shadow-fuchsia-500/10",
    textHover: "group-hover:text-fuchsia-600",
  },
  analytics: {
    hoverBorder: "hover:border-rose-400",
    hoverRing: "hover:ring-4 hover:ring-rose-500/10",
    hoverShadow: "hover:shadow-xl hover:shadow-rose-500/10",
    textHover: "group-hover:text-rose-600",
  },
  client: {
    hoverBorder: "hover:border-sky-400",
    hoverRing: "hover:ring-4 hover:ring-sky-500/10",
    hoverShadow: "hover:shadow-xl hover:shadow-sky-500/10",
    textHover: "group-hover:text-sky-600",
  },
};

export default function AppGallery() {
  const navigate = useNavigate();
  const { profile, roles, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const availableModules = useMemo(() => {
    const userRoles = [...(roles || []), profile?.role].filter(Boolean) as string[];
    return APP_MODULES.filter((mod) =>
      isModuleGrantedForUser(
        userRoles,
        profile?.profession,
        profile?.allowed_consoles,
        mod,
        profile?.organization_enabled_modules
      )
    );
  }, [profile, roles]);

  const filteredModules = useMemo(() => {
    return availableModules.filter((mod) => {
      const matchesSearch =
        mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mod.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeCategory === "clinical") {
        return ["clinical", "questionnaires", "nutritionist"].includes(mod.id);
      }
      if (activeCategory === "management") {
        return ["super_admin", "admin", "settings", "hr", "foe", "manager", "analytics"].includes(mod.id);
      }
      if (activeCategory === "portal") {
        return ["client", "ams", "planner"].includes(mod.id);
      }

      return true;
    });
  }, [availableModules, searchQuery, activeCategory]);

  const initials = profile
    ? `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  const fullName = profile
    ? `${profile.first_name} ${profile.last_name}`
    : "User";

  const formatRoleLabel = (roleStr?: string) => {
    if (!roleStr) return "Staff Member";
    return roleStr.replace(/_/g, " ").toUpperCase();
  };

  return (
    <div className="h-screen w-full overflow-y-auto bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-500/20 selection:text-teal-900">
      
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 shadow-sm transition-all duration-300">
        
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 via-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-teal-600/20 cursor-pointer group"
            onClick={() => navigate("/app-gallery")}
          >
            <Orbit className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 tracking-wider text-base">ISHPO</span>
              <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                HUB
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Unified Application Suite</p>
          </div>
        </div>

        {/* User Controls & Profile */}
        <div className="flex items-center gap-3">
          {profile?.organization_name && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-700">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              <span>{profile.organization_name}</span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-black uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            {formatRoleLabel(roles?.[0] || profile?.role)}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2.5 h-10 px-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-100 transition-all shadow-sm">
                <Avatar className="w-7 h-7 ring-2 ring-teal-500/20">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs font-black bg-teal-600 text-white">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-xs font-bold text-slate-800">{fullName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 text-slate-800 shadow-xl rounded-2xl p-1.5">
              <div className="px-3 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{fullName}</p>
                <p className="text-[11px] text-slate-400 truncate">{profile?.email}</p>
              </div>
              <DropdownMenuItem onClick={() => navigate("/profile")} className="rounded-xl cursor-pointer hover:bg-slate-100 text-xs font-semibold py-2 my-0.5">
                <Users className="w-4 h-4 mr-2.5 text-teal-600" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem onClick={signOut} className="rounded-xl cursor-pointer hover:bg-rose-50 text-rose-600 text-xs font-semibold py-2 my-0.5">
                <LogOut className="w-4 h-4 mr-2.5 text-rose-600" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Workspace Content */}
      <main className="flex-1 px-4 sm:px-8 py-8 max-w-7xl mx-auto w-full space-y-8">
        
        {/* Banner with Clean Light Theme & Green/Orange Highlights */}
        <div className="relative rounded-3xl p-6 sm:p-8 border border-slate-200/80 bg-gradient-to-r from-teal-50/90 via-white to-orange-50/60 shadow-sm overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100/80 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider mb-1 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Welcome Back, {profile?.first_name || "User"}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Your Workspace Applications
              </h1>
              <p className="text-slate-600 text-xs sm:text-sm max-w-2xl leading-relaxed">
                Select an application below to get started. You have access to <strong className="text-teal-700">{availableModules.length} active module{availableModules.length !== 1 ? 's' : ''}</strong> configured for your account.
              </p>
            </div>

            {/* Search & Category Tabs */}
            <div className="w-full lg:w-80 space-y-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search application modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 bg-white border-slate-200 text-xs text-slate-900 rounded-2xl focus-visible:ring-teal-500 shadow-sm placeholder:text-slate-400"
                />
              </div>

              {/* Category Pills */}
              <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-200 gap-1 overflow-x-auto">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap text-center",
                    activeCategory === "all" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  All ({availableModules.length})
                </button>
                <button
                  onClick={() => setActiveCategory("clinical")}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap text-center",
                    activeCategory === "clinical" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Clinical
                </button>
                <button
                  onClick={() => setActiveCategory("management")}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap text-center",
                    activeCategory === "management" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Workforce
                </button>
                <button
                  onClick={() => setActiveCategory("portal")}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap text-center",
                    activeCategory === "portal" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Portals
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Crisp White Module Cards Grid with Colorful Outline Highlights & Glow */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Compass className="w-4 h-4 text-teal-600" />
              Available Applications & Consoles
            </h2>
            <span className="text-xs font-bold text-slate-400">
              {filteredModules.length} Modules Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredModules.map((mod) => {
              const IconComp = mod.icon;
              const hoverGlow = MODULE_HOVER_GLOWS[mod.id] || {
                hoverBorder: "hover:border-teal-400",
                hoverRing: "hover:ring-4 hover:ring-teal-500/10",
                hoverShadow: "hover:shadow-xl hover:shadow-teal-500/10",
                textHover: "group-hover:text-teal-600",
              };

              return (
                <div
                  key={mod.id}
                  onClick={() => {
                    if (mod.comingSoon) {
                      toast({
                        title: "Coming Soon",
                        description: `${mod.name} is currently under development and will be available in a future update.`,
                      });
                      return;
                    }
                    if (mod.id === "foe") {
                      sessionStorage.setItem("active_console", "foe");
                    } else if (mod.id === "admin") {
                      sessionStorage.setItem("active_console", "admin");
                    } else if (mod.id === "hr") {
                      sessionStorage.setItem("active_console", "hr");
                    } else if (mod.id === "ams") {
                      sessionStorage.setItem("active_console", "sports_scientist");
                    } else if (mod.id === "clinical") {
                      sessionStorage.setItem("active_console", "consultant");
                    } else if (mod.id === "nutritionist") {
                      sessionStorage.setItem("active_console", "nutritionist");
                    }
                    navigate(mod.href);
                  }}
                  className={cn(
                    "group relative rounded-3xl p-6 transition-all duration-300 bg-white border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between -translate-y-0 hover:-translate-y-1.5",
                    mod.comingSoon ? "cursor-default opacity-90" : "cursor-pointer",
                    hoverGlow.hoverBorder,
                    hoverGlow.hoverRing,
                    hoverGlow.hoverShadow
                  )}
                >
                  <div className="space-y-4 relative z-10">
                    {/* Top Icon Badge & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm group-hover:scale-105 transition-transform duration-300 shrink-0",
                        mod.color
                      )}>
                        <IconComp className="w-6 h-6" />
                      </div>

                      {mod.badge && (
                        <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-xs flex items-center gap-1", mod.badgeStyle)}>
                          {mod.comingSoon && <Lock className="w-2.5 h-2.5" />}
                          {mod.badge}
                        </span>
                      )}
                    </div>

                    {/* Module Title & Description */}
                    <div className="space-y-1">
                      <h3 className={cn("font-bold text-base text-slate-900 transition-colors flex items-center justify-between", !mod.comingSoon && hoverGlow.textHover)}>
                        <span>{mod.name}</span>
                        {!mod.comingSoon && (
                          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-700 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all opacity-0 group-hover:opacity-100" />
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        {mod.description}
                      </p>
                    </div>
                  </div>

                  {/* Card Bottom Launch Cue */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between relative z-10">
                    {mod.comingSoon ? (
                      <>
                        <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Coming Soon</span>
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors flex items-center gap-1.5">
                          <span>Open Module</span>
                        </span>
                        <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center transition-all duration-300">
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* System & Account Summary Bar */}
        <div className="pt-4 border-t border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Consoles</p>
                <p className="text-base font-black text-slate-900">{availableModules.length} Applications</p>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Organization</p>
                <p className="text-xs font-bold text-slate-900 truncate max-w-[140px]">{profile?.organization_name || "Enterprise Hub"}</p>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">User Account Role</p>
                <p className="text-xs font-bold text-slate-900 capitalize">{formatRoleLabel(roles?.[0] || profile?.role)}</p>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Security Status</p>
                <p className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-600" /> Active Session
                </p>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
