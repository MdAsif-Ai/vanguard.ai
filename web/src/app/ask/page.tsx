"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CitationCard } from "@/components/ui/CitationCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import { researchApi } from "@/lib/api/research";
import { ResearchJobResponse, Citation } from "@/types";
import {
  Sparkles,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  Trash2,
  FileText,
  Search,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface ChatMessage {
  id: string;
  question: string;
  status: "queued" | "running" | "completed" | "failed";
  elapsedMs?: number;
  createdAt: string;
  jobResponse?: ResearchJobResponse | null;
  error?: string | null;
}

const EXAMPLE_QUESTIONS = [
  "What was Google's total revenue in 2025?",
  "What are the primary operational risk factors disclosed?",
  "What is the company's operating margin trend over the last 3 years?",
  "Summarize the capital expenditures and debt obligations.",
];

const STORAGE_CHAT_KEY = "vanguard_research_history";

export default function AskResearchPage() {
  const [question, setQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeTimerSeconds, setActiveTimerSeconds] = useState(0);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CHAT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save chat history to localStorage
  const saveMessages = (msgs: ChatMessage[]) => {
    setMessages(msgs);
    try {
      localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(msgs.slice(0, 30)));
    } catch {
      // Ignore storage errors
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(STORAGE_CHAT_KEY);
    setMessages([]);
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeJobId]);

  // Polling active research job
  useEffect(() => {
    if (!activeJobId) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const startTime = Date.now();
    setActiveTimerSeconds(0);

    timerRef.current = setInterval(() => {
      setActiveTimerSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    let isCancelled = false;

    const pollJob = async () => {
      try {
        const job = await researchApi.getJob(activeJobId);
        if (isCancelled) return;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === activeJobId
              ? {
                  ...m,
                  status: job.status as any,
                  jobResponse: job,
                  elapsedMs: Date.now() - startTime,
                }
              : m
          )
        );

        if (job.status === "completed" || job.status === "failed") {
          setActiveJobId(null);
          setIsSubmitting(false);
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          // Poll again after 3.5s
          setTimeout(() => {
            if (!isCancelled && activeJobId === job.id) {
              pollJob();
            }
          }, 3500);
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.error("Polling error:", err);
        // Retry polling unless job explicitly failed
        setTimeout(() => {
          if (!isCancelled) pollJob();
        }, 5000);
      }
    };

    pollJob();

    return () => {
      isCancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeJobId]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || isSubmitting) return;

    setErrorBanner(null);
    setIsSubmitting(true);
    setQuestion("");

    try {
      const job = await researchApi.ask({ question: trimmed });
      const newMsg: ChatMessage = {
        id: job.id,
        question: trimmed,
        status: job.status as any,
        createdAt: new Date().toISOString(),
        jobResponse: job,
      };

      const updated = [...messages, newMsg];
      saveMessages(updated);
      setActiveJobId(job.id);
    } catch (err: any) {
      setIsSubmitting(false);
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "Failed to submit research query. Please check your backend connection.";
      setErrorBanner(msg);
    }
  };

  const handleSelectExample = (q: string) => {
    setQuestion(q);
  };

  return (
    <AppShell
      title="Financial AI Research Engine"
      description="Ask questions about company 10-K filings, disclosures, and balance sheets. Every answer is grounded with auditable citations."
      actions={
        messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#CBF3F0]/50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all border border-[#CBF3F0] shadow-sm active:scale-95"
            title="Clear research history"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Clear History</span>
          </button>
        )
      }
    >
      <div className="flex flex-col h-[calc(100vh-8.5rem)]">
        {/* Error notification */}
        <ErrorDisplay message={errorBanner} className="mb-4" />

        {/* Message Thread Area */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {messages.length === 0 ? (
            /* Empty State with Question Suggestions */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-[#CBF3F0] border border-[#2EC4B6]/40 flex items-center justify-center shadow-clay text-[#2EC4B6]">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">Ask Anything About Ingested Reports</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  The model searches vector embeddings, retrieves exact financial passages, and generates an auditable answer with page citations.
                </p>
              </div>

              {/* Example Prompts */}
              <div className="w-full max-w-xl space-y-2 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Suggested Queries
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {EXAMPLE_QUESTIONS.map((ex, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectExample(ex)}
                      className="p-3.5 rounded-2xl bg-white hover:bg-[#CBF3F0]/30 border border-[#CBF3F0] hover:border-[#2EC4B6] text-left transition-all duration-200 group flex items-start justify-between gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.03)] hover:shadow-clay"
                    >
                      <span className="text-xs text-slate-700 font-medium group-hover:text-slate-900 line-clamp-2">
                        {ex}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-[#2EC4B6] group-hover:text-[#FF9F1C] flex-shrink-0 mt-0.5 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Thread of Questions and AI Answers */
            messages.map((item, index) => {
              const isCurrentActive = activeJobId === item.id;
              const result = item.jobResponse?.result;
              const hasAnswer = !!result?.answer;
              const citations = result?.citations || [];

              return (
                <div key={item.id || index} className="space-y-4">
                  {/* User Question Bubble (Right aligned) */}
                  <div className="flex justify-end">
                    <div className="max-w-2xl bg-gradient-to-r from-[#FF9F1C] to-[#FFBF69] text-white p-4 rounded-2xl rounded-tr-sm shadow-clay-btn space-y-1.5">
                      <div className="text-sm font-semibold leading-relaxed">{item.question}</div>
                      <div className="flex items-center justify-end gap-2 text-[10px] text-white/90 font-mono">
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Response Area (Left aligned) */}
                  <div className="flex justify-start">
                    <div className="max-w-3xl w-full bg-white border border-[#CBF3F0] rounded-2xl rounded-tl-sm p-5 space-y-4 shadow-clay">
                      {/* Header with status badge & execution timer */}
                      <div className="flex items-center justify-between border-b border-[#CBF3F0]/60 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#CBF3F0] text-[#2EC4B6] border border-[#2EC4B6]/30 flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            VANGUARD Reasoning Engine
                          </span>
                          <StatusBadge status={item.status} />
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                          {isCurrentActive && (
                            <div className="flex items-center gap-1.5 text-[#FF9F1C] font-semibold animate-pulse">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{activeTimerSeconds}s elapsed</span>
                            </div>
                          )}

                          {!isCurrentActive && item.elapsedMs && (
                            <div className="flex items-center gap-1 text-slate-500 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{(item.elapsedMs / 1000).toFixed(1)}s</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Loading or Status Transitions */}
                      {item.status === "queued" && (
                        <div className="p-4 rounded-xl bg-[#CBF3F0]/40 border border-[#2EC4B6]/30 flex items-center gap-3 text-slate-700 text-xs font-medium">
                          <LoadingSpinner size="sm" />
                          <span>
                            Research query queued. Worker assigning vector similarity scan...
                          </span>
                        </div>
                      )}

                      {item.status === "running" && (
                        <div className="p-4 rounded-xl bg-[#CBF3F0]/60 border border-[#2EC4B6] flex items-center gap-3 text-slate-800 text-xs font-medium">
                          <LoadingSpinner size="sm" />
                          <span>
                            Running semantic search over chunks and synthesizing evidence ({activeTimerSeconds}s)...
                          </span>
                        </div>
                      )}

                      {item.status === "failed" && (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs">
                          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Reasoning Job Failed</span>
                            <span className="text-rose-600 mt-0.5 block">
                              {item.jobResponse?.result?.answer || "The model was unable to process the query against current indices."}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Synthesized Answer */}
                      {hasAnswer && (
                        <div className="space-y-4">
                          <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                            {result?.answer}
                          </div>

                          {/* Evidence & Verification Badges */}
                          <div className="pt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#CBF3F0] border border-[#2EC4B6]/40 text-[#157A70] text-xs font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#2EC4B6]" />
                              Verified Against Document Evidence
                            </span>
                            <span className="px-2.5 py-1 rounded-xl bg-white border border-[#CBF3F0] text-slate-600 text-xs font-mono font-medium shadow-sm">
                              {citations.length} Cited Sources
                            </span>
                          </div>

                          {/* Citations Grid */}
                          {citations.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-[#CBF3F0]/60">
                              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-[#FF9F1C]" />
                                  Grounding Citations & References
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  Qdrant Top-K Matches
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {citations.map((c, cIdx) => (
                                  <CitationCard
                                    key={c.index || cIdx}
                                    citation={c}
                                    question={item.question}
                                    answer={result?.answer}
                                    jobId={item.id}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar Fixed At Bottom - Styled as Physical Analytical Instrument */}
        <div className="pt-4 border-t border-[#CBF3F0]">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center rounded-2xl bg-white border-2 border-[#CBF3F0] focus-within:border-[#2EC4B6] shadow-clay transition-all">
              <div className="pl-4 text-[#2EC4B6]">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about uploaded financial filings, balance sheets, or SEC disclosures..."
                disabled={isSubmitting}
                className="w-full bg-transparent px-3 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none disabled:opacity-50 font-medium"
              />
              <button
                type="submit"
                disabled={!question.trim() || isSubmitting}
                className="mr-2 p-2.5 rounded-xl bg-[#FF9F1C] hover:bg-[#FFBF69] text-white transition-all disabled:opacity-40 disabled:hover:bg-[#FF9F1C] shadow-clay-btn flex items-center justify-center flex-shrink-0 active:scale-95"
                aria-label="Send query"
              >
                {isSubmitting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-2 pt-2 font-medium">
            <span>Fast Mode • Grounded via Qdrant cosine similarity</span>
            <span>Rate limit: 30 queries / min</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
