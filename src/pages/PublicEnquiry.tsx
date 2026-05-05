import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, User, Phone, Clock, Send, CheckCircle2, Share2, Briefcase, Loader2 } from "lucide-react";

// Default configuration in case it's missing from DB
const DEFAULT_CONFIG = {
  tagline: "How can we help?",
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
    referral_source: { required: true, visible: true },
    preferred_call_time: { required: false, visible: true },
    notes: { required: false, visible: true }
  },
  custom_questions: []
};

const REFERRAL_SOURCE_OPTIONS = [
  "Instagram",
  "Facebook",
  "YouTube",
  "LinkedIn",
  "Google Search",
  "Word of Mouth / Friend",
  "Professional Referral",
  "News / Article",
  "Other"
];

const CALL_TIME_OPTIONS = [
  "Morning (9 AM - 12 PM)",
  "Afternoon (12 PM - 4 PM)",
  "Evening (4 PM - 8 PM)",
  "Anytime"
];

export default function PublicEnquiry() {
  const { orgSlug } = useParams();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingOrg, setFetchingOrg] = useState(true);
  const [org, setOrg] = useState<any>(null);
  const [config, setConfig] = useState<any>(DEFAULT_CONFIG);

  useEffect(() => {
    fetchOrganization();
  }, [orgSlug]);

  const fetchOrganization = async () => {
    setFetchingOrg(true);
    try {
      let query = supabase
        .from('organizations')
        .select('id, name, logo_url, enquiry_form_config');
      
      if (orgSlug) {
        query = query.eq('slug', orgSlug);
      } else {
        // FORCE fetch by specific ID for the default clinic to eliminate ambiguity
        query = query.eq('id', '95d6393e-68ab-4839-9b35-a11562cfc150');
      }

      const { data, error } = await query.maybeSingle();

      if (error) {

      }
      
      if (data) {

        setOrg(data);
        
        if (data.enquiry_form_config) {
          // Merge with defaults to ensure all fields exist
          setConfig({
            ...DEFAULT_CONFIG,
            ...data.enquiry_form_config,
            fields: {
              ...DEFAULT_CONFIG.fields,
              ...(data.enquiry_form_config.fields || {})
            }
          });
        }
      }
    } catch (err) {

    } finally {
      setFetchingOrg(false);
    }
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<any>({
    defaultValues: {
      preferred_call_time: "Anytime",
    }
  });

  const selectedSource = watch("referral_source");
  const showDetailField = ["Professional Referral", "Word of Mouth / Friend", "Other"].includes(selectedSource);

  const onSubmit = async (data: any) => {
    if (!org) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("enquiries").insert({
        organization_id: org.id,
        name: data.name,
        contact: data.contact,
        looking_for: data.looking_for || 'General',
        referral_source: data.referral_source,
        referral_details: data.referral_details,
        work_place: data.work_place,
        preferred_call_time: data.preferred_call_time,
        status: "new",
        notes: [
          data.notes,
          ...(config.custom_questions?.map((q: any) => `${q.label}: ${data[`custom_${q.id}`] || ''}`) || [])
        ].filter(Boolean).join('\n\n')
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "Enquiry Submitted",
        description: "Thank you! Our representative will contact you shortly.",
      });
      reset();
    } catch (error: any) {

      toast({
        title: "Submission Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="h-screen overflow-y-auto bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-2xl border-none animate-in fade-in zoom-in duration-500">
          <CardContent className="pt-12 pb-12 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-display font-bold text-slate-900">Thank You!</h1>
              <p className="text-slate-500">Your enquiry has been received. Our team will get back to you within 24 hours.</p>
            </div>
            <Button 
              variant="outline" 
              className="mt-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => setIsSubmitted(false)}
            >
              Submit Another Enquiry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (fetchingOrg) {
    return (
      <div className="h-screen overflow-y-auto bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Loading Enquiry Form...</p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 flex flex-col items-center p-4 py-12">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <MessageSquare className="w-3 h-3" /> Get in Touch
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl sm:text-6xl font-display font-extrabold text-slate-900 tracking-tight">
              {org?.name || ''}
            </h1>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-primary tracking-tight">
              {config.tagline || "How can we help?"}
            </h2>
          </div>
          <p className="text-slate-500 text-lg sm:text-xl max-w-lg mx-auto leading-relaxed">
            Fill out the form below and start your journey towards peak performance and recovery.
          </p>
        </div>

        <Card className="shadow-2xl border-none overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-slate-900 text-white p-8 sm:p-10">
            <div className="text-center space-y-2">
              <CardTitle className="text-3xl font-extrabold flex items-center justify-center gap-3 text-white">
                <MessageSquare className="w-8 h-8 text-primary" />
                Enquiry Form
              </CardTitle>
              <CardDescription className="text-slate-400 text-lg">
                Please provide your details and we'll reach out to you.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-8 sm:p-10">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="name" 
                    {...register("name", { required: "Name is required" })} 
                    placeholder="John Doe" 
                    className="h-12 bg-slate-50 border-slate-200 focus:border-primary transition-all shadow-sm"
                  />
                  {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact" className="text-slate-700 font-semibold flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" /> Contact Number <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium border-r border-slate-200 pr-2">+91</span>
                    <Input 
                      id="contact" 
                      {...register("contact", { required: "Contact is required", minLength: { value: 10, message: "Valid contact required" } })} 
                      placeholder="9876543210" 
                      className="h-12 pl-14 bg-slate-50 border-slate-200 focus:border-primary transition-all shadow-sm"
                    />
                  </div>
                  {errors.contact && <p className="text-xs text-destructive font-medium">{errors.contact.message}</p>}
                </div>
              </div>

              {config.fields.work_place.visible && (
                <div className="space-y-2">
                  <Label htmlFor="work_place" className="text-slate-700 font-semibold flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-primary" /> Where do you work? {config.fields.work_place.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input 
                    id="work_place" 
                    {...register("work_place", { required: config.fields.work_place.required ? "Work place is required" : false })} 
                    placeholder="Company name or profession" 
                    className="h-12 bg-slate-50 border-slate-200 focus:border-primary transition-all shadow-sm"
                  />
                  {errors.work_place && <p className="text-xs text-destructive font-medium">{errors.work_place.message}</p>}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {config.fields.looking_for.visible && (
                  <div className="space-y-2">
                    <Label htmlFor="looking_for" className="text-slate-700 font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" /> Looking For {config.fields.looking_for.required && <span className="text-destructive">*</span>}
                    </Label>
                    <Select onValueChange={(val) => setValue("looking_for", val)}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 shadow-sm focus:ring-primary">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {(config.fields.looking_for.options || []).map((opt: string) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.looking_for && <p className="text-xs text-destructive font-medium">Please select an option</p>}
                  </div>
                )}

                {config.fields.preferred_call_time.visible && (
                  <div className="space-y-2">
                    <Label htmlFor="preferred_call_time" className="text-slate-700 font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" /> Preferred Call Time
                    </Label>
                    <Select onValueChange={(val) => setValue("preferred_call_time", val)}>
                      <SelectTrigger className="h-12 bg-slate-50 border-slate-200 shadow-sm focus:ring-primary">
                        <SelectValue placeholder="Anytime" />
                      </SelectTrigger>
                      <SelectContent>
                        {CALL_TIME_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {config.fields.referral_source.visible && (
                <div className="space-y-2">
                  <Label htmlFor="referral_source" className="text-slate-700 font-semibold flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-primary" /> How did you hear about us? {config.fields.referral_source.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Select onValueChange={(val) => setValue("referral_source", val)}>
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 shadow-sm focus:ring-primary">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {REFERRAL_SOURCE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.referral_source && <p className="text-xs text-destructive font-medium">Please select a source</p>}
                </div>
              )}

              {showDetailField && config.fields.referral_source.visible && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="referral_details" className="text-slate-700 font-semibold">
                    {selectedSource === "Professional Referral" ? "Which professional referred you?" : 
                     selectedSource === "Word of Mouth / Friend" ? "Who referred you?" : "Please specify source"} <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="referral_details" 
                    {...register("referral_details", { required: showDetailField })} 
                    placeholder="Provide details here..." 
                    className="h-12 bg-slate-50 border-slate-200 focus:border-primary transition-all shadow-sm"
                  />
                  {errors.referral_details && <p className="text-xs text-destructive font-medium">Please provide referral details</p>}
                </div>
              )}

              {/* Custom Questions */}
              {config.custom_questions?.map((q: any) => (
                <div key={q.id} className="space-y-2">
                  <Label htmlFor={`custom_${q.id}`} className="text-slate-700 font-semibold flex items-center gap-2">
                    {q.label} {q.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Input 
                    id={`custom_${q.id}`}
                    {...register(`custom_${q.id}`, { required: q.required ? `${q.label} is required` : false })} 
                    placeholder="Your answer..." 
                    className="h-12 bg-slate-50 border-slate-200 focus:border-primary transition-all shadow-sm"
                  />
                  {errors[`custom_${q.id}`] && <p className="text-xs text-destructive font-medium">{errors[`custom_${q.id}`]?.message as string}</p>}
                </div>
              ))}

              {config.fields.notes.visible && (
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-slate-700 font-semibold">Additional Notes {config.fields.notes.required && <span className="text-destructive">*</span>}</Label>
                  <Textarea 
                    id="notes" 
                    {...register("notes", { required: config.fields.notes.required ? "Notes are required" : false })} 
                    placeholder="Tell us a bit about your requirement (optional)" 
                    className="min-h-[120px] bg-slate-50 border-slate-200 focus:border-primary transition-all shadow-sm"
                  />
                  {errors.notes && <p className="text-xs text-destructive font-medium">{errors.notes.message}</p>}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-14 text-lg font-bold uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl transition-all active:scale-[0.98] mt-4"
              >
                {loading ? "Submitting..." : (
                  <div className="flex items-center gap-2">
                    Submit Enquiry <Send className="w-5 h-5 ml-2" />
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-6 text-[10px] uppercase font-bold tracking-widest text-slate-400">
             <div className="flex items-center gap-1"><Shield className="w-3 h-3" /> Secure Submission</div>
             <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> Quick Response</div>
          </div>
        </Card>

        <p className="text-center text-slate-400 text-sm">
          By submitting this form, you agree to our terms of service and privacy policy. 
          {org?.name || 'ISHPO Clinic'}, All rights reserved.
        </p>
      </div>
    </div>
  );
}

function Shield({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
  );
}
