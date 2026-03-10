import { useState } from "react";
import AppSidebar from "./AppSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  role: string;
  children: React.ReactNode;
}

export default function DashboardLayout({ role, children }: DashboardLayoutProps) {
  const { roles } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Compute effective role based on authenticated context to overwrite hardcoded component props
  let effectiveRole = role;
  if (roles?.includes("super_admin")) effectiveRole = "super_admin";
  else if (roles?.includes("admin")) effectiveRole = "admin";
  else if (roles?.includes("consultant")) effectiveRole = "consultant";
  else if (roles?.includes("foe")) effectiveRole = "foe";
  else if (roles?.includes("client")) effectiveRole = "client";

  return (
    <div className="flex h-screen overflow-hidden bg-background w-full">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <AppSidebar role={effectiveRole} />
      </div>

      <main className="flex-1 overflow-y-auto flex flex-col w-full">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground text-lg tracking-tight">
              ISHPO
            </span>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-r-0">
              <AppSidebar
                role={role}
                isMobile
                onNavigate={() => setMobileMenuOpen(false)}
              />
            </SheetContent>
          </Sheet>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
