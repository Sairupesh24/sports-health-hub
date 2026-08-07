import { describe, it, expect } from 'vitest';
import { parseISO } from 'date-fns';

const calculateOccupiedMinutes = (events: any[]) => {
    const activeEvents = events.filter(e => {
        const status = (e.status || '').toLowerCase();
        return status !== 'cancelled' && status !== 'rescheduled';
    });

    if (activeEvents.length === 0) return 0;

    const intervals = activeEvents
        .map(e => ({
            start: parseISO(e.scheduled_start).getTime(),
            end: parseISO(e.scheduled_end).getTime()
        }))
        .filter(i => !isNaN(i.start) && !isNaN(i.end) && i.end > i.start)
        .sort((a, b) => a.start - b.start);

    if (intervals.length === 0) return 0;

    const merged: { start: number; end: number }[] = [];
    for (const current of intervals) {
        if (merged.length === 0) {
            merged.push({ ...current });
        } else {
            const last = merged[merged.length - 1];
            if (current.start < last.end) {
                last.end = Math.max(last.end, current.end);
            } else {
                merged.push({ ...current });
            }
        }
    }

    const totalMs = merged.reduce((acc, curr) => acc + (curr.end - curr.start), 0);
    return totalMs / (1000 * 60);
};

describe('calculateOccupiedMinutes', () => {
    it('should correctly merge duplicate/overlapping time slots', () => {
        // Friday Aug 7 scenario from user screenshot:
        // Two sessions at 7:45 AM - 10:00 AM (2h 15m = 135 min each)
        // One session at 3:30 PM - 5:00 PM (1h 30m = 90 min)
        // One session at 4:00 PM - 5:30 PM (1h 30m = 90 min, overlaps 4:00-5:00)
        const events = [
            { scheduled_start: '2026-08-07T07:45:00', scheduled_end: '2026-08-07T10:00:00', status: 'Planned' },
            { scheduled_start: '2026-08-07T07:45:00', scheduled_end: '2026-08-07T10:00:00', status: 'Planned' },
            { scheduled_start: '2026-08-07T15:30:00', scheduled_end: '2026-08-07T17:00:00', status: 'Planned' },
            { scheduled_start: '2026-08-07T16:00:00', scheduled_end: '2026-08-07T17:30:00', status: 'Planned' },
        ];

        const totalMinutes = calculateOccupiedMinutes(events);
        // 7:45 to 10:00 = 135 mins
        // 15:30 to 17:30 = 120 mins
        // Total = 255 mins = 4.25 hours
        expect(totalMinutes).toBe(255);
        const filledHours = Number((totalMinutes / 60).toFixed(1));
        expect(filledHours).toBe(4.3);
        const emptyHours = Math.max(0, Number((8 - filledHours).toFixed(1)));
        expect(emptyHours).toBe(3.7);
        expect(filledHours + emptyHours).toBe(8.0);
    });

    it('should ignore cancelled and rescheduled sessions', () => {
        const events = [
            { scheduled_start: '2026-08-07T09:00:00', scheduled_end: '2026-08-07T10:00:00', status: 'Cancelled' },
            { scheduled_start: '2026-08-07T10:00:00', scheduled_end: '2026-08-07T11:00:00', status: 'Planned' },
        ];

        const totalMinutes = calculateOccupiedMinutes(events);
        expect(totalMinutes).toBe(60);
    });

    it('should handle non-overlapping sequential sessions correctly', () => {
        const events = [
            { scheduled_start: '2026-08-07T09:00:00', scheduled_end: '2026-08-07T10:00:00', status: 'Planned' },
            { scheduled_start: '2026-08-07T10:00:00', scheduled_end: '2026-08-07T12:00:00', status: 'Planned' },
        ];

        const totalMinutes = calculateOccupiedMinutes(events);
        expect(totalMinutes).toBe(180); // 3 hours
    });

    it('should return 0 when no active events exist', () => {
        expect(calculateOccupiedMinutes([])).toBe(0);
    });
});
