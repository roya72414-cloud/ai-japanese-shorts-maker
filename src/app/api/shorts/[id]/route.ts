import { eq } from "drizzle-orm";
import { db } from "@/db";
import { moments, shorts, transcripts, videos } from "@/db/schema";
import { removeFile } from "@/lib/storage";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const [short] = await db.select().from(shorts).where(eq(shorts.id, id));
  if (!short) return Response.json({ error: "Not found" }, { status: 404 });
  const [video] = await db.select().from(videos).where(eq(videos.id, short.videoId));
  const [transcript] = await db.select().from(transcripts).where(eq(transcripts.videoId, short.videoId));
  const moment = short.momentId ? (await db.select().from(moments).where(eq(moments.id, short.momentId)))[0] ?? null : null;
  return Response.json({ short, video, moment, segments: transcript?.segments ?? [] });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const body = await req.json();
  const allowed = ["title", "hook", "description", "hashtags", "startTime", "endTime", "template", "subtitleMode", "crop", "zoom", "motion", "status", "progress", "category"] as const;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const k of allowed) if (k in body) patch[k] = body[k];
  const [row] = await db.update(shorts).set(patch).where(eq(shorts.id, id)).returning();
  return Response.json(row);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const [short] = await db.select().from(shorts).where(eq(shorts.id, id));
  if (short) {
    removeFile(short.outputPath);
    await db.delete(shorts).where(eq(shorts.id, id));
  }
  return Response.json({ ok: true });
}
