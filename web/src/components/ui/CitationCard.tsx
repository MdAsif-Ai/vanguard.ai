import React from "react";
import Link from "next/link";
import { Citation } from "@/types";
import { FileText, ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface CitationCardProps {
  citation: Citation;
  question?: string;
  answer?: string;
  jobId?: string;
  onViewEvidence?: (citation: Citation) => void;
  className?: string;
}

export function CitationCard({
  citation,
  question,
  answer,
  jobId,
  onViewEvidence,
  className,
}: CitationCardProps) {
  const scorePercent =
    citation.relevance_score !== null && citation.relevance_score !== undefined
      ? Math.round(citation.relevance_score * 100)
      : null;

  // Build query link to evidence viewer
  const evidenceQueryParams = new URLSearchParams();
  if (jobId) evidenceQueryParams.set("job_id", jobId);
  if (citation.index) evidenceQueryParams.set("index", citation.index.toString());
  if (citation.document_name) evidenceQueryParams.set("document", citation.document_name);
  if (citation.page) evidenceQueryParams.set("page", citation.page.toString());
  if (citation.text_snippet) evidenceQueryParams.set("snippet", citation.text_snippet);
  if (question) evidenceQueryParams.set("question", question);
  if (answer) evidenceQueryParams.set("answer", answer);
  if (citation.relevance_score) evidenceQueryParams.set("score", citation.relevance_score.toString());

  const evidenceHref = `/evidence?${evidenceQueryParams.toString()}`;

  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-4.5 border border-[#E2DCD0] shadow-card hover:shadow-card-hover",
        "card-3d hover:border-[#2A9D8F] transition-all duration-200 space-y-3 relative group select-none",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#0B132B] text-[#D4AF37] border border-[#1C2541] text-xs font-mono font-bold shadow-xs">
            [{citation.index}]
          </span>
          <div className="flex items-center gap-1.5 text-xs text-[#0B132B] font-bold truncate max-w-[200px] sm:max-w-[280px]">
            <FileText className="w-3.5 h-3.5 text-[#2A9D8F] flex-shrink-0" />
            <span className="truncate">{citation.document_name || "Document"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {citation.page !== undefined && citation.page !== null && (
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold font-mono bg-[#EAE5D9] text-[#0B132B] border border-[#DDD6C4]">
              Page {citation.page}
            </span>
          )}

          {scorePercent !== null && (
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono border flex items-center gap-1 shadow-xs",
                scorePercent >= 90
                  ? "bg-[#2A9D8F]/15 text-[#2A9D8F] border-[#2A9D8F]/40"
                  : "bg-[#D4AF37]/15 text-[#8F721B] border-[#D4AF37]/40"
              )}
            >
              <ShieldCheck className="w-3 h-3 text-[#2A9D8F]" />
              {scorePercent}%
            </span>
          )}
        </div>
      </div>

      {/* Snippet (clamped to 2 lines) on warm ivory paper */}
      <p className="text-xs text-[#1C2541] line-clamp-2 leading-relaxed bg-[#F4F1EA] p-3 rounded-xl border border-[#E2DCD0] font-serif italic">
        &ldquo;{citation.text_snippet}&rdquo;
      </p>

      <div className="flex items-center justify-between pt-1 text-xs">
        <span className="text-[11px] text-[#5A677D] font-mono">
          Grounding Verification
        </span>
        {onViewEvidence ? (
          <button
            type="button"
            onClick={() => onViewEvidence(citation)}
            className="text-[#2A9D8F] hover:text-[#217D72] flex items-center gap-1 font-bold hover:underline transition-colors cursor-pointer"
          >
            <span>View Full Evidence</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        ) : (
          <Link
            href={evidenceHref}
            className="text-[#2A9D8F] hover:text-[#217D72] flex items-center gap-1 font-bold hover:underline transition-colors"
          >
            <span>View Full Evidence</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
