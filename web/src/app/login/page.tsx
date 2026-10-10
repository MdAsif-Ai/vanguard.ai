"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { LoginRequest } from "@/types";
import { Layers, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

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
    <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-[#CBF3F0] shadow-[8px_16px_36px_rgba(46,196,182,0.12),-4px_-4px_16px_rgba(255,255,255,0.95)] relative">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Sign In to Workspace</h2>
        <p className="text-xs text-slate-500 mt-1">
          Enter your credentials to access the auditable reasoning engine.
        </p>
      </div>

      {/* Error notification */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Work Email</span>
            <span className="text-[11px] text-slate-400 font-medium">Required</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#2EC4B6]">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              id="email"
              {...register("email", { required: "Email is required" })}
              placeholder="analyst@vanguardai.dev"
              disabled={isSubmitting}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#CBF3F0] rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2EC4B6] focus:ring-4 focus:ring-[#2EC4B6]/15 shadow-[inset_1px_2px_4px_rgba(0,0,0,0.03)] transition-all disabled:opacity-50"
            />
          </div>
          {errors.email && (
            <p className="text-[11px] text-rose-600 font-medium">{errors.email.message}</p>
          )}
        </div>

        {/* Password input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
            <span>Password</span>
            <span className="text-[11px] text-[#2EC4B6] font-mono font-semibold">JWT Authenticated</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#2EC4B6]">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              id="password"
              {...register("password", { required: "Password is required" })}
              placeholder="••••••••••••"
              disabled={isSubmitting}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#CBF3F0] rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2EC4B6] focus:ring-4 focus:ring-[#2EC4B6]/15 shadow-[inset_1px_2px_4px_rgba(0,0,0,0.03)] transition-all disabled:opacity-50"
            />
          </div>
          {errors.password && (
            <p className="text-[11px] text-rose-600 font-medium">{errors.password.message}</p>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          id="login-submit-btn"
          disabled={isSubmitting}
          className="w-full mt-2 py-3 px-4 bg-[#FF9F1C] hover:bg-[#FFBF69] active:translate-y-0.5 text-white text-sm font-bold rounded-xl shadow-[0_6px_20px_rgba(255,159,28,0.38)] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 group"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              <span>Verifying Credentials...</span>
            </>
          ) : (
            <>
              <span>Sign In to Platform</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Demo Quick-fill Hint */}
      <div className="mt-6 pt-5 border-t border-[#CBF3F0] flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2EC4B6]" />
          <span>Dev Admin Profile</span>
        </div>
        <button
          type="button"
          onClick={handleFillDemoCreds}
          className="text-[#FF9F1C] hover:text-[#FFBF69] font-mono text-[11px] font-bold hover:underline"
        >
          Use dev credentials
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F4F9F8] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#CBF3F0]/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#FFBF69]/25 rounded-full blur-3xl pointer-events-none" />

      {/* Brand logo header */}
      <div className="w-full max-w-md text-center mb-8 space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#FF9F1C] to-[#FFBF69] shadow-[0_6px_20px_rgba(255,159,28,0.38)] mb-2">
          <Layers className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          VANGUARD<span className="text-[#FF9F1C]">.AI</span>
        </h1>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-mono font-semibold">
          Self-Hosted Financial Intelligence Platform
        </p>
      </div>

      <Suspense fallback={<LoadingSpinner size="lg" label="Loading sign-in interface..." />}>
        <LoginForm />
      </Suspense>

      {/* Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-500 space-y-1">
        <p>Stateless Bearer JWT • 60-Minute Session Lifespan • 30 req/min Rate Limit</p>
        <p className="font-mono text-[11px] text-slate-600 font-semibold">API: http://localhost:8000</p>
      </div>
    </div>
  );
}
