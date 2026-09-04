"use client";

import type { SubtitleArea } from "@/db/schema";

export type ProbeResult = {
  duration: number;
  width: number;
  height: number;
};

export function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.crossOrigin = "anonymous";
    v.src = src;
    const onMeta = () => {
      cleanup();
      resolve(v);
    };
    const onErr = () => {
      cleanup();
      reject(new Error("Could not read this video. Try MP4 (H.264) or WebM."));
    };
    const cleanup = () => {
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("error", onErr);
    };
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("error", onErr);
  });
}

export async function probeVideo(src: string): Promise<ProbeResult> {
  const v = await loadVideo(src);
  let duration = v.duration;
  if (!Number.isFinite(duration) || duration === 0) {
    // Some containers report Infinity until seeked
    duration = await new Promise<number>((res) => {
      v.currentTime = 1e9;
      v.addEventListener("durationchange", () => res(v.duration), { once: true });
      setTimeout(() => res(v.duration || 0), 1500);
    });
  }
  return { duration: Number.isFinite(duration) ? duration : 0, width: v.videoWidth, height: v.videoHeight };
}

export function seekTo(v: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      v.removeEventListener("seeked", done);
      resolve();
    };
    v.addEventListener("seeked", done);
    v.currentTime = Math.min(Math.max(0, time), Math.max(0, (v.duration || time) - 0.05));
    setTimeout(done, 2500);
  });
}

export async function captureFrame(v: HTMLVideoElement, time: number, width = 320): Promise<string> {
  await seekTo(v, time);
  const ratio = v.videoHeight / Math.max(1, v.videoWidth);
  const c = document.createElement("canvas");
  c.width = width;
  c.height = Math.round(width * ratio);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(v, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.72);
}

export async function generateThumbnails(src: string, count: number, width = 160): Promise<string[]> {
  const v = await loadVideo(src);
  const d = v.duration || 0;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = d > 0 ? (d * (i + 0.5)) / count : 0;
    try {
      out.push(await captureFrame(v, t, width));
    } catch {
      out.push("");
    }
  }
  v.src = "";
  return out;
}

/**
 * Detects a burned-in subtitle band by looking for rows in the lower half of the
 * frame with clusters of bright, high-contrast pixels across several samples.
 * Also estimates whether the video is a static image (frames barely change).
 */
export async function analyzeFrames(src: string): Promise<{ subtitleArea: SubtitleArea; isStatic: boolean }> {
  const v = await loadVideo(src);
  const d = v.duration || 0;
  const W = 192;
  const H = Math.max(1, Math.round((W * v.videoHeight) / Math.max(1, v.videoWidth)));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const rowScore = new Float32Array(H);
  const samples = d > 0 ? [0.12, 0.3, 0.5, 0.7, 0.88] : [0];
  let prev: Uint8ClampedArray | null = null;
  let diffTotal = 0;
  let diffCount = 0;

  for (const p of samples) {
    await seekTo(v, d * p);
    ctx.drawImage(v, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);
    if (prev) {
      let diff = 0;
      for (let i = 0; i < data.length; i += 16) diff += Math.abs(data[i] - prev[i]);
      diffTotal += diff / (data.length / 16);
      diffCount++;
    }
    prev = data;
    for (let y = Math.floor(H * 0.45); y < H; y++) {
      let bright = 0;
      let edges = 0;
      for (let x = 1; x < W; x++) {
        const i = (y * W + x) * 4;
        const l = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        const lp = (data[i - 4] * 299 + data[i - 3] * 587 + data[i - 2] * 114) / 1000;
        if (l > 215) bright++;
        if (Math.abs(l - lp) > 90) edges++;
      }
      // Subtitle rows: some bright pixels (not a full white band) and many edges
      if (bright > W * 0.03 && bright < W * 0.7 && edges > W * 0.06) rowScore[y] += 1;
    }
  }

  const threshold = Math.max(1, samples.length * 0.4);
  let top = -1;
  let bottom = -1;
  for (let y = 0; y < H; y++) {
    if (rowScore[y] >= threshold) {
      if (top < 0) top = y;
      bottom = y;
    }
  }
  const detected = top >= 0 && bottom - top >= H * 0.02;
  const confidence = detected ? Math.min(1, (bottom - top) / (H * 0.15) + 0.4) : 0;
  const subtitleArea: SubtitleArea = detected
    ? { detected: true, top: Math.max(0, top / H - 0.02), bottom: Math.min(1, bottom / H + 0.03), confidence }
    : { detected: false, top: 0.78, bottom: 0.95, confidence: 0 };
  const isStatic = diffCount > 0 ? diffTotal / diffCount < 6 : false;
  v.src = "";
  return { subtitleArea, isStatic };
}

/** Decodes the audio track and returns mono 16 kHz WAV chunks (<= chunkSeconds each). */
export async function extractAudioChunks(
  src: string,
  rangeStart: number,
  rangeEnd: number,
  chunkSeconds = 600,
  onProgress?: (p: number) => void,
): Promise<Array<{ blob: Blob; offset: number }>> {
  const res = await fetch(src);
  const buf = await res.arrayBuffer();
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new AC();
  const decoded = await ac.decodeAudioData(buf);
  await ac.close();
  const rate = 16000;
  const chunks: Array<{ blob: Blob; offset: number }> = [];
  const total = Math.min(rangeEnd, decoded.duration) - rangeStart;
  let t = rangeStart;
  while (t < rangeStart + total) {
    const len = Math.min(chunkSeconds, rangeStart + total - t);
    const frames = Math.floor(len * rate);
    const off = new OfflineAudioContext(1, frames, rate);
    const srcNode = off.createBufferSource();
    srcNode.buffer = decoded;
    srcNode.connect(off.destination);
    srcNode.start(0, t, len);
    const rendered = await off.startRendering();
    chunks.push({ blob: encodeWav(rendered.getChannelData(0), rate), offset: t });
    t += len;
    onProgress?.(Math.min(1, (t - rangeStart) / total));
  }
  return chunks;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let o = 44;
  for (let i = 0; i < samples.length; i++, o += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}
