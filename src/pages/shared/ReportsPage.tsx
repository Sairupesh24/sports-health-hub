import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MobileConsultantLayout from "@/components/layout/MobileConsultantLayout";
import MobileSpecialistLayout from "@/components/layout/MobileSpecialistLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import AssessmentReport from "@/components/shared/assessment/AssessmentReport";

interface ReportsPageProps {
  role: "admin" | "consultant" | "sports_scientist" | "client" | "foe" | "manager";
}

export default function ReportsPage({ role }: ReportsPageProps) {
  const isMobile = useIsMobile();

  const renderContent = () => (
    <AssessmentReport role={role} />
  );

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
    <DashboardLayout role={role}>
      {renderContent()}
    </DashboardLayout>
  );
}
