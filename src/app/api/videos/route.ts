import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { moments, shorts, videos } from "@/db/schema";
import { ensureDir, safeName } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      video: videos,
      shortCount: sql<number>`(select count(*) from ${shorts} where ${shorts.videoId} = ${videos.id})`.mapWith(Number),
      momentCount: sql<number>`(select count(*) from ${moments} where ${moments.videoId} = ${videos.id})`.mapWith(Number),
    })
    .from(videos)
    .orderBy(desc(videos.createdAt));
  return Response.json(rows.map((r) => ({ ...r.video, shortCount: r.shortCount, momentCount: r.momentCount })));
}

// Streams the raw request body straight to disk (no in-memory buffering).
export async function POST(req: Request) {
  const url = new URL(req.url);
  const originalName = url.searchParams.get("filename") ?? "video.mp4";
  const mimeType = url.searchParams.get("type") || "video/mp4";
  const duration = Number(url.searchParams.get("duration") ?? 0);
  const width = Number(url.searchParams.get("width") ?? 0);
  const height = Number(url.searchParams.get("height") ?? 0);
  if (!req.body) return Response.json({ error: "No body" }, { status: 400 });

  const dir = ensureDir("uploads");
  const ext = path.extname(originalName) || ".mp4";
  const stored = `${Date.now()}-${safeName(path.basename(originalName, ext))}${ext}`;
  const abs = path.join(dir, stored);
  await pipeline(Readable.fromWeb(req.body as never), fs.createWriteStream(abs));
  const size = fs.statSync(abs).size;

  const [row] = await db
    .insert(videos)
    .values({
      name: path.basename(originalName, ext),
      originalName,
      storagePath: `uploads/${stored}`,
      mimeType,
      size,
      duration,
      width,
      height,
      rangeStart: 0,
      rangeEnd: duration,
    })
    .returning();
  return Response.json(row, { status: 201 });
}

export async function DELETE(req: Request) {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await db.delete(videos).where(eq(videos.id, id));
  return Response.json({ ok: true });
}
