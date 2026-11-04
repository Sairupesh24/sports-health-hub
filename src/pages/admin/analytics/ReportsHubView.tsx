import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileSpreadsheet,
  Download,
  Search,
  Calendar,
  Clock,
  User,
  Users,
  AlertCircle,
  Activity,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  Lock,
  Layers,
  ListOrdered,
  ArrowUpDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  startOfQuarter,
  endOfQuarter,
  startOfWeek,
  endOfWeek
} from "date-fns";
import { exportToExcel, exportToExcelMultiSheet, exportToCSV, ExcelColumn } from "@/utils/excelExport";
import { toast } from "sonner";

interface ReportsHubViewProps {
  initialModule?: string;
  initialReport?: string;
  role?: string;
}

interface FilterOptions {
  clients: Array<{ id: string; uhid: string; name: string; sport: string }>;
  groups?: string[];
  therapists: Array<{ id: string; name: string; profession: string; role: string }>;
  sportsScientists: Array<{ id: string; name: string; profession: string; role: string }>;
  billingStaff: Array<{ id: string; name: string; role: string }>;
  services: Array<{ id: string; name: string; category: string; price: number }>;
  paymentMethods: string[];
  sessionTypes: {
    physiotherapy: string[];
    sportsScience: string[];
  };
}

export default function ReportsHubView({ initialModule = "Billing", initialReport = "service-wise", role = "admin" }: ReportsHubViewProps) {
  const { roles, profile } = useAuth();

  const hasAnalyticsAccess = useMemo(() => {
    return Boolean(
      roles?.some((r) => ["admin", "super_admin", "manager"].includes(r)) ||
      profile?.has_analytics_access === true ||
      (Array.isArray(profile?.allowed_consoles) && profile.allowed_consoles.includes("analytics")) ||
      (typeof profile?.allowed_consoles === "string" && profile.allowed_consoles.includes("analytics"))
    );
  }, [roles, profile]);

  // Selected Module & Report Dropdowns
  const [selectedModule, setSelectedModule] = useState<string>(initialModule);
  const [selectedReport, setSelectedReport] = useState<string>(initialReport);

  // Timeframe Presets State
  const [datePreset, setDatePreset] = useState<
    "today" | "yesterday" | "this-week" | "this-month" | "last-month" | "this-quarter" | "this-fy" | "custom"
  >("this-month");

  const [startDate, setStartDate] = useState<string>(
    format(startOfMonth(new Date()), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState<string>(
    format(endOfMonth(new Date()), "yyyy-MM-dd")
  );

  // Dynamic Filters
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [selectedSessionType, setSelectedSessionType] = useState<string>("all");
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedMode, setSelectedMode] = useState<string>("all"); // Individual vs Group

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Indian Financial Year calculation
  const getFYRange = (offsetYears = 0) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const startYear = (currentMonth < 3 ? currentYear - 1 : currentYear) + offsetYears;
    const endYear = startYear + 1;
    return {
      start: `${startYear}-04-01`,
      end: `${endYear}-03-31`,
      label: `FY ${startYear}-${String(endYear).slice(2)}`,
    };
  };

  // Sync date preset changes
  useEffect(() => {
    const today = new Date();
    switch (datePreset) {
      case "today": {
        const d = format(today, "yyyy-MM-dd");
        setStartDate(d);
        setEndDate(d);
        break;
      }
      case "yesterday": {
        const y = format(subDays(today, 1), "yyyy-MM-dd");
        setStartDate(y);
        setEndDate(y);
        break;
      }
      case "this-week": {
        setStartDate(format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"));
        setEndDate(format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd"));
        break;
      }
      case "this-month": {
        setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
        setEndDate(format(endOfMonth(today), "yyyy-MM-dd"));
        break;
      }
      case "last-month": {
        const lastM = subMonths(today, 1);
        setStartDate(format(startOfMonth(lastM), "yyyy-MM-dd"));
        setEndDate(format(endOfMonth(lastM), "yyyy-MM-dd"));
        break;
      }
      case "this-quarter": {
        setStartDate(format(startOfQuarter(today), "yyyy-MM-dd"));
        setEndDate(format(endOfQuarter(today), "yyyy-MM-dd"));
        break;
      }
      case "this-fy": {
        const fy = getFYRange(0);
        setStartDate(fy.start);
        setEndDate(fy.end);
        break;
      }
      case "custom":
      default:
        break;
    }
  }, [datePreset]);

  // Dropdown Popover open state for Timeframe
  const [timeframeOpen, setTimeframeOpen] = useState<boolean>(false);

  const timeframePresets = useMemo(() => [
    { id: "today", label: "Today" },
    { id: "yesterday", label: "Yesterday" },
    { id: "this-week", label: "This Week" },
    { id: "this-month", label: "This Month" },
    { id: "last-month", label: "Last Month" },
    { id: "this-quarter", label: "This Quarter" },
    { id: "this-fy", label: getFYRange(0).label },
    { id: "custom", label: "Custom Range" },
  ], []);

  const activeTimeframeLabel = useMemo(() => {
    let presetTitle = "This Month";
    const found = timeframePresets.find((p) => p.id === datePreset);
    if (found) presetTitle = found.label;

    try {
      const startFormatted = startDate ? format(new Date(startDate), "dd-MM-yyyy") : "";
      const endFormatted = endDate ? format(new Date(endDate), "dd-MM-yyyy") : "";
      if (datePreset === "today" || (startFormatted && startFormatted === endFormatted)) {
        return `${presetTitle} (${startFormatted})`;
      }
      return `${presetTitle} (${startFormatted} to ${endFormatted})`;
    } catch {
      return `${presetTitle} (${startDate} to ${endDate})`;
    }
  }, [datePreset, startDate, endDate, timeframePresets]);

  // When module changes, automatically choose a default report and update immediately
  const handleModuleChange = (newModule: string) => {
    setSelectedModule(newModule);
    setSelectedClient("all");
    setAvailableClients([]);
    setSelectedStaff("all");
    setAvailableStaff([]);
    setSelectedSessionType("all");
    setSelectedPaymentMode("all");
    setSelectedStatus("all");
    setCurrentPage(1);

    if (newModule === "Client") {
      setSelectedReport("client-sessions");
    } else if (newModule === "Group Sessions") {
      setSelectedReport("all-groups");
    } else if (newModule === "Billing") {
      setSelectedReport("service-wise");
    } else if (newModule === "Physiotherapy") {
      setSelectedReport("therapist-sessions");
    } else if (newModule === "Sports Science") {
      setSelectedReport("scientist-sessions");
    } else if (newModule === "Registration") {
      setSelectedReport("new-registrations");
    } else if (newModule === "Admin") {
      setSelectedReport("operations-summary");
    } else {
      setSelectedReport("client-sessions");
    }
  };

  // Fetch filter options (clients, therapists, sports scientists, billing staff, session types)
  const { data: options } = useQuery<FilterOptions>({
    queryKey: ["report-options"],
    queryFn: async () => {
      return apiFetch<FilterOptions>("/analytics/reports/options");
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch report data reactively
  const isClientModule = selectedModule === "Client";
  const isGroupModule = selectedModule === "Group Sessions";
  const isBillingModule = selectedModule === "Billing";
  const isPhysioModule = selectedModule === "Physiotherapy";
  const isSportsScienceModule = selectedModule === "Sports Science";

  const {
    data: reportData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<any>({
    queryKey: [
      "report-data",
      selectedModule,
      selectedReport,
      startDate,
      endDate,
      selectedClient,
      selectedStaff,
      selectedSessionType,
      selectedPaymentMode,
      selectedStatus,
      selectedMode,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });


      if (isBillingModule) {
        params.append("report_type", selectedReport);
        if (selectedStaff !== "all") params.append("staff_id", selectedStaff);
        if (selectedPaymentMode !== "all") params.append("payment_method", selectedPaymentMode);
        if (selectedStatus !== "all") params.append("status", selectedStatus);

        return apiFetch(`/analytics/reports/billing?${params.toString()}`);
      }

      if (isClientModule) {
        params.append("module", "client");
        params.append("report_type", selectedReport);
        if (selectedClient !== "all") params.append("client_id", selectedClient);
        if (selectedStaff !== "all") params.append("staff_id", selectedStaff);
        if (selectedSessionType !== "all") params.append("session_type", selectedSessionType);
        if (selectedStatus !== "all") params.append("status", selectedStatus);
        if (selectedMode !== "all") params.append("session_mode", selectedMode);

        return apiFetch(`/analytics/reports/sessions?${params.toString()}`);
      }

      if (isGroupModule) {
        params.append("module", "group");
        params.append("report_type", selectedReport);
        if (selectedReport && selectedReport !== "all-groups") {
          params.append("group_name", selectedReport);
        }
        if (selectedStaff !== "all") params.append("staff_id", selectedStaff);
        if (selectedSessionType !== "all") params.append("session_type", selectedSessionType);
        if (selectedStatus !== "all") params.append("status", selectedStatus);

        return apiFetch(`/analytics/reports/sessions?${params.toString()}`);
      }

      if (isPhysioModule || isSportsScienceModule) {
        params.append("module", isPhysioModule ? "physiotherapy" : "sports_science");
        params.append("report_type", selectedReport);
        if (selectedStaff !== "all") params.append("staff_id", selectedStaff);
        if (selectedSessionType !== "all") params.append("session_type", selectedSessionType);
        if (selectedStatus !== "all") params.append("status", selectedStatus);
        if (selectedMode !== "all") params.append("session_mode", selectedMode);

        return apiFetch(`/analytics/reports/sessions?${params.toString()}`);
      }

      // Fallback for Admin / Registration
      params.append("report_type", selectedReport);
      return apiFetch(`/analytics/reports/billing?${params.toString()}`);
    },
  });

  // Client-side pagination & searching on report data
  const dataList = useMemo(() => {
    if (!reportData?.data) return [];
    return reportData.data;
  }, [reportData]);

  const totalPages = Math.ceil(dataList.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return dataList.slice(start, start + pageSize);
  }, [dataList, currentPage, pageSize]);

  // Dynamically populated client options extracted directly from the records & breakdown displayed in the table below
  const [availableClients, setAvailableClients] = useState<
    Array<{ id: string; uhid: string; name: string; sport?: string; count?: number }>
  >([]);

  
  // Client Summary Table state (search, sort, and pagination)
  const [summaryPage, setSummaryPage] = useState<number>(1);
  const [summaryPageSize, setSummaryPageSize] = useState<number>(25);
  const [summarySearch, setSummarySearch] = useState<string>("");
  const [summarySortField, setSummarySortField] = useState<string>("totalSessions");
  const [summarySortAsc, setSummarySortAsc] = useState<boolean>(false);
  const [showFullIndividualLogs, setShowFullIndividualLogs] = useState<boolean>(false);

  // Export Options Modal state
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "csv">("excel");
  const [exportGrouping, setExportGrouping] = useState<"consolidated" | "individual" | "both">("consolidated");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Reset summary page when module, timeframe, or search term changes
  useEffect(() => {
    setSummaryPage(1);
  }, [selectedModule, startDate, endDate, summarySearch]);

  // Filtered and sorted client breakdown for the consolidated table
  const filteredClientSummary = useMemo(() => {
    if (!reportData?.clientBreakdown || !Array.isArray(reportData.clientBreakdown)) return [];
    let list = [...reportData.clientBreakdown];

    const search = (summarySearch || "").trim().toLowerCase();
    if (search) {
      list = list.filter((c: any) => {
        const name = (c.clientName || "").toLowerCase();
        const uhid = (c.clientUhid || "").toLowerCase();
        const sport = (c.clientSport || "").toLowerCase();
        const instructors = (c.instructorsList || "").toLowerCase();
        return name.includes(search) || uhid.includes(search) || sport.includes(search) || instructors.includes(search);
      });
    }

    list.sort((a: any, b: any) => {
      let valA = a[summarySortField];
      let valB = b[summarySortField];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (valA < valB) return summarySortAsc ? -1 : 1;
      if (valA > valB) return summarySortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [reportData?.clientBreakdown, summarySearch, summarySortField, summarySortAsc]);

  const summaryTotalPages = Math.ceil(filteredClientSummary.length / summaryPageSize) || 1;
  const paginatedClientSummary = useMemo(() => {
    const start = (summaryPage - 1) * summaryPageSize;
    return filteredClientSummary.slice(start, start + summaryPageSize);
  }, [filteredClientSummary, summaryPage, summaryPageSize]);

  // Dynamically populated group names extracted from backend options, groupBreakdown, and sessions
  const availableGroupNames = useMemo(() => {
    const set = new Set<string>();
    if (options?.groups && Array.isArray(options.groups)) {
      options.groups.forEach((g) => {
        if (g && typeof g === "string" && g.trim()) set.add(g.trim());
      });
    }
    if (reportData?.groupBreakdown && Array.isArray(reportData.groupBreakdown)) {
      reportData.groupBreakdown.forEach((g: any) => {
        if (g.groupName && typeof g.groupName === "string" && g.groupName.trim() && g.groupName !== "General Group") {
          set.add(g.groupName.trim());
        }
      });
    }
    if (reportData?.data && Array.isArray(reportData.data)) {
      reportData.data.forEach((r: any) => {
        if (r.group_name && typeof r.group_name === "string" && r.group_name.trim() && r.group_name !== "General Group") {
          set.add(r.group_name.trim());
        }
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [options?.groups, reportData]);

  // Filtered and sorted group breakdown for the consolidated table
  const filteredGroupSummary = useMemo(() => {
    if (!reportData?.groupBreakdown || !Array.isArray(reportData.groupBreakdown)) return [];
    let list = [...reportData.groupBreakdown];

    const search = (summarySearch || "").trim().toLowerCase();
    if (search) {
      list = list.filter((g: any) => {
        const name = (g.groupName || "").toLowerCase();
        const cat = (g.category || "").toLowerCase();
        const instructors = (g.instructorsList || "").toLowerCase();
        return name.includes(search) || cat.includes(search) || instructors.includes(search);
      });
    }

    list.sort((a: any, b: any) => {
      let valA = a[summarySortField];
      let valB = b[summarySortField];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (valA < valB) return summarySortAsc ? -1 : 1;
      if (valA > valB) return summarySortAsc ? 1 : -1;
      return 0;
    });

    return list;
  }, [reportData?.groupBreakdown, summarySearch, summarySortField, summarySortAsc]);

  const groupSummaryTotalPages = Math.ceil(filteredGroupSummary.length / summaryPageSize) || 1;
  const paginatedGroupSummary = useMemo(() => {
    const start = (summaryPage - 1) * summaryPageSize;
    return filteredGroupSummary.slice(start, start + summaryPageSize);
  }, [filteredGroupSummary, summaryPage, summaryPageSize]);

  const handleToggleSummarySort = (field: string) => {
    if (summarySortField === field) {
      setSummarySortAsc(!summarySortAsc);
    } else {
      setSummarySortField(field);
      setSummarySortAsc(false); // Default descending for counts/hours
    }
  };

  // Keep availableClients updated whenever reportData loads with all clients
  useEffect(() => {
    if (selectedClient === "all") {
      const clientMap = new Map<string, { id: string; uhid: string; name: string; sport?: string; count?: number }>();

      // 1. From clientBreakdown table (primary source for Client module)
      if (reportData?.clientBreakdown && Array.isArray(reportData.clientBreakdown)) {
        reportData.clientBreakdown.forEach((cb: any) => {
          const id = cb.clientId || cb.clientUhid || cb.clientName;
          if (id && cb.clientName && cb.clientName !== "Guest Patient") {
            clientMap.set(id, {
              id,
              uhid: cb.clientUhid && cb.clientUhid !== "-" ? cb.clientUhid : "",
              name: cb.clientName,
              sport: cb.clientSport,
              count: cb.totalSessions,
            });
          }
        });
      }

      // 2. From detailed records array (dataList)
      if (reportData?.data && Array.isArray(reportData.data)) {
        reportData.data.forEach((row: any) => {
          const id = row.client_id || row.clientId || row.client_uhid || row.client_name;
          if (id && row.client_name && row.client_name !== "Guest Patient") {
            if (!clientMap.has(id)) {
              clientMap.set(id, {
                id,
                uhid: row.client_uhid || row.clientUhid || "",
                name: row.client_name || row.clientName,
                sport: row.client_sport,
                count: 1,
              });
            }
          }
        });
      }

      // 3. Fallback to options.clients if reportData has not returned records yet
      if (clientMap.size === 0 && options?.clients && Array.isArray(options.clients)) {
        options.clients.forEach((c) => {
          if (c.id && c.name) {
            clientMap.set(c.id, {
              id: c.id,
              uhid: c.uhid || "",
              name: c.name,
              sport: c.sport,
            });
          }
        });
      }

      if (clientMap.size > 0) {
        setAvailableClients(
          Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name))
        );
      } else if (!isLoading && (!reportData?.data || reportData.data.length === 0)) {
        setAvailableClients([]);
      }
    }
  }, [reportData, selectedClient, options?.clients, isLoading]);

  // Dynamically populated staff/specialist options extracted directly from the records & breakdown displayed in the table below
  const [availableStaff, setAvailableStaff] = useState<
    Array<{ id: string; name: string; profession: string; role?: string; count?: number }>
  >([]);

  // Keep availableStaff updated whenever reportData loads with all staff
  useEffect(() => {
    if (selectedStaff === "all") {
      const staffMap = new Map<string, { id: string; name: string; profession: string; role?: string; count?: number }>();

      // 1. From staffBreakdown table (primary source for Physio & Sports Science modules)
      if (reportData?.staffBreakdown && Array.isArray(reportData.staffBreakdown)) {
        reportData.staffBreakdown.forEach((sb: any) => {
          const id = sb.staffId || sb.staffName;
          if (id && sb.staffName && sb.staffName !== "Unassigned Staff") {
            staffMap.set(id, {
              id,
              name: sb.staffName,
              profession: sb.profession || (isPhysioModule ? "Therapist" : "Sports Scientist"),
              count: sb.totalSessions,
            });
          }
        });
      }

      // 2. From detailed records array (dataList)
      if (reportData?.data && Array.isArray(reportData.data)) {
        reportData.data.forEach((row: any) => {
          const id = row.staff_id || row.instructor_name || row.staff_name;
          const name = row.staff_name || row.instructor_name;
          if (id && name && name !== "Unassigned Staff") {
            if (!staffMap.has(id)) {
              staffMap.set(id, {
                id,
                name,
                profession: row.staff_profession || row.instructor_role || (isPhysioModule ? "Therapist" : "Sports Scientist"),
                count: 1,
              });
            }
          }
        });
      }

      // 3. Fallback to options if reportData had no staff yet
      if (staffMap.size === 0) {
        const fallbackList = isPhysioModule
          ? options?.therapists
          : isSportsScienceModule
          ? options?.sportsScientists
          : isBillingModule
          ? options?.billingStaff
          : [
              ...(options?.therapists || []),
              ...(options?.sportsScientists || []),
            ];

        if (fallbackList && Array.isArray(fallbackList)) {
          fallbackList.forEach((s) => {
            if (s.id && s.name) {
              staffMap.set(s.id, {
                id: s.id,
                name: s.name,
                profession: (s as any).profession || "Specialist",
              });
            }
          });
        }
      }

      if (staffMap.size > 0) {
        setAvailableStaff(
          Array.from(staffMap.values()).sort((a, b) => a.name.localeCompare(b.name))
        );
      } else if (!isLoading && (!reportData?.data || reportData.data.length === 0)) {
        setAvailableStaff([]);
      }
    }
  }, [reportData, selectedStaff, isPhysioModule, isSportsScienceModule, isBillingModule, options, isLoading]);

  // Memoized options for SearchableSelect dropdowns
  const reportOptions = useMemo<SearchableSelectOption[]>(() => {
    if (selectedModule === "Group Sessions") {
      return [
        { value: "all-groups", label: "All Group Sessions (Summary & Details)", group: "Overview" },
        ...availableGroupNames.map((grpName) => ({
          value: grpName,
          label: grpName,
          group: "Individual Groups (" + availableGroupNames.length + ")",
        })),
      ];
    }
    if (selectedModule === "Client") {
      return [
        { value: "client-sessions", label: "Client Sessions Log & Details", group: "Most used reports" },
        { value: "client-attendance", label: "Client Completed Sessions Log", group: "Most used reports" },
        { value: "client-cancelled", label: "Client Cancelled & Missed Sessions", group: "Most used reports" },
        { value: "client-summary", label: "Client Hours & Volume Summary", group: "Selected module reports" },
        { value: "client-modality", label: "Modality & Service wise Breakdown", group: "Selected module reports" },
      ];
    }
    if (selectedModule === "Billing") {
      return [
        { value: "service-wise", label: "Service wise Invoice Details", group: "Most used reports" },
        { value: "cancelled-invoices", label: "Cancelled Invoice Details", group: "Most used reports" },
        { value: "payment-mode-wise", label: "Payment Mode wise Invoice Details", group: "Most used reports" },
        { value: "user-wise", label: "User wise Invoices List", group: "Selected module reports" },
        { value: "advance-collection", label: "Advance Collection Report", group: "Selected module reports" },
      ];
    }
    if (selectedModule === "Physiotherapy") {
      return [
        { value: "therapist-sessions", label: "Therapist Sessions Summary & Details", group: "Most used reports" },
        { value: "service-modality-sessions", label: "Service & Modality wise Physio Sessions", group: "Most used reports" },
        { value: "cancelled-physio-sessions", label: "Cancelled / Missed Physio Sessions", group: "Most used reports" },
        { value: "therapist-utilization", label: "Therapist Treatment Hours & Utilization", group: "Selected module reports" },
        { value: "patient-history", label: "Patient Follow-up Frequency Report", group: "Selected module reports" },
      ];
    }
    if (selectedModule === "Sports Science") {
      return [
        { value: "scientist-sessions", label: "Sports Scientist Sessions Summary & Details", group: "Most used reports" },
        { value: "discipline-sessions", label: "Training & Testing Discipline Breakdown", group: "Most used reports" },
        { value: "cancelled-sports-sessions", label: "Cancelled & Rescheduled Sports Science Sessions", group: "Most used reports" },
        { value: "athlete-volume", label: "Athlete Training Hours & Volume", group: "Selected module reports" },
        { value: "mode-breakdown", label: "Group vs Individual Sessions Breakdown", group: "Selected module reports" },
      ];
    }
    if (selectedModule === "Registration") {
      return [
        { value: "new-registrations", label: "New Patient Registrations Summary", group: "Registration reports" },
        { value: "demographics-summary", label: "Demographics & Sports Distribution", group: "Registration reports" },
      ];
    }
    if (selectedModule === "Admin") {
      return [
        { value: "operations-summary", label: "Operations Executive Overview", group: "Administrative reports" },
        { value: "revenue-by-center", label: "Multi-Center Revenue Distribution", group: "Administrative reports" },
      ];
    }
    return [
      { value: "client-sessions", label: "Client Sessions Log & Details", group: "Reports" },
    ];
  }, [selectedModule, availableGroupNames]);

  const clientSelectOptions = useMemo<SearchableSelectOption[]>(() => {
    return [
      {
        value: "all",
        label: "All Clients " + (availableClients.length > 0 ? "(" + availableClients.length + ")" : ""),
      },
      ...availableClients.map((c) => ({
        value: c.id,
        label: c.name,
        sublabel: c.uhid ? "(" + c.uhid + ")" : undefined,
      })),
    ];
  }, [availableClients]);

  const staffSelectOptions = useMemo<SearchableSelectOption[]>(() => {
    const defaultLabel = isPhysioModule
      ? "Therapists"
      : isSportsScienceModule
      ? "Sports Scientists"
      : "Instructors";
    return [
      {
        value: "all",
        label: "All " + defaultLabel + " " + (availableStaff.length > 0 ? "(" + availableStaff.length + ")" : ""),
      },
      ...availableStaff.map((s) => ({
        value: s.id,
        label: s.name,
        sublabel: s.profession ? "(" + s.profession + ")" : undefined,
      })),
    ];
  }, [availableStaff, isPhysioModule, isSportsScienceModule]);

  const billingStaffOptions = useMemo<SearchableSelectOption[]>(() => {
    return [
      { value: "all", label: "All Billing Users" },
      ...(options?.billingStaff || []).map((st) => ({
        value: st.id,
        label: st.name,
      })),
    ];
  }, [options?.billingStaff]);


  // Export Open Handler: opens modal if report has grouping choices, or exports directly
  const handleOpenExport = (
    formatType: "excel" | "csv",
    defaultGrouping: "consolidated" | "individual" | "both" = "consolidated"
  ) => {
    if (!hasAnalyticsAccess) {
      toast.error(`Access Denied: ${formatType.toUpperCase()} exports require Analytics & Reports Engine access.`);
      return;
    }

    if (!dataList || dataList.length === 0) {
      toast.error("No data available to export in the selected timeframe.");
      return;
    }

    // Check if current report offers consolidated grouping options
    const hasConsolidatedOption =
      isClientModule ||
      isGroupModule ||
      isPhysioModule ||
      isSportsScienceModule ||
      (isBillingModule && (selectedReport === "user-wise" || selectedReport === "payment-mode-wise"));

    if (hasConsolidatedOption) {
      setExportFormat(formatType);
      setExportGrouping(defaultGrouping);
      setExportModalOpen(true);
    } else {
      executeExport(formatType, "individual");
    }
  };

  // Perform the actual export based on chosen format and grouping
  const executeExport = async (
    formatType: "excel" | "csv",
    groupingType: "consolidated" | "individual" | "both"
  ) => {
    try {
      setIsExporting(true);
      const timestamp = format(new Date(), "yyyy-MM-dd");
      const metaInfo = [
        { label: "Report Module", value: selectedModule },
        { label: "Report Name", value: reportData?.title || reportData?.reportTitle || selectedReport },
        {
          label: "Grouping Mode",
          value:
            groupingType === "consolidated"
              ? "Consolidated Summary"
              : groupingType === "individual"
              ? "Detailed Individual Records"
              : "Consolidated Summary + Detailed Records",
        },
        { label: "Timeframe", value: `${startDate} to ${endDate}` },
        { label: "Generated On", value: format(new Date(), "dd MMM yyyy, hh:mm a") },
      ];

      if (selectedClient !== "all") {
        const clientObj = availableClients.find((c) => c.id === selectedClient) || options?.clients?.find((c) => c.id === selectedClient);
        if (clientObj) {
          metaInfo.push({ label: "Client Filter", value: `${clientObj.name} (${clientObj.uhid || "UHID"})` });
        }
      }

      if (selectedStaff !== "all") {
        const staffMember = [
          ...availableStaff,
          ...(options?.therapists || []),
          ...(options?.sportsScientists || []),
          ...(options?.billingStaff || []),
        ].find((s) => s.id === selectedStaff);
        if (staffMember) metaInfo.push({ label: "Instructor / Staff", value: staffMember.name });
      }

      if (selectedStatus !== "all") {
        metaInfo.push({ label: "Status Filter", value: selectedStatus });
      }

      if (selectedSessionType !== "all") {
        metaInfo.push({ label: "Session Type", value: selectedSessionType });
      }

      // -------------------------------------------------------------
      // 1. CLIENT MODULE EXPORT (Consolidated vs Individual vs Both)
      // -------------------------------------------------------------
      if (isClientModule) {
        const summaryColumns: ExcelColumn<any>[] = [
          { header: "Client UHID", key: "clientUhid", width: 16 },
          { header: "Client Name", key: "clientName", width: 24, formatter: (v) => v || "Guest / Walk-in Patient" },
          { header: "Sport / Category", key: "clientSport", width: 18, formatter: (v) => v || "General" },
          { header: "Total Sessions", key: "totalSessions", width: 14 },
          { header: "Completed Sessions", key: "completedSessions", width: 16 },
          { header: "Cancelled Sessions", key: "cancelledSessions", width: 16 },
          {
            header: "Total Duration (Hours)",
            key: "totalDurationHours",
            width: 18,
            formatter: (v) => `${v} hrs`,
          },
          { header: "Total Duration (Minutes)", key: "totalDurationMinutes", width: 18 },
          { header: "Primary Instructors", key: "instructorsList", width: 32 },
        ];

        const detailedColumns: ExcelColumn<any>[] = [
          { header: "Client UHID", key: "client_uhid", width: 14 },
          { header: "Client Name", key: "client_name", width: 22, formatter: (v) => v || "Guest / Walk-in Patient" },
          {
            header: "Session Date",
            key: "scheduled_start",
            width: 14,
            formatter: (v, row) => (v ? format(new Date(v), "dd/MM/yyyy") : row.session_date || "-"),
          },
          {
            header: "Session Time",
            key: "scheduled_start",
            width: 12,
            formatter: (v, row) => (v ? format(new Date(v), "hh:mm a") : row.session_time || "-"),
          },
          { header: "Duration", key: "duration_formatted", width: 14 },
          { header: "Duration (Mins)", key: "duration_minutes", width: 14 },
          { header: "Instructor", key: "instructor_name", width: 22 },
          { header: "Instructor Role", key: "instructor_role", width: 18 },
          { header: "Session Type / Modality", key: "service_type", width: 28 },
          { header: "Mode", key: "session_mode", width: 14 },
          { header: "Status", key: "status", width: 14 },
          { header: "Cancellation Reason", key: "cancellation_reason", width: 24 },
          { header: "Session Notes", key: "session_notes", width: 30 },
        ];

        const summaryData = reportData?.clientBreakdown || [];

        if (formatType === "excel") {
          if (groupingType === "consolidated") {
            await exportToExcel({
              filename: `CSSH_Client_Sessions_Summary_${timestamp}`,
              sheetName: "Client Sessions Summary",
              title: "Client Sessions & Hours Consolidated Summary Report",
              metadata: [...metaInfo, { label: "Total Unique Clients", value: summaryData.length }],
              columns: summaryColumns,
              data: summaryData,
            });
          } else if (groupingType === "individual") {
            await exportToExcel({
              filename: `CSSH_Client_Sessions_Detailed_${timestamp}`,
              sheetName: "Individual Sessions",
              title: "Client Individual Sessions Log & Details Report",
              metadata: [...metaInfo, { label: "Total Sessions", value: dataList.length }],
              columns: detailedColumns,
              data: dataList,
            });
          } else {
            // Both sheets in one Excel workbook
            await exportToExcelMultiSheet({
              filename: `CSSH_Client_Sessions_Consolidated_${timestamp}`,
              sheets: [
                {
                  sheetName: "Client Summary",
                  title: "Client Sessions & Hours Consolidated Summary",
                  metadata: [...metaInfo, { label: "Total Unique Clients", value: summaryData.length }],
                  columns: summaryColumns,
                  data: summaryData,
                },
                {
                  sheetName: "Individual Sessions Log",
                  title: "Client Individual Sessions Log & Details",
                  metadata: [...metaInfo, { label: "Total Sessions", value: dataList.length }],
                  columns: detailedColumns,
                  data: dataList,
                },
              ],
            });
          }
        } else {
          // CSV format
          if (groupingType === "consolidated") {
            const summaryCsvColumns: ExcelColumn<any>[] = [
              { header: "Client UHID", key: "clientUhid" },
              { header: "Client Name", key: "clientName", formatter: (v) => v || "Guest / Walk-in Patient" },
              { header: "Sport / Category", key: "clientSport", formatter: (v) => v || "General" },
              { header: "Total Sessions", key: "totalSessions" },
              { header: "Completed Sessions", key: "completedSessions" },
              { header: "Cancelled Sessions", key: "cancelledSessions" },
              { header: "Total Hours", key: "totalDurationHours", formatter: (v) => `${v} hrs` },
              { header: "Primary Instructors", key: "instructorsList" },
            ];
            exportToCSV<any>({
              filename: `CSSH_Client_Sessions_Summary_${timestamp}.csv`,
              columns: summaryCsvColumns,
              data: summaryData,
            });
          } else {
            const detailedCsvColumns: ExcelColumn<any>[] = [
              { header: "Client UHID", key: "client_uhid" },
              { header: "Client Name", key: "client_name", formatter: (v) => v || "Guest / Walk-in Patient" },
              { header: "Session Date", key: "scheduled_start", formatter: (v, row: any) => (v ? format(new Date(v), "dd/MM/yyyy") : row?.session_date || "-") },
              { header: "Session Time", key: "scheduled_start", formatter: (v, row: any) => (v ? format(new Date(v), "hh:mm a") : row?.session_time || "-") },
              { header: "Duration", key: "duration_formatted" },
              { header: "Instructor", key: "instructor_name" },
              { header: "Status", key: "status" },
              { header: "Session Type", key: "service_type" },
              { header: "Session Notes", key: "session_notes" },
            ];
            exportToCSV<any>({
              filename: `CSSH_Client_Sessions_Detailed_${timestamp}.csv`,
              columns: detailedCsvColumns,
              data: dataList,
            });
          }
        }
      }

      // -------------------------------------------------------------------------
      // 1b. GROUP SESSIONS MODULE EXPORT (Consolidated vs Individual vs Both)
      // -------------------------------------------------------------------------
      else if (isGroupModule) {
        const summaryColumns: ExcelColumn<any>[] = [
          { header: "Group Name", key: "groupName", width: 28 },
          { header: "Category / Modality", key: "category", width: 22 },
          { header: "Total Sessions", key: "totalSessions", width: 14 },
          { header: "Completed Sessions", key: "completedSessions", width: 16 },
          { header: "Cancelled Sessions", key: "cancelledSessions", width: 16 },
          {
            header: "Total Duration",
            key: "totalDurationHours",
            width: 16,
            formatter: (v) => `${v} hrs`,
          },
          { header: "Total Duration (Minutes)", key: "totalDurationMinutes", width: 18 },
          { header: "Primary Instructors", key: "instructorsList", width: 32 },
        ];

        const detailedColumns: ExcelColumn<any>[] = [
          { header: "Group Name", key: "group_name", width: 26 },
          {
            header: "Session Date",
            key: "scheduled_start",
            width: 14,
            formatter: (v, row: any) => (v ? format(new Date(v), "dd/MM/yyyy") : row?.session_date || "-"),
          },
          {
            header: "Session Time",
            key: "scheduled_start",
            width: 12,
            formatter: (v, row: any) => (v ? format(new Date(v), "hh:mm a") : row?.session_time || "-"),
          },
          { header: "Duration", key: "duration_formatted", width: 14 },
          { header: "Duration (Mins)", key: "duration_minutes", width: 14 },
          { header: "Instructor", key: "instructor_name", width: 22 },
          { header: "Instructor Role", key: "instructor_role", width: 18 },
          { header: "Session Type / Modality", key: "service_type", width: 28 },
          { header: "Location", key: "session_location", width: 18 },
          { header: "Status", key: "status", width: 14 },
          { header: "Cancellation Reason", key: "cancellation_reason", width: 24 },
          { header: "Session Notes", key: "session_notes", width: 30 },
        ];

        const summaryData = reportData?.groupBreakdown || [];

        if (formatType === "excel") {
          if (groupingType === "consolidated") {
            await exportToExcel({
              filename: `CSSH_Group_Sessions_Summary_${timestamp}`,
              sheetName: "Group Sessions Summary",
              title: "Group Sessions & Hours Consolidated Summary Report",
              metadata: [...metaInfo, { label: "Total Groups", value: summaryData.length }],
              columns: summaryColumns,
              data: summaryData,
            });
          } else if (groupingType === "individual") {
            await exportToExcel({
              filename: `CSSH_Group_Sessions_Detailed_${timestamp}`,
              sheetName: "Group Sessions Log",
              title: "Group Individual Sessions Log & Details Report",
              metadata: [...metaInfo, { label: "Total Sessions", value: dataList.length }],
              columns: detailedColumns,
              data: dataList,
            });
          } else {
            // Both sheets in one Excel workbook
            await exportToExcelMultiSheet({
              filename: `CSSH_Group_Sessions_Consolidated_${timestamp}`,
              sheets: [
                {
                  sheetName: "Group Summary",
                  title: "Group Sessions & Hours Consolidated Summary",
                  metadata: [...metaInfo, { label: "Total Groups", value: summaryData.length }],
                  columns: summaryColumns,
                  data: summaryData,
                },
                {
                  sheetName: "Group Sessions Log",
                  title: "Group Individual Sessions Log & Details",
                  metadata: [...metaInfo, { label: "Total Sessions", value: dataList.length }],
                  columns: detailedColumns,
                  data: dataList,
                },
              ],
            });
          }
        } else {
          // CSV format
          if (groupingType === "consolidated") {
            const summaryCsvColumns: ExcelColumn<any>[] = [
              { header: "Group Name", key: "groupName" },
              { header: "Category / Modality", key: "category" },
              { header: "Total Sessions", key: "totalSessions" },
              { header: "Completed Sessions", key: "completedSessions" },
              { header: "Cancelled Sessions", key: "cancelledSessions" },
              { header: "Total Hours", key: "totalDurationHours", formatter: (v) => `${v} hrs` },
              { header: "Primary Instructors", key: "instructorsList" },
            ];
            exportToCSV<any>({
              filename: `CSSH_Group_Sessions_Summary_${timestamp}.csv`,
              columns: summaryCsvColumns,
              data: summaryData,
            });
          } else {
            const detailedCsvColumns: ExcelColumn<any>[] = [
              { header: "Group Name", key: "group_name" },
              { header: "Session Date", key: "scheduled_start", formatter: (v, row: any) => (v ? format(new Date(v), "dd/MM/yyyy") : row?.session_date || "-") },
              { header: "Session Time", key: "scheduled_start", formatter: (v, row: any) => (v ? format(new Date(v), "hh:mm a") : row?.session_time || "-") },
              { header: "Duration", key: "duration_formatted" },
              { header: "Instructor", key: "instructor_name" },
              { header: "Session Type", key: "service_type" },
              { header: "Location", key: "session_location" },
              { header: "Status", key: "status" },
              { header: "Session Notes", key: "session_notes" },
            ];
            exportToCSV<any>({
              filename: `CSSH_Group_Sessions_Detailed_${timestamp}.csv`,
              columns: detailedCsvColumns,
              data: dataList,
            });
          }
        }
      }

      // -------------------------------------------------------------------------
      // 2. PHYSIOTHERAPY & SPORTS SCIENCE MODULE EXPORT
      // -------------------------------------------------------------------------
      else if (isPhysioModule || isSportsScienceModule) {
        const prefix = isPhysioModule ? "Physiotherapy" : "Sports_Science";
        const practitionerCol = isPhysioModule ? "Therapist" : "Sports Scientist";

        const staffColumns: ExcelColumn<any>[] = [
          { header: practitionerCol, key: "staffName", width: 22 },
          { header: "Designation", key: "profession", width: 20 },
          { header: "Total Sessions", key: "totalSessions", width: 14 },
          { header: "Completed Sessions", key: "completedSessions", width: 16 },
          { header: "Cancelled Sessions", key: "cancelledSessions", width: 16 },
          {
            header: "Total Duration (Hours)",
            key: "totalDurationHours",
            width: 18,
            formatter: (v) => `${v} hrs`,
          },
          { header: "Unique Clients", key: "uniqueClientsCount", width: 16 },
        ];

        const detailedColumns: ExcelColumn<any>[] = [
          {
            header: "Session Date",
            key: "scheduled_start",
            width: 14,
            formatter: (v) => (v ? format(new Date(v), "dd/MM/yyyy") : "-"),
          },
          {
            header: "Session Time",
            key: "scheduled_start",
            width: 12,
            formatter: (v) => (v ? format(new Date(v), "hh:mm a") : "-"),
          },
          { header: practitionerCol, key: "staff_name", width: 22 },
          { header: "Client UHID", key: "client_uhid", width: 14 },
          { header: "Client Name", key: "client_name", width: 22 },
          { header: "Sport / Category", key: "client_sport", width: 16 },
          { header: "Session Type / Modality", key: "service_type", width: 28 },
          { header: "Mode", key: "session_mode", width: 14 },
          { header: "Duration", key: "duration_formatted", width: 14 },
          { header: "Duration (Mins)", key: "duration_minutes", width: 14 },
          { header: "Status", key: "status", width: 14 },
          { header: "Cancellation Reason", key: "cancellation_reason", width: 24 },
          { header: "Session Notes", key: "session_notes", width: 30 },
        ];

        const staffData = reportData?.staffBreakdown || [];

        if (formatType === "excel") {
          if (groupingType === "consolidated") {
            await exportToExcel({
              filename: `CSSH_${prefix}_Practitioner_Summary_${timestamp}`,
              sheetName: `${prefix} Summary`,
              title: `${prefix.replace(/_/g, " ")} Practitioner Performance Summary`,
              metadata: [...metaInfo, { label: "Active Practitioners", value: staffData.length }],
              columns: staffColumns,
              data: staffData,
            });
          } else if (groupingType === "individual") {
            await exportToExcel({
              filename: `CSSH_${prefix}_Sessions_Detailed_${timestamp}`,
              sheetName: `${prefix} Sessions`,
              title: isPhysioModule ? "Physiotherapy Sessions Report" : "Sports Science Sessions Report",
              metadata: [...metaInfo, { label: "Total Sessions", value: dataList.length }],
              columns: detailedColumns,
              data: dataList,
            });
          } else {
            await exportToExcelMultiSheet({
              filename: `CSSH_${prefix}_Sessions_Consolidated_${timestamp}`,
              sheets: [
                {
                  sheetName: "Practitioner Summary",
                  title: `${prefix.replace(/_/g, " ")} Practitioner Summary`,
                  metadata: [...metaInfo, { label: "Active Practitioners", value: staffData.length }],
                  columns: staffColumns,
                  data: staffData,
                },
                {
                  sheetName: "Session Records",
                  title: `${prefix.replace(/_/g, " ")} Detailed Sessions Log`,
                  metadata: [...metaInfo, { label: "Total Sessions", value: dataList.length }],
                  columns: detailedColumns,
                  data: dataList,
                },
              ],
            });
          }
        } else {
          // CSV format
          if (groupingType === "consolidated") {
            const staffCsvColumns: ExcelColumn<any>[] = [
              { header: practitionerCol, key: "staffName" },
              { header: "Designation", key: "profession" },
              { header: "Total Sessions", key: "totalSessions" },
              { header: "Completed", key: "completedSessions" },
              { header: "Cancelled", key: "cancelledSessions" },
              { header: "Total Hours", key: "totalDurationHours", formatter: (v) => `${v} hrs` },
              { header: "Unique Clients", key: "uniqueClientsCount" },
            ];
            exportToCSV<any>({
              filename: `CSSH_${prefix}_Practitioner_Summary_${timestamp}.csv`,
              columns: staffCsvColumns,
              data: staffData,
            });
          } else {
            const detailedCsvColumns: ExcelColumn<any>[] = [
              { header: "Date", key: "scheduled_start", formatter: (v) => (v ? format(new Date(v), "dd/MM/yyyy") : "-") },
              { header: practitionerCol, key: "staff_name" },
              { header: "UHID", key: "client_uhid" },
              { header: "Client Name", key: "client_name" },
              { header: "Session Type", key: "service_type" },
              { header: "Duration", key: "duration_formatted" },
              { header: "Status", key: "status" },
              { header: "Notes", key: "session_notes" },
            ];
            exportToCSV<any>({
              filename: `CSSH_${prefix}_Sessions_Detailed_${timestamp}.csv`,
              columns: detailedCsvColumns,
              data: dataList,
            });
          }
        }
      }

      // -------------------------------------------------------------
      // 3. BILLING MODULE EXPORT
      // -------------------------------------------------------------
      else if (isBillingModule) {
        if (selectedReport === "cancelled-invoices") {
          const columns: ExcelColumn<any>[] = [
            { header: "Invoice #", key: "invoice_no", width: 16 },
            { header: "Invoice Date", key: "invoice_date", width: 14 },
            { header: "Client UHID", key: "client_uhid", width: 14 },
            { header: "Client Name", key: "client_name", width: 22 },
            { header: "Contact No", key: "client_mobile", width: 16 },
            { header: "Gross Amount (₹)", key: "gross_amount", width: 16, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Cancelled Amount (₹)", key: "total_amount", width: 18, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Cancellation Reason", key: "cancellation_reason", width: 30 },
            { header: "Billed By", key: "billed_by_name", width: 18 },
          ];

          if (formatType === "excel") {
            await exportToExcel({
              filename: `CSSH_Cancelled_Invoices_${timestamp}`,
              sheetName: "Cancelled Invoices",
              title: "Cancelled Invoices List Report",
              metadata: metaInfo,
              columns,
              data: dataList,
            });
          } else {
            exportToCSV({
              filename: `CSSH_Cancelled_Invoices_${timestamp}.csv`,
              columns,
              data: dataList,
            });
          }
        } else if (selectedReport === "user-wise") {
          const summaryColumns: ExcelColumn<any>[] = [
            { header: "Staff / Cashier Name", key: "userName", width: 22 },
            { header: "Invoices Issued", key: "totalInvoices", width: 16 },
            { header: "Paid Invoices", key: "paidInvoices", width: 16 },
            { header: "Cancelled Invoices", key: "cancelledInvoices", width: 16 },
            { header: "Total Invoiced (₹)", key: "totalBilled", width: 18, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Total Collected (₹)", key: "totalCollected", width: 18, formatter: (v) => Number(v || 0).toFixed(2) },
          ];

          const detailedColumns: ExcelColumn<any>[] = [
            { header: "Invoice #", key: "invoice_no", width: 16 },
            { header: "Invoice Date", key: "invoice_date", width: 14 },
            { header: "Client UHID", key: "client_uhid", width: 14 },
            { header: "Client Name", key: "client_name", width: 22 },
            { header: "Gross Amount (₹)", key: "gross_amount", width: 16, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Discount (₹)", key: "discount_amount", width: 14, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Total Amount (₹)", key: "total_amount", width: 16, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Payment Mode", key: "payment_mode", width: 16 },
            { header: "Status", key: "invoice_status", width: 14 },
            { header: "Billed By Staff", key: "billed_by_name", width: 20 },
          ];

          const userData = reportData?.userBreakdown || [];

          if (formatType === "excel") {
            if (groupingType === "consolidated") {
              await exportToExcel({
                filename: `CSSH_User_Collections_Summary_${timestamp}`,
                sheetName: "Staff Summary",
                title: "Billing Staff Collections Summary",
                metadata: metaInfo,
                columns: summaryColumns,
                data: userData,
              });
            } else if (groupingType === "individual") {
              await exportToExcel({
                filename: `CSSH_User_Wise_Invoices_${timestamp}`,
                sheetName: "Invoices List",
                title: "User-Wise Invoices List & Collections",
                metadata: metaInfo,
                columns: detailedColumns,
                data: dataList,
              });
            } else {
              await exportToExcelMultiSheet({
                filename: `CSSH_User_Wise_Invoices_Consolidated_${timestamp}`,
                sheets: [
                  {
                    sheetName: "Staff Summary",
                    title: "Billing Staff Collections Summary",
                    metadata: metaInfo,
                    columns: summaryColumns,
                    data: userData,
                  },
                  {
                    sheetName: "Invoices List",
                    title: "User-Wise Invoices List & Collections",
                    metadata: metaInfo,
                    columns: detailedColumns,
                    data: dataList,
                  },
                ],
              });
            }
          } else {
            if (groupingType === "consolidated") {
              exportToCSV({
                filename: `CSSH_User_Collections_Summary_${timestamp}.csv`,
                columns: summaryColumns,
                data: userData,
              });
            } else {
              exportToCSV({
                filename: `CSSH_User_Wise_Invoices_${timestamp}.csv`,
                columns: detailedColumns,
                data: dataList,
              });
            }
          }
        } else if (selectedReport === "payment-mode-wise") {
          const summaryColumns: ExcelColumn<any>[] = [
            { header: "Payment Mode", key: "mode", width: 20 },
            { header: "Total Transactions", key: "transactionCount", width: 18 },
            { header: "Total Collected (₹)", key: "totalCollected", width: 20, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Percentage (%)", key: "percentage", width: 16, formatter: (v) => `${v}%` },
          ];

          const detailedColumns: ExcelColumn<any>[] = [
            { header: "Invoice #", key: "invoice_no", width: 16 },
            { header: "Invoice Date", key: "invoice_date", width: 14 },
            { header: "Client UHID", key: "client_uhid", width: 14 },
            { header: "Client Name", key: "client_name", width: 22 },
            { header: "Payment Mode", key: "payment_mode", width: 16 },
            { header: "Amount Paid (₹)", key: "total_amount", width: 16, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Status", key: "invoice_status", width: 14 },
            { header: "Cashier / Billed By", key: "billed_by_name", width: 20 },
          ];

          const modeData = reportData?.modeBreakdown || [];

          if (formatType === "excel") {
            if (groupingType === "consolidated") {
              await exportToExcel({
                filename: `CSSH_Payment_Modes_Summary_${timestamp}`,
                sheetName: "Payment Modes Summary",
                title: "Payment Mode Collections Summary Report",
                metadata: metaInfo,
                columns: summaryColumns,
                data: modeData,
              });
            } else if (groupingType === "individual") {
              await exportToExcel({
                filename: `CSSH_Payment_Mode_Invoices_${timestamp}`,
                sheetName: "Invoices List",
                title: "Payment-Mode Wise Invoices Report",
                metadata: metaInfo,
                columns: detailedColumns,
                data: dataList,
              });
            } else {
              await exportToExcelMultiSheet({
                filename: `CSSH_Payment_Mode_Consolidated_${timestamp}`,
                sheets: [
                  {
                    sheetName: "Mode Summary",
                    title: "Payment Mode Collections Summary",
                    metadata: metaInfo,
                    columns: summaryColumns,
                    data: modeData,
                  },
                  {
                    sheetName: "Invoices List",
                    title: "Payment-Mode Wise Invoices",
                    metadata: metaInfo,
                    columns: detailedColumns,
                    data: dataList,
                  },
                ],
              });
            }
          } else {
            if (groupingType === "consolidated") {
              exportToCSV({
                filename: `CSSH_Payment_Modes_Summary_${timestamp}.csv`,
                columns: summaryColumns,
                data: modeData,
              });
            } else {
              exportToCSV({
                filename: `CSSH_Payment_Mode_Invoices_${timestamp}.csv`,
                columns: detailedColumns,
                data: dataList,
              });
            }
          }
        } else {
          // Standard Billing report (Service-wise, Advance, etc.)
          const columns: ExcelColumn<any>[] = [
            { header: "Invoice #", key: "invoice_no", width: 16 },
            { header: "Invoice Date", key: "invoice_date", width: 14 },
            { header: "Client UHID", key: "client_uhid", width: 14 },
            { header: "Client Name", key: "client_name", width: 22 },
            { header: "Service / Package", key: "service_name", width: 26 },
            { header: "Category", key: "service_category", width: 18 },
            { header: "Payment Mode", key: "payment_mode", width: 16 },
            { header: "Total Amount (₹)", key: "total_amount", width: 16, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Status", key: "invoice_status", width: 14 },
            { header: "Billed By", key: "billed_by_name", width: 18 },
          ];

          if (formatType === "excel") {
            await exportToExcel({
              filename: `CSSH_Service_Wise_Billing_${timestamp}`,
              sheetName: "Billing Invoices",
              title: "Service-Wise Billing & Invoices Report",
              metadata: metaInfo,
              columns,
              data: dataList,
            });
          } else {
            exportToCSV({
              filename: `CSSH_Service_Wise_Billing_${timestamp}.csv`,
              columns,
              data: dataList,
            });
          }
        }
      }

      setExportModalOpen(false);
      toast.success(`${formatType.toUpperCase()} report exported successfully!`);
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error(`Failed to export ${formatType.toUpperCase()} report. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Main Container Card: Module Selector, Report Selector, Timeframe & Real-time Records */}
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-display font-extrabold text-foreground flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Reports history
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Generate and export detailed client sessions, service-wise invoices, therapist & sports scientist sessions, and revenue reports.
              </CardDescription>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {hasAnalyticsAccess ? (
                <>
                  <Button
                    onClick={() => handleOpenExport("excel")}
                    className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Excel (.xlsx)</span>
                  </Button>

                  <Button
                    onClick={() => handleOpenExport("csv")}
                    variant="outline"
                    className="h-8 rounded-xl font-semibold text-xs gap-1.5 border-slate-200 dark:border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>CSV</span>
                  </Button>
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Excel Export Restricted (Analytics Access Required)</span>
                </div>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetch()}
                className="h-8 w-8 rounded-xl"
                title="Refresh data"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isRefetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Top Form Controls: Module, Report, and Timeframe Dropdowns in One Clean Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            {/* Box 1: Module Selector (Ward removed, Client added) */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Module
              </label>
              <Select value={selectedModule} onValueChange={handleModuleChange}>
                <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-sm">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Client" className="text-xs font-semibold cursor-pointer">
                    Client
                  </SelectItem>
                  <SelectItem value="Group Sessions" className="text-xs font-semibold cursor-pointer">
                    Group Sessions
                  </SelectItem>
                  <SelectItem value="Billing" className="text-xs font-medium cursor-pointer">
                    Billing
                  </SelectItem>
                  <SelectItem value="Physiotherapy" className="text-xs font-medium cursor-pointer">
                    Physiotherapy
                  </SelectItem>
                  <SelectItem value="Sports Science" className="text-xs font-medium cursor-pointer">
                    Sports Science
                  </SelectItem>
                  <SelectItem value="Registration" className="text-xs font-medium cursor-pointer">
                    Registration
                  </SelectItem>
                  <SelectItem value="Admin" className="text-xs font-medium cursor-pointer">
                    Admin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Box 2: Report Dropdown (Grouped by "Most used reports" & "Selected module reports") */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Report
              </label>
              <SearchableSelect
                value={selectedReport}
                onValueChange={(val) => { setSelectedReport(val); setCurrentPage(1); }}
                placeholder="Select report"
                searchPlaceholder="Search report or group..."
                options={reportOptions}
                triggerClassName="w-full h-10 bg-white dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-sm"
              />
            </div>

            {/* Box 3: Timeframe Dropdown (Options + Date Selection all inside dropdown) */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Timeframe
              </label>
              <Popover open={timeframeOpen} onOpenChange={setTimeframeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full h-10 bg-white dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-sm justify-between px-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate text-slate-800 dark:text-slate-200">
                        {activeTimeframeLabel}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-70 ml-1.5" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent
                  align="end"
                  className="w-[340px] sm:w-[420px] p-4 rounded-2xl shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 z-50"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-foreground">
                        Timeframe &amp; Date Range
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 dark:bg-slate-800 text-primary">
                      {datePreset === "custom" ? "Custom Range" : timeframePresets.find((p) => p.id === datePreset)?.label}
                    </Badge>
                  </div>

                  {/* Preset Options Grid */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Timeframe Options
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {timeframePresets.map((preset) => {
                        const isSelected = datePreset === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              setDatePreset(preset.id as any);
                              setSelectedClient("all");
                              setSelectedStaff("all");
                              setCurrentPage(1);
                            }}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all border text-left ${
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                                : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-slate-700/60"
                            }`}
                          >
                            <span>{preset.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Date Selection (From Date & To Date) */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Date Selection
                      </label>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        (Start &amp; End Date)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">From Date</span>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            setDatePreset("custom");
                            setSelectedClient("all");
                            setSelectedStaff("all");
                            setCurrentPage(1);
                          }}
                          className="h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block">To Date</span>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value);
                            setDatePreset("custom");
                            setSelectedClient("all");
                            setSelectedStaff("all");
                            setCurrentPage(1);
                          }}
                          className="h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Popover Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="text-[11px] text-muted-foreground">
                      Selected: <span className="font-semibold text-foreground">{startDate}</span> to{" "}
                      <span className="font-semibold text-foreground">{endDate}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setTimeframeOpen(false)}
                      className="h-7 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 shadow-sm"
                    >
                      Done
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Secondary Contextual Filters Row (Client / Practitioner / Payment Mode / Status) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-slate-50/60 dark:bg-slate-800/30 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            {/* Filter 1: Client Selector (For Client module - searchable by name or UHID) */}
            {isClientModule && (
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Select Client
                </label>
                <SearchableSelect
                  value={selectedClient}
                  onValueChange={(val) => { setSelectedClient(val); setCurrentPage(1); }}
                  placeholder="All Clients"
                  searchPlaceholder="Search client by name or UHID..."
                  options={clientSelectOptions}
                />
              </div>
            )}

            {/* Filter 1b: Practitioner Selector (For Physio / Sports Science / Group modules - searchable by name) */}
            {(isPhysioModule || isSportsScienceModule || isGroupModule) && (
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  {isPhysioModule ? "Therapist" : isSportsScienceModule ? "Sports Scientist" : "Instructor / Specialist"}
                </label>
                <SearchableSelect
                  value={selectedStaff}
                  onValueChange={(val) => { setSelectedStaff(val); setCurrentPage(1); }}
                  placeholder={"All " + (isPhysioModule ? "Therapists" : isSportsScienceModule ? "Sports Scientists" : "Instructors")}
                  searchPlaceholder={"Search " + (isPhysioModule ? "therapist" : isSportsScienceModule ? "sports scientist" : "instructor") + "..."}
                  options={staffSelectOptions}
                />
              </div>
            )}

            {/* Filter 1c: Cashier Selector (For Billing module - searchable by staff name) */}
            {isBillingModule && (
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Billing User / Cashier
                </label>
                <SearchableSelect
                  value={selectedStaff}
                  onValueChange={(val) => { setSelectedStaff(val); setCurrentPage(1); }}
                  placeholder="All Staff"
                  searchPlaceholder="Search cashier / staff..."
                  options={billingStaffOptions}
                />
              </div>
            )}

            {/* Filter 2: Instructor (For Client module - searchable by instructor name) */}
            {isClientModule && (
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Instructor / Specialist
                </label>
                <SearchableSelect
                  value={selectedStaff}
                  onValueChange={(val) => { setSelectedStaff(val); setCurrentPage(1); }}
                  placeholder="All Instructors"
                  searchPlaceholder="Search instructor name..."
                  options={staffSelectOptions}
                />
              </div>
            )}

            {/* Filter 2b: Session Type (For Physio / Sports Science / Group modules) */}
            {(isPhysioModule || isSportsScienceModule || isGroupModule) && (
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Session Type
                </label>
                <Select value={selectedSessionType} onValueChange={(val) => { setSelectedSessionType(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg">
                    <SelectValue placeholder="All Session Types" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Session Types
                    </SelectItem>
                    {(isPhysioModule
                      ? options?.sessionTypes.physiotherapy
                      : options?.sessionTypes.sportsScience || [
                          "Strength & Conditioning",
                          "Speed & Agility Session",
                          "Biomechanical Movement Assessment",
                          "Recovery & Regeneration Session",
                        ]
                    )?.map((st) => (
                      <SelectItem key={st} value={st} className="text-xs">
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filter 2c: Payment Mode (For Billing module) */}
            {isBillingModule && (
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Payment Mode
                </label>
                <Select value={selectedPaymentMode} onValueChange={(val) => { setSelectedPaymentMode(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg">
                    <SelectValue placeholder="All Payment Modes" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Modes
                    </SelectItem>
                    {options?.paymentMethods?.map((pm) => (
                      <SelectItem key={pm} value={pm} className="text-xs">
                        {pm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filter 3: Status Filter */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Status
              </label>
              <Select value={selectedStatus} onValueChange={(val) => { setSelectedStatus(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all" className="text-xs font-semibold">
                    All Statuses
                  </SelectItem>
                  {isBillingModule ? (
                    <>
                      <SelectItem value="Paid" className="text-xs text-emerald-600 font-medium">
                        Paid
                      </SelectItem>
                      <SelectItem value="Pending" className="text-xs text-amber-600 font-medium">
                        Pending / Unpaid
                      </SelectItem>
                      <SelectItem value="Partially Paid" className="text-xs text-blue-600 font-medium">
                        Partially Paid
                      </SelectItem>
                      <SelectItem value="Cancelled" className="text-xs text-rose-600 font-medium">
                        Cancelled
                      </SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Completed" className="text-xs text-emerald-600 font-medium">
                        Completed
                      </SelectItem>
                      <SelectItem value="Planned" className="text-xs text-blue-600 font-medium">
                        Planned / Upcoming
                      </SelectItem>
                      <SelectItem value="In Progress" className="text-xs text-purple-600 font-medium">
                        In Progress
                      </SelectItem>
                      <SelectItem value="Cancelled" className="text-xs text-rose-600 font-medium">
                        Cancelled
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* KPI Summary Metric Cards */}
          {reportData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {isBillingModule ? (
                <>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Total Invoices
                    </div>
                    <div className="text-xl font-extrabold text-foreground mt-1">
                      {reportData.summary.totalInvoices ?? reportData.summary.totalCount ?? dataList.length}
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 dark:bg-emerald-500/15 p-3.5 rounded-2xl border border-emerald-500/20">
                    <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Net Revenue
                    </div>
                    <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
                      ₹{(reportData.summary.netRevenue ?? reportData.summary.totalCollected ?? reportData.summary.totalAmount ?? 0).toLocaleString("en-IN")}
                    </div>
                  </div>

                  {reportData.summary.grossTotal !== undefined && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Gross Invoiced
                      </div>
                      <div className="text-xl font-extrabold text-foreground mt-1">
                        ₹{reportData.summary.grossTotal.toLocaleString("en-IN")}
                      </div>
                    </div>
                  )}

                  {reportData.summary.totalDiscount !== undefined && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Total Discounts
                      </div>
                      <div className="text-xl font-extrabold text-foreground mt-1">
                        ₹{reportData.summary.totalDiscount.toLocaleString("en-IN")}
                      </div>
                    </div>
                  )}

                  {reportData.summary.totalTax !== undefined && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Tax Collected
                      </div>
                      <div className="text-xl font-extrabold text-foreground mt-1">
                        ₹{reportData.summary.totalTax.toLocaleString("en-IN")}
                      </div>
                    </div>
                  )}

                  <div className="bg-rose-500/10 dark:bg-rose-500/15 p-3.5 rounded-2xl border border-rose-500/20">
                    <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                      {selectedReport === "cancelled-invoices" ? "Cancelled Amount" : "Cancelled / Lost"}
                    </div>
                    <div className="text-xl font-extrabold text-rose-700 dark:text-rose-400 mt-1">
                      ₹{(selectedReport === "cancelled-invoices" ? reportData.summary.totalAmount : 0).toLocaleString("en-IN")}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Total Sessions
                    </div>
                    <div className="text-xl font-extrabold text-foreground mt-1">
                      {reportData.summary.totalSessions ?? 0}
                    </div>
                  </div>

                  <div className="bg-emerald-500/10 dark:bg-emerald-500/15 p-3.5 rounded-2xl border border-emerald-500/20">
                    <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Completed Sessions
                    </div>
                    <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">
                      {reportData.summary.completedSessions ?? 0}
                    </div>
                  </div>

                  <div className="bg-blue-500/10 dark:bg-blue-500/15 p-3.5 rounded-2xl border border-blue-500/20">
                    <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                      Total Duration
                    </div>
                    <div className="text-xl font-extrabold text-blue-700 dark:text-blue-400 mt-1">
                      {reportData.summary.totalDurationHours} hrs
                    </div>
                  </div>

                  <div className="bg-purple-500/10 dark:bg-purple-500/15 p-3.5 rounded-2xl border border-purple-500/20">
                    <div className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                      {isGroupModule ? "Unique Groups" : (isClientModule ? "Unique Clients" : (isPhysioModule ? "Unique Patients" : "Unique Athletes"))}
                    </div>
                    <div className="text-xl font-extrabold text-purple-700 dark:text-purple-400 mt-1">
                      {isGroupModule ? (reportData.summary.uniqueGroupsCount ?? reportData.groupBreakdown?.length ?? 0) : (reportData.summary.uniqueClientsCount ?? 0)}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Avg Session Duration
                    </div>
                    <div className="text-xl font-extrabold text-foreground mt-1">
                      {reportData.summary.avgDurationMinutes} mins
                    </div>
                  </div>

                  <div className="bg-rose-500/10 dark:bg-rose-500/15 p-3.5 rounded-2xl border border-rose-500/20">
                    <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                      Cancelled Sessions
                    </div>
                    <div className="text-xl font-extrabold text-rose-700 dark:text-rose-400 mt-1">
                      {reportData.summary.cancelledSessions ?? 0}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Client Breakdown Summary Table (When Client Module is Selected) */}
          {isClientModule && reportData?.clientBreakdown && reportData.clientBreakdown.length > 0 && selectedClient === "all" && (
            <div className="space-y-3">
              {/* Consolidated Header with Search and Summary Metrics */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Client Sessions & Hours Summary
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
                        {filteredClientSummary.length} Unique Clients
                      </Badge>
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Consolidated per-client session counts, total completed/cancelled hours, and primary assigned instructors.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Filter summary by client, UHID..."
                      value={summarySearch}
                      onChange={(e) => setSummarySearch(e.target.value)}
                      className="h-8 pl-8 text-xs w-48 sm:w-56 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenExport("excel", "consolidated")}
                    className="h-8 text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5"
                    title="Export this consolidated summary to Excel"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export Summary</span>
                  </Button>
                </div>
              </div>

              {/* Consolidated Table */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                      <tr>
                        <th
                          onClick={() => handleToggleSummarySort("clientUhid")}
                          className="p-3 font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-primary transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Client UHID</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleToggleSummarySort("clientName")}
                          className="p-3 font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-primary transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Client Name</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleToggleSummarySort("clientSport")}
                          className="p-3 font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-primary transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Sport / Category</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleToggleSummarySort("totalSessions")}
                          className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center cursor-pointer select-none hover:text-primary transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Total Sessions</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleToggleSummarySort("completedSessions")}
                          className="p-3 font-bold text-emerald-700 dark:text-emerald-400 text-center cursor-pointer select-none hover:text-emerald-600 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Completed</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleToggleSummarySort("cancelledSessions")}
                          className="p-3 font-bold text-rose-700 dark:text-rose-400 text-center cursor-pointer select-none hover:text-rose-600 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Cancelled</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleToggleSummarySort("totalDurationHours")}
                          className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center cursor-pointer select-none hover:text-primary transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Total Hours</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </th>
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Primary Instructors</th>
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {paginatedClientSummary.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-muted-foreground text-xs">
                            No clients match the summary search filter.
                          </td>
                        </tr>
                      ) : (
                        paginatedClientSummary.map((cl: any) => (
                          <tr key={cl.clientId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 font-mono font-bold text-primary">{cl.clientUhid && cl.clientUhid !== "-" ? cl.clientUhid : "-"}</td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              {cl.clientName || (cl.clientUhid && cl.clientUhid !== "-" ? `Client (${cl.clientUhid})` : "Guest / Walk-in Patient")}
                            </td>
                            <td className="p-3 text-muted-foreground">{cl.clientSport || "General"}</td>
                            <td className="p-3 text-center font-bold text-slate-900 dark:text-white">{cl.totalSessions}</td>
                            <td className="p-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                              {cl.completedSessions}
                            </td>
                            <td className="p-3 text-center text-rose-600 dark:text-rose-400 font-bold">
                              {cl.cancelledSessions}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="font-semibold bg-slate-50 dark:bg-slate-800">
                                {cl.totalDurationHours} hrs
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground max-w-xs truncate" title={cl.instructorsList}>
                              {cl.instructorsList}
                            </td>
                            <td className="p-3 text-center">
                              {cl.clientId && cl.clientId !== "guest" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedClient(cl.clientId)}
                                  className="h-6 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10"
                                >
                                  Drill Down
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary Table Pagination */}
                {summaryTotalPages > 1 && (
                  <div className="flex items-center justify-between p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <span className="text-xs text-muted-foreground">
                      Showing {(summaryPage - 1) * summaryPageSize + 1} to{" "}
                      {Math.min(summaryPage * summaryPageSize, filteredClientSummary.length)} of {filteredClientSummary.length} clients
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={summaryPage === 1}
                        onClick={() => setSummaryPage((p) => Math.max(1, p - 1))}
                        className="h-7 text-xs rounded-lg"
                      >
                        Previous
                      </Button>
                      <span className="text-xs font-bold px-2">
                        {summaryPage} / {summaryTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={summaryPage >= summaryTotalPages}
                        onClick={() => setSummaryPage((p) => Math.min(summaryTotalPages, p + 1))}
                        className="h-7 text-xs rounded-lg"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Consolidated Group Sessions & Hours Summary Table */}
          {isGroupModule && reportData?.groupBreakdown && reportData.groupBreakdown.length > 0 && selectedReport === "all-groups" && (
            <div className="space-y-3">
              {/* Consolidated Header with Search and Summary Metrics */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      Group Sessions & Hours Summary
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-bold">
                        {filteredGroupSummary.length} Unique Groups
                      </Badge>
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Consolidated per-group session counts, total completed/cancelled hours, and primary assigned instructors.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Filter summary by group, category..."
                      value={summarySearch}
                      onChange={(e) => setSummarySearch(e.target.value)}
                      className="h-8 pl-8 text-xs w-48 sm:w-56 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenExport("excel", "consolidated")}
                    className="h-8 text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5"
                    title="Export this consolidated summary to Excel"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Export Summary</span>
                  </Button>
                </div>
              </div>

              {/* Consolidated Table */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                      <tr>
                        <th
                          onClick={() => handleToggleSummarySort("groupName")}
                          className="p-3 font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-primary transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Group Name</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleToggleSummarySort("category")}
                          className="p-3 font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-primary transition-colors"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Category / Modality</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleToggleSummarySort("totalSessions")}
                          className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center cursor-pointer select-none hover:text-primary transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Total Sessions</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleToggleSummarySort("completedSessions")}
                          className="p-3 font-bold text-emerald-700 dark:text-emerald-400 text-center cursor-pointer select-none hover:text-emerald-600 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Completed</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleToggleSummarySort("cancelledSessions")}
                          className="p-3 font-bold text-rose-700 dark:text-rose-400 text-center cursor-pointer select-none hover:text-rose-600 transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Cancelled</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </th>
                        <th
                          onClick={() => handleToggleSummarySort("totalDurationHours")}
                          className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center cursor-pointer select-none hover:text-primary transition-colors"
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <span>Total Hours</span>
                            <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </th>
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Primary Instructors</th>
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {paginatedGroupSummary.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                            No groups match the summary search filter.
                          </td>
                        </tr>
                      ) : (
                        paginatedGroupSummary.map((grp: any) => (
                          <tr key={grp.groupId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>{grp.groupName}</span>
                            </td>
                            <td className="p-3 text-muted-foreground">
                              <Badge variant="outline" className="text-[11px] bg-slate-50 dark:bg-slate-800 font-semibold">
                                {grp.category || "Group Training"}
                              </Badge>
                            </td>
                            <td className="p-3 text-center font-bold text-slate-900 dark:text-white">{grp.totalSessions}</td>
                            <td className="p-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                              {grp.completedSessions}
                            </td>
                            <td className="p-3 text-center text-rose-600 dark:text-rose-400 font-bold">
                              {grp.cancelledSessions}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant="outline" className="font-semibold bg-slate-50 dark:bg-slate-800">
                                {grp.totalDurationHours} hrs
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground max-w-xs truncate" title={grp.instructorsList}>
                              {grp.instructorsList}
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedReport(grp.groupName)}
                                className="h-6 px-2 text-[11px] font-semibold text-primary hover:bg-primary/10"
                              >
                                View Group
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {groupSummaryTotalPages > 1 && (
                  <div className="flex items-center justify-between p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <span className="text-xs text-muted-foreground">
                      Showing {(summaryPage - 1) * summaryPageSize + 1} to{" "}
                      {Math.min(summaryPage * summaryPageSize, filteredGroupSummary.length)} of {filteredGroupSummary.length} groups
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={summaryPage === 1}
                        onClick={() => setSummaryPage((p) => Math.max(1, p - 1))}
                        className="h-7 text-xs rounded-lg"
                      >
                        Previous
                      </Button>
                      <span className="text-xs font-bold px-2">
                        {summaryPage} / {groupSummaryTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={summaryPage >= groupSummaryTotalPages}
                        onClick={() => setSummaryPage((p) => Math.min(groupSummaryTotalPages, p + 1))}
                        className="h-7 text-xs rounded-lg"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Practitioner Performance Breakdown Table (for Physiotherapy & Sports Science) */}
          {(isPhysioModule || isSportsScienceModule) && reportData?.staffBreakdown && reportData.staffBreakdown.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  {isPhysioModule ? "Therapist Session Breakdown" : "Sports Scientist Session Breakdown"}
                </h3>
                <span className="text-xs text-muted-foreground">
                  Timeframe: {startDate} to {endDate}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                      <tr>
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300">
                          {isPhysioModule ? "Therapist Name" : "Sports Scientist Name"}
                        </th>
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Designation</th>
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Total Sessions</th>
                        <th className="p-3 font-bold text-emerald-700 dark:text-emerald-400 text-center">Completed</th>
                        <th className="p-3 font-bold text-rose-700 dark:text-rose-400 text-center">Cancelled</th>
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Total Duration</th>
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">
                          {isPhysioModule ? "Unique Patients" : "Unique Athletes"}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {reportData.staffBreakdown.map((staff: any) => (
                        <tr key={staff.staffId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                              {staff.staffName?.[0] || "S"}
                            </div>
                            <span>{staff.staffName}</span>
                          </td>
                          <td className="p-3 text-muted-foreground">{staff.profession}</td>
                          <td className="p-3 text-center font-bold">{staff.totalSessions}</td>
                          <td className="p-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                            {staff.completedSessions}
                          </td>
                          <td className="p-3 text-center text-rose-600 dark:text-rose-400 font-bold">
                            {staff.cancelledSessions}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline" className="font-semibold bg-slate-50 dark:bg-slate-800">
                              {staff.totalDurationHours} hrs
                            </Badge>
                          </td>
                          <td className="p-3 text-center font-bold text-primary">
                            {staff.uniqueClientsCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* User-Wise Breakdown Summary Table (for Billing module user-wise report) */}
          {isBillingModule && selectedReport === "user-wise" && reportData?.userBreakdown && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Billing Staff Performance Summary
              </h3>
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                    <tr>
                      <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Staff / Cashier Name</th>
                      <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Invoices Issued</th>
                      <th className="p-3 font-bold text-emerald-700 dark:text-emerald-400 text-center">Paid Invoices</th>
                      <th className="p-3 font-bold text-rose-700 dark:text-rose-400 text-center">Cancelled Invoices</th>
                      <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-right">Total Invoiced (₹)</th>
                      <th className="p-3 font-bold text-emerald-700 dark:text-emerald-400 text-right">Total Collected (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {reportData.userBreakdown.map((user: any) => (
                      <tr key={user.userId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{user.userName}</td>
                        <td className="p-3 text-center font-bold">{user.totalInvoices}</td>
                        <td className="p-3 text-center text-emerald-600 font-bold">{user.paidInvoices}</td>
                        <td className="p-3 text-center text-rose-600 font-bold">{user.cancelledInvoices}</td>
                        <td className="p-3 text-right font-bold">₹{user.totalBilled.toLocaleString("en-IN")}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">₹{user.totalCollected.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payment Mode Breakdown Summary (for Billing payment-mode-wise report) */}
          {isBillingModule && selectedReport === "payment-mode-wise" && reportData?.modeBreakdown && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {reportData.modeBreakdown.map((m: any) => (
                <div key={m.mode} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>{m.mode}</span>
                    <Badge variant="outline" className="text-[10px]">{m.percentage}%</Badge>
                  </div>
                  <div className="text-lg font-extrabold text-foreground mt-1">
                    ₹{m.totalCollected.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {m.transactionCount} transactions
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Detailed Data Table / Review Preview */}
          <div className="space-y-3">
            {/* When Client Module or Group Sessions Module is in Overview mode: show clean review preview (first 5 rows) */}
            {(isClientModule && selectedClient === "all") || (isGroupModule && selectedReport === "all-groups") ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-primary" />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{isGroupModule ? "Group Sessions Log Preview" : "Individual Session Logs Preview"}</span>
                        <Badge variant="outline" className="text-[10px] bg-white dark:bg-slate-900 font-bold">
                          {showFullIndividualLogs ? `Showing ${dataList.length} records` : `Showing 5 of ${dataList.length} records for review`}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {isGroupModule
                          ? `Detailed group appointment logs with notes & timestamps. Full raw log of all ${dataList.length} sessions is available via Excel or CSV export.`
                          : `Individual appointment logs with notes & timestamps. Full raw log of all ${dataList.length} sessions is available via Excel or CSV export.`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenExport("excel", "individual")}
                      className="h-8 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export All {dataList.length} Logs</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowFullIndividualLogs(!showFullIndividualLogs)}
                      className="h-8 text-xs font-semibold gap-1"
                    >
                      {showFullIndividualLogs ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Collapse Preview</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Browse All ({totalPages} Pages)</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                        {isGroupModule ? (
                          <tr>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Group Name</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Session Date</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Time</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Duration</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Instructor / Specialist</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Session Type / Modality</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Location</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Status</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Session Notes</th>
                          </tr>
                        ) : (
                          <tr>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Client UHID</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Client Name</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Session Date</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Time</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Duration</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Instructor</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Session Type</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Status</th>
                            <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Session Notes</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {(showFullIndividualLogs ? paginatedData : dataList.slice(0, 5)).map((row: any) => (
                          <tr key={row.session_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            {isGroupModule ? (
                              <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                                <span>{row.group_name || "General Group"}</span>
                              </td>
                            ) : (
                              <>
                                <td className="p-3 font-mono font-bold text-primary">{row.client_uhid || "-"}</td>
                                <td className="p-3 font-bold text-slate-900 dark:text-white">
                                  {row.client_name || "Guest / Walk-in Patient"}
                                  {row.client_sport && row.client_sport !== "General" && (
                                    <span className="text-[10px] text-muted-foreground block font-normal">{row.client_sport}</span>
                                  )}
                                </td>
                              </>
                            )}
                            <td className="p-3 whitespace-nowrap text-foreground font-semibold">
                              {row.scheduled_start ? format(new Date(row.scheduled_start), "dd/MM/yyyy") : (row.session_date || "-")}
                            </td>
                            <td className="p-3 whitespace-nowrap text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {row.scheduled_start ? format(new Date(row.scheduled_start), "hh:mm a") : (row.session_time || "-")}
                            </td>
                            <td className="p-3 text-center font-bold text-primary">
                              {row.duration_formatted}
                            </td>
                            <td className="p-3 font-medium text-slate-900 dark:text-white">
                              <div className="font-semibold flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                  {row.instructor_name?.[0] || "I"}
                                </div>
                                <span>{row.instructor_name}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground ml-6.5">{row.instructor_role}</div>
                            </td>
                            <td className="p-3 font-medium text-foreground">
                              {isGroupModule ? (
                                <Badge variant="outline" className="text-[11px] bg-slate-50 dark:bg-slate-800">
                                  {row.service_type}
                                </Badge>
                              ) : (
                                row.service_type
                              )}
                            </td>
                            {isGroupModule && (
                              <td className="p-3 text-slate-700 dark:text-slate-300">
                                {row.session_location || "CSSH Facility"}
                              </td>
                            )}
                            <td className="p-3 text-center">
                              <Badge
                                className={`text-[10px] font-bold ${
                                  row.status?.toLowerCase() === "completed"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : row.status?.toLowerCase().includes("cancel")
                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                }`}
                              >
                                {row.status || "Planned"}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground max-w-xs truncate" title={row.session_notes || row.cancellation_reason}>
                              {row.cancellation_reason ? `Cancelled: ${row.cancellation_reason}` : (row.session_notes || "-")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!showFullIndividualLogs && dataList.length > 5 && (
                    <div className="p-3 text-center text-xs text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                      Showing 5 of {dataList.length} session records for review. To inspect or export all records, use the Export options above.
                    </div>
                  )}

                  {showFullIndividualLogs && totalPages > 1 && (
                    <div className="flex items-center justify-between p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <span className="text-xs text-muted-foreground">
                        Showing {(currentPage - 1) * pageSize + 1} to{" "}
                        {Math.min(currentPage * pageSize, dataList.length)} of {dataList.length} items
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="h-7 text-xs rounded-lg"
                        >
                          Previous
                        </Button>
                        <span className="text-xs font-bold px-2">{currentPage} / {totalPages}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="h-7 text-xs rounded-lg"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* For specific selected client or Billing / Physio / Sports Science modules: standard data table */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    {reportData?.title || reportData?.reportTitle || "Report Records"}
                    <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-slate-800 font-bold">
                      {dataList.length} records
                    </Badge>
                  </h3>

                  <div className="text-xs text-muted-foreground">
                    Showing page {currentPage} of {totalPages}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
                  {isLoading ? (
                    <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
                      <p>Loading report records...</p>
                    </div>
                  ) : paginatedData.length === 0 ? (
                    <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
                      <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground/60" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">No records found</p>
                      <p>No transactions or sessions match the selected filters and timeframe.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                          {isGroupModule ? (
                            <tr>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Group Name</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Session Date</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Time</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Duration</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Instructor / Specialist</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Session Type / Modality</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Location</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Status</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Session Notes</th>
                            </tr>
                          ) : isClientModule ? (
                            <tr>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Client UHID</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Client Name</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Session Date</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Time</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Duration</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Instructor</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Session Type</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Status</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Session Notes</th>
                            </tr>
                          ) : isBillingModule ? (
                            <tr>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Invoice #</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Date</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Client UHID</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Client Name</th>
                              {selectedReport === "service-wise" && (
                                <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Service / Package</th>
                              )}
                              {selectedReport === "cancelled-invoices" && (
                                <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Cancellation Reason</th>
                              )}
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Payment Mode</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-right">
                                {selectedReport === "cancelled-invoices" ? "Cancelled Amount (₹)" : "Total (₹)"}
                              </th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Status</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Billed By</th>
                            </tr>
                          ) : (
                            <tr>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Date & Time</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">
                                {isPhysioModule ? "Therapist" : "Sports Scientist"}
                              </th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">UHID</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">
                                {isPhysioModule ? "Patient Name" : "Athlete Name"}
                              </th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Sport / Category</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Session Type</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Mode</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Duration</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Status</th>
                              <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Session Notes</th>
                            </tr>
                          )}
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                          {isGroupModule
                            ? paginatedData.map((row: any) => (
                                <tr key={row.session_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span>{row.group_name || "General Group"}</span>
                                  </td>
                                  <td className="p-3 whitespace-nowrap text-foreground font-semibold">
                                    {row.scheduled_start ? format(new Date(row.scheduled_start), "dd/MM/yyyy") : (row.session_date || "-")}
                                  </td>
                                  <td className="p-3 whitespace-nowrap text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {row.scheduled_start ? format(new Date(row.scheduled_start), "hh:mm a") : (row.session_time || "-")}
                                  </td>
                                  <td className="p-3 text-center font-bold text-primary">
                                    {row.duration_formatted}
                                  </td>
                                  <td className="p-3 font-medium text-slate-900 dark:text-white">
                                    <div className="font-semibold flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                        {row.instructor_name?.[0] || "I"}
                                      </div>
                                      <span>{row.instructor_name}</span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground ml-6.5">{row.instructor_role}</div>
                                  </td>
                                  <td className="p-3 font-medium text-foreground">
                                    <Badge variant="outline" className="text-[11px] bg-slate-50 dark:bg-slate-800">
                                      {row.service_type}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-slate-700 dark:text-slate-300">{row.session_location || "CSSH Facility"}</td>
                                  <td className="p-3 text-center">
                                    <Badge
                                      className={`text-[10px] font-bold ${
                                        row.status?.toLowerCase() === "completed"
                                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                          : row.status?.toLowerCase().includes("cancel")
                                          ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                          : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                      }`}
                                    >
                                      {row.status || "Planned"}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-muted-foreground max-w-xs truncate" title={row.session_notes || row.cancellation_reason}>
                                    {row.cancellation_reason ? `Cancelled: ${row.cancellation_reason}` : (row.session_notes || "-")}
                                  </td>
                                </tr>
                              ))
                            : isClientModule
                            ? paginatedData.map((row: any) => (
                                <tr key={row.session_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="p-3 font-mono font-bold text-primary">{row.client_uhid || "-"}</td>
                                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                                    {row.client_name}
                                    {row.client_sport && row.client_sport !== "General" && (
                                      <span className="text-[10px] text-muted-foreground block font-normal">{row.client_sport}</span>
                                    )}
                                  </td>
                                  <td className="p-3 whitespace-nowrap text-foreground font-semibold">
                                    {row.scheduled_start ? format(new Date(row.scheduled_start), "dd/MM/yyyy") : (row.session_date || "-")}
                                  </td>
                                  <td className="p-3 whitespace-nowrap text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {row.scheduled_start ? format(new Date(row.scheduled_start), "hh:mm a") : (row.session_time || "-")}
                                  </td>
                                  <td className="p-3 text-center font-bold text-primary">
                                    {row.duration_formatted}
                                  </td>
                                  <td className="p-3 font-medium text-slate-900 dark:text-white">
                                    <div className="font-semibold flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                        {row.instructor_name?.[0] || "I"}
                                      </div>
                                      <span>{row.instructor_name}</span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground ml-6.5">{row.instructor_role}</div>
                                  </td>
                                  <td className="p-3 font-medium text-foreground">{row.service_type}</td>
                                  <td className="p-3 text-center">
                                    <Badge
                                      className={`text-[10px] font-bold ${
                                        row.status?.toLowerCase() === "completed"
                                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                          : row.status?.toLowerCase().includes("cancel")
                                          ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                          : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                      }`}
                                    >
                                      {row.status || "Planned"}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-muted-foreground max-w-xs truncate" title={row.session_notes || row.cancellation_reason}>
                                    {row.cancellation_reason ? `Cancelled: ${row.cancellation_reason}` : (row.session_notes || "-")}
                                  </td>
                                </tr>
                              ))
                            : isBillingModule
                            ? paginatedData.map((row: any) => (
                                <tr key={row.invoice_id + (row.service_name || "")} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="p-3 font-mono font-bold text-primary">{row.invoice_no}</td>
                                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                                    {row.invoice_date || (row.created_at ? format(new Date(row.created_at), "dd/MM/yyyy") : "-")}
                                  </td>
                                  <td className="p-3 font-mono font-medium">{row.client_uhid || "-"}</td>
                                  <td className="p-3 font-bold text-slate-900 dark:text-white">{row.client_name}</td>
                                  {selectedReport === "service-wise" && (
                                    <td className="p-3">
                                      <div className="font-semibold">{row.service_name}</div>
                                      <div className="text-[11px] text-muted-foreground">{row.service_category}</div>
                                    </td>
                                  )}
                                  {selectedReport === "cancelled-invoices" && (
                                    <td className="p-3 text-rose-600 font-medium max-w-xs truncate" title={row.cancellation_reason}>
                                      {row.cancellation_reason}
                                    </td>
                                  )}
                                  <td className="p-3">
                                    <Badge variant="outline" className="font-semibold bg-slate-50 dark:bg-slate-800">
                                      {row.payment_mode || "Cash"}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-right font-extrabold text-foreground">
                                    ₹{Number(row.total_amount || row.amount_paid || 0).toLocaleString("en-IN")}
                                  </td>
                                  <td className="p-3 text-center">
                                    <Badge
                                      className={`text-[10px] font-bold ${
                                        row.invoice_status?.toLowerCase() === "paid"
                                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                          : row.invoice_status?.toLowerCase().includes("cancel")
                                          ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                          : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                      }`}
                                    >
                                      {row.invoice_status || "Completed"}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-muted-foreground">{row.billed_by_name || "Front Desk"}</td>
                                </tr>
                              ))
                            : paginatedData.map((row: any) => (
                                <tr key={row.session_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                  <td className="p-3 whitespace-nowrap">
                                    <div className="font-bold text-slate-900 dark:text-white">
                                      {row.scheduled_start ? format(new Date(row.scheduled_start), "dd MMM yyyy") : "-"}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {row.scheduled_start ? format(new Date(row.scheduled_start), "hh:mm a") : "-"}
                                    </div>
                                  </td>
                                  <td className="p-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                      {row.staff_name?.[0] || "S"}
                                    </div>
                                    <div>
                                      <span>{row.staff_name}</span>
                                      <span className="text-[10px] text-muted-foreground block font-normal">
                                        {row.staff_profession || (isPhysioModule ? "Physiotherapist" : "Sports Scientist")}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-3 font-mono font-medium">{row.client_uhid || "-"}</td>
                                  <td className="p-3 font-bold text-slate-900 dark:text-white">{row.client_name}</td>
                                  <td className="p-3 text-muted-foreground">{row.client_sport || "General"}</td>
                                  <td className="p-3 font-medium text-foreground">{row.service_type}</td>
                                  <td className="p-3 text-center">
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold">
                                      {row.session_mode || "1-on-1"}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-center font-bold text-primary">
                                    {row.duration_formatted}
                                  </td>
                                  <td className="p-3 text-center">
                                    <Badge
                                      className={`text-[10px] font-bold ${
                                        row.status?.toLowerCase() === "completed"
                                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                          : row.status?.toLowerCase().includes("cancel")
                                          ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                          : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                      }`}
                                    >
                                      {row.status || "Planned"}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-muted-foreground max-w-xs truncate" title={row.session_notes || row.cancellation_reason}>
                                    {row.cancellation_reason ? `Cancelled: ${row.cancellation_reason}` : (row.session_notes || "-")}
                                  </td>
                                </tr>
                              ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <span className="text-xs text-muted-foreground">
                        Showing {(currentPage - 1) * pageSize + 1} to{" "}
                        {Math.min(currentPage * pageSize, dataList.length)} of {dataList.length} items
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className="h-7 text-xs rounded-lg"
                        >
                          Previous
                        </Button>
                        <span className="text-xs font-bold px-2">{currentPage} / {totalPages}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className="h-7 text-xs rounded-lg"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Export Options Modal Dialog */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Export {selectedModule} Data ({exportFormat === "excel" ? "Excel .xlsx" : "CSV"})</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose how you would like the exported session records to be grouped and structured.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Context Info Pill */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground">Timeframe: </span>
                <span className="font-semibold text-foreground">{startDate} to {endDate}</span>
              </div>
              <Badge variant="outline" className="text-[11px] font-bold bg-white dark:bg-slate-900">
                {isGroupModule
                  ? `${reportData?.groupBreakdown?.length || 0} Groups • ${dataList.length} Sessions`
                  : isClientModule
                  ? `${reportData?.clientBreakdown?.length || 0} Clients • ${dataList.length} Sessions`
                  : `${dataList.length} Records`}
              </Badge>
            </div>

            {/* Selection Cards */}
            <div className="space-y-2.5">
              {/* Option 1: Consolidated Summary (Group by Client ID / Group Name / Practitioner) */}
              <div
                onClick={() => setExportGrouping("consolidated")}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  exportGrouping === "consolidated"
                    ? "border-emerald-600 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60"
                }`}
              >
                <div
                  className={`mt-0.5 p-2 rounded-lg ${
                    exportGrouping === "consolidated"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
                  }`}
                >
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {isGroupModule
                        ? "Group by Group Name (Consolidated Summary)"
                        : isClientModule
                        ? "Group by Client ID (Consolidated Summary)"
                        : isPhysioModule || isSportsScienceModule
                        ? "Group by Practitioner (Staff Summary)"
                        : "Consolidated Summary Breakdown"}
                    </span>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isGroupModule
                      ? "1 consolidated row per group with total sessions, completed, cancelled, total hours, and primary instructors."
                      : isClientModule
                      ? "1 consolidated row per client with total sessions, completed, cancelled, total hours, and primary instructors."
                      : "Aggregated performance rows with session counts, completion rates, and total hours."}
                  </p>
                  <div className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {isGroupModule
                      ? `${reportData?.groupBreakdown?.length || 0} unique group rows`
                      : isClientModule
                      ? `${reportData?.clientBreakdown?.length || 0} unique client rows`
                      : "Summary breakdown rows"}
                  </div>
                </div>
              </div>

              {/* Option 2: Detailed Individual Sessions */}
              <div
                onClick={() => setExportGrouping("individual")}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  exportGrouping === "individual"
                    ? "border-emerald-600 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm"
                    : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60"
                }`}
              >
                <div
                  className={`mt-0.5 p-2 rounded-lg ${
                    exportGrouping === "individual"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
                  }`}
                >
                  <ListOrdered className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Detailed Individual Sessions (Raw Log)
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Every individual appointment record with session date, time, duration, instructor, session type, status, and notes.
                  </p>
                  <div className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                    {dataList.length} individual record rows
                  </div>
                </div>
              </div>

              {/* Option 3: Both (Multi-Sheet Excel only) */}
              {exportFormat === "excel" && (
                <div
                  onClick={() => setExportGrouping("both")}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                    exportGrouping === "both"
                      ? "border-emerald-600 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm"
                      : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60"
                  }`}
                >
                  <div
                    className={`mt-0.5 p-2 rounded-lg ${
                      exportGrouping === "both"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Both (Multi-Sheet Excel Workbook)
                      </span>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        2 Sheets
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {isGroupModule
                        ? "Sheet 1: Consolidated Group Summary + Sheet 2: Detailed Group Sessions Log in one .xlsx file."
                        : "Sheet 1: Consolidated Client/Staff Summary + Sheet 2: Detailed Individual Session Records in one .xlsx file."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportModalOpen(false)}
              disabled={isExporting}
              className="h-8 text-xs rounded-xl"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => executeExport(exportFormat, exportGrouping)}
              disabled={isExporting}
              className="h-8 text-xs rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Export...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>
                    Download {exportFormat === "excel" ? "Excel (.xlsx)" : "CSV"}
                  </span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}