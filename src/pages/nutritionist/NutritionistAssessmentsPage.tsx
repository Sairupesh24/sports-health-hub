import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ClipboardList, Search, Plus, Eye, Calendar as CalendarIcon, X } from "lucide-react";
import { format, isSameDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/utils/api";
import type { NutritionAssessment } from "@/types/nutrition";
import NutritionAssessmentForm from "@/components/nutrition/NutritionAssessmentForm";
import NutritionAssessmentViewer, { formatDateDDMMYYYY } from "@/components/nutrition/NutritionAssessmentViewer";

// Helper to safely parse dates regardless of ISO or plain format
const parseAssessmentDate = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  try {
    const cleanDate = dateStr.split("T")[0];
    const parts = cleanDate.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }
  } catch {
    return null;
  }
  return null;
};

export default function NutritionistAssessmentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [assessments, setAssessments] = useState<NutritionAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<NutritionAssessment | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<NutritionAssessment[]>("/clinical/nutrition/assessments");
      if (data && Array.isArray(data)) {
        setAssessments(data);
      }
    } catch (err) {
      console.warn("Error loading assessments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const filteredAssessments = assessments.filter((ass) => {
    // 1. Text Search Filter
    const matchesSearch =
      (ass.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ass.taken_by || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ass.dietary_preference || "").toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Date / Date Range Filter
    if (dateRange?.from) {
      const recordDate = parseAssessmentDate(ass.assessment_date || ass.created_at);
      if (!recordDate) return false;

      const fromDate = new Date(
        dateRange.from.getFullYear(),
        dateRange.from.getMonth(),
        dateRange.from.getDate(),
        0, 0, 0, 0
      );

      const toDate = dateRange.to
        ? new Date(
            dateRange.to.getFullYear(),
            dateRange.to.getMonth(),
            dateRange.to.getDate(),
            23, 59, 59, 999
          )
        : new Date(
            dateRange.from.getFullYear(),
            dateRange.from.getMonth(),
            dateRange.from.getDate(),
            23, 59, 59, 999
          );

      const time = recordDate.getTime();
      if (time < fromDate.getTime() || time > toDate.getTime()) {
        return false;
      }
    }

    return true;
  });

  return (
    <DashboardLayout role="nutritionist">
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-emerald-500" /> NUTRITION ASSESSMENT FORM Library
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Search, view, and print ingested clinical nutrition assessment reports.
            </p>
          </div>

          <Button onClick={() => setAssessmentModalOpen(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            <Plus className="w-4 h-4" /> New Assessment Form
          </Button>
        </div>

        {/* Repository Table Card */}
        <Card className="border-border">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold">Ingested Assessment Records</CardTitle>
                {dateRange?.from && (
                  <Badge variant="outline" className="text-[10px] font-semibold border-emerald-500/40 text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30">
                    Date Filtered
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-0.5">
                {dateRange?.from ? (
                  <span>
                    Found <strong className="text-foreground">{filteredAssessments.length}</strong> {filteredAssessments.length === 1 ? "record" : "records"}{" "}
                    {dateRange.to && !isSameDay(dateRange.from, dateRange.to)
                      ? `between ${format(dateRange.from, "dd/MM/yyyy")} and ${format(dateRange.to, "dd/MM/yyyy")}`
                      : `on ${format(dateRange.from, "dd/MM/yyyy")}`}{" "}
                    (of {assessments.length} total)
                  </span>
                ) : (
                  <span>Total {filteredAssessments.length} assessment records logged</span>
                )}
              </CardDescription>
            </div>

            {/* Filter controls beside search box */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Date Picker Popover */}
              <div className="flex items-center gap-1">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-9 text-xs justify-start text-left font-normal border-border gap-2 shadow-sm transition-colors",
                        dateRange?.from
                          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="truncate max-w-[210px]">
                        {dateRange?.from ? (
                          dateRange.to && !isSameDay(dateRange.from, dateRange.to) ? (
                            `${format(dateRange.from, "dd/MM/yyyy")} - ${format(dateRange.to, "dd/MM/yyyy")}`
                          ) : (
                            format(dateRange.from, "dd/MM/yyyy")
                          )
                        ) : (
                          "Filter by date..."
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0 border border-border shadow-2xl bg-card max-h-[min(520px,calc(100vh-100px))] overflow-y-auto"
                    align="end"
                    side="bottom"
                    sideOffset={6}
                    avoidCollisions={true}
                    collisionPadding={16}
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Calendar on the left */}
                      <div className="p-2 sm:p-2.5">
                        <Calendar
                          initialFocus
                          mode="range"
                          defaultMonth={dateRange?.from || new Date()}
                          selected={dateRange}
                          onSelect={setDateRange}
                          numberOfMonths={1}
                          className="p-1"
                          classNames={{
                            month: "space-y-1.5",
                            caption: "flex justify-center pt-0 relative items-center mb-1",
                            caption_label: "text-xs font-semibold",
                            nav_button: cn(
                              buttonVariants({ variant: "outline" }),
                              "h-6 w-6 bg-transparent p-0 opacity-70 hover:opacity-100"
                            ),
                            nav_button_previous: "absolute left-0",
                            nav_button_next: "absolute right-0",
                            table: "w-full border-collapse space-y-0.5",
                            head_row: "flex justify-center",
                            head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.72rem]",
                            row: "flex w-full justify-center mt-0.5",
                            cell: "h-7 w-8 text-center text-xs p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                            day: cn(
                              buttonVariants({ variant: "ghost" }),
                              "h-7 w-8 p-0 text-xs font-normal aria-selected:opacity-100"
                            ),
                          }}
                        />
                      </div>

                      {/* Presets Sidebar on the right */}
                      <div className="border-t sm:border-t-0 sm:border-l border-border p-3 flex flex-col justify-between w-full sm:w-36 bg-muted/20">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2 px-1">
                            Presets
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={cn(
                              "w-full justify-start text-xs h-7 px-2 font-medium transition-colors",
                              dateRange?.from && dateRange?.to && isSameDay(dateRange.from, new Date()) && isSameDay(dateRange.to, new Date())
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold"
                                : "hover:bg-muted/70 text-foreground"
                            )}
                            onClick={() => {
                              const now = new Date();
                              setDateRange({ from: now, to: now });
                            }}
                          >
                            Today
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-7 px-2 font-medium hover:bg-muted/70 text-foreground transition-colors"
                            onClick={() => {
                              const now = new Date();
                              const past = new Date();
                              past.setDate(past.getDate() - 6);
                              setDateRange({ from: past, to: now });
                            }}
                          >
                            Last 7 Days
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-7 px-2 font-medium hover:bg-muted/70 text-foreground transition-colors"
                            onClick={() => {
                              const now = new Date();
                              const past = new Date();
                              past.setDate(past.getDate() - 29);
                              setDateRange({ from: past, to: now });
                            }}
                          >
                            Last 30 Days
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-7 px-2 font-medium hover:bg-muted/70 text-foreground transition-colors"
                            onClick={() => {
                              const now = new Date();
                              const start = new Date(now.getFullYear(), now.getMonth(), 1);
                              const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                              setDateRange({ from: start, to: end });
                            }}
                          >
                            This Month
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs h-7 px-2 font-medium hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setDateRange(undefined)}
                          >
                            All Time
                          </Button>
                        </div>

                        {dateRange?.from && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full text-[11px] h-6 px-2 mt-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/50"
                            onClick={() => setDateRange(undefined)}
                          >
                            Reset Filter
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="py-2 px-3 border-t border-border bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="text-[11px] truncate max-w-[190px]">
                        {dateRange?.from ? (
                          dateRange.to && !isSameDay(dateRange.from, dateRange.to) ? (
                            <span>
                              {format(dateRange.from, "dd/MM/yyyy")} – {format(dateRange.to, "dd/MM/yyyy")}
                            </span>
                          ) : (
                            <span>{format(dateRange.from, "dd/MM/yyyy")}</span>
                          )
                        ) : (
                          <span>Click a date or range</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="h-6 px-3 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                        onClick={() => setCalendarOpen(false)}
                      >
                        Done
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                {dateRange?.from && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDateRange(undefined)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
                    title="Clear date filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Search Box */}
              <div className="relative w-64 sm:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, clinician..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-7 text-xs h-9"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground p-0.5"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Client Name</TableHead>
                    <TableHead className="text-xs font-bold">Date</TableHead>
                    <TableHead className="text-xs font-bold">Category</TableHead>
                    <TableHead className="text-xs font-bold">Preference</TableHead>
                    <TableHead className="text-xs font-bold">Height / Weight</TableHead>
                    <TableHead className="text-xs font-bold">BMI</TableHead>
                    <TableHead className="text-xs font-bold">Taken by</TableHead>
                    <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredAssessments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                        {loading ? (
                          "Loading assessments..."
                        ) : (dateRange?.from || searchTerm) ? (
                          <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                            <CalendarIcon className="w-8 h-8 text-muted-foreground/40 mb-1" />
                            <p className="font-semibold text-foreground text-sm">No assessments match your filters</p>
                            <p className="text-[11px] text-muted-foreground">
                              Try selecting a different date range or clearing your search criteria.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs mt-2"
                              onClick={() => {
                                setDateRange(undefined);
                                setSearchTerm("");
                              }}
                            >
                              Reset all filters
                            </Button>
                          </div>
                        ) : (
                          "No assessment records logged yet."
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssessments.map((ass, idx) => (
                      <TableRow key={ass.id || idx} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-semibold text-sm text-foreground">{ass.name || "Client"}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{ass.profession}</div>
                        </TableCell>

                        <TableCell className="font-mono text-xs">{formatDateDDMMYYYY(ass.assessment_date)}</TableCell>

                        <TableCell>
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {ass.client_type}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {ass.dietary_preference}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-xs font-mono">
                          {ass.height_cm ? `${ass.height_cm} cm` : "--"} / {ass.weight_kg ? `${ass.weight_kg} kg` : "--"}
                        </TableCell>

                        <TableCell className="text-xs font-mono font-bold text-emerald-500">
                          {ass.bmi ? `${ass.bmi} kg/m²` : "--"}
                        </TableCell>

                        <TableCell className="text-xs font-medium">{ass.taken_by}</TableCell>

                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedAssessment(ass);
                              setViewModalOpen(true);
                            }}
                            className="h-8 text-xs gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Form
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* New Assessment Form Dialog */}
        <Dialog open={assessmentModalOpen} onOpenChange={setAssessmentModalOpen}>
          <DialogContent 
            className="w-[95vw] sm:max-w-5xl max-h-[90vh] overflow-y-auto bg-card border-border p-4 sm:p-6"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>NUTRITION ASSESSMENT FORM</DialogTitle>
            </DialogHeader>
            <NutritionAssessmentForm
              onSuccess={() => {
                setAssessmentModalOpen(false);
                fetchAssessments();
              }}
              onCancel={() => setAssessmentModalOpen(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Clinical Report Viewer */}
        <NutritionAssessmentViewer
          open={viewModalOpen}
          onOpenChange={setViewModalOpen}
          assessment={selectedAssessment}
        />
      </div>
    </DashboardLayout>
  );
}
