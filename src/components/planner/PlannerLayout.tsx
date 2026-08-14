import { useState } from "react";
import { Outlet } from "react-router-dom";
import PlannerSidebar from "./PlannerSidebar";
import PlannerTopBar from "./PlannerTopBar";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface PlannerLayoutProps {
  children?: React.ReactNode;
}

export default function PlannerLayout({ children }: PlannerLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background w-full">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <PlannerSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="p-0 w-72 border-r-0 bg-transparent">
          <PlannerSidebar
            collapsed={false}
            onToggleCollapse={() => {}}
            isMobile
            onNavigate={() => setMobileSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PlannerTopBar onMobileMenuToggle={() => setMobileSidebarOpen(true)} />
        <main
          className={cn(
            "flex-1 overflow-y-auto",
            "bg-background"
          )}
        >
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
