import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtext,
  icon: Icon,
  badge,
  trend,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-5 border border-[#E2DCD0] shadow-card hover:shadow-card-hover",
        "card-3d hover:border-[#D4AF37] transition-all duration-200 relative overflow-hidden group select-none",
        className
      )}
    >
      {/* Top Gold Shimmer on Hover */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#5A677D] font-mono">
          {title}
        </span>
        {Icon && (
          <div className="p-2 rounded-xl bg-[#0B132B] text-[#D4AF37] border border-[#1C2541] group-hover:bg-[#1C2541] transition-colors shadow-xs">
            <Icon className="w-4 h-4 text-[#D4AF37]" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl font-black tracking-tight text-[#0B132B] font-mono">
          {value}
        </div>
        {badge}
      </div>

      {(subtext || trend) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-[#5A677D]">
          {trend && (
            <span
              className={cn(
                "font-semibold font-mono",
                trend.isPositive ? "text-[#2A9D8F]" : "text-rose-600"
              )}
            >
              {trend.value}
            </span>
          )}
          {subtext && <span className="font-medium">{subtext}</span>}
        </div>
      )}
    </div>
  );
}
