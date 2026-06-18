import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
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
    Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotificationSettings() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Settings State
    const [settings, setSettings] = useState({
        enable_email_notifications: true,
        enable_in_app_notifications: true,
        notify_signup_approval: true,
        notify_questionnaire_assigned: true,
        notify_questionnaire_completed: true,
        notify_emergency_leave: true,
        notify_outstanding_balance: true
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const data = await apiFetch<any>('/admin/settings/notifications');
            if (data) {
                setSettings({
                    enable_email_notifications: data.enable_email_notifications,
                    enable_in_app_notifications: data.enable_in_app_notifications,
                    notify_signup_approval: data.notify_signup_approval,
                    notify_questionnaire_assigned: data.notify_questionnaire_assigned,
                    notify_questionnaire_completed: data.notify_questionnaire_completed,
                    notify_emergency_leave: data.notify_emergency_leave,
                    notify_outstanding_balance: data.notify_outstanding_balance
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

    const handleSave = async () => {
        try {
            setSaving(true);
            await apiFetch('/admin/settings/notifications', {
                method: 'PUT',
                body: settings
            });
            toast({
                title: "Settings Saved",
                description: "Notification settings updated successfully."
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
            <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
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
                        <p className="text-slate-500 text-sm font-medium">Fine-tune notification channels and manage alert routing across all departments.</p>
                    </div>
                </div>

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
            </div>
        </DashboardLayout>
    );
}
