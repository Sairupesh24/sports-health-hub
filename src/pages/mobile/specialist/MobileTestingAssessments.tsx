import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MobileSpecialistLayout from "@/components/layout/MobileSpecialistLayout";
import { 
  Trophy, 
  ChevronDown, 
  ChevronUp, 
  Save, 
  Users, 
  Search,
  CheckCircle2,
  ChevronLeft,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { haptic } from "@/utils/haptic";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const DEFAULT_TESTS = {
  Jump: ['Countermovement Jump (CMJ)', 'Broad Jump', 'Squat Jump'],
  Sprint: ['10m Sprint', '30m Sprint', '40y Dash', 'Pro Agility'],
  Strength: ['Back Squat 1RM', 'Bench Press 1RM', 'Deadlift 1RM', 'Power Clean'],
  Mobility: ['FMS Score', 'Ankle Dorsiflexion', 'Internal Rotation'],
  Conditioning: ['Yo-Yo Test', 'Bronco', 'Max Aerobic Speed (MAS)']
};

export default function MobileTestingAssessments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof DEFAULT_TESTS>('Jump');
  const [selectedTest, setSelectedTest] = useState(DEFAULT_TESTS.Jump[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedAthleteId, setExpandedAthleteId] = useState<string | null>(null);
  const [testValues, setTestValues] = useState<Record<string, number>>({});

  // 1. Fetch Athletes
  const { data: athletes, isLoading } = useQuery({
    queryKey: ['mobile-athletes-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, first_name, last_name, uhid, is_vip, sport')
        .is('deleted_at', null);
      if (error) throw error;
      return data;
    }
  });

  // 2. Save Mutation
  const saveMutation = useMutation({
    mutationFn: async ({ athleteId, value }: { athleteId: string, value: number }) => {
      if (!user) throw new Error("Authentication required");

      const { error } = await supabase
        .from('performance_assessments')
        .insert({
          athlete_id: athleteId,
          category: selectedCategory,
          test_name: selectedTest,
          metrics: { value, unit: 'n/a' },
          recorded_by: user.id
        });
      
      if (error) throw error;
      return { athleteId, value };
    },
    onSuccess: (data) => {
      haptic.success();
      queryClient.invalidateQueries({ queryKey: ['performance-results'] });
      toast({
        title: "Measurement Saved",
        description: `Successfully recorded result for athlete.`,
        className: "bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest border-none"
      });
      // Clear value for this athlete
      setTestValues(prev => ({ ...prev, [data.athleteId]: 0 }));
      setExpandedAthleteId(null);
    }
  });

  const filteredAthletes = athletes?.filter(a => 
    `${a.first_name} ${a.last_name} ${a.uhid}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MobileSpecialistLayout title="Testing & Entry">
      <div className="space-y-6">
        
        {/* Back Button & Header */}
        <div className="flex items-center gap-4">
           <button onClick={() => navigate(-1)} className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-border/50 shadow-sm">
              <ChevronLeft className="w-5 h-5" />
           </button>
           <div className="flex-1">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Batch Entry</h2>
              <p className="text-xl font-black text-slate-900 dark:text-white italic">Performance Testing</p>
           </div>
        </div>

        {/* Test Selector */}
        <div className="grid grid-cols-2 gap-3">
           <Select value={selectedCategory} onValueChange={(val: any) => {
             setSelectedCategory(val);
             setSelectedTest(DEFAULT_TESTS[val][0]);
           }}>
              <SelectTrigger className="h-14 bg-white dark:bg-slate-900 border-border/50 rounded-2xl font-bold">
                 <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                 {Object.keys(DEFAULT_TESTS).map(cat => (
                   <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                 ))}
              </SelectContent>
           </Select>

           <Select value={selectedTest} onValueChange={setSelectedTest}>
              <SelectTrigger className="h-14 bg-white dark:bg-slate-900 border-border/50 rounded-2xl font-bold">
                 <SelectValue placeholder="Test Name" />
              </SelectTrigger>
              <SelectContent>
                 {DEFAULT_TESTS[selectedCategory].map(test => (
                   <SelectItem key={test} value={test}>{test}</SelectItem>
                 ))}
              </SelectContent>
           </Select>
        </div>

        {/* Search */}
        <div className="relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
           <Input 
             placeholder="Search athlete to record..." 
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             className="h-14 bg-white dark:bg-slate-900 border-border/50 rounded-2xl pl-12"
           />
        </div>

        {/* Athlete List (Expandable Cards) */}
        <div className="space-y-3 pb-24">
           {isLoading ? (
             <div className="py-20 flex flex-col items-center justify-center opacity-30">
                <Loader2 className="w-10 h-10 animate-spin" />
             </div>
           ) : filteredAthletes?.length === 0 ? (
             <div className="py-20 text-center opacity-30">
                <Users className="w-12 h-12 mx-auto mb-2" />
                <p className="font-black uppercase text-[10px] tracking-widest">No athletes found</p>
             </div>
           ) : (
             filteredAthletes?.map((athlete) => {
               const isExpanded = expandedAthleteId === athlete.id;
               const value = testValues[athlete.id] || "";

               return (
                 <div 
                   key={athlete.id}
                   className={cn(
                     "bg-white dark:bg-slate-900 rounded-[2.5rem] border border-border/50 shadow-sm transition-all duration-300 overflow-hidden",
                     isExpanded ? "ring-2 ring-primary/20 shadow-xl" : "hover:border-primary/20",
                     athlete.is_vip && !isExpanded && "vip-border"
                   )}
                 >
                   <div 
                     onClick={() => {
                        haptic.light();
                        setExpandedAthleteId(isExpanded ? null : athlete.id);
                     }}
                     className="p-5 flex items-center justify-between"
                   >
                     <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm",
                          athlete.is_vip ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        )}>
                          {athlete.first_name?.[0]}{athlete.last_name?.[0]}
                        </div>
                        <div>
                           <h4 className="font-black text-slate-900 dark:text-white leading-tight">
                             {athlete.first_name} {athlete.last_name}
                           </h4>
                           <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                             {athlete.uhid} • {athlete.sport || "General"}
                           </p>
                        </div>
                     </div>
                     {isExpanded ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 text-slate-300" />}
                   </div>

                   {isExpanded && (
                     <div className="px-5 pb-6 pt-2 animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 space-y-4">
                           <div className="space-y-2">
                              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 pl-1">
                                Enter Result ({selectedTest})
                              </label>
                              <div className="flex gap-2">
                                 <Input 
                                   type="number" 
                                   placeholder="0.00"
                                   step="0.01"
                                   value={value}
                                   onChange={(e) => setTestValues({ ...testValues, [athlete.id]: parseFloat(e.target.value) || 0 })}
                                   className="h-16 text-2xl font-black italic bg-white dark:bg-slate-900 border-border/50 rounded-xl"
                                 />
                                 <Button 
                                   disabled={!value || saveMutation.isPending}
                                   onClick={() => saveMutation.mutate({ athleteId: athlete.id, value: Number(value) })}
                                   className="h-16 w-16 rounded-xl bg-primary shadow-lg shadow-primary/20 flex-shrink-0"
                                 >
                                    {saveMutation.isPending && expandedAthleteId === athlete.id ? (
                                      <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                      <Save className="w-6 h-6" />
                                    )}
                                 </Button>
                              </div>
                           </div>

                           <div className="flex items-center gap-2 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                              <Trophy className="w-4 h-4 text-emerald-500" />
                              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-tighter">
                                 Current Personal Best: 42.50
                              </span>
                           </div>
                        </div>
                     </div>
                   )}
                 </div>
               );
             })
           )}
        </div>
      </div>
    </MobileSpecialistLayout>
  );
}
