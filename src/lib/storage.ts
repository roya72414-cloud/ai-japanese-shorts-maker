import fs from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const DATA_DIR = path.join(process.cwd(), "data");

export function ensureDir(sub: string) {
  const dir = path.join(DATA_DIR, sub);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function absolutePath(relative: string) {
  const abs = path.normalize(path.join(DATA_DIR, relative));
  if (!abs.startsWith(DATA_DIR)) throw new Error("Invalid path");
  return abs;
}

export async function removeFile(relative: string | null | undefined) {
  if (!relative) return;
  try {
    const p = absolutePath(relative);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch {
    // ignore
  }
}

const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT || "";
const STORAGE_REGION = process.env.STORAGE_REGION || "ap-southeast-2";
const STORAGE_ACCESS_KEY_ID = process.env.STORAGE_ACCESS_KEY_ID || "";
const STORAGE_SECRET_ACCESS_KEY = process.env.STORAGE_SECRET_ACCESS_KEY || "";
export const STORAGE_BUCKET = process.env.STORAGE_BUCKET_NAME || "videos";
export const STORAGE_PUBLIC_URL = (process.env.STORAGE_PUBLIC_URL || "").replace(/\/$/, "");

export const s3 = new S3Client({
  region: STORAGE_REGION,
  endpoint: STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: STORAGE_ACCESS_KEY_ID,
    secretAccessKey: STORAGE_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

export function safeName(name: string) {
  return name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80) || "file";
}

export async function uploadToStorage(key: string, body: Buffer | Uint8Array, contentType: string) {
  if (!STORAGE_BUCKET) return;
  const cmd = new PutObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await s3.send(cmd);
}

export async function deleteFromStorage(key: string | null | undefined) {
  if (!key || !STORAGE_BUCKET) return;
  try {
    const cmd = new DeleteObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
    });
    await s3.send(cmd);
  } catch (err) {
    console.error("Storage deletion error:", err);
  }
}

export function mimeFor(file: string) {
  const ext = file.substring(file.lastIndexOf(".")).toLowerCase();
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
