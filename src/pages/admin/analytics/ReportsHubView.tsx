import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Check,
  Lock
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
import { exportToExcel, exportToCSV, ExcelColumn } from "@/utils/excelExport";
import { toast } from "sonner";

interface ReportsHubViewProps {
  initialModule?: string;
  initialReport?: string;
  role?: string;
}

interface FilterOptions {
  clients: Array<{ id: string; uhid: string; name: string; sport: string }>;
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
  const [searchTerm, setSearchTerm] = useState<string>("");

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
      searchTerm,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });

      if (searchTerm) params.append("search", searchTerm);

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

  // Export to Excel handler (Applies all active filters)
  const handleExportExcel = async () => {
    if (!hasAnalyticsAccess) {
      toast.error("Access Denied: Excel exports require Analytics & Reports Engine access.");
      return;
    }

    if (!dataList || dataList.length === 0) {
      toast.error("No data available to export in the selected timeframe.");
      return;
    }

    try {
      const timestamp = format(new Date(), "yyyy-MM-dd");
      const metaInfo = [
        { label: "Report Module", value: selectedModule },
        { label: "Report Name", value: reportData?.title || reportData?.reportTitle || selectedReport },
        { label: "Timeframe", value: `${startDate} to ${endDate}` },
        { label: "Generated On", value: format(new Date(), "dd MMM yyyy, hh:mm a") },
        { label: "Total Filtered Records", value: dataList.length },
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

      if (isClientModule) {
        const columns: ExcelColumn<any>[] = [
          { header: "Client UHID", key: "client_uhid", width: 14 },
          { header: "Client Name", key: "client_name", width: 22 },
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

        await exportToExcel({
          filename: `CSSH_Client_Sessions_${timestamp}`,
          sheetName: "Client Sessions",
          title: "Client Sessions History & Details Report",
          metadata: metaInfo,
          columns,
          data: dataList,
        });
      } else if (isBillingModule) {
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
          await exportToExcel({
            filename: `CSSH_Cancelled_Invoices_${timestamp}`,
            sheetName: "Cancelled Invoices",
            title: "Cancelled Invoices List Report",
            metadata: metaInfo,
            columns,
            data: dataList,
          });
        } else if (selectedReport === "user-wise") {
          const columns: ExcelColumn<any>[] = [
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
          await exportToExcel({
            filename: `CSSH_User_Wise_Invoices_${timestamp}`,
            sheetName: "User Invoices",
            title: "User-Wise Invoices List & Collections",
            metadata: metaInfo,
            columns,
            data: dataList,
          });
        } else if (selectedReport === "payment-mode-wise") {
          const columns: ExcelColumn<any>[] = [
            { header: "Payment Date", key: "payment_date", width: 14 },
            { header: "Invoice #", key: "invoice_no", width: 16 },
            { header: "Client UHID", key: "client_uhid", width: 14 },
            { header: "Client Name", key: "client_name", width: 22 },
            { header: "Payment Mode", key: "payment_mode", width: 16 },
            { header: "Transaction ID", key: "transaction_id", width: 20 },
            { header: "Amount Paid (₹)", key: "amount_paid", width: 16, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Invoice Total (₹)", key: "invoice_total", width: 16, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Recorded By", key: "collected_by", width: 18 },
          ];
          await exportToExcel({
            filename: `CSSH_Payment_Mode_Collections_${timestamp}`,
            sheetName: "Payment Modes",
            title: "Payment Mode-Wise Collection Details",
            metadata: metaInfo,
            columns,
            data: dataList,
          });
        } else {
          // service-wise
          const columns: ExcelColumn<any>[] = [
            { header: "Invoice #", key: "invoice_no", width: 16 },
            { header: "Date", key: "invoice_date", width: 14 },
            { header: "Client UHID", key: "client_uhid", width: 14 },
            { header: "Client Name", key: "client_name", width: 22 },
            { header: "Service / Package Name", key: "service_name", width: 26 },
            { header: "Category", key: "service_category", width: 18 },
            { header: "Unit Price (₹)", key: "unit_price", width: 14, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Discount (₹)", key: "discount_amount", width: 14, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Tax (₹)", key: "tax_amount", width: 12, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Total Amount (₹)", key: "total_amount", width: 16, formatter: (v) => Number(v || 0).toFixed(2) },
            { header: "Payment Mode", key: "payment_mode", width: 16 },
            { header: "Status", key: "invoice_status", width: 14 },
            { header: "Billed By", key: "billed_by_name", width: 18 },
          ];
          await exportToExcel({
            filename: `CSSH_Service_Wise_Invoices_${timestamp}`,
            sheetName: "Service Wise Invoices",
            title: "Service-Wise Invoice Details Report",
            metadata: metaInfo,
            columns,
            data: dataList,
          });
        }
      } else if (isPhysioModule || isSportsScienceModule) {
        const practitionerCol = isPhysioModule ? "Therapist" : "Sports Scientist";
        const clientCol = isPhysioModule ? "Patient Name" : "Athlete Name";

        const columns: ExcelColumn<any>[] = [
          {
            header: "Date",
            key: "scheduled_start",
            width: 14,
            formatter: (v) => (v ? format(new Date(v), "dd/MM/yyyy") : "-"),
          },
          {
            header: "Time",
            key: "scheduled_start",
            width: 12,
            formatter: (v) => (v ? format(new Date(v), "hh:mm a") : "-"),
          },
          { header: practitionerCol, key: "staff_name", width: 22 },
          { header: "Client UHID", key: "client_uhid", width: 14 },
          { header: clientCol, key: "client_name", width: 22 },
          { header: "Sport / Category", key: "client_sport", width: 16 },
          { header: "Session Type / Modality", key: "service_type", width: 28 },
          { header: "Mode", key: "session_mode", width: 14 },
          { header: "Duration", key: "duration_formatted", width: 14 },
          { header: "Duration (Mins)", key: "duration_minutes", width: 14 },
          { header: "Status", key: "status", width: 14 },
          { header: "Cancellation Reason", key: "cancellation_reason", width: 24 },
          { header: "Session Notes", key: "session_notes", width: 30 },
        ];

        const prefix = isPhysioModule ? "Physiotherapy" : "Sports_Science";
        await exportToExcel({
          filename: `CSSH_${prefix}_Sessions_${timestamp}`,
          sheetName: `${prefix} Sessions`,
          title: isPhysioModule ? "Physiotherapy Sessions Report" : "Sports Science Sessions Report",
          metadata: metaInfo,
          columns,
          data: dataList,
        });
      }

      toast.success("Excel report exported successfully with all applied filters!");
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error("Failed to export Excel report. Please try again.");
    }
  };

  // Export to CSV handler
  const handleExportCSV = () => {
    if (!hasAnalyticsAccess) {
      toast.error("Access Denied: CSV exports require Analytics & Reports Engine access.");
      return;
    }

    if (!dataList || dataList.length === 0) {
      toast.error("No data available to export.");
      return;
    }
    const timestamp = format(new Date(), "yyyy-MM-dd");

    if (isClientModule) {
      const columns: ExcelColumn<any>[] = [
        { header: "Client UHID", key: "client_uhid" },
        { header: "Client Name", key: "client_name" },
        { header: "Session Date", key: "scheduled_start", formatter: (v) => (v ? format(new Date(v), "dd/MM/yyyy") : "-") },
        { header: "Session Time", key: "scheduled_start", formatter: (v) => (v ? format(new Date(v), "hh:mm a") : "-") },
        { header: "Duration", key: "duration_formatted" },
        { header: "Instructor", key: "instructor_name" },
        { header: "Status", key: "status" },
        { header: "Session Type", key: "service_type" },
      ];
      exportToCSV({
        filename: `CSSH_Client_Sessions_Report_${timestamp}.csv`,
        columns,
        data: dataList,
      });
    } else if (isBillingModule) {
      const columns: ExcelColumn<any>[] = [
        { header: "Invoice #", key: "invoice_no" },
        { header: "Date", key: "invoice_date" },
        { header: "UHID", key: "client_uhid" },
        { header: "Client Name", key: "client_name" },
        { header: "Service Name", key: "service_name" },
        { header: "Total Amount", key: "total_amount" },
        { header: "Payment Mode", key: "payment_mode" },
        { header: "Status", key: "invoice_status" },
        { header: "Billed By", key: "billed_by_name" },
      ];
      exportToCSV({
        filename: `CSSH_Billing_Report_${timestamp}.csv`,
        columns,
        data: dataList,
      });
    } else {
      const columns: ExcelColumn<any>[] = [
        { header: "Date", key: "scheduled_start", formatter: (v) => (v ? format(new Date(v), "dd/MM/yyyy") : "-") },
        { header: "Practitioner", key: "staff_name" },
        { header: "UHID", key: "client_uhid" },
        { header: "Client Name", key: "client_name" },
        { header: "Session Type", key: "service_type" },
        { header: "Duration (Mins)", key: "duration_minutes" },
        { header: "Status", key: "status" },
      ];
      exportToCSV({
        filename: `CSSH_${selectedModule.replace(/\s+/g, "_")}_Report_${timestamp}.csv`,
        columns,
        data: dataList,
      });
    }
    toast.success("CSV file downloaded successfully!");
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
                    onClick={handleExportExcel}
                    className="h-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Excel (.xlsx)</span>
                  </Button>

                  <Button
                    onClick={handleExportCSV}
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
              <Select value={selectedReport} onValueChange={(val) => { setSelectedReport(val); setCurrentPage(1); }}>
                <SelectTrigger className="w-full h-10 bg-white dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-sm">
                  <SelectValue placeholder="Select report" />
                </SelectTrigger>
                <SelectContent className="rounded-xl max-h-72">
                  {selectedModule === "Client" && (
                    <>
                      <SelectGroup>
                        <SelectLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                          Most used reports
                        </SelectLabel>
                        <SelectItem value="client-sessions" className="text-xs font-medium cursor-pointer">
                          Client Sessions Log & Details
                        </SelectItem>
                        <SelectItem value="client-attendance" className="text-xs font-medium cursor-pointer">
                          Client Completed Sessions Log
                        </SelectItem>
                        <SelectItem value="client-cancelled" className="text-xs font-medium cursor-pointer">
                          Client Cancelled & Missed Sessions
                        </SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                          Selected module reports
                        </SelectLabel>
                        <SelectItem value="client-summary" className="text-xs font-medium cursor-pointer">
                          Client Hours & Volume Summary
                        </SelectItem>
                        <SelectItem value="client-modality" className="text-xs font-medium cursor-pointer">
                          Modality & Service wise Breakdown
                        </SelectItem>
                      </SelectGroup>
                    </>
                  )}

                  {selectedModule === "Billing" && (
                    <>
                      <SelectGroup>
                        <SelectLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                          Most used reports
                        </SelectLabel>
                        <SelectItem value="service-wise" className="text-xs font-medium cursor-pointer">
                          Service wise Invoice Details
                        </SelectItem>
                        <SelectItem value="cancelled-invoices" className="text-xs font-medium cursor-pointer">
                          Cancelled Invoice Details
                        </SelectItem>
                        <SelectItem value="payment-mode-wise" className="text-xs font-medium cursor-pointer">
                          Payment Mode wise Invoice Details
                        </SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                          Selected module reports
                        </SelectLabel>
                        <SelectItem value="user-wise" className="text-xs font-medium cursor-pointer">
                          User wise Invoices List
                        </SelectItem>
                        <SelectItem value="advance-collection" className="text-xs font-medium cursor-pointer">
                          Advance Collection Report
                        </SelectItem>
                      </SelectGroup>
                    </>
                  )}

                  {selectedModule === "Physiotherapy" && (
                    <>
                      <SelectGroup>
                        <SelectLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                          Most used reports
                        </SelectLabel>
                        <SelectItem value="therapist-sessions" className="text-xs font-medium cursor-pointer">
                          Therapist Sessions Summary & Details
                        </SelectItem>
                        <SelectItem value="service-modality-sessions" className="text-xs font-medium cursor-pointer">
                          Service & Modality wise Physio Sessions
                        </SelectItem>
                        <SelectItem value="cancelled-physio-sessions" className="text-xs font-medium cursor-pointer">
                          Cancelled / Missed Physio Sessions
                        </SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                          Selected module reports
                        </SelectLabel>
                        <SelectItem value="therapist-utilization" className="text-xs font-medium cursor-pointer">
                          Therapist Treatment Hours & Utilization
                        </SelectItem>
                        <SelectItem value="patient-history" className="text-xs font-medium cursor-pointer">
                          Patient Follow-up Frequency Report
                        </SelectItem>
                      </SelectGroup>
                    </>
                  )}

                  {selectedModule === "Sports Science" && (
                    <>
                      <SelectGroup>
                        <SelectLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                          Most used reports
                        </SelectLabel>
                        <SelectItem value="scientist-sessions" className="text-xs font-medium cursor-pointer">
                          Sports Scientist Sessions Summary & Details
                        </SelectItem>
                        <SelectItem value="discipline-sessions" className="text-xs font-medium cursor-pointer">
                          Training & Testing Discipline Breakdown (S&C, Biomechanics)
                        </SelectItem>
                        <SelectItem value="cancelled-sports-sessions" className="text-xs font-medium cursor-pointer">
                          Cancelled & Rescheduled Sports Science Sessions
                        </SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                          Selected module reports
                        </SelectLabel>
                        <SelectItem value="athlete-volume" className="text-xs font-medium cursor-pointer">
                          Athlete Training Hours & Volume
                        </SelectItem>
                        <SelectItem value="mode-breakdown" className="text-xs font-medium cursor-pointer">
                          Group vs Individual Sessions Breakdown
                        </SelectItem>
                      </SelectGroup>
                    </>
                  )}

                  {selectedModule === "Registration" && (
                    <SelectGroup>
                      <SelectLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                        Registration reports
                      </SelectLabel>
                      <SelectItem value="new-registrations" className="text-xs font-medium cursor-pointer">
                        New Patient Registrations Summary
                      </SelectItem>
                      <SelectItem value="demographics-summary" className="text-xs font-medium cursor-pointer">
                        Demographics & Sports Distribution
                      </SelectItem>
                    </SelectGroup>
                  )}

                  {selectedModule === "Admin" && (
                    <SelectGroup>
                      <SelectLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                        Administrative reports
                      </SelectLabel>
                      <SelectItem value="operations-summary" className="text-xs font-medium cursor-pointer">
                        Center Operations & Revenue Summary
                      </SelectItem>
                      <SelectItem value="service-wise" className="text-xs font-medium cursor-pointer">
                        Service Wise Invoicing Details
                      </SelectItem>
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
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

          {/* Secondary Contextual Filters Row (Client / Practitioner / Payment Mode / Status / Search) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/60 dark:bg-slate-800/30 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            {/* Filter 1: Client Selector (For Client module - dynamically populated from table below) */}
            {isClientModule && (
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Select Client
                </label>
                <Select value={selectedClient} onValueChange={(val) => { setSelectedClient(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg">
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-72">
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Clients {availableClients.length > 0 ? `(${availableClients.length})` : ""}
                    </SelectItem>
                    {availableClients.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs cursor-pointer">
                        {c.name} {c.uhid ? `(${c.uhid})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filter 1b: Practitioner Selector (For Physio / Sports Science modules - dynamically populated from table below) */}
            {(isPhysioModule || isSportsScienceModule) && (
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  {isPhysioModule ? "Therapist" : "Sports Scientist"}
                </label>
                <Select value={selectedStaff} onValueChange={(val) => { setSelectedStaff(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg">
                    <SelectValue placeholder={`All ${isPhysioModule ? "Therapists" : "Sports Scientists"}`} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-72">
                    <SelectItem value="all" className="text-xs font-semibold">
                      All {isPhysioModule ? "Therapists" : "Sports Scientists"} {availableStaff.length > 0 ? `(${availableStaff.length})` : ""}
                    </SelectItem>
                    {availableStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs cursor-pointer">
                        {s.name} {s.profession ? `(${s.profession})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filter 1c: Cashier Selector (For Billing module) */}
            {isBillingModule && (
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Billing User / Cashier
                </label>
                <Select value={selectedStaff} onValueChange={(val) => { setSelectedStaff(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg">
                    <SelectValue placeholder="All Staff" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Billing Users
                    </SelectItem>
                    {options?.billingStaff?.map((st) => (
                      <SelectItem key={st.id} value={st.id} className="text-xs">
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filter 2: Instructor (For Client module - dynamically populated from table below) */}
            {isClientModule && (
              <div>
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Instructor / Specialist
                </label>
                <Select value={selectedStaff} onValueChange={(val) => { setSelectedStaff(val); setCurrentPage(1); }}>
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900 rounded-lg">
                    <SelectValue placeholder="All Instructors" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-72">
                    <SelectItem value="all" className="text-xs font-semibold">
                      All Instructors {availableStaff.length > 0 ? `(${availableStaff.length})` : ""}
                    </SelectItem>
                    {availableStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs cursor-pointer">
                        {s.name} {s.profession ? `(${s.profession})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filter 2b: Session Type (For Physio / Sports Science modules) */}
            {(isPhysioModule || isSportsScienceModule) && (
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
                      : options?.sessionTypes.sportsScience
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

            {/* Filter 4: Search input */}
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Search Keyword
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search client, UHID, instructor..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="h-8 text-xs pl-8 bg-white dark:bg-slate-900 rounded-lg"
                />
              </div>
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
                      {isClientModule ? "Unique Clients" : (isPhysioModule ? "Unique Patients" : "Unique Athletes")}
                    </div>
                    <div className="text-xl font-extrabold text-purple-700 dark:text-purple-400 mt-1">
                      {reportData.summary.uniqueClientsCount ?? 0}
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Client Sessions & Hours Summary
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
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Client UHID</th>
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Client Name</th>
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Sport / Category</th>
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Total Sessions</th>
                        <th className="p-3 font-bold text-emerald-700 dark:text-emerald-400 text-center">Completed</th>
                        <th className="p-3 font-bold text-rose-700 dark:text-rose-400 text-center">Cancelled</th>
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300 text-center">Total Hours</th>
                        <th className="p-3 font-bold text-slate-700 dark:text-slate-300">Primary Instructors</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {reportData.clientBreakdown.map((cl: any) => (
                        <tr key={cl.clientId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-mono font-bold text-primary">{cl.clientUhid}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">{cl.clientName}</td>
                          <td className="p-3 text-muted-foreground">{cl.clientSport}</td>
                          <td className="p-3 text-center font-bold">{cl.totalSessions}</td>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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

          {/* Detailed Data Table */}
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
                      {isClientModule ? (
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
                      {isClientModule
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
                                  <div>{row.staff_name}</div>
                                  <div className="text-[10px] text-muted-foreground font-normal">{row.staff_profession}</div>
                                </div>
                              </td>
                              <td className="p-3 font-mono font-medium">{row.client_uhid || "-"}</td>
                              <td className="p-3 font-bold text-slate-900 dark:text-white">{row.client_name}</td>
                              <td className="p-3 text-muted-foreground">{row.client_sport || "General"}</td>
                              <td className="p-3 font-semibold text-foreground">{row.service_type}</td>
                              <td className="p-3 text-center">
                                <Badge variant="outline" className="text-[10px]">
                                  {row.session_mode || "Individual"}
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
        </CardContent>
      </Card>
    </div>
  );
}
