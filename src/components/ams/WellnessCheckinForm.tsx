import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const wellnessSchema = z.object({
  sleep_score: z.number().min(1).max(10),
  stress_level: z.number().min(1).max(10),
  soreness_level: z.number().min(1).max(10),
  fatigue_level: z.number().min(1).max(10),
});

type WellnessFormValues = z.infer<typeof wellnessSchema>;

export default function WellnessCheckinForm({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(1);
  const queryClient = useQueryClient();

  const form = useForm<WellnessFormValues>({
    resolver: zodResolver(wellnessSchema),
    defaultValues: {
      sleep_score: 5,
      stress_level: 5,
      soreness_level: 5,
      fatigue_level: 5,
    },
  });

  const sorenessLevel = form.watch("soreness_level");


  const submitWellness = useMutation({
    mutationFn: async (values: WellnessFormValues) => {
      return await apiFetch('/ams/wellness-logs', {
        method: 'POST',
        data: values
      });
    },
    onSuccess: () => {
      toast.success("Wellness check-in completed!");
      queryClient.invalidateQueries({ queryKey: ["wellness_logs"] });
      form.reset();
      setStep(1);
      if (onComplete) onComplete();
    },
    onError: (error: any) => {
      toast.error(`Failed to submit check-in: ${error.message}`);
    },
  });

  const onSubmit = (values: WellnessFormValues) => {
    submitWellness.mutate(values);
  };

  const nextStep = () => {
    form.trigger(["sleep_score", "stress_level"]).then((valid) => {
      if (valid) setStep(2);
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <FormField
                  control={form.control}
                  name="sleep_score"
                  render={({ field }) => (
                    <FormItem className="space-y-2.5">
                      <FormLabel className="text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider block">
                        Sleep Quality (1-10)
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="py-1"
                        />
                      </FormControl>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Poor</span>
                        <div className="text-sm font-extrabold text-primary italic">{field.value}/10</div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Excellent</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stress_level"
                  render={({ field }) => (
                    <FormItem className="space-y-2.5">
                      <FormLabel className="text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider block">
                        Stress Level (1-10)
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="py-1"
                        />
                      </FormControl>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Low</span>
                        <div className="text-sm font-extrabold text-primary italic">{field.value}/10</div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">High</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="button" 
                  onClick={nextStep} 
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs tracking-wider shadow-sm mt-2"
                >
                  Next
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <FormField
                  control={form.control}
                  name="soreness_level"
                  render={({ field }) => (
                    <FormItem className="space-y-2.5">
                      <FormLabel className="text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider block">
                        Muscle Soreness (1-10)
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="py-1"
                        />
                      </FormControl>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">None</span>
                        <div className="text-sm font-extrabold text-primary italic">{field.value}/10</div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Severe</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fatigue_level"
                  render={({ field }) => (
                    <FormItem className="space-y-2.5">
                      <FormLabel className="text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider block">
                        Fatigue Level (1-10)
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                          className="py-1"
                        />
                      </FormControl>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fresh</span>
                        <div className="text-sm font-extrabold text-primary italic">{field.value}/10</div>
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Exhausted</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(1)} 
                    className="flex-1 h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-xs tracking-wider"
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={submitWellness.isPending} 
                    className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold text-xs tracking-wider shadow-sm"
                  >
                    {submitWellness.isPending ? "Submitting..." : "Complete Check-in"}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>
    </div>
  );
}
