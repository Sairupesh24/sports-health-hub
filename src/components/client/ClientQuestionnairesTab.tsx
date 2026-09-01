import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiFetch } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Loader2,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  FileDown,
  Save,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import SingleClientAssignModal from "@/components/ams/SingleClientAssignModal";
import { exportQuestionnairePDF } from "@/utils/QuestionnaireExport";
import { useAuth } from "@/contexts/AuthContext";

interface ClientQuestionnairesTabProps {
  clientId: string;
  clientName: string;
  clientAge?: number;
  clientGender?: string;
  clientContact?: string;
  /** Full client object to pass into SingleClientAssignModal */
  clientObj?: any;
}

interface QuestionnaireAssignment {
  id: string;
  form_id: string;
  form_name: string;
  classification?: string;
  assigned_at: string;
  status: "pending" | "completed";
  public_token?: string;
  responded_at?: string;
  answers?: { question: string; answer: any; score?: number }[];
  clinical_interpretation?: string;
}

export default function ClientQuestionnairesTab({
  clientId,
  clientName,
  clientAge,
  clientGender,
  clientContact,
  clientObj,
}: ClientQuestionnairesTabProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<any>(null);

  // Interpretation state per response
  const [interpretations, setInterpretations] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const { data: assignments, isLoading } = useQuery<QuestionnaireAssignment[]>({
    queryKey: ["client-questionnaires", clientId],
    queryFn: () => apiFetch<QuestionnaireAssignment[]>(`/clients/${clientId}/questionnaires`),
    enabled: !!clientId,
  });

  const { data: forms } = useQuery<any[]>({
    queryKey: ["ams-questionnaires-for-assign"],
    queryFn: () => apiFetch<any[]>("/ams/questionnaires"),
    enabled: assignModalOpen,
  });

  const sortedAssignments = assignments
    ? [...assignments].sort(
        (a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime()
      )
    : [];

  const handleCopyLink = async (assignment: QuestionnaireAssignment) => {
    if (!assignment.public_token) return;
    const link = `${window.location.origin}/q/${assignment.public_token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(assignment.id);
      toast({ title: "Link copied!" });
      setTimeout(() => setCopiedId(null), 3000);
    } catch {
      toast({ title: "Could not copy link", variant: "destructive" });
    }
  };

  const handleSaveInterpretation = async (responseId: string) => {
    try {
      setSavingId(responseId);
      await apiFetch(`/ams/form-responses/${responseId}`, {
        method: "PATCH",
        body: { clinical_interpretation: interpretations[responseId] || "" },
      });
      toast({ title: "Interpretation saved." });
      queryClient.invalidateQueries({ queryKey: ["client-questionnaires", clientId] });
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const handleExportPDF = async (assignment: QuestionnaireAssignment) => {
    if (!profile?.organization_id || !assignment.answers) return;
    try {
      setExportingId(assignment.id);
      await exportQuestionnairePDF({
        clientName,
        uhid: clientObj?.uhid,
        questionnaireName: assignment.form_name,
        specialistName: profile ? `${profile.first_name} ${profile.last_name}`.trim() : "Specialist",
        respondedAt: assignment.responded_at,
        answers: assignment.answers,
        interpretation: interpretations[assignment.id] ?? assignment.clinical_interpretation ?? "",
        orgId: profile.organization_id,
      });
      toast({ title: "PDF exported successfully." });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExportingId(null);
    }
  };

  const toggleExpand = (assignment: QuestionnaireAssignment) => {
    if (expandedId === assignment.id) {
      setExpandedId(null);
    } else {
      setExpandedId(assignment.id);
      // Pre-fill interpretation editor
      if (assignment.clinical_interpretation && !interpretations[assignment.id]) {
        setInterpretations((prev) => ({
          ...prev,
          [assignment.id]: assignment.clinical_interpretation || "",
        }));
      }
    }
  };

  // ────────────────────────────────────────
  // Assign New — opens form picker first
  // ────────────────────────────────────────
  const [formPickerOpen, setFormPickerOpen] = useState(false);

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-base text-slate-900">Assigned Questionnaires</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sortedAssignments.length} questionnaire{sortedAssignments.length !== 1 ? "s" : ""} assigned — sorted by latest first
          </p>
        </div>
        <Button
          onClick={() => setFormPickerOpen(true)}
          size="sm"
          className="gap-2 rounded-xl bg-primary text-white font-bold text-xs shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> Assign Questionnaire
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : sortedAssignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-2xl text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-700">No questionnaires assigned yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Assign Questionnaire" to send a form to this client.
            </p>
          </div>
          <Button
            onClick={() => setFormPickerOpen(true)}
            size="sm"
            variant="outline"
            className="gap-2 rounded-xl font-bold text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Assign First Questionnaire
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAssignments.map((assignment) => {
            const isExpanded = expandedId === assignment.id;
            const publicLink = assignment.public_token
              ? `${window.location.origin}/q/${assignment.public_token}`
              : null;
            const isCopied = copiedId === assignment.id;
            const totalScore =
              assignment.answers?.reduce((acc, q) => acc + (q.score || 0), 0) ?? null;
            const hasScore = assignment.answers?.some((q) => q.score !== undefined) ?? false;

            return (
              <div
                key={assignment.id}
                className={cn(
                  "border rounded-2xl overflow-hidden transition-all",
                  assignment.status === "completed"
                    ? "border-emerald-200 bg-emerald-50/30"
                    : "border-amber-200 bg-amber-50/30"
                )}
              >
                {/* Row header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  {/* Status icon */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      assignment.status === "completed"
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-amber-100 text-amber-600"
                    )}
                  >
                    {assignment.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-sm text-slate-900 truncate">{assignment.form_name}</p>
                      <Badge
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider border-none shrink-0",
                          assignment.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {assignment.status === "completed" ? "Completed" : "Pending"}
                      </Badge>
                      {hasScore && totalScore !== null && assignment.status === "completed" && (
                        <Badge className="bg-primary/10 text-primary border-none rounded-full px-2.5 py-0.5 text-[9px] font-black shrink-0">
                          Score: {totalScore}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                        <Calendar className="w-3 h-3" />
                        Assigned: {format(new Date(assignment.assigned_at), "dd MMM yyyy")}
                      </span>
                      {assignment.responded_at && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Submitted: {format(new Date(assignment.responded_at), "dd MMM yyyy")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Copy link — show for pending */}
                    {assignment.status === "pending" && publicLink && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(assignment)}
                        className={cn(
                          "h-8 rounded-xl px-3 text-[10px] font-bold gap-1.5 border transition-all",
                          isCopied
                            ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                            : "border-amber-200 text-amber-700 hover:bg-amber-50"
                        )}
                      >
                        {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {isCopied ? "Copied!" : "Copy Link"}
                      </Button>
                    )}

                    {/* Expand responses — completed */}
                    {assignment.status === "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleExpand(assignment)}
                        className="h-8 rounded-xl px-3 text-[10px] font-bold gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3" /> Hide
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" /> View Responses
                          </>
                        )}
                      </Button>
                    )}

                    {/* Open link in new tab — pending */}
                    {assignment.status === "pending" && publicLink && (
                      <a href={publicLink} target="_blank" rel="noopener noreferrer">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 rounded-xl p-0 text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>

                {/* ─── INLINE RESPONSE VIEWER ─── */}
                {isExpanded && assignment.status === "completed" && (
                  <div className="border-t border-emerald-200 bg-white">
                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-emerald-100">
                      {/* Left: Q&A */}
                      <ScrollArea className="max-h-80">
                        <div className="p-5 space-y-4">
                          {/* Client meta */}
                          <div className="flex items-center gap-3 pb-3 border-b border-emerald-100">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <p className="font-black text-slate-900 text-sm italic">{clientName}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" />
                                {assignment.responded_at
                                  ? format(new Date(assignment.responded_at), "dd MMM yyyy, hh:mm a")
                                  : "—"}
                              </p>
                            </div>
                          </div>

                          {/* Questions */}
                          {assignment.answers?.map((q, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-1.5 leading-snug">
                                  {q.question}
                                </p>
                                <div className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                                  <p className="text-xs font-bold text-slate-600 italic">
                                    {Array.isArray(q.answer)
                                      ? q.answer.join(", ")
                                      : q.answer || "No response recorded."}
                                  </p>
                                </div>
                                {q.score !== undefined && (
                                  <span className="inline-block mt-1.5 bg-primary/10 text-primary rounded-lg px-2 py-0.5 text-[9px] font-black">
                                    Score: {q.score}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* Right: Interpretation */}
                      <div className="p-5 bg-slate-900 space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                          <MessageSquare className="w-32 h-32" />
                        </div>
                        <div className="relative z-10 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-white">
                              Clinical Interpretation
                            </p>
                          </div>
                          <Textarea
                            placeholder="Enter clinical observations or follow-up actions…"
                            className="min-h-[140px] bg-white/5 border-white/10 rounded-2xl p-4 text-xs font-bold text-white placeholder:text-white/20 focus-visible:ring-primary/20 resize-none"
                            value={interpretations[assignment.id] ?? assignment.clinical_interpretation ?? ""}
                            onChange={(e) =>
                              setInterpretations((prev) => ({
                                ...prev,
                                [assignment.id]: e.target.value,
                              }))
                            }
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSaveInterpretation(assignment.id)}
                              disabled={savingId === assignment.id}
                              className="flex-1 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black uppercase tracking-widest text-[9px] gap-1.5 border-none"
                            >
                              {savingId === assignment.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                              Save
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleExportPDF(assignment)}
                              disabled={exportingId === assignment.id}
                              variant="outline"
                              className="flex-1 h-9 rounded-xl bg-transparent border-white/10 text-white/60 hover:text-white hover:bg-white/10 font-black uppercase tracking-widest text-[9px] gap-1.5"
                            >
                              {exportingId === assignment.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <FileDown className="w-3.5 h-3.5" />
                              )}
                              Export PDF
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── FORM PICKER MODAL ─── */}
      <FormPickerModal
        isOpen={formPickerOpen}
        onClose={() => setFormPickerOpen(false)}
        onSelect={(form) => {
          setSelectedForm(form);
          setFormPickerOpen(false);
          setAssignModalOpen(true);
        }}
      />

      {/* ─── SINGLE CLIENT ASSIGN MODAL ─── */}
      {selectedForm && (
        <SingleClientAssignModal
          isOpen={assignModalOpen}
          onClose={() => {
            setAssignModalOpen(false);
            setSelectedForm(null);
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["client-questionnaires", clientId] });
          }}
          form={selectedForm}
          preSelectedClient={
            clientObj
              ? {
                  id: clientObj.id,
                  first_name: clientObj.first_name,
                  last_name: clientObj.last_name,
                  honorific: clientObj.honorific,
                  uhid: clientObj.uhid,
                  age: clientObj.age,
                  gender: clientObj.gender,
                  mobile_no: clientObj.mobile_no,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// FormPickerModal — lightweight form selector
// ────────────────────────────────────────────────────────────────
function FormPickerModal({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (form: any) => void;
}) {
  const [search, setSearch] = useState("");

  const { data: forms, isLoading } = useQuery<any[]>({
    queryKey: ["ams-questionnaires"],
    queryFn: () => apiFetch<any[]>("/ams/questionnaires"),
    enabled: isOpen,
  });

  const filtered = forms?.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        aria-describedby={undefined}
        className="p-0 overflow-hidden bg-[#0F172A] border border-white/10 text-white rounded-[2rem] sm:max-w-lg max-w-[95vw]"
      >
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
              <ClipboardList className="w-4.5 h-4.5" />
            </div>
            <DialogTitle className="text-lg font-black uppercase italic tracking-tight">
              <span className="text-primary">Select</span> a Form
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="relative">
            <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search forms…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/20 font-bold text-sm outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          <ScrollArea className="h-64">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : !filtered?.length ? (
              <div className="text-center py-10">
                <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">
                  No forms found
                </p>
              </div>
            ) : (
              <div className="space-y-2 pr-2">
                {filtered.map((form) => (
                  <button
                    key={form.id}
                    onClick={() => onSelect(form)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/30 transition-all text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <ClipboardList className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-white text-sm italic truncate">{form.name}</p>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-0.5">
                        {form.questions?.length || 0} Questions · {form.classification}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-white/20 group-hover:text-primary -rotate-90 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
