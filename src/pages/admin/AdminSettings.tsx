import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Settings, 
    ChevronRight, 
    Layers, 
    Users, 
    ShieldCheck, 
    LayoutGrid,
    Bell,
    Clock,
    Activity
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SettingItem {
    id: string;
    title: string;
    description: string;
    icon: any;
    href: string;
    category: "Clinical" | "Organization" | "System";
    isActive: boolean;
}

const SETTINGS_ITEMS: SettingItem[] = [
    {
        id: "service-mapping",
        title: "Service Mapping",
        description: "Configure which specialists are qualified for each clinical service.",
        icon: Layers,
        href: "/admin/settings/services",
        category: "Clinical",
        isActive: true
    },
    {
        id: "injury-master-data",
        title: "Injury Master Data",
        description: "Bulk upload or configure custom injury regions, types, and diagnoses.",
        icon: Activity,
        href: "/admin/settings/injuries",
        category: "Clinical",
        isActive: true
    },
    {
        id: "resource-schedule",
        title: "Resource Schedule Manager",
        description: "Configure custom working hours and break schedules for each clinician.",
        icon: Clock,
        href: "/admin/settings/resource-schedule",
        category: "Clinical",
        isActive: true
    },
    {
        id: "roles-permissions",
        title: "Roles & Permissions",
        description: "Define custom access permissions and calendar visibility for staff.",
        icon: ShieldCheck,
        href: "/admin/settings/permissions",
        category: "System",
        isActive: true
    },
    {
        id: "notifications",
        title: "Notification Settings",
        description: "Configure automated email and push notifications.",
        icon: Bell,
        href: "/admin/settings/notifications",
        category: "System",
        isActive: true
    }
];

export default function AdminSettings() {
    const navigate = useNavigate();

    const categories = Array.from(new Set(SETTINGS_ITEMS.map(item => item.category)));

    return (
        <DashboardLayout role="admin">
            <div className="max-w-5xl mx-auto space-y-8 px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Settings className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Organization Settings</h1>
                        <p className="text-muted-foreground text-sm">Centralized control for clinical workflows and system configuration.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {categories.map(category => (
                        <div key={category} className="space-y-4">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                                {category} Settings
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {SETTINGS_ITEMS.filter(item => item.category === category).map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => item.isActive && navigate(item.href)}
                                        disabled={!item.isActive}
                                        className={cn(
                                            "group text-left p-6 rounded-[32px] border-2 transition-all duration-300 relative overflow-hidden",
                                            item.isActive 
                                                ? "bg-white border-slate-50 hover:border-primary hover:shadow-xl hover:shadow-primary/5 active:scale-[0.98]" 
                                                : "bg-slate-50 border-slate-100 opacity-60 grayscale cursor-not-allowed"
                                        )}
                                    >
                                        <div className="flex items-start justify-between relative z-10">
                                            <div className="space-y-3">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                                                    item.isActive ? "bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white" : "bg-slate-200 text-slate-400"
                                                )}>
                                                    <item.icon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900">{item.title}</h3>
                                                    <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">{item.description}</p>
                                                </div>
                                            </div>
                                            {item.isActive ? (
                                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                            ) : (
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-200 px-2 py-1 rounded-md">Soon</span>
                                            )}
                                        </div>
                                        
                                        {/* Background Decoration */}
                                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardLayout>
    );
}
