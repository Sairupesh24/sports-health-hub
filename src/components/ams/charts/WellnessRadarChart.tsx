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
    <div className="h-full w-full flex flex-col items-center justify-center -mt-4 animate-in fade-in duration-1000">
      <div className="text-center mb-2">
         <h4 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] italic">Trend Analysis</h4>
      </div>
      <div className="h-[300px] w-full max-w-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data} style={{ fontSize: '10px' }}>
            <PolarGrid stroke="rgba(255,255,255,0.05)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em' }} />
            <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgb(26, 31, 38)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px', color: 'white' }}
              itemStyle={{ color: 'white' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            <Radar name="Today" dataKey="today" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
            <Radar name="7d Avg" dataKey="average" stroke="rgba(255,255,255,0.2)" fill="rgba(255,255,255,0.1)" fillOpacity={0.3} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
