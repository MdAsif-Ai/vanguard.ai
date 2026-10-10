"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CitationCard } from "@/components/ui/CitationCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { TactileButton } from "@/components/ui/TactileButton";
import { researchApi } from "@/lib/api/research";
import { ResearchJobResponse } from "@/types";
import {
  Sparkles,
  Send,
  Clock,
  AlertCircle,
  Trash2,
  FileText,
  Search,
  ChevronRight,
  ShieldCheck,
  Terminal,
  Activity,
  CheckCircle2,
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

const EXAMPLE_CATEGORIES = [
  {
    category: "Revenue & Growth",
    tag: "FINANCIALS",
    question: "What was the company's total revenue in fiscal 2025, and what segments drove performance?",
  },
  {
    category: "Operational Risks",
    tag: "10-K RISKS",
    question: "What are the primary operational risk factors and supply chain dependencies disclosed?",
  },
  {
    category: "Operating Margins",
    tag: "MARGIN TRENDS",
    question: "What is the operating margin trend and gross profit trajectory across reporting periods?",
  },
  {
    category: "Debt & Liquidity",
    tag: "CAPITAL STRUCTURE",
    question: "Summarize the long-term debt obligations, cash reserves, and capital expenditures.",
  },
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
          setTimeout(() => {
            if (!isCancelled && activeJobId === job.id) {
              pollJob();
            }
          }, 3500);
        }
      } catch (err: any) {
        if (isCancelled) return;
        console.error("Polling error:", err);
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
      title="Financial AI Research Terminal"
      description="Interactive reasoning workstation across 10-K, 10-Q filings, transcripts, and footnotes with auditable citation proof"
      actions={
        messages.length > 0 && (
          <TactileButton
            variant="outline"
            size="sm"
            onClick={clearHistory}
            icon={<Trash2 className="w-3.5 h-3.5 text-[#8A95A5]" />}
            title="Clear research history"
          >
            <span className="hidden sm:inline">Clear History</span>
          </TactileButton>
        )
      }
    >
      <div className="flex flex-col h-[calc(100vh-8.5rem)]">
        {/* Error notification */}
        <ErrorDisplay message={errorBanner} className="mb-4" />

        {/* Message Thread Area */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {messages.length === 0 ? (
            /* Empty State: AI Financial Research Terminal Hero */
            <div className="h-full flex flex-col items-center justify-center p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
              {/* Terminal Container */}
              <div className="w-full bg-[#0B132B] border border-[#1C2541] rounded-[24px] sm:rounded-[28px] p-6 sm:p-8 shadow-terminal relative overflow-hidden">
                {/* Subtle background grid pattern */}
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{
                    backgroundImage: `radial-gradient(circle at 1px 1px, #D4AF37 1px, transparent 0)`,
                    backgroundSize: "28px 28px",
                  }}
                />

                <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                  {/* Top Bar Indicators */}
                  <div className="flex items-center justify-between w-full border-b border-[#1C2541] pb-3 text-xs">
                    <div className="flex items-center gap-2 text-[#8A95A5] font-mono">
                      <Terminal className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#D4AF37]">
                        VANGUARD TERMINAL V2.4
                      </span>
                    </div>

                    {/* AI 3D Status Indicator */}
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#1C2541] border border-[#2A9D8F]/30 text-[#2A9D8F] text-[11px] font-mono font-bold">
                      <span className="w-2 h-2 rounded-full bg-[#2A9D8F] animate-pulse" />
                      <span>AI REASONING ENGINE ACTIVE</span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="max-w-xl space-y-2 pt-2">
                    <h2 className="text-xl sm:text-2xl font-black text-[#F4F1EA] tracking-tight font-serif">
                      AI Financial Research Terminal
                    </h2>
                    <p className="text-xs sm:text-sm text-[#8A95A5] leading-relaxed">
                      Dense semantic search across SEC 10-K filings, conference transcripts, and audited footnote tables. Every calculation and insight is verified with exact page grounding.
                    </p>
                  </div>
                </div>
              </div>

              {/* Example Prompts Grid */}
              <div className="w-full space-y-2.5 text-left">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#0B132B] font-mono">
                    Suggested Financial Inquiries
                  </span>
                  <span className="text-[11px] text-[#8A95A5] font-mono">10-K • 10-Q • Footnotes</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EXAMPLE_CATEGORIES.map((ex, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectExample(ex.question)}
                      className="p-4 rounded-xl bg-[#FFFFFF] hover:bg-[#F4F1EA] border border-[#DDD6C4] hover:border-[#D4AF37] text-left transition-all duration-200 group flex flex-col justify-between gap-3 shadow-card hover:shadow-card-hover hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="px-2 py-0.5 rounded-md bg-[#0B132B] text-[#D4AF37] font-mono text-[10px] font-bold border border-[#1C2541]">
                          {ex.tag}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#8A95A5] group-hover:text-[#D4AF37] flex-shrink-0 transition-colors group-hover:translate-x-0.5" />
                      </div>
                      <span className="text-xs text-[#0B132B] font-semibold group-hover:text-[#0B132B] line-clamp-2 leading-relaxed">
                        {ex.question}
                      </span>
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
                  {/* User Question Bubble (Right aligned, Deep Navy styling) */}
                  <div className="flex justify-end">
                    <div className="max-w-2xl bg-[#0B132B] text-[#F4F1EA] p-4.5 rounded-2xl rounded-tr-sm shadow-md border border-[#1C2541] space-y-1.5">
                      <div className="text-xs font-mono uppercase tracking-wider text-[#D4AF37] font-bold">
                        Analyst Inquiry
                      </div>
                      <div className="text-sm font-medium leading-relaxed">{item.question}</div>
                      <div className="flex items-center justify-end gap-2 text-[10px] text-[#8A95A5] font-mono">
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Response Area (Left aligned, Executive Brief Style) */}
                  <div className="flex justify-start">
                    <PremiumCard variant="paper" className="max-w-3xl w-full p-6 space-y-4 rounded-tl-sm shadow-feature">
                      {/* Header with status badge & execution timer */}
                      <div className="flex items-center justify-between border-b border-[#DDD6C4] pb-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#0B132B] text-[#D4AF37] border border-[#1C2541] flex items-center justify-center shadow-xs">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#0B132B] uppercase tracking-wide block font-serif">
                              VANGUARD REASONING ENGINE
                            </span>
                          </div>
                          <StatusBadge status={item.status} />
                        </div>

                        <div className="flex items-center gap-3 text-xs text-[#8A95A5] font-mono">
                          {isCurrentActive && (
                            <div className="flex items-center gap-1.5 text-[#D4AF37] font-bold">
                              <Clock className="w-3.5 h-3.5 animate-spin" />
                              <span>{activeTimerSeconds}s elapsed</span>
                            </div>
                          )}

                          {!isCurrentActive && item.elapsedMs && (
                            <div className="flex items-center gap-1 text-[#8A95A5] font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{(item.elapsedMs / 1000).toFixed(1)}s</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Loading or Status Transitions with 3D Teal Indicator */}
                      {item.status === "queued" && (
                        <div className="p-4 rounded-xl bg-[#0B132B] border border-[#1C2541] text-[#F4F1EA] flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-[#2A9D8F] animate-pulse" />
                            <span className="w-2 h-2 rounded-full bg-[#2A9D8F] animate-pulse delay-75" />
                            <span className="w-2 h-2 rounded-full bg-[#2A9D8F] animate-pulse delay-150" />
                          </div>
                          <span className="font-mono text-[#D4AF37]">
                            Research job registered. Routing task to Celery vector worker...
                          </span>
                        </div>
                      )}

                      {item.status === "running" && (
                        <div className="p-4 rounded-xl bg-[#0B132B] border border-[#1C2541] text-[#F4F1EA] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#2A9D8F] animate-pulse" />
                              <span className="w-2 h-2 rounded-full bg-[#2A9D8F] animate-pulse delay-75" />
                              <span className="w-2 h-2 rounded-full bg-[#2A9D8F] animate-pulse delay-150" />
                            </div>
                            <span className="font-mono text-[#2A9D8F] font-semibold">
                              Scanning Qdrant vector space & synthesizing report...
                            </span>
                          </div>
                          <span className="font-mono text-[#D4AF37] font-bold">{activeTimerSeconds}s</span>
                        </div>
                      )}

                      {item.status === "failed" && (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900 text-xs">
                          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">Reasoning Job Failed</span>
                            <span className="text-rose-700 mt-0.5 block font-medium">
                              {item.jobResponse?.result?.answer || "The model was unable to process the query against current indices."}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Synthesized Answer */}
                      {hasAnswer && (
                        <div className="space-y-4">
                          <div className="text-sm text-[#0B132B] leading-relaxed whitespace-pre-wrap font-sans font-medium">
                            {result?.answer}
                          </div>

                          {/* Evidence & Verification Badges */}
                          <div className="pt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#2A9D8F]/10 border border-[#2A9D8F]/40 text-[#2A9D8F] text-xs font-bold">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#2A9D8F]" />
                              Verified Against Document Evidence
                            </span>
                            <span className="px-2.5 py-1 rounded-lg bg-[#FFFFFF] border border-[#DDD6C4] text-[#0B132B] text-xs font-mono font-semibold">
                              {citations.length} Cited Sources
                            </span>
                          </div>

                          {/* Citations Grid */}
                          {citations.length > 0 && (
                            <div className="space-y-2.5 pt-3 border-t border-[#DDD6C4]">
                              <div className="text-xs font-bold text-[#0B132B] flex items-center justify-between">
                                <span className="flex items-center gap-1.5 font-serif">
                                  <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
                                  Grounding Citations & References
                                </span>
                                <span className="text-[11px] text-[#8A95A5] font-mono">
                                  Qdrant Top-K Matches
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
                    </PremiumCard>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar Fixed At Bottom - Styled as Financial Analyst Terminal Input */}
        <div className="pt-4 border-t border-[#DDD6C4]">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-center rounded-2xl bg-[#0B132B] border border-[#1C2541] p-1.5 shadow-terminal focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20 transition-all duration-200">
              <div className="pl-3.5 text-[#2A9D8F]">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about revenue metrics, debt maturities, operating margins, or risk disclosures..."
                disabled={isSubmitting}
                className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm text-[#F4F1EA] placeholder-[#8A95A5] focus:outline-none disabled:opacity-50 font-medium"
              />
              <div className="pr-1">
                <TactileButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!question.trim() || isSubmitting}
                  isLoading={isSubmitting}
                  icon={<Send className="w-3.5 h-3.5" />}
                  className="rounded-xl px-4 py-2"
                  aria-label="Send research query"
                >
                  <span className="hidden sm:inline">Research</span>
                </TactileButton>
              </div>
            </div>
          </form>
          <div className="flex items-center justify-between text-[11px] text-[#8A95A5] px-2 pt-2 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2A9D8F]" />
              Fast Vector Retrieval • Qdrant cosine similarity
            </span>
            <span>Institutional Terminal • 30 queries/min</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
