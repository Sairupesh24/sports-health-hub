import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MobileConsultantLayout from "@/components/layout/MobileConsultantLayout";
import MobileSpecialistLayout from "@/components/layout/MobileSpecialistLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import AssessmentReport from "@/components/shared/assessment/AssessmentReport";
import ReportsHubView from "@/pages/admin/analytics/ReportsHubView";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { FileSpreadsheet, Activity, Lock } from "lucide-react";

interface ReportsPageProps {
  role: "admin" | "consultant" | "sports_scientist" | "client" | "foe" | "manager";
}

export default function ReportsPage({ role }: ReportsPageProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { roles, profile } = useAuth();

  const hasAnalyticsAccess = Boolean(
    roles?.some((r) => ["admin", "super_admin", "manager"].includes(r)) ||
    profile?.has_analytics_access === true ||
    (Array.isArray(profile?.allowed_consoles) && profile.allowed_consoles.includes("analytics")) ||
    (typeof profile?.allowed_consoles === "string" && profile.allowed_consoles.includes("analytics"))
  );

  const isReportingEngineRoute =
    location.pathname === "/admin/reports" ||
    location.pathname.startsWith("/admin/reports") ||
    location.pathname === "/admin/reporting-engine" ||
    location.pathname.startsWith("/admin/reporting-engine") ||
    role === "admin" ||
    role === "manager";

  // For clinicians, default to "clinical" assessment; for reporting engine, it's always "hub"
  const [reportMode, setReportMode] = useState<"hub" | "clinical">("clinical");

  // Determine initial module based on user role
  const defaultModule =
    role === "sports_scientist"
      ? "Sports Science"
      : role === "consultant"
      ? "Physiotherapy"
      : "Billing";

  const defaultReport =
    role === "sports_scientist"
      ? "scientist-sessions"
      : role === "consultant"
      ? "therapist-sessions"
      : "service-wise";

  const renderContent = () => {
    if (role === "client") {
      return <AssessmentReport role={role} />;
    }

    // 1. Dedicated Reporting Engine route (/admin/reports, /admin/reporting-engine)
    if (isReportingEngineRoute) {
      if (!hasAnalyticsAccess) {
        return (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-2xl border border-border shadow-sm max-w-lg mx-auto mt-12 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                You do not have access to the Analytics &amp; Reporting Engine. Please contact your administrator to request access.
              </p>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          {/* Top Header & Title for Reporting Engine */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-extrabold text-foreground flex items-center gap-2">
                  Reporting Engine
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
                    Reports Center &amp; Excel Export
                  </Badge>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Generate, customize, and export detailed client sessions, service-wise invoices, therapist &amp; sports scientist sessions, and revenue reports.
                </p>
              </div>
            </div>
          </div>

          {/* Reporting Engine renders ReportsHubView directly without clinical assessment tab */}
          <ReportsHubView initialModule={defaultModule} initialReport={defaultReport} role={role} />
        </div>
      );
    }

    // 2. Clinician Routes (/consultant/reports, /sports-scientist/reports)
    // If clinician does NOT have analytics access: render Individual Clinical Reporting ONLY.
    if (!hasAnalyticsAccess) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Individual Clinical Reporting
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Client evaluations, clinical notes, treatment plans, and assessment history.
              </p>
            </div>
          </div>
          <AssessmentReport role={role} />
        </div>
      );
    }

    // If clinician DOES have analytics access: provide toggle between clinical reporting and operational reports
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-extrabold text-foreground flex items-center gap-2">
                Reports &amp; Assessments
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage individual client clinical assessments and access operational reports.
              </p>
            </div>
          </div>
        </div>

        {/* Toggle between Individual Clinical Assessment and Operational & Excel Export Reports */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800">
          <Tabs value={reportMode} onValueChange={(v) => setReportMode(v as any)}>
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-10 border border-slate-200/50 dark:border-slate-700/50">
              <TabsTrigger
                value="clinical"
                className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-sm px-3"
              >
                <Activity className="w-3.5 h-3.5 text-primary" />
                <span>Individual Clinical Assessment</span>
              </TabsTrigger>
              <TabsTrigger
                value="hub"
                className="rounded-lg text-xs font-bold gap-1.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 shadow-sm px-3"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Operational &amp; Excel Export Reports</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {reportMode === "hub" ? (
          <ReportsHubView initialModule={defaultModule} initialReport={defaultReport} role={role} />
        ) : (
          <AssessmentReport role={role} />
        )}
      </div>
    );
  };

  // Responsive Layout Wrapper
  if (isMobile) {
    if (role === "consultant") {
      return (
        <MobileConsultantLayout title="Reports">
          {renderContent()}
        </MobileConsultantLayout>
      );
    }
    return (
      <MobileSpecialistLayout title="Reports">
        {renderContent()}
      </MobileSpecialistLayout>
    );
  }

  return (
    <DashboardLayout role={isReportingEngineRoute ? "analytics" : role}>
      {renderContent()}
    </DashboardLayout>
  );
}
