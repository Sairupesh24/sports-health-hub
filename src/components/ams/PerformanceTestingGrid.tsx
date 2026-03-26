import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, Save, Users, Trophy } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { usePersonalBests, isBetterResult } from "@/hooks/usePerformanceResults";
import { useAuth } from "@/contexts/AuthContext";

const performanceSchema = z.object({
  test_name: z.string().min(1, "Test name is required"),
  category: z.enum(['Jump', 'Sprint', 'Strength', 'Mobility', 'Conditioning']),
  results: z.array(z.object({
    athlete_id: z.string(),
    athlete_name: z.string(),
    value: z.number().min(0).max(500, "Value exceeds physiological norms"),
    unit: z.string().optional(),
  }))
});

type PerformanceFormValues = z.infer<typeof performanceSchema>;

const DEFAULT_TESTS = {
  Jump: ['Countermovement Jump (CMJ)', 'Broad Jump', 'Squat Jump'],
  Sprint: ['10m Sprint', '30m Sprint', '40y Dash', 'Pro Agility'],
  Strength: ['Back Squat 1RM', 'Bench Press 1RM', 'Deadlift 1RM', 'Power Clean'],
  Mobility: ['FMS Score', 'Ankle Dorsiflexion', 'Internal Rotation'],
  Conditioning: ['Yo-Yo Test', 'Bronco', 'Max Aerobic Speed (MAS)']
};

export default function PerformanceTestingGrid() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof DEFAULT_TESTS>('Jump');
  const [selectedTest, setSelectedTest] = useState('');

  // 1. Fetch Athletes
  const { data: athletes, isLoading: athletesLoading } = useQuery({
    queryKey: ['athletes-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('ams_role', 'athlete');
      if (error) throw error;
      return data.map(d => ({ ...d, full_name: `${d.first_name || ''} ${d.last_name || ''}` }));
    }
  });

  // 2. Initialize Form
  const form = useForm<PerformanceFormValues>({
    resolver: zodResolver(performanceSchema),
    defaultValues: {
      category: 'Jump',
      test_name: '',
      results: []
    }
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "results"
  });

  // 3. Populate Grid when athletes change
  React.useEffect(() => {
    if (athletes) {
      replace(athletes.map(a => ({
        athlete_id: a.id,
        athlete_name: a.full_name,
        value: 0
      })));
    }
  }, [athletes, replace]);

  // 4. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (values: PerformanceFormValues) => {
      if (!user) throw new Error("Authentication required to save results");

      const payload = values.results
        .filter(r => r.value > 0)
        .map(r => ({
          athlete_id: r.athlete_id,
          category: values.category,
          test_name: values.test_name,
          metrics: { value: r.value, unit: r.unit || 'n/a' },
          recorded_by: user.id
        }));

      if (payload.length === 0) return [];

      const { error } = await supabase
        .from('performance_assessments')
        .insert(payload);
      
      if (error) throw error;
      return payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['performance-results'] });
      toast({
        title: "Assessments Saved",
        description: `Successfully recorded ${data?.length} results.`,
      });
      // Clear values but keep athletes in grid
      const currentResults = form.getValues().results;
      replace(currentResults.map(r => ({ ...r, value: 0 })));
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  if (athletesLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="w-full shadow-lg border-primary/10">
      <CardHeader className="bg-muted/30 border-b">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Plus className="w-6 h-6 text-primary" />
              Batch Test Entry
            </CardTitle>
            <CardDescription>Record performance metrics for the whole squad</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select 
                value={selectedCategory} 
                onValueChange={(val: any) => {
                    setSelectedCategory(val);
                    form.setValue('category', val);
                }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(DEFAULT_TESTS).map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
                value={selectedTest} 
                onValueChange={(val) => {
                    setSelectedTest(val);
                    form.setValue('test_name', val);
                }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select Test" />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_TESTS[selectedCategory].map(test => (
                  <SelectItem key={test} value={test}>{test}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="w-[300px]">Athlete Name</TableHead>
                    <TableHead>Test Result ({selectedTest || '...'})</TableHead>
                    <TableHead className="w-[200px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id} className="hover:bg-primary/5 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {field.athlete_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <FormField
                          control={form.control}
                          name={`results.${index}.value`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  step="0.01"
                                  className="max-w-[150px] font-mono text-lg"
                                  {...field}
                                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <PBIndicator athleteId={field.athlete_id} testName={selectedTest} currentValue={form.watch(`results.${index}.value`)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="p-4 bg-muted/20 border-t flex justify-end">
              <Button 
                type="submit" 
                size="lg" 
                disabled={!selectedTest || saveMutation.isPending}
                className="gap-2 px-8 shadow-md"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Batch Results
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function PBIndicator({ athleteId, testName, currentValue }: { athleteId: string, testName: string, currentValue: number }) {
  const { personalBests } = usePersonalBests(athleteId);
  const pb = personalBests[testName];
  const pbValue = pb?.metrics.value;

  if (!testName) return null;
  if (currentValue <= 0) return <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Awaiting Entry</span>;

  const isPB = isBetterResult(testName, currentValue, pbValue);

  if (isPB) {
    return (
      <div className="flex items-center gap-1 text-green-600 animate-pulse">
        <Trophy className="w-3 h-3" />
        <span className="text-[10px] font-bold uppercase tracking-tighter">NEW PB potential</span>
      </div>
    );
  }

  return (
    <div className="text-[10px] text-muted-foreground flex flex-col">
       <span className="uppercase tracking-tighter">Current PB: {pbValue || 'N/A'}</span>
       {pbValue && <span className="text-red-400">-{Math.abs(currentValue - pbValue).toFixed(2)}</span>}
    </div>
  );
}
