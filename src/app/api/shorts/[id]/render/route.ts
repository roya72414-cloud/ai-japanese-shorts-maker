import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shorts } from "@/db/schema";
import { ensureDir, removeFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Receives the rendered 9:16 video blob from the browser render engine.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const format = new URL(req.url).searchParams.get("format") === "webm" ? "webm" : "mp4";
  if (!req.body) return Response.json({ error: "No body" }, { status: 400 });
  const [existing] = await db.select().from(shorts).where(eq(shorts.id, id));
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });
  removeFile(existing.outputPath);
  const dir = ensureDir("renders");
  const file = `short-${id}-${Date.now()}.${format}`;
  const abs = path.join(dir, file);
  await pipeline(Readable.fromWeb(req.body as never), fs.createWriteStream(abs));
  const size = fs.statSync(abs).size;
  const [row] = await db
    .update(shorts)
    .set({ outputPath: `renders/${file}`, outputFormat: format, outputSize: size, status: "complete", progress: 100, updatedAt: new Date() })
    .where(eq(shorts.id, id))
    .returning();
  return Response.json(row);
}
