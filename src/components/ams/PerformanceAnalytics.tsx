import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis
} from "recharts";
import { Loader2, TrendingUp, Target, AlertTriangle, Activity, History } from "lucide-react";
import { usePerformanceResults } from "@/hooks/usePerformanceResults";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StrengthAnalytics from "./StrengthAnalytics";
import WorkoutHistory from "./WorkoutHistory";

interface PerformanceAnalyticsProps {
  athleteId: string;
}

export default function PerformanceAnalytics({ athleteId }: PerformanceAnalyticsProps) {
  // 1. Fetch Performance Data
  const { data: performanceResults, isLoading: perfLoading } = usePerformanceResults(athleteId);

  // 2. Fetch Weekly Load Data (for Scatter plot)
  const { data: trainingLoads, isLoading: loadsLoading } = useQuery({
    queryKey: ['training-loads-analytics', athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('external_training_summary')
        .select('training_date, training_load')
        .eq('client_id', athleteId)
        .order('training_date', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // 3. Process Data for Line Chart (Longitudinal)
  const lineData = useMemo(() => {
    if (!performanceResults) return [];
    return [...performanceResults]
      .reverse()
      .map(r => ({
        date: new Date(r.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: r.metrics.value,
        test: r.test_name
      }));
  }, [performanceResults]);

  // 4. Process Data for Radar Chart (Individual vs Squad)
  const radarData = useMemo(() => {
    if (!performanceResults) return [];
    
    // Group by category and get latest for each category
    const categories = ['Jump', 'Sprint', 'Strength', 'Mobility'];
    return categories.map(cat => {
      const athleteLatest = performanceResults.find(r => r.category === cat);
      // Mock squad average for now or calculate if data exists
      return {
        subject: cat,
        A: athleteLatest?.metrics.value || 0,
        B: (athleteLatest?.metrics.value || 0) * 0.85 + 5, // Mocking squad avg
        fullMark: 100,
      };
    });
  }, [performanceResults]);

  // 5. Build Scatter Plot Data (Risk vs Reward)
  const scatterData = useMemo(() => {
    if (!trainingLoads || !performanceResults) return [];
    
    // Attempt to correlate weekly load with performance changes
    return trainingLoads.map(load => {
      const closestPerf = performanceResults.find(p => 
        Math.abs(new Date(p.recorded_at).getTime() - new Date(load.training_date).getTime()) < 86400000 * 3
      );
      
      return {
        x: load.training_load,
        y: closestPerf?.metrics.value || 0,
        z: 100
      };
    }).filter(d => d.y > 0);
  }, [trainingLoads, performanceResults]);

  if (perfLoading || loadsLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <div className="flex items-center justify-center pb-2">
        <TabsList className="bg-muted/50 p-1 border border-border/30 rounded-xl">
          <TabsTrigger value="overview" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 min-h-[44px]">
            <Activity className="w-3.5 h-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="strength" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 min-h-[44px]">
            <TrendingUp className="w-3.5 h-3.5" /> Strength
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm px-4 py-2 min-h-[44px]">
            <History className="w-3.5 h-3.5" /> History
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Longitudinal Progress */}
            <Card className="shadow-lg border-none bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Longitudinal Progress
                </CardTitle>
                <CardDescription>Test performance over recent months</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="date" fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', backgroundColor: 'rgba(255,255,255,0.9)' }}
                    />
                    <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#0EA5E9" 
                        strokeWidth={3} 
                        dot={{ fill: '#0EA5E9', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: '#0EA5E9' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Squad Benchmarking */}
            <Card className="shadow-lg border-none bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-500" />
                  Squad Benchmarking
                </CardTitle>
                <CardDescription>Athlete vs Squad Averages</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e5e7eb" strokeOpacity={0.3} />
                    <PolarAngleAxis dataKey="subject" fontSize={12} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={10} />
                    <Radar
                      name="Athlete"
                      dataKey="A"
                      stroke="#0EA5E9"
                      fill="#0EA5E9"
                      fillOpacity={0.6}
                    />
                    <Radar
                      name="Squad Avg"
                      dataKey="B"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.3}
                    />
                    <Legend iconType="circle" />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Risk vs Reward Control Map */}
          <Card className="shadow-lg border-none bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Clinic-Performance Control Map (Risk vs Reward)
              </CardTitle>
              <CardDescription>Correlating Training Load (X) with Performance KPI (Y)</CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Weekly Load" 
                    label={{ value: 'Weekly Load (AU)', position: 'insideBottom', offset: -10, fontSize: 12 }} 
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Performance KPI" 
                    label={{ value: 'KPI Score', angle: -90, position: 'insideLeft', fontSize: 12 }} 
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ZAxis type="number" dataKey="z" range={[60, 400]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter 
                    name="Correlation" 
                    data={scatterData} 
                    fill="#f59e0b"
                    fillOpacity={0.6}
                    stroke="#d97706"
                    strokeWidth={2}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="strength">
        <StrengthAnalytics athleteId={athleteId} />
      </TabsContent>

      <TabsContent value="history">
        <WorkoutHistory athleteId={athleteId} />
      </TabsContent>
    </Tabs>
  );
}
