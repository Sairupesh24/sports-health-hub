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

    if (!profile) return; // profile still loading

    if (!isUserApproved(profile, roles)) {
      navigate("/pending-approval", { replace: true });
      return;
    }

    // Redirect user to their respective dashboard path
    const dest = getDashboardPath(roles, profile);
    navigate(dest, { replace: true });
  }, [user, profile, roles, loading, navigate]);

  return null;
};

export default Index;
