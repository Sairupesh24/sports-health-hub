import { describe, it, expect } from 'vitest';
import { generateDynamicSlots, resolveSpecialistSettings } from '@/utils/dynamicSlots';

describe('Custom Specialist Durations and Dynamic Slot Capacity', () => {
    it('generates 45-minute slots with 3 appointments capacity limit dynamically', () => {
        // Global configuration: 45 min duration, 3 appointments per slot capacity
        const shiftStart = "08:00:00";
        const shiftEnd = "11:00:00";
        const defaultSlotDuration = 45;
        const capacityLimit = 3;

        const testDate = "2026-09-01";
        const bookedSessions = [
            // Slot 1 (08:00 - 08:45) has 2 bookings -> should still be AVAILABLE (capacity is 3)
            {
                therapist_id: "physio-1",
                scheduled_start: new Date(`${testDate}T08:00:00`).toISOString(),
                scheduled_end: new Date(`${testDate}T08:45:00`).toISOString(),
                status: "Planned"
            },
            {
                therapist_id: "physio-1",
                scheduled_start: new Date(`${testDate}T08:00:00`).toISOString(),
                scheduled_end: new Date(`${testDate}T08:45:00`).toISOString(),
                status: "Planned"
            },
            // Slot 2 (08:45 - 09:30) has 3 bookings -> should be FULL (waitlist)
            {
                therapist_id: "physio-1",
                scheduled_start: new Date(`${testDate}T08:45:00`).toISOString(),
                scheduled_end: new Date(`${testDate}T09:30:00`).toISOString(),
                status: "Planned"
            },
            {
                therapist_id: "physio-1",
                scheduled_start: new Date(`${testDate}T08:45:00`).toISOString(),
                scheduled_end: new Date(`${testDate}T09:30:00`).toISOString(),
                status: "Planned"
            },
            {
                therapist_id: "physio-1",
                scheduled_start: new Date(`${testDate}T08:45:00`).toISOString(),
                scheduled_end: new Date(`${testDate}T09:30:00`).toISOString(),
                status: "Planned"
            }
        ];

        const slots = generateDynamicSlots({
            shiftStart,
            shiftEnd,
            defaultSlotDuration,
            capacityLimit,
            bookedSessions,
            consultantId: "physio-1",
            dateStr: testDate
        });

        // Expected 4 slots of 45 mins:
        // 08:00 - 08:45 (45m, 2 bookings -> available)
        // 08:45 - 09:30 (45m, 3 bookings -> FULL / waitlist)
        // 09:30 - 10:15 (45m, 0 bookings -> available)
        // 10:15 - 11:00 (45m, 0 bookings -> available)

        expect(slots).toHaveLength(4);
        expect(slots[0]).toMatchObject({
            startTime: "08:00",
            endTime: "08:45",
            duration: 45,
            bookedCount: 2,
            isBooked: false,
            status: "available"
        });
        expect(slots[1]).toMatchObject({
            startTime: "08:45",
            endTime: "09:30",
            duration: 45,
            bookedCount: 3,
            isBooked: true,
            status: "waitlist"
        });
        expect(slots[2]).toMatchObject({
            startTime: "09:30",
            endTime: "10:15",
            duration: 45,
            bookedCount: 0,
            isBooked: false,
            status: "available"
        });
        expect(slots[3]).toMatchObject({
            startTime: "10:15",
            endTime: "11:00",
            duration: 45,
            bookedCount: 0,
            isBooked: false,
            status: "available"
        });
    });

    it('resolves custom specialist overrides when allow_custom_duration is enabled', () => {
        const orgSettings = {
            allow_custom_duration: true,
            default_slot_duration: 60,
            default_slot_capacity: 2,
            custom_specialist_settings: {
                physiotherapist: { slot_duration: 45, capacity: 3 },
                nutritionist: { slot_duration: 30, capacity: 1 },
                sports_scientist: { slot_duration: 60, capacity: "infinity" }
            }
        };

        const physio = { id: "p-1", profession: "Physiotherapist" };
        const nutrition = { id: "n-1", profession: "Nutritionist" };
        const scientist = { id: "s-1", profession: "Sports Scientist" };
        const generic = { id: "g-1", profession: "General Consultant" };

        const physioSettings = resolveSpecialistSettings(orgSettings, physio);
        expect(physioSettings).toEqual({ slotDuration: 45, capacityLimit: 3 });

        const nutritionSettings = resolveSpecialistSettings(orgSettings, nutrition);
        expect(nutritionSettings).toEqual({ slotDuration: 30, capacityLimit: 1 });

        const scientistSettings = resolveSpecialistSettings(orgSettings, scientist);
        expect(scientistSettings).toEqual({ slotDuration: 60, capacityLimit: Infinity });

        const genericSettings = resolveSpecialistSettings(orgSettings, generic);
        expect(genericSettings).toEqual({ slotDuration: 60, capacityLimit: 2 });
    });

    it('falls back to global defaults when allow_custom_duration is disabled', () => {
        const orgSettings = {
            allow_custom_duration: false,
            default_slot_duration: 45,
            default_slot_capacity: 3,
            custom_specialist_settings: {
                physiotherapist: { slot_duration: 30, capacity: 1 }
            }
        };

        const physio = { id: "p-1", profession: "Physiotherapist" };
        const resolved = resolveSpecialistSettings(orgSettings, physio);

        // When allow_custom_duration is false, overrides are ignored and global firm defaults are used
        expect(resolved).toEqual({ slotDuration: 45, capacityLimit: 3 });
    });

    it('generates 60-min slots for Nutritionist with 1 capacity when configured in specialist category overrides', () => {
        const orgSettings = {
            allow_custom_duration: true,
            default_slot_duration: 30, // notice global default is 30
            default_slot_capacity: 2,
            custom_specialist_settings: {
                nutritionist: { slot_duration: 60, capacity: 1 },
                physiotherapist: { slot_duration: 45, capacity: 2 }
            }
        };

        const ganesh = { id: "ganesh-id", profession: "Nutritionist" };
        const resolved = resolveSpecialistSettings(orgSettings, ganesh);

        expect(resolved).toEqual({ slotDuration: 60, capacityLimit: 1 });

        // Shift 11:00 to 15:00 (no breaks)
        const slots = generateDynamicSlots({
            shiftStart: "11:00:00",
            shiftEnd: "15:00:00",
            defaultSlotDuration: resolved.slotDuration,
            capacityLimit: resolved.capacityLimit,
            consultantId: ganesh.id,
            dateStr: "2026-09-01"
        });

        expect(slots).toHaveLength(4);
        expect(slots[0]).toMatchObject({ startTime: "11:00", endTime: "12:00", duration: 60, capacityLimit: 1 });
        expect(slots[1]).toMatchObject({ startTime: "12:00", endTime: "13:00", duration: 60, capacityLimit: 1 });
        expect(slots[2]).toMatchObject({ startTime: "13:00", endTime: "14:00", duration: 60, capacityLimit: 1 });
        expect(slots[3]).toMatchObject({ startTime: "14:00", endTime: "15:00", duration: 60, capacityLimit: 1 });
    });
});
