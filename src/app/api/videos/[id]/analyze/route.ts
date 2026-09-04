import { eq } from "drizzle-orm";
import { db } from "@/db";
import { moments, transcripts, videos, type TranscriptSegment } from "@/db/schema";
import { generateLessonTranscript, normalizeSttSegments, type RawSttSegment } from "@/lib/engine/transcript";
import { findBestMoments } from "@/lib/engine/scoring";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Runs the full moment pipeline for a video:
 * transcript -> sentence segmentation -> learning-value analysis -> KPI scoring -> ranking.
 * The client may pass STT segments (from /api/transcribe); otherwise the built-in engine is used.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const body = (await req.json().catch(() => ({}))) as {
    rangeStart?: number;
    rangeEnd?: number;
    sttSegments?: RawSttSegment[] | null;
    minDuration?: number;
    maxDuration?: number;
  };
  const [video] = await db.select().from(videos).where(eq(videos.id, id));
  if (!video) return Response.json({ error: "Not found" }, { status: 404 });

  const rangeStart = Math.max(0, body.rangeStart ?? video.rangeStart ?? 0);
  const rangeEnd = Math.min(video.duration || Infinity, body.rangeEnd || video.rangeEnd || video.duration);
  await db.update(videos).set({ status: "analyzing", rangeStart, rangeEnd }).where(eq(videos.id, id));

  let segments: TranscriptSegment[];
  let engine: "openai" | "builtin";
  if (body.sttSegments && body.sttSegments.length > 0) {
    engine = "openai";
    segments = normalizeSttSegments(body.sttSegments).filter((s) => s.start >= rangeStart - 1 && s.end <= rangeEnd + 1);
  } else {
    engine = "builtin";
    segments = generateLessonTranscript(id * 7919 + Math.round(video.duration), rangeStart, rangeEnd);
  }

  const found = findBestMoments(segments, {
    hasBurnedSubtitles: video.hasBurnedSubtitles,
    transcriptEngine: engine,
    minDuration: body.minDuration,
    maxDuration: body.maxDuration,
  });

  await db.delete(transcripts).where(eq(transcripts.videoId, id));
  await db.insert(transcripts).values({ videoId: id, engine, segments });
  await db.delete(moments).where(eq(moments.videoId, id));
  if (found.length) {
    await db.insert(moments).values(
      found.map((m, i) => ({
        videoId: id,
        rank: i + 1,
        score: m.score,
        startTime: m.startTime,
        endTime: m.endTime,
        category: m.category,
        quoteJa: m.quote.ja,
        quoteRomaji: m.quote.romaji,
        quoteEn: m.quote.en,
        reasons: m.reasons,
        kpis: m.kpis,
        hook: m.hook,
        title: m.title,
        description: m.description,
        hashtags: m.hashtags,
        level: m.level,
        segmentIds: m.segments.map((s) => s.id),
      })),
    );
  }
  const [updated] = await db
    .update(videos)
    .set({
      status: "analyzed",
      bestScore: found[0]?.score ?? 0,
      momentCount: found.length,
      transcriptEngine: engine,
      analyzedAt: new Date(),
    })
    .where(eq(videos.id, id))
    .returning();
  const rows = await db.select().from(moments).where(eq(moments.videoId, id));
  rows.sort((a, b) => a.rank - b.rank);
  return Response.json({ video: updated, moments: rows, segments: segments.length, engine });
}
