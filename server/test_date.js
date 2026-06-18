import { parseISO, isSameDay } from 'date-fns';

const scheduled_start = "2026-05-27T10:30:00.000Z";
const currentDate = new Date("2026-05-27T17:53:38+05:30");

const parsed = parseISO(scheduled_start);
console.log("parsed:", parsed.toString());
console.log("currentDate:", currentDate.toString());
console.log("isSameDay:", isSameDay(parsed, currentDate));
