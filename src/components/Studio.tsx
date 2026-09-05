"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Clapperboard, Download, Film, Loader2, Play, RefreshCw, Sparkles, Subtitles, Wand2 } from "lucide-react";
import type { Moment, Short, Transcript, Video } from "@/db/schema";
import { extractAudioChunks } from "@/lib/client/media";
import type { RawSttSegment } from "@/lib/engine/transcript";
import { Button, Card, Modal, PageHeader, Progress, ScoreBadge } from "@/components/ui";
import { Timeline } from "@/components/Timeline";
import { AutoSelectControls, KpiBreakdown, MomentCard, TemplateSelector, applyAutoSelect, type AutoSelectState } from "@/components/MomentTools";
import { QueuePanel, useRenderQueue } from "@/components/RenderQueue";
import { ShortCard, downloadAll } from "@/components/ShortCard";
import { cn, fileUrl, formatBytes, formatTime } from "@/lib/utils";

type Props = { video: Video; moments: Moment[]; shorts: Short[]; transcript: Transcript | null; defaults: { template: string; subtitleMode: string; motion: string; minScore: number } };

const STAGES = [
  { label: "Analyzing audio...", steps: ["Extract audio", "Generate Japanese transcript", "Generate timestamps"] },
  { label: "Analyzing Japanese dialogue...", steps: ["Detect sentence boundaries", "Detect dialogue boundaries"] },
  { label: "Finding educational moments...", steps: ["Detect educational topics", "Generate candidate moments"] },
  { label: "Scoring moments...", steps: ["Calculate KPI score", "Run safety/content-quality check"] },
  { label: "Finding best Shorts...", steps: ["Remove duplicate moments", "Rank moments"] },
];

export function Studio({ video: initialVideo, moments: initialMoments, shorts: initialShorts, transcript, defaults }: Props) {
  const router = useRouter();
  const [video, setVideo] = useState(initialVideo);
  const [moments, setMoments] = useState(initialMoments);
  const [shorts, setShorts] = useState<Short[]>(initialShorts);
  const [range, setRange] = useState({ start: initialVideo.rangeStart, end: initialVideo.rangeEnd || initialVideo.duration });
  const [analyzing, setAnalyzing] = useState(false);
  const [stageIdx, setStageIdx] = useState(-1);
  const [stageNote, setStageNote] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(initialShorts.length ? 3 : initialMoments.length ? 2 : 1);
  const [auto, setAuto] = useState<AutoSelectState>({ count: 10, customCount: 8, minScore: defaults.minScore || 80, duration: "auto" });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [template, setTemplate] = useState(defaults.template);
  const [subtitleMode, setSubtitleMode] = useState(defaults.subtitleMode);
  const [previewMoment, setPreviewMoment] = useState<Moment | null>(null);
  const [detailMoment, setDetailMoment] = useState<Moment | null>(null);
  const [creating, setCreating] = useState(false);
  const [zipProgress, setZipProgress] = useState<number | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  const src = fileUrl(video.storagePath);

  // ভিডিও লোড হলে অডিও নিশ্চিতভাবে আনমিউট করা
  useEffect(() => {
    const v = mainVideoRef.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1.0;
  }, [src]);

  // Auto-select applies whenever controls change
  useEffect(() => {
    setSelected(new Set(applyAutoSelect(moments, auto).map((m) => m.id)));
  }, [auto, moments]);

  const onShortUpdate = useCallback((s: Short) => {
    setShorts((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...s } : x)));
  }, []);
  const queue = useRenderQueue(shorts, onShortUpdate);

  const persistRange = async (s: number, e: number) => {
    setRange({ start: s, end: e });
  };
  useEffect(() => {
    const id = setTimeout(() => {
      fetch(`/api/videos/${video.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rangeStart: range.start, rangeEnd: range.end }) }).catch(() => undefined);
    }, 600);
    return () => clearTimeout(id);
  }, [range, video.id]);

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const analyze = async () => {
    setAnalyzing(true);
    setAnalysisError("");
    setStageIdx(0);
    setStageNote("");
    try {
      let stt: RawSttSegment[] | null = null;
      const avail = await fetch("/api/transcribe").then((r) => r.json()).catch(() => ({ available: false }));
      if (avail.available) {
        setStageNote("Extracting audio track in browser (16 kHz mono)…");
        const chunks = await extractAudioChunks(src, range.start, range.end, 600, (p) => setStageNote(`Extracting audio… ${Math.round(p * 100)}%`));
        stt = [];
        for (let i = 0; i < chunks.length; i++) {
          setStageNote(`Transcribing Japanese speech (Whisper) — part ${i + 1}/${chunks.length}`);
          const res = await fetch(`/api/transcribe?offset=${chunks[i].offset}`, { method: "POST", body: chunks[i].blob, headers: { "Content-Type": "audio/wav" } });
          const data = await res.json();
          if (data.segments) stt.push(...data.segments);
        }
      } else {
        setStageNote("Timestamped transcript engine (audio + transcript are the primary signal)");
        await wait(1100);
      }
      setStageIdx(1);
      setStageNote("Splitting into sentences and dialogue turns");
      await wait(900);
      setStageIdx(2);
      setStageNote("Tagging topics, grammar patterns and practical phrases");
      const reqPromise = fetch(`/api/videos/${video.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rangeStart: range.start, rangeEnd: range.end, sttSegments: stt }),
      });
      await wait(900);
      setStageIdx(3);
      setStageNote("Applying the 9-KPI weighted formula and safety checks");
      const res = await reqPromise;
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      await wait(700);
      setStageIdx(4);
      setStageNote("De-duplicating overlaps and ranking");
      await wait(700);
      setVideo(data.video);
      setMoments(data.moments);
      setStep(2);
      router.refresh();
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
      setStageIdx(-1);
    }
  };

  const createShorts = async (ids: number[], overrides?: { status?: string }) => {
    if (!ids.length) return [] as Short[];
    setCreating(true);
    try {
      const res = await fetch("/api/shorts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ momentIds: ids, template, subtitleMode, motion: defaults.motion, ...overrides }) });
      const rows = (await res.json()) as Short[];
      if (!overrides?.status) {
        setShorts((prev) => [...prev, ...rows]);
        setStep(3);
      }
      return rows;
    } finally {
      setCreating(false);
    }
  };

  const batch = (n: number | "all80") => {
    const list = n === "all80" ? moments.filter((m) => m.score > 80) : [...moments].sort((a, b) => a.rank - b.rank).slice(0, n);
    void createShorts(list.map((m) => m.id));
  };

  const editMoment = async (m: Moment) => {
    const [row] = await createShorts([m.id], { status: "draft" });
    if (row) router.push(`/shorts/${row.id}`);
  };

  const deleteShort = async (id: number) => {
    await fetch(`/api/shorts/${id}`, { method: "DELETE" });
    setShorts((prev) => prev.filter((s) => s.id !== id));
  };

  const markers = useMemo(() => moments.map((m) => ({ start: m.startTime, end: m.endTime, score: m.score })), [moments]);
  const selectedMoments = moments.filter((m) => selected.has(m.id));
  const completed = shorts.filter((s) => s.status === "complete").length;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 pb-28 lg:px-8">
      <PageHeader
        title={video.name}
        subtitle={`${formatTime(video.duration)} · ${video.width}×${video.height} · ${formatBytes(video.size)}`}
        actions={
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold">
            {[{ n: 1, l: "Source" }, { n: 2, l: "Best Moments" }, { n: 3, l: "Shorts" }].map((s) => (
              <button key={s.n} onClick={() => ((s.n === 2 && moments.length) || (s.n === 3 && shorts.length) || s.n === 1) && setStep(s.n as 1 | 2 | 3)} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 transition", step === s.n ? "bg-ink-900 text-white" : "text-slate-500 hover:text-slate-800")}>
                <span className={cn("grid h-4 w-4 place-items-center rounded-full text-[10px]", step === s.n ? "bg-white text-ink-900" : step > s.n ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600")}>{step > s.n ? <Check className="h-2.5 w-2.5" /> : s.n}</span>
                {s.l}
              </button>
            ))}
          </div>
        }
      />

      {step === 1 && (
        <div className="fade-up space-y-6">
          <Card className="overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr]">
              <div className="relative aspect-video bg-ink-900">
                <video
                  ref={mainVideoRef}
                  src={src}
                  poster={fileUrl(video.thumbnailPath)}
                  controls
                  playsInline
                  crossOrigin="anonymous"
                  className="h-full w-full"
                  onTimeUpdate={(e) => setPlayhead(e.currentTarget.currentTime)}
                  onPlay={(e) => {
                    e.currentTarget.muted = false;
                    e.currentTarget.volume = 1.0;
                  }}
                />
              </div>
              <div className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {video.thumbnailPath && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fileUrl(video.thumbnailPath)} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
                    )}
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><Film className="h-3 w-3" /> Source</p>
                      <p className="truncate text-sm font-bold text-slate-900" title={video.originalName}>{video.originalName}</p>
                    </div>
                  </div>
                  <Link href="/upload"><Button size="sm"><RefreshCw className="h-3.5 w-3.5" /> Replace</Button></Link>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2.5 text-sm">
                  <Info label="Duration" value={formatTime(video.duration)} />
                  <Info label="Resolution" value={`${video.width} × ${video.height}`} />
                  <Info label="Aspect" value={video.width && video.height ? (video.width / video.height).toFixed(2) + ":1" : "—"} />
                  <Info label="Status" value={video.status === "analyzed" ? "Analyzed" : "Ready"} />
                </dl>
                <div className="mt-4 space-y-2">
                  <div className={cn("flex items-start gap-2 rounded-xl p-3 text-xs", video.hasBurnedSubtitles ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600")}>
                    <Subtitles className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold">{video.hasBurnedSubtitles ? "Burned-in subtitles detected" : "No burned-in subtitles detected"}</p>
                      <p className="mt-0.5 opacity-80">{video.hasBurnedSubtitles ? `Subtitle band ≈ ${Math.round((video.subtitleArea?.top ?? 0.78) * 100)}–${Math.round((video.subtitleArea?.bottom ?? 0.95) * 100)}% of frame height. It will be preserved and never duplicated.` : "You can add Japanese / Romaji / English captions from the template step."}</p>
                    </div>
                  </div>
                  {video.isStaticImage && (
                    <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                      <Wand2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <p><span className="font-semibold">Static image lesson.</span> Scene changes are ignored; audio + transcript drive moment detection and subtle Ken Burns motion is applied on export.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-bold text-slate-900">Select the part you want to convert to Shorts</h2>
            <p className="mb-4 text-xs text-slate-500">The selected section becomes the AI analysis range.</p>
            <Timeline src={src} duration={video.duration} start={range.start} end={range.end} onChange={persistRange} markers={markers} playhead={playhead} onSeek={(t) => { if (mainVideoRef.current) mainVideoRef.current.currentTime = t; }} />
          </Card>

          <Card className="overflow-hidden">
            {!analyzing ? (
              <div className="flex flex-col items-center gap-4 bg-gradient-to-br from-ink-900 via-ink-800 to-brand-700 px-6 py-10 text-center text-white">
                <h3 className="text-xl font-bold">Let AI find the best Japanese learning moments</h3>
                <p className="max-w-xl text-sm text-white/70">Transcript-first analysis: Japanese speech → timestamped transcript → sentence segmentation → learning-value analysis → 9-KPI scoring → ranked moments.</p>
                <Button size="lg" onClick={analyze} className="pulse-ring mt-2 bg-white text-ink-900 hover:bg-brand-50">
                  <Sparkles className="h-5 w-5 text-brand-600" /> {moments.length ? "Re-run: Find Best Moments" : "Find Best Moments"}
                </Button>
                {moments.length > 0 && <button onClick={() => setStep(2)} className="text-xs font-semibold text-white/80 underline-offset-2 hover:underline">View {moments.length} found moments →</button>}
                {analysisError && <p className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs text-rose-100">{analysisError}</p>}
              </div>
            ) : (
              <div className="grid gap-6 p-6 md:grid-cols-[1fr_1fr]">
                <div>
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                    <h3 className="text-base font-bold text-slate-900">{STAGES[Math.max(0, stageIdx)].label}</h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{stageNote}</p>
                  <Progress value={((stageIdx + 1) / STAGES.length) * 100 - 8} className="mt-4" />
                  <ul className="mt-5 space-y-2">
                    {STAGES.map((s, i) => (
                      <li key={s.label} className={cn("flex items-center gap-2 text-sm", i < stageIdx ? "text-emerald-600" : i === stageIdx ? "font-semibold text-slate-900" : "text-slate-400")}>
                        <span className={cn("grid h-5 w-5 place-items-center rounded-full text-[10px]", i < stageIdx ? "bg-emerald-100" : i === stageIdx ? "bg-brand-100 text-brand-700" : "bg-slate-100")}>{i < stageIdx ? <Check className="h-3 w-3" /> : i + 1}</span>
                        {s.label}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pipeline</p>
                  <ol className="mt-2 grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                    {STAGES.flatMap((s, si) => s.steps.map((st) => ({ st, si }))).map(({ st, si }, i) => (
                      <li key={st} className={cn("flex items-center gap-1.5 rounded-md px-2 py-1", si < stageIdx ? "text-emerald-700" : si === stageIdx ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-400")}>
                        <span className="w-4 tabular-nums">{i + 1}.</span> {st}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {step === 2 && (
        <div className="fade-up space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Best Moments</h2>
              <p className="text-sm text-slate-500">{moments.length} moments ranked by Japanese learning value · Best score {video.bestScore} · Transcript: {video.transcriptEngine === "openai" ? "Whisper (ja)" : "built-in engine"}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setStep(1)}><RefreshCw className="h-3.5 w-3.5" /> Change range</Button>
              <Button size="sm" onClick={analyze}><Sparkles className="h-3.5 w-3.5" /> Re-analyze</Button>
            </div>
          </div>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Auto Select</h3>
              <span className="text-xs text-slate-500">Recommended: Auto + minimum score 80 · <span className="font-semibold text-brand-700">{selected.size} selected</span></span>
            </div>
            <AutoSelectControls state={auto} onChange={setAuto} />
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 text-sm font-bold text-slate-900">Caption Template</h3>
            <TemplateSelector value={template} onChange={setTemplate} subtitleMode={subtitleMode} onSubtitleMode={setSubtitleMode} hasBurnedSubtitles={video.hasBurnedSubtitles} />
          </Card>

          {moments.length === 0 && (
            <Card className="p-10 text-center text-sm text-slate-500">No moments met the quality bar in this range. Try a wider range or re-run the analysis.</Card>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {moments.map((m) => (
              <MomentCard
                key={m.id}
                moment={m}
                selected={selected.has(m.id)}
                onToggle={() => setSelected((prev) => { const n = new Set(prev); if (n.has(m.id)) n.delete(m.id); else n.add(m.id); return n; })}
                onPreview={() => setPreviewMoment(m)}
                onEdit={() => editMoment(m)}
                onCreate={() => createShorts([m.id])}
              />
            ))}
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:left-60">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-8">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="mr-1 font-semibold text-slate-500">Batch:</span>
                <Button size="sm" onClick={() => batch(5)} disabled={creating}>Generate Top 5</Button>
                <Button size="sm" onClick={() => batch(10)} disabled={creating}>Generate Top 10</Button>
                <Button size="sm" onClick={() => batch(20)} disabled={creating}>Generate Top 20</Button>
                <Button size="sm" onClick={() => batch("all80")} disabled={creating}>Generate All &gt;80 Score</Button>
              </div>
              <Button variant="primary" size="lg" loading={creating} disabled={!selected.size} onClick={() => createShorts(selectedMoments.map((m) => m.id))}>
                <Clapperboard className="h-5 w-5" /> Convert to Shorts ({selected.size}) <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="fade-up space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Generated Shorts</h2>
              <p className="text-sm text-slate-500">{completed}/{shorts.length} rendered · 9:16 · 1080 × 1920 · original Japanese audio preserved</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setStep(2)}><Sparkles className="h-3.5 w-3.5" /> Back to moments</Button>
              <Button size="sm" variant="primary" disabled={!completed || zipProgress !== null} onClick={async () => { setZipProgress(0); await downloadAll(shorts.map((x) => ({ ...x, videoName: video.name, videoThumb: video.thumbnailPath })), setZipProgress); setZipProgress(null); router.refresh(); }}>
                <Download className="h-3.5 w-3.5" /> {zipProgress !== null ? `Zipping ${Math.round(zipProgress * 100)}%` : "Download All"}
              </Button>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {shorts.map((s, i) => (
                <ShortCard key={s.id} short={{ ...s, videoName: video.name, videoThumb: video.thumbnailPath }} index={i} onDelete={deleteShort} />
              ))}
            </div>
            <div className="space-y-4">
              <QueuePanel items={shorts} activeId={queue.activeId} progress={queue.progress} error={queue.error} onRetry={queue.retry} />
              <Card className="p-4 text-xs text-slate-600">
                <p className="font-semibold text-slate-900">Keep this tab open while rendering</p>
                <p className="mt-1">Shorts are composited in real time in your browser (H.264/AAC MP4 when supported), with subtle motion, safe vertical layout and preserved burned-in subtitles.</p>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Moment preview */}
      <Modal open={!!previewMoment} onClose={() => setPreviewMoment(null)} title={previewMoment ? `#${previewMoment.rank} · ${previewMoment.category}` : ""} wide>
        {previewMoment && (
          <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
            <div>
              <video
                ref={previewRef}
                src={`${src}#t=${previewMoment.startTime},${previewMoment.endTime}`}
                controls
                autoPlay
                playsInline
                crossOrigin="anonymous"
                className="aspect-video w-full rounded-xl bg-black"
                onTimeUpdate={(e) => { if (e.currentTarget.currentTime >= previewMoment.endTime) e.currentTarget.pause(); }}
                onPlay={(e) => {
                  e.currentTarget.muted = false;
                  e.currentTarget.volume = 1.0;
                }}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span className="tabular-nums">{formatTime(previewMoment.startTime)} — {formatTime(previewMoment.endTime)} · {Math.round(previewMoment.endTime - previewMoment.startTime)}s</span>
                <button className="inline-flex items-center gap-1 font-semibold text-brand-700" onClick={() => { if (previewRef.current) { previewRef.current.currentTime = previewMoment.startTime; previewRef.current.play(); } }}><Play className="h-3 w-3" /> Replay</button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2"><ScoreBadge score={previewMoment.score} size="lg" />{previewMoment.level && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">JLPT {previewMoment.level}</span>}</div>
              <p className="jp text-lg font-bold text-slate-900">「{previewMoment.quoteJa}」</p>
              <p className="text-xs text-slate-500">{previewMoment.quoteRomaji} · {previewMoment.quoteEn}</p>
              <div><p className="text-xs font-semibold text-slate-500">Hook</p><p className="text-sm font-semibold">{previewMoment.hook}</p></div>
              <div><p className="text-xs font-semibold text-slate-500">Transcript</p>
                <div className="jp mt-1 max-h-40 space-y-1 overflow-auto rounded-lg bg-slate-50 p-2 text-xs">
                  {(transcript?.segments ?? []).filter((s) => previewMoment.segmentIds.includes(s.id)).map((s) => (
                    <p key={s.id}><span className="tabular-nums text-slate-400">{formatTime(s.start, false)}</span> <span className="font-semibold text-slate-800">{s.ja}</span>{s.en && <span className="text-slate-500"> — {s.en}</span>}</p>
                  ))}
                </div>
              </div>
              <button onClick={() => { setDetailMoment(previewMoment); setPreviewMoment(null); }} className="text-xs font-semibold text-brand-700 hover:underline">View KPI breakdown →</button>
              <div className="flex gap-2 pt-1">
                <Button variant="primary" size="sm" onClick={() => { createShorts([previewMoment.id]); setPreviewMoment(null); }}><Sparkles className="h-3.5 w-3.5" /> Create Short</Button>
                <Button size="sm" onClick={() => editMoment(previewMoment)}>Edit</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!detailMoment} onClose={() => setDetailMoment(null)} title="KPI Moment Engine — score breakdown">
        {detailMoment && (
          <div>
            <div className="mb-4 flex items-center justify-between"><p className="text-sm font-semibold">Moment #{detailMoment.rank}</p><ScoreBadge score={detailMoment.score} size="lg" /></div>
            <KpiBreakdown kpis={detailMoment.kpis} />
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500">Moment Score = Educational×0.20 + Hook×0.20 + Standalone×0.15 + Engagement×0.15 + Practical×0.10 + Conversation×0.05 + Audio×0.05 + Subtitle×0.05 + Completeness×0.05</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
