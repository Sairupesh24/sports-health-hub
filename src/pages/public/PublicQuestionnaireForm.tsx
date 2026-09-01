import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "@/utils/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  User,
  Phone,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Activity,
  Check,
} from "lucide-react";

interface FormQuestion {
  id: string;
  type: "text" | "mcq" | "checkbox" | "range";
  label: string;
  required: boolean;
  options?: { text: string; score: number }[];
  minLabel?: string;
  maxLabel?: string;
  scaleLimit?: 5 | 10;
}

interface PublicFormData {
  form_response_id: string;
  questionnaire_name: string;
  classification: string;
  questions: FormQuestion[];
  pre_fill: {
    full_name: string;
    age?: number;
    gender?: string;
    contact?: string;
  };
  org_name?: string;
  org_logo_url?: string;
}

type AnswerValue = string | string[] | number;

export default function PublicQuestionnaireForm() {
  const { token } = useParams<{ token: string }>();

  const [formData, setFormData] = useState<PublicFormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Override global body/root overflow:hidden so public form scrolls naturally
    const origBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "auto";
    const root = document.getElementById("root");
    const origRootHeight = root?.style.height;
    if (root) {
      root.style.height = "auto";
      root.style.minHeight = "100%";
    }
    return () => {
      document.body.style.overflow = origBodyOverflow;
      if (root && origRootHeight !== undefined) {
        root.style.height = origRootHeight;
      }
    };
  }, []);

  useEffect(() => {
    async function loadForm() {
      if (!token) {
        setError("Invalid link — no token provided.");
        setLoading(false);
        return;
      }
      try {
        const data = await apiFetch<PublicFormData>(`/ams/public/form/${token}`);
        setFormData(data);
      } catch (err: any) {
        setError(err.message || "This questionnaire link is invalid or has already been completed.");
      } finally {
        setLoading(false);
      }
    }
    loadForm();
  }, [token]);

  const handleAnswerChange = (questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId: string, optionText: string) => {
    setAnswers((prev) => {
      const current = (prev[questionId] as string[]) || [];
      if (current.includes(optionText)) {
        return { ...prev, [questionId]: current.filter((v) => v !== optionText) };
      }
      return { ...prev, [questionId]: [...current, optionText] };
    });
  };

  const handleSubmit = async () => {
    if (!formData || !token) return;

    // Validate required questions
    const unanswered = formData.questions
      .filter((q) => q.required)
      .filter((q) => {
        const a = answers[q.id];
        if (a === undefined || a === null) return true;
        if (Array.isArray(a) && a.length === 0) return true;
        if (typeof a === "string" && a.trim() === "") return true;
        return false;
      });

    if (unanswered.length > 0) {
      const el = document.getElementById(`q-${unanswered[0].id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    try {
      setSubmitting(true);
      const payload = formData.questions.map((q) => {
        const rawAnswer = answers[q.id];
        const option = q.options?.find(
          (o) =>
            o.text === rawAnswer ||
            (Array.isArray(rawAnswer) && rawAnswer.includes(o.text))
        );
        return {
          question: q.label,
          answer: rawAnswer ?? "",
          score: option?.score,
        };
      });
      await apiFetch(`/ams/public/form/${token}/submit`, {
        method: "POST",
        body: { answers: payload },
      });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ────────────────────────────────────────────
  // LOADING STATE
  // ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto animate-pulse">
            <ClipboardList className="w-7 h-7 text-primary" />
          </div>
          <p className="text-white/60 font-bold uppercase tracking-widest text-[11px]">
            Loading your questionnaire…
          </p>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────
  // ERROR STATE
  // ────────────────────────────────────────────
  if (error || !formData) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-10 text-center space-y-5 backdrop-blur-xl shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-rose-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">
              Link Unavailable
            </h2>
            <p className="text-white/50 font-medium text-xs sm:text-sm leading-relaxed">
              {error || "This questionnaire link is invalid or has already been submitted."}
            </p>
          </div>
          <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest pt-2 border-t border-white/5">
            Please contact your care team for assistance.
          </p>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────
  // SUCCESS / SUBMITTED STATE
  // ────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-500/30 border border-emerald-500/40 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white uppercase italic tracking-tight mb-2">
              Thank You!
            </h1>
            <p className="text-white/70 font-medium text-sm sm:text-base leading-relaxed px-2">
              Your responses for{" "}
              <span className="text-primary font-black">
                {formData.questionnaire_name}
              </span>{" "}
              have been recorded successfully.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left space-y-2 backdrop-blur-sm shadow-xl">
            <p className="text-white/40 font-black uppercase tracking-widest text-[9px]">
              Submitted by
            </p>
            <p className="text-white font-black text-base italic">
              {formData.pre_fill.full_name}
            </p>
            {formData.org_name && (
              <p className="text-primary font-bold text-xs uppercase tracking-wider">
                {formData.org_name}
              </p>
            )}
          </div>
          <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
            You may now close this tab. Your care team has been notified.
          </p>
        </div>
      </div>
    );
  }

  const { pre_fill, questionnaire_name, classification, questions } = formData;
  const answeredCount = Object.keys(answers).filter((k) => {
    const v = answers[k];
    if (v === undefined || v === null) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "string") return v.trim() !== "";
    return true;
  }).length;
  const progress = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  // ────────────────────────────────────────────
  // UNIFIED SINGLE FORM VIEW WITH PRE-FILLED HEADER
  // ────────────────────────────────────────────
  return (
    <div className="min-h-screen h-screen overflow-y-auto w-full bg-[#F8FAFC] text-slate-900 scroll-smooth">
      {/* Top Banner Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-black uppercase italic tracking-tight truncate text-white">
                  {questionnaire_name}
                </h1>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest truncate">
                  {formData.org_name || "Center for Spine and Sports Health"}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <Badge
                className={cn(
                  "rounded-full px-3 py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest border-none",
                  classification === "clinical"
                    ? "bg-rose-500/20 text-rose-300"
                    : "bg-blue-500/20 text-blue-300"
                )}
              >
                {classification === "clinical" ? "Clinical" : "Performance"}
              </Badge>
              <p className="text-[10px] font-bold text-primary mt-1">
                {progress}% Complete
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Form Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Pre-filled Registration Info Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Client Registration Details
              </h2>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">
              Pre-filled
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
            {/* Full Name */}
            <div className="sm:col-span-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Full Name</p>
              <p className="text-sm font-black text-slate-900 italic mt-0.5 truncate">{pre_fill.full_name}</p>
            </div>
            {/* Age */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Age</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">{pre_fill.age ? `${pre_fill.age} yrs` : "—"}</p>
            </div>
            {/* Gender */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Gender</p>
              <p className="text-sm font-black text-slate-900 capitalize mt-0.5">{pre_fill.gender || "—"}</p>
            </div>
            {/* Contact */}
            {pre_fill.contact && (
              <div className="sm:col-span-2 md:col-span-4 bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Contact Number</p>
                  <p className="text-sm font-black text-slate-900 mt-0.5">{pre_fill.contact}</p>
                </div>
                <Phone className="w-4 h-4 text-slate-400" />
              </div>
            )}
          </div>
        </div>

        {/* Form Instructions Divider */}
        <div className="flex items-center gap-3 pt-2">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400">
            Questions ({questions.length})
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Questions List */}
        <div className="space-y-4 sm:space-y-5">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              id={`q-${q.id}`}
              className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-7 border border-slate-200 shadow-xs hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-3 sm:gap-3.5 mb-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] sm:text-[11px] font-black shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 text-sm sm:text-base leading-snug">
                    {q.label}
                    {q.required && (
                      <span className="text-rose-500 ml-1 text-base leading-none">*</span>
                    )}
                  </p>
                </div>
              </div>

              {/* TEXT */}
              {q.type === "text" && (
                <Textarea
                  placeholder="Type your answer here…"
                  className="min-h-[100px] rounded-xl sm:rounded-2xl border-slate-200 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus-visible:ring-primary/20 p-3.5 sm:p-4"
                  value={(answers[q.id] as string) || ""}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                />
              )}

              {/* MCQ */}
              {q.type === "mcq" && (
                <div className="space-y-2 sm:space-y-2.5">
                  {q.options?.map((opt) => {
                    const isSelected = answers[q.id] === opt.text;
                    return (
                      <button
                        key={opt.text}
                        type="button"
                        onClick={() => handleAnswerChange(q.id, opt.text)}
                        className={cn(
                          "w-full text-left rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 border-2 font-bold text-xs sm:text-sm transition-all flex items-center gap-3",
                          isSelected
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <span
                          className={cn(
                            "w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                            isSelected ? "border-primary bg-primary" : "border-slate-300"
                          )}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white" />}
                        </span>
                        <span className="flex-1 leading-snug">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* CHECKBOX */}
              {q.type === "checkbox" && (
                <div className="space-y-2 sm:space-y-2.5">
                  {q.options?.map((opt) => {
                    const isChecked = ((answers[q.id] as string[]) || []).includes(opt.text);
                    return (
                      <button
                        key={opt.text}
                        type="button"
                        onClick={() => handleCheckboxChange(q.id, opt.text)}
                        className={cn(
                          "w-full text-left rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 border-2 font-bold text-xs sm:text-sm transition-all flex items-center gap-3",
                          isChecked
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <span
                          className={cn(
                            "w-4 h-4 sm:w-5 sm:h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                            isChecked ? "border-primary bg-primary" : "border-slate-300"
                          )}
                        >
                          {isChecked && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <span className="flex-1 leading-snug">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* RANGE */}
              {q.type === "range" && (
                <div className="space-y-4 px-1 sm:px-2 pt-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>{q.minLabel || "Low"}</span>
                    <span className="text-2xl font-black text-primary">
                      {answers[q.id] ?? Math.ceil((q.scaleLimit || 10) / 2)}
                    </span>
                    <span>{q.maxLabel || "High"}</span>
                  </div>
                  <Slider
                    min={1}
                    max={q.scaleLimit || 10}
                    step={1}
                    value={[Number(answers[q.id] ?? Math.ceil((q.scaleLimit || 10) / 2))]}
                    onValueChange={([v]) => handleAnswerChange(q.id, v)}
                    className="w-full py-2"
                  />
                  <div className="flex justify-between">
                    {Array.from({ length: q.scaleLimit || 10 }, (_, i) => i + 1).map((n) => (
                      <span
                        key={n}
                        className={cn(
                          "text-[9px] sm:text-[10px] font-black transition-colors",
                          Number(answers[q.id]) === n ? "text-primary font-black scale-110" : "text-slate-300"
                        )}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Submit Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs text-center space-y-3.5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {answeredCount} of {questions.length} questions answered
          </p>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest text-xs gap-3 shadow-xl transition-all hover:scale-[1.01] active:scale-95"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" /> Submitting Responses…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4.5 h-4.5" /> Submit Responses
              </>
            )}
          </Button>
          <p className="text-[10px] text-slate-400 font-medium">
            By submitting, you agree to share these responses with your care team.
          </p>
        </div>
      </main>
    </div>
  );
}
