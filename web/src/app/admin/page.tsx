"use client";

import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { MetricCard } from "@/components/ui/MetricCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { healthApi } from "@/lib/api/health";
import {
  Shield,
  Server,
  Activity,
  Database,
  Radio,
  Zap,
  Lock,
  Clock,
  Layers,
  AlertTriangle,
  BarChart3,
  Users,
} from "lucide-react";
import { formatDuration, formatNumber } from "@/lib/utils";

export default function AdminPage() {
  const { user } = useAuth();

  const { data: readiness, isLoading: readinessLoading } = useQuery({
    queryKey: ["adminReadiness"],
    queryFn: healthApi.getReadiness,
    refetchInterval: 10000,
  });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
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
          <h2 className="text-base font-bold text-slate-900">Administrator Role Required</h2>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Your current account role is{" "}
            <span className="font-mono text-[#FF9F1C] font-bold">{user?.role || "viewer"}</span>.
            System telemetry and cluster management require administrative authorization.
          </p>
        </div>
      </AppShell>
    );
  }

  const checks: Record<string, string> = readiness?.checks || {};
  const businessEvents: Record<string, number> = metrics?.business_events || {};
  const statusCodes: Record<string, number> = metrics?.status_codes || {};
  const endpoints: Record<string, number> = metrics?.requests_by_endpoint || {};

  return (
    <AppShell
      title="Platform Administration"
      description="Infrastructure health, request telemetry, cluster event logs, and operational controls"
    >
      <div className="space-y-6">
        {/* Core Infrastructure Health Grid */}
        <div className="bg-white rounded-3xl p-6 border border-[#CBF3F0] shadow-clay space-y-4">
          <div className="flex items-center justify-between border-b border-[#CBF3F0]/60 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Server className="w-4 h-4 text-[#FF9F1C]" />
              Infrastructure Cluster Services
            </h3>
            <StatusBadge status={readiness?.status || "ready"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Postgres */}
            <div className="p-4 rounded-2xl bg-white border border-[#CBF3F0] hover:border-[#2EC4B6] shadow-sm hover:shadow-clay space-y-2 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#2EC4B6]" />
                  <span className="text-xs font-bold text-slate-800">PostgreSQL 17</span>
                </div>
                <StatusBadge status={checks.database === "ok" ? "ready" : "failed"} />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Primary relational storage: metadata, documents, research jobs, user auth.
              </p>
            </div>

            {/* Redis */}
            <div className="p-4 rounded-2xl bg-white border border-[#CBF3F0] hover:border-[#2EC4B6] shadow-sm hover:shadow-clay space-y-2 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-[#FF9F1C]" />
                  <span className="text-xs font-bold text-slate-800">Redis Queue</span>
                </div>
                <StatusBadge status={checks.redis === "ok" ? "ready" : "failed"} />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Celery task broker: document ingestion worker and background reasoning jobs.
              </p>
            </div>

            {/* Qdrant */}
            <div className="p-4 rounded-2xl bg-white border border-[#CBF3F0] hover:border-[#2EC4B6] shadow-sm hover:shadow-clay space-y-2 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#2EC4B6]" />
                  <span className="text-xs font-bold text-slate-800">Qdrant Vector DB</span>
                </div>
                <StatusBadge status={checks.qdrant === "ok" ? "ready" : "failed"} />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Dense vector store: cosine similarity chunk embeddings and RAG retrieval.
              </p>
            </div>
          </div>
        </div>

        {/* Business Events & Platform Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Events */}
          <div className="bg-white rounded-3xl p-6 border border-[#CBF3F0] shadow-clay space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#FF9F1C]" />
              Recorded Business Events
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Audit events recorded in this platform instance
            </p>

            <div className="space-y-2.5 pt-2">
              {Object.keys(businessEvents).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No business events registered in current lifecycle.
                </div>
              ) : (
                Object.entries(businessEvents).map(([evt, count]) => (
                  <div
                    key={evt}
                    className="p-3.5 rounded-xl bg-white border border-[#CBF3F0] flex items-center justify-between text-xs shadow-sm hover:bg-[#CBF3F0]/20 transition-colors"
                  >
                    <span className="font-mono text-slate-700 font-semibold capitalize">
                      {evt.replace(/_/g, " ")}
                    </span>
                    <span className="font-mono font-bold text-[#FF9F1C] px-2.5 py-0.5 rounded-lg bg-[#CBF3F0] border border-[#2EC4B6]/40">
                      {formatNumber(count)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* HTTP Status Code Distribution */}
          <div className="bg-white rounded-3xl p-6 border border-[#CBF3F0] shadow-clay space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#2EC4B6]" />
              HTTP Request Traffic & Status Codes
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Total HTTP invocations: {formatNumber(metrics?.total_requests ?? 0)}
            </p>

            <div className="space-y-2.5 pt-2">
              {Object.keys(statusCodes).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
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
                      className="p-3.5 rounded-xl bg-white border border-[#CBF3F0] flex items-center justify-between text-xs shadow-sm hover:bg-[#CBF3F0]/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            is2xx
                              ? "bg-[#2EC4B6]"
                              : is4xx
                              ? "bg-[#FF9F1C]"
                              : is5xx
                              ? "bg-rose-500"
                              : "bg-slate-400"
                          }`}
                        />
                        <span className="font-mono text-slate-800 font-bold">HTTP {code}</span>
                      </div>
                      <span className="font-mono text-slate-600 font-semibold">{formatNumber(count)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* User Account Registry Overview */}
        <div className="bg-white rounded-3xl p-6 border border-[#CBF3F0] shadow-clay space-y-4">
          <div className="flex items-center justify-between border-b border-[#CBF3F0]/60 pb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#FF9F1C]" />
              Active Organization Administrator
            </h3>
            <span className="text-xs text-slate-400 font-mono font-medium">Org Scoped</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-[#CBF3F0]/20 rounded-2xl border border-[#CBF3F0]">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Administrator Account</span>
              <span className="font-bold text-slate-800 block mt-1">{user?.email}</span>
            </div>
            <div className="p-4 bg-[#CBF3F0]/20 rounded-2xl border border-[#CBF3F0]">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Organization ID</span>
              <span className="font-mono text-[#157A70] text-[11px] font-bold block mt-1 truncate">
                {user?.organization_id}
              </span>
            </div>
            <div className="p-4 bg-[#CBF3F0]/20 rounded-2xl border border-[#CBF3F0]">
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider block">Security Policy</span>
              <span className="font-mono text-[#2EC4B6] font-bold text-xs block mt-1">
                Stateless HS256 Bearer
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
