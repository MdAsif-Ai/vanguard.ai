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
        "bg-white rounded-2xl p-5 border border-[#CBF3F0] shadow-[8px_8px_20px_rgba(46,196,182,0.07),-4px_-4px_12px_rgba(255,255,255,0.95),0_2px_6px_rgba(0,0,0,0.03)] hover:shadow-[12px_12px_28px_rgba(46,196,182,0.14),-5px_-5px_16px_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:border-[#2EC4B6]/50 transition-all duration-200 relative overflow-hidden group",
        className
      )}
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#FF9F1C] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="flex items-center justify-between text-slate-500 mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
        {Icon && (
          <div className="p-2.5 rounded-xl bg-[#CBF3F0]/60 text-[#2EC4B6] border border-[#2EC4B6]/30 group-hover:text-[#0D6B63] transition-colors shadow-xs">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl font-extrabold tracking-tight text-slate-900 font-mono">{value}</div>
        {badge}
      </div>

      {(subtext || trend) && (
        <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-500">
          {trend && (
            <span
              className={cn(
                "font-semibold",
                trend.isPositive ? "text-[#0D6B63]" : "text-rose-600"
              )}
            >
              {trend.value}
            </span>
          )}
          {subtext && <span>{subtext}</span>}
        </div>
      )}
    </div>
  );
}
