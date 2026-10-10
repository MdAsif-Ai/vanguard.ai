"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { TactileButton } from "@/components/ui/TactileButton";
import { DocumentCard } from "@/components/ui/DocumentCard";
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
  Cpu,
  FileText,
  Search,
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
    queryKey: ["documentsList", 0, 6],
    queryFn: () => documentsApi.list(0, 6),
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
      title="Financial Intelligence Command Center"
      description="SEC filing repository, vector space search telemetry, and verified reasoning engine status"
      actions={
        <div className="flex items-center gap-2.5">
          <Link href="/documents">
            <TactileButton
              variant="outline"
              size="sm"
              icon={<Upload className="w-3.5 h-3.5 text-[#2A9D8F]" />}
            >
              <span>Upload Filing</span>
            </TactileButton>
          </Link>
          <Link href="/ask">
            <TactileButton
              variant="primary"
              size="sm"
              icon={<Sparkles className="w-3.5 h-3.5" />}
            >
              <span>Ask Research AI</span>
            </TactileButton>
          </Link>
        </div>
      }
    >
      <div className="space-y-7 animate-reveal">
        {/* Workstation Command Hero Panel with Visual Asset Integration */}
        <div className="relative rounded-3xl bg-[#0B132B] border border-[#1C2541] shadow-terminal overflow-hidden text-[#F4F1EA]">
          {/* Visual Asset Background Banner with Gradient Mask */}
          <div className="absolute inset-0 z-0 opacity-25 mix-blend-screen pointer-events-none">
            <Image
              src="/assets/vanguard_terminal_hero.jpg"
              alt="Vanguard Financial Terminal AI Visual"
              fill
              className="object-cover object-right"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B132B] via-[#0B132B]/85 to-transparent" />
          </div>

          <div className="relative z-10 p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4 max-w-2xl">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-lg flex-shrink-0 transition-transform hover:scale-105 ${
                  isAllReady
                    ? "bg-[#1C2541] text-[#2A9D8F] border-[#2A9D8F]/50"
                    : "bg-[#1C2541] text-[#D4AF37] border-[#D4AF37]"
                }`}
              >
                <Activity className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-[#F4F1EA] tracking-tight">
                    {isAllReady ? "Financial Intelligence Cluster Operational" : "Telemetry Degraded"}
                  </h3>
                  <StatusBadge status={isAllReady ? "ready" : "degraded"} />
                </div>
                <p className="text-xs text-[#A7B3C6] font-medium leading-relaxed">
                  Deterministic reasoning engine online. Vector embeddings indexed via Qdrant dense similarity with 100% auditable SEC page citations.
                </p>
              </div>
            </div>

            {/* Micro Cluster Status Instruments */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1C2541] border border-white/10 shadow-xs">
                <Database className="w-3.5 h-3.5 text-[#2A9D8F]" />
                <span className="text-[#A7B3C6]">PGSQL:</span>
                <span className={checks.database === "ok" ? "text-[#2A9D8F] font-bold" : "text-rose-400 font-bold"}>
                  {checks.database ? checks.database.toUpperCase() : "OK"}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1C2541] border border-white/10 shadow-xs">
                <Radio className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="text-[#A7B3C6]">REDIS:</span>
                <span className={checks.redis === "ok" ? "text-[#2A9D8F] font-bold" : "text-rose-400 font-bold"}>
                  {checks.redis ? checks.redis.toUpperCase() : "OK"}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#1C2541] border border-white/10 shadow-xs">
                <Zap className="w-3.5 h-3.5 text-[#2A9D8F]" />
                <span className="text-[#A7B3C6]">QDRANT:</span>
                <span className={checks.qdrant === "ok" ? "text-[#2A9D8F] font-bold" : "text-rose-400 font-bold"}>
                  {checks.qdrant ? checks.qdrant.toUpperCase() : "OK"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Metrics Instruments Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Ingested Filings"
            value={formatNumber(totalDocuments)}
            subtext={`${docsUploadedEvents} total upload events`}
            icon={Files}
            badge={<span className="text-xs text-[#D4AF37] font-mono font-bold">10-K / 10-Q</span>}
          />
          <MetricCard
            title="Questions Researched"
            value={formatNumber(questionsAsked)}
            subtext="Grounded RAG answers"
            icon={HelpCircle}
            badge={<span className="text-xs text-[#2A9D8F] font-mono font-bold">Grounded</span>}
          />
          <MetricCard
            title="Platform Uptime"
            value={formatDuration(uptimeSeconds)}
            subtext="Continuous operational runtime"
            icon={Clock}
            badge={<span className="text-xs text-[#2A9D8F] font-mono font-bold">Online</span>}
          />
          <MetricCard
            title="Total API Invocations"
            value={formatNumber(totalRequests)}
            subtext="Rate quota: 30 queries / min"
            icon={Server}
            badge={<span className="text-xs text-[#D4AF37] font-mono font-bold">HTTP 200</span>}
          />
        </div>

        {/* Recent Institutional Documents & Reasoning Workstation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Ingested Documents (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#0B132B] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                  Recent Institutional Filings
                </h3>
                <p className="text-xs text-[#5A677D] font-medium">
                  Financial disclosures parsed, chunked, and embedded into Qdrant vector space
                </p>
              </div>
              <Link
                href="/documents"
                className="text-xs text-[#0B132B] hover:text-[#D4AF37] flex items-center gap-1 font-bold group transition-colors"
              >
                <span>View Repository</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#D4AF37]" />
              </Link>
            </div>

            {/* Document Cards Grid */}
            {docsLoading ? (
              <div className="py-12 text-center text-xs text-[#5A677D] font-mono">
                Loading document registry...
              </div>
            ) : !documentsData?.items?.length ? (
              <PremiumCard variant="level-1" className="py-12 text-center space-y-3">
                <Files className="w-10 h-10 text-[#A7B3C6] mx-auto" />
                <p className="text-xs text-[#0B132B] font-semibold">No documents ingested in this organization yet.</p>
                <Link href="/documents">
                  <TactileButton variant="primary" size="sm" icon={<Upload className="w-3.5 h-3.5" />}>
                    Upload 10-K or PDF Report
                  </TactileButton>
                </Link>
              </PremiumCard>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documentsData.items.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            )}
          </div>

          {/* Quick AI Research & Intelligence Actions Panel */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-[#0B132B] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2A9D8F]" />
                Reasoning Capabilities
              </h3>
              <p className="text-xs text-[#5A677D] font-medium">
                Auditable financial research modules
              </p>
            </div>

            <PremiumCard variant="level-2" className="space-y-3.5 p-5">
              <Link
                href="/ask"
                className="block p-3.5 rounded-xl bg-[#F4F1EA] border border-[#E2DCD0] hover:border-[#D4AF37] hover:bg-white shadow-2xs hover:shadow-card transition-all duration-200 group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#0B132B] group-hover:text-[#D4AF37]">
                  <span className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-[#2A9D8F]" />
                    Ask Financial AI
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#2A9D8F]" />
                </div>
                <p className="text-[11px] text-[#5A677D] mt-1 leading-relaxed">
                  Query revenue, operational risks, capital expenditure, and debt obligations with grounded citations.
                </p>
              </Link>

              <Link
                href="/analysis"
                className="block p-3.5 rounded-xl bg-[#F4F1EA] border border-[#E2DCD0] hover:border-[#D4AF37] hover:bg-white shadow-2xs hover:shadow-card transition-all duration-200 group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#0B132B] group-hover:text-[#D4AF37]">
                  <span className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-[#D4AF37]" />
                    Deterministic Calculator
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#D4AF37]" />
                </div>
                <p className="text-[11px] text-[#5A677D] mt-1 leading-relaxed">
                  Calculate operating margins, CAGR, and growth rates backed by Python (zero LLM hallucinations).
                </p>
              </Link>

              <Link
                href="/evidence"
                className="block p-3.5 rounded-xl bg-[#F4F1EA] border border-[#E2DCD0] hover:border-[#D4AF37] hover:bg-white shadow-2xs hover:shadow-card transition-all duration-200 group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#0B132B] group-hover:text-[#D4AF37]">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2A9D8F]" />
                    Citation & Evidence Inspector
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#2A9D8F]" />
                </div>
                <p className="text-[11px] text-[#5A677D] mt-1 leading-relaxed">
                  Trace extracted document passages, exact page numbers, and cosine similarity grounding metrics.
                </p>
              </Link>

              <div className="pt-3 border-t border-[#E2DCD0] text-[11px] text-[#5A677D] flex items-center justify-between font-mono font-medium">
                <span className="flex items-center gap-1.5 text-[#2A9D8F] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2A9D8F]" />
                  ISO/IEC Auditable
                </span>
                <span>SEC Grounded</span>
              </div>
            </PremiumCard>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
