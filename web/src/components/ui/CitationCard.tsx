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
        "bg-white rounded-2xl p-4.5 border border-[#CBF3F0] shadow-[6px_6px_18px_rgba(46,196,182,0.08),-3px_-3px_10px_rgba(255,255,255,0.95)] hover:shadow-[10px_10px_24px_rgba(46,196,182,0.14),-4px_-4px_14px_rgba(255,255,255,1)] hover:border-[#2EC4B6]/60 hover:-translate-y-0.5 transition-all duration-200 space-y-3 relative group",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-[#FFF3E0] text-[#FF9F1C] border border-[#FFBF69] text-xs font-bold shadow-xs">
            [{citation.index}]
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-semibold truncate max-w-[200px] sm:max-w-[280px]">
            <FileText className="w-3.5 h-3.5 text-[#2EC4B6] flex-shrink-0" />
            <span className="truncate">{citation.document_name || "Document"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {citation.page !== undefined && citation.page !== null && (
            <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-[#CBF3F0] text-[#0D6B63] border border-[#2EC4B6]/40 shadow-xs">
              Page {citation.page}
            </span>
          )}

          {scorePercent !== null && (
            <span
              className={cn(
                "px-2.5 py-0.5 rounded-lg text-[11px] font-bold border flex items-center gap-1 shadow-xs",
                scorePercent >= 90
                  ? "bg-[#CBF3F0] text-[#0D6B63] border-[#2EC4B6]/50"
                  : "bg-[#FFF4E5] text-[#9A4C00] border-[#FFBF69]"
              )}
            >
              <ShieldCheck className="w-3 h-3 text-[#2EC4B6]" />
              {scorePercent}%
            </span>
          )}
        </div>
      </div>

      {/* Snippet (clamped to 2 lines) */}
      <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed bg-[#F4F9F8] p-3 rounded-xl border border-[#CBF3F0] font-serif italic shadow-inner">
        &ldquo;{citation.text_snippet}&rdquo;
      </p>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-slate-500 font-medium">
          Source Verification Grounding
        </span>
        {onViewEvidence ? (
          <button
            type="button"
            onClick={() => onViewEvidence(citation)}
            className="text-xs text-[#2EC4B6] hover:text-[#0D6B63] flex items-center gap-1 font-semibold hover:underline transition-colors"
          >
            <span>View Full Evidence</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        ) : (
          <Link
            href={evidenceHref}
            className="text-xs text-[#2EC4B6] hover:text-[#0D6B63] flex items-center gap-1 font-semibold hover:underline transition-colors"
          >
            <span>View Full Evidence</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
