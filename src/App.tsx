import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";

// Resilient dynamic import helper to recover from transient Vite HMR/network drops
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error: any) {
      console.warn("Failed to dynamically import module. Retrying once...", error);
      await new Promise((r) => setTimeout(r, 250));
      return await componentImport();
    }
  });

const PublicEnquiry = lazy(() => import("./pages/PublicEnquiry"));
const LeadsDashboard = lazy(() => import("./pages/admin/LeadsDashboard"));
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/auth/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const PendingApprovalPage = lazy(() => import("./pages/auth/PendingApprovalPage"));
const SetupPage = lazy(() => import("./pages/auth/SetupPage"));
const AthleteDashboard = lazy(() => import("./pages/ams/AthleteDashboard"));
const BatchTestEntry = lazy(() => import("./pages/ams/BatchTestEntry"));
const CoachDashboard = lazy(() => import("./pages/ams/CoachDashboard"));
const ProgramsPage = lazy(() => import("./pages/ams/ProgramsPage"));
const WorkoutBuilder = lazy(() => import("./pages/ams/WorkoutBuilder"));
const WorkoutLogging = lazy(() => import("./pages/ams/WorkoutLogging"));
const AmsFeed = lazy(() => import("./pages/ams/AmsFeed"));
const AmsCalendar = lazy(() => import("./pages/ams/AmsCalendar"));
const ExerciseLibrary = lazy(() => import("./pages/ams/ExerciseLibrary"));
const QuestionnaireLibrary = lazy(() => import("./pages/ams/QuestionnaireLibrary"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const FOEDashboard = lazy(() => import("./pages/admin/FOEDashboard"));
const ClientList = lazy(() => import("./pages/admin/ClientList"));
const ClientRegistration = lazy(() => import("./pages/admin/ClientRegistration"));
const FieldConfig = lazy(() => import("./pages/admin/FieldConfig"));
const ServiceMapping = lazy(() => import("./pages/admin/ServiceMapping"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminInjuries = lazy(() => import("./pages/admin/AdminInjuries"));
const AdminPermissions = lazy(() => import("./pages/admin/AdminPermissions"));
const ConsoleAccess = lazy(() => import("./pages/admin/ConsoleAccess"));
const ManagerialAnalytics = lazy(() => import("./pages/admin/ManagerialAnalytics"));
const AnalyticsConsole = lazyWithRetry(() => import("./pages/admin/analytics/AnalyticsConsole"));
const ResourceScheduleManager = lazy(() => import("./pages/admin/ResourceScheduleManager"));
const NotificationSettings = lazy(() => import("./pages/admin/NotificationSettings"));
const ConsultantDashboard = lazy(() => import("./pages/consultant/ConsultantDashboard"));
const NutritionistDashboard = lazy(() => import("./pages/nutritionist/NutritionistDashboard"));
const NutritionistClients = lazy(() => import("./pages/nutritionist/NutritionistClients"));
const NutritionistClientProfile = lazy(() => import("./pages/nutritionist/NutritionistClientProfile"));
const NutritionistAssessmentsPage = lazy(() => import("./pages/nutritionist/NutritionistAssessmentsPage"));
const NutritionistMealPlansPage = lazy(() => import("./pages/nutritionist/NutritionistMealPlansPage"));
const NutritionistSchedule = lazy(() => import("./pages/nutritionist/NutritionistSchedule"));
const HrDashboard = lazy(() => import("./pages/hr/HrDashboard"));
const HrDayPlanner = lazy(() => import("./pages/hr/HrDayPlanner"));
const ActivityTracker = lazy(() => import("./pages/hr/ActivityTracker"));
const UserApproval = lazy(() => import("./pages/hr/UserApproval"));
const StaffProfile = lazy(() => import("./pages/hr/StaffProfile"));
const DailyLogs = lazy(() => import("./pages/hr/DailyLogs"));
const LeaveApprovals = lazy(() => import("./pages/hr/LeaveApprovals"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const MyAttendancePage = lazy(() => import("./pages/shared/MyAttendancePage"));

const BillingPage = lazy(() => import("./pages/admin/Billing"));
const ClientProfile = lazy(() => import("./pages/admin/ClientProfile"));
const ConsultantAvailability = lazy(() => import("./pages/consultant/ConsultantAvailability"));
const MyClients = lazy(() => import("./pages/consultant/MyClients"));
const ConsultantClientProfile = lazy(() => import("./pages/consultant/ClientProfile"));
const ConsultantSchedule = lazy(() => import("./pages/consultant/ConsultantSchedule"));
const CaseRepoPage = lazy(() => import("./pages/consultant/CaseRepoPage"));
const ClientDashboard = lazy(() => import("./pages/client/ClientDashboard"));
const BookAppointment = lazy(() => import("./pages/client/BookAppointment"));
const ClientPerformancePage = lazy(() => import("./pages/client/ClientPerformancePage"));
const AdminCalendar = lazy(() => import("./pages/admin/AdminCalendar"));
const AdminAvailability = lazy(() => import("./pages/admin/AdminAvailability"));
const AppointmentList = lazy(() => import("./pages/shared/AppointmentList"));
const SuperAdminDashboard = lazy(() => import("./pages/super-admin/Dashboard"));
const OrganizationDetails = lazy(() => import("./pages/super-admin/OrganizationDetails"));
const OnboardOrganization = lazy(() => import("./pages/super-admin/OnboardOrganization"));
const MyProfile = lazy(() => import("./pages/shared/MyProfile"));
const MobileProfilePage = lazy(() => import("./pages/mobile/MobileProfilePage"));
const ReportsPage = lazyWithRetry(() => import("./pages/shared/ReportsPage"));
const AppGallery = lazy(() => import("./pages/AppGallery"));
const KnowledgeBasePage = lazy(() => import("./pages/knowledge-base/KnowledgeBasePage"));
const PublicQuestionnaireForm = lazy(() => import("./pages/public/PublicQuestionnaireForm"));
const PerformanceTestingHub = lazy(() => import("./pages/ams/PerformanceTestingHub"));

// TeamComms Messenger
const MessengerPage = lazy(() => import("./pages/messenger/MessengerPage"));
import TeamCommsGlobalNotifier from "./components/messenger/TeamCommsGlobalNotifier";
import { MessengerProvider } from "./contexts/MessengerContext";

// OrbitFlow Planner
const TeamsPage = lazy(() => import("./pages/planner/TeamsPage"));
const PlannerSettings = lazy(() => import("./pages/planner/PlannerSettings"));
import TaskReminderNotifier from "./components/planner/TaskReminderNotifier";

// Sports Scientist Console
const SportsScientistDashboard = lazy(() => import("./pages/sports-scientist/SportsScientistDashboard"));
const SportsScientistSchedule = lazy(() => import("./pages/sports-scientist/SportsScientistSchedule"));
const SportsScientistClients = lazy(() => import("./pages/sports-scientist/SportsScientistClients"));

const SportsScientistTemplates = lazy(() => import("./pages/sports-scientist/SportsScientistTemplates"));
const WorkoutTemplatesPage = lazy(() => import("./pages/ams/WorkoutTemplatesPage"));
const SportsScientistAnalytics = lazy(() => import("./pages/sports-scientist/SportsScientistAnalytics"));
const SportsScientistResources = lazy(() => import("./pages/sports-scientist/SportsScientistResources"));
const SportsScientistBilling = lazy(() => import("./pages/sports-scientist/SportsScientistBilling"));

// Mobile Client Pages
import MobileGuard from "./components/auth/MobileGuard";
import ErrorBoundary from "./components/ErrorBoundary";
const MobileClientDashboard = lazy(() => import("./pages/mobile/client/MobileClientDashboard"));
const MobilePerformancePage = lazy(() => import("./pages/mobile/client/MobilePerformancePage"));
const MobileLogActivity = lazy(() => import("./pages/mobile/client/MobileLogActivity"));
const MobileWorkoutLogging = lazy(() => import("./pages/mobile/client/MobileWorkoutLogging"));
const MobileUnifiedSchedule = lazy(() => import("./pages/mobile/client/MobileUnifiedSchedule"));
const MobileNotifications = lazy(() => import("./pages/mobile/client/MobileNotifications"));

// Mobile Specialist Pages
const MobileSpecialistDashboard = lazy(() => import("./pages/mobile/specialist/MobileSpecialistDashboard"));
const MobileTestingAssessments = lazy(() => import("./pages/mobile/specialist/MobileTestingAssessments"));
const MobileBulkAssignment = lazy(() => import("./pages/mobile/specialist/MobileBulkAssignment"));
const MobileAttendance = lazy(() => import("./pages/mobile/specialist/MobileAttendance"));
const MobileSessionManager = lazy(() => import("./pages/mobile/specialist/MobileSessionManager"));
const MobileMemberships = lazy(() => import("./pages/mobile/specialist/MobileMemberships"));
const MobileQuestionnaires = lazy(() => import("./pages/mobile/specialist/MobileQuestionnaires"));
const MobileClients = lazy(() => import("./pages/mobile/specialist/MobileClients"));

// Mobile Consultant Pages
const MobileConsultantDashboard = lazy(() => import("./pages/mobile/consultant/MobileConsultantDashboard"));
const MobilePhysicianView = lazy(() => import("./pages/mobile/consultant/MobilePhysicianView"));
const MobilePhysioView = lazy(() => import("./pages/mobile/consultant/MobilePhysioView"));
const MobileConsultantSchedule = lazy(() => import("./pages/mobile/consultant/MobileConsultantSchedule"));

// Mobile Planner Page
const MobilePlannerDashboard = lazy(() => import("./pages/mobile/planner/MobilePlannerDashboard"));

const queryClient = new QueryClient();

const AdminDashboardRedirect = () => {
  const { roles } = useAuth();
  const rolesList = roles || [];
  if (rolesList.includes('foe')) {
    return <FOEDashboard />;
  }
  return <AdminDashboard />;
};


const PageLoader = () => (
  <div className="h-screen overflow-y-auto flex items-center justify-center bg-background">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ErrorBoundary>
        <AuthProvider>
        <MessengerProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Suspense fallback={<PageLoader />}><Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/enquiry" element={<PublicEnquiry />} />
              <Route path="/enquiry/:orgSlug" element={<PublicEnquiry />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              {/* Public Questionnaire — no auth required */}
              <Route path="/q/:token" element={<PublicQuestionnaireForm />} />
              {/* AMS Console Routes */}
              <Route path="/ams" element={<Navigate to="/ams/coach-dashboard" replace />} />
              <Route path="/ams/coach-dashboard" element={<ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "super_admin"]}><CoachDashboard /></ProtectedRoute>} />
              <Route path="/ams/athlete-portal" element={<ProtectedRoute><AthleteDashboard /></ProtectedRoute>} />
              <Route path="/pending-approval" element={<PendingApprovalPage />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/admin" element={<ProtectedRoute requiredRole={["admin", "foe", "super_admin"]}><AdminDashboardRedirect /></ProtectedRoute>} />
              <Route path="/admin/foe" element={<ProtectedRoute requiredRole={["admin", "foe", "super_admin"]}><FOEDashboard /></ProtectedRoute>} />
              <Route path="/admin/foe/session-report" element={<ProtectedRoute requiredRole={["admin", "foe", "super_admin"]}><ActivityTracker role="foe" defaultTab="report" /></ProtectedRoute>} />
              <Route path="/admin/foe/activity-tracker" element={<ProtectedRoute requiredRole={["admin", "foe", "super_admin"]}><ActivityTracker role="foe" defaultTab="report" /></ProtectedRoute>} />
              <Route path="/admin/leads" element={<ProtectedRoute requiredRole={["admin", "foe"]}><LeadsDashboard /></ProtectedRoute>} />
              <Route path="/admin/clients" element={<ProtectedRoute requiredRole={["admin", "foe"]}><ClientList /></ProtectedRoute>} />
              <Route path="/admin/clients/register" element={<ProtectedRoute requiredRole={["admin", "foe"]}><ClientRegistration /></ProtectedRoute>} />
              <Route path="/admin/clients/:id" element={<ProtectedRoute requiredRole={["admin", "foe"]}><ClientProfile /></ProtectedRoute>} />
               <Route path="/admin/settings" element={<ProtectedRoute requiredRole="admin"><ConsoleAccess /></ProtectedRoute>} />
              <Route path="/admin/settings/console-access" element={<ProtectedRoute requiredRole="admin"><ConsoleAccess defaultTab="matrix" /></ProtectedRoute>} />
              <Route path="/admin/settings/audit-logs" element={<ProtectedRoute requiredRole="admin"><ConsoleAccess defaultTab="audit" /></ProtectedRoute>} />
              <Route path="/admin/audit-logs" element={<ProtectedRoute requiredRole="admin"><ConsoleAccess defaultTab="audit" /></ProtectedRoute>} />
              <Route path="/admin/settings/fields" element={<ProtectedRoute requiredRole="admin"><FieldConfig /></ProtectedRoute>} />
              <Route path="/admin/settings/services" element={<ProtectedRoute requiredRole="admin"><ServiceMapping /></ProtectedRoute>} />
              <Route path="/admin/settings/resource-schedule" element={<ProtectedRoute requiredRole="admin"><ResourceScheduleManager /></ProtectedRoute>} />
              <Route path="/admin/settings/injuries" element={<ProtectedRoute requiredRole="admin"><AdminInjuries /></ProtectedRoute>} />
              <Route path="/admin/settings/permissions" element={<ProtectedRoute requiredRole="admin"><ConsoleAccess /></ProtectedRoute>} />
              <Route path="/admin/permissions" element={<ProtectedRoute requiredRole="admin"><ConsoleAccess /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute><AnalyticsConsole /></ProtectedRoute>} />
              <Route path="/admin/dashboards" element={<ProtectedRoute><AnalyticsConsole /></ProtectedRoute>} />
              <Route path="/admin/analytics/patients" element={<ProtectedRoute><AnalyticsConsole /></ProtectedRoute>} />
              <Route path="/admin/analytics/managerial" element={<ProtectedRoute><AnalyticsConsole /></ProtectedRoute>} />
              <Route path="/admin/settings/notifications" element={<ProtectedRoute requiredRole="admin"><NotificationSettings /></ProtectedRoute>} />
              <Route path="/admin/billing" element={<ProtectedRoute requiredRole={["admin", "foe"]}><BillingPage /></ProtectedRoute>} />
              <Route path="/admin/users" element={<ProtectedRoute requiredRole={["admin", "foe"]}><UserApproval /></ProtectedRoute>} />
              <Route path="/admin/users/:id" element={<ProtectedRoute requiredRole={["admin", "foe"]}><StaffProfile /></ProtectedRoute>} />
              
              {/* HRMS Console Routes */}
              <Route path="/hr" element={<ProtectedRoute requiredRole={["admin", "hr_manager", "super_admin"]}><HrDashboard /></ProtectedRoute>} />
              <Route path="/hr/activity-tracker" element={<ProtectedRoute requiredRole={["admin", "hr_manager", "super_admin", "foe"]}><ActivityTracker /></ProtectedRoute>} />
              <Route path="/hr/staff-efficiency" element={<Navigate to="/hr/activity-tracker" replace />} />
              <Route path="/hr/day-planner" element={<ProtectedRoute requiredRole={["admin", "hr_manager", "super_admin"]}><HrDayPlanner /></ProtectedRoute>} />
              <Route path="/hr/employees" element={<Navigate to="/hr/leave-approvals" replace />} />
              <Route path="/hr/contracts" element={<Navigate to="/hr/leave-approvals" replace />} />
              <Route path="/hr/leaves" element={<Navigate to="/hr/leave-approvals" replace />} />
              <Route path="/hr/users" element={<ProtectedRoute requiredRole={["admin", "hr_manager", "super_admin"]}><UserApproval /></ProtectedRoute>} />
              <Route path="/hr/users/:id" element={<ProtectedRoute requiredRole={["admin", "hr_manager", "super_admin"]}><StaffProfile /></ProtectedRoute>} />
              <Route path="/hr/attendance-logs" element={<ProtectedRoute requiredRole={["admin", "hr_manager", "super_admin"]}><DailyLogs /></ProtectedRoute>} />
              <Route path="/hr/leave-approvals" element={<ProtectedRoute requiredRole={["admin", "hr_manager", "super_admin"]}><LeaveApprovals /></ProtectedRoute>} />

              {/* Shared User Profile & Active Time Route */}
              <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />

              {/* Shared Attendance Page — all clinical staff roles */}
              <Route path="/my-attendance" element={<ProtectedRoute><MyAttendancePage /></ProtectedRoute>} />

              <Route path="/admin/calendar" element={<ProtectedRoute checkCalendarAccess><AdminCalendar /></ProtectedRoute>} />
              <Route path="/admin/availability" element={<ProtectedRoute requiredRole="admin"><AdminAvailability /></ProtectedRoute>} />
              <Route path="/admin/reports" element={<ProtectedRoute requiredRole={["admin", "foe", "manager"]}><ReportsPage role="admin" /></ProtectedRoute>} />
              <Route path="/admin/reporting-engine" element={<ProtectedRoute requiredRole={["admin", "foe", "manager"]}><ReportsPage role="admin" /></ProtectedRoute>} />
              <Route path="/admin/appointments" element={<ProtectedRoute requiredRole={["admin", "foe"]}><AppointmentList role="admin" /></ProtectedRoute>} />
              <Route path="/consultant" element={<MobileGuard><ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist", "admin", "super_admin"]}><ConsultantDashboard /></ProtectedRoute></MobileGuard>} />
              {/* Nutritionist Console Routes */}
              <Route path="/nutritionist" element={<MobileGuard><ProtectedRoute requiredRole={["nutritionist", "consultant", "sports_physician", "physiotherapist", "admin", "super_admin"]}><NutritionistDashboard /></ProtectedRoute></MobileGuard>} />
              <Route path="/nutritionist/clients" element={<MobileGuard><ProtectedRoute requiredRole={["nutritionist", "consultant", "sports_physician", "physiotherapist", "admin", "super_admin"]}><NutritionistClients /></ProtectedRoute></MobileGuard>} />
              <Route path="/nutritionist/clients/:id" element={<MobileGuard><ProtectedRoute requiredRole={["nutritionist", "consultant", "sports_physician", "physiotherapist", "admin", "super_admin"]}><NutritionistClientProfile /></ProtectedRoute></MobileGuard>} />
              <Route path="/nutritionist/assessments" element={<MobileGuard><ProtectedRoute requiredRole={["nutritionist", "consultant", "sports_physician", "physiotherapist", "admin", "super_admin"]}><NutritionistAssessmentsPage /></ProtectedRoute></MobileGuard>} />
              <Route path="/nutritionist/meal-plans" element={<MobileGuard><ProtectedRoute requiredRole={["nutritionist", "consultant", "sports_physician", "physiotherapist", "admin", "super_admin"]}><NutritionistMealPlansPage /></ProtectedRoute></MobileGuard>} />
              <Route path="/nutritionist/schedule" element={<MobileGuard><ProtectedRoute requiredRole={["nutritionist", "consultant", "sports_physician", "physiotherapist", "admin", "super_admin"]}><NutritionistSchedule /></ProtectedRoute></MobileGuard>} />
              <Route path="/consultant/clients" element={<MobileGuard><ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist", "admin", "super_admin"]}><MyClients /></ProtectedRoute></MobileGuard>} />
              <Route path="/consultant/clients/:id" element={<MobileGuard><ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist", "admin", "super_admin"]}><ConsultantClientProfile /></ProtectedRoute></MobileGuard>} />
              <Route path="/consultant/availability" element={<MobileGuard><ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist", "admin", "super_admin"]}><ConsultantAvailability /></ProtectedRoute></MobileGuard>} />
              <Route path="/consultant/reports" element={<MobileGuard><ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist", "admin", "super_admin"]}><ReportsPage role="consultant" /></ProtectedRoute></MobileGuard>} />
              <Route path="/consultant/schedule" element={<MobileGuard><ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist", "admin", "super_admin"]}><ConsultantSchedule /></ProtectedRoute></MobileGuard>} />
              <Route path="/consultant/cases" element={<MobileGuard><ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist", "admin", "super_admin"]}><CaseRepoPage /></ProtectedRoute></MobileGuard>} />
              <Route path="/consultant/injuries" element={<MobileGuard><ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist", "admin", "super_admin"]}><CaseRepoPage /></ProtectedRoute></MobileGuard>} />
              
              <Route path="/sports-scientist" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><SportsScientistDashboard /></ProtectedRoute></MobileGuard>} />
              <Route path="/sports-scientist/schedule" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><SportsScientistSchedule /></ProtectedRoute></MobileGuard>} />
              <Route path="/sports-scientist/sessions" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><SportsScientistSchedule /></ProtectedRoute></MobileGuard>} />

              <Route path="/sports-scientist/clients" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin", "super_admin", "consultant", "physiotherapist", "sports_physician"]}><SportsScientistClients /></ProtectedRoute></MobileGuard>} />
              <Route path="/sports-scientist/clients/:id" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin", "super_admin", "consultant", "physiotherapist", "sports_physician"]}><ConsultantClientProfile /></ProtectedRoute></MobileGuard>} />
              <Route path="/sports-scientist/reports" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><ReportsPage role="sports_scientist" /></ProtectedRoute></MobileGuard>} />
              <Route path="/sports-scientist/templates" element={<Navigate to="/ams/templates" replace />} />
              <Route path="/ams/templates" element={<MobileGuard><ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "super_admin", "sports_physician", "physiotherapist", "nutritionist"]}><WorkoutTemplatesPage /></ProtectedRoute></MobileGuard>} />
              <Route path="/sports-scientist/resources" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin", "super_admin", "consultant", "physiotherapist", "sports_physician"]}><SportsScientistResources /></ProtectedRoute></MobileGuard>} />

              <Route path="/ams/programs" element={<MobileGuard><ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist"]}><ProgramsPage /></ProtectedRoute></MobileGuard>} />
              <Route path="/ams/programs/:id/builder" element={<ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist"]}><WorkoutBuilder /></ProtectedRoute>} />
              <Route path="/ams/feed" element={<ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist"]}><AmsFeed /></ProtectedRoute>} />
              <Route path="/ams/calendar" element={<ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist"]}><AmsCalendar /></ProtectedRoute>} />
              <Route path="/ams/exercises" element={<ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist"]}><ExerciseLibrary /></ProtectedRoute>} />
              <Route path="/ams/questionnaires" element={<MobileGuard><ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist", "foe"]}><QuestionnaireLibrary /></ProtectedRoute></MobileGuard>} />
              <Route path="/ams/performance-testing" element={<MobileGuard><ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist", "foe"]}><PerformanceTestingHub /></ProtectedRoute></MobileGuard>} />
              <Route path="/ams/performance-testing/:subview" element={<MobileGuard><ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "sports_physician", "physiotherapist", "nutritionist", "foe"]}><PerformanceTestingHub /></ProtectedRoute></MobileGuard>} />

              {/* Standalone Forms & Assessments Console Routes */}
              <Route path="/questionnaires" element={<MobileGuard><ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "super_admin", "sports_physician", "physiotherapist", "consultant", "nutritionist", "foe"]}><QuestionnaireLibrary /></ProtectedRoute></MobileGuard>} />
              <Route path="/questionnaires/performance-testing" element={<MobileGuard><ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "super_admin", "sports_physician", "physiotherapist", "consultant", "nutritionist", "foe"]}><PerformanceTestingHub /></ProtectedRoute></MobileGuard>} />
              <Route path="/questionnaires/performance-testing/:subview" element={<MobileGuard><ProtectedRoute requiredRole={["coach", "sports_scientist", "admin", "super_admin", "sports_physician", "physiotherapist", "consultant", "nutritionist", "foe"]}><PerformanceTestingHub /></ProtectedRoute></MobileGuard>} />
              <Route path="/forms-assessments" element={<Navigate to="/questionnaires" replace />} />
              <Route path="/ams/athlete/calendar" element={<ProtectedRoute requiredRole={["client", "athlete"]}><AthleteDashboard /></ProtectedRoute>} />
              <Route path="/ams/athlete/workout/:id" element={<ProtectedRoute requiredRole={["client", "athlete"]}><WorkoutLogging /></ProtectedRoute>} />
              <Route path="/ams/batch-tests" element={<Navigate to="/ams/performance-testing/grid" replace />} />
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
              <Route path="/mobile/specialist/clients" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin", "super_admin", "consultant", "physiotherapist", "sports_physician"]}><MobileClients /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/specialist/clients/:id" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin", "super_admin", "consultant", "physiotherapist", "sports_physician"]}><ConsultantClientProfile /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/specialist/memberships" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin"]}><MobileMemberships /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/specialist/forms" element={<MobileGuard><ProtectedRoute requiredRole={["sports_scientist", "admin", "consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist", "coach", "foe"]}><MobileQuestionnaires /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/specialist/attendance" element={<Navigate to="/my-attendance" replace />} />

              {/* Mobile-Specific Consultant Console Routes */}
              <Route path="/mobile/consultant" element={<MobileGuard><ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist"]}><MobileConsultantDashboard /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/consultant/session/physician/:id" element={<MobileGuard><ProtectedRoute requiredRole={["consultant", "sports_physician"]}><MobilePhysicianView /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/consultant/session/physio/:id" element={<MobileGuard><ProtectedRoute requiredRole={["consultant", "physiotherapist"]}><MobilePhysioView /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/consultant/clients" element={<MobileGuard><ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist"]}><MobileClients /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/consultant/clients/:id" element={<MobileGuard><ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist"]}><ConsultantClientProfile /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/consultant/schedule" element={<MobileGuard><ProtectedRoute requiredRole={["consultant", "sports_physician", "physiotherapist", "nutritionist", "massage_therapist"]}><MobileConsultantSchedule /></ProtectedRoute></MobileGuard>} />
              <Route path="/mobile/consultant/attendance" element={<Navigate to="/my-attendance" replace />} />

              <Route path="/super-admin" element={<ProtectedRoute requiredRole="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />
              <Route path="/super-admin/organizations/new" element={<ProtectedRoute requiredRole="super_admin"><OnboardOrganization /></ProtectedRoute>} />
              <Route path="/super-admin/organizations/:id" element={<ProtectedRoute requiredRole="super_admin"><OrganizationDetails /></ProtectedRoute>} />

              {/* Mobile Profile Page */}
              <Route path="/mobile/profile" element={<MobileGuard><ProtectedRoute><MobileProfilePage /></ProtectedRoute></MobileGuard>} />

              {/* App Gallery */}
              <Route path="/app-gallery" element={<ProtectedRoute><AppGallery /></ProtectedRoute>} />

              {/* ISHPO Knowledge Base & User Manual */}
              <Route path="/knowledge-base" element={<ProtectedRoute><KnowledgeBasePage /></ProtectedRoute>} />
              <Route path="/knowledge-base/:category" element={<ProtectedRoute><KnowledgeBasePage /></ProtectedRoute>} />
              <Route path="/docs" element={<Navigate to="/knowledge-base" replace />} />

              {/* TeamComms Messenger */}
              <Route path="/messenger" element={<ProtectedRoute><MessengerPage /></ProtectedRoute>} />

              {/* OrbitFlow Planner (Unified View) */}
              <Route path="/planner" element={<ProtectedRoute><MobilePlannerDashboard /></ProtectedRoute>} />
              <Route path="/planner/daily-schedule" element={<ProtectedRoute><MobilePlannerDashboard /></ProtectedRoute>} />
              <Route path="/planner/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
              <Route path="/planner/approvals" element={<ProtectedRoute><MobilePlannerDashboard /></ProtectedRoute>} />
              <Route path="/planner/my-work" element={<ProtectedRoute><MobilePlannerDashboard /></ProtectedRoute>} />
              <Route path="/planner/reports" element={<ProtectedRoute><MobilePlannerDashboard /></ProtectedRoute>} />
              <Route path="/planner/settings" element={<ProtectedRoute><PlannerSettings /></ProtectedRoute>} />
              <Route path="/mobile/planner" element={<ProtectedRoute><MobilePlannerDashboard /></ProtectedRoute>} />

              {/* Universal Authenticated Routes */}
              <Route path="/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes></Suspense>
            <TaskReminderNotifier />
            <TeamCommsGlobalNotifier />
          </BrowserRouter>
        </TooltipProvider>
      </MessengerProvider>
    </AuthProvider>
  </ErrorBoundary>
</ThemeProvider>
</QueryClientProvider>
);

export default App;
