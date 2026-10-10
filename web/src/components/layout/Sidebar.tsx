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
        "h-screen sticky top-0 flex flex-col bg-[#0B132B] border-r border-[#1C2541]/80 shadow-sidebar-soft rounded-r-[24px] transition-all duration-300 z-30 select-none overflow-hidden",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#1C2541]">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#FAF6E8] flex items-center justify-center shadow-[0_4px_14px_rgba(212,175,55,0.3)] transform transition-transform group-hover:scale-105">
              <Layers className="w-5 h-5 text-[#0B132B]" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-wider text-[#F4F1EA] flex items-center gap-1">
                VANGUARD<span className="text-[#D4AF37]">.AI</span>
              </span>
              <span className="block text-[10px] text-[#A7B3C6] font-mono tracking-tight uppercase font-semibold">
                Financial Terminal
              </span>
            </div>
          </Link>
        )}

        {collapsed && (
          <Link href="/dashboard" className="mx-auto">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#FAF6E8] flex items-center justify-center shadow-[0_4px_14px_rgba(212,175,55,0.3)]">
              <Layers className="w-5 h-5 text-[#0B132B]" />
            </div>
          </Link>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-lg text-[#8A95A5] hover:text-[#D4AF37] hover:bg-[#1C2541] transition-colors cursor-pointer",
            collapsed && "mx-auto mt-2 hidden"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative border cursor-pointer",
                isActive
                  ? "bg-[#1C2541] text-[#F4F1EA] border-[#D4AF37]/40 shadow-xs font-semibold"
                  : "text-[#A7B3C6] hover:text-[#F4F1EA] hover:bg-[#1C2541]/70 border-transparent"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-colors",
                  isActive ? "text-[#D4AF37]" : "text-[#8A95A5] group-hover:text-[#F4F1EA]"
                )}
              />
              {!collapsed && <span className="truncate flex-1">{item.name}</span>}
              {!collapsed && item.badge && (
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-md font-mono uppercase font-bold",
                    isActive
                      ? "bg-[#D4AF37] text-[#0B132B]"
                      : "bg-[#060A17] text-[#A7B3C6] border border-[#1C2541]"
                  )}
                >
                  {item.badge}
                </span>
              )}

              {/* Active gold bar */}
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#D4AF37] rounded-r" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle when in collapsed view */}
      {collapsed && (
        <div className="p-2 border-t border-[#1C2541] flex justify-center">
          <button
            onClick={() => setCollapsed(false)}
            className="p-2 rounded-xl text-[#8A95A5] hover:text-[#D4AF37] hover:bg-[#1C2541] cursor-pointer"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Infrastructure Footer Status */}
      {!collapsed && (
        <div className="p-3.5 border-t border-[#1C2541] bg-[#060A17]/80">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-[#A7B3C6] flex items-center gap-1.5 font-semibold text-[11px]">
              <Activity className="w-3.5 h-3.5 text-[#2A9D8F]" />
              Cluster Telemetry
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-bold font-mono",
                isReady ? "text-[#2A9D8F]" : "text-[#D4AF37]"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isReady ? "bg-[#2A9D8F]" : "bg-[#D4AF37] animate-pulse"
                )}
              />
              {isReady ? "LIVE" : "CHECK"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-mono text-[#A7B3C6] mt-2">
            <div className="bg-[#1C2541] px-1.5 py-1 rounded-md border border-white/5 font-semibold">
              PG: {readiness?.checks?.database === "ok" ? "OK" : "—"}
            </div>
            <div className="bg-[#1C2541] px-1.5 py-1 rounded-md border border-white/5 font-semibold">
              RDS: {readiness?.checks?.redis === "ok" ? "OK" : "—"}
            </div>
            <div className="bg-[#1C2541] px-1.5 py-1 rounded-md border border-white/5 font-semibold">
              QDR: {readiness?.checks?.qdrant === "ok" ? "OK" : "—"}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
