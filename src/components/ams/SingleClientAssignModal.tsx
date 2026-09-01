import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  Search,
  Copy,
  Check,
  Loader2,
  Link2,
  MessageCircle,
  ClipboardList,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { apiFetch } from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SingleClientAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  form: any;
  /** If provided, the modal skips client search and pre-selects this client */
  preSelectedClient?: {
    id: string;
    first_name: string;
    last_name: string;
    honorific?: string;
    uhid?: string;
    age?: number;
    gender?: string;
    mobile_no?: string;
  };
}

type Step = "select" | "confirm" | "success";

export default function SingleClientAssignModal({
  isOpen,
  onClose,
  onSuccess,
  form,
  preSelectedClient,
}: SingleClientAssignModalProps) {
  const { toast } = useToast();

  const [step, setStep] = useState<Step>(preSelectedClient ? "confirm" : "select");
  const [clients, setClients] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(preSelectedClient || null);
  const [assigning, setAssigning] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setStep(preSelectedClient ? "confirm" : "select");
      setSelectedClient(preSelectedClient || null);
      setGeneratedLink("");
      setCopied(false);
      setSearchQuery("");
      if (!preSelectedClient) {
        fetchClients();
      }
    }
  }, [isOpen, preSelectedClient]);

  const fetchClients = async () => {
    try {
      setFetching(true);
      const data = await apiFetch<any[]>("/clients");
      setClients(data || []);
    } catch (err: any) {
      toast({
        title: "Error loading clients",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
    const q = searchQuery.toLowerCase();
    return fullName.includes(q) || (c.uhid || "").toLowerCase().includes(q) || (c.mobile_no || "").includes(q);
  });

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setStep("confirm");
  };

  const handleAssign = async () => {
    if (!selectedClient || !form) return;
    try {
      setAssigning(true);
      const result = await apiFetch<{ id: string; public_token: string }>(
        "/ams/form-responses",
        {
          method: "POST",
          body: {
            form_id: form.id,
            client_id: selectedClient.id,
            status: "pending",
          },
        }
      );
      const link = `${window.location.origin}/q/${result.public_token}`;
      setGeneratedLink(link);
      setStep("success");
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Assignment Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast({ title: "Link copied to clipboard!" });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const handleWhatsApp = () => {
    const clientName = selectedClient
      ? `${selectedClient.honorific ? selectedClient.honorific + " " : ""}${selectedClient.first_name} ${selectedClient.last_name}`
      : "";
    const text = encodeURIComponent(
      `Hi ${clientName}! Please complete your "${form?.name}" questionnaire using this link:\n\n${generatedLink}\n\nThe link will remain active until you submit your responses.`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const clientFullName = selectedClient
    ? `${selectedClient.honorific ? selectedClient.honorific + " " : ""}${selectedClient.first_name} ${selectedClient.last_name}`
    : "";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        aria-describedby={undefined}
        className="p-0 overflow-hidden bg-[#0F172A] border border-white/10 text-white rounded-[2rem] sm:rounded-[3rem] sm:max-w-xl max-w-[95vw] ring-1 ring-white/5"
      >
        {/* ─── HEADER ─── */}
        <DialogHeader className="p-6 sm:p-8 pb-0 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/20 shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black uppercase italic tracking-tight leading-tight">
                <span className="text-primary">Assign</span> to Client
              </DialogTitle>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mt-0.5 truncate max-w-xs">
                {form?.name}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* ─── STEP: SELECT CLIENT ─── */}
        {step === "select" && (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                placeholder="Search by name or UHID…"
                className="pl-11 h-12 bg-white/5 border-white/10 rounded-2xl text-white placeholder:text-white/20 font-bold text-sm focus-visible:ring-primary/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <ScrollArea className="h-72">
              {fetching ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-white/30 font-black uppercase tracking-widest text-[10px]">
                    {searchQuery ? "No clients found" : "No clients available"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {filteredClients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectClient(c)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/30 transition-all text-left group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-sm truncate">
                          {c.honorific ? c.honorific + " " : ""}{c.first_name} {c.last_name}
                        </p>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-0.5">
                          {c.uhid ? `UHID: ${c.uhid}` : c.mobile_no || ""}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* ─── STEP: CONFIRM ─── */}
        {step === "confirm" && selectedClient && (
          <div className="p-6 sm:p-8 space-y-6">
            {!preSelectedClient && (
              <button
                onClick={() => setStep("select")}
                className="flex items-center gap-1.5 text-white/40 hover:text-white text-[11px] font-black uppercase tracking-widest transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Change Client
              </button>
            )}

            {/* Client preview */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                Assigning to
              </p>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <span className="text-primary font-black text-xl italic">
                    {selectedClient.first_name?.[0]}{selectedClient.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <p className="font-black text-white text-lg italic">{clientFullName}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedClient.uhid && (
                      <Badge className="bg-white/10 border-none text-white/60 rounded-lg text-[9px] font-black tracking-wider">
                        {selectedClient.uhid}
                      </Badge>
                    )}
                    {selectedClient.age && (
                      <Badge className="bg-white/10 border-none text-white/60 rounded-lg text-[9px] font-black tracking-wider">
                        {selectedClient.age} yrs
                      </Badge>
                    )}
                    {selectedClient.gender && (
                      <Badge className="bg-white/10 border-none text-white/60 rounded-lg text-[9px] font-black capitalize tracking-wider">
                        {selectedClient.gender}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Form preview */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm uppercase italic truncate">{form?.name}</p>
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-0.5">
                  {form?.questions?.length || 0} Questions
                </p>
              </div>
              <Badge
                className={cn(
                  "rounded-full px-3 py-0.5 text-[8px] font-black uppercase tracking-widest border-none shrink-0",
                  form?.classification === "clinical"
                    ? "bg-rose-500/20 text-rose-300"
                    : "bg-blue-500/20 text-blue-300"
                )}
              >
                {form?.classification}
              </Badge>
            </div>

            <p className="text-white/30 text-[10px] font-bold text-center">
              A unique link will be generated that the client can use to complete this questionnaire. The link remains valid until they submit their responses.
            </p>

            <Button
              onClick={handleAssign}
              disabled={assigning}
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[11px] gap-3 shadow-xl shadow-primary/20 transition-all"
            >
              {assigning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Generating Link…
                </>
              ) : (
                <>
                  <Link2 className="w-5 h-5" /> Generate & Get Link
                </>
              )}
            </Button>
          </div>
        )}

        {/* ─── STEP: SUCCESS ─── */}
        {step === "success" && (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Success badge */}
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-emerald-400 font-black text-sm uppercase tracking-wider">
                  Link Generated!
                </p>
                <p className="text-emerald-400/60 text-[10px] font-bold mt-0.5">
                  Assigned to {clientFullName}
                </p>
              </div>
            </div>

            {/* Link display */}
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                Shareable Link
              </Label>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 overflow-hidden">
                  <p className="text-white/70 font-bold text-xs truncate font-mono">{generatedLink}</p>
                </div>
                <Button
                  onClick={handleCopy}
                  className={cn(
                    "h-auto px-4 rounded-2xl font-black uppercase tracking-widest text-[10px] gap-2 transition-all shrink-0",
                    copied
                      ? "bg-emerald-500 hover:bg-emerald-500 text-white"
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                  )}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            {/* WhatsApp */}
            <Button
              onClick={handleWhatsApp}
              variant="outline"
              className="w-full h-12 rounded-2xl bg-emerald-600/10 border-emerald-500/30 text-emerald-400 font-black uppercase tracking-widest text-[10px] gap-3 hover:bg-emerald-600/20 transition-all"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              Share via WhatsApp
            </Button>

            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full h-12 rounded-2xl text-white/40 hover:text-white hover:bg-white/5 font-black uppercase tracking-widest text-[10px]"
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
