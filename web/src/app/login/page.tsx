"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { LoginRequest } from "@/types";
import {
  Layers,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Database,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { TactileButton } from "@/components/ui/TactileButton";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const { login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginRequest>({
    defaultValues: {
      email: "admin@vanguardai.dev",
      password: "mydevpass123",
    },
  });

  const onSubmit = async (data: LoginRequest) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await login(data);
      router.push(redirectPath);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setErrorMessage("Incorrect email or password.");
      } else if (err.response?.data?.detail) {
        setErrorMessage(
          typeof err.response.data.detail === "string"
            ? err.response.data.detail
            : "Login failed. Please check credentials."
        );
      } else if (err.message) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Unable to connect to the authentication service.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemoCreds = () => {
    setValue("email", "admin@vanguardai.dev");
    setValue("password", "mydevpass123");
  };

  return (
    <div className="w-full max-w-md p-8 sm:p-9 bg-[#FFFFFF] border border-[#DDD6C4] rounded-2xl shadow-feature space-y-6">
      {/* Form Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#0B132B] tracking-tight font-serif">
          Workstation Sign In
        </h2>
        <p className="text-xs text-[#8A95A5] mt-1.5 font-medium leading-relaxed">
          Access your organization&apos;s financial research workspace, indexed SEC filings, and deterministic reasoning engine.
        </p>
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-reveal">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#0B132B] flex items-center justify-between">
            <span>Work Email</span>
            <span className="text-[10px] text-[#8A95A5] font-medium font-mono uppercase">Corporate SSO / Local</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2A9D8F]">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              id="email"
              {...register("email", { required: "Email is required" })}
              placeholder="analyst@vanguardai.dev"
              disabled={isSubmitting}
              className="w-full pl-10 pr-3.5 py-3 bg-[#FFFFFF] border border-[#DDD6C4] rounded-xl text-sm text-[#0B132B] placeholder-[#8A95A5] focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15 transition-all disabled:opacity-50 font-medium"
            />
          </div>
          {errors.email && (
            <p className="text-[11px] text-rose-600 font-semibold">{errors.email.message}</p>
          )}
        </div>

        {/* Password input */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#0B132B] flex items-center justify-between">
            <span>Security Credential</span>
            <span className="text-[10px] text-[#2A9D8F] font-mono font-bold bg-[#2A9D8F]/10 px-2 py-0.5 rounded border border-[#2A9D8F]/20">
              JWT HS256
            </span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#2A9D8F]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              id="password"
              {...register("password", { required: "Password is required" })}
              placeholder="••••••••••••"
              disabled={isSubmitting}
              className="w-full pl-10 pr-3.5 py-3 bg-[#FFFFFF] border border-[#DDD6C4] rounded-xl text-sm text-[#0B132B] placeholder-[#8A95A5] focus:outline-none focus:border-[#D4AF37] focus:ring-4 focus:ring-[#D4AF37]/15 transition-all disabled:opacity-50 font-medium"
            />
          </div>
          {errors.password && (
            <p className="text-[11px] text-rose-600 font-semibold">{errors.password.message}</p>
          )}
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <TactileButton
            type="submit"
            id="login-submit-btn"
            variant="primary"
            size="lg"
            className="w-full py-3.5 rounded-xl font-bold shadow-gold-btn text-[#0B132B]"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            icon={!isSubmitting ? <ArrowRight className="w-4 h-4 text-[#0B132B]" /> : undefined}
          >
            {isSubmitting ? "Authenticating Session..." : "Sign In to Financial Terminal"}
          </TactileButton>
        </div>
      </form>

      {/* Demo Quick-fill Hint */}
      <div className="pt-4 border-t border-[#DDD6C4] flex items-center justify-between text-xs text-[#8A95A5]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2A9D8F]" />
          <span className="font-medium text-[#0B132B]">Development Profile</span>
        </div>
        <button
          type="button"
          onClick={handleFillDemoCreds}
          className="text-[#0B132B] hover:text-[#D4AF37] font-mono text-[11px] font-bold underline hover:no-underline cursor-pointer transition-colors"
        >
          Auto-fill dev credentials
        </button>
      </div>

      {/* Security guarantees */}
      <div className="pt-2 grid grid-cols-2 gap-2 text-[10px] text-[#8A95A5] font-mono border-t border-[#DDD6C4]/60">
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-[#2A9D8F]" />
          <span>Stateless Token</span>
        </div>
        <div className="flex items-center gap-1 text-right justify-end">
          <CheckCircle2 className="w-3 h-3 text-[#2A9D8F]" />
          <span>30 Req / Min</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#F4F1EA] text-[#0B132B] relative overflow-hidden">
      {/* LEFT COLUMN: 3D HERO VISUAL SHOWCASE WITH AMBIENT ANIMATION */}
      <div className="lg:col-span-7 bg-[#0B132B] relative flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-hidden border-r border-[#1C2541]/80 shadow-sidebar-soft">
        {/* Subtle grid texture overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #D4AF37 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Ambient atmospheric radial glows */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#D4AF37]/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#2A9D8F]/20 rounded-full blur-[110px] pointer-events-none" />

        {/* Top Branding Section */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D4AF37] to-[#FAF6E8] flex items-center justify-center shadow-[0_4px_16px_rgba(212,175,55,0.35)]">
              <Layers className="w-5 h-5 text-[#0B132B]" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-wider text-[#F4F1EA] flex items-center gap-1 font-serif">
                VANGUARD<span className="text-[#D4AF37]">.AI</span>
              </span>
              <span className="block text-[10px] text-[#A7B3C6] font-mono uppercase tracking-widest font-semibold">
                Financial Intelligence Platform
              </span>
            </div>
          </div>

          {/* System status pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C2541] border border-[#2A9D8F]/30 text-[11px] font-mono text-[#2A9D8F] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#2A9D8F] animate-pulse" />
            <span>CLUSTER ONLINE</span>
          </div>
        </div>

        {/* Center Showcase: Animated 3D Artwork Container */}
        <div className="relative z-10 my-8 sm:my-10 flex flex-col items-center justify-center">
          <div className="relative w-full max-w-xl group">
            {/* Ambient animated glow ring behind image */}
            <div className="absolute -inset-1.5 rounded-[28px] bg-gradient-to-r from-[#D4AF37]/30 via-[#2A9D8F]/20 to-[#D4AF37]/30 opacity-70 blur-xl hero-shimmer" />

            {/* Terminal Frame with Float Animation */}
            <div className="relative rounded-[24px] overflow-hidden border border-[#1C2541] bg-[#060A17] shadow-2xl hero-floating">
              <Image
                src="/assets/vanguard_terminal_hero.jpg"
                alt="VANGUARD.AI Financial Intelligence 3D Terminal Visualization"
                width={1200}
                height={675}
                priority
                className="w-full h-auto object-cover transform transition-transform duration-1000 group-hover:scale-105"
              />

              {/* Luminous gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B132B] via-transparent to-black/30 pointer-events-none" />

              {/* Floating Glassmorphic Telemetry Overlay: Top Left */}
              <div className="absolute top-4 left-4 p-2.5 sm:p-3 rounded-xl bg-[#0B132B]/85 backdrop-blur-md border border-[#D4AF37]/30 shadow-lg flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#2A9D8F] animate-ping" />
                <span className="text-[10px] sm:text-[11px] font-mono font-bold text-[#D4AF37]">
                  REASONING WORKSTATION V2.4
                </span>
              </div>

              {/* Floating Glassmorphic Telemetry Overlay: Bottom Left */}
              <div className="absolute bottom-4 left-4 right-4 sm:right-auto p-3 sm:p-3.5 rounded-xl bg-[#0B132B]/90 backdrop-blur-md border border-white/10 shadow-xl max-w-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#D4AF37] font-bold flex items-center gap-1">
                    <Database className="w-3 h-3 text-[#2A9D8F]" />
                    Vector Ingestion
                  </span>
                  <span className="text-[10px] text-[#2A9D8F] font-mono font-bold">Qdrant Top-K</span>
                </div>
                <div className="text-xs font-semibold text-[#F4F1EA]">
                  10-K, 10-Q & Transcripts Grounded
                </div>
                <div className="text-[10px] text-[#A7B3C6] font-mono">
                  100% Auditable Page Footnote Citations
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Editorial Caption */}
        <div className="relative z-10 pt-2 border-t border-[#1C2541]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#F4F1EA] font-serif">
              Institutional AI Financial Research
            </h3>
            <p className="text-[#8A95A5] text-[11px] max-w-md leading-relaxed font-medium">
              Deterministic reasoning engine and vector indexing across SEC filings with verifiable cosine grounding and zero hallucination.
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px] text-[#A7B3C6]">
            <span>FastAPI • Qdrant • vLLM</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: WORKSTATION AUTHENTICATION PORTAL */}
      <div className="lg:col-span-5 bg-[#F4F1EA] flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 relative overflow-y-auto">
        {/* Subtle decorative background blur on ivory side */}
        <div className="absolute top-1/4 -right-20 w-80 h-80 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md space-y-6 animate-reveal">
          {/* Mobile-only logo header */}
          <div className="lg:hidden text-center space-y-2 mb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0B132B] border border-[#1C2541] shadow-md">
              <Layers className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <h1 className="text-2xl font-bold text-[#0B132B] font-serif">
              VANGUARD<span className="text-[#D4AF37]">.AI</span>
            </h1>
          </div>

          <Suspense fallback={<LoadingSpinner size="lg" label="Loading sign-in interface..." />}>
            <LoginForm />
          </Suspense>

          {/* Footer note */}
          <div className="text-center text-[11px] text-[#8A95A5] font-mono space-y-1 pt-2">
            <p>Protected by Enterprise-Grade Stateless JWT • TLS 1.3</p>
            <p className="text-[#0B132B] font-semibold">Institutional Financial Workstation</p>
          </div>
        </div>
      </div>
    </div>
  );
}
