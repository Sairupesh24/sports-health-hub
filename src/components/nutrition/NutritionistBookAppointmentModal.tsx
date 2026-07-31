import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, User, Apple, Save, Search, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/utils/api";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface SlotItem {
  startTime: string; // HH:mm format, e.g. "09:30"
  endTime: string;   // HH:mm format, e.g. "10:00"
  label: string;     // e.g. "09:30 - 10:00 AM"
  isBooked: boolean;
}

interface NutritionistBookAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  onSuccess?: () => void;
}

export default function NutritionistBookAppointmentModal({
  open,
  onOpenChange,
  defaultDate,
  onSuccess,
}: NutritionistBookAppointmentModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const todayStr = format(defaultDate || new Date(), "yyyy-MM-dd");

  const [loadingClients, setLoadingClients] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");

  const [consultants, setConsultants] = useState<any[]>([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState("");

  const [availabilityRules, setAvailabilityRules] = useState<any[]>([]);

  const [serviceType, setServiceType] = useState("Initial Nutrition Assessment");
  const [scheduledDate, setScheduledDate] = useState(todayStr);

  // Selected Slot Time
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [customStartTime, setCustomStartTime] = useState("09:30");
  const [customEndTime, setCustomEndTime] = useState("10:00");
  const [useCustomTime, setUseCustomTime] = useState(false);

  const [bookedSessions, setBookedSessions] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [sessionMode, setSessionMode] = useState("In-Person");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchOrgClients();
      fetchConsultants();
      fetchAvailabilityRules();
      if (defaultDate) {
        setScheduledDate(format(defaultDate, "yyyy-MM-dd"));
      }
    }
  }, [open, defaultDate]);

  useEffect(() => {
    if (open && scheduledDate) {
      fetchBookedSessions(scheduledDate);
    }
  }, [open, scheduledDate, selectedConsultantId]);

  const fetchOrgClients = async () => {
    try {
      setLoadingClients(true);
      const res = await apiFetch<any[]>("/clients");
      if (res && Array.isArray(res)) {
        setClients(res);
      }
    } catch (err) {
      console.warn("Failed to load clients:", err);
    } finally {
      setLoadingClients(false);
    }
  };

  const fetchConsultants = async () => {
    try {
      const res = await apiFetch<any[]>("/hr/employees");
      if (res && Array.isArray(res)) {
        const nutros = res.filter(
          (s) =>
            (s.profession || "").toLowerCase().includes("nutrition") ||
            (s.ams_role || "").toLowerCase().includes("nutrition") ||
            (s.role || "").toLowerCase().includes("nutrition") ||
            s.id === profile?.id
        );
        setConsultants(nutros.length > 0 ? nutros : res);
        if (profile?.id) {
          setSelectedConsultantId(profile.id);
        } else if (nutros.length > 0) {
          setSelectedConsultantId(nutros[0].id);
        }
      }
    } catch (err) {
      console.warn("Failed to load consultants:", err);
    }
  };

  const fetchAvailabilityRules = async () => {
    try {
      const res = await apiFetch<any[]>("/appointments/availability/bulk");
      if (res && Array.isArray(res)) {
        setAvailabilityRules(res);
      }
    } catch (err) {
      console.warn("Failed to load availability rules:", err);
    }
  };

  const fetchBookedSessions = async (dateStr: string) => {
    try {
      setLoadingBookings(true);
      const start = `${dateStr}T00:00:00.000Z`;
      const end = `${dateStr}T23:59:59.999Z`;
      const res = await apiFetch<any[]>(`/api/appointments?start=${start}&end=${end}`);
      if (res && Array.isArray(res)) {
        setBookedSessions(res);
      }
    } catch (err) {
      console.warn("Failed to load booked sessions:", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  // Generate availability slots strictly matching consultant availability shift timings
  const timeSlots = useMemo(() => {
    const dateObj = new Date(`${scheduledDate}T00:00:00`);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    // Find rule for selected consultant & day of week
    const targetConsultantId = selectedConsultantId || profile?.id;
    const rule = availabilityRules.find(
      (r) => r.consultant_id === targetConsultantId && Number(r.day_of_week) === dayOfWeek
    );

    let startMinutes = 9 * 60;  // Default 09:00 AM
    let endMinutes = 17 * 60;   // Default 05:00 PM (17:00)

    if (rule) {
      if (rule.start_time) {
        const parts = rule.start_time.split(":");
        startMinutes = (parseInt(parts[0], 10) || 9) * 60 + (parseInt(parts[1], 10) || 0);
      }
      if (rule.end_time) {
        const parts = rule.end_time.split(":");
        endMinutes = (parseInt(parts[0], 10) || 17) * 60 + (parseInt(parts[1], 10) || 0);
      }
    }

    const slotInterval = 30; // 30 mins
    const slots: SlotItem[] = [];

    let current = startMinutes;
    while (current + slotInterval <= endMinutes) {
      const startH = Math.floor(current / 60);
      const startM = current % 60;
      const endTotal = current + slotInterval;
      const endH = Math.floor(endTotal / 60);
      const endM = endTotal % 60;

      const formatTwoDigits = (num: number) => (num < 10 ? `0${num}` : `${num}`);

      const startFormatted = `${formatTwoDigits(startH)}:${formatTwoDigits(startM)}`;
      const endFormatted = `${formatTwoDigits(endH)}:${formatTwoDigits(endM)}`;

      const formatAmPm = (hh: number, mm: number) => {
        const ampm = hh >= 12 ? "PM" : "AM";
        const displayH = hh % 12 === 0 ? 12 : hh % 12;
        return `${displayH}:${formatTwoDigits(mm)} ${ampm}`;
      };

      const label = `${formatAmPm(startH, startM)} - ${formatAmPm(endH, endM)}`;

      // Check if slot overlaps any booked session
      const isBooked = bookedSessions.some((b) => {
        if (!b.scheduled_start) return false;
        if (targetConsultantId && b.therapist_id && b.therapist_id !== targetConsultantId) {
          return false;
        }
        const bStart = new Date(b.scheduled_start);
        const bEnd = b.scheduled_end ? new Date(b.scheduled_end) : new Date(bStart.getTime() + 30 * 60000);

        const slotStartObj = new Date(`${scheduledDate}T${startFormatted}:00`);
        const slotEndObj = new Date(`${scheduledDate}T${endFormatted}:00`);

        return slotStartObj < bEnd && slotEndObj > bStart;
      });

      slots.push({
        startTime: startFormatted,
        endTime: endFormatted,
        label,
        isBooked,
      });

      current += slotInterval;
    }

    return slots;
  }, [scheduledDate, bookedSessions, selectedConsultantId, availabilityRules, profile?.id]);

  const filteredClients = clients.filter(
    (c) =>
      `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.uhid || "").toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.mobile_no || "").includes(clientSearch)
  );

  const handleSelectSlot = (slot: SlotItem) => {
    if (slot.isBooked) return;
    setSelectedSlot(slot);
    setCustomStartTime(slot.startTime);
    setCustomEndTime(slot.endTime);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      toast({
        title: "Client Required",
        description: "Please select a client for the appointment.",
        variant: "destructive",
      });
      return;
    }

    const finalStart = useCustomTime ? customStartTime : selectedSlot?.startTime || customStartTime;
    const finalEnd = useCustomTime ? customEndTime : selectedSlot?.endTime || customEndTime;

    if (!finalStart) {
      toast({
        title: "Time Slot Required",
        description: "Please select an available time slot for the consultation.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        client_id: selectedClientId,
        therapist_id: selectedConsultantId || profile?.id,
        service_type: serviceType,
        scheduled_date: scheduledDate,
        start_time: finalStart,
        end_time: finalEnd,
        session_mode: sessionMode,
        session_notes: notes,
      };

      await apiFetch("/clinical/nutrition/schedule", { data: payload });

      toast({
        title: "Appointment Scheduled",
        description: `Nutrition consultation booked for ${scheduledDate} at ${finalStart}.`,
      });

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast({
        title: "Booking Failed",
        description: err.message || "Failed to schedule appointment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden bg-card border-border p-4 sm:p-6 rounded-2xl shadow-xl">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-emerald-500 shrink-0" /> Schedule Nutrition Consultation
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select client, date, and an available time slot to book a nutrition appointment.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-1 flex-1 max-h-[calc(90vh-120px)] space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Client Selection — Typeahead */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Client</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Type client name, UHID, or mobile..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    // If user clears or changes text, deselect
                    if (selectedClientId) {
                      const selected = clients.find((c) => c.id === selectedClientId);
                      const selectedName = selected
                        ? `${selected.first_name || ""} ${selected.last_name || ""} (${selected.uhid || "No UHID"})`
                        : "";
                      if (e.target.value !== selectedName) {
                        setSelectedClientId("");
                      }
                    }
                  }}
                  onFocus={() => setClientDropdownOpen(true)}
                  className="pl-8 text-xs h-9"
                  autoComplete="off"
                />

                {/* Suggestion list */}
                {clientDropdownOpen && clientSearch.length > 0 && !selectedClientId && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-[180px] overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <div className="px-3 py-3 text-xs text-muted-foreground italic text-center">
                        No clients found matching "{clientSearch}"
                      </div>
                    ) : (
                      filteredClients.slice(0, 50).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedClientId(c.id);
                            setClientSearch(`${c.first_name || ""} ${c.last_name || ""} (${c.uhid || "No UHID"})`);
                            setClientDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-muted/60 transition-colors flex items-center justify-between gap-2 border-b border-border/40 last:border-b-0"
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-foreground truncate">
                              {c.first_name} {c.last_name}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {c.uhid || "No UHID"} {c.mobile_no ? `• ${c.mobile_no}` : ""}
                            </span>
                          </div>
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                )}

                {/* Selected client indicator */}
                {selectedClientId && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
                    <Check className="w-3.5 h-3.5" /> Client selected
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientId("");
                        setClientSearch("");
                        setClientDropdownOpen(true);
                      }}
                      className="ml-1 text-muted-foreground hover:text-foreground underline"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Consultant / Specialist Selection */}
            {consultants.length > 1 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nutritionist / Consultant</Label>
                <select
                  value={selectedConsultantId}
                  onChange={(e) => {
                    setSelectedConsultantId(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="w-full h-9 px-3 text-xs rounded-md bg-card border border-border text-foreground font-medium"
                >
                  {consultants.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.first_name} {s.last_name} ({s.profession || s.ams_role || "Nutritionist"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. Service / Consultation Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Consultation Focus / Service</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Initial Nutrition Assessment">Initial Nutrition Assessment</SelectItem>
                  <SelectItem value="Diet Plan & Macro Target Review">Diet Plan & Macro Target Review</SelectItem>
                  <SelectItem value="Clinical Nutrition Follow-Up">Clinical Nutrition Follow-Up</SelectItem>
                  <SelectItem value="Pre-Competition Fueling Strategy">Pre-Competition Fueling Strategy</SelectItem>
                  <SelectItem value="Supplement Stack & Hydration Review">Supplement Stack & Hydration Review</SelectItem>
                  <SelectItem value="Weight Management & Body Composition">Weight Management & Body Composition</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Date Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Consultation Date</Label>
              <Input
                type="date"
                value={scheduledDate}
                onChange={(e) => {
                  setScheduledDate(e.target.value);
                  setSelectedSlot(null);
                }}
                className="text-xs font-mono max-w-xs"
                required
              />
            </div>

            {/* 5. SELECTABLE TIME SLOTS GRID (STRICTLY BOUNDED BY CONSULTANT AVAILABILITY) */}
            <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-500" /> Available Shift Time Slots ({timeSlots.length})
                </Label>

                <button
                  type="button"
                  onClick={() => setUseCustomTime(!useCustomTime)}
                  className="text-[11px] text-emerald-500 hover:underline font-semibold"
                >
                  {useCustomTime ? "Use Slot Picker" : "Custom Time Override"}
                </button>
              </div>

              {!useCustomTime ? (
                timeSlots.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground italic bg-card rounded-lg border border-border">
                    No availability shift slots configured for this date. Use "Custom Time Override" above or update Admin Availability.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[180px] overflow-y-auto pr-1 pt-1">
                    {timeSlots.map((slot, idx) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={slot.isBooked}
                          onClick={() => handleSelectSlot(slot)}
                          className={`p-2 rounded-lg border text-[11px] font-mono font-medium transition-all flex items-center justify-between gap-1 text-left ${
                            slot.isBooked
                              ? "bg-muted/40 border-border text-muted-foreground cursor-not-allowed opacity-50"
                              : isSelected
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold"
                              : "bg-card border-border hover:border-emerald-500/50 text-foreground"
                          }`}
                        >
                          <span className="truncate">{slot.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                          {slot.isBooked && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 border-rose-500/30 text-rose-500">
                              Booked
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-[11px]">Start Time</Label>
                    <Input
                      type="time"
                      value={customStartTime}
                      onChange={(e) => setCustomStartTime(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">End Time</Label>
                    <Input
                      type="time"
                      value={customEndTime}
                      onChange={(e) => setCustomEndTime(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              {selectedSlot && !useCustomTime && (
                <div className="text-xs text-emerald-500 font-medium pt-1 flex items-center gap-1 font-mono">
                  <Check className="w-3.5 h-3.5" /> Selected Slot: {selectedSlot.label}
                </div>
              )}
            </div>

            {/* 6. Session Mode */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Session Mode</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSessionMode("In-Person")}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    sessionMode === "In-Person"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  In-Person Consultation
                </button>
                <button
                  type="button"
                  onClick={() => setSessionMode("Online / Virtual")}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                    sessionMode === "Online / Virtual"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  Online / Virtual
                </button>
              </div>
            </div>

            {/* 7. Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Consultation Notes / Remarks</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Clinical goals, specific dietary focus..."
                className="text-xs resize-none"
              />
            </div>

            {/* Submit Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-border shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Save className="w-4 h-4" /> {submitting ? "Booking..." : "Schedule Appointment"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
