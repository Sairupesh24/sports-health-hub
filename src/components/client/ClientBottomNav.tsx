import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Activity, Calendar, User, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", icon: LayoutDashboard, href: "/client" },
  { label: "Performance", icon: Activity, href: "/client/performance" },
  { label: "Book", icon: BookOpen, href: "/client/book" },
  { label: "Calendar", icon: Calendar, href: "/client/appointments" },
  { label: "Profile", icon: User, href: "/profile" },
];

export default function ClientBottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-slate-200 px-2 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 min-w-[64px] transition-all duration-300 relative",
                isActive ? "text-primary scale-110" : "text-slate-400"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all",
                isActive ? "bg-primary/10" : "hover:bg-slate-50"
              )}>
                <item.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5px]" : "stroke-2")} />
              </div>
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-tighter",
                isActive ? "opacity-100" : "opacity-0"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
