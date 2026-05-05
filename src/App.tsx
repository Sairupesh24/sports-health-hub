import { Toaster } from "@/components/ui/toaster";
import PublicEnquiry from "./pages/PublicEnquiry";
import LeadsDashboard from "./pages/admin/LeadsDashboard";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
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
import ExerciseLibrary from "./pages/ams/ExerciseLibrary";
import QuestionnaireLibrary from "./pages/ams/QuestionnaireLibrary";
import AdminDashboard from "./pages/admin/AdminDashboard";
import FOEDashboard from "./pages/admin/FOEDashboard";
import ClientList from "./pages/admin/ClientList";
import ClientRegistration from "./pages/admin/ClientRegistration";
import FieldConfig from "./pages/admin/FieldConfig";
import ConsultantDashboard from "./pages/consultant/ConsultantDashboard";
import EmployeeManagement from "./pages/hr/EmployeeManagement";
import HrDashboard from "./pages/hr/HrDashboard";
import UserApproval from "./pages/hr/UserApproval";
import DailyLogs from "./pages/hr/DailyLogs";
import LeaveApprovals from "./pages/hr/LeaveApprovals";
import MyAttendancePage from "./pages/shared/MyAttendancePage";

import BillingPage from "./pages/admin/Billing";
import ClientProfile from "./pages/admin/ClientProfile";
import ConsultantAvailability from "./pages/consultant/ConsultantAvailability";
import MyClients from "./pages/consultant/MyClients";
import ConsultantClientProfile from "./pages/consultant/ClientProfile";
import ConsultantSchedule from "./pages/consultant/ConsultantSchedule";
import InjuryRepoPage from "./pages/consultant/InjuryRepoPage";
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

import SportsScientistTemplates from "./pages/sports-scientist/SportsScientistTemplates";
import SportsScientistAnalytics from "./pages/sports-scientist/SportsScientistAnalytics";
import SportsScientistResources from "./pages/sports-scientist/SportsScientistResources";
import SportsScientistBilling from "./pages/sports-scientist/SportsScientistBilling";

// Mobile Client Pages
import MobileGuard from "./components/auth/MobileGuard";
import ErrorBoundary from "./components/ErrorBoundary";
import MobileClientDashboard from "./pages/mobile/client/MobileClientDashboard";
import MobilePerformancePage from "./pages/mobile/client/MobilePerformancePage";
import MobileLogActivity from "./pages/mobile/client/MobileLogActivity";
import MobileWorkoutLogging from "./pages/mobile/client/MobileWorkoutLogging";
import MobileUnifiedSchedule from "./pages/mobile/client/MobileUnifiedSchedule";
import MobileNotifications from "./pages/mobile/client/MobileNotifications";

// Mobile Specialist Pages
import MobileSpecialistDashboard from "./pages/mobile/specialist/MobileSpecialistDashboard";
import MobileTestingAssessments from "./pages/mobile/specialist/MobileTestingAssessments";
import MobileBulkAssignment from "./pages/mobile/specialist/MobileBulkAssignment";
import MobileAttendance from "./pages/mobile/specialist/MobileAttendance";
import MobileSessionManager from "./pages/mobile/specialist/MobileSessionManager";
import MobileMemberships from "./pages/mobile/specialist/MobileMemberships";
import MobileQuestionnaires from "./pages/mobile/specialist/MobileQuestionnaires";
import MobileClients from "./pages/mobile/specialist/MobileClients";

const queryClient = new QueryClient();

const AdminDashboardRedirect = () => {
  const { roles } = useAuth();
  if (roles.includes('foe')) {
    return <FOEDashboard />;
  }
  return <AdminDashboard />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/enquiry" element={<PublicEnquiry />} />
              <Route path="/enquiry/:orgSlug" element={<PublicEnquiry />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/ams/athlete-portal" element={<ProtectedRoute><AthleteDashboard /></ProtectedRoute>} />
              <Route path="/ams/coach-dashboard" element={<ProtectedRoute><CoachDashboard /></ProtectedRoute>} />
              <Route path="/pending-approval" element={<PendingApprovalPage />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/admin" element={<ProtectedRoute requiredRole={["admin", "foe"]}><AdminDashboardRedirect /></ProtectedRoute>} />
              <Route path="/admin/leads" element={<ProtectedRoute requiredRole={["admin", "foe"]}><LeadsDashboard /></ProtectedRoute>} />
              <Route path="/admin/clients" element={<ProtectedRoute requiredRole={["admin", "foe"]}><ClientList /></ProtectedRoute>} />
              <Route path="/admin/clients/register" element={<ProtectedRoute requiredRole={["admin", "foe"]}><ClientRegistration /></ProtectedRoute>} />
              <Route path="/admin/clients/:id" element={<ProtectedRoute requiredRole={["admin", "foe"]}><ClientProfile /></ProtectedRoute>} />
              <Route path="/admin/settings/fields" element={<ProtectedRoute requiredRole="admin"><FieldConfig /></ProtectedRoute>} />
              <Route path="/admin/billing" element={<ProtectedRoute requiredRole={["admin", "foe"]}><BillingPage /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requiredRole={["admin", "foe"]}><UserApproval /></ProtectedRoute>} />
              
              {/* HRMS Console Routes */}
              <Route path="/hr" element={<ProtectedRoute requiredRole="hr_manager"><HrDashboard /></ProtectedRoute>} />
              <Route path="/hr/employees" element={<ProtectedRoute requiredRole="hr_manager"><EmployeeManagement /></ProtectedRoute>} />
              <Route path="/hr/contracts" element={<ProtectedRoute requiredRole="hr_manager"><EmployeeManagement /></ProtectedRoute>} />
              <Route path="/hr/leaves" element={<ProtectedRoute requiredRole="hr_manager"><EmployeeManagement /></ProtectedRoute>} />
              <Route path="/hr/users" element={<ProtectedRoute requiredRole="hr_manager"><UserApproval /></ProtectedRoute>} />
              <Route path="/hr/attendance-logs" element={<ProtectedRoute requiredRole="hr_manager"><DailyLogs /></ProtectedRoute>} />
              <Route path="/hr/leave-approvals" element={<ProtectedRoute requiredRole="hr_manager"><LeaveApprovals /></ProtectedRoute>} />

              {/* Shared Attendance Page — all clinical staff roles */}
              <Route path="/my-attendance" element={<ProtectedRoute><MyAttendancePage /></ProtectedRoute>} />

              <Route path="/admin/calendar" element={<ProtectedRoute requiredRole={["admin", "foe"]}><AdminCalendar /></ProtectedRoute>} />
              <Route path="/admin/availability" element={<ProtectedRoute requiredRole="admin"><AdminAvailability /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute requiredRole={["admin", "foe", "manager"]}><ReportsPage role="admin" /></ProtectedRoute>} />
              <Route path="/admin/appointments" element={<ProtectedRoute requiredRole={["admin", "foe"]}><AppointmentList role="admin" /></ProtectedRoute>} />
              <Route path="/consultant" element={<ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist"]}><ConsultantDashboard /></ProtectedRoute>} />
              <Route path="/consultant/clients" element={<ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist"]}><MyClients /></ProtectedRoute>} />
              <Route path="/consultant/clients/:id" element={<ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist"]}><ConsultantClientProfile /></ProtectedRoute>} />
              <Route path="/consultant/availability" element={<ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist"]}><ConsultantAvailability /></ProtectedRoute>} />
              <Route path="/consultant/reports" element={<ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist"]}><ReportsPage role="consultant" /></ProtectedRoute>} />
              <Route path="/consultant/schedule" element={<ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist"]}><ConsultantSchedule /></ProtectedRoute>} />
              <Route path="/consultant/injuries" element={<ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist"]}><InjuryRepoPage /></ProtectedRoute>} />
              
              <Route path="/sports-scientist" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><SportsScientistDashboard /></ProtectedRoute></MobileGuard>} />
              <Route path="/sports-scientist/schedule" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><SportsScientistSchedule /></ProtectedRoute></MobileGuard>} />
              <Route path="/sports-scientist/sessions" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><SportsScientistSchedule /></ProtectedRoute></MobileGuard>} />

              <Route path="/sports-scientist/clients" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><SportsScientistClients /></ProtectedRoute></MobileGuard>} />
              <Route path="/sports-scientist/reports" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><ReportsPage role="sports_scientist" /></ProtectedRoute></MobileGuard>} />
              <Route path="/sports-scientist/templates" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><SportsScientistTemplates /></ProtectedRoute></MobileGuard>} />
              <Route path="/sports-scientist/resources" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><SportsScientistResources /></ProtectedRoute></MobileGuard>} />

              <Route path="/ams/programs" element={<MobileGuard><ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist"]}><ProgramsPage /></ProtectedRoute></MobileGuard>} />
              <Route path="/ams/programs/:id/builder" element={<ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist"]}><WorkoutBuilder /></ProtectedRoute>} />
              <Route path="/ams/feed" element={<ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist"]}><AmsFeed /></ProtectedRoute>} />
              <Route path="/ams/calendar" element={<ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist"]}><AmsCalendar /></ProtectedRoute>} />
              <Route path="/ams/exercises" element={<ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist"]}><ExerciseLibrary /></ProtectedRoute>} />
              <Route path="/ams/questionnaires" element={<MobileGuard><ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist", "foe"]}><QuestionnaireLibrary /></ProtectedRoute></MobileGuard>} />
              <Route path="/ams/athlete/calendar" element={<ProtectedRoute requiredRole={["client", "athlete"]}><AthleteDashboard /></ProtectedRoute>} />
              <Route path="/ams/athlete/workout/:id" element={<ProtectedRoute requiredRole={["client", "athlete"]}><WorkoutLogging /></ProtectedRoute>} />
              <Route path="/ams/batch-tests" element={<MobileGuard><ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist"]}><BatchTestEntry /></ProtectedRoute></MobileGuard>} />
              <Route path="/sports-scientist/analytics" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><SportsScientistAnalytics /></ProtectedRoute></MobileGuard>} />
              <Route path="/sports-scientist/billing" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><SportsScientistBilling /></ProtectedRoute></MobileGuard>} />

              {/* Client Console - Wrapped in MobileGuard for redirection */}
              <Route path="/client" element={<MobileGuard><ProtectedRoute requiredRole={["client", "athlete"]}><ClientDashboard /></ProtectedRoute></MobileGuard>} />
              <Route path="/client/book" element={<MobileGuard><ProtectedRoute requiredRole={["client", "athlete"]}><BookAppointment /></ProtectedRoute></MobileGuard>} />
              <Route path="/client/appointments" element={<MobileGuard><ProtectedRoute requiredRole={["client", "athlete"]}><AppointmentList role="client" /></ProtectedRoute></MobileGuard>} />
              <Route path="/client/performance" element={<MobileGuard><ProtectedRoute requiredRole={["client", "athlete"]}><ClientPerformancePage /></ProtectedRoute></MobileGuard>} />

              {/* Mobile-Specific Client Console Routes */}
              <Route path="/mobile/client" element={<MobileGuard><ProtectedRoute requiredRole={["client", "athlete"]}><MobileClientDashboard /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/client/appointments" element={<MobileGuard><ProtectedRoute requiredRole={["client", "athlete"]}><MobileUnifiedSchedule /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/client/performance" element={<MobileGuard><ProtectedRoute requiredRole={["client", "athlete"]}><MobilePerformancePage /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/client/log-activity" element={<MobileGuard><ProtectedRoute requiredRole={["client", "athlete"]}><MobileLogActivity /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/client/notifications" element={<MobileGuard><ProtectedRoute requiredRole={["client", "athlete"]}><MobileNotifications /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/client/workout/:id" element={<MobileGuard><ProtectedRoute requiredRole={["client", "athlete"]}><MobileWorkoutLogging /></ProtectedRoute></MobileGuard>} />
              
              {/* Mobile-Specific Specialist Console Routes */}
              <Route path="/mobile/specialist" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><MobileSpecialistDashboard /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/specialist/sessions" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><MobileSessionManager /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/specialist/clients" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><MobileClients /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/specialist/memberships" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><MobileMemberships /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/specialist/forms" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><MobileQuestionnaires /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/specialist/attendance" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><MobileAttendance /></ProtectedRoute></MobileGuard>} />

              <Route path="/super-admin" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/super-admin/organizations/new" element={<ProtectedRoute requiredRole="super_admin"><OnboardOrganization /></ProtectedRoute>} />
              <Route path="/super-admin/organizations/:id" element={<ProtectedRoute requiredRole="super_admin"><OrganizationDetails /></ProtectedRoute>} />

              {/* Universal Authenticated Routes */}
              <Route path="/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
