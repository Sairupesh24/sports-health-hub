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
import BillingPage from "./pages/admin/Billing";
import ClientProfile from "./pages/admin/ClientProfile";
import ConsultantDashboard from "./pages/consultant/ConsultantDashboard";
import ConsultantAvailability from "./pages/consultant/ConsultantAvailability";
import MyClients from "./pages/consultant/MyClients";
import ConsultantClientProfile from "./pages/consultant/ClientProfile";
import ConsultantSchedule from "./pages/consultant/ConsultantSchedule";
import ClientDashboard from "./pages/client/ClientDashboard";
import BookAppointment from "./pages/client/BookAppointment";
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminAvailability from "./pages/admin/AdminAvailability";
import AppointmentList from "./pages/shared/AppointmentList";
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import OrganizationDetails from "./pages/super-admin/OrganizationDetails";
import OnboardOrganization from "./pages/super-admin/OnboardOrganization";
import MyProfile from "./pages/shared/MyProfile";

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
            <Route path="/admin/clients" element={<ProtectedRoute requiredRole={["admin", "foe"]}><ClientList /></ProtectedRoute>} />
            <Route path="/admin/clients/register" element={<ProtectedRoute requiredRole={["admin", "foe"]}><ClientRegistration /></ProtectedRoute>} />
            <Route path="/admin/clients/:id" element={<ProtectedRoute requiredRole={["admin", "foe"]}><ClientProfile /></ProtectedRoute>} />
            <Route path="/admin/settings/fields" element={<ProtectedRoute requiredRole="admin"><FieldConfig /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><UserApproval /></ProtectedRoute>} />
            <Route path="/admin/billing" element={<ProtectedRoute requiredRole={["admin", "foe"]}><BillingPage /></ProtectedRoute>} />
            <Route path="/admin/calendar" element={<ProtectedRoute requiredRole={["admin", "foe"]}><AdminCalendar /></ProtectedRoute>} />
            <Route path="/admin/availability" element={<ProtectedRoute requiredRole="admin"><AdminAvailability /></ProtectedRoute>} />
            <Route path="/admin/appointments" element={<ProtectedRoute requiredRole={["admin", "foe"]}><AppointmentList role="admin" /></ProtectedRoute>} />
            <Route path="/consultant" element={<ProtectedRoute requiredRole="consultant"><ConsultantDashboard /></ProtectedRoute>} />
            <Route path="/consultant/clients" element={<ProtectedRoute requiredRole="consultant"><MyClients /></ProtectedRoute>} />
            <Route path="/consultant/clients/:id" element={<ProtectedRoute requiredRole="consultant"><ConsultantClientProfile /></ProtectedRoute>} />
            <Route path="/consultant/availability" element={<ProtectedRoute requiredRole="consultant"><ConsultantAvailability /></ProtectedRoute>} />
            <Route path="/consultant/schedule" element={<ProtectedRoute requiredRole="consultant"><ConsultantSchedule /></ProtectedRoute>} />
            <Route path="/client" element={<ProtectedRoute requiredRole="client"><ClientDashboard /></ProtectedRoute>} />
            <Route path="/client/book" element={<ProtectedRoute requiredRole="client"><BookAppointment /></ProtectedRoute>} />
            <Route path="/client/appointments" element={<ProtectedRoute requiredRole="client"><AppointmentList role="client" /></ProtectedRoute>} />
            <Route path="/super-admin" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />
            <Route path="/super-admin/organizations/new" element={<ProtectedRoute requiredRole="super_admin"><OnboardOrganization /></ProtectedRoute>} />
            <Route path="/super-admin/organizations/:id" element={<ProtectedRoute requiredRole="super_admin"><OrganizationDetails /></ProtectedRoute>} />

            {/* Universal Authenticated Routes */}
            <Route path="/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
