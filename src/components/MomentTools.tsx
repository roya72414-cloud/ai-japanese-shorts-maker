"use client";

import { Check, Pencil, Play, Sparkles, Subtitles } from "lucide-react";
import type { Moment, MomentKpis } from "@/db/schema";
import { Button, Card, ScoreBadge, Segmented } from "@/components/ui";
import { KPI_LABELS, KPI_WEIGHTS } from "@/lib/engine/scoring";
import { CAPTION_TEMPLATES, SUBTITLE_MODES, getTemplate } from "@/lib/templates";
import { cn, formatTime } from "@/lib/utils";

export function MomentCard({
  moment,
  selected,
  onToggle,
  onPreview,
  onEdit,
  onCreate,
  compact,
  index,
}: {
  moment: Moment;
  selected?: boolean;
  onToggle?: () => void;
  onPreview?: () => void;
  onEdit?: () => void;
  onCreate?: () => void;
  compact?: boolean;
  index?: number;
}) {
  const dur = Math.round(moment.endTime - moment.startTime);
  return (
    <Card className={cn("fade-up flex flex-col p-4 transition", selected && "border-brand-400 ring-2 ring-brand-100")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {onToggle && (
            <button onClick={onToggle} className={cn("grid h-5 w-5 place-items-center rounded-md border transition", selected ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 bg-white text-transparent hover:border-brand-400")}>
              <Check className="h-3.5 w-3.5" />
            </button>
          )}
          <span className="text-lg font-black tracking-tight text-slate-900">#{index ?? moment.rank}</span>
        </div>
        <ScoreBadge score={moment.score} size="lg" />
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <span className="tabular-nums font-medium text-slate-700">{formatTime(moment.startTime)} — {formatTime(moment.endTime)}</span>
        <span>·</span>
        <span>{dur} seconds</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-brand-700">{moment.category}{moment.level ? ` · JLPT ${moment.level}` : ""}</p>
      <p className="jp mt-2 text-[17px] font-semibold leading-snug text-slate-900">「{moment.quoteJa}」</p>
      {moment.quoteEn && <p className="mt-0.5 text-xs text-slate-500">{moment.quoteRomaji && <span className="italic">{moment.quoteRomaji} · </span>}{moment.quoteEn}</p>}
      {!compact && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Why this moment</p>
          <ul className="mt-1.5 space-y-1">
            {moment.reasons.map((r) => (
              <li key={r} className="flex items-center gap-1.5 text-xs text-slate-700"><Check className="h-3.5 w-3.5 text-emerald-500" /> {r}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-auto flex gap-2 pt-4">
        {onPreview && <Button size="sm" onClick={onPreview} className="flex-1"><Play className="h-3.5 w-3.5" /> Preview</Button>}
        {onEdit && <Button size="sm" onClick={onEdit} className="flex-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>}
        {onCreate && <Button size="sm" variant="primary" onClick={onCreate} className="flex-1"><Sparkles className="h-3.5 w-3.5" /> Create Short</Button>}
      </div>
    </Card>
  );
}

export function KpiBreakdown({ kpis }: { kpis: MomentKpis }) {
  return (
    <div className="space-y-2">
      {(Object.keys(KPI_WEIGHTS) as Array<keyof MomentKpis>).map((k) => (
        <div key={k} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs">
          <div>
            <div className="flex justify-between">
              <span className="font-medium text-slate-700">{KPI_LABELS[k]}</span>
              <span className="text-slate-400">× {Math.round(KPI_WEIGHTS[k] * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${kpis[k]}%` }} />
            </div>
          </div>
          <span className="w-8 text-right font-bold tabular-nums text-slate-900">{kpis[k]}</span>
        </div>
      ))}
    </div>
  );
}

export type AutoSelectState = {
  count: number | "custom";
  customCount: number;
  minScore: number;
  duration: "auto" | "lt60" | "30-45" | "45-60";
};

export function AutoSelectControls({ state, onChange }: { state: AutoSelectState; onChange: (s: AutoSelectState) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div>
        <p className="mb-1.5 text-xs font-semibold text-slate-600">Number of Shorts</p>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            size="sm"
            options={[{ value: 5, label: "5" }, { value: 10, label: "10" }, { value: 20, label: "20" }, { value: "custom", label: "Custom" }]}
            value={state.count}
            onChange={(v) => onChange({ ...state, count: v as AutoSelectState["count"] })}
          />
          {state.count === "custom" && (
            <input type="number" min={1} max={50} value={state.customCount} onChange={(e) => onChange({ ...state, customCount: Number(e.target.value) || 1 })} className="h-8 w-16 rounded-lg border border-slate-200 px-2 text-sm" />
          )}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-slate-600">Minimum Score</p>
        <Segmented size="sm" options={[70, 75, 80, 85, 90].map((v) => ({ value: v, label: String(v) }))} value={state.minScore} onChange={(v) => onChange({ ...state, minScore: v })} />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-slate-600">Duration</p>
        <Segmented
          size="sm"
          options={[{ value: "auto", label: "Auto" }, { value: "lt60", label: "<60s" }, { value: "30-45", label: "30–45s" }, { value: "45-60", label: "45–60s" }]}
          value={state.duration}
          onChange={(v) => onChange({ ...state, duration: v })}
        />
      </div>
    </div>
  );
}

export function applyAutoSelect(all: Moment[], s: AutoSelectState): Moment[] {
  const n = s.count === "custom" ? s.customCount : s.count;
  return all
    .filter((m) => m.score >= s.minScore)
    .filter((m) => {
      const d = m.endTime - m.startTime;
      if (s.duration === "lt60") return d < 60;
      if (s.duration === "30-45") return d >= 30 && d <= 45;
      if (s.duration === "45-60") return d >= 45 && d <= 60;
      return true;
    })
    .slice(0, n);
}

export function TemplateSelector({ value, onChange, subtitleMode, onSubtitleMode, hasBurnedSubtitles }: { value: string; onChange: (id: string) => void; subtitleMode: string; onSubtitleMode: (m: string) => void; hasBurnedSubtitles: boolean }) {
  return (
    <div>
      <div className="no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {CAPTION_TEMPLATES.map((t) => (
          <button key={t.id} onClick={() => onChange(t.id)} className={cn("group w-[132px] shrink-0 snap-start text-left", value === t.id ? "" : "opacity-90 hover:opacity-100")}>
            <div className={cn("relative aspect-[9/16] overflow-hidden rounded-xl border-2 transition", value === t.id ? "border-brand-500 shadow-lg shadow-brand-500/20" : "border-transparent")} style={{ background: `linear-gradient(180deg, ${t.bg} 0%, ${t.bg2} 55%, ${t.bg} 100%)` }}>
              <div className="absolute left-2 top-2 rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ background: t.accent, color: t.id === "vocabulary" ? "#fff" : "#0b0b12" }}>{t.badge ?? "Aa"}</div>
              <div className="absolute left-3 right-3 top-8 rounded-md px-1 py-1 text-center text-[8px] font-bold leading-tight" style={{ background: t.pillStyle === "none" ? "transparent" : t.hookBg, color: t.hookColor }}>Japanese You&apos;ll Actually Use</div>
              <div className="absolute left-3 right-3 top-[38%] aspect-video rounded-md bg-slate-500/50" />
              <div className="absolute inset-x-2 bottom-5 text-center">
                <p className="jp text-[11px] font-black leading-tight" style={{ color: t.jaColor, textShadow: `0 1px 2px ${t.jaStroke}` }}>あそこで買えます</p>
                <p className="text-[7px]" style={{ color: t.romajiColor }}>asoko de kaemasu</p>
                <p className="text-[7px]" style={{ color: t.enColor }}>You can buy it there</p>
              </div>
              {value === t.id && <div className="absolute right-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-brand-500 text-white"><Check className="h-2.5 w-2.5" /></div>}
            </div>
            <p className={cn("mt-1.5 truncate text-center text-xs font-semibold", value === t.id ? "text-brand-700" : "text-slate-700")}>{t.name}</p>
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">{getTemplate(value).description}</p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Subtitles className="h-3.5 w-3.5 text-brand-600" /> Generated captions</div>
        {hasBurnedSubtitles && (
          <p className="mt-1 text-[11.5px] text-emerald-700">Burned-in subtitles detected. They are preserved in the frame and generated captions are placed below the video, never over them.</p>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUBTITLE_MODES.map((m) => (
            <button key={m.id} onClick={() => onSubtitleMode(m.id)} title={m.desc} className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", subtitleMode === m.id ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand-300")}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
