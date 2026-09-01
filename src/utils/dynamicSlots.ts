export interface DynamicSlot {
    startTime: string; // "07:00"
    endTime: string;   // "08:00"
    label: string;     // "7:00 AM - 8:00 AM (60m)"
    timeLabel: string; // "7:00 AM - 8:00 AM"
    duration: number;  // duration in minutes (e.g. 60, 45, 30)
    status: 'available' | 'flex' | 'waitlist';
    bookedCount: number;
    capacityLimit: number;
    isBooked: boolean;
}

export interface BreakItem {
    name?: string;
    start_time: string;
    end_time: string;
}

export function timeToMinutes(timeStr: string | null | undefined): number {
    if (!timeStr) return 0;
    const parts = timeStr.trim().split(":");
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    return h * 60 + m;
}

export function minutesToHHMM(minutes: number): string {
    const norm = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const h = Math.floor(norm / 60);
    const m = norm % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(h)}:${pad(m)}`;
}

export function minutesToAmPm(minutes: number): string {
    const norm = ((minutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const h24 = Math.floor(norm / 60);
    const m = norm % 60;
    const ampm = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${h12}:${pad(m)} ${ampm}`;
}

export function extractActiveBreaks(
    breaksData: any,
    dayOfWeek?: number
): { startMin: number; endMin: number; name?: string }[] {
    let rawBreaks: BreakItem[] = [];

    if (Array.isArray(breaksData)) {
        rawBreaks = breaksData;
    } else if (breaksData && typeof breaksData === "object") {
        const dayKey = dayOfWeek !== undefined ? dayOfWeek.toString() : null;
        if (dayKey && Array.isArray(breaksData[dayKey]) && breaksData[dayKey].length > 0) {
            rawBreaks = breaksData[dayKey];
        } else if (Array.isArray(breaksData.all) && breaksData.all.length > 0) {
            rawBreaks = breaksData.all;
        }
    }

    return rawBreaks
        .map(b => ({
            name: b.name || "Break",
            startMin: timeToMinutes(b.start_time),
            endMin: timeToMinutes(b.end_time)
        }))
        .filter(b => b.endMin > b.startMin)
        .sort((a, b) => a.startMin - b.startMin);
}

export interface GenerateSlotsOptions {
    shiftStart: string; // e.g. "07:00:00" or "07:00"
    shiftEnd: string;   // e.g. "20:00:00" or "20:00"
    breaks?: any;
    dayOfWeek?: number;
    defaultSlotDuration?: number; // default 60 mins
    bookedSessions?: any[];
    consultantId?: string;
    dateStr?: string; // "YYYY-MM-DD"
    capacityLimit?: number; // 1, 2, Infinity
}

/**
 * Generates dynamic slots based on shift hours and breaks.
 * Rule:
 * - Before a break, the slot truncates at break start (e.g. 1:00 PM to 1:30 PM for lunch at 1:30 PM).
 * - After an off-hour break (e.g. 9:15 AM or 4:15 PM), the slot adjusts to the next top of the hour (e.g. 9:15 AM - 10:00 AM).
 */
export function generateDynamicSlots(options: GenerateSlotsOptions): DynamicSlot[] {
    const {
        shiftStart,
        shiftEnd,
        breaks,
        dayOfWeek,
        defaultSlotDuration = 60,
        bookedSessions = [],
        consultantId,
        dateStr,
        capacityLimit = 1
    } = options;

    const startMin = timeToMinutes(shiftStart);
    const endMin = timeToMinutes(shiftEnd);
    if (endMin <= startMin) return [];

    const activeBreaks = extractActiveBreaks(breaks, dayOfWeek);
    const slots: DynamicSlot[] = [];
    let currentMin = startMin;
    let justExitedOffHourBreak = false;

    while (currentMin < endMin) {
        // 1. If inside any break, jump past it to break end
        const insideBreak = activeBreaks.find(
            br => currentMin >= br.startMin && currentMin < br.endMin
        );
        if (insideBreak) {
            currentMin = insideBreak.endMin;
            justExitedOffHourBreak = currentMin % 60 !== 0;
            continue;
        }

        // 2. Determine target end time:
        // If just exited an off-the-hour break (e.g. 9:15 AM, 4:15 PM), adjust to next top of the hour.
        // Otherwise, progress by default slot duration (e.g. 45m, 60m).
        let targetEndMin: number;
        if (justExitedOffHourBreak) {
            targetEndMin = Math.ceil(currentMin / 60) * 60;
            justExitedOffHourBreak = false;
        } else {
            targetEndMin = currentMin + defaultSlotDuration;
        }

        // 3. Truncate at next upcoming break start if earlier
        const nextBreak = activeBreaks.find(
            br => br.startMin > currentMin && br.startMin < targetEndMin
        );
        if (nextBreak) {
            targetEndMin = nextBreak.startMin;
        }

        // 4. Truncate at shift end
        if (targetEndMin > endMin) {
            targetEndMin = endMin;
        }

        const duration = targetEndMin - currentMin;

        // 5. If slot is at least 15 minutes, emit slot
        if (duration >= 15) {
            const startHHMM = minutesToHHMM(currentMin);
            const endHHMM = minutesToHHMM(targetEndMin);

            const startAmPm = minutesToAmPm(currentMin);
            const endAmPm = minutesToAmPm(targetEndMin);
            const timeLabel = `${startAmPm} - ${endAmPm}`;
            const label = `${timeLabel} (${duration}m)`;

            // Check bookings overlap
            let bookedCount = 0;
            if (dateStr && bookedSessions.length > 0) {
                const slotStartMs = new Date(`${dateStr}T${startHHMM}:00`).getTime();
                const slotEndMs = new Date(`${dateStr}T${endHHMM}:00`).getTime();

                bookedCount = bookedSessions.filter(s => {
                    if (consultantId) {
                        const sTherapistId = String(
                            s.therapist_id || 
                            s.scientist_id || 
                            s.rawSession?.therapist_id || 
                            s.rawSession?.scientist_id || 
                            ''
                        ).toLowerCase();
                        if (sTherapistId !== String(consultantId).toLowerCase()) return false;
                    }

                    const sStatus = String(s.status || '').toLowerCase();
                    const isInactive = 
                        sStatus === 'cancelled' || 
                        sStatus === 'waitlisted' || 
                        sStatus === 'waiting' || 
                        sStatus === 'deleted' || 
                        sStatus === 'missed' || 
                        sStatus === 'rescheduled';
                    if (isInactive) return false;

                    if (!s.scheduled_start) return false;
                    const sStart = new Date(s.scheduled_start).getTime();
                    const sEnd = s.scheduled_end 
                        ? new Date(s.scheduled_end).getTime() 
                        : (sStart + duration * 60000);

                    return (slotStartMs < sEnd) && (slotEndMs > sStart);
                }).length;
            }

            const isBooked = capacityLimit !== Infinity && bookedCount >= capacityLimit;
            const status: 'available' | 'flex' | 'waitlist' = isBooked ? 'waitlist' : 'available';

            slots.push({
                startTime: startHHMM,
                endTime: endHHMM,
                label: isBooked ? `${timeLabel} (FULL)` : label,
                timeLabel,
                duration,
                status,
                bookedCount,
                capacityLimit,
                isBooked
            });
        }

        currentMin = targetEndMin;
        if (slots.length >= 60) break; // Safety guard
    }

    return slots;
}

export interface SpecialistInfo {
    id?: string;
    profession?: string;
    ams_role?: string;
    role?: string;
}

/**
 * Resolves the applicable slot duration and appointment capacity limit
 * based on organization global settings and custom specialist overrides.
 */
export function resolveSpecialistSettings(
    orgSettings: any,
    specialist?: SpecialistInfo | null
): { slotDuration: number; capacityLimit: number } {
    const defaultDuration = parseInt(orgSettings?.default_slot_duration, 10) || 60;
    const defaultCapacity = parseInt(orgSettings?.default_slot_capacity, 10) || 2;

    if (!specialist) {
        return { slotDuration: defaultDuration, capacityLimit: defaultCapacity };
    }

    const prof = (specialist.profession || specialist.ams_role || specialist.role || '').toLowerCase();
    const isScientist = prof.includes('scientist');
    let baseCapacity = isScientist ? Infinity : defaultCapacity;

    if (orgSettings?.allow_custom_duration && orgSettings?.custom_specialist_settings) {
        const custom = typeof orgSettings.custom_specialist_settings === 'string'
            ? JSON.parse(orgSettings.custom_specialist_settings)
            : orgSettings.custom_specialist_settings;

        let override = (specialist.id && custom[specialist.id]) 
            || custom[prof] 
            || (specialist.role && custom[specialist.role.toLowerCase()])
            || (specialist.profession && custom[specialist.profession.toLowerCase()]);

        if (!override && custom) {
            if (prof.includes('nutrition') || prof.includes('diet')) {
                override = custom.nutritionist;
            } else if (prof.includes('physio') || prof.includes('physician') || prof.includes('doctor')) {
                override = custom.physiotherapist;
            } else if (prof.includes('scientist') || prof.includes('s&c')) {
                override = custom.sports_scientist;
            } else if (prof.includes('massage') || prof.includes('recovery')) {
                override = custom.massage_therapist;
            }
        }

        if (override) {
            const slotDuration = parseInt(override.slot_duration, 10) || defaultDuration;
            const capacityLimit = (override.capacity === 'infinity' || override.capacity === Infinity || override.capacity === 'Unlimited')
                ? Infinity
                : (parseInt(override.capacity, 10) || baseCapacity);
            return { slotDuration, capacityLimit };
        }
    }

    return { slotDuration: defaultDuration, capacityLimit: baseCapacity };
}
