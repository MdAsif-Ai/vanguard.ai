"use client";

import React from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useQuery } from "@tanstack/react-query";
import { healthApi } from "@/lib/api/health";
import { documentsApi } from "@/lib/api/documents";
import { formatDuration, formatNumber, formatDate } from "@/lib/utils";
import {
  Files,
  HelpCircle,
  Activity,
  Server,
  ArrowRight,
  Database,
  Radio,
  Zap,
  Clock,
  Sparkles,
  ShieldCheck,
  Upload,
} from "lucide-react";

export default function DashboardPage() {
  // Query health metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["healthMetrics"],
    queryFn: healthApi.getMetrics,
    refetchInterval: 10000,
  });

  // Query readiness checks
  const { data: readiness, isLoading: readinessLoading } = useQuery({
    queryKey: ["readiness"],
    queryFn: healthApi.getReadiness,
    refetchInterval: 10000,
  });

  // Query documents list
  const { data: documentsData, isLoading: docsLoading } = useQuery({
    queryKey: ["documentsList", 0, 5],
    queryFn: () => documentsApi.list(0, 5),
  });

  const totalDocuments = documentsData?.total ?? 0;
  const questionsAsked =
    metrics?.business_events?.question_asked ?? 0;
  const docsUploadedEvents =
    metrics?.business_events?.document_uploaded ?? totalDocuments;
  const totalRequests = metrics?.total_requests ?? 0;
  const uptimeSeconds = metrics?.uptime_seconds ?? 0;

  const isAllReady = readiness?.status === "ready";
  const checks: Record<string, string> = readiness?.checks || {};

  return (
    <AppShell
      title="Intelligence Command Center"
      description="Financial document repository, reasoning engine telemetry, and system health status"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/documents"
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#CBF3F0]/40 text-slate-800 border border-[#CBF3F0] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-[#2EC4B6]" />
            <span>Upload Document</span>
          </Link>
          <Link
            href="/ask"
            className="px-3.5 py-2 rounded-xl bg-[#FF9F1C] hover:bg-[#FFBF69] active:translate-y-0.5 text-white text-xs font-bold shadow-[0_4px_14px_rgba(255,159,28,0.35)] flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask Research AI</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* System Health Hero Banner */}
        <div className="bg-gradient-to-r from-white via-white to-[#CBF3F0]/50 rounded-2xl p-6 border border-[#CBF3F0] shadow-[8px_8px_24px_rgba(46,196,182,0.08),-4px_-4px_14px_rgba(255,255,255,0.95)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-xs ${
                  isAllReady
                    ? "bg-[#CBF3F0] text-[#0D6B63] border-[#2EC4B6]/50"
                    : "bg-[#FFF4E5] text-[#9A4C00] border-[#FFBF69]"
                }`}
              >
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {isAllReady ? "All Core Systems Operational" : "System Status Degraded"}
                  </h3>
                  <StatusBadge status={isAllReady ? "ready" : "degraded"} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sub-services PostgreSQL, Redis Task Queue, and Qdrant Vector Engine verified.
                </p>
              </div>
            </div>

            {/* Micro component pills */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#CBF3F0] font-mono text-slate-700 shadow-xs">
                <Database className="w-3.5 h-3.5 text-[#2EC4B6]" />
                <span>Postgres:</span>
                <span
                  className={checks.database === "ok" ? "text-[#0D6B63] font-bold" : "text-rose-600 font-bold"}
                >
                  {checks.database || "checking"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#CBF3F0] font-mono text-slate-700 shadow-xs">
                <Radio className="w-3.5 h-3.5 text-[#FF9F1C]" />
                <span>Redis:</span>
                <span
                  className={checks.redis === "ok" ? "text-[#0D6B63] font-bold" : "text-rose-600 font-bold"}
                >
                  {checks.redis || "checking"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#CBF3F0] font-mono text-slate-700 shadow-xs">
                <Zap className="w-3.5 h-3.5 text-[#2EC4B6]" />
                <span>Qdrant:</span>
                <span
                  className={checks.qdrant === "ok" ? "text-[#0D6B63] font-bold" : "text-rose-600 font-bold"}
                >
                  {checks.qdrant || "checking"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Documents"
            value={formatNumber(totalDocuments)}
            subtext={`${docsUploadedEvents} total upload events`}
            icon={Files}
            badge={<span className="text-xs text-[#FF9F1C] font-mono font-bold">10-K / 10-Q</span>}
          />
          <MetricCard
            title="Questions Researched"
            value={formatNumber(questionsAsked)}
            subtext="Grounded RAG answers"
            icon={HelpCircle}
            badge={<span className="text-xs text-[#2EC4B6] font-mono font-bold">Citations</span>}
          />
          <MetricCard
            title="Platform Uptime"
            value={formatDuration(uptimeSeconds)}
            subtext="Continuous operational runtime"
            icon={Clock}
            badge={<span className="text-xs text-[#0D6B63] font-mono font-bold">Service OK</span>}
          />
          <MetricCard
            title="Total API Invocations"
            value={formatNumber(totalRequests)}
            subtext="Rate quota limit: 30/min"
            icon={Server}
            badge={<span className="text-xs text-[#FF9F1C] font-mono font-bold">HTTP 200</span>}
          />
        </div>

        {/* Quick Launch & Recent Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Ingested Documents (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#CBF3F0] shadow-[8px_8px_24px_rgba(46,196,182,0.08),-4px_-4px_14px_rgba(255,255,255,0.95)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Files className="w-4 h-4 text-[#2EC4B6]" />
                  Recent Ingested Documents
                </h3>
                <p className="text-xs text-slate-500">
                  Financial disclosures parsed, chunked, and embedded into Qdrant
                </p>
              </div>
              <Link
                href="/documents"
                className="text-xs text-[#FF9F1C] hover:text-[#FFBF69] flex items-center gap-1 font-bold"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Document list or empty state */}
            {docsLoading ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Loading document registry...
              </div>
            ) : !documentsData?.items?.length ? (
              <div className="py-8 text-center border-2 border-dashed border-[#CBF3F0] bg-[#F4F9F8] rounded-2xl space-y-3">
                <Files className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-600 font-medium">No documents ingested in this organization yet.</p>
                <Link
                  href="/documents"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FF9F1C] text-white text-xs font-bold hover:bg-[#FFBF69] shadow-md"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload 10-K or PDF Report
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[#CBF3F0]/80">
                {documentsData.items.map((doc) => (
                  <div
                    key={doc.id}
                    className="py-3.5 flex items-center justify-between hover:bg-[#CBF3F0]/25 px-3 rounded-xl transition-colors group"
                  >
                    <div className="space-y-1 min-w-0 pr-4">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="text-xs font-bold text-slate-800 group-hover:text-[#FF9F1C] transition-colors truncate block"
                      >
                        {doc.name}
                      </Link>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        {doc.company && <span className="font-semibold text-slate-700">{doc.company}</span>}
                        {doc.document_type && (
                          <span className="px-1.5 py-0.5 rounded-md bg-[#CBF3F0]/60 text-[#134E4A] border border-[#2EC4B6]/30 font-semibold font-mono">
                            {doc.document_type}
                          </span>
                        )}
                        {doc.fiscal_year && <span className="font-mono">FY {doc.fiscal_year}</span>}
                        <span>•</span>
                        <span>{formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right hidden sm:block text-[11px] font-mono text-slate-500 font-medium">
                        {doc.chunk_count ? `${doc.chunk_count} chunks` : "—"}
                      </div>
                      <StatusBadge status={doc.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick AI Research & Intelligence Actions */}
          <div className="bg-white rounded-2xl p-6 border border-[#CBF3F0] shadow-[8px_8px_24px_rgba(46,196,182,0.08),-4px_-4px_14px_rgba(255,255,255,0.95)] space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FF9F1C]" />
                  Reasoning Capabilities
                </h3>
                <p className="text-xs text-slate-500">
                  Instant evidence-grounded financial Q&A and formula verification
                </p>
              </div>

              <div className="space-y-2.5">
                <Link
                  href="/ask"
                  className="block p-3.5 rounded-xl bg-[#F8FCFB] border border-[#CBF3F0] hover:border-[#2EC4B6]/60 hover:bg-[#CBF3F0]/30 hover:shadow-xs transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-[#FF9F1C]">
                    <span>Ask Financial AI</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Query revenue, operating margins, EBITDA, and disclosures with citation links.
                  </p>
                </Link>

                <Link
                  href="/analysis"
                  className="block p-3.5 rounded-xl bg-[#F8FCFB] border border-[#CBF3F0] hover:border-[#2EC4B6]/60 hover:bg-[#CBF3F0]/30 hover:shadow-xs transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-[#FF9F1C]">
                    <span>Deterministic Financial Calculator</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Calculate CAGR, growth rates, ratios, and margins backed by Python code (not LLM arithmetic).
                  </p>
                </Link>

                <Link
                  href="/evidence"
                  className="block p-3.5 rounded-xl bg-[#F8FCFB] border border-[#CBF3F0] hover:border-[#2EC4B6]/60 hover:bg-[#CBF3F0]/30 hover:shadow-xs transition-all group"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800 group-hover:text-[#FF9F1C]">
                    <span>Citation & Evidence Inspector</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Trace exact document passages, page numbers, and semantic similarity scores.
                  </p>
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t border-[#CBF3F0] text-[11px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2EC4B6]" />
                Auditable & Verifiable
              </span>
              <span className="font-mono text-slate-500 font-semibold">v0.1.0-prod</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
