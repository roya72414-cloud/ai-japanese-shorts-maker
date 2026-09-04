"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { CheckCircle2, Film, Play, RefreshCw, Subtitles, UploadCloud } from "lucide-react";
import { analyzeFrames, captureFrame, loadVideo, probeVideo } from "@/lib/client/media";
import { Button, Card, Progress } from "@/components/ui";
import { formatBytes, formatTime } from "@/lib/utils";

type Stage = "idle" | "probing" | "uploading" | "finishing" | "done" | "error";

export function UploadWorkspace() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string>("");
  const [meta, setMeta] = useState<{ duration: number; width: number; height: number } | null>(null);
  const [thumb, setThumb] = useState<string>("");
  const [subInfo, setSubInfo] = useState<{ detected: boolean; isStatic: boolean } | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const previewRef = useRef<HTMLVideoElement>(null);

  const reset = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setFile(null);
    setObjectUrl("");
    setMeta(null);
    setThumb("");
    setSubInfo(null);
    setStage("idle");
    setProgress(0);
    setError("");
    setPlaying(false);
  };

  const handleFile = useCallback(async (f: File) => {
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(f.name)) {
      setError("Please choose a video file (MP4, MOV, WebM…).");
      return;
    }
    setError("");
    setFile(f);
    const url = URL.createObjectURL(f);
    setObjectUrl(url);
    setStage("probing");
    try {
      const probe = await probeVideo(url);
      setMeta(probe);
      const v = await loadVideo(url);
      const dataUrl = await captureFrame(v, Math.min(probe.duration * 0.1, 5), 640);
      setThumb(dataUrl);
      v.src = "";
      const frames = await analyzeFrames(url);
      setSubInfo({ detected: frames.subtitleArea.detected, isStatic: frames.isStatic });

      // ১. প্রিসাইনড ইউআরএল তৈরি
      setStage("uploading");
      const urlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: f.name,
          contentType: f.type || "video/mp4",
        }),
      });

      if (!urlRes.ok) {
        const errData = await urlRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to initiate direct upload");
      }

      const { uploadUrl, key, stored } = await urlRes.json();

      // ২. সরাসরি Supabase S3-এ আপলোড (Vercel সীমা এড়াতে)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", f.type || "video/mp4");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Storage upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Direct upload failed. Check your network."));
        xhr.send(f);
      });

      setStage("finishing");

      // ৩. ডাটাবেজে ভিডিও এন্ট্রি তৈরি
      const params = new URLSearchParams({
        filename: f.name,
        type: f.type || "video/mp4",
        duration: String(probe.duration),
        width: String(probe.width),
        height: String(probe.height),
        storageKey: key,
        stored: stored,
      });

      const videoRes = await fetch(`/api/videos?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey: key, stored, size: f.size }),
      });

      if (!videoRes.ok) throw new Error(`Failed to register video (${videoRes.status})`);
      const created = await videoRes.json();

      // ৪. থাম্বনেইল ও সাবটাইটেল সেভ
      await fetch(`/api/videos/${created.id}/thumbnail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      await fetch(`/api/videos/${created.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hasBurnedSubtitles: frames.subtitleArea.detected,
          subtitleArea: frames.subtitleArea,
          isStaticImage: frames.isStatic,
        }),
      });

      setStage("done");
      router.push(`/videos/${created.id}`);
    } catch (e) {
      setStage("error");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, [router]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  if (!file) {
    return (
      <div className="mx-auto max-w-4xl">
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`group relative grid cursor-pointer place-items-center rounded-3xl border-2 border-dashed px-8 py-24 text-center transition ${drag ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50/40"}`}
        >
          <input ref={inputRef} type="file" accept="video/*,.mp4,.mov,.m4v,.webm,.mkv" className="hidden" onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])} />
          <div className="pulse-ring grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-pink-500 text-white shadow-xl shadow-brand-500/30">
            <UploadCloud className="h-9 w-9" />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">Upload your Japanese lesson</h2>
          <p className="mt-2 text-sm text-slate-500">Upload MP4, MOV or other supported video formats</p>
          <p className="mt-6 text-xs text-slate-400">Drag & drop or click to browse · Static-image lessons, burned-in subtitles and long recordings are all supported</p>
          {error && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { t: "No face detection needed", d: "Works with static images and audio-only lessons." },
            { t: "Subtitle-aware", d: "Burned-in Japanese / Romaji / English subtitles are detected and preserved." },
            { t: "Transcript-first AI", d: "Moments are chosen by Japanese learning value, not scene cuts." },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">{f.t}</p>
              <p className="mt-1 text-xs text-slate-500">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Card className="overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr]">
          <div className="relative aspect-video bg-ink-900">
            {objectUrl && (
              <video
                ref={previewRef}
                src={objectUrl}
                poster={thumb || undefined}
                className="h-full w-full object-contain"
                controls={playing}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
            )}
            {!playing && (
              <button
                onClick={() => { previewRef.current?.play(); setPlaying(true); }}
                className="absolute inset-0 grid place-items-center"
              >
                <span className="grid h-16 w-16 place-items-center rounded-full bg-white/90 text-ink-900 shadow-xl transition hover:scale-105">
                  <Play className="ml-1 h-7 w-7 fill-current" />
                </span>
              </button>
            )}
          </div>
          <div className="flex flex-col p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><Film className="h-3.5 w-3.5" /> Source video</p>
                <h2 className="mt-1 truncate text-lg font-bold text-slate-900" title={file.name}>{file.name}</h2>
              </div>
              <Button size="sm" onClick={reset} disabled={stage === "uploading" || stage === "finishing"}>
                <RefreshCw className="h-3.5 w-3.5" /> Replace
              </Button>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">Duration</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{meta ? formatTime(meta.duration) : <span className="shimmer inline-block h-4 w-16 rounded" />}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">Resolution</dt>
                <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{meta ? `${meta.width} × ${meta.height}` : <span className="shimmer inline-block h-4 w-20 rounded" />}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">File size</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{formatBytes(file.size)}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-xs text-slate-500">Format</dt>
                <dd className="mt-0.5 font-semibold text-slate-900">{file.type || file.name.split(".").pop()?.toUpperCase()}</dd>
              </div>
            </dl>
            {subInfo && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${subInfo.detected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  <Subtitles className="h-3.5 w-3.5" /> {subInfo.detected ? "Burned-in subtitles detected — will be preserved" : "No burned-in subtitles detected"}
                </span>
                {subInfo.isStatic && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">Static image lesson — motion optimization on</span>}
              </div>
            )}
            <div className="mt-auto pt-6">
              {stage === "probing" && <p className="text-sm text-slate-500">Reading video metadata & scanning frames…</p>}
              {(stage === "uploading" || stage === "finishing" || stage === "done") && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{stage === "uploading" ? "Uploading…" : stage === "finishing" ? "Saving thumbnail & subtitle map…" : "Opening studio…"}</span>
                    <span className="tabular-nums text-slate-500">{stage === "uploading" ? `${progress}%` : "100%"}</span>
                  </div>
                  <Progress value={stage === "uploading" ? progress : 100} />
                </div>
              )}
              {stage === "done" && <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Upload complete</p>}
              {stage === "error" && (
                <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">
                  {error}
                  <div className="mt-2"><Button size="sm" onClick={reset}>Try another file</Button></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
