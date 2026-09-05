"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import type { Short, SubtitleArea, TranscriptSegment } from "@/db/schema";
import { renderShort } from "@/lib/client/renderer";
import { Progress } from "@/components/ui";
import { cn, fileUrl } from "@/lib/utils";

export type QueueShort = Short & { videoPath?: string; subtitleArea?: SubtitleArea | null };

type SegmentsLoader = (videoId: number) => Promise<{ segments: TranscriptSegment[]; subtitleArea: SubtitleArea | null; storagePath: string; hasBurnedSubtitles: boolean; level?: string | null }>;

const videoCache = new Map<number, Awaited<ReturnType<SegmentsLoader>>>();

async function loadVideoContext(videoId: number) {
  const cached = videoCache.get(videoId);
  if (cached) return cached;
  const res = await fetch(`/api/videos/${videoId}`);
  const data = await res.json();
  const ctx = {
    segments: (data.transcript?.segments ?? []) as TranscriptSegment[],
    subtitleArea: data.video.subtitleArea as SubtitleArea | null,
    storagePath: data.video.storagePath as string,
    hasBurnedSubtitles: Boolean(data.video.hasBurnedSubtitles),
  };
  videoCache.set(videoId, ctx);
  return ctx;
}

export function useRenderQueue(items: QueueShort[], onUpdate: (s: Short) => void, enabled = true) {
  const [activeId, setActiveId] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>("");
  const busy = useRef(false);
  const paused = useRef(false);

  const processOne = useCallback(
    async (s: QueueShort) => {
      setActiveId(s.id);
      setProgress(0);
      setError("");

      const mark = async (patch: Partial<Short>) => {
        const res = await fetch(`/api/shorts/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const row = (await res.json()) as Short;
        onUpdate(row);
        return row;
      };

      try {
        await mark({ status: "rendering", progress: 0 });
        const ctx = await loadVideoContext(s.videoId);
        const segs = ctx.segments.filter((x) => x.end >= s.startTime && x.start <= s.endTime);

        const result = await renderShort(
          fileUrl(ctx.storagePath),
          {
            startTime: s.startTime,
            endTime: s.endTime,
            templateId: s.template,
            subtitleMode: s.subtitleMode,
            crop: s.crop,
            zoom: s.zoom,
            motion: s.motion,
            hook: s.hook,
            segments: segs,
            subtitleArea: ctx.subtitleArea,
            preserveBurnedSubtitles: ctx.hasBurnedSubtitles,
            level: segs.find((x) => x.level)?.level ?? null,
          },
          (p) => setProgress(Math.round(p * 100)),
        );

        // সার্ভার থেকে নিরাপদ Signed Upload URL নিয়ে আসা
        const ticketRes = await fetch(`/api/shorts/${s.id}/render?format=${result.format}`);
        if (!ticketRes.ok) {
          throw new Error("Could not initialize upload destination");
        }
        const { uploadUrl, storagePath } = await ticketRes.json();

        // সরাসরি Supabase-এ বাইনারি আপলোড করা
        const up = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": result.mime,
          },
          body: result.blob,
        });

        if (!up.ok) {
          // PUT ফেইল করলে POST ট্রাই করা
          const postUp = await fetch(uploadUrl, {
            method: "POST",
            headers: {
              "Content-Type": result.mime,
            },
            body: result.blob,
          });
          if (!postUp.ok) {
            const errText = await postUp.text();
            throw new Error(errText || "Direct storage upload failed");
          }
        }

        // আপলোড সম্পন্ন হওয়া ডাটাবেজে কনফার্ম করা
        const finishRes = await fetch(`/api/shorts/${s.id}/render`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storagePath,
            format: result.format,
            size: result.blob.size,
          }),
        });

        const updatedRow = (await finishRes.json()) as Short;
        onUpdate(updatedRow);
      } catch (e) {
        const raw = e instanceof Error ? e.message : "Render failed";
        const msg = /NotAllowed|play\(\)|user (gesture|activation)/i.test(raw)
          ? "The browser needs a click before it can render with audio. Press Retry."
          : raw;
        setError(msg);
        await mark({ status: "failed", progress: 0 });
      } finally {
        setActiveId(null);
      }
    },
    [onUpdate],
  );

  useEffect(() => {
    if (!enabled || busy.current || paused.current) return;
    const next = items.find((s) => s.status === "waiting");
    if (!next) return;
    busy.current = true;
    processOne(next).finally(() => {
      busy.current = false;
      setTick((t) => t + 1);
    });
  }, [items, processOne, enabled, tick]);

  const retry = useCallback(
    async (s: Short) => {
      const res = await fetch(`/api/shorts/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "waiting", progress: 0 }),
      });
      onUpdate(await res.json());
    },
    [onUpdate],
  );

  return { activeId, progress, error, retry };
}

export function QueuePanel({
  items,
  activeId,
  progress,
  error,
  onRetry,
  onStart,
}: {
  items: Short[];
  activeId: number | null;
  progress: number;
  error: string;
  onRetry: (s: Short) => void;
  onStart?: () => void;
}) {
  const done = items.filter((s) => s.status === "complete").length;
  const waiting = items.filter((s) => s.status === "waiting").length;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Render queue</p>
        <div className="flex items-center gap-2">
          {onStart && waiting > 0 && activeId === null && (
            <button
              onClick={onStart}
              className="rounded-md bg-brand-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-600"
            >
              Start rendering
            </button>
          )}
          <span className="text-xs tabular-nums text-slate-500">
            {done}/{items.length} complete
          </span>
        </div>
      </div>
      <ul className="max-h-72 divide-y divide-slate-100 overflow-auto">
        {items.map((s, i) => {
          const active = s.id === activeId || s.status === "rendering";
          return (
            <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="w-16 shrink-0 font-semibold text-slate-700">Short #{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-slate-500">{s.hook}</p>
                {active && <Progress value={progress} className="mt-1" />}
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold",
                  s.status === "complete" && "text-emerald-600",
                  active && "text-brand-600",
                  s.status === "waiting" && "text-slate-500",
                  s.status === "failed" && "text-rose-600",
                )}
              >
                {s.status === "complete" && <CheckCircle2 className="h-3.5 w-3.5" />}
                {active && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {s.status === "waiting" && !active && <Clock className="h-3.5 w-3.5" />}
                {s.status === "failed" && <AlertCircle className="h-3.5 w-3.5" />}
                {active
                  ? `Rendering ${progress}%`
                  : s.status === "waiting"
                  ? "Waiting"
                  : s.status === "complete"
                  ? "Complete"
                  : "Failed"}
                {s.status === "failed" && (
                  <button
                    onClick={() => onRetry(s)}
                    className="ml-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] hover:bg-rose-100"
                  >
                    Retry
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {error && <p className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
