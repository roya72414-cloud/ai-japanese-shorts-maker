"use client";

import { useEffect, useState } from "react";
import { Check, Cpu, Mic } from "lucide-react";
import { Button, Card, Segmented } from "@/components/ui";
import { KPI_LABELS, KPI_WEIGHTS } from "@/lib/engine/scoring";
import { CAPTION_TEMPLATES, MOTION_OPTIONS, SUBTITLE_MODES } from "@/lib/templates";
import type { MomentKpis } from "@/db/schema";

type S = { defaultTemplate: string; defaultSubtitleMode: string; defaultMotion: string; minScore: number; shortCount: number; durationPreset: string; outputFormat: string; frameRate: number; sttAvailable?: boolean };

export function SettingsForm() {
  const [s, setS] = useState<S | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(setS);
  }, []);
  if (!s) return <div className="shimmer h-64 rounded-2xl" />;
  const save = async () => {
    setSaving(true);
    const { sttAvailable: _omit, ...body } = s;
    void _omit;
    await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h2 className="text-sm font-bold text-slate-900">Speech-to-text</h2>
        <div className={`mt-3 flex items-start gap-3 rounded-xl p-3 text-sm ${s.sttAvailable ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700"}`}>
          <Mic className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{s.sttAvailable ? "OpenAI Whisper connected" : "Built-in transcript engine"}</p>
            <p className="text-xs opacity-80">{s.sttAvailable ? "Japanese audio is extracted in-browser and transcribed with timestamps via the server-side proxy." : "Set OPENAI_API_KEY in the environment to transcribe real Japanese speech with Whisper. The built-in engine produces a timestamped lesson transcript so the full pipeline still runs."}</p>
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="text-sm font-bold text-slate-900">Auto-select defaults</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div><p className="mb-1.5 text-xs font-semibold text-slate-600">Minimum Score</p><Segmented size="sm" options={[70, 75, 80, 85, 90].map((v) => ({ value: v, label: String(v) }))} value={s.minScore} onChange={(v) => setS({ ...s, minScore: v })} /></div>
          <div><p className="mb-1.5 text-xs font-semibold text-slate-600">Number of Shorts</p><Segmented size="sm" options={[5, 10, 20].map((v) => ({ value: v, label: String(v) }))} value={s.shortCount} onChange={(v) => setS({ ...s, shortCount: v })} /></div>
          <div><p className="mb-1.5 text-xs font-semibold text-slate-600">Duration</p><Segmented size="sm" options={[{ value: "auto", label: "Auto" }, { value: "lt60", label: "<60s" }, { value: "30-45", label: "30–45s" }, { value: "45-60", label: "45–60s" }]} value={s.durationPreset} onChange={(v) => setS({ ...s, durationPreset: v })} /></div>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="text-sm font-bold text-slate-900">Caption & motion defaults</h2>
        <div className="mt-3 space-y-4">
          <div><p className="mb-1.5 text-xs font-semibold text-slate-600">Template</p><div className="flex flex-wrap gap-1.5">{CAPTION_TEMPLATES.map((t) => <button key={t.id} onClick={() => setS({ ...s, defaultTemplate: t.id })} className={`rounded-full border px-3 py-1 text-xs font-semibold ${s.defaultTemplate === t.id ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{t.name}</button>)}</div></div>
          <div><p className="mb-1.5 text-xs font-semibold text-slate-600">Caption mode</p><div className="flex flex-wrap gap-1.5">{SUBTITLE_MODES.map((m) => <button key={m.id} onClick={() => setS({ ...s, defaultSubtitleMode: m.id })} className={`rounded-full border px-3 py-1 text-xs font-semibold ${s.defaultSubtitleMode === m.id ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{m.label}</button>)}</div></div>
          <div><p className="mb-1.5 text-xs font-semibold text-slate-600">Static-image motion</p><Segmented size="sm" options={MOTION_OPTIONS.map((m) => ({ value: m.id, label: m.label }))} value={s.defaultMotion} onChange={(v) => setS({ ...s, defaultMotion: v })} /></div>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Cpu className="h-4 w-4 text-brand-600" /> KPI Moment Engine weights</h2>
        <ul className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          {(Object.keys(KPI_WEIGHTS) as Array<keyof MomentKpis>).map((k) => <li key={k} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="font-medium text-slate-700">{KPI_LABELS[k]}</span><span className="font-bold tabular-nums text-slate-900">{Math.round(KPI_WEIGHTS[k] * 100)}%</span></li>)}
        </ul>
        <p className="mt-3 text-[11px] text-slate-500">Output: 9:16 · 1080 × 1920 · H.264 video + AAC audio (MP4) when supported by the browser, WebM fallback · {s.frameRate} fps.</p>
      </Card>
      <div className="flex items-center gap-3"><Button variant="primary" onClick={save} loading={saving}>Save settings</Button>{saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" /> Saved</span>}</div>
    </div>
  );
}
