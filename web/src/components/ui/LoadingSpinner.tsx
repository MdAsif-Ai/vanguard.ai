import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function LoadingSpinner({ size = "md", className, label }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
  };

  return (
    <div className={cn("inline-flex items-center gap-2 text-slate-500", className)}>
      <div
        className={cn(
          "rounded-full border-t-[#2EC4B6] border-r-[#CBF3F0] border-b-[#2EC4B6]/50 border-l-transparent animate-spin",
          sizeMap[size]
        )}
      />
      {label && <span className="text-xs font-semibold text-slate-600">{label}</span>}
    </div>
  );
}
