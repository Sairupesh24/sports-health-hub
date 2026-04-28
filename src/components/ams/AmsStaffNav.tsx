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
  Mail,
  LayoutTemplate
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

import { useAuth } from "@/contexts/AuthContext";

export default function AmsStaffNav() {
  const { roles, profile } = useAuth();
  const isClinical = roles.some(r => ["coach", "sports_scientist", "sports_physician", "physiotherapist", "nutritionist"].includes(r));
  const hasAmsAccess = profile?.ams_role === 'coach';
  
  if (!isClinical || !hasAmsAccess) return null;

  return (
    <nav className="h-16 border-b border-slate-200 bg-white sticky top-0 z-40 px-4 flex items-center justify-between text-slate-900 transition-all duration-300 hover:shadow-md group/nav">
      <div className="flex items-center gap-6">
        {/* Branding Logo */}
        <div className="flex items-center gap-2 mr-4 group/logo cursor-pointer">
           <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center transition-transform group-hover/logo:scale-110">
              <Activity className="w-5 h-5 text-primary" />
           </div>
           <span className="font-black tracking-tighter text-xl hidden md:block text-slate-900">ISHPO <span className="text-primary font-bold italic">AMS</span></span>
        </div>

        {/* Nav Links */}
        <div className="hidden lg:flex items-center gap-1 font-black text-[11px] uppercase tracking-widest text-slate-500">
          <NavLink label="Daily Brief" to="/ams/coach-dashboard" active />
          <NavLink label="Calendar" to="/ams/calendar" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-4 py-2 hover:bg-slate-50 hover:text-green-600 rounded-xl transition-all flex items-center gap-1.5 group font-black uppercase text-[11px] tracking-widest text-slate-600">
                Staff Tools
                <ChevronDown className="w-3.5 h-3.5 group-data-[state=open]:rotate-180 transition-transform opacity-40 group-hover:text-green-600" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-white border border-slate-200 shadow-2xl mt-2 ring-1 ring-slate-100 rounded-2xl overflow-hidden p-1 z-50" align="start">
              <div className="p-3 border-b border-slate-100 mb-1 bg-slate-50/50">
                <p className="text-[10px] font-black uppercase tracking-tighter text-slate-400 px-2 italic">Management Tools</p>
              </div>
              <ToolItem label="Exercises" icon={Dumbbell} to="/ams/exercises" />
              <ToolItem label="Workout Templates" icon={LayoutTemplate} to="/sports-scientist/templates" />
              <ToolItem label="Documents & Links" icon={ClipboardList} to="/sports-scientist/resources" />
              <ToolItem label="Reporting" icon={Activity} to="/sports-scientist/reports" />
              <DropdownMenuSeparator className="bg-slate-100" />
              <ToolItem label="Questionnaire Library" icon={ClipboardList} to="/ams/questionnaires" />
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>

      <div className="flex items-center gap-2">
         {/* Profile/Actions removed per request */}
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
        "px-4 py-2 rounded-xl transition-all font-black uppercase text-[11px] tracking-widest whitespace-nowrap",
        isCurrentlyActive 
          ? "text-green-600 bg-green-50 shadow-sm" 
          : "text-slate-500 hover:bg-slate-50 hover:text-green-600"
      )}
    >
      {label}
    </Link>
  );
}

function ToolItem({ label, icon: Icon, to }: { label: string; icon: any; to?: string }) {
  const content = (
    <>
      <div className="w-8 h-8 rounded-lg bg-green-500/5 flex items-center justify-center group-data-[highlighted]:bg-green-600 transition-colors">
        <Icon className="w-4 h-4 text-green-600 group-data-[highlighted]:text-white" />
      </div>
      <span className="font-black text-[10px] uppercase tracking-widest text-slate-500 group-data-[highlighted]:text-green-600 transition-colors">{label}</span>
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
