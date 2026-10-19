import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "ghost" | "outline" | "secondary";
  showLabel?: boolean;
}

export function ThemeToggle({ className, variant = "outline", showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant={variant} size={showLabel ? "sm" : "icon"} className={cn("rounded-xl", className)} disabled>
        <Sun className="w-4 h-4 text-amber-500" />
        {showLabel && <span className="ml-2 text-xs font-medium">Theme</span>}
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant={variant}
      size={showLabel ? "sm" : "icon"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "rounded-xl transition-all duration-300",
        isDark 
          ? "border-slate-700 bg-slate-800/80 text-amber-400 hover:bg-slate-700 hover:text-amber-300 shadow-sm" 
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-xs",
        className
      )}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label="Toggle light or dark theme"
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 transition-transform hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="ml-2 text-xs font-semibold">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </Button>
  );
}

export default ThemeToggle;
