import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");

export function ensureDir(sub: string) {
  const dir = path.join(DATA_DIR, sub);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function safeName(name: string) {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80) || "file";
}

export function absolutePath(relative: string) {
  const abs = path.normalize(path.join(DATA_DIR, relative));
  if (!abs.startsWith(DATA_DIR)) throw new Error("Invalid path");
  return abs;
}

export function removeFile(relative: string | null | undefined) {
  if (!relative) return;
  try {
    fs.unlinkSync(absolutePath(relative));
  } catch {
    /* ignore */
  }
}

export function mimeFor(file: string) {
  const ext = path.extname(file).toLowerCase();
  const map: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
    ".m4v": "video/x-m4v",
    ".avi": "video/x-msvideo",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".json": "application/json",
    ".wav": "audio/wav",
  };
  return map[ext] ?? "application/octet-stream";
}
