import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, Save, Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";

const DAYS_OF_WEEK = [
    { id: 0, label: "Sunday" },
    { id: 1, label: "Monday" },
    { id: 2, label: "Tuesday" },
    { id: 3, label: "Wednesday" },
    { id: 4, label: "Thursday" },
    { id: 5, label: "Friday" },
    { id: 6, label: "Saturday" },
];

type ScheduleRow = {
    id?: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
    slot_duration_interval?: number | null;
    buffer_time: number;
};

export default function ConsultantAvailability() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [schedules, setSchedules] = useState<ScheduleRow[]>(DAYS_OF_WEEK.map(d => ({
        day_of_week: d.id,
        start_time: "09:00",
        end_time: "17:00",
        is_active: false,
        buffer_time: 0
    })));

    const [orgAllowCustom, setOrgAllowCustom] = useState(false);

    useEffect(() => {
        async function loadAvailability() {
            if (!profile?.organization_id || !profile?.id) return;
            try {
                // Fetch Org Settings
                const { data: orgSettings } = await supabase
                    .from("organization_settings")
                    .select("allow_custom_duration")
                    .eq("organization_id", profile.organization_id)
                    .maybeSingle();

                if (orgSettings) {
                    setOrgAllowCustom(!!orgSettings.allow_custom_duration);
                }

                // Fetch Consultant's Existing Schedule
                const { data: availData, error } = await supabase
                    .from("consultant_availability")
                    .select("*")
                    .eq("consultant_id", profile.id);

                if (error) throw error;

                if (availData && availData.length > 0) {
                    const loadedSchedules: ScheduleRow[] = DAYS_OF_WEEK.map(day => {
                        const existing = availData.find(a => a.day_of_week === day.id);
                        if (existing) {
                            return {
                                id: existing.id,
                                day_of_week: day.id,
                                start_time: existing.start_time.substring(0, 5), // '09:00:00' -> '09:00'
                                end_time: existing.end_time.substring(0, 5),
                                is_active: true,
                                slot_duration_interval: existing.slot_duration_interval,
                                buffer_time: existing.buffer_time
                            };
                        }
                        return {
                            day_of_week: day.id,
                            start_time: "09:00",
                            end_time: "17:00",
                            is_active: false,
                            buffer_time: 0
                        };
                    });
                    setSchedules(loadedSchedules);
                }
            } catch (err: any) {
                toast({ title: "Verification Failed", description: err.message, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        loadAvailability();
    }, [profile]);

    const handleToggleDay = (dayId: number, active: boolean) => {
        setSchedules(prev => prev.map(s => s.day_of_week === dayId ? { ...s, is_active: active } : s));
    };

    const handleTimeChange = (dayId: number, field: 'start_time' | 'end_time', value: string) => {
        setSchedules(prev => prev.map(s => s.day_of_week === dayId ? { ...s, [field]: value } : s));
    };

    const handleDurationChange = (dayId: number, value: string) => {
        const valObj = value === "default" ? null : parseInt(value, 10);
        setSchedules(prev => prev.map(s => s.day_of_week === dayId ? { ...s, slot_duration_interval: valObj } : s));
    };

    const handleSave = async () => {
        if (!profile?.organization_id || !profile?.id) return;
        setSaving(true);
        try {
            // 1. Delete all existing records for this consultant
            const { error: deleteError } = await supabase
                .from("consultant_availability")
                .delete()
                .eq("consultant_id", profile.id);

            if (deleteError) throw deleteError;

            // 2. Insert new active ones
            const inserts = schedules.filter(s => s.is_active).map(s => ({
                organization_id: profile.organization_id,
                consultant_id: profile.id,
                day_of_week: s.day_of_week,
                start_time: `${s.start_time}:00`,
                end_time: `${s.end_time}:00`,
                slot_duration_interval: orgAllowCustom ? s.slot_duration_interval : null,
                buffer_time: s.buffer_time
            }));

            if (inserts.length > 0) {
                const { error: insertError } = await supabase
                    .from("consultant_availability")
                    .insert(inserts);
                if (insertError) throw insertError;
            }

            toast({ title: "Schedule Saved", description: "Your weekly availability has been successfully updated." });
        } catch (err: any) {
            toast({ title: "Failed to Save", description: err.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <DashboardLayout role="consultant">
            <div className="space-y-6 max-w-5xl mx-auto pb-10">
                <div>
                    <h1 className="text-2xl font-display font-bold text-foreground">My Availability</h1>
                    <p className="text-muted-foreground text-sm mt-1">Define your recurring weekly schedule and time boundaries</p>
                </div>

                <Card className="gradient-card border-border">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                            Weekly Working Hours
                        </CardTitle>
                        <CardDescription>Toggle the days you are available and set your working shifts.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        {loading ? (
                            <p className="text-sm text-muted-foreground">Loading your schedule...</p>
                        ) : (
                            <div className="space-y-4">
                                {schedules.map((schedule) => {
                                    const dayName = DAYS_OF_WEEK.find(d => d.id === schedule.day_of_week)?.label;
                                    return (
                                        <div key={schedule.day_of_week} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border border-border rounded-lg bg-background group hover:border-primary/50 transition-colors">
                                            <div className="flex items-center gap-4 min-w-[150px]">
                                                <Switch
                                                    checked={schedule.is_active}
                                                    onCheckedChange={(v) => handleToggleDay(schedule.day_of_week, v)}
                                                />
                                                <Label className={`text-base font-medium ${!schedule.is_active && 'text-muted-foreground'}`}>{dayName}</Label>
                                            </div>

                                            {schedule.is_active ? (
                                                <div className="flex flex-wrap items-center gap-4 flex-1 animate-in fade-in zoom-in duration-200">
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="time"
                                                            value={schedule.start_time}
                                                            onChange={e => handleTimeChange(schedule.day_of_week, 'start_time', e.target.value)}
                                                            className="w-[120px]"
                                                        />
                                                        <span className="text-muted-foreground">to</span>
                                                        <Input
                                                            type="time"
                                                            value={schedule.end_time}
                                                            onChange={e => handleTimeChange(schedule.day_of_week, 'end_time', e.target.value)}
                                                            className="w-[120px]"
                                                        />
                                                    </div>

                                                    {orgAllowCustom && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-muted-foreground">Duration:</span>
                                                            <Select
                                                                value={schedule.slot_duration_interval ? schedule.slot_duration_interval.toString() : "default"}
                                                                onValueChange={(v) => handleDurationChange(schedule.day_of_week, v)}
                                                            >
                                                                <SelectTrigger className="w-[130px] h-9">
                                                                    <SelectValue placeholder="Org Default" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="default">Org Default</SelectItem>
                                                                    <SelectItem value="15">15 mins</SelectItem>
                                                                    <SelectItem value="30">30 mins</SelectItem>
                                                                    <SelectItem value="45">45 mins</SelectItem>
                                                                    <SelectItem value="60">60 mins</SelectItem>
                                                                    <SelectItem value="90">90 mins</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground flex-1 italic">Unavailable</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="bg-muted/30 border-t border-border mt-6 py-4 flex justify-end">
                        <Button onClick={handleSave} disabled={loading || saving} className="gap-2">
                            <Save className="w-4 h-4" />
                            {saving ? "Saving..." : "Save Weekly Schedule"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </DashboardLayout>
    );
}
