import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter 
} from "@/components/ui/dialog";
import { 
    Bell, 
    Mail, 
    Smartphone, 
    UserPlus, 
    FileSpreadsheet, 
    CalendarCheck, 
    LifeBuoy, 
    CreditCard, 
    ArrowLeft,
    Loader2,
    Save,
    Sparkles,
    Clock,
    Send,
    CheckCircle2,
    AlertCircle,
    Play,
    UserCheck,
    MessageSquare,
    ShieldCheck,
    Stethoscope
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const ROLE_OPTIONS = [
    { id: "physiotherapist", label: "Physiotherapists" },
    { id: "consultant", label: "Consultants / Physicians" },
    { id: "sports_scientist", label: "Sports Scientists" },
    { id: "nutritionist", label: "Nutritionists" },
    { id: "coach", label: "S&C Coaches" }
];

const TIME_PRESETS = [
    { label: "18:00 (6:00 PM)", value: "18:00" },
    { label: "19:00 (7:00 PM)", value: "19:00", recommended: true },
    { label: "20:00 (8:00 PM)", value: "20:00" },
    { label: "21:00 (9:00 PM)", value: "21:00" }
];

export default function NotificationSettings() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [triggering, setTriggering] = useState(false);

    // Audit Test Results Modal
    const [auditModalOpen, setAuditModalOpen] = useState(false);
    const [auditResult, setAuditResult] = useState<any>(null);

    // Settings State
    const [settings, setSettings] = useState({
        enable_email_notifications: true,
        enable_in_app_notifications: true,
        notify_signup_approval: true,
        notify_questionnaire_assigned: true,
        notify_questionnaire_completed: true,
        notify_emergency_leave: true,
        notify_outstanding_balance: true,
        // Daily Session Reconciliation Control Center
        enable_eod_session_reminder: true,
        eod_reminder_time: "19:00",
        eod_reminder_channels: {
            email: true,
            teamcomms: true
        },
        eod_reminder_scope: {
            require_status_update: true,
            require_notes: true
        },
        eod_reminder_roles: [
            "physiotherapist",
            "consultant",
            "sports_scientist",
            "sports_physician",
            "coach"
        ],
        eod_last_run_at: null as string | null
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const data = await apiFetch<any>('/admin/settings/notifications');
            if (data) {
                // Ensure channels and scope are parsed objects
                let channels = { email: true, teamcomms: true };
                if (data.eod_reminder_channels) {
                    channels = typeof data.eod_reminder_channels === 'string'
                        ? JSON.parse(data.eod_reminder_channels)
                        : data.eod_reminder_channels;
                }

                let scope = { require_status_update: true, require_notes: true };
                if (data.eod_reminder_scope) {
                    scope = typeof data.eod_reminder_scope === 'string'
                        ? JSON.parse(data.eod_reminder_scope)
                        : data.eod_reminder_scope;
                }

                setSettings({
                    enable_email_notifications: data.enable_email_notifications ?? true,
                    enable_in_app_notifications: data.enable_in_app_notifications ?? true,
                    notify_signup_approval: data.notify_signup_approval ?? true,
                    notify_questionnaire_assigned: data.notify_questionnaire_assigned ?? true,
                    notify_questionnaire_completed: data.notify_questionnaire_completed ?? true,
                    notify_emergency_leave: data.notify_emergency_leave ?? true,
                    notify_outstanding_balance: data.notify_outstanding_balance ?? true,
                    enable_eod_session_reminder: data.enable_eod_session_reminder ?? true,
                    eod_reminder_time: data.eod_reminder_time || "19:00",
                    eod_reminder_channels: channels,
                    eod_reminder_scope: scope,
                    eod_reminder_roles: data.eod_reminder_roles || [
                        "physiotherapist",
                        "consultant",
                        "sports_scientist",
                        "sports_physician",
                        "coach"
                    ],
                    eod_last_run_at: data.eod_last_run_at || null
                });
            }
        } catch (error: any) {
            toast({
                title: "Failed to load settings",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (key: keyof typeof settings) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleChannelToggle = (channel: 'email' | 'teamcomms') => {
        setSettings(prev => ({
            ...prev,
            eod_reminder_channels: {
                ...prev.eod_reminder_channels,
                [channel]: !prev.eod_reminder_channels[channel]
            }
        }));
    };

    const handleScopeToggle = (rule: 'require_status_update' | 'require_notes') => {
        setSettings(prev => ({
            ...prev,
            eod_reminder_scope: {
                ...prev.eod_reminder_scope,
                [rule]: !prev.eod_reminder_scope[rule]
            }
        }));
    };

    const handleRoleToggle = (roleId: string) => {
        setSettings(prev => {
            const currentRoles = prev.eod_reminder_roles || [];
            const exists = currentRoles.includes(roleId);
            const updated = exists 
                ? currentRoles.filter(r => r !== roleId)
                : [...currentRoles, roleId];
            return {
                ...prev,
                eod_reminder_roles: updated
            };
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await apiFetch('/admin/settings/notifications', {
                method: 'PUT',
                body: settings
            });
            toast({
                title: "Settings Saved",
                description: "Notification system and session reconciliation settings updated successfully."
            });
        } catch (error: any) {
            toast({
                title: "Failed to save settings",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleTriggerAudit = async (isTestRun = true) => {
        try {
            setTriggering(true);
            const data = await apiFetch<any>('/admin/settings/notifications/trigger-eod-reminder', {
                method: 'POST',
                body: { isTestRun }
            });
            setAuditResult(data);
            setAuditModalOpen(true);
            if (!isTestRun) {
                setSettings(prev => ({ ...prev, eod_last_run_at: new Date().toISOString() }));
            }
        } catch (error: any) {
            toast({
                title: "Reconciliation Check Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setTriggering(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout role="admin">
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Loading Configuration...</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="admin">
            <div className="max-w-5xl mx-auto space-y-8 px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
                {/* Navigation Header */}
                <div className="flex items-center justify-between">
                    <button 
                        onClick={() => navigate("/admin/settings")}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-primary transition-colors group bg-transparent border-none cursor-pointer outline-none"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to settings
                    </button>
                    
                    <Button 
                        disabled={saving}
                        onClick={handleSave}
                        className="h-10 px-6 rounded-2xl bg-primary hover:bg-primary/95 text-white font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-primary/20 border-none cursor-pointer"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </Button>
                </div>

                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-lg shadow-primary/5">
                        <Bell className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            Notification System <span className="text-primary italic font-black uppercase text-xs bg-primary/10 px-3 py-1.5 rounded-full tracking-[0.2em] shadow-sm flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Core Connected</span>
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">Fine-tune notification channels, event routing, and automated shift-end reconciliation reminders.</p>
                    </div>
                </div>

                {/* Top Section: Channels & Event Alerts */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Channels */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Alert Channels</h3>
                            <p className="text-[11px] text-slate-500 leading-normal pl-1">Toggle the notification systems globally for the entire clinic network.</p>
                        </div>

                        <Card className="border-slate-100 rounded-[28px] shadow-sm bg-white overflow-hidden">
                            <div className="p-6 space-y-6">
                                {/* In-App Notifications */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0">
                                            <Smartphone className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <Label htmlFor="in-app" className="font-bold text-slate-800 text-sm cursor-pointer">In-App Messages</Label>
                                            <p className="text-[10px] text-slate-400 font-medium">Inside dashboards and mobile apps</p>
                                        </div>
                                    </div>
                                    <Switch 
                                        id="in-app"
                                        checked={settings.enable_in_app_notifications}
                                        onCheckedChange={() => handleToggle("enable_in_app_notifications")}
                                    />
                                </div>

                                {/* Email Notifications */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center shrink-0">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <Label htmlFor="email" className="font-bold text-slate-800 text-sm cursor-pointer">Email Delivery</Label>
                                            <p className="text-[10px] text-slate-400 font-medium">Automatic system emails to users</p>
                                        </div>
                                    </div>
                                    <Switch 
                                        id="email"
                                        checked={settings.enable_email_notifications}
                                        onCheckedChange={() => handleToggle("enable_email_notifications")}
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Right Column: Events */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Event-Based Alerts</h3>
                            <p className="text-[11px] text-slate-500 leading-normal pl-1">Route alert signals according to clinic milestones and administrative processes.</p>
                        </div>

                        <Card className="border-slate-100 rounded-[28px] shadow-sm bg-white overflow-hidden">
                            <div className="p-6 divide-y divide-slate-100 space-y-5">
                                {/* Signup & Approval Alerts */}
                                <div className="flex items-center justify-between gap-6 pt-0">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/5 text-orange-600 flex items-center justify-center shrink-0">
                                            <UserPlus className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-slate-800 text-sm">Signup & Approval Alerts</h4>
                                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Notify user-approval managers when a user requests access.</p>
                                        </div>
                                    </div>
                                    <Switch 
                                        checked={settings.notify_signup_approval}
                                        onCheckedChange={() => handleToggle("notify_signup_approval")}
                                    />
                                </div>

                                {/* Questionnaire Assigned */}
                                <div className="flex items-center justify-between gap-6 pt-5">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/5 text-indigo-600 flex items-center justify-center shrink-0">
                                            <FileSpreadsheet className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-slate-800 text-sm">Questionnaire Assigned</h4>
                                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Alert client/athlete only when a new questionnaire is distributed.</p>
                                        </div>
                                    </div>
                                    <Switch 
                                        checked={settings.notify_questionnaire_assigned}
                                        onCheckedChange={() => handleToggle("notify_questionnaire_assigned")}
                                    />
                                </div>

                                {/* Questionnaire Completed */}
                                <div className="flex items-center justify-between gap-6 pt-5">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-green-500/5 text-green-600 flex items-center justify-center shrink-0">
                                            <CalendarCheck className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-slate-800 text-sm">Questionnaire Completed</h4>
                                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Send an alert exclusively to the clinician who assigned the questionnaire.</p>
                                        </div>
                                    </div>
                                    <Switch 
                                        checked={settings.notify_questionnaire_completed}
                                        onCheckedChange={() => handleToggle("notify_questionnaire_completed")}
                                    />
                                </div>

                                {/* Emergency Leave Requests */}
                                <div className="flex items-center justify-between gap-6 pt-5">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-red-500/5 text-red-600 flex items-center justify-center shrink-0">
                                            <LifeBuoy className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-slate-800 text-sm">Emergency Leave Alerts</h4>
                                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Alert admins and managers immediately when staff request emergency leave.</p>
                                        </div>
                                    </div>
                                    <Switch 
                                        checked={settings.notify_emergency_leave}
                                        onCheckedChange={() => handleToggle("notify_emergency_leave")}
                                    />
                                </div>

                                {/* Outstanding Balance warnings */}
                                <div className="flex items-center justify-between gap-6 pt-5">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/5 text-amber-600 flex items-center justify-center shrink-0">
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-slate-800 text-sm">Outstanding Balance Alerts</h4>
                                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">Issue alert warnings to front desk and admins if a client has dues.</p>
                                        </div>
                                    </div>
                                    <Switch 
                                        checked={settings.notify_outstanding_balance}
                                        onCheckedChange={() => handleToggle("notify_outstanding_balance")}
                                    />
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>

                {/* ══════════════════════════════════════════════════════════════ */}
                {/* NEW: DAILY SESSION RECONCILIATION CONTROL CENTER               */}
                {/* ══════════════════════════════════════════════════════════════ */}
                <div className="space-y-4 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                                    Daily Session Reconciliation Control Center
                                </h3>
                                {settings.enable_eod_session_reminder ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-700 border border-teal-500/20">
                                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                                        Automated Daily at {settings.eod_reminder_time} IST
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                        Reminders Paused
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-normal pl-1">
                                Automatically send end-of-day reminders prompting practitioners to update session status and complete clinical SOAP documentation. Each practitioner receives direct links strictly for their own sessions.
                            </p>
                        </div>

                        {/* Last Run Info */}
                        {settings.eod_last_run_at && (
                            <div className="text-[11px] text-slate-400 font-medium sm:text-right shrink-0">
                                Last dispatched: <span className="font-bold text-slate-600">{new Date(settings.eod_last_run_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                            </div>
                        )}
                    </div>

                    <Card className="border-slate-200/80 rounded-[28px] shadow-sm bg-white overflow-hidden transition-all duration-300">
                        {/* Header Banner & Master Switch */}
                        <div className="p-6 bg-gradient-to-r from-slate-50 via-white to-teal-50/30 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-teal-600/10 text-teal-700 flex items-center justify-center shrink-0 shadow-sm">
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                        Shift-End Session Reconciliation Engine
                                    </h4>
                                    <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                                        Audits today's scheduled consultations & workouts across all practitioners, flagging uncompleted statuses or missing clinical notes.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 sm:self-center pl-16 sm:pl-0">
                                <Label htmlFor="eod-master-switch" className="text-xs font-bold uppercase tracking-wider text-slate-600 cursor-pointer">
                                    {settings.enable_eod_session_reminder ? "Active" : "Disabled"}
                                </Label>
                                <Switch 
                                    id="eod-master-switch"
                                    checked={settings.enable_eod_session_reminder}
                                    onCheckedChange={() => handleToggle("enable_eod_session_reminder")}
                                    className="data-[state=checked]:bg-teal-600"
                                />
                            </div>
                        </div>

                        {/* Settings Detail Grid */}
                        <div className={`p-6 space-y-8 transition-opacity duration-300 ${settings.enable_eod_session_reminder ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                
                                {/* 1. Dispatch Schedule */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-700 flex items-center justify-center shrink-0">
                                            <Clock className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-slate-800 text-sm">Scheduled Time</h5>
                                            <p className="text-[10px] text-slate-400 font-medium">Asia/Kolkata (Clinic Local Time)</p>
                                        </div>
                                    </div>

                                    {/* Preset Buttons */}
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        {TIME_PRESETS.map(preset => {
                                            const isSelected = settings.eod_reminder_time === preset.value;
                                            return (
                                                <button
                                                    key={preset.value}
                                                    type="button"
                                                    onClick={() => setSettings(prev => ({ ...prev, eod_reminder_time: preset.value }))}
                                                    className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center cursor-pointer ${
                                                        isSelected 
                                                            ? "bg-teal-600 text-white border-teal-600 shadow-sm" 
                                                            : "bg-slate-50 text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50/30"
                                                    }`}
                                                >
                                                    {preset.label}
                                                    {preset.recommended && !isSelected && (
                                                        <span className="block text-[9px] font-black uppercase text-teal-600 tracking-wider">Rec</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Custom Time Picker */}
                                    <div className="space-y-1.5 pt-1">
                                        <label className="text-[11px] font-bold text-slate-500">Custom Shift-End Time:</label>
                                        <input 
                                            type="time" 
                                            value={settings.eod_reminder_time}
                                            onChange={(e) => setSettings(prev => ({ ...prev, eod_reminder_time: e.target.value }))}
                                            className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                        />
                                    </div>
                                </div>

                                {/* 2. Delivery Channels */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-700 flex items-center justify-center shrink-0">
                                            <Send className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-slate-800 text-sm">Delivery Channels</h5>
                                            <p className="text-[10px] text-slate-400 font-medium">Where reminders are delivered</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-1">
                                        {/* Email Channel */}
                                        <div className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                                            <div className="flex gap-2.5">
                                                <Mail className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                                                <div className="space-y-0.5">
                                                    <span className="text-xs font-bold text-slate-800 block">Email Delivery</span>
                                                    <p className="text-[10px] text-slate-500 leading-tight">
                                                        Itemized HTML digest sent to clinician's registered email with direct action links.
                                                    </p>
                                                </div>
                                            </div>
                                            <Switch 
                                                checked={settings.eod_reminder_channels?.email ?? true}
                                                onCheckedChange={() => handleChannelToggle('email')}
                                                className="data-[state=checked]:bg-teal-600 shrink-0"
                                            />
                                        </div>

                                        {/* TeamComms Channel */}
                                        <div className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                                            <div className="flex gap-2.5">
                                                <MessageSquare className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                                                <div className="space-y-0.5">
                                                    <span className="text-xs font-bold text-slate-800 block">TeamComms HubBot</span>
                                                    <p className="text-[10px] text-slate-500 leading-tight">
                                                        Automated alert card in TeamComms messenger + desktop push notification.
                                                    </p>
                                                </div>
                                            </div>
                                            <Switch 
                                                checked={settings.eod_reminder_channels?.teamcomms ?? true}
                                                onCheckedChange={() => handleChannelToggle('teamcomms')}
                                                className="data-[state=checked]:bg-teal-600 shrink-0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Audit Rules & Conditions */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-700 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-slate-800 text-sm">Audit Conditions</h5>
                                            <p className="text-[10px] text-slate-400 font-medium">Triggers for reminder alerts</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pt-1">
                                        {/* Rule: Unfinalized Status */}
                                        <div className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                                            <div className="space-y-0.5">
                                                <span className="text-xs font-bold text-slate-800 block">Unfinalized Status</span>
                                                <p className="text-[10px] text-slate-500 leading-tight">
                                                    Sessions remaining in <em>Planned</em>, <em>Scheduled</em>, or <em>In Progress</em> status.
                                                </p>
                                            </div>
                                            <Switch 
                                                checked={settings.eod_reminder_scope?.require_status_update ?? true}
                                                onCheckedChange={() => handleScopeToggle('require_status_update')}
                                                className="data-[state=checked]:bg-teal-600 shrink-0"
                                            />
                                        </div>

                                        {/* Rule: Missing Notes */}
                                        <div className="flex items-start justify-between gap-3 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                                            <div className="space-y-0.5">
                                                <span className="text-xs font-bold text-slate-800 block">Missing Clinical Notes</span>
                                                <p className="text-[10px] text-slate-500 leading-tight">
                                                    Completed sessions where clinical/SOAP notes were left empty.
                                                </p>
                                            </div>
                                            <Switch 
                                                checked={settings.eod_reminder_scope?.require_notes ?? true}
                                                onCheckedChange={() => handleScopeToggle('require_notes')}
                                                className="data-[state=checked]:bg-teal-600 shrink-0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Target Practitioner Roles Filter */}
                            <div className="pt-4 border-t border-slate-100 space-y-3">
                                <div className="space-y-1">
                                    <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                                        Target Practitioner Departments & Roles
                                    </h5>
                                    <p className="text-[11px] text-slate-500">
                                        Reconciliation reminders are sent to clinicians holding these roles who have pending sessions scheduled today.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2 pt-1">
                                    {ROLE_OPTIONS.map(role => {
                                        const isSelected = (settings.eod_reminder_roles || []).includes(role.id);
                                        return (
                                            <button
                                                key={role.id}
                                                type="button"
                                                onClick={() => handleRoleToggle(role.id)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                                                    isSelected 
                                                        ? "bg-teal-50 text-teal-800 border-teal-300 shadow-2xs" 
                                                        : "bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300"
                                                }`}
                                            >
                                                {isSelected ? "✓ " : "+ "}{role.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Interactive Test / Instant Execution Bar */}
                            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-teal-50/20 -mx-6 -mb-6 p-6 rounded-b-[28px]">
                                <div className="space-y-0.5">
                                    <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-teal-600" />
                                        On-Demand Reconciliation Sweep
                                    </h5>
                                    <p className="text-xs text-slate-500">
                                        Test the reconciliation engine now to audit today's sessions and preview the exact notifications sent to staff.
                                    </p>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={triggering}
                                        onClick={() => handleTriggerAudit(true)}
                                        className="h-9 px-4 rounded-xl text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100 gap-1.5 cursor-pointer"
                                    >
                                        {triggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                                        Audit Preview (Test Run)
                                    </Button>

                                    <Button
                                        type="button"
                                        disabled={triggering}
                                        onClick={() => handleTriggerAudit(false)}
                                        className="h-9 px-4 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white gap-1.5 shadow-md shadow-teal-600/20 border-none cursor-pointer"
                                    >
                                        {triggering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                        Send Reminders Now
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* ══════════════════════════════════════════════════════════════ */}
                {/* AUDIT RESULTS MODAL                                            */}
                {/* ══════════════════════════════════════════════════════════════ */}
                <Dialog open={auditModalOpen} onOpenChange={setAuditModalOpen}>
                    <DialogContent className="max-w-2xl rounded-[28px] p-6 max-h-[85vh] overflow-y-auto">
                        <DialogHeader className="space-y-1.5">
                            <div className="flex items-center gap-2">
                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${auditResult?.is_test_run ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"}`}>
                                    {auditResult?.is_test_run ? "🧪" : "🚀"}
                                </span>
                                <DialogTitle className="text-xl font-display font-bold text-slate-900">
                                    {auditResult?.is_test_run ? "Reconciliation Audit Preview (Test Run)" : "Session Reconciliation Dispatched"}
                                </DialogTitle>
                            </div>
                            <DialogDescription className="text-xs text-slate-500">
                                Target Date: <strong className="text-slate-700">{auditResult?.target_date_formatted || auditResult?.target_date}</strong> • Clinic: {auditResult?.organization_name}
                            </DialogDescription>
                        </DialogHeader>

                        {auditResult && (
                            <div className="space-y-5 pt-3">
                                {/* Metric Cards */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                        <div className="text-2xl font-black text-slate-900">
                                            {auditResult.total_practitioners_with_pending ?? 0}
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                                            Practitioners Needing Attention
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                        <div className="text-2xl font-black text-teal-700">
                                            {auditResult.total_pending_sessions ?? 0}
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                                            Pending Sessions Today
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                                        <div className="text-2xl font-black text-indigo-700">
                                            {(auditResult.dispatched_counts?.email || 0) + (auditResult.dispatched_counts?.teamcomms || 0)}
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                                            Notifications {auditResult.is_test_run ? "Simulated" : "Sent"}
                                        </div>
                                    </div>
                                </div>

                                {/* Channel Breakdown */}
                                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-teal-50/50 border border-teal-100 text-xs">
                                    <div className="flex items-center gap-2 text-teal-900 font-bold">
                                        <Send className="w-4 h-4 text-teal-600" />
                                        Channel Status:
                                    </div>
                                    <div className="flex items-center gap-4 text-slate-600 text-xs font-medium">
                                        <span>✉️ Email: <strong>{auditResult.dispatched_counts?.email || 0}</strong> {auditResult.is_test_run ? "(Simulated)" : "Sent"}</span>
                                        <span>💬 TeamComms: <strong>{auditResult.dispatched_counts?.teamcomms || 0}</strong> Dispatched</span>
                                    </div>
                                </div>

                                {/* Practitioner Itemization */}
                                <div className="space-y-2">
                                    <h6 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        Affected Clinicians & Pending Work
                                    </h6>

                                    {auditResult.practitioners && auditResult.practitioners.length > 0 ? (
                                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden max-h-52 overflow-y-auto">
                                            {auditResult.practitioners.map((p: any, idx: number) => (
                                                <div key={p.practitioner_id || idx} className="p-3.5 bg-white flex items-center justify-between gap-4">
                                                    <div className="space-y-0.5">
                                                        <div className="font-bold text-slate-800 text-xs">{p.name}</div>
                                                        <div className="text-[11px] text-slate-400">{p.email || "No email on record"}</div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                            {p.pending_count} pending session{p.pending_count > 1 ? 's' : ''}
                                                        </span>
                                                        <span className="text-[10px] uppercase font-bold text-slate-400">
                                                            {p.teamcomms_status === 'sent' ? '✓ TeamComms' : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 text-center rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                                            <CheckCircle2 className="w-8 h-8 text-teal-600 mx-auto" />
                                            <div className="font-bold text-slate-800 text-sm">All Caught Up!</div>
                                            <p className="text-xs text-slate-500">
                                                No sessions today require status updates or missing clinical documentation.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-between sm:justify-end gap-2">
                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => setAuditModalOpen(false)}
                                className="rounded-xl text-xs font-bold"
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}
