import React from "react";
import { cn } from "@/lib/utils";

interface DataLabelProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  isMono?: boolean;
}

export function DataLabel({ label, value, icon, className, isMono }: DataLabelProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1.5 text-xs font-bold font-mono uppercase tracking-wider text-[#5A677D]">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "text-sm font-bold text-[#0B132B]",
          isMono && "font-mono text-xs font-medium text-[#1C2541] bg-[#F4F1EA] px-2 py-1 rounded-md border border-[#E2DCD0] inline-block break-all"
        )}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}
