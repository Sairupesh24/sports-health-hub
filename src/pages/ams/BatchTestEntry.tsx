import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PerformanceTestingGrid from "@/components/ams/PerformanceTestingGrid";
import { Target } from "lucide-react";

export default function BatchTestEntry() {
    return (
        <DashboardLayout role="sports_scientist">
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                    <div>
                        <h1 className="text-3xl font-black font-display tracking-tight flex items-center gap-2">
                            <Target className="w-8 h-8 text-primary" />
                            Performance Testing Suite
                        </h1>
                        <p className="text-muted-foreground">Administer squad-wide tests and record results in real-time.</p>
                    </div>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <PerformanceTestingGrid />
                </div>
            </div>
        </DashboardLayout>
    );
}

