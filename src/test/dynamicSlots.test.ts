import { describe, it, expect } from 'vitest';
import { generateDynamicSlots } from '@/utils/dynamicSlots';

describe('Dynamic Slot Generation', () => {
    it('generates dynamic slots with break adjustments exactly matching user requirements', () => {
        // Shift: 7am to 8pm (07:00 to 20:00)
        // Breakfast break: 9am to 9:15am
        // Lunch: 1:30pm to 2pm (13:30 to 14:00)
        // Tea break: 4pm to 4:15pm (16:00 to 16:15)
        const shiftStart = "07:00:00";
        const shiftEnd = "20:00:00";
        const breaks = [
            { name: "Breakfast", start_time: "09:00", end_time: "09:15" },
            { name: "Lunch", start_time: "13:30", end_time: "14:00" },
            { name: "Tea Break", start_time: "16:00", end_time: "16:15" }
        ];

        const slots = generateDynamicSlots({
            shiftStart,
            shiftEnd,
            breaks,
            defaultSlotDuration: 60,
            capacityLimit: 2
        });

        // Expected slots list:
        // 1.  7:00 - 8:00 (60m)
        // 2.  8:00 - 9:00 (60m)
        // 3.  9:15 - 10:00 (45m)
        // 4.  10:00 - 11:00 (60m)
        // 5.  11:00 - 12:00 (60m)
        // 6.  12:00 - 13:00 (60m)
        // 7.  13:00 - 13:30 (30m)
        // 8.  14:00 - 15:00 (60m)
        // 9.  15:00 - 16:00 (60m)
        // 10. 16:15 - 17:00 (45m)
        // 11. 17:00 - 18:00 (60m)
        // 12. 18:00 - 19:00 (60m)
        // 13. 19:00 - 20:00 (60m)

        expect(slots).toHaveLength(13);

        expect(slots[0]).toMatchObject({ startTime: "07:00", endTime: "08:00", duration: 60 });
        expect(slots[1]).toMatchObject({ startTime: "08:00", endTime: "09:00", duration: 60 });
        expect(slots[2]).toMatchObject({ startTime: "09:15", endTime: "10:00", duration: 45 });
        expect(slots[3]).toMatchObject({ startTime: "10:00", endTime: "11:00", duration: 60 });
        expect(slots[4]).toMatchObject({ startTime: "11:00", endTime: "12:00", duration: 60 });
        expect(slots[5]).toMatchObject({ startTime: "12:00", endTime: "13:00", duration: 60 });
        expect(slots[6]).toMatchObject({ startTime: "13:00", endTime: "13:30", duration: 30 });
        expect(slots[7]).toMatchObject({ startTime: "14:00", endTime: "15:00", duration: 60 });
        expect(slots[8]).toMatchObject({ startTime: "15:00", endTime: "16:00", duration: 60 });
        expect(slots[9]).toMatchObject({ startTime: "16:15", endTime: "17:00", duration: 45 });
        expect(slots[10]).toMatchObject({ startTime: "17:00", endTime: "18:00", duration: 60 });
        expect(slots[11]).toMatchObject({ startTime: "18:00", endTime: "19:00", duration: 60 });
        expect(slots[12]).toMatchObject({ startTime: "19:00", endTime: "20:00", duration: 60 });
    });

    it('correctly handles day-of-week keyed breaks and occupancy status', () => {
        const shiftStart = "09:00:00";
        const shiftEnd = "13:00:00";
        const breaks = {
            "1": [{ name: "Morning Break", start_time: "10:30", end_time: "10:45" }]
        };

        const testDate = "2026-09-01";
        const bookedSessions = [
            {
                therapist_id: "doc-1",
                scheduled_start: new Date(`${testDate}T09:00:00`).toISOString(),
                scheduled_end: new Date(`${testDate}T10:00:00`).toISOString(),
                status: "Planned"
            }
        ];

        const slots = generateDynamicSlots({
            shiftStart,
            shiftEnd,
            breaks,
            dayOfWeek: 1,
            defaultSlotDuration: 60,
            bookedSessions,
            consultantId: "doc-1",
            dateStr: testDate,
            capacityLimit: 1
        });

        // 09:00 - 10:00 (60m, FULL because capacityLimit = 1 and 1 booking exists)
        // 10:00 - 10:30 (30m, before break)
        // 10:45 - 11:00 (15m, after break rounding up to 11:00)
        // 11:00 - 12:00 (60m)
        // 12:00 - 13:00 (60m)

        expect(slots).toHaveLength(5);
        expect(slots[0]).toMatchObject({ startTime: "09:00", endTime: "10:00", duration: 60, isBooked: true, status: 'waitlist' });
        expect(slots[1]).toMatchObject({ startTime: "10:00", endTime: "10:30", duration: 30, isBooked: false, status: 'available' });
        expect(slots[2]).toMatchObject({ startTime: "10:45", endTime: "11:00", duration: 15, isBooked: false, status: 'available' });
        expect(slots[3]).toMatchObject({ startTime: "11:00", endTime: "12:00", duration: 60, isBooked: false, status: 'available' });
        expect(slots[4]).toMatchObject({ startTime: "12:00", endTime: "13:00", duration: 60, isBooked: false, status: 'available' });
    });
});
