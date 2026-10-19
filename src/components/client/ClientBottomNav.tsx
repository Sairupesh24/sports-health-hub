import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Activity, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: any;
  href: string;
  mobileHref: string;
}

const navItems: NavItem[] = [
  { label: "Home", icon: LayoutDashboard, href: "/client", mobileHref: "/mobile/client" },
  { label: "Pulse", icon: Activity, href: "/client/performance", mobileHref: "/mobile/client/performance" },
  { label: "Schedule", icon: Calendar, href: "/client/appointments", mobileHref: "/mobile/client/appointments" },
  { label: "Profile", icon: User, href: "/profile", mobileHref: "/profile" },
];

interface ClientBottomNavProps {
  isMobileLayout?: boolean;
}

export default function ClientBottomNav({ isMobileLayout }: ClientBottomNavProps) {
  const location = useLocation();
  const isMobilePath = location.pathname.startsWith('/mobile');

  return (
    <nav className={cn(
      "z-50 transition-all duration-300",
      isMobileLayout 
        ? "w-full max-w-sm bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-3xl px-6 py-3.5 shadow-xl" 
        : "md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border border-slate-200/80 dark:border-white/10 rounded-2xl px-2 py-2.5 shadow-xl"
    )}>
      <div className="flex justify-around items-center">
        {navItems.map((item) => {
          const href = isMobilePath ? item.mobileHref : item.href;
          const isActive = location.pathname === href;
          
          return (
            <Link
              key={item.href}
              to={href}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all duration-300 relative group",
                isActive ? "text-primary font-semibold" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div className={cn(
                "p-2.5 rounded-2xl transition-all duration-300",
                isActive 
                  ? "bg-primary/15 dark:bg-primary/20 scale-105 shadow-sm" 
                  : "group-hover:bg-slate-100 dark:group-hover:bg-white/5 active:scale-95"
              )}>
                <item.icon className={cn(
                  "w-5 h-5 transition-transform duration-500", 
                  isActive ? "stroke-[2.5px] scale-110" : "stroke-2"
                )} />
              </div>
              
              <span className={cn(
                "text-[9px] font-black uppercase tracking-tighter transition-all duration-500",
                isActive ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
              )}>
                {item.label}
              </span>

              {isActive && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
