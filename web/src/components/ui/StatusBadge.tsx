import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string | null;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const norm = (status || "unknown").toLowerCase();

  let styles = "bg-[#EAE5D9] text-[#5A677D] border-[#DDD6C4]";
  let dotColor = "bg-[#8A95A5]";
  let pulse = false;

  switch (norm) {
    case "ready":
    case "completed":
    case "answered":
    case "ok":
    case "active":
    case "verified":
      styles = "bg-[#2A9D8F]/15 text-[#2A9D8F] border-[#2A9D8F]/40";
      dotColor = "bg-[#2A9D8F]";
      break;
    case "running":
    case "processing":
      styles = "bg-[#D4AF37]/15 text-[#9C7C18] border-[#D4AF37]/40";
      dotColor = "bg-[#D4AF37]";
      pulse = true;
      break;
    case "queued":
    case "uploaded":
    case "pending":
      styles = "bg-[#EAE5D9] text-[#5A677D] border-[#DDD6C4]";
      dotColor = "bg-[#D4AF37]";
      pulse = true;
      break;
    case "failed":
    case "error":
    case "not_ready":
      styles = "bg-rose-50 text-rose-700 border-rose-300";
      dotColor = "bg-rose-500";
      break;
    default:
      styles = "bg-[#EAE5D9] text-[#5A677D] border-[#DDD6C4]";
      dotColor = "bg-[#8A95A5]";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold border capitalize shadow-2xs",
        styles,
        className
      )}
    >
      {showDot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotColor, pulse && "animate-pulse")}
        />
      )}
      {status || "unknown"}
    </span>
  );
}
