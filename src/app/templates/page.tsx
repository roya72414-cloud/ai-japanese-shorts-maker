import { Check } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { CAPTION_TEMPLATES, SUBTITLE_MODES } from "@/lib/templates";

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
      <PageHeader title="Templates" subtitle="Caption styles applied on export. Burned-in subtitles are always detected and preserved — generated captions render below the video, never on top." />
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        {CAPTION_TEMPLATES.map((t) => (
          <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="relative aspect-[9/16] overflow-hidden rounded-xl" style={{ background: `linear-gradient(180deg, ${t.bg} 0%, ${t.bg2} 55%, ${t.bg} 100%)` }}>
              <div className="absolute left-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: t.accent, color: t.id === "vocabulary" ? "#fff" : "#0b0b12" }}>{t.badge ?? "Aa"}</div>
              <div className="absolute left-4 right-4 top-12 rounded-lg px-2 py-1.5 text-center text-[11px] font-bold leading-tight" style={{ background: t.pillStyle === "none" ? "transparent" : t.hookBg, color: t.hookColor }}>Japanese You&apos;ll Actually Use</div>
              <div className="absolute left-4 right-4 top-[36%] aspect-video rounded-lg bg-slate-400/40" />
              <div className="absolute inset-x-3 bottom-8 text-center">
                <p className="jp text-[15px] font-black leading-tight" style={{ color: t.jaColor, textShadow: `0 1px 3px ${t.jaStroke}` }}>あそこの券売機で買えます</p>
                <p className="mt-0.5 text-[9px]" style={{ color: t.romajiColor }}>Asoko no kenbaiki de kaemasu</p>
                <p className="text-[9px]" style={{ color: t.enColor }}>You can buy it at that machine</p>
              </div>
            </div>
            <p className="mt-2.5 text-sm font-bold text-slate-900">{t.name}</p>
            <p className="text-xs text-slate-500">{t.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-slate-900">Caption modes</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {SUBTITLE_MODES.map((m) => (
            <li key={m.id} className="rounded-xl bg-slate-50 p-3 text-xs"><p className="flex items-center gap-1.5 font-semibold text-slate-800"><Check className="h-3.5 w-3.5 text-emerald-500" />{m.label}</p><p className="mt-0.5 text-slate-500">{m.desc}</p></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
