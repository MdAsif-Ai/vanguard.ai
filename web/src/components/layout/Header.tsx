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
    <header className="h-16 sticky top-0 z-20 px-6 lg:px-8 flex items-center justify-between bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#DDD6C4]/80 rounded-b-2xl shadow-header-soft">
      {/* Title / Description */}
      <div>
        {title && <h1 className="text-base font-extrabold text-[#0B132B] tracking-tight">{title}</h1>}
        {description && <p className="text-xs text-[#5A677D] font-medium mt-0.5">{description}</p>}
      </div>

      {/* Right controls: rate limits, user info, logout */}
      <div className="flex items-center gap-3">
        {actions}

        {/* Request ID indicator */}
        {lastRequestId && (
          <div
            title={`Last Request ID: ${lastRequestId}`}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E2DCD0] text-[11px] text-[#0B132B] font-mono shadow-2xs"
          >
            <Hash className="w-3.5 h-3.5 text-[#2A9D8F]" />
            <span>{lastRequestId}</span>
          </div>
        )}

        {/* Rate limit status */}
        <div
          title="Rate Limit Quota (30 requests/minute max)"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-mono shadow-2xs",
            isRateLimited
              ? "bg-rose-50 text-rose-700 border-rose-300"
              : rateLimitRemaining !== null && rateLimitRemaining < 5
              ? "bg-[#D4AF37]/15 text-[#8F721B] border-[#D4AF37]"
              : "bg-white text-[#0B132B] border-[#E2DCD0]"
          )}
        >
          <Gauge className="w-3.5 h-3.5 text-[#2A9D8F]" />
          <span className="font-bold">
            {rateLimitRemaining !== null ? `${rateLimitRemaining}/30` : "30/30"}{" "}
            <span className="hidden sm:inline text-[#5A677D] font-normal">reqs</span>
          </span>
        </div>

        {/* Current User */}
        {user && (
          <div className="flex items-center gap-2.5 pl-3 border-l border-[#E2DCD0]">
            <div className="w-8 h-8 rounded-lg bg-[#0B132B] text-[#D4AF37] border border-[#1C2541] flex items-center justify-center font-bold text-xs shadow-xs">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-[#0B132B] truncate max-w-[140px]">
                {user.email}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-[#D4AF37] uppercase font-mono tracking-wider font-bold">
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
          className="p-2 rounded-lg text-[#5A677D] hover:text-[#D4AF37] hover:bg-[#EAE5D9] transition-colors cursor-pointer"
          aria-label="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
