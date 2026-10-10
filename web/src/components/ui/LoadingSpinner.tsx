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
    <div className={cn("inline-flex items-center gap-2 text-[#8A95A5]", className)}>
      <div
        className={cn(
          "rounded-full border-t-[#2A9D8F] border-r-[#D4AF37] border-b-[#2A9D8F]/40 border-l-transparent animate-spin",
          sizeMap[size]
        )}
      />
      {label && <span className="text-xs font-semibold text-[#0B132B] font-mono">{label}</span>}
    </div>
  );
}
