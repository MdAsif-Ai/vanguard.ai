"use client";

import React from "react";
import Link from "next/link";
import { DocumentResponse } from "@/types";
import { StatusBadge } from "./StatusBadge";
import {
  FileText,
  Building,
  Calendar,
  Layers,
  ExternalLink,
  RefreshCw,
  Trash2,
  Sparkles,
} from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

interface DocumentCardProps {
  document: DocumentResponse;
  onReindex?: (id: string) => void;
  onDelete?: (doc: DocumentResponse) => void;
  isReindexing?: boolean;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document: doc,
  onReindex,
  onDelete,
  isReindexing = false,
}) => {
  const isReady = doc.status === "ready";

  return (
    <div className="group relative rounded-2xl bg-white border border-[#E2DCD0] p-5 shadow-card hover:shadow-card-hover card-3d hover:border-[#D4AF37] transition-all duration-200 flex flex-col justify-between overflow-hidden select-none">
      {/* Top Physical Binding Strip Indicator */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 transition-colors ${
          isReady
            ? "bg-[#2A9D8F]"
            : doc.status === "failed"
            ? "bg-rose-500"
            : "bg-[#D4AF37]"
        }`}
      />

      <div className="space-y-3.5">
        {/* Header: Type Badge & Status */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-md bg-[#0B132B] text-[#D4AF37] text-[10px] font-mono font-bold border border-[#1C2541]">
              {doc.document_type || "REPORT"}
            </span>
            {doc.fiscal_year && (
              <span className="px-2 py-0.5 rounded-md bg-[#EAE5D9] text-[#0B132B] text-[10px] font-mono font-bold border border-[#DDD6C4]">
                FY{doc.fiscal_year}
              </span>
            )}
          </div>
          <StatusBadge status={doc.status} />
        </div>

        {/* Title & Issuer */}
        <div className="space-y-1">
          <Link
            href={`/documents/${doc.id}`}
            className="group-hover:text-[#D4AF37] transition-colors block"
          >
            <h3 className="text-sm font-bold text-[#0B132B] line-clamp-1 leading-snug">
              {doc.name}
            </h3>
          </Link>
          <div className="flex items-center gap-2 text-xs text-[#5A677D] font-medium">
            {doc.company ? (
              <span className="flex items-center gap-1 text-[#0B132B] font-semibold truncate max-w-[180px]">
                <Building className="w-3.5 h-3.5 text-[#2A9D8F] flex-shrink-0" />
                {doc.company}
              </span>
            ) : (
              <span className="text-[#8A95A5]">Institutional Filing</span>
            )}
          </div>
        </div>

        {/* Physical Audit Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E2DCD0]">
          <div className="p-2 rounded-xl bg-[#F4F1EA] border border-[#E2DCD0] text-center">
            <span className="text-[10px] text-[#5A677D] uppercase font-mono font-bold block">
              Chunks
            </span>
            <span className="text-xs font-bold text-[#0B132B] font-mono">
              {doc.chunk_count ?? 0}
            </span>
          </div>

          <div className="p-2 rounded-xl bg-[#F4F1EA] border border-[#E2DCD0] text-center">
            <span className="text-[10px] text-[#5A677D] uppercase font-mono font-bold block">
              Pages
            </span>
            <span className="text-xs font-bold text-[#0B132B] font-mono">
              {doc.page_count ?? 0}
            </span>
          </div>
        </div>

        {doc.error && (
          <div className="text-[10px] text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 line-clamp-2 font-mono">
            {doc.error}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="pt-3.5 mt-3 border-t border-[#E2DCD0] flex items-center justify-between text-xs">
        <span className="text-[10px] text-[#8A95A5] font-mono">
          {doc.file_size ? formatBytes(doc.file_size) : formatDate(doc.created_at)}
        </span>

        <div className="flex items-center gap-1">
          {isReady && (
            <Link
              href={`/ask`}
              className="p-1.5 rounded-lg bg-[#2A9D8F]/15 text-[#2A9D8F] hover:bg-[#2A9D8F] hover:text-white transition-colors"
              title="Query with AI Research Engine"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </Link>
          )}

          <Link
            href={`/documents/${doc.id}`}
            className="p-1.5 rounded-lg hover:bg-[#EAE5D9] text-[#5A677D] hover:text-[#0B132B] transition-colors"
            title="Inspect Chunks & Specs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {onReindex && (
            <button
              type="button"
              onClick={() => onReindex(doc.id)}
              disabled={isReindexing || doc.status === "processing"}
              className="p-1.5 rounded-lg hover:bg-[#EAE5D9] text-[#5A677D] hover:text-[#D4AF37] transition-colors disabled:opacity-40 cursor-pointer"
              title="Re-run parsing and chunk indexing"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isReindexing ? "animate-spin text-[#D4AF37]" : ""}`}
              />
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(doc)}
              className="p-1.5 rounded-lg hover:bg-rose-100 text-[#8A95A5] hover:text-rose-600 transition-colors cursor-pointer"
              title="Delete Document"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
