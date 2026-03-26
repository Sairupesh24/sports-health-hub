import React from "react";
import { 
  ChevronDown, 
  Bell, 
  Search, 
  User, 
  LayoutDashboard, 
  Calendar as CalendarIcon,
  Dumbbell,
  Settings,
  Activity,
  Trophy,
  ClipboardList,
  Users,
  Target,
  Mail
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

export default function AmsStaffNav() {
  return (
    <nav className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40 px-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        {/* Branding Logo */}
        <div className="flex items-center gap-2 mr-4">
           <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-foreground" />
           </div>
           <span className="font-bold tracking-tight text-lg hidden md:block">ISHPO <span className="text-muted-foreground font-normal">AMS</span></span>
        </div>

        {/* Nav Links */}
        <div className="hidden lg:flex items-center gap-1 font-bold text-[11px] uppercase tracking-widest text-muted-foreground">
          <NavLink label="Daily Brief" to="/ams/coach-dashboard" active />
          <NavLink label="Feed" to="/ams/feed" />
          <NavLink label="Calendar" to="/ams/calendar" />
          <NavLink label="Programs" to="/ams/programs" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-2 hover:bg-muted rounded-md transition-colors flex items-center gap-1 group">
                Workout Tools
                <ChevronDown className="w-3 h-3 group-data-[state=open]:rotate-180 transition-transform" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-[#1A1F26] border border-white/20 shadow-2xl mt-2 ring-1 ring-white/10 rounded-2xl overflow-hidden p-1" align="start">
              <div className="p-2 border-b border-white/10 mb-1">
                <p className="text-[10px] font-black uppercase tracking-tighter text-primary/80 px-2">Workout Toolkit</p>
              </div>
              <ToolItem label="Whiteboard" icon={ClipboardList} />
              <ToolItem label="Workout Entry" icon={Dumbbell} />
              <ToolItem label="Maxes/PRs" icon={Trophy} />
              <ToolItem label="Journal" icon={ClipboardList} />
              <ToolItem label="Leaderboard" icon={Target} />
              <ToolItem label="Evaluations" icon={Target} />
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-2 hover:bg-muted rounded-md transition-colors flex items-center gap-1 group">
                Staff Tools
                <ChevronDown className="w-3 h-3 group-data-[state=open]:rotate-180 transition-transform" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-[#1A1F26] border border-white/20 shadow-2xl mt-2 ring-1 ring-white/10 rounded-2xl overflow-hidden p-1" align="start">
              <div className="p-2 border-b border-white/10 mb-1">
                <p className="text-[10px] font-black uppercase tracking-tighter text-primary/80 px-2">Staff Administration</p>
              </div>
              <ToolItem label="Manage Users" icon={Users} />
              <ToolItem label="Manage Calendars" icon={CalendarIcon} />
              <ToolItem label="The Planner" icon={LayoutDashboard} />
              <ToolItem label="Exercises" icon={Dumbbell} />
              <ToolItem label="Goals" icon={Target} />
              <ToolItem label="Documents & Links" icon={ClipboardList} />
              <ToolItem label="Reporting" icon={Activity} />
            </DropdownMenuContent>
          </DropdownMenu>

          <NavLink label="AMS" to="/ams" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Search className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full border-2 border-background" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Mail className="w-5 h-5" />
        </Button>
        <div className="ml-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-black text-xs border-2 border-primary/20 cursor-pointer">
           SC
        </div>
      </div>
    </nav>
  );
}

function NavLink({ label, to, active }: { label: string; to: string; active?: boolean }) {
  const location = useLocation();
  const isCurrentlyActive = active || location.pathname === to;
  
  return (
    <Link 
      to={to} 
      className={cn(
        "px-3 py-2 rounded-md transition-colors",
        isCurrentlyActive ? "text-primary bg-primary/5" : "hover:bg-muted"
      )}
    >
      {label}
    </Link>
  );
}

function ToolItem({ label, icon: Icon }: { label: string; icon: any }) {
  return (
    <DropdownMenuItem className="flex items-center gap-3 p-3 cursor-pointer focus:bg-primary/20 focus:text-white hover:bg-white/5 rounded-xl transition-all text-white/90">
      <Icon className="w-4 h-4 text-primary" />
      <span className="font-bold text-[12px] uppercase tracking-wider">{label}</span>
    </DropdownMenuItem>
  );
}
