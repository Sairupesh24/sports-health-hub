import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import PendingApprovalPage from "./pages/auth/PendingApprovalPage";
import SetupPage from "./pages/auth/SetupPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ClientList from "./pages/admin/ClientList";
import ClientRegistration from "./pages/admin/ClientRegistration";
import FieldConfig from "./pages/admin/FieldConfig";
import UserApproval from "./pages/admin/UserApproval";
import Billing from "./pages/admin/Billing";
import ClientDetail from "./pages/admin/ClientDetail";
import ConsultantDashboard from "./pages/consultant/ConsultantDashboard";
import ClientDashboard from "./pages/client/ClientDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/clients" element={<ProtectedRoute requiredRole="admin"><ClientList /></ProtectedRoute>} />
            <Route path="/admin/clients/register" element={<ProtectedRoute requiredRole="admin"><ClientRegistration /></ProtectedRoute>} />
            <Route path="/admin/clients/:id" element={<ProtectedRoute requiredRole="admin"><ClientDetail /></ProtectedRoute>} />
            <Route path="/admin/settings/fields" element={<ProtectedRoute requiredRole="admin"><FieldConfig /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><UserApproval /></ProtectedRoute>} />
            <Route path="/admin/billing" element={<ProtectedRoute requiredRole="admin"><Billing /></ProtectedRoute>} />
            <Route path="/consultant" element={<ProtectedRoute requiredRole="consultant"><ConsultantDashboard /></ProtectedRoute>} />
            <Route path="/client" element={<ProtectedRoute requiredRole="client"><ClientDashboard /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
