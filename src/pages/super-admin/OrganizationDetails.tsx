import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
    Users, 
    Lock, 
    MapPin, 
    ShieldCheck, 
    Globe, 
    ArrowLeft, 
    Building, 
    Activity, 
    Copy, 
    CheckCircle, 
    XCircle,
    X,
    Package,
    Palette,
    Upload,
    Phone,
    Mail,
    AlertCircle,
    Check,
    MessageSquare,
    Plus,
    Trash2,
    Loader2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import OrganizationPackages from "./OrganizationPackages";
import OrganizationInjuries from "./OrganizationInjuries";
import OrganizationUsers from "./OrganizationUsers";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter 
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


type Organization = Database['public']['Tables']['organizations']['Row'] & {
    location_count?: number;
    consultant_count?: number;
    client_count?: number;
    enquiry_form_config?: any;
};


export default function OrganizationDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [org, setOrg] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    
    // New States for Identity Engine
    const [prefix, setPrefix] = useState("");
    const [isPrefixAvailable, setIsPrefixAvailable] = useState<boolean | null>(null);
    const [checkingPrefix, setCheckingPrefix] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [logoAspect, setLogoAspect] = useState(1);

    useEffect(() => {
        if (id) fetchOrganization();
    }, [id]);

    const fetchOrganization = async () => {
        if (!id) return;
        try {
            setLoading(true);
            
            // Fetch basic org data directly to ensure we get the latest columns (lat/long/etc)
            // as RPCs can sometimes lag in schema cache
            const { data: directData, error: directErr } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', id)
                .single();

            if (directErr) throw directErr;

            // Still call RPC for the aggregate counts (location_count, etc)
            const { data: orgsData, error: orgsErr } = await supabase.rpc('get_platform_organizations');
            
            if (directData) {
                const aggregateData = orgsData?.find((o: any) => o.id === id);
                setOrg({
                    ...directData,
                    location_count: aggregateData?.location_count || 0,
                    consultant_count: aggregateData?.consultant_count || 0,
                    client_count: aggregateData?.client_count || 0
                });
                if (directData.uhid_prefix) {
                    setPrefix(directData.uhid_prefix);
                    setIsPrefixAvailable(true);
                } else {
                    // Reset availability if no prefix set
                    setIsPrefixAvailable(null);
                }
            } else {
                toast({ title: "Not Found", description: "Organization not found.", variant: "destructive" });
                navigate("/super-admin");
            }
        } catch (err: unknown) {
            const error = err as Error;
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!id || updating) return;
        try {
            setUpdating(true);
            const { error: updateErr } = await supabase.rpc('update_organization_status', { 
                p_org_id: id, 
                p_status: newStatus 
            });
            if (updateErr) throw updateErr;

            setOrg(prev => prev ? { ...prev, status: newStatus } : null);
            toast({ title: "Status Updated", description: `Organization is now ${newStatus}.` });
        } catch (err: unknown) {
            const error = err as Error;
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        } finally {
            setUpdating(false);
        }
    };

    const handleCopyCode = () => {
        if (org?.org_code) {
            navigator.clipboard.writeText(org.org_code);
            toast({ title: "Code Copied", description: "Organization code copied to clipboard." });
        }
    };

    const handleUpdateSettings = async (settings: Partial<Organization>) => {
        if (!id || updating || !org) return;
        try {
            setUpdating(true);
            const updatedOrg = { ...org, ...settings };
            
            const { error: updateErr } = await supabase
                .from('organizations')
                .update({
                    clinic_latitude: updatedOrg.clinic_latitude ?? org.clinic_latitude,
                    clinic_longitude: updatedOrg.clinic_longitude ?? org.clinic_longitude,
                    geofence_radius: updatedOrg.geofence_radius ?? org.geofence_radius,
                    enable_geofencing: updatedOrg.enable_geofencing ?? org.enable_geofencing,
                    official_name: updatedOrg.official_name ?? org.official_name,
                    official_address: updatedOrg.official_address ?? org.official_address,
                    contact_email: updatedOrg.contact_email ?? org.contact_email,
                    contact_phone: updatedOrg.contact_phone ?? org.contact_phone,
                    enquiry_form_config: updatedOrg.enquiry_form_config ?? org.enquiry_form_config
                })
                .eq('id', id);

            if (updateErr) throw updateErr;

            setOrg(updatedOrg);
            toast({ title: "Settings Saved", description: "Clinic updated successfully." });
        } catch (err: unknown) {
            const error = err as Error;
            toast({ title: "Save Failed", description: error.message, variant: "destructive" });
        } finally {
            setUpdating(false);
        }
    };

    const checkPrefixAvailability = async (val: string) => {
        if (!val || val.length < 3) {
            setIsPrefixAvailable(null);
            return;
        }
        
        setCheckingPrefix(true);
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('id')
                .eq('uhid_prefix', val.toUpperCase())
                .neq('id', id || '')
                .maybeSingle();
                
            if (error) throw error;
            setIsPrefixAvailable(!data);
        } catch (err: any) {
            console.error("Prefix check failed:", err);
            setIsPrefixAvailable(null);
            // If the error is that the column doesn't exist, it's a migration issue
            if (err.message?.includes('column "uhid_prefix" does not exist')) {
                toast({ 
                    title: "System Update Required", 
                    description: "Please run the SQL migration to add branding support.",
                    variant: "destructive"
                });
            }
        } finally {
            setCheckingPrefix(false);
        }
    };

    const handleSavePrefix = async () => {
        if (!id || !prefix || !isPrefixAvailable) return;
        
        try {
            setUpdating(true);
            const { error } = await supabase
                .from('organizations')
                .update({ uhid_prefix: prefix.toUpperCase() })
                .eq('id', id);
                
            if (error) throw error;
            
            setOrg(org ? { ...org, uhid_prefix: prefix.toUpperCase() } : null);
            setShowConfirmModal(false);
            toast({ title: "Prefix Locked", description: `UHID Prefix set to ${prefix.toUpperCase()} definitively.` });
        } catch (err: any) {
            toast({ title: "Lock Failed", description: err.message, variant: "destructive" });
        } finally {
            setUpdating(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        // Limit to images
        if (!file.type.startsWith('image/')) {
            toast({ title: "Invalid File", description: "Please upload an image file.", variant: "destructive" });
            return;
        }

        try {
            setUploadingLogo(true);
            setUploadProgress(10);
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${id}_${Date.now()}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            setUploadProgress(30);
            const { error: uploadError } = await supabase.storage
                .from('clinic-logos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            setUploadProgress(70);
            const { data: { publicUrl } } = supabase.storage
                .from('clinic-logos')
                .getPublicUrl(filePath);

            const { error: updateErr } = await supabase
                .from('organizations')
                .update({ logo_url: publicUrl })
                .eq('id', id);

            if (updateErr) throw updateErr;

            setOrg(org ? { ...org, logo_url: publicUrl } : null);
            setUploadProgress(100);
            toast({ title: "Logo Updated", description: "Clinic logo has been updated successfully." });
        } catch (err: any) {
            toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
        } finally {
            setTimeout(() => {
                setUploadingLogo(false);
                setUploadProgress(0);
            }, 500);
        }
    };

    function LocationPicker({ lat, lng, onChange }: { lat: number, lng: number, onChange: (lat: number, lng: number) => void }) {
        const map = useMapEvents({
            click(e) {
                onChange(e.latlng.lat, e.latlng.lng);
            },
        });

        return <Marker position={[lat, lng]} />;
    }


    if (loading) {
        return (
            <DashboardLayout role="super_admin">
                <div className="flex items-center justify-center h-64 text-muted-foreground">Loading details...</div>
            </DashboardLayout>
        );
    }

    if (!org) return null;

    return (
        <DashboardLayout role="super_admin">
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                        <Building className="w-32 h-32" />
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <Button variant="ghost" size="icon" onClick={() => navigate("/super-admin")} className="shrink-0">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border shadow-inner">
                                {org.logo_url ? (
                                    <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Building className="w-8 h-8 text-muted-foreground" />
                                )}
                            </div>
                            
                            <div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h1 className="text-3xl font-display font-bold text-foreground">{org.name}</h1>
                                    <Badge variant={org.status === 'active' ? 'default' : 'destructive'} className="capitalize px-3 py-1">
                                        {org.status}
                                    </Badge>
                                    {org.uhid_prefix && (
                                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 flex gap-1.5 items-center px-3 py-1 font-bold tracking-wider">
                                            <Lock className="w-3 h-3" />
                                            {org.uhid_prefix}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> ID: {org.id.substring(0, 8)}</span>
                                    <span>•</span>
                                    <span>Joined {new Date(org.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={handleCopyCode} className="bg-background">
                            <Copy className="w-4 h-4 mr-2" />
                            Code: {org.org_code}
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="mb-8 p-1 bg-muted/50 border border-border rounded-xl">
                        <TabsTrigger value="overview" className="flex gap-2 items-center px-5 py-2.5 rounded-lg data-[state=active]:shadow-sm">
                            <Activity className="w-4 h-4" /> Overview
                        </TabsTrigger>
                        <TabsTrigger value="branding" className="flex gap-2 items-center px-5 py-2.5 rounded-lg data-[state=active]:shadow-sm">
                            <Palette className="w-4 h-4" /> Branding
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="flex gap-2 items-center px-5 py-2.5 rounded-lg data-[state=active]:shadow-sm">
                            <Building className="w-4 h-4" /> Org Details
                        </TabsTrigger>
                        <TabsTrigger value="packages" className="flex gap-2 items-center px-5 py-2.5 rounded-lg data-[state=active]:shadow-sm">
                            <Package className="w-4 h-4" /> Services
                        </TabsTrigger>
                        <TabsTrigger value="users" className="flex gap-2 items-center px-5 py-2.5 rounded-lg data-[state=active]:shadow-sm">
                            <Users className="w-4 h-4" /> Users
                        </TabsTrigger>
                        <TabsTrigger value="security" className="flex gap-2 items-center px-5 py-2.5 rounded-lg data-[state=active]:shadow-sm">
                            <ShieldCheck className="w-4 h-4" /> Geofencing
                        </TabsTrigger>
                        <TabsTrigger value="enquiry" className="flex gap-2 items-center px-5 py-2.5 rounded-lg data-[state=active]:shadow-sm">
                            <MessageSquare className="w-4 h-4" /> Enquiry Form
                        </TabsTrigger>
                    </TabsList>


                    <TabsContent value="overview">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                {/* UHID Prefix Card */}
                                <div className="rounded-xl border border-border bg-card p-6 border-l-4 border-l-primary">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                                            <ShieldCheck className="w-5 h-5 text-primary" />
                                            Multi-Tenant Identity Engine
                                        </h3>
                                        {org.uhid_prefix && (
                                            <Badge className="bg-success/10 text-success border-success/20 flex gap-1 items-center">
                                                <CheckCircle className="w-3 h-3" /> Locked
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="prefix" className="text-sm font-semibold mb-1.5 block">Organization UHID Prefix</Label>
                                            <div className="flex gap-2 relative">
                                                <div className="relative flex-1">
                                                    <Input 
                                                        id="prefix"
                                                        value={prefix}
                                                        onChange={(e) => {
                                                            const val = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4);
                                                            setPrefix(val);
                                                            checkPrefixAvailability(val);
                                                        }}
                                                        disabled={!!org?.uhid_prefix || updating}
                                                        placeholder="e.g. CSH"
                                                        className={cn(
                                                            "font-bold tracking-widest uppercase h-10 transition-all",
                                                            isPrefixAvailable === true && !org?.uhid_prefix && "border-green-500 bg-green-500/5 focus-visible:ring-green-500 pr-10",
                                                            isPrefixAvailable === false && "border-red-500 bg-red-500/5 focus-visible:ring-red-500 pr-10"
                                                        )}
                                                    />
                                                    {checkingPrefix && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                        </div>
                                                    )}
                                                    {isPrefixAvailable === true && !org?.uhid_prefix && !checkingPrefix && prefix.length >= 3 && (
                                                        <CheckCircle className="w-4 h-4 text-green-500 absolute right-3 top-1/2 -translate-y-1/2 animate-in zoom-in" />
                                                    )}
                                                    {isPrefixAvailable === false && !checkingPrefix && (
                                                        <XCircle className="w-4 h-4 text-red-500 absolute right-3 top-1/2 -translate-y-1/2 animate-in zoom-in" />
                                                    )}
                                                </div>

                                                {!org?.uhid_prefix && (
                                                    <Button 
                                                        disabled={!prefix || prefix.length < 3 || !isPrefixAvailable || updating || checkingPrefix}
                                                        onClick={() => setShowConfirmModal(true)}
                                                        className="h-10 px-6 font-semibold shadow-sm"
                                                    >
                                                        Lock Prefix
                                                    </Button>
                                                )}

                                                {org?.uhid_prefix && (
                                                    <div className="flex items-center px-4 h-10 rounded-md bg-primary/10 border border-primary/20 text-primary font-bold gap-2 animate-in fade-in slide-in-from-right-2">
                                                        <Lock className="w-4 h-4" /> Locked
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="mt-2 min-h-[20px]">
                                                {isPrefixAvailable === false && (
                                                    <p className="text-[11px] text-red-500 font-medium flex items-center gap-1">
                                                        <XCircle className="w-3 h-3" /> This prefix is already taken by another organization.
                                                    </p>
                                                )}
                                                {isPrefixAvailable === true && !org?.uhid_prefix && prefix.length >= 3 && (
                                                    <p className="text-[11px] text-green-600 font-medium flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> Prefix is available and valid.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                            {!org.uhid_prefix ? (
                                                <Alert variant="destructive" className="mt-4 bg-destructive/5 border-destructive/20 text-destructive">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <AlertTitle className="text-sm font-bold">Caution: Permanent Rule</AlertTitle>
                                                    <AlertDescription className="text-xs">
                                                        The UHID Prefix is permanent. Once saved, it cannot be changed as it forms the basis of all patient identities across the platform.
                                                    </AlertDescription>
                                                </Alert>
                                            ) : (
                                                <p className="text-xs text-muted-foreground mt-2 italic">
                                                    Identifiers generated for this clinic will follow the pattern: <span className="font-bold text-foreground">{org.uhid_prefix}[MM][YY][SEQ]</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-border bg-card p-6">
                                        <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                                            <Building className="w-5 h-5 text-primary" />
                                            Platform Metrics
                                        </h3>

                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-muted/30 p-4 rounded-lg text-center border border-border/50">
                                                <p className="text-3xl font-bold text-foreground">{org.location_count}</p>
                                                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Locations</p>
                                            </div>
                                            <div className="bg-muted/30 p-4 rounded-lg text-center border border-border/50">
                                                <p className="text-3xl font-bold text-foreground">{org.consultant_count}</p>
                                                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Consultants</p>
                                            </div>
                                            <div className="bg-muted/30 p-4 rounded-lg text-center border border-border/50">
                                                <p className="text-3xl font-bold text-foreground">{org.client_count}</p>
                                                <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Clients</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            <div className="space-y-6">
                                <div className="rounded-xl border border-border bg-card p-6">
                                    <h3 className="font-display font-semibold text-lg mb-4">Status Control</h3>
                                    <p className="text-sm text-muted-foreground mb-6">
                                        Disabling an organization will prevent all its users (consultants, admins, clients) from logging in or accessing the APIs.
                                    </p>

                                    <div className="space-y-3">
                                        {org.status !== 'active' && (
                                            <Button
                                                className="w-full bg-success hover:bg-success/90 text-success-foreground"
                                                onClick={() => handleStatusChange('active')}
                                                disabled={updating}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Enable Organization
                                            </Button>
                                        )}

                                        {org.status !== 'disabled' && (
                                            <Button
                                                variant="destructive"
                                                className="w-full"
                                                onClick={() => handleStatusChange('disabled')}
                                                disabled={updating}
                                            >
                                                Disable Organization
                                            </Button>
                                        )}

                                        {org.status !== 'suspended' && (
                                            <Button
                                                variant="outline"
                                                className="w-full border-destructive text-destructive hover:bg-destructive/10"
                                                onClick={() => handleStatusChange('suspended')}
                                                disabled={updating}
                                            >
                                                Suspend (Billing Issue)
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="branding">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="rounded-xl border border-border bg-card p-6">
                                    <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                                        <Palette className="w-5 h-5 text-primary" />
                                        Logo Management
                                    </h3>
                                    
                                    <div className="flex items-center gap-8">
                                        <div className="w-32 h-32 rounded-2xl bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden relative group">
                                            {org.logo_url ? (
                                                <img src={org.logo_url} alt="Clinic Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <Building className="w-10 h-10 text-muted-foreground" />
                                            )}
                                            
                                            <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
                                                <Upload className="w-6 h-6 mb-1" />
                                                <span className="text-[10px] uppercase font-bold">Update</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                            </label>

                                            {uploadingLogo && (
                                                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center p-4">
                                                    <Progress value={uploadProgress} className="h-1 mb-2" />
                                                    <span className="text-[10px] font-bold text-primary animate-pulse">UPLOADING...</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 space-y-2">
                                            <p className="text-sm font-medium">Clinic Brand Logo</p>
                                            <p className="text-xs text-muted-foreground">This logo will appear in the dashboard and on all client-facing clinical reports.</p>
                                            <p className="text-[10px] text-primary/70 font-mono">Recommended: Landscape PNG, 1920x400px for best results.</p>
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                className="mt-2" 
                                                onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                                                disabled={uploadingLogo}
                                            >
                                                Change Logo
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Pro Branding Guide Card */}
                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 border-l-4 border-l-primary">
                                    <div className="flex gap-4">
                                        <div className="p-3 rounded-lg bg-primary/10 h-fit">
                                            <Palette className="w-6 h-6 text-primary" />
                                        </div>
                                        <div className="space-y-3">
                                            <h3 className="font-display font-bold text-primary">Pro Branding Guide</h3>
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                To ensure your reports look premium and uniform, we recommend uploading a <strong>full-length horizontal header</strong> instead of a small square logo.
                                            </p>
                                            <ul className="space-y-2">
                                                <li className="flex items-center gap-2 text-xs text-slate-500">
                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Use <strong>1920 x 400 pixels</strong> (or similar 5:1 ratio).
                                                </li>
                                                <li className="flex items-center gap-2 text-xs text-slate-500">
                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Transparent PNG or white background is preferred.
                                                </li>
                                                <li className="flex items-center gap-2 text-xs text-slate-500">
                                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Wide logos will be <strong>centered</strong> automatically.
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border bg-card p-6">
                                    <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-primary" />
                                        Live Mockup Preview
                                    </h3>
                                    <p className="text-xs text-muted-foreground mb-6">Preview of how identities appear on clinical reports.</p>
                                    
                                    <div className="rounded-lg border-2 border-muted bg-white p-8 shadow-inner min-h-[400px] flex flex-col pt-4"> {/* Reduced padding for 5mm feel */}
                                        <div className={cn(
                                            "border-b pb-4 mb-4 flex flex-col items-center text-center"
                                        )}>
                                            <div className="flex flex-col items-center w-full">
                                                {org.logo_url ? (
                                                    <img 
                                                        src={org.logo_url} 
                                                        className={cn(logoAspect > 2 ? "w-full max-w-[400px] max-h-[80px] h-auto object-contain" : "h-16 w-auto")} 
                                                        alt="Preview" 
                                                        onLoad={(e) => {
                                                            const img = e.currentTarget;
                                                            setLogoAspect(img.naturalWidth / img.naturalHeight);
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                                                        <Building className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="mt-2">
                                                    {!org.logo_url && <h4 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{org.name}</h4>}
                                                </div>
                                            </div>
                                            
                                            <div className="w-full mt-4">
                                                <h4 className="text-[12px] font-bold text-slate-900 border-t pt-2 border-slate-100">INVOICE</h4>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8 flex-1">
                                            <div className="space-y-1">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Bill To:</p>
                                                <p className="text-xs font-bold text-slate-700">John Doe</p>
                                                <p className="text-[9px] text-slate-500">UHID: {org.uhid_prefix || "PREFIX"}04260001</p>
                                                <p className="text-[9px] text-slate-500">Mobile: +91 90000 00000</p>
                                            </div>
                                            <div className="space-y-1 text-right">
                                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-2 text-left">Invoice Details:</p>
                                                <div className="text-left space-y-1">
                                                    <p className="text-[9px] text-slate-500"><span className="font-bold">Invoice #:</span> INV-0022</p>
                                                    <p className="text-[9px] text-slate-500"><span className="font-bold">Date:</span> 10 Apr 2026</p>
                                                    <p className="text-[9px] text-slate-500"><span className="font-bold">Billed By:</span> Staff User</p>
                                                </div>
                                            </div>
                                        </div>


                                        {/* Mockup Footer */}
                                        <div className="mt-auto pt-4 border-t border-slate-100 text-center">
                                            <p className="text-[9px] text-slate-400 font-medium">
                                                {org.official_address || "Organization Location Address"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="settings">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="rounded-xl border border-border bg-card p-6">
                                    <h3 className="font-display font-semibold text-lg mb-6 flex items-center gap-2">
                                        <Building className="w-5 h-5 text-primary" />
                                        Official Organization Details
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <Label>Official Legal Name</Label>
                                            <Input 
                                                value={org.official_name || org.name} 
                                                onChange={(e) => setOrg({ ...org, official_name: e.target.value })}
                                            />
                                            <p className="text-[10px] text-muted-foreground">Used on official invoices and legal documents.</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Organization URL Slug</Label>
                                            <Input value={org.slug} readOnly className="bg-muted" />
                                        </div>
                                        <div className="md:col-span-2 space-y-1.5">
                                            <Label>Registered Office Address (PDF Footer)</Label>
                                            <Input 
                                                value={org.official_address || ''} 
                                                onChange={(e) => setOrg({ ...org, official_address: e.target.value })}
                                                placeholder="123 Clinical Way, Health District..."
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Contact Phone</Label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                <Input 
                                                    className="pl-9"
                                                    value={org.contact_phone || ''} 
                                                    onChange={(e) => setOrg({ ...org, contact_phone: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label>Contact Email</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                                <Input 
                                                    className="pl-9"
                                                    value={org.contact_email || ''} 
                                                    onChange={(e) => setOrg({ ...org, contact_email: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-border">
                                        <Button 
                                            onClick={() => handleUpdateSettings({})} 
                                            disabled={updating}
                                        >
                                            {updating ? "Saving..." : "Update Details"}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="packages">
                        <OrganizationPackages organizationId={org.id} />
                    </TabsContent>

                    <TabsContent value="injuries">
                        <OrganizationInjuries organizationId={org.id} />
                    </TabsContent>

                    <TabsContent value="users">
                        <OrganizationUsers organizationId={org.id} />
                    </TabsContent>

                    <TabsContent value="security">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="rounded-xl border border-border bg-card p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                                                <MapPin className="w-5 h-5 text-primary" />
                                                Clinic Center Location
                                            </h3>
                                            <p className="text-sm text-muted-foreground">Drop a pin to set the authorized center for staff check-ins.</p>
                                        </div>
                                    </div>

                                    <div className="h-[400px] rounded-lg overflow-hidden border border-border relative">
                                        <MapContainer 
                                            center={[org.clinic_latitude || 20.5937, org.clinic_longitude || 78.9629]} 
                                            zoom={org.clinic_latitude ? 15 : 5} 
                                            style={{ height: '100%', width: '100%' }}
                                        >
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            />
                                            <LocationPicker 
                                                lat={org.clinic_latitude || 20.5937} 
                                                lng={org.clinic_longitude || 78.9629} 
                                                onChange={(lat, lng) => setOrg({ ...org, clinic_latitude: lat, clinic_longitude: lng })}
                                            />
                                        </MapContainer>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="lat">Latitude</Label>
                                            <Input 
                                                id="lat" 
                                                value={org.clinic_latitude || ''} 
                                                readOnly 
                                                className="bg-muted"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="lng">Longitude</Label>
                                            <Input 
                                                id="lng" 
                                                value={org.clinic_longitude || ''} 
                                                readOnly 
                                                className="bg-muted"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="rounded-xl border border-border bg-card p-6">
                                    <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                                        <ShieldCheck className="w-5 h-5 text-primary" />
                                        Geofencing Policy
                                    </h3>
                                    
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label className="text-base">Enable Geofencing</Label>
                                                <p className="text-sm text-muted-foreground">Require staff to be within range.</p>
                                            </div>
                                            <Switch 
                                                checked={org.enable_geofencing || false}
                                                onCheckedChange={(checked) => setOrg({ ...org, enable_geofencing: checked })}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="radius">Check-in Radius (Meters)</Label>
                                            <div className="flex items-center gap-3">
                                                <Input 
                                                    id="radius" 
                                                    type="number" 
                                                    value={org.geofence_radius || 100}
                                                    onChange={(e) => setOrg({ ...org, geofence_radius: parseInt(e.target.value) })}
                                                    className="w-24"
                                                />
                                                <span className="text-sm text-muted-foreground font-medium">Meters</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Staff must be within this distance from the clinic center to check in.
                                            </p>
                                        </div>

                                        <Button 
                                            className="w-full mt-4" 
                                            onClick={() => handleUpdateSettings({})}
                                            disabled={updating}
                                        >
                                            Save Security Settings
                                        </Button>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-border bg-primary/5 p-6">
                                    <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
                                        <Globe className="w-4 h-4" /> Quick Info
                                    </h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Once enabled, physicians and scientists will only be able to check-in if their device GPS is within the {org.geofence_radius}m authorized zone.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="enquiry">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="rounded-xl border border-border bg-card p-6">
                                    <div className="mb-6">
                                        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                                            <MessageSquare className="w-5 h-5 text-primary" />
                                            Public Enquiry Form Customization
                                        </h3>
                                        <p className="text-sm text-muted-foreground">Configure field visibility, requirements, and custom questions.</p>
                                    </div>

                                    <div className="space-y-8">
                                        {/* Tagline */}
                                        <div className="space-y-1.5">
                                            <Label className="text-sm font-semibold">Form Header Tagline</Label>
                                            <Input 
                                                value={org.enquiry_form_config?.tagline || "How can we help?"} 
                                                onChange={(e) => {
                                                    const newConfig = { ...(org.enquiry_form_config || {}), tagline: e.target.value };
                                                    setOrg({ ...org, enquiry_form_config: newConfig });
                                                }}
                                                placeholder="e.g. How can we help you?"
                                            />
                                            <p className="text-[10px] text-muted-foreground italic">Appears at the top of the public form.</p>
                                        </div>

                                        {/* Standard Fields */}
                                        <div className="space-y-4">
                                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                                <Activity className="w-3 h-3" /> Standard Fields
                                            </h4>
                                            
                                            <div className="grid grid-cols-1 gap-3">
                                                {['work_place', 'looking_for', 'referral_source', 'preferred_call_time', 'notes'].map(field => {
                                                    const fieldConfig = org.enquiry_form_config?.fields?.[field] || { visible: true, required: field === 'work_place' || field === 'looking_for' || field === 'referral_source' };
                                                    return (
                                                        <div key={field} className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/10 transition-colors hover:bg-muted/20">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-lg bg-background border border-border">
                                                                    <Activity className="w-4 h-4 text-muted-foreground" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold capitalize text-foreground">{field.replace(/_/g, ' ')}</p>
                                                                    <p className="text-[10px] text-muted-foreground">Manage field properties</p>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-6">
                                                                <div className="flex items-center gap-2">
                                                                    <Label className="text-[10px] font-bold text-muted-foreground">VISIBLE</Label>
                                                                    <Switch 
                                                                        checked={fieldConfig.visible ?? true}
                                                                        onCheckedChange={(checked) => {
                                                                            const currentConfig = org.enquiry_form_config || {};
                                                                            const fields = { ...(currentConfig.fields || {}) };
                                                                            fields[field] = { ...fields[field], visible: checked };
                                                                            setOrg({ ...org, enquiry_form_config: { ...currentConfig, fields } });
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <Label className="text-[10px] font-bold text-muted-foreground">REQUIRED</Label>
                                                                    <Switch 
                                                                        checked={fieldConfig.required ?? false}
                                                                        onCheckedChange={(checked) => {
                                                                            const currentConfig = org.enquiry_form_config || {};
                                                                            const fields = { ...(currentConfig.fields || {}) };
                                                                            fields[field] = { ...fields[field], required: checked };
                                                                            setOrg({ ...org, enquiry_form_config: { ...currentConfig, fields } });
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Custom Questions */}
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                                    <Plus className="w-3 h-3" /> Custom Text Questions
                                                </h4>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="h-8 border-dashed border-primary/50 text-primary hover:bg-primary/5"
                                                    onClick={() => {
                                                        const currentConfig = org.enquiry_form_config || {};
                                                        const custom = [...(currentConfig.custom_questions || [])];
                                                        custom.push({ id: Math.random().toString(36).substring(2, 9), label: "New Question", required: false });
                                                        setOrg({ ...org, enquiry_form_config: { ...currentConfig, custom_questions: custom } });
                                                    }}
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Question
                                                </Button>
                                            </div>

                                            <div className="space-y-3">
                                                {(org.enquiry_form_config?.custom_questions || []).map((q: any, idx: number) => (
                                                    <div key={q.id} className="p-4 rounded-xl border border-border bg-primary/5 flex items-start gap-4 animate-in slide-in-from-left-2 duration-200">
                                                        <div className="flex-1 space-y-3">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Question Label</Label>
                                                                <Input 
                                                                    value={q.label} 
                                                                    onChange={(e) => {
                                                                        const custom = [...org.enquiry_form_config.custom_questions];
                                                                        custom[idx].label = e.target.value;
                                                                        setOrg({ ...org, enquiry_form_config: { ...org.enquiry_form_config, custom_questions: custom } });
                                                                    }}
                                                                    placeholder="e.g. What is your sports level?"
                                                                    className="h-9 bg-background"
                                                                />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Switch 
                                                                    checked={q.required} 
                                                                    onCheckedChange={(checked) => {
                                                                        const custom = [...org.enquiry_form_config.custom_questions];
                                                                        custom[idx].required = checked;
                                                                        setOrg({ ...org, enquiry_form_config: { ...org.enquiry_form_config, custom_questions: custom } });
                                                                    }}
                                                                />
                                                                <Label className="text-[10px] font-bold uppercase">Mark Mandatory</Label>
                                                            </div>
                                                        </div>
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 mt-6" 
                                                            onClick={() => {
                                                                const custom = org.enquiry_form_config.custom_questions.filter((_: any, i: number) => i !== idx);
                                                                setOrg({ ...org, enquiry_form_config: { ...org.enquiry_form_config, custom_questions: custom } });
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}

                                                {(!org.enquiry_form_config?.custom_questions || org.enquiry_form_config.custom_questions.length === 0) && (
                                                    <div className="text-center py-8 px-4 border-2 border-dashed border-border rounded-xl bg-muted/5">
                                                        <p className="text-xs text-muted-foreground font-medium">No custom questions added yet.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-border flex justify-end">
                                            <Button 
                                                onClick={() => handleUpdateSettings({})} 
                                                disabled={updating}
                                                className="shadow-lg shadow-primary/20 flex gap-2 items-center px-8"
                                            >
                                                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                                Save Enquiry Form Config
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="rounded-xl border border-border bg-card p-6 border-t-4 border-t-primary">
                                    <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-primary" />
                                        Configuration Guide
                                    </h3>
                                    <ul className="space-y-4">
                                        <li className="flex gap-3 text-xs leading-relaxed">
                                            <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">1</div>
                                            <p><span className="font-bold text-foreground">Tagline:</span> Use a compelling header to encourage users to fill the form.</p>
                                        </li>
                                        <li className="flex gap-3 text-xs leading-relaxed">
                                            <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">2</div>
                                            <p><span className="font-bold text-foreground">Visibility:</span> Hide fields that are not relevant to this specific clinic's workflow.</p>
                                        </li>
                                        <li className="flex gap-3 text-xs leading-relaxed">
                                            <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">3</div>
                                            <p><span className="font-bold text-foreground">Customization:</span> Add up to 5 custom text fields for specific data collection.</p>
                                        </li>
                                    </ul>
                                </div>

                                <div className="rounded-xl border border-border bg-slate-900 p-6 text-white overflow-hidden relative">
                                    <div className="absolute -right-4 -bottom-4 opacity-10">
                                        <Globe className="w-24 h-24" />
                                    </div>
                                    <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                                        <Globe className="w-4 h-4 text-primary" /> Multi-Tenant URL
                                    </h4>
                                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                                        Share this specific link with clients or embed it on the clinic website.
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <div className="p-3 rounded bg-white/5 border border-white/10 group">
                                            <code className="text-[10px] text-primary break-all block py-1">
                                                {window.location.origin}/enquiry/{org.slug || org.id}
                                            </code>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="secondary" 
                                            className="w-full h-9 text-[10px] font-bold uppercase tracking-widest shadow-lg" 
                                            onClick={() => {
                                                navigator.clipboard.writeText(`${window.location.origin}/enquiry/${org.slug || org.id}`);
                                                toast({ 
                                                    title: "Link Copied", 
                                                    description: "The unique enquiry link has been copied to your clipboard." 
                                                });
                                            }}
                                        >
                                            <Copy className="w-3.5 h-3.5 mr-2" /> Copy Full URL
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                </Tabs>
            </div>

            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                            Finalize UHID Prefix
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            You are about to lock the prefix <span className="font-bold text-foreground">"{prefix}"</span> for <span className="font-bold text-foreground">{org.name}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                        <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive leading-relaxed">
                            <p className="font-bold mb-2 uppercase tracking-wide">Warning: Permanent Action</p>
                            Once assigned and confirmed, this prefix <span className="underline font-bold text-black">cannot be changed</span>. It will be the permanent root for all patient identities in this clinic.
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setShowConfirmModal(false)} disabled={updating}>
                            Go Back
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleSavePrefix} 
                            disabled={updating}
                        >
                            {updating ? "Locking..." : "Confirm & Lock Prefix"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
