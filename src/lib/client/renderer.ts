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

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function motionAt(motion: string, p: number) {
  const e = easeInOut(Math.min(1, Math.max(0, p)));
  switch (motion) {
    case "ken-burns":
      return { scale: 1 + 0.06 * e, dx: -0.015 * e, dy: 0.01 * e, fgScale: 0.975 + 0.025 * e };
    case "slow-pan":
      return { scale: 1.06, dx: -0.03 + 0.06 * e, dy: 0, fgScale: 0.985 + 0.015 * e };
    case "subtle-scale":
      return { scale: 1 + 0.03 * Math.sin(p * Math.PI), dx: 0, dy: 0, fgScale: 0.985 + 0.015 * Math.sin(p * Math.PI) };
    default:
      return { scale: 1.02, dx: 0, dy: 0, fgScale: 1 };
  }
}

export class ShortComposer {
  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  template: CaptionTemplate;

  constructor(public opts: RenderOptions) {
    this.template = getTemplate(opts.templateId);
    this.bgCanvas = document.createElement("canvas");
    this.bgCanvas.width = 270;
    this.bgCanvas.height = 480;
    this.bgCtx = this.bgCanvas.getContext("2d")!;
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

  private foregroundLayout(video: HTMLVideoElement | HTMLCanvasElement, fgScale: number): Layout {
    const vw = "videoWidth" in video ? video.videoWidth || 16 : video.width;
    const vh = "videoHeight" in video ? video.videoHeight || 9 : video.height;
    const { crop, zoom } = this.opts;
    const aspect = vw / vh;
    if (crop.layout === "fill") {
      const h = OUT_H * zoom * fgScale;
      const w = h * aspect;
      const x = (OUT_W - w) / 2 + crop.offsetX * Math.max(0, (w - OUT_W) / 2);
      const y = (OUT_H - h) / 2;
      return { x, y, w, h };
    }
    const w = OUT_W * Math.min(1, zoom) * fgScale;
    const h = w / aspect;
    const centerY = crop.layout === "top" ? OUT_H * 0.36 : OUT_H * 0.47;
    const y = centerY - h / 2 + crop.offsetY * OUT_H * 0.12;
    return { x: (OUT_W - w) / 2, y, w, h };
  }

  draw(ctx: CanvasRenderingContext2D, video: HTMLVideoElement | HTMLCanvasElement, time: number) {
    const { startTime, endTime, motion, hook, subtitleMode, preserveBurnedSubtitles } = this.opts;
    const t = this.template;
    const p = (time - startTime) / Math.max(0.1, endTime - startTime);
    const m = motionAt(motion, p);

    // ১. ব্যাকগ্রাউন্ড ব্লার
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, OUT_W, OUT_H);
    const bc = this.bgCtx;
    bc.filter = "blur(12px)";
    const vw = "videoWidth" in video ? video.videoWidth || 16 : video.width;
    const vh = "videoHeight" in video ? video.videoHeight || 9 : video.height;
    const coverScale = Math.max(this.bgCanvas.width / vw, this.bgCanvas.height / vh) * m.scale;
    const bw = vw * coverScale;
    const bh = vh * coverScale;
    bc.drawImage(video, (this.bgCanvas.width - bw) / 2 + m.dx * this.bgCanvas.width, (this.bgCanvas.height - bh) / 2 + m.dy * this.bgCanvas.height, bw, bh);
    bc.filter = "none";
    ctx.drawImage(this.bgCanvas, 0, 0, OUT_W, OUT_H);

    const grad = ctx.createLinearGradient(0, 0, 0, OUT_H);
    grad.addColorStop(0, hexToRgba(t.bg, 0.78));
    grad.addColorStop(0.5, hexToRgba(t.bg2, 0.55));
    grad.addColorStop(1, hexToRgba(t.bg, 0.88));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, OUT_W, OUT_H);

    // ২. মূল ভিডিও ফ্রেম
    const fg = this.foregroundLayout(video, m.fgScale);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    if (this.opts.crop.layout !== "fill") {
      roundRect(ctx, fg.x, fg.y, fg.w, fg.h, 28);
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.clip();
    }
    ctx.drawImage(video, fg.x, fg.y, fg.w, fg.h);
    ctx.restore();

    // ৩. ব্যাজ
    const badge = this.opts.level ? `JLPT ${this.opts.level}` : t.badge;
    if (badge) {
      ctx.save();
      ctx.font = `700 34px ${t.jaFont}`;
      const w = ctx.measureText(badge).width + 44;
      roundRect(ctx, 48, 72, w, 60, 30);
      ctx.fillStyle = t.accent;
      ctx.fill();
      ctx.fillStyle = t.id === "vocabulary" ? "#ffffff" : "#0b0b12";
      ctx.textBaseline = "middle";
      ctx.fillText(badge, 70, 103);
      ctx.restore();
    }

    // ৪. হুক কার্ড
    if (hook) {
      ctx.save();
      ctx.font = `${t.weight} 56px ${t.jaFont}`;
      const lines = wrapText(ctx, hook, OUT_W - 200);
      const lineH = 72;
      const boxH = lines.length * lineH + 40;
      const boxY = Math.max(150, fg.y - boxH - 44);
      const boxW = Math.min(OUT_W - 96, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 88);
      if (t.pillStyle !== "none") {
        roundRect(ctx, (OUT_W - boxW) / 2, boxY, boxW, boxH, t.pillStyle === "rounded" ? 32 : 8);
        ctx.fillStyle = t.hookBg;
        ctx.fill();
      }
      ctx.fillStyle = t.hookColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      lines.forEach((l, i) => ctx.fillText(l, OUT_W / 2, boxY + 20 + lineH * i + lineH / 2));
      ctx.restore();
    }

    // ৫. সাবটাইটেল
    if (subtitleMode !== "preserve") {
      const seg = this.currentSegment(time);
      if (seg) {
        const showRomaji = subtitleMode.includes("romaji") && seg.romaji;
        const showEn = subtitleMode.includes("en") && seg.en;
        const revealEn = t.id !== "listening-challenge" || p > 0.55;
        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const maxW = OUT_W - 140;
        let y = fg.y + fg.h + 70;

        ctx.font = `${t.weight} ${t.jaSize}px ${t.jaFont}`;
        const jaLines = wrapText(ctx, seg.ja, maxW);
        if (preserveBurnedSubtitles && subtitleMode === "ja") {
          ctx.font = `${t.weight} ${Math.round(t.jaSize * 0.85)}px ${t.jaFont}`;
        }
        if (t.id === "vocabulary" || t.id === "conversation") {
          const totalH = jaLines.length * (t.jaSize + 12) + (showRomaji ? 52 : 0) + (showEn ? 56 : 0) + 56;
          roundRect(ctx, 60, y - 28, OUT_W - 120, totalH, 32);
          ctx.fillStyle = t.id === "vocabulary" ? "#ffffff" : "rgba(255,255,255,0.10)";
          ctx.fill();
        }
        for (const l of jaLines) {
          ctx.lineWidth = 10;
          ctx.lineJoin = "round";
          ctx.strokeStyle = t.jaStroke;
          if (t.jaStroke !== "rgba(255,255,255,0)" && t.jaStroke !== "rgba(0,0,0,0)") ctx.strokeText(l, OUT_W / 2, y);
          ctx.fillStyle = t.jaColor;
          ctx.fillText(l, OUT_W / 2, y);
          y += t.jaSize + 12;
        }
        if (showRomaji) {
          ctx.font = `600 38px ${t.jaFont}`;
          for (const l of wrapText(ctx, seg.romaji, maxW)) {
            ctx.fillStyle = t.romajiColor;
            ctx.fillText(l, OUT_W / 2, y + 6);
            y += 48;
          }
        }
        if (showEn && revealEn) {
          ctx.font = `500 40px ${t.jaFont}`;
          for (const l of wrapText(ctx, seg.en, maxW)) {
            ctx.fillStyle = t.enColor;
            ctx.fillText(l, OUT_W / 2, y + 10);
            y += 52;
          }
        } else if (showEn && !revealEn) {
          ctx.font = `600 40px ${t.jaFont}`;
          ctx.fillStyle = t.enColor;
          ctx.fillText("Can you understand it? …", OUT_W / 2, y + 10);
        }
        ctx.restore();
      }
    }

    // ৬. প্রগ্রেস বার
    if (this.opts.showProgress !== false) {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(0, OUT_H - 10, OUT_W, 10);
      ctx.fillStyle = t.accent;
      ctx.fillRect(0, OUT_H - 10, OUT_W * Math.min(1, Math.max(0, p)), 10);
    }
  }
}

function hexToRgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
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
  video.style.width = "4px";
  video.style.height = "4px";
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

  // requestVideoFrameCallback দিয়ে হার্ডওয়্যার পারফেক্ট অডিও-ভিডিও সিঙ্ক
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
