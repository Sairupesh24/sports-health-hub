import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardPath, isUserApproved } from "@/utils/navigation";

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, roles, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    // User is authenticated — send to dashboard or pending-approval
    if (!profile) return; // profile still loading

    if (!isUserApproved(profile, roles)) {
      navigate("/pending-approval", { replace: true });
      return;
    }

    navigate(getDashboardPath(roles), { replace: true });
  }, [user, profile, roles, loading, navigate]);

  return null;
};

export default Index;
