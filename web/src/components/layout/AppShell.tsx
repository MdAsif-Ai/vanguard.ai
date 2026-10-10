"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuth } from "@/hooks/useAuth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AlertTriangle, X } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function AppShell({ children, title, description, actions }: AppShellProps) {
  const { isLoading, isRateLimited, clearRateLimitWarning } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F9F8] flex flex-col items-center justify-center space-y-4">
        <LoadingSpinner size="lg" label="Initializing VANGUARD.AI..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F4F9F8] text-[#1E293B]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} description={description} actions={actions} />

        {/* Global Rate Limit Warning Banner if 429 occurs */}
        {isRateLimited && (
          <div className="bg-[#FFF4E5] border-b border-[#FFBF69] px-6 py-2.5 flex items-center justify-between text-xs text-[#9A4C00] shadow-xs animate-in slide-in-from-top">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FF9F1C] flex-shrink-0" />
              <span>
                <strong>Rate limit reached (429):</strong> The platform allows up to 30 requests per minute.
                Your requests will resume automatically shortly.
              </span>
            </div>
            <button
              onClick={clearRateLimitWarning}
              className="text-[#B45309] hover:text-[#9A4C00] p-1 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
