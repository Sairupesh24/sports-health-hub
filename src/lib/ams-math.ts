import { subDays, isAfter, isSameDay } from "date-fns";

export interface TrainingSession {
  created_at: string;
  calculated_load: number;
}

export function calculateAcuteLoad(sessions: TrainingSession[], curDate: Date = new Date()): number {
  const startDate = subDays(curDate, 7);
  
  const totalLoad = sessions.reduce((sum, s) => {
    const sDate = new Date(s.created_at);
    if ((isAfter(sDate, startDate) || isSameDay(sDate, startDate)) && 
        (isAfter(curDate, sDate) || isSameDay(curDate, sDate))) {
      return sum + (s.calculated_load || 0);
    }
    return sum;
  }, 0);
  
  return totalLoad / 7;
}

export function calculateChronicLoad(sessions: TrainingSession[], curDate: Date = new Date()): number {
  const startDate = subDays(curDate, 28);
  
  const totalLoad = sessions.reduce((sum, s) => {
    const sDate = new Date(s.created_at);
    if ((isAfter(sDate, startDate) || isSameDay(sDate, startDate)) && 
        (isAfter(curDate, sDate) || isSameDay(curDate, sDate))) {
      return sum + (s.calculated_load || 0);
    }
    return sum;
  }, 0);
  
  return totalLoad / 28;
}

export function calculateACWR(acute: number, chronic: number): number {
  if (chronic === 0) return 0;
  return Number((acute / chronic).toFixed(2));
}

export function calculateWorkloadHistory(sessions: TrainingSession[], days: number = 30) {
  const history = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const targetDate = subDays(today, i);
    const acute = calculateAcuteLoad(sessions, targetDate);
    const chronic = calculateChronicLoad(sessions, targetDate);
    
    history.push({
      date: targetDate.toISOString().split("T")[0], // YYYY-MM-DD
      acute: Number(acute.toFixed(1)),
      chronic: Number(chronic.toFixed(1)),
      acwr: calculateACWR(acute, chronic)
    });
  }
  
  return history;
}
