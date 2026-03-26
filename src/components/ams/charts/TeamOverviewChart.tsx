import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { subDays, format } from 'date-fns';

interface TeamOverviewChartProps {
  logs: any[];
}

export default function TeamOverviewChart({ logs }: TeamOverviewChartProps) {
  const data = [];
  const today = new Date();
  
  for (let i = 13; i >= 0; i--) {
    const d = subDays(today, i);
    const dateStr = format(d, 'yyyy-MM-dd');
    
    // Filter logs for this day
    const dayLogs = logs.filter(l => l.created_at?.startsWith(dateStr));
    
    if (dayLogs.length === 0) {
      data.push({ date: format(d, 'MMM dd'), score: 0 });
      continue;
    }
    
    let sumScore = 0;
    dayLogs.forEach(log => {
      const rawScore = (
        log.sleep_score +
        (10 - log.stress_level) +
        (10 - log.soreness_level) +
        (10 - log.fatigue_level)
      ) / 4;
      sumScore += Math.round(rawScore * 10);
    });
    
    data.push({
      date: format(d, 'MMM dd'),
      score: Math.round(sumScore / dayLogs.length)
    });
  }

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Team Readiness Trend (14 Days)</CardTitle>
        <CardDescription>Average readiness score across all reporting athletes.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
