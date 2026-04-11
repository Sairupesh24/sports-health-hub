import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  PhoneCall, 
  Calendar, 
  UserPlus, 
  CheckCircle2, 
  MoreVertical,
  XCircle,
  MessageSquare,
  Clock,
  ArrowRight,
  Loader2,
  ExternalLink,
  Briefcase
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { AdminBookSessionModal } from "@/components/admin/AdminBookSessionModal";
import { format, isAfter, isBefore, startOfDay } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { InteractionModal } from "@/components/admin/InteractionModal";
import { EnquiryHistory } from "@/components/admin/EnquiryHistory";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type Enquiry = Database['public']['Tables']['enquiries']['Row'];
type EnquiryStatus = Enquiry['status'];

export default function LeadsDashboard() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | 'all'>('all');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Database['public']['Tables']['clients']['Row'] | null>(null);

  const { data: enquiries = [], isLoading } = useQuery({
    queryKey: ["enquiries", profile?.organization_id, statusFilter],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      let query = supabase
        .from("enquiries")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Enquiry[];
    },
    enabled: !!profile?.organization_id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: EnquiryStatus }) => {
      const { error } = await supabase
        .from("enquiries")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enquiries"] });
      toast({ title: "Status Updated", description: "Enquiry status has been updated successfully." });
    },
  });

  const logInteractionMutation = useMutation({
    mutationFn: async ({ id, type, response }: { id: string, type: string, response: string }) => {
      const { error } = await supabase.from("enquiry_interactions").insert({
        enquiry_id: id,
        interaction_type: type,
        response_text: response,
        created_by: profile?.id
      });
      if (error) throw error;
      
      await supabase.from("enquiries").update({
        last_interaction_at: new Date().toISOString()
      }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["enquiry_interactions"] });
    }
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["client-search", linkSearchTerm],
    queryFn: async () => {
      if (linkSearchTerm.length < 3) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name, uhid, mobile_no")
        .or(`uhid.ilike.%${linkSearchTerm}%,first_name.ilike.%${linkSearchTerm}%,last_name.ilike.%${linkSearchTerm}%`)
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: linkSearchTerm.length >= 3,
  });

  const linkMutation = useMutation({
    mutationFn: async ({ enquiryId, clientId }: { enquiryId: string, clientId: string }) => {
      const { data: enqData, error: enqError } = await supabase
        .from("enquiries")
        .update({ status: 'converted', linked_client_id: clientId })
        .eq("id", enquiryId)
        .select()
        .single();
      if (enqError) throw enqError;

      await supabase.from("enquiry_interactions").insert({
        enquiry_id: enquiryId,
        interaction_type: 'converted',
        response_text: `Lead linked to UHID: ${selectedClient?.uhid || 'Manual Selection'}`,
        created_by: profile?.id
      });

      if (enqData.notes) {
        await supabase.from("client_admin_notes").insert({
          client_id: clientId,
          remarks: `[Enquiry Conversion Note]: ${enqData.notes}`,
          created_by: profile?.id
        });
      }

      await supabase
        .from("sessions")
        .update({ client_id: clientId, is_guest: false })
        .eq("enquiry_id", enquiryId);

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enquiries"] });
      queryClient.invalidateQueries({ queryKey: ["admin-master-sessions"] });
      setIsLinkModalOpen(false);
      setSelectedEnquiry(null);
      setSelectedClient(null);
      setLinkSearchTerm("");
      toast({ title: "Client Linked", description: "Enquiry successfully converted and linked to client profile." });
    },
  });

  const handleStatusChange = (id: string, status: EnquiryStatus) => {
    if (status === 'contacted') {
      const enq = enquiries.find(e => e.id === id);
      if (enq) {
        setSelectedEnquiry(enq);
        setIsInteractionModalOpen(true);
      }
    } else {
      updateStatusMutation.mutate({ id, status });
      logInteractionMutation.mutate({ 
        id, 
        type: 'status_change', 
        response: `Status manually changed to ${status.replace('_', ' ')}` 
      });
    }
  };

  const handleScheduleGuest = (enquiry: Enquiry) => {
    setSelectedEnquiry(enquiry);
    setIsBookModalOpen(true);
    logInteractionMutation.mutate({ 
      id: enquiry.id, 
      type: 'booking', 
      response: "Triggered guest booking flow from dashboard." 
    });
  };

  const filteredEnquiries = enquiries.filter(enq => 
    enq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    enq.contact.includes(searchTerm) ||
    enq.looking_for.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: EnquiryStatus) => {
    switch (status) {
      case 'new': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">New</Badge>;
      case 'contacted': return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none">Contacted</Badge>;
      case 'guest_booked': return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none">Session Booked</Badge>;
      case 'converted': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">Converted</Badge>;
      case 'not_interested': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-none">Not Interested</Badge>;
    }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Leads Dashboard</h1>
            <p className="text-slate-500 mt-1">Track and manage prospective physical therapy enquiries.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-blue-50/50">
             <CardHeader className="pb-2">
               <CardTitle className="text-xs font-bold uppercase tracking-widest text-blue-600">New Leads</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="text-3xl font-display font-bold text-blue-900">{enquiries.filter(e => e.status === 'new').length}</div>
             </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-emerald-50/50">
             <CardHeader className="pb-2">
               <CardTitle className="text-xs font-bold uppercase tracking-widest text-emerald-600">Converted Clients</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="text-3xl font-display font-bold text-emerald-900">{enquiries.filter(e => e.status === 'converted').length}</div>
             </CardContent>
          </Card>
          <Card className="border-none shadow-sm bg-orange-50/50">
             <CardHeader className="pb-2">
               <CardTitle className="text-xs font-bold uppercase tracking-widest text-orange-600">Conversion Rate</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="text-3xl font-display font-bold text-orange-900">
                  {enquiries.length > 0 ? Math.round((enquiries.filter(e => e.status === 'converted').length / enquiries.length) * 100) : 0}%
                </div>
             </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-xl overflow-hidden rounded-xl bg-white">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search by name, contact, or service..." 
                className="pl-10 h-11 bg-slate-50 border-none shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Loading Enquiries...</p>
              </div>
            ) : filteredEnquiries.length === 0 ? (
               <div className="p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Search className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900">No leads found</h3>
                    <p className="text-slate-500">Wait for some enquiries or adjust your filters.</p>
                  </div>
               </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent border-slate-100">
                    <TableHead className="font-bold text-xs uppercase tracking-wider h-12">Leads</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider h-12">Requirement</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider h-12">Preferred Time</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider h-12 text-center">Follow-up</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider h-12">Status</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider h-12 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnquiries.map((enq) => (
                    <TableRow 
                      key={enq.id} 
                      className="group hover:bg-slate-50 transition-colors border-slate-100 h-20 cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button')) return;
                        setSelectedEnquiry(enq);
                        setIsDetailsOpen(true);
                      }}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 flex items-center gap-2">
                             {enq.name}
                             {enq.status === 'new' && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                          </span>
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                             <PhoneCall className="w-3 h-3" /> {enq.contact}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-700">{enq.looking_for}</span>
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Source: {enq.referral_source || 'Direct'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                         <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-primary/60" />
                            {enq.preferred_call_time || 'Anytime'}
                         </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          {enq.next_follow_up_at ? (
                            <div className={cn(
                              "flex flex-col items-center p-1 rounded min-w-[80px]",
                              isBefore(new Date(enq.next_follow_up_at), startOfDay(new Date())) 
                                ? "bg-red-50 text-red-600 border border-red-100" 
                                : "bg-orange-50 text-orange-600 border border-orange-100"
                            )}>
                              <span className="text-[9px] font-bold uppercase tracking-tight">
                                {isBefore(new Date(enq.next_follow_up_at), startOfDay(new Date())) ? "Overdue" : "Next Call"}
                              </span>
                              <span className="text-xs font-bold leading-none mt-0.5">
                                {format(new Date(enq.next_follow_up_at), "MMM d")}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300">--</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(enq.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 pr-2">
                          {enq.linked_client_id ? (
                            <Link to={`/admin/clients/${enq.linked_client_id}`}>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase">Profile</span>
                              </Button>
                            </Link>
                          ) : (
                            <>
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-8 gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 border-none"
                                onClick={() => handleStatusChange(enq.id, 'contacted')}
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase">Called</span>
                              </Button>
                              <Button 
                                variant="secondary" 
                                size="sm" 
                                className="h-8 gap-1 bg-orange-100 text-orange-700 hover:bg-orange-200 border-none"
                                onClick={() => handleScheduleGuest(enq)}
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase">Schedule</span>
                              </Button>
                            </>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleStatusChange(enq.id, 'converted')} className="gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                <span>Mark as Converted</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(enq.id, 'not_interested')} className="gap-2">
                                <XCircle className="w-4 h-4 text-slate-400" />
                                <span>Not Interested</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2" onClick={() => { setSelectedEnquiry(enq); setIsLinkModalOpen(true); }}>
                                <UserPlus className="w-4 h-4 text-blue-500" />
                                <span>Link to Client</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <div className="bg-slate-50/50 p-4 border-t border-slate-100 text-center">
             <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">ISHPO Physical Therapy Pipeline Management</p>
          </div>
        </Card>
      </div>

      {selectedEnquiry && (
        <AdminBookSessionModal 
          open={isBookModalOpen}
          onOpenChange={setIsBookModalOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["enquiries"] });
            setSelectedEnquiry(null);
          }}
          initialData={{
            isGuest: true,
            guestName: selectedEnquiry.name,
            guestContact: selectedEnquiry.contact,
            enquiryId: selectedEnquiry.id
          }}
        />
      )}

      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Lead to Client</DialogTitle>
            <DialogDescription>Search for a registered patient to link this enquiry.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search Client (Name or UHID)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Type UHID or Name..." 
                  className="pl-10"
                  value={linkSearchTerm}
                  onChange={(e) => setLinkSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {searchResults.map((client) => (
                <div 
                  key={client.id} 
                  onClick={() => setSelectedClient(client as Database['public']['Tables']['clients']['Row'])}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center",
                    selectedClient?.id === client.id ? "bg-primary/5 border-primary shadow-sm" : "hover:bg-slate-50 border-transparent"
                  )}
                >
                  <div>
                    <p className="font-bold text-sm">{client.first_name} {client.last_name}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{client.uhid}</p>
                  </div>
                  {selectedClient?.id === client.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
              ))}
              {linkSearchTerm.length >= 3 && searchResults.length === 0 && (
                <p className="text-center py-4 text-sm text-slate-400">No patients found matches "{linkSearchTerm}"</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkModalOpen(false)}>Cancel</Button>
            <Button 
              disabled={!selectedClient || linkMutation.isPending}
              onClick={() => linkMutation.mutate({ enquiryId: selectedEnquiry!.id, clientId: selectedClient.id })}
            >
              {linkMutation.isPending ? "Linking..." : "Confirm Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InteractionModal 
        open={isInteractionModalOpen}
        onOpenChange={setIsInteractionModalOpen}
        enquiryId={selectedEnquiry?.id || ""}
        enquiryName={selectedEnquiry?.name || ""}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["enquiries"] });
        }}
        onScheduleGuest={() => {
          setIsBookModalOpen(true);
        }}
      />

      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="border-b pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg uppercase">
                {selectedEnquiry?.name?.[0]}
              </div>
              <div className="flex-1">
                <SheetTitle className="text-2xl font-display font-bold text-slate-900">{selectedEnquiry?.name}</SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  <PhoneCall className="w-3.5 h-3.5" /> {selectedEnquiry?.contact}
                  <span className="mx-2 text-slate-300">|</span>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{selectedEnquiry?.status}</Badge>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Requirement</Label>
                <p className="font-semibold text-slate-900">{selectedEnquiry?.looking_for}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Source</Label>
                <p className="font-semibold text-slate-900 uppercase text-xs">
                  {selectedEnquiry?.referral_source || 'Direct'}
                  {selectedEnquiry?.referral_details && (
                    <span className="block text-[10px] font-medium text-slate-500 normal-case mt-1 italic">
                      ({selectedEnquiry.referral_details})
                    </span>
                  )}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Place of Work</Label>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <p className="font-semibold text-slate-900">{selectedEnquiry?.work_place || '--'}</p>
                </div>
              </div>
            </div>

            {selectedEnquiry?.notes && (
              <div className="p-4 bg-orange-50/30 rounded-xl border border-orange-100">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-orange-600 block mb-2">Original Enquiry Notes</Label>
                <p className="text-sm text-slate-700 leading-relaxed italic">{selectedEnquiry.notes}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-display font-bold text-lg text-slate-900">Interaction History</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-[10px] font-bold uppercase tracking-wider"
                  onClick={() => setIsInteractionModalOpen(true)}
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-2" /> Add Interaction
                </Button>
              </div>
              
              {selectedEnquiry && <EnquiryHistory enquiryId={selectedEnquiry.id} />}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
