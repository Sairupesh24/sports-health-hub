import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { subDays, format } from 'date-fns';

interface WellnessRadarChartProps {
  logs: any[];
}

export default function WellnessRadarChart({ logs }: WellnessRadarChartProps) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = logs.filter(l => l.created_at?.startsWith(todayStr));
  let todaySleep = 0, todayStress = 0, todaySoreness = 0, todayFatigue = 0;
  
  if (todayLogs.length > 0) {
    const latest = todayLogs[0];
    todaySleep = latest.sleep_score;
    todayStress = 10 - latest.stress_level; 
    todaySoreness = 10 - latest.soreness_level;
    todayFatigue = 10 - latest.fatigue_level;
  }

  // 7-day average
  const sevenDaysAgo = subDays(new Date(), 7);
  const weekLogs = logs.filter(l => new Date(l.created_at) >= sevenDaysAgo);
  
  let avgSleep = 0, avgStress = 0, avgSoreness = 0, avgFatigue = 0;
  if (weekLogs.length > 0) {
    avgSleep = weekLogs.reduce((s, l) => s + l.sleep_score, 0) / weekLogs.length;
    avgStress = weekLogs.reduce((s, l) => s + (10 - l.stress_level), 0) / weekLogs.length;
    avgSoreness = weekLogs.reduce((s, l) => s + (10 - l.soreness_level), 0) / weekLogs.length;
    avgFatigue = weekLogs.reduce((s, l) => s + (10 - l.fatigue_level), 0) / weekLogs.length;
  }

  const data = [
    { metric: 'Sleep', today: Number(todaySleep.toFixed(1)), average: Number(avgSleep.toFixed(1)) },
    { metric: 'Stress', today: Number(todayStress.toFixed(1)), average: Number(avgStress.toFixed(1)) },
    { metric: 'Soreness', today: Number(todaySoreness.toFixed(1)), average: Number(avgSoreness.toFixed(1)) },
    { metric: 'Fatigue', today: Number(todayFatigue.toFixed(1)), average: Number(avgFatigue.toFixed(1)) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wellness Analysis</CardTitle>
        <CardDescription>Today vs 7-day Average</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--foreground))', fontSize: 13 }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Radar name="Today" dataKey="today" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} />
              <Radar name="7d Average" dataKey="average" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
