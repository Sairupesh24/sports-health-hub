import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, ChevronRight, ChevronLeft,
  FolderKanban, Calendar, Users, Tag, DollarSign, Building, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = ["Basic Info", "Dates & Priority", "Finish"];

export default function NewProjectDialog({ open, onClose }: NewProjectDialogProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "", code: "", description: "", department: "",
    priority: "medium", status: "not_started",
    start_date: "", target_date: "",
    budget: "", currency: "INR",
    template: "blank",
  });

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true);
    // Will call POST /api/planner/projects in M3
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    onClose();
    navigate("/planner/projects/new-id");
  };

  const canProceed = step === 0 ? form.name.trim().length > 0 : true;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-lg font-bold">New Project</DialogTitle>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-1 mt-4">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center",
                    i <= step
                      ? "text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                  style={i <= step ? { background: "hsl(var(--planner-primary))" } : {}}
                >
                  {i + 1}
                </div>
                <span className={cn("text-xs hidden sm:block", i <= step ? "text-foreground font-medium" : "text-muted-foreground")}>
                  {s}
                </span>
                {i < STEPS.length - 1 && (
                  <div className={cn("w-8 h-px mx-1", i < step ? "bg-primary" : "bg-border")} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Step Content */}
        <div className="px-6 py-5 space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="proj-name" className="text-xs font-semibold">Project Name <span className="text-destructive">*</span></Label>
                <Input
                  id="proj-name"
                  autoFocus
                  placeholder="e.g. Website Replatform"
                  value={form.name}
                  onChange={(e) => {
                    update("name", e.target.value);
                    if (!form.code) update("code", e.target.value.slice(0, 3).toUpperCase().replace(/\s/g, ""));
                  }}
                  className="h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="proj-code" className="text-xs font-semibold">Project Code</Label>
                  <Input
                    id="proj-code"
                    placeholder="WRP"
                    value={form.code}
                    onChange={(e) => update("code", e.target.value.toUpperCase().slice(0, 5))}
                    className="h-9 font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="proj-dept" className="text-xs font-semibold">Department</Label>
                  <Select value={form.department} onValueChange={(v) => update("department", v)}>
                    <SelectTrigger id="proj-dept" className="h-9 text-sm">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Engineering", "Product", "Design", "Marketing", "Operations", "Clinical", "Finance", "HR"].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="proj-desc" className="text-xs font-semibold">Description</Label>
                <Textarea
                  id="proj-desc"
                  placeholder="What is this project about?"
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  className="text-sm resize-none"
                  rows={3}
                />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1"><Calendar className="w-3 h-3" /> Start Date</Label>
                  <Input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1"><Calendar className="w-3 h-3" /> Target Date</Label>
                  <Input type="date" value={form.target_date} onChange={(e) => update("target_date", e.target.value)} className="h-9 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => update("priority", v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">🔴 Critical</SelectItem>
                      <SelectItem value="high">🟠 High</SelectItem>
                      <SelectItem value="medium">🟡 Medium</SelectItem>
                      <SelectItem value="low">🟢 Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Initial Status</Label>
                  <Select value={form.status} onValueChange={(v) => update("status", v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_started">Not Started</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1"><DollarSign className="w-3 h-3" /> Budget</Label>
                  <Input type="number" placeholder="0" value={form.budget} onChange={(e) => update("budget", e.target.value)} className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => update("currency", v)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR ₹</SelectItem>
                      <SelectItem value="USD">USD $</SelectItem>
                      <SelectItem value="EUR">EUR €</SelectItem>
                      <SelectItem value="GBP">GBP £</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Start from a template or a blank project.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "blank", label: "Blank Project", desc: "Start fresh with empty workstreams." },
                  { id: "software", label: "Software Dev", desc: "Pre-built sprints, workstreams for engineering teams." },
                  { id: "marketing", label: "Marketing Campaign", desc: "Campaign workstreams and milestone templates." },
                  { id: "clinical", label: "Clinical Rollout", desc: "Clinic software deployment template." },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => update("template", t.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all duration-150",
                      form.template === t.id
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-border hover:bg-muted/30"
                    )}
                  >
                    <p className="text-sm font-semibold text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step > 0 ? setStep(step - 1) : onClose()}
          >
            {step > 0 ? <><ChevronLeft className="w-3.5 h-3.5 mr-1" />Back</> : "Cancel"}
          </Button>
          <Button
            size="sm"
            disabled={!canProceed || loading}
            onClick={() => step < STEPS.length - 1 ? setStep(step + 1) : handleSubmit()}
            style={{ background: "hsl(var(--planner-primary))" }}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            {step < STEPS.length - 1 ? <>Next <ChevronRight className="w-3.5 h-3.5 ml-1" /></> : "Create Project"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
