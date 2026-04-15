import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Clock, 
  User, 
  Navigation,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Calendar as CalendarIcon,
  Search,
  Check,
  ChevronsUpDown,
  Filter,
  X,
  History,
  AlertTriangle
} from "lucide-react";
import { format, startOfMonth, startOfDay, endOfDay, parseISO, differenceInMinutes, isWithinInterval, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapContainer, TileLayer, Marker, Circle, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";


// Fix Leaflet icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface AttendanceSummary {
  profileId: string;
  staffName: string;
  email: string;
  date: Date;
  totalHours: number;
  firstIn?: Date;
  lastOut?: Date;
  sessions: any[];
  hasMissedCO: boolean;
  hasOutside: boolean;
  hasIpBlocked: boolean;
  hasEmergencyLeave: boolean;
  rawLogs: any[];
}

export default function DailyLogs() {
  const { profile } = useAuth();
  const [selectedLogs, setSelectedLogs] = useState<any[] | null>(null);
  const [orgSettings, setOrgSettings] = useState<any>(null);
  
  // Filters
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date()
  });
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [staffComboOpen, setStaffComboOpen] = useState(false);

  useEffect(() => {
    if (profile?.organization_id) {
      supabase
        .from("organizations")
        .select("clinic_latitude, clinic_longitude, geofence_radius, name, default_shift_end_time")
        .eq("id", profile.organization_id)
        .single()
        .then(({ data }) => setOrgSettings(data));
    }
  }, [profile?.organization_id]);

  // Fetch all staff for the dropdown, excluding clients and super admins
  const { data: staffList } = useQuery({
    queryKey: ["org-staff", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, 
          first_name, 
          last_name, 
          email,
          user_roles(role)
        `)
        .eq("organization_id", profile?.organization_id)
        .order("first_name");
      
      if (error) {
        console.error("Staff list error:", error);
        throw error;
      }
      
      // Filter out clients and super admins in JS for better reliability
      return data?.filter(p => 
        !p.user_roles || !p.user_roles.some((ur: any) => 
          ["client", "super_admin"].includes(ur.role)
        )
      );
    },
    enabled: !!profile?.organization_id
  });

  const { data: rawLogs, isLoading } = useQuery({
    queryKey: ["hr-attendance-logs", profile?.organization_id, dateRange.from, dateRange.to],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_attendance_logs")
        .select(`
          *,
          profile:profiles(
            first_name, 
            last_name, 
            email,
            user_roles(role)
          )
        `)
        .eq("organization_id", profile?.organization_id)
        .gte("created_at", dateRange.from.toISOString())
        .lte("created_at", endOfDay(dateRange.to).toISOString())
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("Raw logs error:", error);
        throw error;
      }
      
      // Filter out logs from clients and super admins in JS
      return data?.filter(log => 
        !log.profile?.user_roles || !log.profile.user_roles.some((ur: any) => 
          ["client", "super_admin"].includes(ur.role)
        )
      );
    },
    enabled: !!profile?.organization_id
  });

  const processedSummaries = useMemo(() => {
    if (!rawLogs) return [];

    const grouped: { [key: string]: any[] } = {};
    rawLogs.forEach(log => {
      const day = format(parseISO(log.created_at), "yyyy-MM-dd");
      const key = `${log.profile_id}_${day}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(log);
    });

    const summaries: AttendanceSummary[] = Object.entries(grouped).map(([key, dayLogs]) => {
      const firstLog = dayLogs[0];
      const date = startOfDay(parseISO(key.split('_')[1]));
      
      let totalMinutes = 0;
      let sessions: any[] = [];
      let currentCheckIn: any = null;
      let hasMissedCO = false;
      let hasOutside = false;
      let hasIpBlocked = false;
      let hasEmergencyLeave = false;

      dayLogs.forEach((log) => {
        if (!log.is_within_geofence) hasOutside = true;
        if (log.metadata?.is_ip_allowed === false) hasIpBlocked = true;
        if (log.type === 'emergency_leave') { hasEmergencyLeave = true; } // Don't return, act like checkout
        
        if (log.type === 'check_in') {
          currentCheckIn = log;
        } else if (log.type === 'check_out' || log.type === 'missed_check_out' || log.type === 'emergency_leave') {
          if (currentCheckIn) {
            const start = parseISO(currentCheckIn.created_at);
            let end = parseISO(log.created_at);

            if (log.type === 'missed_check_out') {
              hasMissedCO = true;
              // Fallback to shift end time
              const shiftEnd = orgSettings?.default_shift_end_time || "18:00:00";
              const [h, m, s] = shiftEnd.split(':').map(Number);
              const fallbackEnd = new Date(start);
              fallbackEnd.setHours(h, m, s || 0);
              end = fallbackEnd;
            }

            totalMinutes += Math.max(0, differenceInMinutes(end, start));
            sessions.push({ in: start, out: end, type: log.type });
            currentCheckIn = null;
          }
        }
      });

      // Handle running session or forgotten check-out
      if (currentCheckIn) {
        const start = parseISO(currentCheckIn.created_at);
        const isToday = isSameDay(date, new Date());
        
        // Only apply fallback for past days. For today, keep it open.
        if (!isToday) {
          const shiftEnd = orgSettings?.default_shift_end_time || "18:00:00";
          const [h, m, s] = shiftEnd.split(':').map(Number);
          const fallbackEnd = new Date(start);
          fallbackEnd.setHours(h, m, s || 0);
          
          totalMinutes += Math.max(0, differenceInMinutes(fallbackEnd, start));
          sessions.push({ in: start, out: fallbackEnd, type: 'auto_closed' });
        } else {
          sessions.push({ in: start, out: undefined, type: 'running' });
        }
      }

      return {
        profileId: firstLog.profile_id,
        staffName: `${firstLog.profile?.first_name} ${firstLog.profile?.last_name}`,
        email: firstLog.profile?.email,
        date,
        totalHours: totalMinutes / 60,
        sessions,
        firstIn: sessions[0]?.in,
        lastOut: sessions[sessions.length - 1]?.out,
        hasMissedCO,
        hasOutside,
        hasIpBlocked,
        hasEmergencyLeave,
        rawLogs: dayLogs
      };
    });

    return summaries
      .filter(s => selectedStaffId === "all" || s.profileId === selectedStaffId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [rawLogs, selectedStaffId, orgSettings]);

  return (
    <DashboardLayout role="hr_manager">
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Attendance Reports</h1>
            <p className="text-slate-500 mt-1">Consolidated work hours and location verification.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Staff Selector */}
            <Popover open={staffComboOpen} onOpenChange={setStaffComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-[240px] justify-between shadow-sm bg-white"
                >
                  {selectedStaffId === "all" 
                    ? "All Staff Members" 
                    : staffList?.find((s) => s.id === selectedStaffId) 
                      ? `${staffList.find(s => s.id === selectedStaffId)?.first_name} ${staffList.find(s => s.id === selectedStaffId)?.last_name}`
                      : "Select Staff..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0 shadow-xl border-none">
                <Command>
                  <CommandInput placeholder="Search staff..." />
                  <CommandList>
                    <CommandEmpty>No staff member found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => {
                          setSelectedStaffId("all");
                          setStaffComboOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedStaffId === "all" ? "opacity-100" : "opacity-0")} />
                        All Staff Members
                      </CommandItem>
                      {staffList?.map((staff) => (
                        <CommandItem
                          key={staff.id}
                          value={`${staff.first_name} ${staff.last_name}`}
                          onSelect={() => {
                            setSelectedStaffId(staff.id);
                            setStaffComboOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selectedStaffId === staff.id ? "opacity-100" : "opacity-0")} />
                          {staff.first_name} {staff.last_name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 shadow-sm bg-white">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-none shadow-2xl" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    } else if (range?.from) {
                      setDateRange({ from: range.from, to: range.from });
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            <Button 
              variant="ghost" 
              size="icon" 
              className="text-slate-400 hover:text-rose-500"
              onClick={() => {
                setSelectedStaffId("all");
                setDateRange({ from: startOfMonth(new Date()), to: new Date() });
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-50 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-display font-bold text-slate-900">Attendance Register</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Grouped by day and staff member</p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Entries</p>
                <p className="text-lg font-bold text-primary">{processedSummaries.length}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-bold py-4 pl-8">Staff Member</TableHead>
                  <TableHead className="font-bold py-4">Date</TableHead>
                  <TableHead className="font-bold py-4">Shift Span</TableHead>
                  <TableHead className="font-bold py-4">Work Hours</TableHead>
                  <TableHead className="font-bold py-4">Verification</TableHead>
                  <TableHead className="font-bold py-4 text-right pr-8">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground italic">
                        <History className="w-8 h-8 animate-spin opacity-20" />
                        <p>Loading attendance data...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : processedSummaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Search className="w-8 h-8 opacity-20" />
                        <p>No records found for the selected filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  processedSummaries.map((row, idx) => (
                    <TableRow 
                      key={`${row.profileId}-${idx}`} 
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors group",
                        row.hasEmergencyLeave && "bg-destructive/5 hover:bg-destructive/10"
                      )}
                    >
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{row.staffName}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{row.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-600">
                          {format(row.date, "EEE, MMM d")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {row.firstIn ? format(row.firstIn, "hh:mm a") : "--"}
                          <span className="text-slate-300">→</span>
                          {row.lastOut ? format(row.lastOut, "hh:mm a") : "--"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {row.hasEmergencyLeave ? (
                            <div className="flex items-center gap-1.5 text-destructive font-black text-[10px] uppercase tracking-widest">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Emergency Leave
                            </div>
                          ) : (
                            <span className={cn(
                              "font-display font-bold text-lg",
                              row.totalHours >= 8 ? "text-emerald-600" : "text-amber-600"
                            )}>
                              {Math.floor(row.totalHours)}h {Math.round((row.totalHours % 1) * 60)}m
                            </span>
                          )}
                          {row.hasMissedCO && !row.hasEmergencyLeave && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] h-5">
                              Estimated
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-4">
                            {row.hasOutside ? (
                              <div className="flex items-center gap-1.5 text-rose-500 font-bold text-[10px] uppercase tracking-wider">
                                <ShieldAlert className="w-3.5 h-3.5" /> Outside
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-wider">
                                <ShieldCheck className="w-3.5 h-3.5" /> Location
                              </div>
                            )}

                            {row.hasIpBlocked ? (
                              <div className="flex items-center gap-1.5 text-rose-500 font-bold text-[10px] uppercase tracking-wider">
                                <ShieldAlert className="w-3.5 h-3.5" /> IP Restricted
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-wider">
                                <ShieldCheck className="w-3.5 h-3.5" /> IP Verified
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:bg-primary/5 rounded-xl px-4"
                          onClick={() => setSelectedLogs(row.rawLogs)}
                        >
                          <Navigation className="w-4 h-4 mr-2" />
                          History
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedLogs} onOpenChange={() => setSelectedLogs(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 h-[600px]">
            <div className="lg:col-span-3 relative h-full bg-slate-100">
              {selectedLogs && (
                <MapContainer 
                  center={[selectedLogs[0].latitude, selectedLogs[0].longitude]} 
                  zoom={15} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  
                  {/* Clinic Center */}
                  {orgSettings?.clinic_latitude && (
                    <>
                      <Circle 
                        center={[orgSettings.clinic_latitude, orgSettings.clinic_longitude]} 
                        radius={orgSettings.geofence_radius || 100}
                        pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                      />
                    </>
                  )}

                  {/* Log Path/Dots */}
                  {selectedLogs.map((log, i) => (
                    <CircleMarker 
                      key={log.id}
                      center={[log.latitude, log.longitude]} 
                      radius={6} 
                      pathOptions={{ 
                        color: log.type === 'check_in' ? '#10b981' : log.type === 'check_out' ? '#6366f1' : '#f59e0b',
                        fillOpacity: 0.8 
                      }} 
                    >
                      <Marker position={[log.latitude, log.longitude]} />
                    </CircleMarker>
                  ))}
                </MapContainer>
              )}
            </div>
            
            <div className="lg:col-span-2 p-8 bg-slate-900 text-white flex flex-col h-full">
              <div className="mb-8">
                <h3 className="text-2xl font-display font-bold">Activity Detail</h3>
                <p className="text-slate-400 text-sm">Timeline for {selectedLogs && format(parseISO(selectedLogs[0].created_at), "MMMM d, yyyy")}</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {selectedLogs?.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((log, i) => (
                  <div key={log.id} className="relative pl-6 pb-6 border-l border-white/10 last:pb-0">
                    <div className={cn(
                      "absolute -left-1.5 top-0 w-3 h-3 rounded-full border-2 border-slate-900",
                      log.type === 'check_in' ? "bg-emerald-500" : log.type === 'check_out' ? "bg-indigo-500" : "bg-amber-500"
                    )} />
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-bold text-sm tracking-wide">
                        {log.type === 'check_in' ? 'CHECK-IN' : log.type === 'check_out' ? 'CHECK-OUT' : 'MISSED-CHECK-OUT'}
                      </p>
                      <p className="text-xs text-slate-400">{format(parseISO(log.created_at), "hh:mm a")}</p>
                    </div>
                    <div className="text-[11px] text-slate-400 space-y-1">
                      <p className="flex items-center gap-1.5">
                        <Navigation className="w-3 h-3" />
                        {Math.round(log.distance_from_center || 0)}m from center
                      </p>
                      {!log.is_within_geofence && <p className="text-rose-400 font-bold uppercase text-[9px]">Geofence Violation</p>}
                      {log.metadata?.ip_address && <p className="opacity-60">IP: {log.metadata.ip_address}</p>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <Button 
                  variant="outline"
                  className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl"
                  onClick={() => setSelectedLogs(null)}
                >
                  Close Detailed View
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

