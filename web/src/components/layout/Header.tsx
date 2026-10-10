"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Gauge, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  const { user, logout, rateLimitRemaining, lastRequestId, isRateLimited } = useAuth();

  return (
    <header className="h-16 glass-header sticky top-0 z-20 px-6 flex items-center justify-between">
      {/* Title / Description */}
      <div>
        {title && <h1 className="text-base font-bold text-slate-900 tracking-tight">{title}</h1>}
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>

      {/* Right controls: rate limits, user info, logout */}
      <div className="flex items-center gap-3">
        {actions}

        {/* Request ID indicator */}
        {lastRequestId && (
          <div
            title={`Last Request ID: ${lastRequestId}`}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#CBF3F0] text-[11px] text-slate-600 font-mono shadow-xs"
          >
            <Hash className="w-3.5 h-3.5 text-[#2EC4B6]" />
            <span>{lastRequestId}</span>
          </div>
        )}

        {/* Rate limit status */}
        <div
          title="Rate Limit Quota (30 requests/minute max)"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono shadow-xs",
            isRateLimited
              ? "bg-rose-50 text-rose-700 border-rose-300"
              : rateLimitRemaining !== null && rateLimitRemaining < 5
              ? "bg-[#FFF4E5] text-[#9A4C00] border-[#FFBF69]"
              : "bg-[#CBF3F0]/60 text-[#134E4A] border-[#2EC4B6]/30"
          )}
        >
          <Gauge className="w-3.5 h-3.5 text-[#2EC4B6]" />
          <span>
            {rateLimitRemaining !== null ? `${rateLimitRemaining}/30` : "30/30"}{" "}
            <span className="hidden sm:inline text-slate-500">reqs</span>
          </span>
        </div>

        {/* Current User */}
        {user && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-[#CBF3F0]">
            <div className="w-8 h-8 rounded-xl bg-[#FF9F1C]/15 text-[#FF9F1C] border border-[#FF9F1C]/30 flex items-center justify-center font-bold text-xs shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                {user.email}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[#FF9F1C] uppercase font-mono tracking-wider font-bold">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          title="Sign out"
          className="p-2 rounded-xl text-slate-500 hover:text-[#FF9F1C] hover:bg-[#CBF3F0]/40 border border-transparent hover:border-[#CBF3F0] transition-colors shadow-xs"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
