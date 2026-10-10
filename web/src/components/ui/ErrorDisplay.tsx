import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorDisplayProps {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({
  title = "An error occurred",
  message,
  onRetry,
  className,
}: ErrorDisplayProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-800 flex items-start justify-between gap-3 shadow-xs animate-in fade-in",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-rose-900">{title}</h4>
          <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">{message}</p>
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-rose-300 shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );
}
