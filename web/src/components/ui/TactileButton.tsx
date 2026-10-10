"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./LoadingSpinner";

export interface TactileButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const TactileButton = React.forwardRef<
  HTMLButtonElement,
  TactileButtonProps
>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      icon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary:
        "btn-gold font-bold text-[#0B132B] shadow-gold-btn",
      secondary:
        "btn-navy font-bold text-[#F4F1EA] shadow-md",
      accent:
        "btn-teal font-bold text-white shadow-teal-btn",
      outline:
        "bg-transparent border border-[#DDD6C4] text-[#0B132B] hover:border-[#D4AF37] hover:bg-[#EAE5D9]/50 font-semibold transition-all duration-200 active:translate-y-px",
      ghost:
        "bg-transparent hover:bg-[#EAE5D9]/50 text-[#0B132B] hover:text-[#D4AF37] font-semibold transition-all duration-200",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
      md: "px-4 py-2.5 text-xs sm:text-sm rounded-xl gap-2",
      lg: "px-6 py-3.5 text-sm sm:text-base rounded-xl gap-2.5",
      icon: "p-2.5 rounded-lg aspect-square justify-center",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center transition-all duration-200 select-none cursor-pointer",
          "disabled:opacity-50 disabled:pointer-events-none disabled:transform-none",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <LoadingSpinner size="sm" />
        ) : (
          icon && <span className="flex-shrink-0">{icon}</span>
        )}
        {children}
      </button>
    );
  }
);

TactileButton.displayName = "TactileButton";
