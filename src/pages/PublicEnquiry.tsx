import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { 
  MessageSquare, 
  User, 
  Phone, 
  Clock, 
  Send, 
  CheckCircle2, 
  Share2, 
  Briefcase, 
  Loader2, 
  AlertCircle, 
  Lock,
  RefreshCw,
  WifiOff,
  Sparkles,
  ShieldCheck,
  Building2
} from "lucide-react";

interface CustomQuestion {
  id: string;
  label: string;
  type: "text" | "textarea" | "select";
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

interface PublicEnquiryConfig {
  tagline?: string;
  welcome_text?: string;
  success_message?: string;
  fields: {
    work_place: { required: boolean; visible: boolean };
    looking_for: { required: boolean; visible: boolean; options: string[] };
    referral_source: { required: boolean; visible: boolean; options?: string[] };
    preferred_call_time: { required: boolean; visible: boolean };
    notes: { required: boolean; visible: boolean };
  };
  custom_questions?: CustomQuestion[];
}

interface PublicOrg {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string;
  enquiry_form_config?: Record<string, unknown>;
}

interface PublicEnquiryFormData {
  name: string;
  contact: string;
  looking_for?: string;
  preferred_call_time?: string;
  referral_source?: string;
  referral_details?: string;
  work_place?: string;
  notes?: string;
  [key: string]: string | undefined;
}

const REFERRAL_SOURCE_OPTIONS = [
  "WhatsApp",
  "Instagram",
  "Facebook",
  "YouTube",
  "LinkedIn",
  "Google Search",
  "Word of Mouth / Friend",
  "Doctor Referral",
  "Professional Referral",
  "Reception Desk",
  "News / Article",
  "Other"
];

// Default configuration in case it's missing from DB
const DEFAULT_CONFIG: PublicEnquiryConfig = {
  tagline: "How can we help?",
  welcome_text: "Fill out the form below and start your journey towards peak performance and recovery.",
  success_message: "Thank you! Our clinic representative will reach out to you within 24 hours.",
  fields: {
    work_place: { required: true, visible: true },
    looking_for: { required: true, visible: true, options: [
      "Physiotherapy",
      "Strength & Conditioning",
      "Sports Consultation",
      "Injury Rehabilitation",
      "Performance Training",
      "Diet & Nutrition",
      "Other"
    ]},
    referral_source: { required: true, visible: true, options: REFERRAL_SOURCE_OPTIONS },
    preferred_call_time: { required: false, visible: true },
    notes: { required: false, visible: true }
  },
  custom_questions: []
};

const CALL_TIME_OPTIONS = [
  "Morning (9 AM - 12 PM)",
  "Afternoon (12 PM - 4 PM)",
  "Evening (4 PM - 8 PM)",
  "Anytime"
];

/**
 * Resolves the public API endpoint cleanly:
 * - Uses `VITE_API_URL` if explicitly defined.
 * - Defaults to relative `/api` which resolves seamlessly on mobile, desktop,
 *   production domains (HTTPS), and dev proxies without mixed-content or CORS issues.
 */
function getApiUrl(endpoint: string): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  const base = envUrl 
    ? (envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`)
    : '/api';
  const clean = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${clean}`;
}

/**
 * Normalizes logo URLs:
 * - If stored with hardcoded `localhost:3000/uploads/`, converts to relative `/uploads/`
 *   so images load effortlessly on mobile browsers and production domains.
 */
function getLogoSrc(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('localhost:3000/')) {
      return url.replace(/https?:\/\/localhost:3000/i, '');
    }
    return url;
  }
  return url.startsWith('/') ? url : `/${url}`;
}

export default function PublicEnquiry() {
  const { orgSlug } = useParams();
  const [searchParams] = useSearchParams();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingOrg, setFetchingOrg] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [org, setOrg] = useState<PublicOrg | null>(null);
  const [config, setConfig] = useState<PublicEnquiryConfig>(DEFAULT_CONFIG);

  // Enable natural mobile body scrolling while viewing the public form
  useEffect(() => {
    const origBodyOverflow = document.body.style.overflow;
    const origHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";

    const root = document.getElementById("root");
    const origRootHeight = root?.style.height;
    const origRootMinHeight = root?.style.minHeight;
    if (root) {
      root.style.height = "auto";
      root.style.minHeight = "100%";
    }

    return () => {
      document.body.style.overflow = origBodyOverflow;
      document.documentElement.style.overflow = origHtmlOverflow;
      if (root) {
        if (origRootHeight !== undefined) root.style.height = origRootHeight;
        if (origRootMinHeight !== undefined) root.style.minHeight = origRootMinHeight;
      }
    };
  }, []);

  const fetchOrganization = useCallback(async () => {
    setFetchingOrg(true);
    setOrgError(null);
    setIsNetworkError(false);
    try {
      const targetUrl = getApiUrl(`/public/orgs/${orgSlug || 'default'}`);
      const response = await fetch(targetUrl);
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Clinic enquiry form not found");
      }
      const data: PublicOrg = await response.json();
      
      setOrg(data);
      
      if (data.enquiry_form_config && typeof data.enquiry_form_config === 'object') {
        const remoteCfg = data.enquiry_form_config as Record<string, unknown>;
        const remoteFields = (remoteCfg.fields || {}) as Record<string, { required?: boolean; visible?: boolean; options?: string[] }>;
        // Merge with defaults to ensure all fields exist
        setConfig({
          ...DEFAULT_CONFIG,
          ...remoteCfg,
          fields: {
            ...DEFAULT_CONFIG.fields,
            ...remoteFields,
            looking_for: {
              ...DEFAULT_CONFIG.fields.looking_for,
              ...(remoteFields.looking_for || {})
            },
            referral_source: {
              ...DEFAULT_CONFIG.fields.referral_source,
              ...(remoteFields.referral_source || {}),
              options: Array.from(new Set([
                ...REFERRAL_SOURCE_OPTIONS,
                ...((remoteFields.referral_source as { options?: string[] })?.options || [])
              ]))
            }
          },
          custom_questions: Array.isArray(remoteCfg.custom_questions) 
            ? (remoteCfg.custom_questions as CustomQuestion[]) 
            : []
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Clinic enquiry form not found";
      const isNet = msg.toLowerCase().includes("failed to fetch") || 
                    msg.toLowerCase().includes("network") || 
                    msg.toLowerCase().includes("load failed");
      setIsNetworkError(isNet);
      setOrgError(msg);
      setOrg(null);
    } finally {
      setFetchingOrg(false);
    }
  }, [orgSlug]);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  const campaignSource = searchParams.get('source')?.trim() || null;
  const campaignService = searchParams.get('service')?.trim() || null;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<PublicEnquiryFormData>({
    defaultValues: {
      preferred_call_time: "Anytime",
      referral_source: campaignSource || "",
      looking_for: campaignService || "",
    }
  });

  // Pre-fill campaign source & service if present in URL
  useEffect(() => {
    if (campaignSource) {
      setValue("referral_source", campaignSource, { shouldValidate: true });
    }
    if (campaignService) {
      setValue("looking_for", campaignService, { shouldValidate: true });
    }
  }, [campaignSource, campaignService, setValue]);

  const selectedSource = campaignSource || watch("referral_source");
  const showDetailField = !campaignSource && ["Professional Referral", "Word of Mouth / Friend", "Other"].includes(selectedSource || "");

  const availableSourceOptions = useMemo(() => {
    const configuredOptions = config.fields.referral_source?.options || [];
    return Array.from(new Set([...REFERRAL_SOURCE_OPTIONS, ...configuredOptions]));
  }, [config.fields.referral_source?.options]);

  const onSubmit = async (data: PublicEnquiryFormData) => {
    if (!org) return;
    setLoading(true);
    try {
      const targetUrl = getApiUrl('/public/enquiries');
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: org.id,
          first_name: data.name.trim().split(/\s+/)[0],
          last_name: data.name.trim().split(/\s+/).slice(1).join(' ') || '',
          mobile_no: data.contact.trim(),
          looking_for: data.looking_for || campaignService || 'General',
          preferred_call_time: data.preferred_call_time,
          referral_source: campaignSource || data.referral_source || 'Direct Web',
          referral_details: data.referral_details,
          work_place: data.work_place,
          notes: [
            data.notes,
            ...(config.custom_questions?.map((q: CustomQuestion) => {
              const val = data[`custom_${q.id}`];
              return val ? `${q.label}: ${val}` : '';
            }) || [])
          ].filter(Boolean).join('\n\n')
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to submit enquiry");
      }

      setIsSubmitted(true);
      toast({
        title: "Enquiry Submitted",
        description: "Thank you! Our representative will contact you shortly.",
      });
      reset();
    } catch (error: unknown) {
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SUCCESS VIEW
  // ─────────────────────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <div className="min-h-screen min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-md w-full shadow-2xl border-none animate-in fade-in zoom-in duration-300 rounded-3xl">
          <CardContent className="pt-10 pb-10 sm:pt-12 sm:pb-12 px-6 sm:px-8 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {org?.name || "Clinic"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 tracking-tight">
                Enquiry Received!
              </h1>
              <p className="text-slate-600 text-sm sm:text-base max-w-sm leading-relaxed pt-1">
                {config.success_message || "Thank you! Our clinic representative will reach out to you within 24 hours."}
              </p>
            </div>
            <Button 
              variant="outline" 
              className="mt-2 w-full sm:w-auto h-11 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold rounded-xl"
              onClick={() => setIsSubmitted(false)}
            >
              Submit Another Enquiry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // LOADING VIEW
  // ─────────────────────────────────────────────────────────────
  if (fetchingOrg) {
    return (
      <div className="min-h-screen min-h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center border border-slate-200/60">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading Clinic Form</p>
            <p className="text-xs text-slate-400">Connecting securely to clinic database...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // ERROR VIEW (Network issue or 404 Form Not Found)
  // ─────────────────────────────────────────────────────────────
  if (orgError || !org) {
    return (
      <div className="min-h-screen min-h-[100dvh] w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-md w-full shadow-2xl border-none rounded-3xl">
          <CardContent className="pt-10 pb-10 sm:pt-12 sm:pb-12 px-6 sm:px-8 flex flex-col items-center text-center space-y-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner ${
              isNetworkError ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-600"
            }`}>
              {isNetworkError ? <WifiOff className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-display font-bold text-slate-900">
                {isNetworkError ? "Unable to Connect" : "Enquiry Form Not Found"}
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm max-w-sm leading-relaxed">
                {isNetworkError 
                  ? "We couldn't connect to the clinic server. Please check your internet connection and try again."
                  : (orgError || `We couldn't find an active clinic enquiry form for "${orgSlug}". Please verify the URL or contact your clinic administrator.`)}
              </p>
            </div>

            <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                onClick={fetchOrganization}
                className="w-full sm:w-auto h-11 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl gap-2 shadow-sm"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // MAIN PUBLIC ENQUIRY FORM VIEW
  // ─────────────────────────────────────────────────────────────
  const logoSrc = getLogoSrc(org?.logo_url);

  return (
    <div className="min-h-screen min-h-[100dvh] w-full bg-slate-50 flex flex-col items-center justify-start p-3.5 sm:p-6 py-6 sm:py-12">
      {/* Subtle decorative background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="max-w-xl sm:max-w-2xl w-full space-y-6 sm:space-y-8 my-auto">
        {/* Clinic Header & Branding */}
        <div className="text-center space-y-3 sm:space-y-4 px-2">
          {logoSrc && (
            <div className="flex justify-center mb-2">
              <img 
                src={logoSrc} 
                alt={org?.name || 'Clinic'} 
                className="h-10 sm:h-14 max-w-[180px] sm:max-w-[220px] object-contain drop-shadow-xs" 
              />
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-[11px] sm:text-xs font-bold uppercase tracking-wider border border-emerald-500/20 shadow-xs">
            <Sparkles className="w-3 h-3 text-emerald-600" /> Get in Touch
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-extrabold text-slate-900 tracking-tight leading-tight">
              {org?.name || 'ISHPO Clinic'}
            </h1>
            <h2 className="text-lg sm:text-2xl md:text-3xl font-display font-bold text-primary tracking-tight">
              {config.tagline || "How can we help?"}
            </h2>
          </div>

          <p className="text-slate-600 text-xs sm:text-base max-w-lg mx-auto leading-relaxed">
            {config.welcome_text || "Fill out the form below and start your journey towards peak performance and recovery."}
          </p>
        </div>

        {/* The Public Card Form */}
        <Card className="shadow-xl sm:shadow-2xl border border-slate-200/80 overflow-hidden rounded-2xl sm:rounded-3xl bg-white">
          <CardHeader className="bg-slate-900 text-white p-5 sm:p-8">
            <div className="text-center space-y-1.5">
              <CardTitle className="text-xl sm:text-2xl font-extrabold flex items-center justify-center gap-2.5 text-white">
                <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                Enquiry Form
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs sm:text-sm">
                Please provide your details and our team will reach out to you.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6">
              {/* Primary Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-primary" /> Full Name <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input 
                    id="name" 
                    autoComplete="name"
                    autoCapitalize="words"
                    {...register("name", { required: "Name is required" })} 
                    placeholder="John Doe" 
                    className="h-11 sm:h-12 text-base sm:text-sm bg-slate-50 border-slate-200 focus:bg-white focus:border-primary transition-all rounded-xl shadow-xs"
                  />
                  {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contact" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-primary" /> Contact Number <span className="text-destructive font-bold">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs sm:text-sm font-semibold border-r border-slate-200 pr-2 select-none">+91</span>
                    <Input 
                      id="contact" 
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      {...register("contact", { required: "Contact number is required", minLength: { value: 10, message: "Valid 10-digit number required" } })} 
                      placeholder="9876543210" 
                      className="h-11 sm:h-12 pl-14 text-base sm:text-sm bg-slate-50 border-slate-200 focus:bg-white focus:border-primary transition-all rounded-xl shadow-xs"
                    />
                  </div>
                  {errors.contact && <p className="text-xs text-destructive font-medium">{errors.contact.message}</p>}
                </div>
              </div>

              {/* Work Place / Profession */}
              {config.fields.work_place.visible && (
                <div className="space-y-1.5">
                  <Label htmlFor="work_place" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-primary" /> Where do you work? {config.fields.work_place.required && <span className="text-destructive font-bold">*</span>}
                  </Label>
                  <Input 
                    id="work_place" 
                    autoComplete="organization"
                    {...register("work_place", { required: config.fields.work_place.required ? "Work place is required" : false })} 
                    placeholder="Company name or profession" 
                    className="h-11 sm:h-12 text-base sm:text-sm bg-slate-50 border-slate-200 focus:bg-white focus:border-primary transition-all rounded-xl shadow-xs"
                  />
                  {errors.work_place && <p className="text-xs text-destructive font-medium">{errors.work_place.message}</p>}
                </div>
              )}

              {/* Service & Preferred Call Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {config.fields.looking_for.visible && (
                  <div className="space-y-1.5">
                    <Label htmlFor="looking_for" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-primary" /> Looking For {config.fields.looking_for.required && <span className="text-destructive font-bold">*</span>}
                    </Label>
                    <Select value={watch("looking_for") || ""} onValueChange={(val) => setValue("looking_for", val, { shouldValidate: true })}>
                      <SelectTrigger className="h-11 sm:h-12 text-base sm:text-sm bg-slate-50 border-slate-200 shadow-xs focus:ring-primary rounded-xl">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {(config.fields.looking_for.options || []).map((opt: string) => (
                          <SelectItem key={opt} value={opt} className="text-sm py-2.5">{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.looking_for && <p className="text-xs text-destructive font-medium">Please select an option</p>}
                  </div>
                )}

                {config.fields.preferred_call_time.visible && (
                  <div className="space-y-1.5">
                    <Label htmlFor="preferred_call_time" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary" /> Preferred Call Time
                    </Label>
                    <Select value={watch("preferred_call_time") || "Anytime"} onValueChange={(val) => setValue("preferred_call_time", val)}>
                      <SelectTrigger className="h-11 sm:h-12 text-base sm:text-sm bg-slate-50 border-slate-200 shadow-xs focus:ring-primary rounded-xl">
                        <SelectValue placeholder="Anytime" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {CALL_TIME_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt} className="text-sm py-2.5">{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Referral Source Attribution */}
              {config.fields.referral_source.visible && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="referral_source" className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Share2 className="w-4 h-4 text-primary" /> How did you hear about us? {config.fields.referral_source.required && <span className="text-destructive font-bold">*</span>}
                    </Label>
                    {campaignSource && (
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 sm:px-2.5 py-0.5 rounded-full">
                        <Lock className="w-3 h-3 text-emerald-600" /> Auto-Attributed
                      </span>
                    )}
                  </div>

                  {campaignSource ? (
                    <div className="space-y-1.5">
                      <div 
                        data-testid="locked-referral-source"
                        className="h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl border border-slate-200 bg-slate-100/90 flex items-center justify-between text-slate-800 font-medium text-sm select-none cursor-not-allowed shadow-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="font-semibold text-slate-900 text-sm sm:text-base">{campaignSource}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 font-normal">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Locked</span>
                        </div>
                      </div>
                      <input type="hidden" {...register("referral_source")} value={campaignSource} />
                      <p className="text-[11px] sm:text-xs text-slate-500">
                        Attribution channel automatically tagged via link and locked from manual modification.
                      </p>
                    </div>
                  ) : (
                    <Select 
                      value={watch("referral_source") || ""} 
                      onValueChange={(val) => setValue("referral_source", val, { shouldValidate: true })}
                    >
                      <SelectTrigger className="h-11 sm:h-12 text-base sm:text-sm bg-slate-50 border-slate-200 shadow-xs focus:ring-primary rounded-xl">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {availableSourceOptions.map((opt: string) => (
                          <SelectItem key={opt} value={opt} className="text-sm py-2.5">{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {errors.referral_source && !campaignSource && (
                    <p className="text-xs text-destructive font-medium">Please select a source</p>
                  )}
                </div>
              )}

              {/* Conditional Referral Detail Input */}
              {showDetailField && config.fields.referral_source.visible && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="referral_details" className="text-xs sm:text-sm font-semibold text-slate-700">
                    {selectedSource === "Professional Referral" ? "Which professional referred you?" : 
                     selectedSource === "Word of Mouth / Friend" ? "Who referred you?" : "Please specify source details"} <span className="text-destructive font-bold">*</span>
                  </Label>
                  <Input 
                    id="referral_details" 
                    {...register("referral_details", { required: showDetailField })} 
                    placeholder="Provide details here..." 
                    className="h-11 sm:h-12 text-base sm:text-sm bg-slate-50 border-slate-200 focus:bg-white focus:border-primary transition-all rounded-xl shadow-xs"
                  />
                  {errors.referral_details && <p className="text-xs text-destructive font-medium">Please provide referral details</p>}
                </div>
              )}

              {/* Dynamic Custom Questions configured by Organization */}
              {config.custom_questions?.map((q: CustomQuestion) => (
                <div key={q.id} className="space-y-1.5">
                  <Label htmlFor={`custom_${q.id}`} className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    {q.label} {q.required && <span className="text-destructive font-bold">*</span>}
                  </Label>

                  {q.type === 'textarea' ? (
                    <Textarea 
                      id={`custom_${q.id}`}
                      {...register(`custom_${q.id}`, { required: q.required ? `${q.label} is required` : false })} 
                      placeholder={q.placeholder || "Provide details here..."} 
                      className="min-h-[90px] text-base sm:text-sm bg-slate-50 border-slate-200 focus:bg-white focus:border-primary transition-all rounded-xl shadow-xs"
                    />
                  ) : q.type === 'select' && Array.isArray(q.options) && q.options.length > 0 ? (
                    <Select 
                      value={watch(`custom_${q.id}`) || ""} 
                      onValueChange={(val) => setValue(`custom_${q.id}`, val, { shouldValidate: true })}
                    >
                      <SelectTrigger className="h-11 sm:h-12 text-base sm:text-sm bg-slate-50 border-slate-200 shadow-xs focus:ring-primary rounded-xl">
                        <SelectValue placeholder={q.placeholder || "Select an option"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {q.options.map((opt: string) => (
                          <SelectItem key={opt} value={opt} className="text-sm py-2.5">{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      id={`custom_${q.id}`}
                      {...register(`custom_${q.id}`, { required: q.required ? `${q.label} is required` : false })} 
                      placeholder={q.placeholder || "Your answer..."} 
                      className="h-11 sm:h-12 text-base sm:text-sm bg-slate-50 border-slate-200 focus:bg-white focus:border-primary transition-all rounded-xl shadow-xs"
                    />
                  )}

                  {errors[`custom_${q.id}`] && <p className="text-xs text-destructive font-medium">{errors[`custom_${q.id}`]?.message as string}</p>}
                </div>
              ))}

              {/* Additional Notes */}
              {config.fields.notes.visible && (
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs sm:text-sm font-semibold text-slate-700">
                    Additional Notes {config.fields.notes.required && <span className="text-destructive font-bold">*</span>}
                  </Label>
                  <Textarea 
                    id="notes" 
                    {...register("notes", { required: config.fields.notes.required ? "Notes are required" : false })} 
                    placeholder="Tell us a bit about your requirement or symptoms (optional)" 
                    className="min-h-[100px] text-base sm:text-sm bg-slate-50 border-slate-200 focus:bg-white focus:border-primary transition-all rounded-xl shadow-xs"
                  />
                  {errors.notes && <p className="text-xs text-destructive font-medium">{errors.notes.message}</p>}
                </div>
              )}

              {/* Submit CTA */}
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-12 sm:h-14 text-sm sm:text-base font-bold uppercase tracking-wider bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.99] mt-3 sm:mt-5"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting Enquiry...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>Submit Enquiry</span>
                    <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
                  </div>
                )}
              </Button>
            </form>
          </CardContent>

          {/* Trust badges footer */}
          <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-[11px] sm:text-xs font-semibold text-slate-500">
             <div className="flex items-center gap-1.5 text-emerald-700">
               <ShieldCheck className="w-4 h-4 text-emerald-600" /> Secure Submission
             </div>
             <div className="flex items-center gap-1.5 text-slate-600">
               <Clock className="w-4 h-4 text-primary" /> Rapid 24h Response
             </div>
             <div className="flex items-center gap-1.5 text-slate-600">
               <Building2 className="w-4 h-4 text-slate-500" /> Direct Clinic Intake
             </div>
          </div>
        </Card>

        {/* Footer info */}
        <p className="text-center text-slate-400 text-xs px-2 leading-relaxed">
          By submitting this form, you agree to our terms of service and clinic privacy policy.
          <br className="hidden sm:inline" />
          {" "}&copy; {new Date().getFullYear()} {org?.name || 'ISHPO Clinic'}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
