"use client";

import type { CropSettings, SubtitleArea, TranscriptSegment } from "@/db/schema";
import { getTemplate, type CaptionTemplate, type SubtitleMode } from "@/lib/templates";

export const OUT_W = 1080;
export const OUT_H = 1920;

export type RenderOptions = {
  startTime: number;
  endTime: number;
  templateId: string;
  subtitleMode: SubtitleMode | string;
  crop: CropSettings;
  zoom: number;
  motion: string;
  hook: string;
  segments: TranscriptSegment[];
  subtitleArea?: SubtitleArea | null;
  preserveBurnedSubtitles: boolean;
  level?: string | null;
  showProgress?: boolean;
};

type Layout = { x: number; y: number; w: number; h: number };

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const hasSpaces = /\s/.test(text) && !/[぀-ヿ一-鿿]/.test(text);
  if (hasSpaces) {
    let line = "";
    for (const word of text.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else line = test;
    }
    if (line) lines.push(line);
  } else {
    let line = "";
    for (const ch of Array.from(text)) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else line = test;
    }
    if (line) lines.push(line);
  }
  return lines;
}

export class ShortComposer {
  template: CaptionTemplate;

  constructor(public opts: RenderOptions) {
    this.template = getTemplate(opts.templateId);
  }

  setOptions(opts: Partial<RenderOptions>) {
    this.opts = { ...this.opts, ...opts };
    this.template = getTemplate(this.opts.templateId);
  }

  currentSegment(time: number): TranscriptSegment | null {
    const segs = this.opts.segments;
    let best: TranscriptSegment | null = null;
    for (const s of segs) {
      if (time >= s.start - 0.15 && time <= s.end + 0.9) best = s;
    }
    return best;
  }

  // রিলসের জন্য সঠিক বড় ও সুন্দর ভিডিও সাইজ
  private foregroundLayout(video: HTMLVideoElement | HTMLCanvasElement): Layout {
    const vw = "videoWidth" in video ? video.videoWidth || 16 : video.width;
    const vh = "videoHeight" in video ? video.videoHeight || 9 : video.height;
    const { crop, zoom } = this.opts;
    const aspect = vw / vh;

    if (crop.layout === "fill") {
      const h = OUT_H * Math.max(1, zoom);
      const w = h * aspect;
      const x = (OUT_W - w) / 2 + (crop.offsetX || 0) * Math.max(0, (w - OUT_W) / 2);
      const y = (OUT_H - h) / 2;
      return { x, y, w, h };
    }

    // ফুল-স্ক্রিন প্রিমিয়াম রিলস ফ্রেম (চওড়ায় ১০২০ পিক্সেল পর্যন্ত বড় থাকবে)
    const w = (OUT_W - 40) * Math.min(1.15, Math.max(0.95, zoom));
    const h = w / aspect;
    const centerY = crop.layout === "top" ? OUT_H * 0.40 : OUT_H * 0.48;
    const y = centerY - h / 2 + (crop.offsetY || 0) * OUT_H * 0.15;
    return { x: (OUT_W - w) / 2, y, w, h };
  }

  draw(ctx: CanvasRenderingContext2D, video: HTMLVideoElement | HTMLCanvasElement, time: number) {
    const { startTime, endTime, hook, subtitleMode, preserveBurnedSubtitles } = this.opts;
    const t = this.template;
    const p = (time - startTime) / Math.max(0.1, endTime - startTime);

    const vw = "videoWidth" in video ? video.videoWidth || 16 : video.width;
    const vh = "videoHeight" in video ? video.videoHeight || 9 : video.height;

    // ১. ব্যাকগ্রাউন্ড: পুরো ৯:১৬ স্ক্রিন জুড়ে ভাইব্র্যান্ট ও স্মুথ ব্লার
    ctx.save();
    ctx.fillStyle = t.bg || "#0f172a";
    ctx.fillRect(0, 0, OUT_W, OUT_H);

    ctx.filter = "blur(35px) brightness(0.65)";
    const bgScale = Math.max(OUT_W / vw, OUT_H / vh) * 1.15;
    const bgW = vw * bgScale;
    const bgH = vh * bgScale;
    ctx.drawImage(video, (OUT_W - bgW) / 2, (OUT_H - bgH) / 2, bgW, bgH);
    ctx.restore();

    // গ্রাডিয়েন্ট শেইড যাতে টেক্সট ক্রিস্প দেখায়
    const grad = ctx.createLinearGradient(0, 0, 0, OUT_H);
    grad.addColorStop(0, "rgba(0,0,0,0.45)");
    grad.addColorStop(0.3, "rgba(0,0,0,0.15)");
    grad.addColorStop(0.7, "rgba(0,0,0,0.25)");
    grad.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, OUT_W, OUT_H);

    // ২. মূল ভিডিও ফ্রেম (বড়, স্পষ্ট এবং প্রিমিয়াম শ্যাডো)
    const fg = this.foregroundLayout(video);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.65)";
    ctx.shadowBlur = 45;
    ctx.shadowOffsetY = 20;

    if (this.opts.crop.layout !== "fill") {
      roundRect(ctx, fg.x, fg.y, fg.w, fg.h, 32);
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.clip();
    }
    ctx.drawImage(video, fg.x, fg.y, fg.w, fg.h);
    ctx.restore();

    // ৩. হুক কার্ড (আগের চেয়ে বড় ও সুন্দর পজিশনে)
    if (hook) {
      ctx.save();
      ctx.font = `bold 54px ${t.jaFont || "sans-serif"}`;
      const lines = wrapText(ctx, hook, OUT_W - 160);
      const lineH = 68;
      const boxH = lines.length * lineH + 36;
      const boxY = Math.max(160, fg.y - boxH - 45);
      const boxW = Math.min(OUT_W - 80, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 90);

      // হুক ব্যাকগ্রাউন্ড
      roundRect(ctx, (OUT_W - boxW) / 2, boxY, boxW, boxH, 28);
      ctx.fillStyle = t.hookBg || "#facc15";
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 25;
      ctx.shadowOffsetY = 10;
      ctx.fill();

      // হুক টেক্সট
      ctx.shadowColor = "transparent";
      ctx.fillStyle = t.hookColor || "#000000";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      lines.forEach((l, i) => ctx.fillText(l, OUT_W / 2, boxY + 18 + lineH * i + lineH / 2));
      ctx.restore();
    }

    // ৪. JLPT ব্যাজ
    const badge = this.opts.level ? `JLPT ${this.opts.level}` : t.badge;
    if (badge) {
      ctx.save();
      ctx.font = `bold 32px ${t.jaFont || "sans-serif"}`;
      const badgeW = ctx.measureText(badge).width + 48;
      roundRect(ctx, 50, 75, badgeW, 58, 29);
      ctx.fillStyle = t.accent || "#f59e0b";
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 15;
      ctx.shadowOffsetY = 6;
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(badge, 74, 104);
      ctx.restore();
    }

    // ৫. সাবটাইটেল (যদি মোড preserve না হয়)
    if (subtitleMode !== "preserve") {
      const seg = this.currentSegment(time);
      if (seg) {
        const showRomaji = subtitleMode.includes("romaji") && seg.romaji;
        const showEn = subtitleMode.includes("en") && seg.en;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const maxW = OUT_W - 120;
        let y = fg.y + fg.h + 60;

        ctx.font = `bold ${t.jaSize || 46}px ${t.jaFont || "sans-serif"}`;
        const jaLines = wrapText(ctx, seg.ja, maxW);

        for (const l of jaLines) {
          ctx.lineWidth = 8;
          ctx.lineJoin = "round";
          ctx.strokeStyle = "rgba(0,0,0,0.85)";
          ctx.strokeText(l, OUT_W / 2, y);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(l, OUT_W / 2, y);
          y += (t.jaSize || 46) + 14;
        }

        if (showRomaji) {
          ctx.font = `600 36px ${t.jaFont || "sans-serif"}`;
          for (const l of wrapText(ctx, seg.romaji, maxW)) {
            ctx.fillStyle = t.romajiColor || "#93c5fd";
            ctx.fillText(l, OUT_W / 2, y + 4);
            y += 44;
          }
        }

        if (showEn) {
          ctx.font = `500 38px ${t.jaFont || "sans-serif"}`;
          for (const l of wrapText(ctx, seg.en, maxW)) {
            ctx.fillStyle = t.enColor || "#e2e8f0";
            ctx.fillText(l, OUT_W / 2, y + 8);
            y += 48;
          }
        }
        ctx.restore();
      }
    }

    // ৬. বটম প্রগ্রেস বার
    if (this.opts.showProgress !== false) {
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(0, OUT_H - 12, OUT_W, 12);
      ctx.fillStyle = t.accent || "#f59e0b";
      ctx.fillRect(0, OUT_H - 12, OUT_W * Math.min(1, Math.max(0, p)), 12);
    }
  }
}

export function pickRecorderMime(): { mime: string; format: "mp4" | "webm" } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates: Array<[string, "mp4" | "webm"]> = [
    ['video/mp4;codecs="avc1.640028,mp4a.40.2"', "mp4"],
    ['video/mp4;codecs="avc1.42E01E,mp4a.40.2"', "mp4"],
    ["video/mp4", "mp4"],
    ['video/webm;codecs="h264,opus"', "webm"],
    ["video/webm;codecs=vp9,opus", "webm"],
    ["video/webm", "webm"],
  ];
  for (const [mime, format] of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return { mime, format };
  }
  return null;
}

export async function renderShort(
  sourceUrl: string,
  opts: RenderOptions,
  onProgress?: (p: number) => void,
  fps = 30,
): Promise<{ blob: Blob; format: "mp4" | "webm"; mime: string }> {
  const rec = pickRecorderMime();
  if (!rec) throw new Error("Please use Chrome or Edge browser.");

  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.preload = "auto";
  video.playsInline = true;
  video.muted = false;
  video.src = sourceUrl;
  video.style.position = "fixed";
  video.style.top = "0px";
  video.style.left = "0px";
  video.style.width = "10px";
  video.style.height = "10px";
  video.style.opacity = "0.01";
  video.style.pointerEvents = "none";
  video.style.zIndex = "-1";
  document.body.appendChild(video);

  await new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res();
    video.onerror = () => rej(new Error("Could not load source video"));
  });

  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d", { alpha: false })!;
  const composer = new ShortComposer(opts);

  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new AudioContextClass();
  const srcNode = ac.createMediaElementSource(video);
  const dest = ac.createMediaStreamDestination();
  srcNode.connect(dest);

  const stream = canvas.captureStream(fps);
  for (const track of dest.stream.getAudioTracks()) stream.addTrack(track);

  const recorder = new MediaRecorder(stream, {
    mimeType: rec.mime,
    videoBitsPerSecond: 16_000_000,
    audioBitsPerSecond: 192_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  await new Promise<void>((res) => {
    const handleSeeked = () => {
      video.removeEventListener("seeked", handleSeeked);
      res();
    };
    video.addEventListener("seeked", handleSeeked);
    video.currentTime = opts.startTime;
  });

  composer.draw(ctx, video, opts.startTime);

  const done = new Promise<Blob>((res) => {
    recorder.onstop = () => res(new Blob(chunks, { type: rec.mime }));
  });

  await ac.resume();
  recorder.start(200);
  await video.play();

  const totalDuration = Math.max(0.1, opts.endTime - opts.startTime);

  await new Promise<void>((res) => {
    let active = true;

    const onFrame = () => {
      if (!active) return;
      const t = video.currentTime;
      composer.draw(ctx, video, t);

      const elapsed = Math.max(0, t - opts.startTime);
      onProgress?.(Math.min(0.99, elapsed / totalDuration));

      if (t >= opts.endTime || video.ended || video.paused) {
        active = false;
        video.pause();
        res();
        return;
      }

      if ("requestVideoFrameCallback" in video) {
        (video as unknown as { requestVideoFrameCallback: (cb: () => void) => void }).requestVideoFrameCallback(onFrame);
      } else {
        requestAnimationFrame(onFrame);
      }
    };

    if ("requestVideoFrameCallback" in video) {
      (video as unknown as { requestVideoFrameCallback: (cb: () => void) => void }).requestVideoFrameCallback(onFrame);
    } else {
      requestAnimationFrame(onFrame);
    }
  });

  recorder.stop();
  const blob = await done;

  srcNode.disconnect();
  await ac.close();
  if (video.parentNode) video.parentNode.removeChild(video);
  video.src = "";

  if (onProgress) onProgress(1);
  return { blob, format: rec.format, mime: rec.mime };
}
