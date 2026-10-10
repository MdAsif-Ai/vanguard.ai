import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const norm = (status || "unknown").toLowerCase();

  let styles = "bg-slate-100 text-slate-700 border-slate-200 shadow-xs";
  let dotColor = "bg-slate-400";
  let pulse = false;

  switch (norm) {
    case "ready":
    case "completed":
    case "answered":
    case "ok":
    case "active":
    case "verified":
      styles = "bg-[#CBF3F0] text-[#0D6B63] border-[#2EC4B6]/50 shadow-xs";
      dotColor = "bg-[#2EC4B6]";
      break;
    case "running":
    case "processing":
      styles = "bg-[#FFF4E5] text-[#9A4C00] border-[#FFBF69] shadow-xs";
      dotColor = "bg-[#FF9F1C]";
      pulse = true;
      break;
    case "queued":
    case "uploaded":
    case "pending":
      styles = "bg-[#FFF8EE] text-[#B45309] border-[#FFBF69]/60 shadow-xs";
      dotColor = "bg-[#FFBF69]";
      pulse = true;
      break;
    case "failed":
    case "error":
    case "not_ready":
      styles = "bg-rose-50 text-rose-700 border-rose-200 shadow-xs";
      dotColor = "bg-rose-500";
      break;
    default:
      styles = "bg-slate-100 text-slate-700 border-slate-200 shadow-xs";
      dotColor = "bg-slate-400";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize",
        styles,
        className
      )}
    >
      {showDot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full", dotColor, pulse && "animate-ping")}
        />
      )}
      {status || "unknown"}
    </span>
  );
}
