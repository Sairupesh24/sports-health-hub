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
  const isMobileHook = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { roles } = useAuth();

  useEffect(() => {
    // Check viewport width as fallback if hook is initializing
    const isMobileViewport = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
    const effectiveIsMobile = isMobileHook !== undefined ? isMobileHook : isMobileViewport;

    // Check if user has explicitly bypassed mobile view in this session
    const mobilePreference = sessionStorage.getItem("mobile-preference");
    if (mobilePreference === "desktop") return;

    const isClientPath = location.pathname.startsWith('/client');
    const isMobileClientPath = location.pathname.startsWith('/mobile/client');
    const isSpecialistPath = location.pathname.startsWith('/sports-scientist') || location.pathname.startsWith('/ams');
    const isMobileSpecialistPath = location.pathname.startsWith('/mobile/specialist');
    const isConsultantPath = location.pathname.startsWith('/consultant');
    const isMobileConsultantPath = location.pathname.startsWith('/mobile/consultant');

    if (effectiveIsMobile) {
      // Profile Redirection to Mobile Profile Page
      if (location.pathname === '/profile') {
        navigate('/mobile/profile' + location.search, { replace: true });
        return;
      }

      // Handle Consultant / Clinical Redirection on Mobile
      if (isConsultantPath && !isMobileConsultantPath) {
        const mobilePath = location.pathname.replace('/consultant', '/mobile/consultant');
        navigate(mobilePath + location.search, { replace: true });
        return;
      }

      // Handle Specialist / AMS Redirection on Mobile
      if (isSpecialistPath && !isMobileSpecialistPath) {
        let mobilePath = location.pathname.replace('/sports-scientist', '/mobile/specialist');
        
        if (location.pathname === '/ams/questionnaires') {
          mobilePath = '/mobile/specialist/forms';
        } else if (location.pathname.startsWith('/ams') && !location.pathname.startsWith('/ams/questionnaires')) {
          mobilePath = '/mobile/specialist';
        }

        navigate(mobilePath + location.search, { replace: true });
        return;
      }

      // Handle Client Redirection on Mobile
      if (isClientPath && !isMobileClientPath) {
        const mobilePath = location.pathname.replace('/client', '/mobile/client');
        navigate(mobilePath + location.search, { replace: true });
        return;
      }
    } else {
      // Redirect back to desktop if on a desktop device
      if (location.pathname === '/mobile/profile') {
        navigate('/profile' + location.search, { replace: true });
        return;
      }

      if (isMobileClientPath) {
        const desktopPath = location.pathname.replace('/mobile/client', '/client');
        navigate(desktopPath, { replace: true });
      } else if (isMobileSpecialistPath) {
        const desktopPath = location.pathname === '/mobile/specialist/forms' 
          ? '/ams/questionnaires'
          : location.pathname.replace('/mobile/specialist', '/sports-scientist');
        navigate(desktopPath, { replace: true });
      } else if (isMobileConsultantPath) {
        const desktopPath = location.pathname.replace('/mobile/consultant', '/consultant');
        navigate(desktopPath, { replace: true });
      }
    }
  }, [isMobileHook, location.pathname, location.search, navigate, roles]);

  return <>{children}</>;
}
