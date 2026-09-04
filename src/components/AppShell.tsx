"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Clapperboard,
  Download,
  FolderOpen,
  LayoutDashboard,
  LayoutTemplate,
  Settings,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload Video", icon: Upload },
  { href: "/videos", label: "My Videos", icon: FolderOpen },
  { href: "/moments", label: "AI Best Moments", icon: Sparkles },
  { href: "/shorts", label: "Generated Shorts", icon: Clapperboard },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/exports", label: "Export History", icon: Download },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-ink-900 px-4 text-white">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-pink-500 shadow-lg shadow-brand-500/30">
              <Zap className="h-4 w-4 fill-white text-white" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Japanese Shorts Maker</span>
          </Link>
          <span className="ml-2 hidden rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/70 md:inline">
            AI Long Video → Shorts
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/upload"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-white px-3.5 text-sm font-semibold text-ink-900 transition hover:bg-brand-50"
          >
            <Upload className="h-4 w-4" /> New Project
          </Link>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">
          <nav className="sticky top-14 flex flex-col gap-0.5 p-3">
            <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Workspace</p>
            {NAV.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition",
                    active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-brand-600" : "text-slate-400")} />
                  {item.label}
                </Link>
              );
            })}
            <div className="mx-1 mt-6 rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-3.5">
              <p className="text-xs font-semibold text-brand-700">Moment Engine</p>
              <p className="mt-1 text-[11.5px] leading-snug text-slate-600">
                Prioritizes Japanese educational value over scene changes. Audio + transcript are the primary signal.
              </p>
            </div>
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-slate-200 bg-white py-1.5 lg:hidden">
        {NAV.slice(0, 5).map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-0.5 px-2 text-[10px]", active ? "text-brand-600" : "text-slate-500")}>
              <Icon className="h-5 w-5" />
              {item.label.split(" ")[0]}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
