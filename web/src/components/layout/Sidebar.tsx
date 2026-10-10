"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Files,
  FileCheck2,
  Calculator,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Activity,
  Layers,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { healthApi } from "@/lib/api/health";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Poll ready status periodically
  const { data: readiness } = useQuery({
    queryKey: ["readiness"],
    queryFn: healthApi.getReadiness,
    refetchInterval: 15000,
    retry: 0,
  });

  const isReady = readiness?.status === "ready";

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "AI Research", href: "/ask", icon: Sparkles, badge: "RAG" },
    { name: "Documents", href: "/documents", icon: Files },
    { name: "Evidence Viewer", href: "/evidence", icon: FileCheck2 },
    { name: "Financial Analysis", href: "/analysis", icon: Calculator },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  if (user?.role === "admin") {
    navigation.push({ name: "Admin Portal", href: "/admin", icon: Shield, badge: "Admin" });
  }

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col bg-white border-r border-[#CBF3F0] shadow-[4px_0_24px_rgba(46,196,182,0.06)] transition-all duration-300 z-30 select-none",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#CBF3F0]">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF9F1C] to-[#FFBF69] flex items-center justify-center shadow-[0_4px_14px_rgba(255,159,28,0.35)] transform transition-transform group-hover:scale-105">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-wider text-slate-900 flex items-center gap-1">
                VANGUARD<span className="text-[#FF9F1C]">.AI</span>
              </span>
              <span className="block text-[10px] text-slate-500 font-mono tracking-tight uppercase font-semibold">
                Financial Intel
              </span>
            </div>
          </Link>
        )}

        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF9F1C] to-[#FFBF69] flex items-center justify-center shadow-[0_4px_14px_rgba(255,159,28,0.35)]">
              <Layers className="w-5 h-5 text-white" />
            </div>
          </Link>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-lg text-slate-400 hover:text-[#FF9F1C] hover:bg-[#CBF3F0]/40 transition-colors",
            collapsed && "mx-auto mt-2 hidden"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative border",
                isActive
                  ? "bg-[#CBF3F0] text-[#134E4A] border-[#2EC4B6]/40 shadow-[0_4px_14px_rgba(46,196,182,0.14)] font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-[#CBF3F0]/40 border-transparent"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-colors",
                  isActive ? "text-[#2EC4B6]" : "text-slate-500 group-hover:text-slate-800"
                )}
              />
              {!collapsed && <span className="truncate flex-1">{item.name}</span>}
              {!collapsed && item.badge && (
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold",
                    isActive
                      ? "bg-[#2EC4B6] text-white shadow-xs"
                      : "bg-[#CBF3F0]/80 text-[#134E4A]"
                  )}
                >
                  {item.badge}
                </span>
              )}

              {/* Active bar */}
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1.5 bg-[#FF9F1C] rounded-r" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle when in collapsed view */}
      {collapsed && (
        <div className="p-2 border-t border-[#CBF3F0] flex justify-center">
          <button
            onClick={() => setCollapsed(false)}
            className="p-2 rounded-xl text-slate-500 hover:text-[#FF9F1C] hover:bg-[#CBF3F0]/40"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Infrastructure Footer Status */}
      {!collapsed && (
        <div className="p-3.5 border-t border-[#CBF3F0] bg-[#F4F9F8]">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-slate-600 flex items-center gap-1.5 font-semibold">
              <Activity className="w-3.5 h-3.5 text-[#2EC4B6]" />
              System Status
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-bold",
                isReady ? "text-[#0D6B63]" : "text-[#B45309]"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  isReady ? "bg-[#2EC4B6]" : "bg-[#FF9F1C] animate-pulse"
                )}
              />
              {isReady ? "Operational" : "Checking..."}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-mono text-slate-600 mt-2">
            <div className="bg-white px-1.5 py-1 rounded-lg border border-[#CBF3F0] shadow-xs font-semibold">
              PG: {readiness?.checks?.database === "ok" ? "OK" : "—"}
            </div>
            <div className="bg-white px-1.5 py-1 rounded-lg border border-[#CBF3F0] shadow-xs font-semibold">
              RDS: {readiness?.checks?.redis === "ok" ? "OK" : "—"}
            </div>
            <div className="bg-white px-1.5 py-1 rounded-lg border border-[#CBF3F0] shadow-xs font-semibold">
              QDR: {readiness?.checks?.qdrant === "ok" ? "OK" : "—"}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
