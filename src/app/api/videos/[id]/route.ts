import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { moments, shorts, transcripts, videos } from "@/db/schema";
import { removeFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const [video] = await db.select().from(videos).where(eq(videos.id, id));
  if (!video) return Response.json({ error: "Not found" }, { status: 404 });
  const momentRows = await db.select().from(moments).where(eq(moments.videoId, id)).orderBy(asc(moments.rank));
  const shortRows = await db.select().from(shorts).where(eq(shorts.videoId, id)).orderBy(asc(shorts.id));
  const [transcript] = await db.select().from(transcripts).where(eq(transcripts.videoId, id));
  return Response.json({ video, moments: momentRows, shorts: shortRows, transcript: transcript ?? null });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const body = await req.json();
  const allowed = ["name", "rangeStart", "rangeEnd", "hasBurnedSubtitles", "subtitleArea", "isStaticImage", "duration", "width", "height", "status"] as const;
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];
  const [row] = await db.update(videos).set(patch).where(eq(videos.id, id)).returning();
  return Response.json(row);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const id = Number((await params).id);
  const [video] = await db.select().from(videos).where(eq(videos.id, id));
  if (video) {
    const shortRows = await db.select().from(shorts).where(eq(shorts.videoId, id));
    for (const s of shortRows) removeFile(s.outputPath);
    removeFile(video.storagePath);
    removeFile(video.thumbnailPath);
    await db.delete(videos).where(eq(videos.id, id));
  }
  return Response.json({ ok: true });
}
