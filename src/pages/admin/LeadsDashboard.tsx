import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn, formatClientName } from "@/lib/utils";
import { apiFetch } from "@/utils/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  PhoneCall, 
  Calendar, 
  UserPlus, 
  UserMinus,
  CheckCircle2, 
  MoreVertical,
  XCircle,
  MessageSquare,
  Clock,
  ArrowRight,
  Loader2,
  ExternalLink,
  Briefcase,
  Plus,
  Share2,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Flame,
  Sun,
  Snowflake,
  Download,
  AlertCircle,
  MessageCircle,
  CalendarDays,
  Sparkles,
  ChevronRight,
  TrendingUp,
  RefreshCw
} from "lucide-react";
import { LogEnquiryModal } from "@/components/admin/LogEnquiryModal";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { ShareEnquiryModal } from "@/components/admin/ShareEnquiryModal";
import { EnquiryFormSettingsModal } from "@/components/admin/EnquiryFormSettingsModal";
import { ConvertLeadModal } from "@/components/admin/ConvertLeadModal";
import { RescheduleCallbackModal } from "@/components/admin/RescheduleCallbackModal";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { AdminBookSessionModal } from "@/components/admin/AdminBookSessionModal";
import { format, isAfter, isBefore, isToday, startOfDay, formatDistanceToNow } from "date-fns";
import { InteractionModal } from "@/components/admin/InteractionModal";
import { EnquiryHistory } from "@/components/admin/EnquiryHistory";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

export type EnquiryStatus = 'new' | 'contacted' | 'guest_booked' | 'converted' | 'not_interested';

export interface Enquiry {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  contact?: string;
  mobile_no?: string;
  email?: string | null;
  work_place?: string | null;
  looking_for?: string | null;
  referral_source?: string | null;
  referral_details?: string | null;
  preferred_call_time?: string | null;
  status: EnquiryStatus;
  lead_temperature?: 'hot' | 'warm' | 'cold' | string;
  notes?: string | null;
  next_follow_up_at?: string | null;
  last_interaction_at?: string | null;
  linked_client_id?: string | null;
  created_at: string;
  organization_id?: string;
  organization?: {
    id?: string;
    name?: string;
    slug?: string;
    logo_url?: string;
  };
}

const PIPELINE_COLUMNS: { id: EnquiryStatus; label: string; color: string; badgeBg: string }[] = [
  { id: 'new', label: 'New Leads', color: 'border-t-blue-500', badgeBg: 'bg-blue-100 text-blue-700' },
  { id: 'contacted', label: 'Contacted / Follow-up', color: 'border-t-purple-500', badgeBg: 'bg-purple-100 text-purple-700' },
  { id: 'guest_booked', label: 'Session Booked', color: 'border-t-orange-500', badgeBg: 'bg-orange-100 text-orange-700' },
  { id: 'converted', label: 'Converted', color: 'border-t-emerald-500', badgeBg: 'bg-emerald-100 text-emerald-700' },
  { id: 'not_interested', label: 'Not Interested', color: 'border-t-slate-400', badgeBg: 'bg-slate-100 text-slate-700' },
];

export default function LeadsDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // View & Filter States
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | 'all' | 'due_today'>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [temperatureFilter, setTemperatureFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [interactionInitialChannel, setInteractionInitialChannel] = useState<"call" | "whatsapp">("call");
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  // Fetch enquiries
  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: ["enquiries", profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      const data = await apiFetch<Enquiry[]>(`/clients/enquiries/all`);
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  // Update Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: EnquiryStatus }) => {
      await apiFetch(`/clients/enquiries/${id}`, {
        method: 'PATCH',
        data: { status }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enquiries"] });
      toast({ title: "Status Updated", description: "Enquiry pipeline stage updated." });
    },
  });

  // 1-Click WhatsApp Direct Chat
  const handleOpenWhatsApp = (enquiry: Enquiry) => {
    const rawPhone = enquiry.contact || enquiry.mobile_no || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const internationalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const clientName = enquiry.name || enquiry.first_name || 'there';
    const requirement = enquiry.looking_for || 'Physical Therapy Consultation';

    const message = encodeURIComponent(
      `Hi ${clientName}, thank you for reaching out to ISHPO Clinic regarding ${requirement}! We would love to assist you. When would be a convenient time for a quick call or consultation?`
    );

    window.open(`https://wa.me/${internationalPhone}?text=${message}`, '_blank');

    // Automatically log WhatsApp touchpoint
    apiFetch(`/clients/enquiries/${enquiry.id}/interactions`, {
      method: 'POST',
      data: {
        interaction_type: 'whatsapp',
        response_text: `Initiated WhatsApp chat with prospective lead. Message template sent.`,
        metadata: { channel: 'whatsapp' }
      }
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["enquiry_interactions"] });
      toast({
        title: "WhatsApp Opened",
        description: `Chat opened with ${clientName}. Touchpoint recorded in timeline.`,
      });
    });
  };

  // 1-Click Call & Log
  const handleOpenCall = (enquiry: Enquiry) => {
    const rawPhone = enquiry.contact || enquiry.mobile_no || '';
    if (rawPhone) {
      window.location.href = `tel:${rawPhone.replace(/\s+/g, '')}`;
    }
    setSelectedEnquiry(enquiry);
    setInteractionInitialChannel("call");
    setIsInteractionModalOpen(true);
  };

  // 1-Click Guest Booking
  const handleScheduleGuest = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setIsBookModalOpen(true);
  };

  // 1-Click Convert Modal
  const handleOpenConvert = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setIsConvertModalOpen(true);
  };

  // 1-Click Reschedule Callback
  const handleOpenReschedule = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setIsRescheduleModalOpen(true);
  };

  // Extract distinct referral sources for filter dropdown
  const distinctSources = useMemo(() => {
    const set = new Set<string>();
    enquiries.forEach(e => {
      if (e.referral_source) set.add(e.referral_source);
    });
    return Array.from(set);
  }, [enquiries]);

  // Filtered Enquiries
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter(enq => {
      // Search
      const search = searchTerm.toLowerCase();
      const name = (enq.name || enq.first_name || '').toLowerCase();
      const contact = (enq.contact || enq.mobile_no || '');
      const req = (enq.looking_for || '').toLowerCase();
      const source = (enq.referral_source || '').toLowerCase();
      const matchesSearch = name.includes(search) || contact.includes(search) || req.includes(search) || source.includes(search);
      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter === 'due_today') {
        if (!enq.next_follow_up_at) return false;
        const dt = new Date(enq.next_follow_up_at);
        const isOverdue = isBefore(dt, startOfDay(new Date()));
        const dueToday = isToday(dt);
        if (!isOverdue && !dueToday) return false;
      } else if (statusFilter !== 'all' && enq.status !== statusFilter) {
        return false;
      }

      // Source filter
      if (sourceFilter !== 'all' && enq.referral_source !== sourceFilter) {
        return false;
      }

      // Temperature filter
      if (temperatureFilter !== 'all' && enq.lead_temperature !== temperatureFilter) {
        return false;
      }

      return true;
    });
  }, [enquiries, searchTerm, statusFilter, sourceFilter, temperatureFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredEnquiries.length === 0) {
      toast({ title: "No Leads to Export", description: "Adjust your filters to include leads." });
      return;
    }

    const headers = ["Lead Name", "Contact", "Email", "Service / Looking For", "Source", "Status", "Preferred Call Time", "Next Follow-Up", "Last Contacted", "Notes"];
    const rows = filteredEnquiries.map(e => [
      `"${e.name || e.first_name || ''}"`,
      `"${e.contact || e.mobile_no || ''}"`,
      `"${e.email || ''}"`,
      `"${e.looking_for || ''}"`,
      `"${e.referral_source || ''}"`,
      `"${e.status || ''}"`,
      `"${e.preferred_call_time || ''}"`,
      `"${e.next_follow_up_at ? format(new Date(e.next_follow_up_at), "yyyy-MM-dd HH:mm") : ''}"`,
      `"${e.last_interaction_at ? format(new Date(e.last_interaction_at), "yyyy-MM-dd HH:mm") : ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ishpo_leads_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Export Complete", description: `Exported ${filteredEnquiries.length} leads to CSV.` });
  };

  // Status Badge Component
  const getStatusBadge = (status: EnquiryStatus) => {
    switch (status) {
      case 'new': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none font-semibold text-[11px]">New</Badge>;
      case 'contacted': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none font-semibold text-[11px]">Contacted</Badge>;
      case 'guest_booked': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none font-semibold text-[11px]">Session Booked</Badge>;
      case 'converted': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none font-semibold text-[11px]">Converted</Badge>;
      case 'not_interested': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none font-semibold text-[11px]">Not Interested</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Temperature Pill
  const getTemperatureBadge = (temp?: string) => {
    if (temp === 'hot') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
          <Flame className="w-3 h-3 text-rose-500 fill-rose-500" /> Hot
        </span>
      );
    }
    if (temp === 'cold') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
          <Snowflake className="w-3 h-3 text-slate-400" /> Cold
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
        <Sun className="w-3 h-3 text-amber-500" /> Warm
      </span>
    );
  };

  // Callback SLA status helper
  const renderCallbackStatus = (enq: Enquiry) => {
    if (!enq.next_follow_up_at) {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => { e.stopPropagation(); handleOpenReschedule(enq); }}
          className="h-7 text-[11px] text-slate-400 hover:text-slate-700 font-medium hover:bg-slate-100 gap-1"
        >
          <Clock className="w-3 h-3" /> Set Callback
        </Button>
      );
    }

    const dt = new Date(enq.next_follow_up_at);
    const isPastDue = isBefore(dt, startOfDay(new Date()));
    const isDueToday = isToday(dt);

    if (isPastDue) {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); handleOpenReschedule(enq); }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors text-left"
        >
          <AlertCircle className="w-3 h-3 shrink-0 text-rose-600" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-tight leading-none text-rose-600">Overdue Call</span>
            <span className="text-[11px] font-bold leading-tight">{format(dt, "MMM d • h:mm a")}</span>
          </div>
        </button>
      );
    }

    if (isDueToday) {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); handleOpenReschedule(enq); }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors text-left"
        >
          <Clock className="w-3 h-3 shrink-0 text-amber-600" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-tight leading-none text-amber-600">Due Today</span>
            <span className="text-[11px] font-bold leading-tight">{format(dt, "h:mm a")}</span>
          </div>
        </button>
      );
    }

    return (
      <button
        onClick={(e) => { e.stopPropagation(); handleOpenReschedule(enq); }}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors text-left"
      >
        <CalendarDays className="w-3 h-3 shrink-0 text-slate-500" />
        <div className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-tight leading-none text-slate-400">Callback</span>
          <span className="text-[11px] font-bold leading-tight">{format(dt, "MMM d • h:mm a")}</span>
        </div>
      </button>
    );
  };

  // Compact Kanban Callback SLA Strip with Tooltip
  const renderKanbanCallbackStrip = (enq: Enquiry) => {
    if (!enq.next_follow_up_at) return null;

    const dt = new Date(enq.next_follow_up_at);
    const isPastDue = isBefore(dt, startOfDay(new Date()));
    const isDueToday = isToday(dt);

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenReschedule(enq); }}
            className={cn(
              "w-full flex items-center justify-between px-2 py-1 rounded-lg border text-left transition-colors",
              isPastDue 
                ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100" 
                : isDueToday 
                ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100" 
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            )}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Clock className={cn("w-3 h-3 shrink-0", isPastDue ? "text-rose-600" : isDueToday ? "text-amber-600" : "text-slate-500")} />
              <span className="text-[10px] font-bold uppercase tracking-tight truncate">
                {isPastDue ? "Overdue Call" : isDueToday ? "Due Today" : "Callback"}
              </span>
            </div>
            <span className="text-[10px] font-bold shrink-0 font-mono">
              {format(dt, isDueToday ? "h:mm a" : "MMM d • h:mm a")}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">Click to reschedule callback ({format(dt, "MMM d, yyyy • h:mm a")})</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  // Count callbacks due today / overdue
  const callbacksDueTodayCount = useMemo(() => {
    return enquiries.filter(e => {
      if (!e.next_follow_up_at) return false;
      const dt = new Date(e.next_follow_up_at);
      return isBefore(dt, startOfDay(new Date())) || isToday(dt);
    }).length;
  }, [enquiries]);

  return (
    <DashboardLayout role="crm">
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header with Title and Global Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Leads & Prospects CRM</h1>
              <Badge variant="outline" className="text-xs font-bold uppercase tracking-wider text-primary border-primary/30">
                Pipeline
              </Badge>
            </div>
            <p className="text-slate-500 mt-1">Track prospective physical therapy enquiries, schedule callbacks, and convert patients.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Share Form Button */}
            <Button 
              variant="outline" 
              onClick={() => setIsShareModalOpen(true)}
              className="gap-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs"
            >
              <Share2 className="w-4 h-4 text-primary" /> Share Form & QR
            </Button>

            {/* Form Settings / Editor Button */}
            <Button 
              variant="outline" 
              onClick={() => navigate('/crm/enquiry-form')}
              className="gap-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-600" /> Edit Enquiry Form
            </Button>

            {/* Log Manual Enquiry */}
            <Button 
              onClick={() => setIsLogModalOpen(true)} 
              className="gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-md font-semibold text-xs"
            >
              <Plus className="w-4 h-4" /> Log Manual Enquiry
            </Button>
          </div>
        </div>

        {/* Interactive Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* New Leads */}
          <Card 
            onClick={() => setStatusFilter(statusFilter === 'new' ? 'all' : 'new')}
            className={cn(
              "border-none shadow-xs cursor-pointer transition-all hover:scale-[1.02]",
              statusFilter === 'new' ? "ring-2 ring-blue-500 bg-blue-100/50" : "bg-blue-50/50"
            )}
          >
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-blue-600 flex items-center justify-between">
                <span>New Inquiries</span>
                <Sparkles className="w-3.5 h-3.5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-display font-bold text-blue-900">
                {enquiries.filter(e => e.status === 'new').length}
              </div>
              <p className="text-[10px] text-blue-600/80 font-medium mt-1">Awaiting first outreach</p>
            </CardContent>
          </Card>

          {/* Callbacks Due Today / Overdue */}
          <Card 
            onClick={() => setStatusFilter(statusFilter === 'due_today' ? 'all' : 'due_today')}
            className={cn(
              "border-none shadow-xs cursor-pointer transition-all hover:scale-[1.02]",
              statusFilter === 'due_today' ? "ring-2 ring-amber-500 bg-amber-100/50" : "bg-amber-50/50"
            )}
          >
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center justify-between">
                <span>Callbacks Due Today</span>
                <Clock className="w-3.5 h-3.5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-display font-bold text-amber-900">
                {callbacksDueTodayCount}
              </div>
              <p className="text-[10px] text-amber-700/80 font-medium mt-1">Today + overdue calls</p>
            </CardContent>
          </Card>

          {/* Sessions Booked */}
          <Card 
            onClick={() => setStatusFilter(statusFilter === 'guest_booked' ? 'all' : 'guest_booked')}
            className={cn(
              "border-none shadow-xs cursor-pointer transition-all hover:scale-[1.02]",
              statusFilter === 'guest_booked' ? "ring-2 ring-orange-500 bg-orange-100/50" : "bg-orange-50/50"
            )}
          >
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-orange-600 flex items-center justify-between">
                <span>Sessions Scheduled</span>
                <Calendar className="w-3.5 h-3.5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-3xl font-display font-bold text-orange-900">
                {enquiries.filter(e => e.status === 'guest_booked').length}
              </div>
              <p className="text-[10px] text-orange-600/80 font-medium mt-1">Evaluation booked</p>
            </CardContent>
          </Card>

          {/* Converted Clients & Rate */}
          <Card 
            onClick={() => setStatusFilter(statusFilter === 'converted' ? 'all' : 'converted')}
            className={cn(
              "border-none shadow-xs cursor-pointer transition-all hover:scale-[1.02]",
              statusFilter === 'converted' ? "ring-2 ring-emerald-500 bg-emerald-100/50" : "bg-emerald-50/50"
            )}
          >
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center justify-between">
                <span>Converted Clients</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-display font-bold text-emerald-900">
                  {enquiries.filter(e => e.status === 'converted').length}
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  {enquiries.length > 0 ? Math.round((enquiries.filter(e => e.status === 'converted').length / enquiries.length) * 100) : 0}% Conv.
                </span>
              </div>
              <p className="text-[10px] text-emerald-600/80 font-medium mt-1">Active patient profiles</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Workspace Card */}
        <Card className="border-none shadow-xl overflow-hidden rounded-2xl bg-white">
          {/* Workspace Toolbar: Search, Filters, View Switcher */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Universal Search */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Search name, phone, service..." 
                  className="pl-9 h-10 bg-slate-50 border-none shadow-inner text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                <SelectTrigger className="h-10 text-xs w-[160px] bg-slate-50 border-none">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="due_today">⚡ Callbacks Due</SelectItem>
                  <SelectItem value="new">New Inquiries</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="guest_booked">Session Booked</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                </SelectContent>
              </Select>

              {/* Referral Source Filter */}
              {distinctSources.length > 0 && (
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="h-10 text-xs w-[150px] bg-slate-50 border-none">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {distinctSources.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Lead Temperature Filter */}
              <Select value={temperatureFilter} onValueChange={(val) => setTemperatureFilter(val)}>
                <SelectTrigger className="h-10 text-xs w-[130px] bg-slate-50 border-none">
                  <SelectValue placeholder="Temperature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Intent</SelectItem>
                  <SelectItem value="hot">🔥 Hot Leads</SelectItem>
                  <SelectItem value="warm">🌤️ Warm Leads</SelectItem>
                  <SelectItem value="cold">❄️ Cold Leads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Right side tools: View Mode Switcher & Export */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="h-10 text-xs font-semibold gap-1.5 border-slate-200"
              >
                <Download className="w-3.5 h-3.5" /> Export
              </Button>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <Button
                  size="sm"
                  variant={viewMode === "table" ? "default" : "ghost"}
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "h-8 px-3 text-xs font-semibold gap-1.5 rounded-lg",
                    viewMode === "table" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <List className="w-3.5 h-3.5" /> Table
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "kanban" ? "default" : "ghost"}
                  onClick={() => setViewMode("kanban")}
                  className={cn(
                    "h-8 px-3 text-xs font-semibold gap-1.5 rounded-lg",
                    viewMode === "kanban" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" /> Kanban
                </Button>
              </div>
            </div>
          </div>
          
          <CardContent className="p-0">
            <TooltipProvider delayDuration={150}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading Pipeline...</p>
              </div>
            ) : filteredEnquiries.length === 0 ? (
              <div className="p-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Search className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">No leads match your criteria</h3>
                  <p className="text-xs text-slate-500">Try adjusting your search terms or filters.</p>
                </div>
              </div>
            ) : viewMode === "table" ? (
              /* ================= TABLE VIEW ================= */
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/60">
                    <TableRow className="hover:bg-transparent border-slate-100">
                      <TableHead className="font-bold text-[11px] uppercase tracking-wider h-11">Lead Details</TableHead>
                      <TableHead className="font-bold text-[11px] uppercase tracking-wider h-11">Requirement & Source</TableHead>
                      <TableHead className="font-bold text-[11px] uppercase tracking-wider h-11">Last Contacted</TableHead>
                      <TableHead className="font-bold text-[11px] uppercase tracking-wider h-11 text-center">Callback SLA</TableHead>
                      <TableHead className="font-bold text-[11px] uppercase tracking-wider h-11">Stage</TableHead>
                      <TableHead className="font-bold text-[11px] uppercase tracking-wider h-11 text-right">Quick Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEnquiries.map((enq) => (
                      <TableRow 
                        key={enq.id} 
                        className="group hover:bg-slate-50/80 transition-colors border-slate-100 h-18 cursor-pointer"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                          setSelectedEnquiry(enq);
                          setIsDetailsOpen(true);
                        }}
                      >
                        {/* Lead Name, Contact, Temperature */}
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900">
                                {enq.name || enq.first_name || 'Unknown Lead'}
                              </span>
                              {enq.status === 'new' && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                              {getTemperatureBadge(enq.lead_temperature)}
                            </div>
                            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                              <PhoneCall className="w-3 h-3 text-slate-400" /> {enq.contact || enq.mobile_no || 'No Contact'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Requirement & Source */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-800">{enq.looking_for || 'General Inquiry'}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                              Source: {enq.referral_source || 'Direct Web'}
                            </span>
                          </div>
                        </TableCell>

                        {/* Last Contacted */}
                        <TableCell>
                          {enq.last_interaction_at ? (
                            <div className="flex flex-col text-xs">
                              <span className="font-medium text-slate-700">
                                {formatDistanceToNow(new Date(enq.last_interaction_at), { addSuffix: true })}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {format(new Date(enq.last_interaction_at), "MMM d, h:mm a")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Never contacted</span>
                          )}
                        </TableCell>

                        {/* Callback SLA */}
                        <TableCell className="text-center">
                          {renderCallbackStatus(enq)}
                        </TableCell>

                        {/* Stage Badge */}
                        <TableCell>{getStatusBadge(enq.status)}</TableCell>

                        {/* Quick Actions (WhatsApp, Call, Schedule, Convert) */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5 pr-1">
                            {/* 1-Click WhatsApp Direct Chat */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                                  onClick={(e) => { e.stopPropagation(); handleOpenWhatsApp(enq); }}
                                >
                                  <MessageCircle className="w-4 h-4 fill-emerald-100" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Chat on WhatsApp</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* 1-Click Call & Log */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                                  onClick={(e) => { e.stopPropagation(); handleOpenCall(enq); }}
                                >
                                  <PhoneCall className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Call & Log Notes</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* 1-Click Schedule */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg"
                                  onClick={(e) => { e.stopPropagation(); handleScheduleGuest(enq); }}
                                >
                                  <Calendar className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Schedule Consultation Session</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* 1-Click Convert to Client */}
                            {enq.linked_client_id ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link to={`/admin/clients/${enq.linked_client_id}`} onClick={(e) => e.stopPropagation()}>
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8 text-[11px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1 px-2.5"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" /> Profile
                                    </Button>
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">View Patient Profile</p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-[11px] font-bold text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1 px-2.5"
                                    onClick={(e) => { e.stopPropagation(); handleOpenConvert(enq); }}
                                  >
                                    <UserPlus className="w-3.5 h-3.5" /> Convert
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">Convert Lead to Client</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                            
                            {/* Dropdown More */}
                            <DropdownMenu>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-8 w-8"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">More Actions</p>
                                </TooltipContent>
                              </Tooltip>
                              <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => { setSelectedEnquiry(enq); setIsDetailsOpen(true); }} className="gap-2 text-xs">
                                  <ExternalLink className="w-4 h-4 text-slate-500" />
                                  <span>View Lead Details & Timeline</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenReschedule(enq)} className="gap-2 text-xs">
                                  <Clock className="w-4 h-4 text-amber-500" />
                                  <span>Reschedule Callback</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: enq.id, status: 'converted' })} className="gap-2 text-xs">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  <span>Mark as Converted</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: enq.id, status: 'not_interested' })} className="gap-2 text-xs text-slate-600">
                                  <XCircle className="w-4 h-4 text-slate-400" />
                                  <span>Mark as Not Interested</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              /* ================= KANBAN BOARD VIEW ================= */
              <div className="p-4 sm:p-6 overflow-x-auto">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-w-[1050px]">
                  {PIPELINE_COLUMNS.map((col) => {
                    const colEnquiries = filteredEnquiries.filter(e => e.status === col.id);

                    return (
                      <div 
                        key={col.id} 
                        className={`bg-slate-50/70 rounded-2xl p-3 border border-slate-200/80 border-t-4 ${col.color} flex flex-col min-h-[500px]`}
                      >
                        {/* Column Header */}
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 px-1">
                          <h3 className="text-xs font-bold text-slate-800">{col.label}</h3>
                          <Badge variant="secondary" className={`text-[10px] font-bold ${col.badgeBg}`}>
                            {colEnquiries.length}
                          </Badge>
                        </div>

                        {/* Cards container */}
                        <div className="space-y-3 flex-1 overflow-y-auto">
                          {colEnquiries.map((enq) => (
                            <div 
                              key={enq.id}
                              onClick={() => { setSelectedEnquiry(enq); setIsDetailsOpen(true); }}
                              className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <div>
                                  <h4 className="font-bold text-xs text-slate-900 leading-tight">
                                    {enq.name || enq.first_name || 'Unknown Lead'}
                                  </h4>
                                  <span className="text-[11px] font-mono text-slate-500 mt-0.5 block">
                                    {enq.contact || enq.mobile_no}
                                  </span>
                                </div>
                                {getTemperatureBadge(enq.lead_temperature)}
                              </div>

                              <div className="space-y-1">
                                <Badge variant="outline" className="text-[10px] bg-slate-50 font-semibold text-slate-700 block truncate py-0.5">
                                  {enq.looking_for || 'General'}
                                </Badge>
                                {enq.referral_source && (
                                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">
                                    via {enq.referral_source}
                                  </span>
                                )}
                              </div>

                              {/* Callback SLA Strip if scheduled */}
                              {enq.next_follow_up_at && (
                                <div className="pt-1.5">
                                  {renderKanbanCallbackStrip(enq)}
                                </div>
                              )}

                              {/* Kanban Quick Action Buttons with Hover Tooltip Text Pop-ups */}
                              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-0.5">
                                {/* 1. WhatsApp Direct Chat */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg shrink-0"
                                      onClick={(e) => { e.stopPropagation(); handleOpenWhatsApp(enq); }}
                                    >
                                      <MessageCircle className="w-3.5 h-3.5 fill-emerald-100" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs">Chat on WhatsApp</p>
                                  </TooltipContent>
                                </Tooltip>

                                {/* 2. Phone Call & Log Notes */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg shrink-0"
                                      onClick={(e) => { e.stopPropagation(); handleOpenCall(enq); }}
                                    >
                                      <PhoneCall className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs">Call & Log Notes</p>
                                  </TooltipContent>
                                </Tooltip>

                                {/* 3. Schedule / Reschedule Callback */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className={cn(
                                        "h-7 w-7 p-0 rounded-lg shrink-0",
                                        enq.next_follow_up_at
                                          ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                          : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                      )}
                                      onClick={(e) => { e.stopPropagation(); handleOpenReschedule(enq); }}
                                    >
                                      <Clock className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs">{enq.next_follow_up_at ? "Reschedule Callback" : "Schedule Callback"}</p>
                                  </TooltipContent>
                                </Tooltip>

                                {/* 4. Book Consultation Session */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg shrink-0"
                                      onClick={(e) => { e.stopPropagation(); handleScheduleGuest(enq); }}
                                    >
                                      <Calendar className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs">Schedule Consultation Session</p>
                                  </TooltipContent>
                                </Tooltip>

                                {/* 5. Convert to Client Profile */}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    {enq.linked_client_id ? (
                                      <Link to={`/admin/clients/${enq.linked_client_id}`} onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg shrink-0"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </Button>
                                      </Link>
                                    ) : (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded-lg shrink-0"
                                        onClick={(e) => { e.stopPropagation(); handleOpenConvert(enq); }}
                                      >
                                        <UserPlus className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p className="text-xs">{enq.linked_client_id ? "View Patient Profile" : "Convert Lead to Client"}</p>
                                  </TooltipContent>
                                </Tooltip>

                                {/* 6. More Options Dropdown */}
                                <DropdownMenu>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg shrink-0"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreVertical className="w-3.5 h-3.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p className="text-xs">More Actions</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenuItem onClick={() => { setSelectedEnquiry(enq); setIsDetailsOpen(true); }} className="gap-2 text-xs">
                                      <ExternalLink className="w-4 h-4 text-slate-500" />
                                      <span>View Lead Details & Timeline</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleOpenReschedule(enq)} className="gap-2 text-xs">
                                      <Clock className="w-4 h-4 text-amber-500" />
                                      <span>Reschedule Callback</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: enq.id, status: 'converted' })} className="gap-2 text-xs">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                      <span>Mark as Converted</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: enq.id, status: 'not_interested' })} className="gap-2 text-xs text-slate-600">
                                      <XCircle className="w-4 h-4 text-slate-400" />
                                      <span>Mark as Not Interested</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}

                          {colEnquiries.length === 0 && (
                            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                              Empty stage
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </TooltipProvider>
          </CardContent>

          <div className="bg-slate-50/50 p-4 border-t border-slate-100 text-center">
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">
              ISHPO Physical Therapy Pipeline Management System
            </p>
          </div>
        </Card>
      </div>

      {/* Share Enquiry Form Modal */}
      <ShareEnquiryModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        orgSlug={profile?.organization_slug || (profile?.organization as { slug?: string } | null)?.slug}
        orgName={profile?.organization_name || profile?.organization?.name}
      />

      {/* Enquiry Form Settings & Questions Editor Modal */}
      <EnquiryFormSettingsModal
        open={isSettingsModalOpen}
        onOpenChange={setIsSettingsModalOpen}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["enquiries"] })}
      />

      {/* Convert Lead to Patient Modal */}
      <ConvertLeadModal
        open={isConvertModalOpen}
        onOpenChange={setIsConvertModalOpen}
        enquiry={selectedEnquiry}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["enquiries"] });
          setSelectedEnquiry(null);
        }}
      />

      {/* Reschedule Callback Modal */}
      {selectedEnquiry && (
        <RescheduleCallbackModal
          open={isRescheduleModalOpen}
          onOpenChange={setIsRescheduleModalOpen}
          enquiryId={selectedEnquiry.id}
          enquiryName={selectedEnquiry.name || selectedEnquiry.first_name || ""}
          currentCallbackDate={selectedEnquiry.next_follow_up_at}
        />
      )}

      {/* Log Interaction Modal */}
      {selectedEnquiry && (
        <InteractionModal 
          open={isInteractionModalOpen}
          onOpenChange={setIsInteractionModalOpen}
          enquiryId={selectedEnquiry.id}
          enquiryName={selectedEnquiry.name || selectedEnquiry.first_name || ""}
          enquiryContact={selectedEnquiry.contact || selectedEnquiry.mobile_no || ""}
          initialChannel={interactionInitialChannel}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["enquiries"] });
            queryClient.invalidateQueries({ queryKey: ["enquiry_interactions"] });
          }}
          onScheduleGuest={() => {
            setIsBookModalOpen(true);
          }}
        />
      )}

      {/* Guest Session Booking Modal */}
      {selectedEnquiry && (
        <AdminBookSessionModal 
          open={isBookModalOpen}
          onOpenChange={setIsBookModalOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["enquiries"] });
            setSelectedEnquiry(null);
          }}
          initialData={{
            isGuest: true,
            guestName: selectedEnquiry.name || selectedEnquiry.first_name || '',
            guestContact: selectedEnquiry.contact || selectedEnquiry.mobile_no || '',
            enquiryId: selectedEnquiry.id
          }}
        />
      )}

      {/* Log Manual Enquiry Modal */}
      <LogEnquiryModal 
        isOpen={isLogModalOpen} 
        onClose={() => setIsLogModalOpen(false)} 
      />

      {/* Lead Details Slide-Over (Sheet) with Full Timeline */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="border-b pb-5 mb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-lg uppercase shadow-xs">
                {(selectedEnquiry?.name || selectedEnquiry?.first_name || '?')?.[0]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-xl font-display font-bold text-slate-900">
                    {selectedEnquiry?.name || selectedEnquiry?.first_name}
                  </SheetTitle>
                  {getTemperatureBadge(selectedEnquiry?.lead_temperature)}
                </div>
                <SheetDescription className="flex items-center gap-2 mt-1 text-xs">
                  <PhoneCall className="w-3.5 h-3.5 text-slate-400" /> {selectedEnquiry?.contact || selectedEnquiry?.mobile_no}
                  <span className="mx-1 text-slate-300">|</span>
                  {selectedEnquiry && getStatusBadge(selectedEnquiry.status)}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-6">
            {/* Prominent Next-Action / Callback Callout Banner */}
            {selectedEnquiry?.next_follow_up_at ? (
              <div className={cn(
                "p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs",
                isBefore(new Date(selectedEnquiry.next_follow_up_at), startOfDay(new Date()))
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : isToday(new Date(selectedEnquiry.next_follow_up_at))
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              )}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>
                      {isBefore(new Date(selectedEnquiry.next_follow_up_at), startOfDay(new Date()))
                        ? "⚠️ Overdue Callback Required"
                        : isToday(new Date(selectedEnquiry.next_follow_up_at))
                        ? "⏰ Callback Scheduled for Today"
                        : "📅 Upcoming Callback Scheduled"}
                    </span>
                  </div>
                  <p className="text-sm font-bold">
                    {format(new Date(selectedEnquiry.next_follow_up_at), "EEEE, MMMM d • h:mm a")}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenReschedule(selectedEnquiry)}
                    className="h-8 text-xs font-semibold bg-white border-inherit"
                  >
                    Reschedule
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleOpenCall(selectedEnquiry)}
                    className="h-8 text-xs font-semibold bg-slate-900 text-white"
                  >
                    Call Now
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">No pending follow-up callback</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleOpenReschedule(selectedEnquiry)}
                  className="h-7 text-xs font-semibold gap-1"
                >
                  <Clock className="w-3 h-3" /> Schedule Callback
                </Button>
              </div>
            )}

            {/* Quick Action Toolbar inside Drawer */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedEnquiry && handleOpenWhatsApp(selectedEnquiry)}
                className="h-10 text-xs font-semibold gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedEnquiry && handleOpenCall(selectedEnquiry)}
                className="h-10 text-xs font-semibold gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <PhoneCall className="w-4 h-4" /> Call & Log
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedEnquiry && handleScheduleGuest(selectedEnquiry)}
                className="h-10 text-xs font-semibold gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50"
              >
                <Calendar className="w-4 h-4" /> Book Session
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedEnquiry && handleOpenConvert(selectedEnquiry)}
                className="h-10 text-xs font-semibold gap-1.5 border-emerald-300 bg-emerald-50/50 text-emerald-800 hover:bg-emerald-100"
              >
                <UserPlus className="w-4 h-4" /> Convert
              </Button>
            </div>

            {/* Enquiry Details Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Requirement</span>
                <p className="font-semibold text-xs text-slate-900">{selectedEnquiry?.looking_for || 'General Inquiry'}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Referral Source</span>
                <p className="font-semibold text-xs text-slate-900 uppercase">
                  {selectedEnquiry?.referral_source || 'Direct Web'}
                  {selectedEnquiry?.referral_details && (
                    <span className="block text-[10px] font-normal text-slate-500 normal-case mt-0.5 italic">
                      ({selectedEnquiry.referral_details})
                    </span>
                  )}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Preferred Callback Window</span>
                <p className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {selectedEnquiry?.preferred_call_time || 'Anytime'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Place of Work</span>
                <p className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  {selectedEnquiry?.work_place || '--'}
                </p>
              </div>
            </div>

            {/* Original Enquiry Notes */}
            {selectedEnquiry?.notes && (
              <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/60 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 block">
                  Original Intake Notes & Questions
                </span>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedEnquiry.notes}
                </p>
              </div>
            )}

            {/* Complete Interaction & Touchpoint History Timeline */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div>
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Activity & Conversation Timeline
                  </h3>
                  <p className="text-[11px] text-slate-400">Chronological history of calls, WhatsApp messages, and notes.</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-[11px] font-bold uppercase tracking-wider"
                  onClick={() => setIsInteractionModalOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Touchpoint
                </Button>
              </div>
              
              {selectedEnquiry && <EnquiryHistory enquiryId={selectedEnquiry.id} />}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
