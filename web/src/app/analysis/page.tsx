"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import { analysisApi } from "@/lib/api/analysis";
import { useAuth } from "@/hooks/useAuth";
import { CalculationOperation, CalculationResult } from "@/types";
import {
  Calculator,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Equal,
  Info,
  CheckCircle2,
  TrendingUp,
  Percent,
} from "lucide-react";

interface OperationMeta {
  label: string;
  description: string;
  inputs: { key: string; label: string; defaultValue: number; placeholder: string }[];
}

const OPERATIONS_CONFIG: Record<string, OperationMeta> = {
  margin: {
    label: "Operating / Profit Margin",
    description: "Calculates (income / revenue) * 100 to determine profit margin percentage.",
    inputs: [
      { key: "income", label: "Net / Operating Income ($B or $M)", defaultValue: 112.4, placeholder: "112.4" },
      { key: "revenue", label: "Total Revenue ($B or $M)", defaultValue: 402.8, placeholder: "402.8" },
    ],
  },
  cagr: {
    label: "Compound Annual Growth (CAGR)",
    description: "Calculates ((end / start) ^ (1 / years) - 1) * 100 over multiple reporting periods.",
    inputs: [
      { key: "start", label: "Beginning Value ($ or units)", defaultValue: 150.0, placeholder: "150.0" },
      { key: "end", label: "Ending Value ($ or units)", defaultValue: 280.0, placeholder: "280.0" },
      { key: "years", label: "Number of Years", defaultValue: 4, placeholder: "4" },
    ],
  },
  growth_rate: {
    label: "Period-over-Period Growth Rate",
    description: "Calculates ((current - previous) / |previous|) * 100.",
    inputs: [
      { key: "current", label: "Current Period ($)", defaultValue: 320.5, placeholder: "320.5" },
      { key: "previous", label: "Previous Period ($)", defaultValue: 280.0, placeholder: "280.0" },
    ],
  },
  percentage_change: {
    label: "Percentage Change",
    description: "Calculates percentage delta from old baseline to new baseline.",
    inputs: [
      { key: "old", label: "Old Value", defaultValue: 85.0, placeholder: "85.0" },
      { key: "new", label: "New Value", defaultValue: 105.0, placeholder: "105.0" },
    ],
  },
  ratio: {
    label: "Financial Ratio (e.g. Current, P/E, Debt/Equity)",
    description: "Computes numerator / denominator ratio.",
    inputs: [
      { key: "numerator", label: "Numerator (e.g. Current Assets)", defaultValue: 180.2, placeholder: "180.2" },
      { key: "denominator", label: "Denominator (e.g. Current Liabilities)", defaultValue: 95.4, placeholder: "95.4" },
    ],
  },
  divide: {
    label: "Division",
    description: "Standard division with zero-division validation.",
    inputs: [
      { key: "numerator", label: "Numerator", defaultValue: 500, placeholder: "500" },
      { key: "denominator", label: "Denominator", defaultValue: 25, placeholder: "25" },
    ],
  },
  subtract: {
    label: "Difference (a - b)",
    description: "Computes difference between two figures.",
    inputs: [
      { key: "a", label: "Term A (Revenue)", defaultValue: 402.8, placeholder: "402.8" },
      { key: "b", label: "Term B (COGS / Expenses)", defaultValue: 290.4, placeholder: "290.4" },
    ],
  },
  multiply: {
    label: "Multiplication",
    description: "Computes product of financial inputs.",
    inputs: [
      { key: "x", label: "Factor 1", defaultValue: 15.5, placeholder: "15.5" },
      { key: "y", label: "Factor 2", defaultValue: 8.0, placeholder: "8.0" },
    ],
  },
  sum: {
    label: "Summation",
    description: "Aggregates segment items.",
    inputs: [
      { key: "item1", label: "Segment 1", defaultValue: 140.2, placeholder: "140.2" },
      { key: "item2", label: "Segment 2", defaultValue: 92.5, placeholder: "92.5" },
      { key: "item3", label: "Segment 3", defaultValue: 65.8, placeholder: "65.8" },
    ],
  },
};

export default function FinancialAnalysisPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [operation, setOperation] = useState<CalculationOperation>("margin");
  const [formInputs, setFormInputs] = useState<Record<string, number>>({
    income: 112.4,
    revenue: 402.8,
  });

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Switch operation and initialize input defaults
  const handleOperationChange = (op: CalculationOperation) => {
    setOperation(op);
    setResult(null);
    setErrorMessage(null);
    const meta = OPERATIONS_CONFIG[op];
    if (meta) {
      const defaults: Record<string, number> = {};
      meta.inputs.forEach((inp) => {
        defaults[inp.key] = inp.defaultValue;
      });
      setFormInputs(defaults);
    }
  };

  const handleInputChange = (key: string, val: string) => {
    const num = parseFloat(val);
    setFormInputs((prev) => ({
      ...prev,
      [key]: isNaN(num) ? 0 : num,
    }));
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organization_id) {
      setErrorMessage("Organization profile not loaded. Please re-login.");
      return;
    }

    setIsCalculating(true);
    setErrorMessage(null);

    try {
      const res = await analysisApi.calculate({
        operation,
        inputs: formInputs,
        organization_id: user.organization_id,
      });
      setResult(res);
    } catch (err: any) {
      const msg =
        err.response?.data?.detail ||
        err.message ||
        "Calculation error. Verify non-zero inputs.";
      setErrorMessage(msg);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSendToRAG = () => {
    if (!result) return;
    const opMeta = OPERATIONS_CONFIG[operation]?.label || operation;
    const prompt = `Can you verify the ${opMeta} of ${result.result.toFixed(2)}% based on the formula ${result.formula} in the latest 10-K filing?`;
    router.push(`/ask`);
  };

  const currentMeta = OPERATIONS_CONFIG[operation];

  return (
    <AppShell
      title="Deterministic Financial Calculator"
      description="Perform auditable mathematical operations in Python. The platform strictly enforces zero-hallucination arithmetic."
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Verification Guarantee Banner */}
        <div className="bg-white rounded-3xl p-6 border-2 border-[#CBF3F0] shadow-clay">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#CBF3F0] text-[#2EC4B6] border border-[#2EC4B6]/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Deterministic Computation Standard</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-[#CBF3F0] text-[#157A70] text-[10px] font-mono border border-[#2EC4B6]/40 font-bold">
                  Zero LLM Arithmetic
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Financial calculations are executed directly in backend Python routines. Results include full formula preservation for auditing.
              </p>
            </div>
          </div>
        </div>

        <ErrorDisplay message={errorMessage} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Operation Selector & Form (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#CBF3F0] shadow-clay space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                Select Financial Operation
              </label>
              <select
                value={operation}
                onChange={(e) => handleOperationChange(e.target.value as CalculationOperation)}
                className="mt-2 w-full bg-white border border-[#CBF3F0] rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#2EC4B6] focus:ring-2 focus:ring-[#2EC4B6]/20 font-semibold shadow-sm transition-all"
              >
                {Object.entries(OPERATIONS_CONFIG).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label} ({key})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed font-medium">
                {currentMeta?.description}
              </p>
            </div>

            <form onSubmit={handleCalculate} className="space-y-4 pt-2 border-t border-[#CBF3F0]/60">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider font-mono block">
                Input Variables
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentMeta?.inputs.map((inp) => (
                  <div key={inp.key} className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 flex items-center justify-between">
                      <span>{inp.label}</span>
                      <span className="text-[11px] text-[#2EC4B6] font-mono font-bold">{inp.key}</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formInputs[inp.key] ?? ""}
                      onChange={(e) => handleInputChange(inp.key, e.target.value)}
                      placeholder={inp.placeholder}
                      className="w-full bg-white border border-[#CBF3F0] rounded-xl p-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#2EC4B6] focus:ring-2 focus:ring-[#2EC4B6]/20 font-mono font-semibold shadow-sm transition-all"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={isCalculating}
                  className="px-5 py-2.5 rounded-xl bg-[#FF9F1C] hover:bg-[#FFBF69] text-white text-xs font-bold shadow-clay-btn flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95"
                >
                  {isCalculating ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Calculator className="w-4 h-4" />
                  )}
                  <span>Calculate Deterministically</span>
                </button>
              </div>
            </form>
          </div>

          {/* Results Display Panel (1 col) */}
          <div className="bg-white rounded-3xl p-6 border border-[#CBF3F0] shadow-clay space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#CBF3F0]/60 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 font-mono flex items-center gap-1.5">
                  <Equal className="w-4 h-4 text-[#FF9F1C]" />
                  Computation Result
                </h3>
                {result && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#CBF3F0] text-[#157A70] border border-[#2EC4B6]/40 text-[10px] font-mono font-bold">
                    Verified True
                  </span>
                )}
              </div>

              {result ? (
                <div className="space-y-4 animate-in fade-in">
                  <div className="p-5 rounded-2xl bg-[#CBF3F0]/25 border border-[#CBF3F0] text-center space-y-1 shadow-inner">
                    <span className="text-xs text-slate-500 uppercase font-mono tracking-wider font-bold">
                      Calculated Value
                    </span>
                    <div className="text-3xl font-black text-[#FF9F1C] tracking-tight font-mono">
                      {typeof result.result === "number" ? result.result.toFixed(4) : result.result}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <span className="text-slate-500 font-bold">Evaluation Formula:</span>
                    <div className="p-3 rounded-xl bg-white border border-[#CBF3F0] font-mono text-[#157A70] text-xs break-all font-semibold shadow-sm">
                      {result.formula}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <span className="text-slate-500 font-bold">Recorded Inputs:</span>
                    <div className="p-2.5 rounded-xl bg-white border border-[#CBF3F0] font-mono text-slate-500 text-[11px] space-y-0.5 shadow-sm">
                      {Object.entries(result.inputs).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="font-semibold text-slate-600">{k}:</span>
                          <span className="text-slate-800 font-bold">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <Calculator className="w-8 h-8 text-[#2EC4B6] mx-auto opacity-40" />
                  <p>Choose an operation and execute calculation to inspect the verified formula.</p>
                </div>
              )}
            </div>

            {/* RAG Cross-reference */}
            {result && (
              <div className="pt-4 border-t border-[#CBF3F0]/60">
                <button
                  type="button"
                  onClick={handleSendToRAG}
                  className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-[#CBF3F0]/40 text-slate-700 hover:text-slate-900 border border-[#CBF3F0] text-xs font-bold flex items-center justify-center gap-2 transition-all group shadow-sm active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FF9F1C]" />
                  <span>Cross-Reference with AI RAG</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-[#2EC4B6]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
