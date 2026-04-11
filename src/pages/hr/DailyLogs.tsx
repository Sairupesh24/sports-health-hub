import { useState, useEffect } from "react";
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
  ShieldAlert
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapContainer, TileLayer, Marker, Circle, CircleMarker } from "react-leaflet";
import L from "leaflet";


// Fix Leaflet icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function DailyLogs() {
  const { profile } = useAuth();
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [orgSettings, setOrgSettings] = useState<any>(null);

  useEffect(() => {
    if (profile?.organization_id) {
      supabase
        .from("organizations")
        .select("clinic_latitude, clinic_longitude, geofence_radius, name")
        .eq("id", profile.organization_id)
        .single()
        .then(({ data }) => setOrgSettings(data));
    }
  }, [profile?.organization_id]);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["hr-attendance-logs", profile?.organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_attendance_logs")
        .select(`
          *,
          profile:profiles(first_name, last_name, email)
        `)
        .eq("organization_id", profile?.organization_id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id
  });

  return (
    <DashboardLayout role="hr_manager">
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Staff Attendance Logs</h1>
            <p className="text-slate-500 mt-1">Daily check-in and check-out logs for all personnel.</p>
          </div>
        </div>

        <Card className="border-none shadow-xl bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-50">
            <CardTitle className="text-xl font-display font-bold text-slate-900">Attendance Register</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-bold py-4">Staff Member</TableHead>
                  <TableHead className="font-bold py-4">Type</TableHead>
                  <TableHead className="font-bold py-4">Time</TableHead>
                  <TableHead className="font-bold py-4">Geofence Status</TableHead>
                  <TableHead className="font-bold py-4">Distance</TableHead>
                  <TableHead className="font-bold py-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                      Loading logs...
                    </TableCell>
                  </TableRow>
                ) : logs?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                      No attendance logs found for today.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs?.map((log) => (
                    <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                             {(log.profile as any)?.first_name} {(log.profile as any)?.last_name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">
                              {(log.profile as any)?.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={log.type === 'check_in' ? 'default' : log.type === 'missed_check_out' ? 'destructive' : 'secondary'} 
                          className={cn(
                            "rounded-full px-4 py-1 font-bold text-[10px]",
                            log.type === 'missed_check_out' && "bg-amber-500 hover:bg-amber-600 text-white border-none"
                          )}
                        >
                          {log.type === 'check_in' ? 'CHECK-IN' : log.type === 'missed_check_out' ? 'MISSED-CHECK-OUT' : 'CHECK-OUT'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-600 font-medium">
                          <Clock className="w-4 h-4 text-slate-400" />
                          {format(new Date(log.created_at), "hh:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.is_within_geofence ? (
                          <div className="flex items-center gap-2 text-emerald-600">
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Verified</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-rose-500">
                            <ShieldAlert className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Outside Zone</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 font-mono text-sm text-slate-600">
                          <Navigation className="w-3.5 h-3.5 text-slate-400" />
                          {log.distance_from_center ? `${Math.round(log.distance_from_center)}m` : 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-primary hover:bg-primary/5 gap-2"
                          onClick={() => setSelectedLog(log)}
                        >
                          <MapPin className="w-4 h-4" />
                          View Location
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

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2 h-[500px] relative">
              {selectedLog && (
                <MapContainer 
                  center={[selectedLog.latitude, selectedLog.longitude]} 
                  zoom={17} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  
                  {/* Clinic Center */}
                  {orgSettings?.clinic_latitude && (
                    <>
                      <Marker position={[orgSettings.clinic_latitude, orgSettings.clinic_longitude]}>
                        <CircleMarker center={[orgSettings.clinic_latitude, orgSettings.clinic_longitude]} radius={10} pathOptions={{ color: 'red' }} />
                      </Marker>
                      <Circle 
                        center={[orgSettings.clinic_latitude, orgSettings.clinic_longitude]} 
                        radius={orgSettings.geofence_radius || 100}
                        pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                      />
                    </>
                  )}

                  {/* Staff Member Location */}
                  <Marker position={[selectedLog.latitude, selectedLog.longitude]} />
                </MapContainer>
              )}
            </div>
            <div className="p-8 bg-slate-900 text-white space-y-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-display font-bold">Log Details</DialogTitle>
                <p className="text-slate-400">Activity verification breakdown</p>
              </DialogHeader>

              <div className="space-y-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Staff Member</p>
                  <p className="text-lg font-bold">{(selectedLog?.profile as any)?.first_name} {(selectedLog?.profile as any)?.last_name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Time</p>
                    <p className="font-bold">{selectedLog && format(new Date(selectedLog.created_at), "hh:mm a")}</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Status</p>
                    <Badge className={selectedLog?.is_within_geofence ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}>
                      {selectedLog?.is_within_geofence ? "Verified" : "Outside"}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1">Distance from Clinic</p>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-display font-bold">{Math.round(selectedLog?.distance_from_center || 0)}m</p>
                    <p className="text-xs text-slate-400">Limit: {orgSettings?.geofence_radius}m</p>
                  </div>
                </div>

                <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl space-y-2">
                  <p className="text-[10px] uppercase font-bold text-primary tracking-widest">Metadata</p>
                  <div className="text-[11px] text-slate-300 space-y-1">
                    <p>Accuracy: {selectedLog?.metadata?.accuracy?.toFixed(2)}m</p>
                    <p>Mock Detected: {selectedLog?.metadata?.mock_detected ? 'YES' : 'NO'}</p>
                    <p className="truncate">Agent: {selectedLog?.metadata?.user_agent}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2"
                  onClick={() => window.open(`https://www.google.com/maps?q=${selectedLog?.latitude},${selectedLog?.longitude}`, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" /> Open in Google Maps
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
