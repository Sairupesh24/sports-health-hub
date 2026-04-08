import { useState } from "react";
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
import { MessageSquare, User, Phone, Clock, Send, CheckCircle2, Share2, Briefcase } from "lucide-react";

const enquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  contact: z.string().min(10, "Please enter a valid contact number"),
  looking_for: z.string().min(1, "Please select what you are looking for"),
  referral_source: z.string().min(1, "Please select a source"),
  referral_details: z.string().optional(),
  work_place: z.string().min(2, "Please enter your place of work"),
  preferred_call_time: z.string().optional(),
  notes: z.string().optional(),
});

type EnquiryFormData = z.infer<typeof enquirySchema>;

const LOOKING_FOR_OPTIONS = [
  "Physiotherapy",
  "Strength & Conditioning",
  "Sports Consultation",
  "Injury Rehabilitation",
  "Performance Training",
  "Diet & Nutrition",
  "Other"
];

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
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<EnquiryFormData>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      preferred_call_time: "Anytime",
    }
  });

  const selectedSource = watch("referral_source");
  const showDetailField = ["Professional Referral", "Word of Mouth / Friend", "Other"].includes(selectedSource);

  const onSubmit = async (data: EnquiryFormData) => {
    setLoading(true);
    try {
      // For public form, we'll use the default organization ID
      const DEFAULT_ORG_ID = "95d6393e-68ab-4839-9b35-a11562cfc150";

      const { error } = await supabase.from("enquiries").insert({
        organization_id: DEFAULT_ORG_ID,
        name: data.name,
        contact: data.contact,
        looking_for: data.looking_for,
        referral_source: data.referral_source,
        referral_details: data.referral_details,
        work_place: data.work_place,
        preferred_call_time: data.preferred_call_time,
        notes: data.notes,
        status: "new"
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "Enquiry Submitted",
        description: "Thank you! Our representative will contact you shortly.",
      });
      reset();
    } catch (error: any) {
      console.error("Enquiry submission error:", error);
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
            <MessageSquare className="w-3 h-3" /> Get in Touch
          </div>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-slate-900 tracking-tight">How can we help?</h1>
          <p className="text-slate-500 text-lg sm:text-xl max-w-lg mx-auto leading-relaxed">
            Fill out the form below and start your journey towards peak performance and recovery.
          </p>
        </div>

        <Card className="shadow-2xl border-none overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-slate-900 text-white p-8 sm:p-10">
            <CardTitle className="text-2xl font-bold flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-primary" />
              Enquiry Form
            </CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              Please provide your details and we'll reach out to you.
            </CardDescription>
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
                    {...register("name")} 
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
                      {...register("contact")} 
                      placeholder="9876543210" 
                      className="h-12 pl-14 bg-slate-50 border-slate-200 focus:border-primary transition-all shadow-sm"
                    />
                  </div>
                  {errors.contact && <p className="text-xs text-destructive font-medium">{errors.contact.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="work_place" className="text-slate-700 font-semibold flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-primary" /> Where do you work? <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="work_place" 
                  {...register("work_place")} 
                  placeholder="Company name or profession" 
                  className="h-12 bg-slate-50 border-slate-200 focus:border-primary transition-all shadow-sm"
                />
                {errors.work_place && <p className="text-xs text-destructive font-medium">{errors.work_place.message}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="looking_for" className="text-slate-700 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" /> Looking For <span className="text-destructive">*</span>
                  </Label>
                  <Select onValueChange={(val) => setValue("looking_for", val)}>
                    <SelectTrigger className="h-12 bg-slate-50 border-slate-200 shadow-sm focus:ring-primary">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOOKING_FOR_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.looking_for && <p className="text-xs text-destructive font-medium">{errors.looking_for.message}</p>}
                </div>

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
              </div>

              <div className="space-y-2">
                <Label htmlFor="referral_source" className="text-slate-700 font-semibold flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-primary" /> How did you hear about us? <span className="text-destructive">*</span>
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
                {errors.referral_source && <p className="text-xs text-destructive font-medium">{errors.referral_source.message}</p>}
              </div>

              {showDetailField && (
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

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-slate-700 font-semibold">Additional Notes</Label>
                <Textarea 
                  id="notes" 
                  {...register("notes")} 
                  placeholder="Tell us a bit about your requirement (optional)" 
                  className="min-h-[120px] bg-slate-50 border-slate-200 focus:border-primary transition-all shadow-sm"
                />
              </div>

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
          ISHPO Default Clinic, All rights reserved.
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
