import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/utils/api";
import { useNavigate } from "react-router-dom";
import {
  format,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  Apple,
  Eye,
  CheckCircle2,
} from "lucide-react";
import NutritionistBookAppointmentModal from "@/components/nutrition/NutritionistBookAppointmentModal";

type ViewMode = "day" | "week" | "month";

export default function NutritionistSchedule() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const dateRange = useMemo(() => {
    let start, end;
    if (viewMode === "day") {
      start = currentDate;
      end = currentDate;
    } else if (viewMode === "week") {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    }

    return {
      start: format(start, "yyyy-MM-dd"),
      end: format(addDays(end, 1), "yyyy-MM-dd"),
    };
  }, [currentDate, viewMode]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<any[]>(
        `/api/appointments?start=${dateRange.start}&end=${dateRange.end}`
      );
      if (res && Array.isArray(res)) {
        setAppointments(res);
      }
    } catch (err) {
      console.warn("Failed to load appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [dateRange]);

  const handlePrev = () => {
    if (viewMode === "day") setCurrentDate(addDays(currentDate, -1));
    else if (viewMode === "week") setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    if (viewMode === "day") setCurrentDate(addDays(currentDate, 1));
    else if (viewMode === "week") setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const daysInView = useMemo(() => {
    if (viewMode === "day") return [currentDate];
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate, viewMode]);

  const getPreferenceBadge = (pref: string) => {
    switch (pref) {
      case "Vegetarian":
      case "Veg":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">Veg</Badge>;
      case "Non-Vegetarian":
        return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[10px]">Non-Veg</Badge>;
      case "Ovo-Vegetarian":
      case "Ovo vegetarian":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">Ovo-Veg</Badge>;
      case "Vegan":
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[10px]">Vegan</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground text-[10px]">{pref || "Not Set"}</Badge>;
    }
  };

  return (
    <DashboardLayout role="nutritionist">
      <div className="space-y-6 pb-12">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-emerald-500" /> Nutrition Consultations Schedule
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Interactive calendar for scheduling diet consultations and clinical assessments.
            </p>
          </div>

          <Button
            onClick={() => setIsBookModalOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <Plus className="w-4 h-4" /> Schedule Consultation
          </Button>
        </div>

        {/* Calendar Control Bar */}
        <Card className="border-border">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
            {/* Nav controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={handlePrev} className="h-8 w-8">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleToday} className="h-8 text-xs font-semibold">
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={handleNext} className="h-8 w-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <h2 className="text-base font-bold text-foreground">
                {viewMode === "month" && format(currentDate, "MMMM yyyy")}
                {viewMode === "week" &&
                  `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`}
                {viewMode === "day" && format(currentDate, "EEEE, MMMM d, yyyy")}
              </h2>
            </div>

            {/* View switchers */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border">
              {(["day", "week", "month"] as ViewMode[]).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={viewMode === mode ? "default" : "ghost"}
                  onClick={() => setViewMode(mode)}
                  className="text-xs h-7 px-3 capitalize"
                >
                  {mode}
                </Button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-4">
            {/* Month / Week Grid View */}
            <div className={`grid gap-2 ${viewMode === "day" ? "grid-cols-1" : "grid-cols-7"}`}>
              {/* Day headers for week/month view */}
              {viewMode !== "day" &&
                ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <div key={d} className="text-center font-bold text-xs text-muted-foreground py-2 bg-muted/30 rounded-lg">
                    {d}
                  </div>
                ))}

              {/* Day Grid Cells */}
              {daysInView.map((day, idx) => {
                const dayStr = format(day, "yyyy-MM-dd");
                const dayAppointments = appointments.filter((apt) => {
                  const aptDate = apt.scheduled_start ? format(new Date(apt.scheduled_start), "yyyy-MM-dd") : "";
                  return aptDate === dayStr;
                });

                const isCurrent = isSameDay(day, new Date());
                const isSelectedMonth = isSameMonth(day, currentDate);

                return (
                  <div
                    key={idx}
                    className={`min-h-[120px] p-2 rounded-xl border flex flex-col justify-between transition-colors ${
                      isCurrent
                        ? "border-emerald-500 bg-emerald-500/5"
                        : isSelectedMonth
                        ? "border-border bg-card"
                        : "border-border/40 bg-muted/20 opacity-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-mono font-bold rounded-full px-2 py-0.5 ${
                          isCurrent ? "bg-emerald-500 text-white" : "text-foreground"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      {dayAppointments.length > 0 && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 font-mono">
                          {dayAppointments.length}
                        </Badge>
                      )}
                    </div>

                    {/* Appointments inside cell */}
                    <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[140px]">
                      {dayAppointments.map((apt) => {
                        const clientObj = apt.client || {};
                        const clientName = clientObj.first_name
                          ? `${clientObj.first_name} ${clientObj.last_name}`
                          : apt.client_name || "Client";
                        const clientId = clientObj.id || apt.client_id;
                        const timeStr = apt.scheduled_start ? format(new Date(apt.scheduled_start), "hh:mm a") : "--";

                        return (
                          <div
                            key={apt.id}
                            onClick={() => navigate(`/nutritionist/clients/${clientId}`)}
                            className="p-2 rounded-lg bg-card border border-border hover:border-emerald-500 shadow-2xs cursor-pointer text-left space-y-1 group transition-all"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {timeStr}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">
                                {apt.status || "Planned"}
                              </Badge>
                            </div>
                            <div className="font-bold text-xs text-foreground group-hover:text-emerald-500 truncate">
                              {clientName}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {apt.service_type || "Nutrition Consultation"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Book Appointment Modal */}
        <NutritionistBookAppointmentModal
          open={isBookModalOpen}
          onOpenChange={setIsBookModalOpen}
          defaultDate={currentDate}
          onSuccess={() => fetchAppointments()}
        />
      </div>
    </DashboardLayout>
  );
}
