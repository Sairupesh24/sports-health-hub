import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart3,
  Users,
  GitMerge,
  Building2,
  TrendingUp,
  Calendar,
  CalendarDays,
  ShieldAlert,
  Download,
  Filter,
  ArrowLeft,
  Clock,
  Sparkles
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  startOfQuarter,
  endOfQuarter,
} from "date-fns";

// Views
import PatientTrackingView from "./PatientTrackingView";
import CrossSellView from "./CrossSellView";
import OrganizationsView from "./OrganizationsView";
import ManagerialAnalytics from "../ManagerialAnalytics";

export default function AnalyticsConsole() {
  const { roles, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State (synced with URL ?tab=...)
  const initialTab = searchParams.get("tab") || "patients";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams({ tab: val });
  };

  // Date Presets State
  const [preset, setPreset] = useState<
    "this-month" | "last-month" | "this-quarter" | "this-fy" | "last-fy" | "custom"
  >("this-month");

  // Custom Date Pickers
  const [customStart, setCustomStart] = useState(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [customEnd, setCustomEnd] = useState(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );

  // Population Segment Filter (All, Athletes, General Population)
  const [populationFilter, setPopulationFilter] = useState<"all" | "athlete" | "general">("all");

  // Calculate Indian Financial Year (April 1 to March 31)
  const getFYRange = (offsetYears = 0) => {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-indexed: 0 = Jan, 3 = Apr
    const currentYear = today.getFullYear();
    const startYear = (currentMonth < 3 ? currentYear - 1 : currentYear) + offsetYears;
    const endYear = startYear + 1;
    return {
      start: `${startYear}-04-01`,
      end: `${endYear}-03-31`,
      label: `FY ${startYear}-${String(endYear).slice(2)}`,
    };
  };

  const currentFY = useMemo(() => getFYRange(0), []);
  const lastFY = useMemo(() => getFYRange(-1), []);

  // Compute Active Date Range
  const dateRange = useMemo(() => {
    const today = new Date();
    switch (preset) {
      case "this-month":
        return {
          start: format(startOfMonth(today), "yyyy-MM-dd"),
          end: format(endOfMonth(today), "yyyy-MM-dd"),
          label: format(today, "MMMM yyyy"),
        };
      case "last-month": {
        const lastM = subMonths(today, 1);
        return {
          start: format(startOfMonth(lastM), "yyyy-MM-dd"),
          end: format(endOfMonth(lastM), "yyyy-MM-dd"),
          label: format(lastM, "MMMM yyyy"),
        };
      }
      case "this-quarter":
        return {
          start: format(startOfQuarter(today), "yyyy-MM-dd"),
          end: format(endOfQuarter(today), "yyyy-MM-dd"),
          label: "Current Quarter",
        };
      case "this-fy":
        return {
          start: currentFY.start,
          end: currentFY.end,
          label: currentFY.label,
        };
      case "last-fy":
        return {
          start: lastFY.start,
          end: lastFY.end,
          label: lastFY.label,
        };
      case "custom":
      default:
        return {
          start: customStart,
          end: customEnd,
          label: `${customStart} to ${customEnd}`,
        };
    }
  }, [preset, customStart, customEnd, currentFY, lastFY]);

  // Auth Guard check: allowed roles OR explicit has_analytics_access flag
  const allowedRoles = ["admin", "super_admin", "manager", "hr_manager", "foe"];
  const isAuthorized =
    roles?.some((r) => allowedRoles.includes(r)) ||
    profile?.has_analytics_access === true;

  if (!isAuthorized) {
    return (
      <DashboardLayout role={roles?.[0] || "client"}>
        <div className="h-[75vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You do not have administrative permission to access the Analytics & Reports Console.
            Please consult your clinical supervisor or system administrator.
          </p>
          <Button onClick={() => navigate(-1)} variant="outline" className="rounded-xl">
            Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={roles?.[0] || "admin"}>
      <div className="space-y-6 pb-16 animate-in fade-in slide-in-from-bottom-3 duration-500">
        {/* Top Header & Title */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-sm">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-display font-extrabold text-foreground flex items-center gap-2">
                  Analytics & Reports Console
                  <Badge variant="outline" className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold">
                    Executive Suite
                  </Badge>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Real-time patient acquisition tracking, inter-disciplinary service cross-selling, and institutional intelligence.
                </p>
              </div>
            </div>
          </div>

          {/* Date Range & Preset Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm self-start lg:self-auto">
            <Button
              variant={preset === "this-month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreset("this-month")}
              className="rounded-xl text-xs font-semibold h-8"
            >
              This Month
            </Button>
            <Button
              variant={preset === "last-month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreset("last-month")}
              className="rounded-xl text-xs font-semibold h-8"
            >
              Last Month
            </Button>
            <Button
              variant={preset === "this-quarter" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreset("this-quarter")}
              className="rounded-xl text-xs font-semibold h-8"
            >
              This Quarter
            </Button>
            <Button
              variant={preset === "this-fy" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreset("this-fy")}
              className="rounded-xl text-xs font-semibold h-8"
            >
              {currentFY.label}
            </Button>
            <Button
              variant={preset === "last-fy" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreset("last-fy")}
              className="rounded-xl text-xs font-semibold h-8"
            >
              {lastFY.label}
            </Button>
            <Button
              variant={preset === "custom" ? "default" : "ghost"}
              size="sm"
              onClick={() => setPreset("custom")}
              className="rounded-xl text-xs font-semibold h-8"
            >
              Custom
            </Button>

            {preset === "custom" && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800 ml-1">
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-7 text-xs border-slate-200 dark:border-slate-700 w-32 rounded-lg"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-7 text-xs border-slate-200 dark:border-slate-700 w-32 rounded-lg"
                />
              </div>
            )}
          </div>
        </div>

        {/* Console Navigation Tabs & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full sm:w-auto">
            <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl h-11 border border-slate-200/50 dark:border-slate-700/50">
              <TabsTrigger
                value="patients"
                className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm px-4 h-9"
              >
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>Patient Tracking & Demographics</span>
              </TabsTrigger>

              <TabsTrigger
                value="cross-sell"
                className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm px-4 h-9"
              >
                <GitMerge className="w-3.5 h-3.5 text-indigo-500" />
                <span>Service Cross-Selling</span>
              </TabsTrigger>

              <TabsTrigger
                value="organizations"
                className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm px-4 h-9"
              >
                <Building2 className="w-3.5 h-3.5 text-purple-500" />
                <span>Partner Organizations</span>
              </TabsTrigger>

              <TabsTrigger
                value="staff"
                className="rounded-xl text-xs font-bold gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm px-4 h-9"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span>Staff Efficiency</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Secondary Filter for Patient Tracking (Athletes vs Gen-Pop) */}
          {activeTab === "patients" && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200/50 dark:border-slate-700/50">
              <Button
                variant={populationFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setPopulationFilter("all")}
                className="h-7 text-xs rounded-lg font-medium"
              >
                All Clients
              </Button>
              <Button
                variant={populationFilter === "athlete" ? "default" : "ghost"}
                size="sm"
                onClick={() => setPopulationFilter("athlete")}
                className="h-7 text-xs rounded-lg font-medium"
              >
                Athletes Only
              </Button>
              <Button
                variant={populationFilter === "general" ? "default" : "ghost"}
                size="sm"
                onClick={() => setPopulationFilter("general")}
                className="h-7 text-xs rounded-lg font-medium"
              >
                General Pop Only
              </Button>
            </div>
          )}
        </div>

        {/* Tab 1: Patient Tracking & Demographics */}
        {activeTab === "patients" && (
          <PatientTrackingView
            startDate={dateRange.start}
            endDate={dateRange.end}
            populationFilter={populationFilter}
          />
        )}

        {/* Tab 2: Service Cross-Selling */}
        {activeTab === "cross-sell" && (
          <CrossSellView
            startDate={dateRange.start}
            endDate={dateRange.end}
          />
        )}

        {/* Tab 3: Partner Organizations */}
        {activeTab === "organizations" && (
          <OrganizationsView
            startDate={dateRange.start}
            endDate={dateRange.end}
          />
        )}

        {/* Tab 4: Staff Efficiency */}
        {activeTab === "staff" && (
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <ManagerialAnalytics embedded={true} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
