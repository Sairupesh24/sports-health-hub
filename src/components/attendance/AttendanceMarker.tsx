import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  MapPinOff, 
  CheckCircle2, 
  Clock, 
  Map as MapIcon, 
  ShieldAlert, 
  ShieldCheck, 
  ChevronRight, 
  Loader2 
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { calculateDistance, getCurrentLocation, detectMockLocation } from "@/utils/geofencing";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

export default function AttendanceMarker() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'none' | 'checked_in' | 'outside'>('none');
  const [lastLog, setLastLog] = useState<any>(null);
  const [orgSettings, setOrgSettings] = useState<any>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);

  const [liveSecurity, setLiveSecurity] = useState<{ isIpAllowed: boolean; isWithinGeofence: boolean; distance: number | null }>({
    isIpAllowed: true,
    isWithinGeofence: true,
    distance: null
  });

  useEffect(() => {
    if (profile?.organization_id) {
      fetchOrgSettings();
      fetchTodayStatus();
    }
  }, [profile?.organization_id]);

  // Periodic security verification
  useEffect(() => {
    if (!profile?.organization_id || !orgSettings) return;

    const checkSecurity = async () => {
      try {
        // 1. Capture user location
        const position = await getCurrentLocation();
        const { latitude, longitude } = position.coords;

        // 2. Capture IP Address
        let publicIp = "Unknown";
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipRes.json();
          publicIp = ipData.ip;
        } catch (e) {

        }

        // 3. Validation Logic
        let distance = null;
        let isWithinGeofence = true;
        let isIpAllowed = true;

        if (orgSettings.clinic_latitude && orgSettings.clinic_longitude) {
          distance = calculateDistance(
            latitude, 
            longitude, 
            orgSettings.clinic_latitude, 
            orgSettings.clinic_longitude
          );
        }

        if (orgSettings.enable_geofencing && distance !== null) {
          if (distance > orgSettings.geofence_radius) {
            isWithinGeofence = false;
          }
        }

        if (orgSettings.enable_ip_locking && orgSettings.allowed_ips) {
          const allowedList = orgSettings.allowed_ips.split(',').map((s: any) => s.trim()).filter(Boolean);
          if (allowedList.length > 0 && !allowedList.includes(publicIp)) {
            isIpAllowed = false;
          }
        }

        setLiveSecurity({ isIpAllowed, isWithinGeofence, distance });
        setCurrentDistance(distance);
      } catch (err) {

      }
    };

    checkSecurity();
    const interval = setInterval(checkSecurity, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [profile?.organization_id, orgSettings]);

  useEffect(() => {
    const handleUpdate = () => fetchTodayStatus();
    window.addEventListener("attendance_updated", handleUpdate);
    return () => window.removeEventListener("attendance_updated", handleUpdate);
  }, [profile?.id]);

  const fetchOrgSettings = async () => {
    const { data, error } = await supabase
      .from("organizations")
      .select("clinic_latitude, clinic_longitude, geofence_radius, enable_geofencing, enable_ip_locking, allowed_ips, name")
      .eq("id", profile?.organization_id)
      .single();
    
    if (!error) setOrgSettings(data);
  };

  const fetchTodayStatus = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from("hr_attendance_logs")
      .select("*")
      .eq("profile_id", profile?.id)
      .gte("created_at", `${today}T00:00:00Z`)
      .order("created_at", { ascending: false })
      .limit(10); // Fetch more to find actual state

    if (!error && data && data.length > 0) {
      // Store the absolute latest log for UI alerts/details
      setLastLog(data[0]);
      
      // Find the most recent status-changing event
      const lastStatusLog = data.find(l => ['check_in', 'check_out', 'emergency_leave'].includes(l.type));
      
      if (lastStatusLog?.type === 'check_in') {
        setStatus('checked_in');
      } else {
        setStatus('none');
      }
    } else {
      setStatus('none');
      setLastLog(null);
    }
  };

  const handleAction = async (type: 'check_in' | 'check_out') => {
    if (!profile?.organization_id || !orgSettings) return;

    // Use latest live security state
    const geofenceBlocked = orgSettings.enable_geofencing && !liveSecurity.isWithinGeofence;
    const ipBlocked = orgSettings.enable_ip_locking && !liveSecurity.isIpAllowed;

    if (geofenceBlocked || ipBlocked) {
      toast({
        title: `${type === 'check_in' ? 'Check-in' : 'Check-out'} Blocked`,
        description: geofenceBlocked ? "Outside authorized geofence." : "Unauthorized network detected.",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;

      let publicIp = "Unknown";
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        publicIp = ipData.ip;
      } catch (e) {}

      // Save Normal Log
      const { error: logErr } = await supabase.from("hr_attendance_logs").insert({
        organization_id: profile.organization_id,
        profile_id: profile.id,
        type,
        latitude,
        longitude,
        distance_from_center: liveSecurity.distance,
        is_within_geofence: liveSecurity.isWithinGeofence,
        metadata: {
          accuracy: position.coords.accuracy,
          user_agent: navigator.userAgent,
          ip_address: publicIp,
          is_ip_allowed: liveSecurity.isIpAllowed
        }
      });

      if (logErr) throw logErr;

      toast({
        title: type === 'check_in' ? "Checked In Successfully" : "Checked Out Successfully",
        description: liveSecurity.isWithinGeofence ? "Location verified within geofence." : "Location logged outside geofence.",
      });

      fetchTodayStatus();
    } catch (err: any) {
      toast({
        title: "Geolocation Error",
        description: err.message || "Could not capture your current location.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!orgSettings) return null;

  const isCheckedIn = status === 'checked_in';
  
  // Determine if we should show a live warning
  const showLiveWarning = (isCheckedIn || !isCheckedIn) && (
    (orgSettings.enable_geofencing && !liveSecurity.isWithinGeofence) ||
    (orgSettings.enable_ip_locking && !liveSecurity.isIpAllowed)
  );

  return (
    <div className="relative group perspective-1000">
      <div className={cn(
        "relative overflow-hidden rounded-[2.5rem] p-[1px] transition-all duration-500 shadow-2xl",
        isCheckedIn 
          ? "bg-gradient-to-br from-emerald-400/20 via-emerald-500/10 to-transparent" 
          : "bg-gradient-to-br from-primary/30 via-primary/10 to-transparent"
      )}>
        <Card className="border-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 rounded-full -ml-12 -mb-12 blur-2xl" />
          
          <CardContent className="p-5 sm:p-6 relative z-10">
            <div className="flex flex-col gap-4">
              {/* Top Row: Status & Icon */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-700 shadow-lg relative",
                    isCheckedIn 
                      ? "bg-emerald-500 text-white shadow-emerald-500/20 rotate-2" 
                      : "bg-slate-900 text-white shadow-slate-900/20"
                  )}>
                    {isCheckedIn ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 relative z-10" />
                        <span className="absolute inset-0 bg-emerald-400 rounded-xl animate-ping opacity-20" />
                      </>
                    ) : (
                      <MapPin className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white leading-none uppercase italic">
                      {isCheckedIn ? "On Duty" : "Duty Status"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                       {orgSettings.enable_geofencing && (
                         <div className={cn(
                           "flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition-colors",
                           liveSecurity.isWithinGeofence 
                             ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 animate-pulse" 
                             : "bg-amber-500/10 border-amber-500/20 text-amber-600"
                         )}>
                            <MapIcon className="w-2.5 h-2.5" />
                            <span className="text-[7px] font-black uppercase tracking-widest">
                              {liveSecurity.isWithinGeofence ? "Geofence Active" : "Outside Range"}
                            </span>
                         </div>
                       )}
                       {orgSettings.enable_ip_locking && (
                         <div className={cn(
                           "flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition-colors",
                           liveSecurity.isIpAllowed 
                             ? "bg-blue-500/10 border-blue-500/20 text-blue-600" 
                             : "bg-rose-500/10 border-rose-500/20 text-rose-600"
                         )}>
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span className="text-[7px] font-black uppercase tracking-widest">
                              {liveSecurity.isIpAllowed ? "IP Locked" : "Unauthorized IP"}
                            </span>
                         </div>
                       )}
                       {isCheckedIn && lastLog && (
                         <div className="flex items-center gap-1 text-slate-400">
                           <Clock className="w-3 h-3" />
                           <span className="text-[9px] font-bold italic">
                             {format(parseISO(lastLog.created_at), 'hh:mm a')}
                           </span>
                         </div>
                       )}
                    </div>
                  </div>
                </div>

                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary transition-colors">
                  <MapIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Live Security Warning */}
              {showLiveWarning && (
                <div className="px-3 py-2.5 rounded-xl border bg-amber-50 border-amber-100 dark:bg-amber-500/5 dark:border-amber-500/10 flex items-center gap-2.5 animate-in slide-in-from-top-2 duration-500">
                  <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest leading-none text-amber-600">
                      {!liveSecurity.isIpAllowed ? "Unauthorized Network" : "Location Alert"}
                    </p>
                    <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                      {!liveSecurity.isIpAllowed 
                        ? "Protocol: Check-in/out Restricted" 
                        : `Protocol: Range Violation (${Math.round(liveSecurity.distance || 0)}m)`}
                    </p>
                  </div>
                </div>
              )}

              {/* Status Indicator (Only if verified and on duty) */}
              {isCheckedIn && !showLiveWarning && lastLog && (
                <div className="px-3 py-2.5 rounded-xl border bg-emerald-50/50 border-emerald-100/50 dark:bg-emerald-500/5 dark:border-emerald-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest leading-none text-emerald-600">Workplace Verified</p>
                      <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Secure Geofence Logged</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex items-center gap-3">
                {!isCheckedIn ? (
                  <Button 
                    onClick={() => handleAction('check_in')} 
                    disabled={loading || showLiveWarning}
                    className="flex-1 h-12 rounded-xl bg-slate-900 dark:bg-primary text-white font-black uppercase tracking-[0.15em] text-[10px] shadow-xl shadow-slate-900/20 hover:scale-[1.01] active:scale-[0.99] transition-all group overflow-hidden relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 -translate-x-full group-hover:animate-shimmer" />
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <div className="flex items-center gap-2">
                        {showLiveWarning ? "Security Block Active" : "Clock In Now"} <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={() => handleAction('check_out')} 
                    disabled={loading || showLiveWarning}
                    className="flex-1 h-12 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black uppercase tracking-[0.15em] text-[10px] hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all active:scale-[0.99]"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (showLiveWarning ? "Checkout Blocked" : "Clock Out")}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
