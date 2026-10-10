"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { healthApi } from "@/lib/api/health";
import {
  Server,
  Activity,
  Database,
  Radio,
  Zap,
  Lock,
  BarChart3,
  Users,
} from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { PremiumCard } from "@/components/ui/PremiumCard";

export default function AdminPage() {
  const { user } = useAuth();

  const { data: readiness } = useQuery({
    queryKey: ["adminReadiness"],
    queryFn: healthApi.getReadiness,
    refetchInterval: 10000,
  });

  const { data: metrics } = useQuery({
    queryKey: ["adminMetrics"],
    queryFn: healthApi.getMetrics,
    refetchInterval: 10000,
  });

  const isAdmin = user?.role === "admin";

  if (!isAdmin) {
    return (
      <AppShell title="Access Restricted">
        <div className="py-20 text-center max-w-md mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-[#0B132B]">Administrator Role Required</h2>
          <p className="text-xs text-[#8A95A5] leading-relaxed font-medium">
            Your current account role is{" "}
            <span className="font-mono text-[#D4AF37] font-bold">{user?.role || "viewer"}</span>.
            System telemetry and cluster management require administrative authorization.
          </p>
        </div>
      </AppShell>
    );
  }

  const checks: Record<string, string> = readiness?.checks || {};
  const businessEvents: Record<string, number> = metrics?.business_events || {};
  const statusCodes: Record<string, number> = metrics?.status_codes || {};

  return (
    <AppShell
      title="Platform Administration"
      description="Infrastructure health, request telemetry, cluster event logs, and operational controls"
    >
      <div className="space-y-6">
        {/* Core Infrastructure Health Grid */}
        <PremiumCard variant="paper" className="p-6 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-[#DDD6C4] pb-3">
            <h3 className="text-sm font-bold text-[#0B132B] flex items-center gap-2 font-serif">
              <Server className="w-4 h-4 text-[#D4AF37]" />
              Infrastructure Cluster Services
            </h3>
            <StatusBadge status={readiness?.status || "ready"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Postgres */}
            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DDD6C4] space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#2A9D8F]" />
                  <span className="text-xs font-bold text-[#0B132B]">PostgreSQL 17</span>
                </div>
                <StatusBadge status={checks.database === "ok" ? "ready" : "failed"} />
              </div>
              <p className="text-[11px] text-[#8A95A5] font-medium">
                Primary relational storage: metadata, documents, research jobs, user auth.
              </p>
            </div>

            {/* Redis */}
            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DDD6C4] space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-xs font-bold text-[#0B132B]">Redis Queue</span>
                </div>
                <StatusBadge status={checks.redis === "ok" ? "ready" : "failed"} />
              </div>
              <p className="text-[11px] text-[#8A95A5] font-medium">
                Celery task broker: document ingestion worker and background reasoning jobs.
              </p>
            </div>

            {/* Qdrant */}
            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DDD6C4] space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#2A9D8F]" />
                  <span className="text-xs font-bold text-[#0B132B]">Qdrant Vector DB</span>
                </div>
                <StatusBadge status={checks.qdrant === "ok" ? "ready" : "failed"} />
              </div>
              <p className="text-[11px] text-[#8A95A5] font-medium">
                Dense vector store: cosine similarity chunk embeddings and RAG retrieval.
              </p>
            </div>
          </div>
        </PremiumCard>

        {/* Business Events & Platform Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Events */}
          <PremiumCard variant="paper" className="p-6 space-y-4 shadow-card">
            <h3 className="text-sm font-bold text-[#0B132B] flex items-center gap-2 font-serif">
              <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
              Recorded Business Events
            </h3>
            <p className="text-xs text-[#8A95A5] font-medium">
              Audit events recorded in this platform instance
            </p>

            <div className="space-y-2.5 pt-2">
              {Object.keys(businessEvents).length === 0 ? (
                <div className="p-4 text-center text-xs text-[#8A95A5]">
                  No business events registered in current lifecycle.
                </div>
              ) : (
                Object.entries(businessEvents).map(([evt, count]) => (
                  <div
                    key={evt}
                    className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#DDD6C4] flex items-center justify-between text-xs shadow-xs hover:bg-[#EAE5D9]/30 transition-colors"
                  >
                    <span className="font-mono text-[#0B132B] font-semibold capitalize">
                      {evt.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono font-bold text-[#D4AF37] px-2.5 py-0.5 rounded-md bg-[#0B132B] border border-[#1C2541]">
                      {formatNumber(count)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </PremiumCard>

          {/* HTTP Status Code Distribution */}
          <PremiumCard variant="paper" className="p-6 space-y-4 shadow-card">
            <h3 className="text-sm font-bold text-[#0B132B] flex items-center gap-2 font-serif">
              <Activity className="w-4 h-4 text-[#2A9D8F]" />
              HTTP Request Traffic & Status Codes
            </h3>
            <p className="text-xs text-[#8A95A5] font-medium font-mono">
              Total HTTP invocations: {formatNumber(metrics?.total_requests ?? 0)}
            </p>

            <div className="space-y-2.5 pt-2">
              {Object.keys(statusCodes).length === 0 ? (
                <div className="p-4 text-center text-xs text-[#8A95A5]">
                  No status code telemetry recorded yet.
                </div>
              ) : (
                Object.entries(statusCodes).map(([code, count]) => {
                  const is2xx = code.startsWith("2");
                  const is4xx = code.startsWith("4");
                  const is5xx = code.startsWith("5");

                  return (
                    <div
                      key={code}
                      className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#DDD6C4] flex items-center justify-between text-xs shadow-xs hover:bg-[#EAE5D9]/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            is2xx
                              ? "bg-[#2A9D8F]"
                              : is4xx
                              ? "bg-[#D4AF37]"
                              : is5xx
                              ? "bg-rose-500"
                              : "bg-[#8A95A5]"
                          }`}
                        />
                        <span className="font-mono text-[#0B132B] font-bold">HTTP {code}</span>
                      </div>
                      <span className="font-mono text-[#0B132B] font-semibold">{formatNumber(count)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </PremiumCard>
        </div>

        {/* User Account Registry Overview */}
        <PremiumCard variant="paper" className="p-6 space-y-4 shadow-card">
          <div className="flex items-center justify-between border-b border-[#DDD6C4] pb-3">
            <h3 className="text-sm font-bold text-[#0B132B] flex items-center gap-2 font-serif">
              <Users className="w-4 h-4 text-[#D4AF37]" />
              Active Organization Administrator
            </h3>
            <span className="text-xs text-[#2A9D8F] font-mono font-bold bg-[#2A9D8F]/10 px-2 py-0.5 rounded-md border border-[#2A9D8F]/30">
              Org Scoped
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-[#FFFFFF] rounded-xl border border-[#DDD6C4]">
              <span className="text-[#8A95A5] text-[11px] font-bold uppercase tracking-wider block font-mono">
                Administrator Account
              </span>
              <span className="font-bold text-[#0B132B] block mt-1">{user?.email}</span>
            </div>
            <div className="p-4 bg-[#FFFFFF] rounded-xl border border-[#DDD6C4]">
              <span className="text-[#8A95A5] text-[11px] font-bold uppercase tracking-wider block font-mono">
                Organization ID
              </span>
              <span className="font-mono text-[#2A9D8F] text-[11px] font-bold block mt-1 truncate">
                {user?.organization_id}
              </span>
            </div>
            <div className="p-4 bg-[#FFFFFF] rounded-xl border border-[#DDD6C4]">
              <span className="text-[#8A95A5] text-[11px] font-bold uppercase tracking-wider block font-mono">
                Security Policy
              </span>
              <span className="font-mono text-[#0B132B] font-bold text-xs block mt-1">
                Stateless HS256 Bearer
              </span>
            </div>
          </div>
        </PremiumCard>
      </div>
    </AppShell>
  );
}
