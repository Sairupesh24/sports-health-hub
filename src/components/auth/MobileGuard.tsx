import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileGuardProps {
  children: React.ReactNode;
}

/**
 * MobileGuard handles automatic redirection between desktop and mobile routes
 * based on the current viewport size.
 */
export default function MobileGuard({ children }: MobileGuardProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Only apply redirection for client console pages
    const isClientPath = location.pathname.startsWith('/client');
    const isMobileClientPath = location.pathname.startsWith('/mobile/client');

    if (isMobile === undefined) return; // Wait for mobile detection

    if (isMobile) {
      // If on mobile and accessing a desktop client path, redirect to mobile
      if (isClientPath && !isMobileClientPath) {
        const mobilePath = location.pathname.replace('/client', '/mobile/client');
        navigate(mobilePath, { replace: true });
      }
    } else {
      // If on desktop and accessing a mobile client path, redirect to desktop
      if (isMobileClientPath) {
        const desktopPath = location.pathname.replace('/mobile/client', '/client');
        navigate(desktopPath, { replace: true });
      }
    }
  }, [isMobile, location.pathname, navigate]);

  return <>{children}</>;
}
