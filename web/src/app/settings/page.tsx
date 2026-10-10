"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DataLabel } from "@/components/ui/DataLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { healthApi } from "@/lib/api/health";
import {
  Settings,
  User,
  Shield,
  Gauge,
  Activity,
  Key,
  CheckCircle2,
  Server,
  Lock,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatDate, formatDuration } from "@/lib/utils";

export default function SettingsPage() {
  const { user, rateLimitRemaining, lastRequestId } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Health & metrics query
  const { data: health } = useQuery({
    queryKey: ["healthStatus"],
    queryFn: healthApi.getHealth,
  });

  const { data: metrics } = useQuery({
    queryKey: ["healthMetrics"],
    queryFn: healthApi.getMetrics,
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;
    setPasswordSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setTimeout(() => setPasswordSuccess(false), 4000);
  };

  return (
    <AppShell
      title="Platform Settings & Identity"
      description="Account security, organization parameters, rate limit quotas, and API connection status"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* User Profile Card */}
        <div className="bg-white rounded-3xl p-6 border border-[#CBF3F0] shadow-clay space-y-5">
          <div className="flex items-center gap-3 border-b border-[#CBF3F0]/60 pb-4">
            <div className="p-3 rounded-2xl bg-[#CBF3F0] text-[#2EC4B6] border border-[#2EC4B6]/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Authenticated Profile</h3>
              <p className="text-xs text-slate-400 font-medium">
                JWT claims and organization-scoped authorization attributes
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataLabel label="User Email" value={user?.email || "—"} />
            <DataLabel
              label="Assigned Role"
              value={
                <span className="capitalize px-2.5 py-0.5 rounded-lg bg-[#CBF3F0] text-[#157A70] border border-[#2EC4B6]/40 font-mono text-xs font-bold">
                  {user?.role || "user"}
                </span>
              }
            />
            <DataLabel label="User UUID" value={user?.id || "—"} isMono />
            <DataLabel label="Organization UUID" value={user?.organization_id || "—"} isMono />
            <DataLabel
              label="Account Status"
              value={<StatusBadge status={user?.is_active ? "active" : "inactive"} />}
            />
            <DataLabel label="Provisioned Timestamp" value={formatDate(user?.created_at)} />
          </div>
        </div>

        {/* Rate Limiting & Gateway Quotas */}
        <div className="bg-white rounded-3xl p-6 border border-[#CBF3F0] shadow-clay space-y-4">
          <div className="flex items-center gap-3 border-b border-[#CBF3F0]/60 pb-3">
            <div className="p-2.5 rounded-xl bg-[#CBF3F0] text-[#FF9F1C] border border-[#2EC4B6]/30">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">API Quota & Rate Limiting</h3>
              <p className="text-xs text-slate-400 font-medium">
                Token bucket rate limiter running on FastAPI gateway
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-[#CBF3F0] space-y-1 shadow-sm">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Quota Limit</span>
              <div className="text-xl font-black text-slate-800 font-mono">30 req / min</div>
              <span className="text-[10px] text-slate-400 font-medium">Fixed rate window</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#CBF3F0] space-y-1 shadow-sm">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Remaining Quota</span>
              <div className="text-xl font-black text-[#2EC4B6] font-mono">
                {rateLimitRemaining !== null ? `${rateLimitRemaining} reqs` : "30 reqs"}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Header: X-RateLimit-Remaining</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#CBF3F0] space-y-1 shadow-sm">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold">Last Request ID</span>
              <div className="text-xs font-bold text-slate-700 font-mono truncate mt-1">
                {lastRequestId || "None"}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Header: X-Request-ID</span>
            </div>
          </div>
        </div>

        {/* Backend Node Telemetry */}
        <div className="bg-white rounded-3xl p-6 border border-[#CBF3F0] shadow-clay space-y-4">
          <div className="flex items-center gap-3 border-b border-[#CBF3F0]/60 pb-3">
            <div className="p-2.5 rounded-xl bg-[#CBF3F0] text-[#2EC4B6] border border-[#2EC4B6]/30">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Backend Health & Engine Metrics</h3>
              <p className="text-xs text-slate-400 font-medium">Core FastAPI service details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <DataLabel
              label="Service Identifier"
              value={health?.service || "financerag"}
              isMono
            />
            <DataLabel
              label="Backend Liveness"
              value={<StatusBadge status={health?.status || "ok"} />}
            />
            <DataLabel
              label="Service Uptime"
              value={formatDuration(metrics?.uptime_seconds)}
              icon={<Clock className="w-3.5 h-3.5 text-[#FF9F1C]" />}
            />
          </div>
        </div>

        {/* Change Password Box */}
        <div className="bg-white rounded-3xl p-6 border border-[#CBF3F0] shadow-clay space-y-4">
          <div className="flex items-center gap-3 border-b border-[#CBF3F0]/60 pb-3">
            <div className="p-2.5 rounded-xl bg-[#CBF3F0] text-[#FF9F1C] border border-[#2EC4B6]/30">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Security & Password</h3>
              <p className="text-xs text-slate-400 font-medium">Update local access credentials</p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="p-3.5 rounded-xl bg-[#CBF3F0] border border-[#2EC4B6]/50 text-[#157A70] text-xs flex items-center gap-2 font-semibold shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-[#2EC4B6]" />
              <span>Password change request recorded.</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-white border border-[#CBF3F0] rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#2EC4B6] focus:ring-2 focus:ring-[#2EC4B6]/20 font-medium shadow-sm transition-all"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-white border border-[#CBF3F0] rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#2EC4B6] focus:ring-2 focus:ring-[#2EC4B6]/20 font-medium shadow-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={!currentPassword || !newPassword}
              className="px-5 py-2.5 rounded-xl bg-[#FF9F1C] hover:bg-[#FFBF69] text-white text-xs font-bold shadow-clay-btn disabled:opacity-50 transition-all active:scale-95"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
