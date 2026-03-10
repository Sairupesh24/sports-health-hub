import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, Save, Settings } from "lucide-react";

export default function AdminAvailability({ hideLayout = false }: { hideLayout?: boolean }) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allowCustom, setAllowCustom] = useState(false);
    const [defaultDuration, setDefaultDuration] = useState("60");

    useEffect(() => {
        async function loadSettings() {
            if (!profile?.organization_id) return;
            try {
                const { data, error } = await supabase
                    .from("organization_settings")
                    .select("allow_custom_duration, default_slot_duration")
                    .eq("organization_id", profile.organization_id)
                    .maybeSingle();

                if (error) throw error;
                if (data) {
                    setAllowCustom(!!data.allow_custom_duration);
                    setDefaultDuration(data.default_slot_duration?.toString() || "60");
                }
            } catch (err: any) {
                toast({ title: "Failed to load settings", description: err.message, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, [profile]);

    const handleSave = async () => {
        if (!profile?.organization_id) return;
        setSaving(true);
        try {
            const durationNum = parseInt(defaultDuration, 10);
            if (isNaN(durationNum) || durationNum < 5 || durationNum > 480) {
                throw new Error("Default slot duration must be a valid number between 5 and 480 minutes.");
            }

            const { error } = await supabase
                .from("organization_settings")
                .upsert({
                    organization_id: profile.organization_id,
                    allow_custom_duration: allowCustom,
                    default_slot_duration: durationNum,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            toast({ title: "Settings Saved", description: "Organization scheduling preferences updated successfully." });
        } catch (err: any) {
            toast({ title: "Error Saving", description: err.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const content = (
        <div className={`space-y-6 max-w-4xl mx-auto ${hideLayout ? 'pb-2' : 'pb-10'}`}>
            <div>
                <h1 className="text-2xl font-display font-bold text-foreground">Organization Availability</h1>
                <p className="text-muted-foreground text-sm mt-1">Manage global duration settings and oversee consultant schedules</p>
            </div>

            <Card className="gradient-card border-border">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary" />
                        Global Appointment Settings
                    </CardTitle>
                    <CardDescription>Configure how appointment durations are calculated across your clinic.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-4">
                    {loading ? (
                        <p className="text-sm text-muted-foreground">Loading settings...</p>
                    ) : (
                        <>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-border rounded-lg bg-muted/20">
                                <div className="space-y-1 max-w-lg">
                                    <Label className="text-base">Allow Custom Consultant Durations</Label>
                                    <p className="text-sm text-muted-foreground">
                                        If enabled, Consultants can freely define their own specific appointment durations (e.g., 15 mins for Checkups, 45 mins for Rehab).
                                        If disabled, all appointments mathematically lock into the global firm default.
                                    </p>
                                </div>
                                <Switch
                                    checked={allowCustom}
                                    onCheckedChange={setAllowCustom}
                                />
                            </div>

                            {!allowCustom && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-border rounded-lg bg-muted/20 animate-in fade-in zoom-in duration-200">
                                    <div className="space-y-1">
                                        <Label className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> Global Default Duration</Label>
                                        <p className="text-sm text-muted-foreground">Since custom durations are disabled, every calendar block generated by the system will be exactly this length (in minutes).</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min="5"
                                            max="480"
                                            className="w-24 font-mono text-center"
                                            value={defaultDuration}
                                            onChange={e => setDefaultDuration(e.target.value)}
                                        />
                                        <span className="text-sm font-medium text-foreground">mins</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
                <CardFooter className="bg-muted/30 border-t border-border mt-6 py-4 flex justify-end">
                    <Button onClick={handleSave} disabled={loading || saving} className="gap-2">
                        <Save className="w-4 h-4" />
                        {saving ? "Saving..." : "Save Configuration"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );

    if (hideLayout) return content;

    return (
        <DashboardLayout role="admin">
            {content}
        </DashboardLayout>
    );
}
