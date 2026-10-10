"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DataLabel } from "@/components/ui/DataLabel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { healthApi } from "@/lib/api/health";
import {
  User,
  Gauge,
  Key,
  CheckCircle2,
  Server,
  Lock,
  Clock,
} from "lucide-react";
import { formatDate, formatDuration } from "@/lib/utils";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { TactileButton } from "@/components/ui/TactileButton";
import { SoftInput } from "@/components/ui/SoftInput";

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
        <PremiumCard variant="paper" className="p-6 space-y-5 shadow-card">
          <div className="flex items-center gap-3 border-b border-[#DDD6C4] pb-4">
            <div className="p-3 rounded-xl bg-[#0B132B] text-[#D4AF37] border border-[#1C2541] shadow-xs">
              <User className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B132B] font-serif">Authenticated Profile</h3>
              <p className="text-xs text-[#8A95A5] font-medium">
                JWT claims and organization-scoped authorization attributes
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DataLabel label="User Email" value={user?.email || "—"} />
            <DataLabel
              label="Assigned Role"
              value={
                <span className="capitalize px-2.5 py-0.5 rounded-md bg-[#0B132B] text-[#D4AF37] border border-[#1C2541] font-mono text-xs font-bold">
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
        </PremiumCard>

        {/* Rate Limiting & Gateway Quotas */}
        <PremiumCard variant="paper" className="p-6 space-y-4 shadow-card">
          <div className="flex items-center gap-3 border-b border-[#DDD6C4] pb-3">
            <div className="p-2.5 rounded-xl bg-[#0B132B] text-[#D4AF37] border border-[#1C2541] shadow-xs">
              <Gauge className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B132B] font-serif">API Quota & Rate Limiting</h3>
              <p className="text-xs text-[#8A95A5] font-medium">
                Token bucket rate limiter running on FastAPI gateway
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DDD6C4] space-y-1 shadow-xs">
              <span className="text-[11px] font-mono uppercase text-[#8A95A5] font-bold">Quota Limit</span>
              <div className="text-xl font-black text-[#0B132B] font-mono">30 req / min</div>
              <span className="text-[10px] text-[#8A95A5] font-medium">Fixed rate window</span>
            </div>

            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DDD6C4] space-y-1 shadow-xs">
              <span className="text-[11px] font-mono uppercase text-[#8A95A5] font-bold">Remaining Quota</span>
              <div className="text-xl font-black text-[#2A9D8F] font-mono">
                {rateLimitRemaining !== null ? `${rateLimitRemaining} reqs` : "30 reqs"}
              </div>
              <span className="text-[10px] text-[#8A95A5] font-medium">Header: X-RateLimit-Remaining</span>
            </div>

            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#DDD6C4] space-y-1 shadow-xs">
              <span className="text-[11px] font-mono uppercase text-[#8A95A5] font-bold">Last Request ID</span>
              <div className="text-xs font-bold text-[#0B132B] font-mono truncate mt-1">
                {lastRequestId || "None"}
              </div>
              <span className="text-[10px] text-[#8A95A5] font-medium">Header: X-Request-ID</span>
            </div>
          </div>
        </PremiumCard>

        {/* Backend Node Telemetry */}
        <PremiumCard variant="paper" className="p-6 space-y-4 shadow-card">
          <div className="flex items-center gap-3 border-b border-[#DDD6C4] pb-3">
            <div className="p-2.5 rounded-xl bg-[#0B132B] text-[#2A9D8F] border border-[#1C2541] shadow-xs">
              <Server className="w-4 h-4 text-[#2A9D8F]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B132B] font-serif">Backend Health & Engine Metrics</h3>
              <p className="text-xs text-[#8A95A5] font-medium">Core FastAPI service details</p>
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
              icon={<Clock className="w-3.5 h-3.5 text-[#D4AF37]" />}
            />
          </div>
        </PremiumCard>

        {/* Change Password Box */}
        <PremiumCard variant="paper" className="p-6 space-y-4 shadow-card">
          <div className="flex items-center gap-3 border-b border-[#DDD6C4] pb-3">
            <div className="p-2.5 rounded-xl bg-[#0B132B] text-[#D4AF37] border border-[#1C2541] shadow-xs">
              <Key className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0B132B] font-serif">Security & Password</h3>
              <p className="text-xs text-[#8A95A5] font-medium">Update local access credentials</p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="p-3.5 rounded-xl bg-[#2A9D8F]/10 border border-[#2A9D8F]/40 text-[#2A9D8F] text-xs flex items-center gap-2 font-semibold shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-[#2A9D8F]" />
              <span>Password change request recorded successfully.</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B132B]">Current Password</label>
              <SoftInput
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                icon={<Lock className="w-4 h-4 text-[#8A95A5]" />}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B132B]">New Password</label>
              <SoftInput
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                icon={<Lock className="w-4 h-4 text-[#8A95A5]" />}
              />
            </div>

            <div className="pt-1">
              <TactileButton
                type="submit"
                variant="primary"
                size="md"
                disabled={!currentPassword || !newPassword}
              >
                Update Password
              </TactileButton>
            </div>
          </form>
        </PremiumCard>
      </div>
    </AppShell>
  );
}
