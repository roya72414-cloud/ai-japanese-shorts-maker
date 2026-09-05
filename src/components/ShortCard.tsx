"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Pencil, Play, Trash2 } from "lucide-react";
import type { Short } from "@/db/schema";
import { Button, Modal, ScoreBadge, StatusPill } from "@/components/ui";
import { fileUrl, formatTime, slugify } from "@/lib/utils";

export type ShortRow = Short & { videoName?: string; videoThumb?: string | null };

// Blob URL নাকি সার্ভার ফাইল পাথ তা নিরাপদে চেক করার হেল্পার
export function resolveMediaUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("blob:") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return fileUrl(path);
}

export function shortMetadata(s: ShortRow) {
  return {
    title: s.title,
    hook: s.hook,
    description: s.description,
    hashtags: s.hashtags,
    originalTimestamp: `${formatTime(s.startTime)}–${formatTime(s.endTime)}`,
    startSeconds: s.startTime,
    endSeconds: s.endTime,
    momentScore: s.score,
    category: s.category,
    template: s.template,
    subtitleMode: s.subtitleMode,
    output: {
      aspect: "9:16",
      resolution: "1080x1920",
      video: s.outputFormat === "mp4" ? "H.264" : "VP9/H.264 (WebM)",
      audio: s.outputFormat === "mp4" ? "AAC" : "Opus",
    },
    sourceVideo: s.videoName,
  };
}

export function shortFilename(s: ShortRow) {
  return `short-${s.id}-${slugify(s.title) || "japanese"}.${s.outputFormat ?? "mp4"}`;
}

export async function downloadShort(s: ShortRow) {
  if (!s.outputPath) return;
  const name = shortFilename(s);
  const targetUrl = resolveMediaUrl(s.outputPath);

  // সরাসরি সঠিক ভিডিও ব্লব/ইউআরএল ডাউনলোড নিশ্চিত করা
  const a = document.createElement("a");
  a.href = targetUrl.startsWith("blob:") ? targetUrl : `${targetUrl}?download=${encodeURIComponent(name)}`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();

  // মেটাডেটা JSON ডাউনলোড
  const meta = new Blob([JSON.stringify(shortMetadata(s), null, 2)], { type: "application/json" });
  const m = document.createElement("a");
  m.href = URL.createObjectURL(meta);
  m.download = name.replace(/\.\w+$/, ".json");
  document.body.appendChild(m);
  m.click();
  m.remove();

  fetch("/api/exports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      shortId: s.id,
      videoId: s.videoId,
      filename: name,
      format: s.outputFormat ?? "mp4",
      size: s.outputSize ?? 0,
      kind: "single",
      metadata: shortMetadata(s),
    }),
  }).catch(() => {});
}

export async function downloadAll(list: ShortRow[], onProgress?: (p: number) => void) {
  const ready = list.filter((s) => s.status === "complete" && s.outputPath);
  if (!ready.length) return;
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const manifest: unknown[] = [];

  for (let i = 0; i < ready.length; i++) {
    const s = ready[i];
    const res = await fetch(resolveMediaUrl(s.outputPath));
    const blob = await res.blob();
    const name = shortFilename(s);
    zip.file(name, blob);
    zip.file(name.replace(/\.\w+$/, ".json"), JSON.stringify(shortMetadata(s), null, 2));
    manifest.push({ file: name, ...shortMetadata(s) });
    onProgress?.((i + 1) / (ready.length + 1));
  }

  zip.file("metadata.json", JSON.stringify(manifest, null, 2));
  const out = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(out);
  a.download = `japanese-shorts-${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  onProgress?.(1);

  fetch("/api/exports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoId: ready[0].videoId,
      filename: a.download,
      format: "zip",
      size: out.size,
      kind: "batch",
      metadata: { count: ready.length, shorts: manifest },
    }),
  }).catch(() => {});
}

export function ShortCard({ short, onDelete, index }: { short: ShortRow; onDelete: (id: number) => void; index?: number }) {
  const [preview, setPreview] = useState(false);
  const ready = short.status === "complete" && short.outputPath;
  const mediaUrl = resolveMediaUrl(short.outputPath);

  return (
    <div className="fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="relative aspect-[9/16] max-h-[340px] w-full bg-ink-900">
        {ready ? (
          <video
            src={mediaUrl}
            className="h-full w-full object-contain"
            muted
            playsInline
            preload="metadata"
            onMouseEnter={(e) => e.currentTarget.play().catch(() => undefined)}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        ) : short.videoThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveMediaUrl(short.videoThumb)} alt="" className="h-full w-full object-cover opacity-40" />
        ) : null}
        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          {index !== undefined && <span className="rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-bold text-white">#{index + 1}</span>}
          <StatusPill status={short.status} />
        </div>
        <div className="absolute right-2 top-2"><ScoreBadge score={short.score} size="sm" /></div>
        {ready && (
          <button onClick={() => setPreview(true)} className="absolute inset-0 grid place-items-center opacity-0 transition hover:opacity-100">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-ink-900 shadow-xl"><Play className="ml-0.5 h-5 w-5 fill-current" /></span>
          </button>
        )}
        {!ready && short.status !== "failed" && (
          <div className="absolute inset-0 grid place-items-center">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <p className="line-clamp-2 text-xs font-semibold text-white">{short.hook}</p>
          <p className="mt-0.5 text-[10px] text-white/70">{formatTime(short.startTime)}–{formatTime(short.endTime)} · {Math.round(short.endTime - short.startTime)}s · {short.category}</p>
        </div>
      </div>
      <div className="grid grid-cols-4 divide-x divide-slate-100 border-t border-slate-100 text-[11px] font-semibold text-slate-600">
        <button disabled={!ready} onClick={() => setPreview(true)} className="flex items-center justify-center gap-1 py-2.5 hover:bg-slate-50 disabled:opacity-40"><Play className="h-3.5 w-3.5" /> Preview</button>
        <button disabled={!ready} onClick={() => downloadShort(short)} className="flex items-center justify-center gap-1 py-2.5 hover:bg-slate-50 disabled:opacity-40"><Download className="h-3.5 w-3.5" /> Download</button>
        <Link href={`/shorts/${short.id}`} className="flex items-center justify-center gap-1 py-2.5 hover:bg-slate-50"><Pencil className="h-3.5 w-3.5" /> Edit</Link>
        <button onClick={() => onDelete(short.id)} className="flex items-center justify-center gap-1 py-2.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
      </div>
      <Modal open={preview} onClose={() => setPreview(false)} title={short.title}>
        <div className="grid gap-5 md:grid-cols-[300px_1fr]">
          <video src={mediaUrl} controls autoPlay className="aspect-[9/16] w-full rounded-xl bg-black" />
          <div className="space-y-3 text-sm">
            <div><p className="text-xs font-semibold text-slate-500">Hook</p><p className="font-semibold text-slate-900">{short.hook}</p></div>
            <div><p className="text-xs font-semibold text-slate-500">Title</p><p className="text-slate-800">{short.title}</p></div>
            <div><p className="text-xs font-semibold text-slate-500">Description</p><p className="jp whitespace-pre-wrap text-xs text-slate-700">{short.description}</p></div>
            <div className="flex flex-wrap gap-1">{short.hashtags.map((h) => <span key={h} className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">{h}</span>)}</div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="primary" onClick={() => downloadShort(short)}><Download className="h-3.5 w-3.5" /> Download</Button>
              <Link href={`/shorts/${short.id}`}><Button size="sm"><Pencil className="h-3.5 w-3.5" /> Edit</Button></Link>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
