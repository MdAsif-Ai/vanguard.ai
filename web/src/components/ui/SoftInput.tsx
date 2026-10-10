"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface SoftInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  label?: string;
}

export const SoftInput = React.forwardRef<HTMLInputElement, SoftInputProps>(
  ({ className, icon, leftIcon, rightIcon, error, label, id, ...props }, ref) => {
    const effectiveLeftIcon = leftIcon || icon;
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className="block text-xs font-bold text-[#0B132B] uppercase tracking-wider font-mono"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {effectiveLeftIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[#2A9D8F]">
              {effectiveLeftIcon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            className={cn(
              "w-full bg-[#FFFFFF] border border-[#DDD6C4] rounded-xl text-[#0B132B] placeholder-[#8A95A5] font-medium",
              "shadow-xs focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15 transition-all duration-200",
              "disabled:opacity-50 disabled:bg-[#EAE5D9]/40",
              effectiveLeftIcon ? "pl-10" : "pl-3.5",
              rightIcon ? "pr-10" : "pr-3.5",
              "py-2.5 text-xs sm:text-sm",
              error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/20",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 flex items-center text-[#8A95A5]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-[11px] font-semibold text-rose-600">{error}</p>
        )}
      </div>
    );
  }
);

SoftInput.displayName = "SoftInput";
