"use client";

import Link from "next/link";
import { X } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn, scoreColor } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "dark";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
};

export function Button({ variant = "secondary", size = "md", loading, className, children, disabled, ...rest }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-[15px]" };
  const variants = {
    primary: "bg-brand-500 text-white shadow-md shadow-brand-500/25 hover:bg-brand-600",
    secondary: "border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
    dark: "bg-ink-900 text-white hover:bg-ink-700",
  };
  return (
    <button className={cn(base, sizes[size], variants[variant], className)} disabled={disabled || loading} {...rest}>
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function LinkButton({ href, className, children, variant = "secondary", size = "md" }: { href: string; className?: string; children: ReactNode; variant?: ButtonProps["variant"]; size?: ButtonProps["size"] }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition";
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-[15px]" };
  const variants = {
    primary: "bg-brand-500 text-white shadow-md shadow-brand-500/25 hover:bg-brand-600",
    secondary: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
    dark: "bg-ink-900 text-white hover:bg-ink-700",
  };
  return (
    <Link href={href} className={cn(base, sizes[size], variants[variant!], className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]", className)}>{children}</div>;
}

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "px-2 py-0.5 text-[11px]", md: "px-2.5 py-1 text-xs", lg: "px-3 py-1.5 text-sm" }[size];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border font-bold tabular-nums", s, scoreColor(score))}>
      {score}
      <span className="font-semibold opacity-70">SCORE</span>
    </span>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange, className, size = "md" }: { options: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void; className?: string; size?: "sm" | "md" }) {
  return (
    <div className={cn("inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md font-semibold transition",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
            value === o.value ? "bg-white text-ink-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value, className, color = "bg-brand-500" }: { value: number; className?: string; color?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div className={cn("h-full rounded-full transition-all duration-300", color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={cn("fade-up max-h-[92vh] w-full overflow-auto rounded-2xl bg-white shadow-2xl", wide ? "max-w-5xl" : "max-w-2xl")} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    uploaded: "bg-slate-100 text-slate-600",
    analyzing: "bg-amber-50 text-amber-700",
    analyzed: "bg-emerald-50 text-emerald-700",
    waiting: "bg-slate-100 text-slate-600",
    rendering: "bg-brand-50 text-brand-700",
    complete: "bg-emerald-50 text-emerald-700",
    failed: "bg-rose-50 text-rose-700",
    draft: "bg-sky-50 text-sky-700",
  };
  const label: Record<string, string> = { uploaded: "Ready to analyze", analyzing: "Analyzing", analyzed: "Analyzed", waiting: "Waiting", rendering: "Rendering", complete: "Complete", failed: "Failed", draft: "Draft" };
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", map[status] ?? "bg-slate-100 text-slate-600")}>
    {status === "rendering" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" />}
    {label[status] ?? status}
  </span>;
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
