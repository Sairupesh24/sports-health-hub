import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Clock, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/utils/haptic";

export default function SpecialistBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleNavigate = (path: string) => {
    haptic.light();
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-border/50 safe-area-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-300 relative group",
                isActive ? "text-primary" : "text-muted-foreground/60"
              )}
            >
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] animate-in slide-in-from-top duration-300" />
              )}
              <Icon
                className={cn(
                  "w-5 h-5 transition-transform duration-300",
                  isActive ? "scale-110" : "group-active:scale-90"
                )}
              />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
