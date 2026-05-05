import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, User, Key } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function OnboardOrganization() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState<any>(null);

    const [formData, setFormData] = useState({
        organization_name: "",
        organization_slug: "",
        contact_email: "",
        subscription_plan: "free",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSlugUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Generate a slug based on name if slug is empty
        const name = e.target.value;
        setFormData(prev => ({
            ...prev,
            organization_name: name,
            organization_slug: prev.organization_slug === "" ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : prev.organization_slug
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {

            
            const { data, error } = await supabase.functions.invoke('onboard-organization', {
                body: formData
            });

            if (error) {

                
                let errorMessage = error.message || "Failed to connect to the onboarding service.";
                
                // If the message is the generic one, add more context
                if (errorMessage.includes("non-2xx status code")) {
                    errorMessage = "The onboarding service encountered a server error. This usually means a record already exists or a database function is missing.";
                }
                
                throw new Error(errorMessage);
            }

            if (data?.success === false || data?.error) {

                throw new Error(data?.error || "An unknown error occurred during onboarding.");
            }

            setSuccessData(data);
            toast({ title: "Organization Onboarded", description: `${formData.organization_name} has been successfully created.` });
        } catch (err: any) {

            
            let displayMessage = err.message || "An unexpected error occurred.";
            
            // If the message is the generic one, add more context
            if (displayMessage.includes("non-2xx status code")) {
                displayMessage = "The onboarding service encountered an error. This usually means a record already exists or a database function is missing.";
            }

            toast({ 
                title: "Onboarding Failed", 
                description: displayMessage, 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    if (successData) {
        return (
            <DashboardLayout role="super_admin">
                <div className="max-w-2xl mx-auto space-y-6">
                    <div className="text-center space-y-4 mb-8">
                        <div className="w-16 h-16 bg-success/20 text-success rounded-full flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(var(--success),0.5)]">
                            <Building2 className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-display font-bold text-foreground">Organization Created</h2>
                        <p className="text-muted-foreground">The new tenant environment has been initialized.</p>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
                        <div>
                            <Label className="text-muted-foreground">Organization Name</Label>
                            <p className="text-lg font-medium">{successData.organization.name}</p>
                        </div>

                        <div className="p-4 bg-muted/50 rounded-lg border border-border">
                            <Label className="text-primary font-bold flex items-center gap-2 mb-2">
                                <Key className="w-4 h-4" />
                                Organization Code
                            </Label>
                            <p className="text-2xl font-mono tracking-widest">{successData.organization.org_code}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                                Provide this code to users who need to sign up independently.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="font-semibold text-foreground flex items-center gap-2">
                                <User className="w-4 h-4" /> Admin Account Check
                            </h4>
                            <p className="text-sm">
                                An invite has been sent to <strong>{successData.admin_email}</strong>.
                                They can also login using the following temporary credentials:
                            </p>
                            <div className="grid grid-cols-2 gap-4 bg-background p-4 rounded-lg border border-border">
                                <div>
                                    <Label>Email</Label>
                                    <p className="font-mono text-sm">{successData.admin_email}</p>
                                </div>
                                <div>
                                    <Label>Temporary Password</Label>
                                    <p className="font-mono text-sm">{successData.temp_password}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-8">
                        <Button onClick={() => navigate("/super-admin")} className="w-full sm:w-auto">
                            Return to Dashboard
                        </Button>
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout role="super_admin">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/super-admin")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-display font-bold text-foreground">Onboard Organization</h1>
                        <p className="text-muted-foreground mt-1">Create a new tenant workspace and admin account</p>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-border pb-2">
                                <Building2 className="w-5 h-5 text-primary" />
                                Organization Details
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="organization_name">Clinic / Organization Name <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="organization_name"
                                        name="organization_name"
                                        value={formData.organization_name}
                                        onChange={handleSlugUpdate}
                                        required
                                        placeholder="E.g. Peak Performance Clinic"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="organization_slug">URL Slug <span className="text-destructive">*</span></Label>
                                    <Input
                                        id="organization_slug"
                                        name="organization_slug"
                                        value={formData.organization_slug}
                                        onChange={handleChange}
                                        required
                                        placeholder="peak-performance"
                                    />
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="subscription_plan">Subscription Plan</Label>
                                    <select
                                        id="subscription_plan"
                                        name="subscription_plan"
                                        value={formData.subscription_plan}
                                        onChange={handleChange as any}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="free">Free Trial</option>
                                        <option value="starter">Starter</option>
                                        <option value="professional">Professional</option>
                                        <option value="enterprise">Enterprise</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-border pb-2">
                                <User className="w-5 h-5 text-primary" />
                                Admin Contact
                            </h3>

                            <div className="space-y-2">
                                <Label htmlFor="contact_email">Admin Email <span className="text-destructive">*</span></Label>
                                <Input
                                    id="contact_email"
                                    name="contact_email"
                                    type="email"
                                    value={formData.contact_email}
                                    onChange={handleChange}
                                    required
                                    placeholder="admin@clinic.com"
                                />
                                <p className="text-xs text-muted-foreground mt-1">This email will receive the admin account invite.</p>
                            </div>
                        </div>

                        <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                            {loading ? "Creating Instance..." : "Onboard Organization"}
                        </Button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
