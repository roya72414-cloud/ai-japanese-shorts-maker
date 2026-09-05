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
  try {
    const id = Number((await params).id);
    if (!id) return Response.json({ error: "Invalid ID" }, { status: 400 });

    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    if (video) {
      // ১. চাইল্ড শর্টসগুলোর ফাইল ডিলিট
      const shortRows = await db.select().from(shorts).where(eq(shorts.videoId, id));
      for (const s of shortRows) {
        if (s.outputPath) await Promise.resolve(removeFile(s.outputPath)).catch(() => {});
      }

      // ২. মূল ভিডিও ও থাম্বনেইল ফাইল স্টোরেজ থেকে রিমুভ
      if (video.storagePath) await Promise.resolve(removeFile(video.storagePath)).catch(() => {});
      if (video.thumbnailPath) await Promise.resolve(removeFile(video.thumbnailPath)).catch(() => {});

      // ৩. সম্পর্কিত সব রেকর্ড ডেটাবেজ থেকে মুছে দেওয়া
      await db.delete(shorts).where(eq(shorts.videoId, id));
      await db.delete(moments).where(eq(moments.videoId, id));
      await db.delete(transcripts).where(eq(transcripts.videoId, id));
      await db.delete(videos).where(eq(videos.id, id));
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Delete failed" }, { status: 500 });
  }
}
