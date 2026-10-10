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
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "text-sm font-bold text-slate-800",
          isMono && "font-mono text-xs font-medium text-slate-700 bg-[#F4F9F8] px-2 py-1 rounded-lg border border-[#CBF3F0] inline-block break-all"
        )}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}
