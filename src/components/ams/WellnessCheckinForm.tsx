import { useState, useEffect } from "react";
import SorenessHeatmap from "./SorenessHeatmap";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  soreness_data: z.array(z.string()).optional(),
});

type WellnessFormValues = z.infer<typeof wellnessSchema>;

export default function WellnessCheckinForm({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(1);
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<WellnessFormValues>({
    resolver: zodResolver(wellnessSchema),
    defaultValues: {
      sleep_score: 5,
      stress_level: 5,
      soreness_level: 5,
      fatigue_level: 5,
      soreness_data: [],
    },
  });

  const sorenessLevel = form.watch("soreness_level");
  const selectedZones = form.watch("soreness_data") || [];


  const submitWellness = useMutation({
    mutationFn: async (values: WellnessFormValues) => {
      const { data, error } = await supabase.from("wellness_logs").insert([
        {
          athlete_id: session?.user?.id,
          ...values,
        } as any,
      ]);
      if (error) throw error;
      return data;
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
    <div className="space-y-6 animate-in fade-in duration-500">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <FormField
                  control={form.control}
                  name="sleep_score"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sleep Quality (1-10)</FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                        />
                      </FormControl>
                      <div className="text-right text-sm text-muted-foreground">{field.value}/10</div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stress_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stress Level (1-10)</FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                        />
                      </FormControl>
                      <div className="text-right text-sm text-muted-foreground">{field.value}/10</div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" onClick={nextStep} className="w-full">
                  Next
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <FormField
                  control={form.control}
                  name="soreness_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Muscle Soreness (1-10)</FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                        />
                      </FormControl>
                      <div className="text-right text-sm text-muted-foreground">{field.value}/10</div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {sorenessLevel > 5 && (
                  <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                    <FormField
                      control={form.control}
                      name="soreness_data"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <SorenessHeatmap
                              selectedZones={field.value || []}
                              onZoneToggle={(zoneId) => {
                                const current = field.value || [];
                                const updated = current.includes(zoneId)
                                  ? current.filter((id: string) => id !== zoneId)
                                  : [...current, zoneId];
                                field.onChange(updated);
                              }}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="fatigue_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fatigue Level (1-10)</FormLabel>
                      <FormControl>
                        <Slider
                          min={1}
                          max={10}
                          step={1}
                          defaultValue={[field.value]}
                          onValueChange={(vals) => field.onChange(vals[0])}
                        />
                      </FormControl>
                      <div className="text-right text-sm text-muted-foreground">{field.value}/10</div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full">
                    Back
                  </Button>
                  <Button type="submit" disabled={submitWellness.isPending} className="w-full">
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
