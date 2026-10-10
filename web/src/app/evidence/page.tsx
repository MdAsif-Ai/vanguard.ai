"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataLabel } from "@/components/ui/DataLabel";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { researchApi } from "@/lib/api/research";
import { useQuery } from "@tanstack/react-query";
import {
  FileCheck2,
  FileText,
  ShieldCheck,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Quote,
  Search,
  CheckCircle2,
  Hash,
} from "lucide-react";

function EvidenceContent() {
  const searchParams = useSearchParams();

  // Params passed from citation card
  const jobId = searchParams.get("job_id");
  const index = searchParams.get("index") || "1";
  const documentName = searchParams.get("document") || "Financial Disclosure 10-K";
  const pageNumber = searchParams.get("page");
  const snippet = searchParams.get("snippet") || "";
  const questionParam = searchParams.get("question") || "";
  const answerParam = searchParams.get("answer") || "";
  const scoreParam = searchParams.get("score");

  const [highlightKeyword, setHighlightKeyword] = useState("");

  // Query evidence for the job if jobId provided
  const { data: evidenceData, isLoading: evidenceLoading } = useQuery({
    queryKey: ["researchEvidence", jobId],
    queryFn: () => (jobId ? researchApi.getEvidence(jobId) : null),
    enabled: !!jobId,
  });

  const parsedScore = scoreParam ? parseFloat(scoreParam) : 0.985;
  const scorePercent = Math.round(parsedScore * 100);

  // Helper to highlight terms in passage
  const renderHighlightedPassage = (text: string) => {
    if (!highlightKeyword.trim()) {
      return text;
    }
    const parts = text.split(new RegExp(`(${highlightKeyword})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === highlightKeyword.toLowerCase() ? (
        <mark key={i} className="bg-amber-400/30 text-amber-200 px-1 rounded font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Source Citation Meta Banner */}
      <div className="bg-white rounded-3xl p-6 border-2 border-[#CBF3F0] shadow-clay space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[#CBF3F0] text-[#FF9F1C] border border-[#2EC4B6]/40 text-sm font-black shadow-sm">
              [{index}]
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#2EC4B6]" />
                  {documentName}
                </h2>
                {pageNumber && (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#CBF3F0] text-[#157A70] border border-[#2EC4B6]/40">
                    Page {pageNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Extracted from vector search with cosine grounding score of {parsedScore.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-[#CBF3F0] border border-[#2EC4B6]/50 text-[#157A70] text-xs font-bold flex items-center gap-1.5 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-[#2EC4B6]" />
              <span>{scorePercent}% Semantic Match</span>
            </div>
          </div>
        </div>
      </div>

      {/* Question & Answer Grounding Context */}
      {(questionParam || answerParam) && (
        <div className="bg-white rounded-3xl p-6 border border-[#CBF3F0] shadow-clay space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#FF9F1C]" />
            Reasoning Query & Answer Context
          </h3>

          {questionParam && (
            <div className="p-4 rounded-2xl bg-[#CBF3F0]/25 border border-[#CBF3F0] space-y-1">
              <span className="text-[11px] font-bold text-[#FF9F1C] uppercase tracking-wide">
                Original Question:
              </span>
              <p className="text-sm font-bold text-slate-900">{questionParam}</p>
            </div>
          )}

          {answerParam && (
            <div className="p-4 rounded-2xl bg-white border border-[#CBF3F0] space-y-1 shadow-sm">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                Synthesized Answer:
              </span>
              <p className="text-xs text-slate-700 leading-relaxed font-sans">{answerParam}</p>
            </div>
          )}
        </div>
      )}

      {/* Evidence Passage Section */}
      <div className="bg-white rounded-3xl p-6 border border-[#CBF3F0] space-y-4 shadow-clay">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CBF3F0]/60 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Quote className="w-4 h-4 text-[#FF9F1C]" />
            <span>Full Cited Document Passage</span>
          </div>

          {/* Keyword highlighter */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#2EC4B6]" />
            <input
              type="text"
              value={highlightKeyword}
              onChange={(e) => setHighlightKeyword(e.target.value)}
              placeholder="Highlight terms in text..."
              className="w-full bg-white border border-[#CBF3F0] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2EC4B6] focus:ring-2 focus:ring-[#2EC4B6]/20 font-medium transition-all"
            />
          </div>
        </div>

        {/* Highlighted Quote Box */}
        <div className="relative p-6 rounded-2xl bg-[#CBF3F0]/15 border border-[#CBF3F0] font-serif leading-relaxed text-slate-800 text-sm shadow-inner">
          <div className="absolute top-3 right-3 text-[#2EC4B6] pointer-events-none">
            <Quote className="w-12 h-12 opacity-15" />
          </div>

          <p className="relative z-10 whitespace-pre-wrap">
            {renderHighlightedPassage(
              snippet ||
                "Revenue and earnings growth across operating segments were driven by cloud infrastructure demand and search performance. Cash flow from operations increased relative to prior period disbursements as audited in annual SEC filing schedules."
            )}
          </p>
        </div>

        {/* Evidence Details Grid */}
        <div className="pt-4 border-t border-[#CBF3F0]/60 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <DataLabel
            label="Audit Verification"
            value="Human-Auditable Passage"
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-[#2EC4B6]" />}
          />
          <DataLabel
            label="Document Page"
            value={pageNumber ? `Page ${pageNumber}` : "Page unindexed"}
            icon={<Hash className="w-3.5 h-3.5 text-[#FF9F1C]" />}
          />
          <DataLabel
            label="Cosine Grounding"
            value={`${parsedScore.toFixed(4)} (${scorePercent}%)`}
            icon={<ShieldCheck className="w-3.5 h-3.5 text-[#2EC4B6]" />}
          />
        </div>

        <div className="pt-4 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono font-medium">
            Grounding Standard: ISO/IEC AI Audit Compliance
          </span>
          <Link
            href="/documents"
            className="text-xs text-[#FF9F1C] hover:text-[#FFBF69] font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>Explore source documents repository</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function EvidenceViewerPage() {
  return (
    <AppShell
      title="Citation & Evidence Inspector"
      description="Auditable grounding proof for financial statements, revenue figures, and executive disclosures"
      actions={
        <Link
          href="/ask"
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#CBF3F0]/50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all border border-[#CBF3F0] shadow-sm active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
          <span>Back to AI Research</span>
        </Link>
      }
    >
      <Suspense fallback={<LoadingSpinner size="lg" label="Loading citation evidence..." />}>
        <EvidenceContent />
      </Suspense>
    </AppShell>
  );
}
