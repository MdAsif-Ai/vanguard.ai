"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import { analysisApi } from "@/lib/api/analysis";
import { useAuth } from "@/hooks/useAuth";
import { CalculationOperation, CalculationResult } from "@/types";
import {
  Calculator,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Equal,
} from "lucide-react";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { TactileButton } from "@/components/ui/TactileButton";

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
        <PremiumCard variant="terminal" className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-[#1C2541] text-[#2A9D8F] border border-[#2A9D8F]/30 shadow-xs flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#2A9D8F]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F4F1EA] flex items-center gap-2 font-serif">
                  <span>Deterministic Python Arithmetic</span>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#1C2541] text-[#D4AF37] text-[10px] font-mono border border-[#D4AF37]/30 font-bold uppercase">
                    Zero LLM Math
                  </span>
                </h3>
                <p className="text-xs text-[#8A95A5] mt-0.5 font-medium">
                  Financial calculations run in native Python kernels with preserved AST verification for strict institutional regulatory compliance.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] font-mono text-[#2A9D8F] bg-[#1C2541] px-2.5 py-1 rounded-lg font-bold border border-[#2A9D8F]/30">
                AUDIT-READY
              </span>
            </div>
          </div>
        </PremiumCard>

        <ErrorDisplay message={errorMessage} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Operation Selector & Form (2 cols) */}
          <PremiumCard variant="paper" className="lg:col-span-2 p-6 space-y-6 shadow-card">
            <div>
              <label className="text-xs font-bold text-[#0B132B] uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Select Financial Operation</span>
                <span className="text-[10px] text-[#D4AF37] font-mono font-bold">MODE: {operation.toUpperCase()}</span>
              </label>
              <div className="mt-2 relative">
                <select
                  value={operation}
                  onChange={(e) => handleOperationChange(e.target.value as CalculationOperation)}
                  className="w-full bg-[#FFFFFF] border border-[#DDD6C4] rounded-xl p-3 text-sm text-[#0B132B] focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15 font-semibold transition-all cursor-pointer"
                >
                  {Object.entries(OPERATIONS_CONFIG).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label} ({key})
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-[#0B132B] mt-2.5 leading-relaxed font-medium bg-[#EAE5D9]/40 p-3 rounded-xl border border-[#DDD6C4]">
                {currentMeta?.description}
              </p>
            </div>

            <form onSubmit={handleCalculate} className="space-y-4 pt-3 border-t border-[#DDD6C4]">
              <span className="text-xs font-bold text-[#0B132B] uppercase tracking-wider font-mono block">
                Required Numerical Parameters
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentMeta?.inputs.map((inp) => (
                  <div key={inp.key} className="space-y-1.5">
                    <label className="text-xs font-bold text-[#0B132B] flex items-center justify-between">
                      <span>{inp.label}</span>
                      <span className="text-[11px] text-[#2A9D8F] font-mono font-bold px-1.5 py-0.5 rounded bg-[#2A9D8F]/10 border border-[#2A9D8F]/20">
                        {inp.key}
                      </span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formInputs[inp.key] ?? ""}
                      onChange={(e) => handleInputChange(inp.key, e.target.value)}
                      placeholder={inp.placeholder}
                      className="w-full bg-[#FFFFFF] border border-[#DDD6C4] rounded-xl px-3.5 py-2.5 text-sm text-[#0B132B] focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15 font-mono font-semibold transition-all"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <TactileButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isCalculating}
                  isLoading={isCalculating}
                  icon={<Calculator className="w-4 h-4" />}
                >
                  Execute Deterministic Calculation
                </TactileButton>
              </div>
            </form>
          </PremiumCard>

          {/* Results Display Panel (1 col) */}
          <PremiumCard variant="paper" className="p-6 space-y-5 flex flex-col justify-between shadow-card">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#DDD6C4] pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B132B] font-mono flex items-center gap-1.5">
                  <Equal className="w-4 h-4 text-[#D4AF37]" />
                  Verified Readout
                </h3>
                {result && (
                  <span className="px-2.5 py-0.5 rounded-md bg-[#2A9D8F]/10 text-[#2A9D8F] border border-[#2A9D8F]/30 text-[10px] font-mono font-bold">
                    VERIFIED TRUE
                  </span>
                )}
              </div>

              {result ? (
                <div className="space-y-4 animate-reveal">
                  <div className="p-5 rounded-xl bg-[#0B132B] border border-[#1C2541] text-center space-y-1 shadow-md">
                    <span className="text-[11px] text-[#8A95A5] uppercase font-mono tracking-wider font-bold">
                      Calculated Value
                    </span>
                    <div className="text-3xl font-black text-[#D4AF37] tracking-tight font-mono py-1">
                      {typeof result.result === "number" ? result.result.toFixed(4) : result.result}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <span className="text-[#8A95A5] font-bold font-mono text-[11px]">Formula Log:</span>
                    <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#DDD6C4] font-mono text-[#2A9D8F] text-xs break-all font-semibold">
                      {result.formula}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <span className="text-[#8A95A5] font-bold font-mono text-[11px]">Recorded Inputs:</span>
                    <div className="p-3 rounded-xl bg-[#FFFFFF] border border-[#DDD6C4] font-mono text-[#0B132B] text-[11px] space-y-1">
                      {Object.entries(result.inputs).map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center py-0.5 border-b border-[#DDD6C4] last:border-none">
                          <span className="font-semibold text-[#8A95A5]">{k}:</span>
                          <span className="text-[#0B132B] font-bold">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[#8A95A5] space-y-2.5">
                  <div className="w-12 h-12 rounded-xl bg-[#EAE5D9] border border-[#DDD6C4] flex items-center justify-center mx-auto text-[#0B132B]">
                    <Calculator className="w-6 h-6" />
                  </div>
                  <p className="font-medium text-[#8A95A5] max-w-xs mx-auto">
                    Select a financial operation and submit values to inspect the verified formula readout.
                  </p>
                </div>
              )}
            </div>

            {/* RAG Cross-reference */}
            {result && (
              <div className="pt-4 border-t border-[#DDD6C4]">
                <TactileButton
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleSendToRAG}
                  className="w-full"
                  icon={<Sparkles className="w-4 h-4 text-[#D4AF37]" />}
                >
                  <span>Cross-Reference with AI RAG</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#2A9D8F]" />
                </TactileButton>
              </div>
            )}
          </PremiumCard>
        </div>
      </div>
    </AppShell>
  );
}
