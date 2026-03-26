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
import AthleteDashboard from "./pages/ams/AthleteDashboard";
import BatchTestEntry from "./pages/ams/BatchTestEntry";
import CoachDashboard from "./pages/ams/CoachDashboard";
import ProgramsPage from "./pages/ams/ProgramsPage";
import WorkoutBuilder from "./pages/ams/WorkoutBuilder";
import WorkoutLogging from "./pages/ams/WorkoutLogging";
import AmsFeed from "./pages/ams/AmsFeed";
import AmsCalendar from "./pages/ams/AmsCalendar";
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
import ClientPerformancePage from "./pages/client/ClientPerformancePage";
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminAvailability from "./pages/admin/AdminAvailability";
import AppointmentList from "./pages/shared/AppointmentList";
import SuperAdminDashboard from "./pages/super-admin/Dashboard";
import OrganizationDetails from "./pages/super-admin/OrganizationDetails";
import OnboardOrganization from "./pages/super-admin/OnboardOrganization";
import MyProfile from "./pages/shared/MyProfile";
import ReportsPage from "./pages/shared/ReportsPage";

// Sports Scientist Console
import SportsScientistDashboard from "./pages/sports-scientist/SportsScientistDashboard";
import SportsScientistSchedule from "./pages/sports-scientist/SportsScientistSchedule";
import SportsScientistClients from "./pages/sports-scientist/SportsScientistClients";
import SportsScientistSessions from "./pages/sports-scientist/SportsScientistSessions";
import SportsScientistTemplates from "./pages/sports-scientist/SportsScientistTemplates";
import SportsScientistAnalytics from "./pages/sports-scientist/SportsScientistAnalytics";

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
            <Route path="/ams/athlete-portal" element={<ProtectedRoute><AthleteDashboard /></ProtectedRoute>} />
            <Route path="/ams/coach-dashboard" element={<ProtectedRoute><CoachDashboard /></ProtectedRoute>} />
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
            <Route path="/admin/reports" element={<ProtectedRoute requiredRole={["admin", "foe", "manager"]}><ReportsPage role="admin" /></ProtectedRoute>} />
            <Route path="/admin/appointments" element={<ProtectedRoute requiredRole={["admin", "foe"]}><AppointmentList role="admin" /></ProtectedRoute>} />
            <Route path="/consultant" element={<ProtectedRoute requiredRole="consultant"><ConsultantDashboard /></ProtectedRoute>} />
            <Route path="/consultant/clients" element={<ProtectedRoute requiredRole="consultant"><MyClients /></ProtectedRoute>} />
            <Route path="/consultant/clients/:id" element={<ProtectedRoute requiredRole="consultant"><ConsultantClientProfile /></ProtectedRoute>} />
            <Route path="/consultant/availability" element={<ProtectedRoute requiredRole="consultant"><ConsultantAvailability /></ProtectedRoute>} />
            <Route path="/consultant/reports" element={<ProtectedRoute requiredRole="consultant"><ReportsPage role="consultant" /></ProtectedRoute>} />
            <Route path="/consultant/schedule" element={<ProtectedRoute requiredRole="consultant"><ConsultantSchedule /></ProtectedRoute>} />
            
            <Route path="/sports-scientist" element={<ProtectedRoute requiredRole="sports_scientist"><SportsScientistDashboard /></ProtectedRoute>} />
            <Route path="/sports-scientist/schedule" element={<ProtectedRoute requiredRole="sports_scientist"><SportsScientistSchedule /></ProtectedRoute>} />
            <Route path="/sports-scientist/sessions" element={<ProtectedRoute requiredRole="sports_scientist"><SportsScientistSessions /></ProtectedRoute>} />
            <Route path="/sports-scientist/clients" element={<ProtectedRoute requiredRole="sports_scientist"><SportsScientistClients /></ProtectedRoute>} />
            <Route path="/sports-scientist/reports" element={<ProtectedRoute requiredRole="sports_scientist"><ReportsPage role="sports_scientist" /></ProtectedRoute>} />
            <Route path="/sports-scientist/templates" element={<ProtectedRoute requiredRole="sports_scientist"><SportsScientistTemplates /></ProtectedRoute>} />

            <Route path="/ams/programs" element={<ProtectedRoute requiredRole={["coach", "sports_scientist", "admin"]}><ProgramsPage /></ProtectedRoute>} />
            <Route path="/ams/programs/:id/builder" element={<ProtectedRoute requiredRole={["coach", "sports_scientist", "admin"]}><WorkoutBuilder /></ProtectedRoute>} />
            <Route path="/ams/feed" element={<ProtectedRoute requiredRole={["coach", "sports_scientist", "admin"]}><AmsFeed /></ProtectedRoute>} />
            <Route path="/ams/calendar" element={<ProtectedRoute requiredRole={["coach", "sports_scientist", "admin"]}><AmsCalendar /></ProtectedRoute>} />
            <Route path="/ams/athlete/calendar" element={<ProtectedRoute requiredRole={["client", "athlete"]}><AthleteDashboard /></ProtectedRoute>} />
            <Route path="/ams/athlete/workout/:id" element={<ProtectedRoute requiredRole={["client", "athlete"]}><WorkoutLogging /></ProtectedRoute>} />
            <Route path="/ams/batch-tests" element={<ProtectedRoute requiredRole={["coach", "sports_scientist", "admin"]}><BatchTestEntry /></ProtectedRoute>} />
            <Route path="/sports-scientist/analytics" element={<ProtectedRoute requiredRole="sports_scientist"><SportsScientistAnalytics /></ProtectedRoute>} />

            <Route path="/client" element={<ProtectedRoute requiredRole={["client", "athlete"]}><ClientDashboard /></ProtectedRoute>} />
            <Route path="/client/book" element={<ProtectedRoute requiredRole={["client", "athlete"]}><BookAppointment /></ProtectedRoute>} />
            <Route path="/client/appointments" element={<ProtectedRoute requiredRole={["client", "athlete"]}><AppointmentList role="client" /></ProtectedRoute>} />
            <Route path="/client/performance" element={<ProtectedRoute requiredRole={["client", "athlete"]}><ClientPerformancePage /></ProtectedRoute>} />
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
