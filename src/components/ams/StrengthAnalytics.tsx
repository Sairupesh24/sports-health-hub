import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from "recharts";
import { Loader2, TrendingUp, Filter, Activity } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StrengthAnalyticsProps {
  athleteId: string;
}

export default function StrengthAnalytics({ athleteId }: StrengthAnalyticsProps) {
  const [selectedExercise, setSelectedExercise] = useState<string>("all");

  // 1. Fetch Workout Data
  const { data: workoutData, isLoading } = useQuery({
    queryKey: ['strength-analytics', athleteId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('athlete_item_logs' as any)
        .select(`
          weight_kg,
          reps,
          created_at,
          workout_item:workout_items!inner(
            lift:lift_items!inner(
              exercise_id,
              exercise:exercises(name, category)
            )
          )
        `)
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Flatten data for easier processing
      return (data as any[]).map(d => ({
        weight_kg: d.weight_kg,
        reps: d.reps,
        exercise_id: d.workout_item.lift.exercise_id,
        created_at: d.created_at,
        exercises: d.workout_item.lift.exercise
      }));
    }
  });

  // 2. Get unique exercises for filter
  const exercises = useMemo(() => {
    if (!workoutData) return [];
    const unique = new Map();
    workoutData.forEach(d => {
      unique.set(d.exercise_id, d.exercises.name);
    });
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
  }, [workoutData]);

  // 3. Process Data for Volume and 1RM
  const chartData = useMemo(() => {
    if (!workoutData) return [];
    
    const filtered = selectedExercise === "all" 
      ? workoutData 
      : workoutData.filter(d => d.exercise_id === selectedExercise);

    // Group by date
    const grouped = new Map();
    filtered.forEach(d => {
      const date = new Date(d.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const stats = grouped.get(date) || { volume: 0, max1RM: 0, count: 0 };
      
      const volume = (d.weight_kg || 0) * (d.reps || 0);
      const est1RM = d.reps > 0 ? (d.weight_kg / (1.0278 - 0.0278 * d.reps)) : 0;
      
      stats.volume += volume;
      stats.max1RM = Math.max(stats.max1RM, est1RM);
      stats.count += 1;
      
      grouped.set(date, stats);
    });

    return Array.from(grouped.entries()).map(([date, stats]) => ({
      date,
      volume: Math.round(stats.volume),
      est1RM: Math.round(stats.max1RM)
    }));
  }, [workoutData, selectedExercise]);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Strength Analytics
          </h2>
          <p className="text-sm text-muted-foreground">Tracking volume and estimated 1RM trends</p>
        </div>
        <div className="flex items-center gap-2 min-w-[200px]">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedExercise} onValueChange={setSelectedExercise}>
            <SelectTrigger className="bg-background/50 border-none shadow-sm h-9">
              <SelectValue placeholder="All Exercises" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Total Volume</SelectItem>
              {exercises.map(ex => (
                <SelectItem key={ex.id} value={ex.id}>{ex.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Tracking */}
        <Card className="glass-card shadow-none border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-md font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Volume Tracking (kg)
            </CardTitle>
            <CardDescription className="text-[10px] uppercase tracking-widest font-medium">Total weight moved per session</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                <XAxis dataKey="date" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} fontWeight="bold" />
                <YAxis fontSize={10} axisLine={false} tickLine={false} fontWeight="bold" />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255,255,255,0.8)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorVolume)"
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 1RM Estimation */}
        <Card className="glass-card shadow-none border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-md font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Estimated 1-Rep Max (kg)
            </CardTitle>
            <CardDescription className="text-[10px] uppercase tracking-widest font-medium">Based on Brzycki Formula</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                <XAxis dataKey="date" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} fontWeight="bold" />
                <YAxis fontSize={10} axisLine={false} tickLine={false} fontWeight="bold" />
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255,255,255,0.8)', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                   itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                />
                <Line 
                    type="monotone" 
                    dataKey="est1RM" 
                    stroke="#10B981" 
                    strokeWidth={4} 
                    dot={{ fill: '#10B981', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 8, fill: '#10B981', stroke: 'white', strokeWidth: 2 }}
                    animationDuration={2000}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
