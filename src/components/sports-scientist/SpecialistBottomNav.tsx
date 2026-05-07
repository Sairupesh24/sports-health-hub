import { NavLink } from "react-router-dom";
import { LayoutDashboard, Users, Clock, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/utils/haptic";

export default function SpecialistBottomNav() {
  const navItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/mobile/specialist",
    },
    {
      label: "Sessions",
      icon: Clock,
      path: "/mobile/specialist/sessions",
    },
    {
      label: "Forms",
      icon: ClipboardList,
      path: "/mobile/specialist/forms",
    },
    {
      label: "Memberships",
      icon: Users,
      path: "/mobile/specialist/memberships",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/70 dark:bg-black/70 backdrop-blur-2xl border-t border-slate-200/50 dark:border-white/5 safe-area-bottom shadow-[0_-8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.3)]">
      <div className="flex justify-around items-center h-20 max-w-lg mx-auto px-6">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/mobile/specialist"}
              onClick={() => haptic.light()}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center gap-1.5 w-full h-full transition-all duration-500 relative group",
                isActive ? "text-primary" : "text-slate-400 dark:text-slate-500"
              )}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-primary rounded-b-xl shadow-[0_2px_10px_rgba(var(--primary-rgb),0.4)] animate-in fade-in slide-in-from-top-2 duration-500" />
                  )}
                  <div className={cn(
                    "p-2 rounded-2xl transition-all duration-500",
                    isActive ? "bg-primary/10 scale-110 shadow-inner" : "group-active:scale-90"
                  )}>
                    <Icon
                      className={cn(
                        "w-5 h-5 transition-all duration-500",
                        isActive ? "stroke-[2.5px]" : "stroke-2"
                      )}
                    />
                  </div>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-[0.2em] transition-all duration-500",
                    isActive ? "opacity-100 translate-y-0" : "opacity-60 -translate-y-0.5"
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
