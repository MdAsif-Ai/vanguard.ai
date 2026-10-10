"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface PremiumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "level-1" | "level-2" | "level-3" | "recessed" | "paper" | "terminal" | "navy-light" | "ivory";
  level?: "level-1" | "level-2" | "level-3" | "recessed" | "paper" | "terminal" | "navy-light" | "ivory";
  interactive?: boolean;
  padded?: boolean | "sm" | "md" | "lg" | "none";
}

export const PremiumCard: React.FC<PremiumCardProps> = ({
  variant,
  level,
  interactive = false,
  padded = "md",
  className,
  children,
  ...props
}) => {
  const activeVariant = level || variant || "level-2";

  const variantStyles = {
    "level-1": "bg-[#F4F1EA] border border-[#E2DCD0] shadow-[0_4px_16px_rgba(11,19,43,0.06),0_1px_3px_rgba(11,19,43,0.03)]",
    "level-2": "bg-white border border-[#E2DCD0] shadow-card",
    "level-3": "bg-white border border-[#D5CBB9] shadow-feature",
    recessed: "bg-[#EAE5D9] border border-[#DDD6C4] shadow-[inset_0_2px_4px_rgba(11,19,43,0.04)]",
    paper: "paper-report",
    terminal: "surface-terminal text-[#F4F1EA]",
    "navy-light": "surface-navy-light text-[#F4F1EA]",
    ivory: "surface-ivory",
  };

  const paddingStyles = {
    none: "",
    sm: "p-3.5",
    md: "p-5 sm:p-6",
    lg: "p-6 sm:p-8",
    true: "p-5 sm:p-6",
    false: "",
  };

  const padding = typeof padded === "boolean" ? paddingStyles[padded ? "md" : "none"] : paddingStyles[padded];

  return (
    <div
      className={cn(
        "rounded-2xl transition-all duration-200",
        variantStyles[activeVariant as keyof typeof variantStyles] || variantStyles["level-2"],
        interactive && "card-3d cursor-pointer hover:border-[#D4AF37]",
        padding,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
