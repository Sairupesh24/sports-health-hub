import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

interface MobileGuardProps {
  children: React.ReactNode;
}

/**
 * MobileGuard handles automatic redirection between desktop and mobile routes
 * based on the current viewport size and user role.
 */
export default function MobileGuard({ children }: MobileGuardProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { roles } = useAuth();

  useEffect(() => {
    if (isMobile === undefined) return; // Wait for mobile detection

    // Check if user has explicitly bypassed mobile view in this session
    const mobilePreference = sessionStorage.getItem("mobile-preference");
    if (mobilePreference === "desktop") return;

    const isClientPath = location.pathname.startsWith('/client');
    const isMobileClientPath = location.pathname.startsWith('/mobile/client');
    const isSpecialistPath = location.pathname.startsWith('/sports-scientist') || location.pathname.startsWith('/ams');
    const isMobileSpecialistPath = location.pathname.startsWith('/mobile/specialist');

    const isSpecialist = roles?.some(r => ["sports_scientist", "admin", "coach", "sports_physician", "physiotherapist", "nutritionist"].includes(r));
    const isClient = roles?.includes("client") || roles?.includes("athlete");

    if (isMobile) {
      // Handle Client Redirection
      if (isClient && isClientPath && !isMobileClientPath) {
        const mobilePath = location.pathname.replace('/client', '/mobile/client');
        navigate(mobilePath, { replace: true });
        return;
      }

      // Handle Specialist Redirection
      if (isSpecialist && isSpecialistPath && !isMobileSpecialistPath) {
        let mobilePath = location.pathname.replace('/sports-scientist', '/mobile/specialist');
        
        // Special case for AMS shared routes
        if (location.pathname === '/ams/questionnaires') {
          mobilePath = '/mobile/specialist/forms';
        } else if (location.pathname.startsWith('/ams')) {
          // Default fallback for other AMS routes if needed, or skip
          return;
        }

        navigate(mobilePath, { replace: true });
        return;
      }
    } else {
      // Redirect back to desktop if on a desktop device
      if (isMobileClientPath) {
        const desktopPath = location.pathname.replace('/mobile/client', '/client');
        navigate(desktopPath, { replace: true });
      } else if (isMobileSpecialistPath) {
        const desktopPath = location.pathname === '/mobile/specialist/forms' 
          ? '/ams/questionnaires'
          : location.pathname.replace('/mobile/specialist', '/sports-scientist');
        navigate(desktopPath, { replace: true });
      }
    }
  }, [isMobile, location.pathname, navigate, roles]);

  return <>{children}</>;
}
