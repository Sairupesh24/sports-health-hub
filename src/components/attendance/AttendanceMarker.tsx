import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, MapPinOff, CheckCircle2, Clock, Map as MapIcon, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { calculateDistance, getCurrentLocation, detectMockLocation } from "@/utils/geofencing";
import { cn } from "@/lib/utils";

export default function AttendanceMarker() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'none' | 'checked_in' | 'outside'>('none');
  const [lastLog, setLastLog] = useState<any>(null);
  const [orgSettings, setOrgSettings] = useState<any>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchOrgSettings();
      fetchTodayStatus();
    }
  }, [profile?.organization_id]);

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
      .limit(1);

    if (!error && data && data.length > 0) {
      setLastLog(data[0]);
      // Only set status based on successful/enforced actions
      // Ignore 'missed_check_out' for UI status calculation
      const lastStatusLog = data.find((l: any) => l.type === 'check_in' || l.type === 'check_out' || l.type === 'emergency_leave');
      if (lastStatusLog?.type === 'check_in') {
        setStatus('checked_in');
      } else {
        setStatus('none');
      }
    }
  };

  const handleAction = async (type: 'check_in' | 'check_out') => {
    if (!profile?.organization_id || !orgSettings) return;

    try {
      setLoading(true);

      // 0. Refetch latest settings to avoid stale geofence data
      const { data: freshSettings, error: settingsErr } = await supabase
        .from("organizations")
        .select("clinic_latitude, clinic_longitude, geofence_radius, enable_geofencing, enable_ip_locking, allowed_ips, name")
        .eq("id", profile?.organization_id)
        .single();
      
      if (!settingsErr && freshSettings) {
        setOrgSettings(freshSettings);
      }
      
      const activeSettings = freshSettings || orgSettings;
      if (!activeSettings) throw new Error("Could not load organization settings");
      
      // 1. Capture user location
      const position = await getCurrentLocation();
      const { latitude, longitude } = position.coords;

      // 1b. Capture IP Address
      let publicIp = "Unknown";
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipRes.json();
        publicIp = ipData.ip;
      } catch (e) {
        console.error("IP Fetch error:", e);
      }

      // 2. Security Check: Mock Location Detection
      const mockDetection = detectMockLocation(position);
      if (mockDetection.isMocked) {
        toast({
          title: "Security Alert",
          description: "Mock location detected. Please use your real device GPS.",
          variant: "destructive"
        });
      }

      // 3. Validation Logic
      let distance = null;
      let isWithinGeofence = true;
      let isIpAllowed = true;

      if (activeSettings.clinic_latitude && activeSettings.clinic_longitude) {
        distance = calculateDistance(
          latitude, 
          longitude, 
          activeSettings.clinic_latitude, 
          activeSettings.clinic_longitude
        );
        setCurrentDistance(distance);
        
        if (distance > activeSettings.geofence_radius) {
          isWithinGeofence = false;
        }
      }

      // IP Validation
      if (activeSettings.enable_ip_locking && activeSettings.allowed_ips) {
        const allowedList = activeSettings.allowed_ips.split(',').map((s: any) => s.trim()).filter(Boolean);
        if (allowedList.length > 0 && !allowedList.includes(publicIp)) {
          isIpAllowed = false;
        }
      }

      // 3.1 Enforcement Logic
      const geofenceBlocked = activeSettings.enable_geofencing && !isWithinGeofence;
      const ipBlocked = activeSettings.enable_ip_locking && !isIpAllowed;

      if (geofenceBlocked || ipBlocked) {
        const blockReason = geofenceBlocked 
          ? `Outside authorized zone (${Math.round(distance || 0)}m)` 
          : `Unauthorized network IP: ${publicIp}`;
        
        if (type === 'check_out') {
          await supabase.from("hr_attendance_logs").insert({
            organization_id: profile.organization_id,
            profile_id: profile.id,
            type: 'missed_check_out',
            latitude,
            longitude,
            distance_from_center: distance,
            is_within_geofence: isWithinGeofence,
            metadata: {
              accuracy: position.coords.accuracy,
              mock_detected: mockDetection.isMocked,
              user_agent: navigator.userAgent,
              ip_address: publicIp,
              is_ip_allowed: isIpAllowed,
              note: `Blocked check-out attempt: ${blockReason}`
            }
          });

          toast({
            title: "Check-out Blocked",
            description: blockReason,
            variant: "destructive"
          });
          setLoading(false);
          fetchTodayStatus();
          return;
        }

        if (type === 'check_in') {
          toast({
            title: "Check-in Blocked",
            description: blockReason,
            variant: "destructive"
          });
          setLoading(false);
          return;
        }
      }

      // 4. Save Normal Log
      const { error: logErr } = await supabase.from("hr_attendance_logs").insert({
        organization_id: profile.organization_id,
        profile_id: profile.id,
        type,
        latitude,
        longitude,
        distance_from_center: distance,
        is_within_geofence: isWithinGeofence,
        metadata: {
          accuracy: position.coords.accuracy,
          mock_detected: mockDetection.isMocked,
          mock_reason: mockDetection.reason,
          user_agent: navigator.userAgent,
          ip_address: publicIp,
          is_ip_allowed: isIpAllowed
        }
      });

      if (logErr) throw logErr;

      toast({
        title: type === 'check_in' ? "Checked In Successfully" : "Checked Out Successfully",
        description: isWithinGeofence ? "Location verified within geofence." : "Location logged outside geofence.",
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

  return (
    <Card className="border-none shadow-lg bg-gradient-to-r from-slate-900 to-slate-800 text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl" />
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={cn(
               "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
               isCheckedIn ? "bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]" : "bg-primary/20"
            )}>
              {isCheckedIn ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 animate-pulse" />
              ) : (
                <MapPin className="w-6 h-6 text-primary" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-display font-bold">
                {isCheckedIn ? "Checked In" : "Ready to Start?"}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={cn(
                  "text-[10px] font-bold uppercase tracking-widest border-white/10",
                  orgSettings.enable_geofencing ? "text-primary" : "text-slate-400"
                )}>
                  {orgSettings.enable_geofencing ? "Geofencing Active" : "Standard Check-in"}
                </Badge>
                {isCheckedIn && lastLog && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(lastLog.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 justify-center">
            {isCheckedIn && lastLog && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors",
                lastLog.is_within_geofence 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                  : "bg-amber-500/10 border-amber-500/20 text-amber-400"
              )}>
                {lastLog.is_within_geofence ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Location Verified</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Away from Org</span>
                  </>
                )}
              </div>
            )}

            {!isCheckedIn ? (
              <Button 
                onClick={() => handleAction('check_in')} 
                disabled={loading}
                className="bg-primary hover:bg-primary/90 text-white font-bold px-8 h-12 rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
              >
                {loading ? "Capturing..." : "Check In Now"}
              </Button>
            ) : (
              <Button 
                variant="outline"
                onClick={() => handleAction('check_out')} 
                disabled={loading}
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white font-bold px-8 h-12 rounded-xl transition-all active:scale-95"
              >
                {loading ? "Capturing..." : "Check Out"}
              </Button>
            )}

            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5">
              <MapIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
