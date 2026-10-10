"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  icon,
  badge,
  actions,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <div className="p-2.5 rounded-xl bg-[#0B132B] text-[#D4AF37] border border-[#1C2541] shadow-xs flex-shrink-0 mt-0.5">
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base sm:text-lg font-extrabold text-[#0B132B] tracking-tight">
              {title}
            </h2>
            {badge && <div>{badge}</div>}
          </div>
          {description && (
            <p className="text-xs text-[#5A677D] mt-0.5 leading-relaxed font-medium">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
      )}
    </div>
  );
};
