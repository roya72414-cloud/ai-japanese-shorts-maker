"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Pause, Play, RefreshCw, Save, Sparkles } from "lucide-react";
import type { Moment, Short, TranscriptSegment, Video } from "@/db/schema";
import { OUT_H, OUT_W, ShortComposer, renderShort } from "@/lib/client/renderer";
import { CAPTION_TEMPLATES, MOTION_OPTIONS, SUBTITLE_MODES } from "@/lib/templates";
import { Button, Card, Progress, ScoreBadge, Segmented, StatusPill } from "@/components/ui";
import { downloadShort } from "@/components/ShortCard";
import { clamp, cn, fileUrl, formatTime } from "@/lib/utils";

type Props = { short: Short; video: Video; moment: Moment | null; segments: TranscriptSegment[] };

const HOOK_LIBRARY: Record<string, string[]> = {
  default: ["Can You Understand This Japanese?", "Japanese You'll Actually Use", "Learn This Useful Japanese Phrase"],
  "JLPT Grammar": ["Learn This Useful Japanese Phrase", "Grammar Point You'll Hear Every Day", "How Would You Say This in Japanese?"],
  "Travel Japanese": ["Japanese You Need Before Your Trip", "Japanese You'll Actually Use", "Can You Understand This Japanese?"],
  "Daily Japanese": ["Japanese You'll Actually Use", "Real Japanese, Real Situations", "Can You Understand This Japanese?"],
  Vocabulary: ["Can You Count in Japanese?", "Learn This Useful Japanese Phrase", "Beginner Japanese Listening Challenge"],
  "Natural Japanese Conversation": ["Can You Understand This Japanese?", "Beginner Japanese Listening Challenge", "How Would You Say This in Japanese?"],
  "Listening Practice": ["Beginner Japanese Listening Challenge", "Can You Understand This Japanese?"],
  "Polite Japanese": ["Polite Japanese You'll Actually Use", "How Would You Say This in Japanese?"],
  "Practical Japanese": ["Japanese You'll Actually Use", "Learn This Useful Japanese Phrase"],
};

export function ShortEditor({ short: initial, video, moment, segments }: Props) {
  const router = useRouter();
  const [s, setS] = useState<Short>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(initial.startTime);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const composerRef = useRef<ShortComposer | null>(null);
  const rafRef = useRef(0);

  const src = fileUrl(video.storagePath);
  const clipSegs = useMemo(() => segments.filter((x) => x.end >= s.startTime && x.start <= s.endTime), [segments, s.startTime, s.endTime]);
  const level = moment?.level ?? clipSegs.find((x) => x.level)?.level ?? null;

  const opts = useMemo(
    () => ({
      startTime: s.startTime,
      endTime: s.endTime,
      templateId: s.template,
      subtitleMode: s.subtitleMode,
      crop: s.crop,
      zoom: s.zoom,
      motion: s.motion,
      hook: s.hook,
      segments: clipSegs,
      subtitleArea: video.subtitleArea,
      preserveBurnedSubtitles: video.hasBurnedSubtitles,
      level,
    }),
    [s, clipSegs, video.subtitleArea, video.hasBurnedSubtitles, level],
  );

  const drawNow = useCallback(() => {
    const c = canvasRef.current;
    const v = videoRef.current;
    if (!c || !v || v.readyState < 2) return;
    if (!composerRef.current) composerRef.current = new ShortComposer(opts);
    else composerRef.current.setOptions(opts);
    composerRef.current.draw(c.getContext("2d")!, v, v.currentTime);
  }, [opts]);

  // Redraw when settings change while paused
  useEffect(() => {
    if (!playing) drawNow();
  }, [opts, playing, drawNow]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onReady = () => {
      v.currentTime = s.startTime;
    };
    const onSeeked = () => drawNow();
    v.addEventListener("loadeddata", onReady);
    v.addEventListener("seeked", onSeeked);
    return () => {
      v.removeEventListener("loadeddata", onReady);
      v.removeEventListener("seeked", onSeeked);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!playing) return;
    const v = videoRef.current!;
    const tick = () => {
      drawNow();
      setTime(v.currentTime);
      if (v.currentTime >= s.endTime) {
        v.pause();
        setPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, drawNow, s.endTime]);

  const togglePlay = async () => {
    const v = videoRef.current!;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      if (v.currentTime < s.startTime || v.currentTime >= s.endTime - 0.05) v.currentTime = s.startTime;
      await v.play();
      setPlaying(true);
    }
  };

  const update = (patch: Partial<Short>) => {
    setS((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };
  const seek = (t: number) => {
    const v = videoRef.current!;
    v.currentTime = t;
    setTime(t);
  };

  const save = async () => {
    setSaving(true);
    const { title, hook, description, hashtags, startTime, endTime, template, subtitleMode, crop, zoom, motion } = s;
    const res = await fetch(`/api/shorts/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, hook, description, hashtags, startTime, endTime, template, subtitleMode, crop, zoom, motion, status: s.status === "draft" ? "draft" : s.status }) });
    const row = await res.json();
    setS((prev) => ({ ...prev, ...row }));
    setDirty(false);
    setSaving(false);
  };

  const exportShort = async () => {
    if (playing) await togglePlay();
    setExporting(true);
    setError("");
    setExportProgress(0);
    try {
      if (dirty) await save();
      await fetch(`/api/shorts/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rendering", progress: 0 }) });
      setS((p) => ({ ...p, status: "rendering" }));
      const result = await renderShort(src, opts, (p) => setExportProgress(Math.round(p * 100)));
      const up = await fetch(`/api/shorts/${s.id}/render?format=${result.format}`, { method: "POST", body: result.blob, headers: { "Content-Type": result.mime } });
      const row = (await up.json()) as Short;
      setS((p) => ({ ...p, ...row }));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
      await fetch(`/api/shorts/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "failed" }) });
      setS((p) => ({ ...p, status: "failed" }));
    } finally {
      setExporting(false);
    }
  };

  const regenerate = () => {
    const pool = HOOK_LIBRARY[s.category] ?? HOOK_LIBRARY.default;
    const next = pool[(pool.indexOf(s.hook) + 1) % pool.length] ?? pool[0];
    const quote = moment?.quoteJa ?? clipSegs[0]?.ja ?? "";
    const baseTitle = s.title.split(" | ")[0];
    const altTitle = s.title.includes(" | ") ? `${quote} — ${baseTitle}` : `${baseTitle} | ${quote}`;
    update({ hook: next, title: altTitle });
  };

  const dur = s.endTime - s.startTime;
  const minT = Math.max(0, (moment?.startTime ?? s.startTime) - 20);
  const maxT = Math.min(video.duration, (moment?.endTime ?? s.endTime) + 20);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/videos/${video.id}`} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Short Editor</h1>
            <p className="text-xs text-slate-500">{video.name} · <StatusPill status={s.status} /></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={regenerate}><RefreshCw className="h-4 w-4" /> Regenerate</Button>
          <Button onClick={save} loading={saving} disabled={!dirty}><Save className="h-4 w-4" /> Save</Button>
          <Button variant="primary" onClick={exportShort} loading={exporting}><Sparkles className="h-4 w-4" /> {exporting ? `Rendering ${exportProgress}%` : "Export"}</Button>
          {s.status === "complete" && s.outputPath && <Button variant="dark" onClick={() => downloadShort({ ...s, videoName: video.name })}><Download className="h-4 w-4" /> Download</Button>}
        </div>
      </div>
      {exporting && <Progress value={exportProgress} className="mb-4" />}
      {error && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left: preview */}
        <Card className="flex flex-col items-center bg-ink-900 p-6">
          <div className="relative w-full max-w-[340px]">
            <canvas ref={canvasRef} width={OUT_W} height={OUT_H} className="aspect-[9/16] w-full rounded-2xl bg-black shadow-2xl" />
            <video ref={videoRef} src={src} preload="auto" playsInline crossOrigin="anonymous" className="hidden" onLoadedData={drawNow} />
            <button onClick={togglePlay} className="absolute inset-0 grid place-items-center">
              {!playing && <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-ink-900 shadow-xl"><Play className="ml-1 h-7 w-7 fill-current" /></span>}
            </button>
          </div>
          <div className="mt-4 flex w-full max-w-[340px] items-center gap-3 text-white">
            <button onClick={togglePlay} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">{playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}</button>
            <input type="range" className="slider flex-1" min={s.startTime} max={s.endTime} step={0.05} value={clamp(time, s.startTime, s.endTime)} onChange={(e) => seek(Number(e.target.value))} style={{ ["--p" as string]: `${((clamp(time, s.startTime, s.endTime) - s.startTime) / Math.max(0.1, dur)) * 100}%` }} />
            <span className="w-20 text-right text-xs tabular-nums text-white/70">{formatTime(time, false)} / {Math.round(dur)}s</span>
          </div>
          <p className="mt-3 text-[11px] text-white/50">9:16 · 1080 × 1920 · H.264 + AAC (MP4) · live composited preview</p>
        </Card>

        {/* Right: info + controls */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">Short information</p>
              <ScoreBadge score={s.score} size="lg" />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Row k="Score" v={`${s.score}/100`} />
              <Row k="Category" v={s.category} />
              <Row k="Duration" v={`${Math.round(dur)} sec`} />
              <Row k="Source" v={`${formatTime(s.startTime, false)}–${formatTime(s.endTime, false)}`} />
            </dl>
            <div className="mt-3 rounded-xl bg-brand-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">Hook</p>
              <p className="text-sm font-semibold text-slate-900">“{s.hook}”</p>
            </div>
          </Card>

          <Card className="divide-y divide-slate-100">
            <Section title="Start / End">
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Start · ${formatTime(s.startTime)}`}>
                  <input type="range" className="slider w-full" min={minT} max={s.endTime - 5} step={0.1} value={s.startTime} onChange={(e) => { update({ startTime: Number(e.target.value) }); seek(Number(e.target.value)); }} style={{ ["--p" as string]: `${((s.startTime - minT) / Math.max(0.1, s.endTime - 5 - minT)) * 100}%` }} />
                </Field>
                <Field label={`End · ${formatTime(s.endTime)}`}>
                  <input type="range" className="slider w-full" min={s.startTime + 5} max={maxT} step={0.1} value={s.endTime} onChange={(e) => { update({ endTime: Number(e.target.value) }); seek(Number(e.target.value) - 0.5); }} style={{ ["--p" as string]: `${((s.endTime - s.startTime - 5) / Math.max(0.1, maxT - s.startTime - 5)) * 100}%` }} />
                </Field>
              </div>
              <div className="mt-2 flex gap-1.5 text-[11px]">
                {[-1, -0.5, 0.5, 1].map((d) => <button key={"s" + d} onClick={() => update({ startTime: clamp(s.startTime + d, minT, s.endTime - 5) })} className="rounded-md border border-slate-200 px-2 py-0.5 hover:bg-slate-50">Start {d > 0 ? "+" : ""}{d}s</button>)}
                {[-1, 1].map((d) => <button key={"e" + d} onClick={() => update({ endTime: clamp(s.endTime + d, s.startTime + 5, maxT) })} className="rounded-md border border-slate-200 px-2 py-0.5 hover:bg-slate-50">End {d > 0 ? "+" : ""}{d}s</button>)}
              </div>
            </Section>

            <Section title="Crop">
              <Segmented size="sm" value={s.crop.layout} onChange={(v) => update({ crop: { ...s.crop, layout: v } })} options={[{ value: "fit", label: "Safe fit" }, { value: "top", label: "Top" }, { value: "fill", label: "Fill 9:16" }]} />
              {s.crop.layout === "fill" ? (
                <>
                  <p className="mt-2 text-[11px] text-amber-700">Fill crops the sides — burned-in subtitles may be cut. Pan horizontally:</p>
                  <input type="range" className="slider mt-1 w-full" min={-1} max={1} step={0.01} value={s.crop.offsetX} onChange={(e) => update({ crop: { ...s.crop, offsetX: Number(e.target.value) } })} style={{ ["--p" as string]: `${((s.crop.offsetX + 1) / 2) * 100}%` }} />
                </>
              ) : (
                <>
                  <p className="mt-2 text-[11px] text-slate-500">Full frame preserved (no subtitle loss). Vertical position:</p>
                  <input type="range" className="slider mt-1 w-full" min={-1} max={1} step={0.01} value={s.crop.offsetY} onChange={(e) => update({ crop: { ...s.crop, offsetY: Number(e.target.value) } })} style={{ ["--p" as string]: `${((s.crop.offsetY + 1) / 2) * 100}%` }} />
                </>
              )}
            </Section>

            <Section title={`Zoom · ${s.zoom.toFixed(2)}×`}>
              <input type="range" className="slider w-full" min={0.85} max={1.4} step={0.01} value={s.zoom} onChange={(e) => update({ zoom: Number(e.target.value) })} style={{ ["--p" as string]: `${((s.zoom - 0.85) / 0.55) * 100}%` }} />
            </Section>

            <Section title="Motion">
              <div className="flex flex-wrap gap-1.5">
                {MOTION_OPTIONS.map((m) => <Chip key={m.id} active={s.motion === m.id} onClick={() => update({ motion: m.id })}>{m.label}</Chip>)}
              </div>
            </Section>

            <Section title="Subtitle">
              <div className="flex flex-wrap gap-1.5">
                {SUBTITLE_MODES.map((m) => <Chip key={m.id} active={s.subtitleMode === m.id} onClick={() => update({ subtitleMode: m.id })}>{m.label}</Chip>)}
              </div>
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                {CAPTION_TEMPLATES.map((t) => (
                  <button key={t.id} onClick={() => update({ template: t.id })} className={cn("shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold", s.template === t.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-600")} style={{ borderLeftColor: t.accent, borderLeftWidth: 3 }}>{t.name}</button>
                ))}
              </div>
            </Section>

            <Section title="Hook">
              <input value={s.hook} onChange={(e) => update({ hook: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(HOOK_LIBRARY[s.category] ?? HOOK_LIBRARY.default).map((h) => <Chip key={h} active={s.hook === h} onClick={() => update({ hook: h })}>{h}</Chip>)}
              </div>
            </Section>

            <Section title="Title">
              <input value={s.title} onChange={(e) => update({ title: e.target.value })} className="jp w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none" />
              <textarea value={s.description} onChange={(e) => update({ description: e.target.value })} rows={4} className="jp mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-brand-400 focus:outline-none" />
              <input value={s.hashtags.join(" ")} onChange={(e) => update({ hashtags: e.target.value.split(/\s+/).filter(Boolean) })} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:border-brand-400 focus:outline-none" />
            </Section>
          </Card>

          <Card className="p-4">
            <p className="text-xs font-semibold text-slate-700">Transcript in clip</p>
            <div className="jp mt-2 max-h-48 space-y-1 overflow-auto text-xs">
              {clipSegs.map((x) => (
                <button key={x.id} onClick={() => seek(x.start)} className={cn("block w-full rounded-md px-2 py-1 text-left hover:bg-slate-50", time >= x.start && time <= x.end + 0.5 && "bg-brand-50")}>
                  <span className="tabular-nums text-slate-400">{formatTime(x.start, false)}</span> <span className="font-semibold text-slate-800">{x.ja}</span>{x.en && <span className="text-slate-500"> — {x.en}</span>}
                </button>
              ))}
              {!clipSegs.length && <p className="text-slate-400">No transcript lines in this range.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[11px] text-slate-500">{k}</p>
      <p className="truncate text-sm font-semibold text-slate-900">{v}</p>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium tabular-nums text-slate-600">{label}</span>
      {children}
    </label>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold transition", active ? "border-brand-500 bg-brand-500 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-brand-300")}>
      {children}
    </button>
  );
}
