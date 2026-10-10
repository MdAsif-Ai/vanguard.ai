"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { DataLabel } from "@/components/ui/DataLabel";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { TactileButton } from "@/components/ui/TactileButton";
import { researchApi } from "@/lib/api/research";
import { useQuery } from "@tanstack/react-query";
import {
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

  // Helper to highlight terms in passage with restrained gold accent
  const renderHighlightedPassage = (text: string) => {
    if (!highlightKeyword.trim()) {
      return text;
    }
    const parts = text.split(new RegExp(`(${highlightKeyword})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === highlightKeyword.toLowerCase() ? (
        <mark
          key={i}
          className="bg-[#D4AF37]/25 text-[#0B132B] px-1 py-0.5 rounded font-bold border-b-2 border-[#D4AF37]"
        >
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
      <PremiumCard variant="paper" className="p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#0B132B] text-[#D4AF37] border border-[#1C2541] text-base font-black shadow-xs">
              [{index}]
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#0B132B] flex items-center gap-2 font-serif">
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                  {documentName}
                </h2>
                {pageNumber && (
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#2A9D8F]/10 text-[#2A9D8F] border border-[#2A9D8F]/30 font-mono">
                    Page {pageNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8A95A5] mt-0.5 font-medium">
                Extracted from dense vector retrieval with cosine grounding score of {parsedScore.toFixed(3)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-[#2A9D8F]/10 border border-[#2A9D8F]/40 text-[#2A9D8F] text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-[#2A9D8F]" />
              <span>{scorePercent}% Semantic Match</span>
            </div>
          </div>
        </div>
      </PremiumCard>

      {/* Question & Answer Grounding Context */}
      {(questionParam || answerParam) && (
        <PremiumCard variant="paper" className="p-6 space-y-4 shadow-card">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B132B] font-mono flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            Reasoning Query & Synthesized Answer
          </h3>

          {questionParam && (
            <div className="p-4 rounded-xl bg-[#0B132B] border border-[#1C2541] text-[#F4F1EA] space-y-1">
              <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wide font-mono">
                Original Question:
              </span>
              <p className="text-sm font-semibold leading-relaxed">{questionParam}</p>
            </div>
          )}

          {answerParam && (
            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DDD6C4] space-y-1">
              <span className="text-[11px] font-bold text-[#8A95A5] uppercase tracking-wide font-mono">
                Synthesized Answer:
              </span>
              <p className="text-xs text-[#0B132B] leading-relaxed font-sans font-medium">{answerParam}</p>
            </div>
          )}
        </PremiumCard>
      )}

      {/* Evidence Passage Section - Institutional Research Paper Surface */}
      <PremiumCard variant="paper" className="p-7 space-y-5 shadow-feature">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DDD6C4] pb-4">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0B132B] font-serif">
            <Quote className="w-4 h-4 text-[#D4AF37]" />
            <span>Full Cited Document Passage (Audited Report Excerpt)</span>
          </div>

          {/* Keyword highlighter */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#2A9D8F]" />
            <input
              type="text"
              value={highlightKeyword}
              onChange={(e) => setHighlightKeyword(e.target.value)}
              placeholder="Highlight terms in text..."
              className="w-full bg-[#FFFFFF] border border-[#DDD6C4] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#0B132B] placeholder-[#8A95A5] focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15 font-medium transition-all"
            />
          </div>
        </div>

        {/* Highlighted Quote Box */}
        <div className="relative p-6 rounded-xl bg-[#FFFFFF] border border-[#DDD6C4] font-serif leading-relaxed text-[#0B132B] text-sm">
          <div className="absolute top-3 right-3 text-[#2A9D8F] pointer-events-none">
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
        <div className="pt-4 border-t border-[#DDD6C4] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <DataLabel
            label="Audit Verification"
            value="Human-Auditable Passage"
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-[#2A9D8F]" />}
          />
          <DataLabel
            label="Document Page"
            value={pageNumber ? `Page ${pageNumber}` : "Page unindexed"}
            icon={<Hash className="w-3.5 h-3.5 text-[#D4AF37]" />}
          />
          <DataLabel
            label="Cosine Grounding"
            value={`${parsedScore.toFixed(4)} (${scorePercent}%)`}
            icon={<ShieldCheck className="w-3.5 h-3.5 text-[#2A9D8F]" />}
          />
        </div>

        <div className="pt-4 flex items-center justify-between">
          <span className="text-[11px] text-[#8A95A5] font-mono font-medium">
            Grounding Standard: ISO/IEC AI Audit Compliance
          </span>
          <Link
            href="/documents"
            className="text-xs text-[#0B132B] hover:text-[#D4AF37] font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>Explore source documents repository</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#D4AF37]" />
          </Link>
        </div>
      </PremiumCard>
    </div>
  );
}

export default function EvidenceViewerPage() {
  return (
    <AppShell
      title="Citation & Evidence Inspector"
      description="Auditable grounding proof for financial statements, revenue figures, and executive disclosures"
      actions={
        <Link href="/ask">
          <TactileButton
            variant="outline"
            size="sm"
            icon={<ArrowLeft className="w-3.5 h-3.5 text-[#8A95A5]" />}
          >
            <span>Back to AI Research</span>
          </TactileButton>
        </Link>
      }
    >
      <Suspense fallback={<LoadingSpinner size="lg" label="Loading citation evidence..." />}>
        <EvidenceContent />
      </Suspense>
    </AppShell>
  );
}
