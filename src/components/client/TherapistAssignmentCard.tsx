import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, User, Clock, AlertCircle, History, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface TherapistData {
  id: string;
  name: string;
  role: string;
  profession: string | null;
}

interface FreeSlot {
  start: string;
  end: string;
}

interface AlternateTherapist extends TherapistData {
  free_slots: FreeSlot[];
}

interface AvailabilityResult {
  status: "Available" | "Partially Available" | "Unavailable" | "On Leave" | "Unassigned";
  assigned_therapist: TherapistData | null;
  free_slots: FreeSlot[];
  alternate_therapists: AlternateTherapist[];
}

interface HistoryEntry {
  id: string;
  therapist_id: string;
  assigned_at: string;
  therapist: {
    first_name: string;
    last_name: string;
    profession: string | null;
  };
}

export function TherapistAssignmentCard({ clientId, orgId }: { clientId: string, orgId: string }) {
  const [date, setDate] = useState<Date>(new Date());
  const [data, setData] = useState<AvailabilityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [consultants, setConsultants] = useState<TherapistData[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const { toast } = useToast();

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('client_therapist_history')
        .select(`
          id,
          therapist_id,
          assigned_at,
          therapist:profiles!client_therapist_history_therapist_id_fkey(first_name, last_name, profession)
        `)
        .eq('client_id', clientId)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setHistory(data as any[]);
    } catch (err: any) {
      console.error("Error fetching history:", err.message);
    }
  };

  const fetchAvailability = async (selectedDate: Date) => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      // Since RPC is untyped in our generated types right now, we use any
      const { data: result, error } = await supabase.rpc("get_client_therapist_availability" as any, {
        p_client_id: clientId,
        p_date: dateStr,
      });

      if (error) throw error;
      
      // The RPC returns a JSON object
      if (result) {
        setData(result as AvailabilityResult);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching availability",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConsultants = async () => {
    if (!orgId) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, profession')
        .eq('organization_id', orgId)
        .eq('is_approved', true)
        .in('profession', ['Sports Physician', 'Physiotherapist', 'Sports Scientist']);
        
      if (error) throw error;
      setConsultants((data as any[]).map((d: any) => ({
        id: d.id,
        name: `${d.first_name} ${d.last_name}`,
        role: 'consultant',
        profession: d.profession
      })));
    } catch (err: any) {
      toast({ title: "Failed to load consultants", description: err.message, variant: "destructive" });
    }
  };

  const handleAssign = async (therapistId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Update the primary therapist in the clients table
      const { error: updateError } = await supabase
        .from('clients')
        .update({ assigned_consultant_id: therapistId })
        .eq('id', clientId);
        
      if (updateError) throw updateError;

      // 2. Log the reassignment to history
      const { error: historyError } = await supabase
        .from('client_therapist_history')
        .insert({
          client_id: clientId,
          therapist_id: therapistId,
          assigned_by: user?.id
        });

      if (historyError) throw historyError;

      toast({ title: "Therapist Assigned", description: "Successfully updated primary therapist and logged to history." });
      setIsAssigning(false);
      
      // Re-fetch to refresh the display
      await fetchAvailability(date);
      await fetchHistory();
    } catch (err: any) {
      toast({ title: "Assignment Failed", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchAvailability(date);
      fetchHistory();
    }
  }, [clientId, date]);

  useEffect(() => {
    if (isAssigning && consultants.length === 0) {
      fetchConsultants();
    }
  }, [isAssigning]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available": return "bg-green-100 text-green-800 border-green-300";
      case "Partially Available": return "bg-amber-100 text-amber-800 border-amber-300";
      case "Unavailable": return "bg-red-100 text-red-800 border-red-300";
      case "On Leave": return "bg-slate-100 text-slate-800 border-slate-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  return (
    <Card className="h-full border shadow-sm">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Assigned Therapist
          </CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal bg-white h-8 text-sm",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "MMM dd, yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-muted rounded w-full"></div>
            <div className="h-20 bg-muted rounded w-full"></div>
          </div>
        ) : !data || data.status === "Unassigned" ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">No Therapist Assigned</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              This client does not have a primary consultant.
            </p>
            {!isAssigning ? (
              <Button variant="outline" size="sm" onClick={() => setIsAssigning(true)}>Assign Therapist</Button>
            ) : (
              <div className="w-full max-w-xs mt-2 space-y-2 text-left">
                <Select onValueChange={handleAssign}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a therapist..." />
                  </SelectTrigger>
                  <SelectContent>
                    {consultants.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.profession ? `(${c.profession})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setIsAssigning(false)}>Cancel</Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-base">{data.assigned_therapist?.name}</h4>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="h-auto p-0 text-primary text-xs font-medium" 
                    onClick={() => setIsAssigning(true)}
                  >
                    Change
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground capitalize">
                  {data.assigned_therapist?.profession || data.assigned_therapist?.role}
                </p>
              </div>
              <Badge variant="outline" className={cn("font-medium", getStatusColor(data.status))}>
                {data.status}
              </Badge>
            </div>

            {(data.status === "Available" || data.status === "Partially Available") && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Available Slots
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.free_slots.length > 0 ? (
                    data.free_slots.map((slot, i) => (
                      <Badge key={i} variant="secondary" className="font-mono text-xs font-normal">
                        {slot.start.slice(0, 5)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No slots remaining.</span>
                  )}
                </div>
              </div>
            )}

            {(data.status === "Unavailable" || data.status === "On Leave") && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 mt-4">
                <p className="text-sm font-medium text-amber-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Alternate Coverage Options
                </p>
                {data.alternate_therapists && data.alternate_therapists.length > 0 ? (
                  <div className="space-y-3">
                    {data.alternate_therapists.map(alt => (
                      <div key={alt.id} className="bg-white rounded p-2 text-sm shadow-sm border border-amber-100 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-slate-800">{alt.name}</p>
                          <p className="text-xs text-slate-500">{alt.free_slots.length} slots available</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10">
                          Book Alternate
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700">No alternate therapists available on this date with matching specialties.</p>
                )}
              </div>
            )}

            {/* Change Specialist Selection */}
            {isAssigning && (
              <div className="pt-4 border-t space-y-3">
                <p className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Change Assigned Specialist
                </p>
                <div className="flex flex-col gap-2">
                  <Select onValueChange={handleAssign}>
                    <SelectTrigger className="w-full h-9">
                      <SelectValue placeholder="Select new specialist..." />
                    </SelectTrigger>
                    <SelectContent>
                      {consultants.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.profession ? `(${c.profession})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setIsAssigning(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Assignment History Section */}
            {history.length > 0 && (
              <div className="pt-6 border-t mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <h5 className="text-sm font-semibold text-foreground">Specialist History</h5>
                </div>
                <div className="space-y-4 max-h-[200px] overflow-y-auto pr-1 no-scrollbar">
                  {history.map((entry, idx) => (
                    <div key={entry.id} className="relative pl-5 border-l border-muted pb-1 last:pb-0">
                      <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full border border-white bg-muted-foreground ring-4 ring-white" />
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium leading-none">
                            {entry.therapist?.first_name} {entry.therapist?.last_name}
                            {idx === 0 && entry.therapist_id === data.assigned_therapist?.id && (
                              <Badge variant="secondary" className="ml-2 h-4 text-[10px] px-1 bg-green-50 text-green-700 border-green-200">Current</Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {entry.therapist?.profession || "Consultant"}
                          </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">
                          {format(new Date(entry.assigned_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
