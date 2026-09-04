import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { moments, shorts, videos } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const videoId = Number(new URL(req.url).searchParams.get("videoId") ?? 0);
  const q = db
    .select({ short: shorts, videoName: videos.name, videoThumb: videos.thumbnailPath, videoPath: videos.storagePath, subtitleArea: videos.subtitleArea })
    .from(shorts)
    .innerJoin(videos, eq(shorts.videoId, videos.id))
    .orderBy(desc(shorts.createdAt));
  const rows = videoId ? await q.where(eq(shorts.videoId, videoId)) : await q;
  return Response.json(rows.map((r) => ({ ...r.short, videoName: r.videoName, videoThumb: r.videoThumb, videoPath: r.videoPath, subtitleArea: r.subtitleArea })));
}

// Creates shorts from one or more moments (queue entries start as "waiting").
export async function POST(req: Request) {
  const body = (await req.json()) as {
    momentIds: number[];
    template?: string;
    subtitleMode?: string;
    motion?: string;
    status?: string;
    overrides?: { startTime?: number; endTime?: number; hook?: string; title?: string };
  };
  if (!body.momentIds?.length) return Response.json({ error: "momentIds required" }, { status: 400 });
  const rows = await db.select().from(moments).where(inArray(moments.id, body.momentIds));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = body.momentIds.map((id) => byId.get(id)).filter(Boolean) as typeof rows;
  const created = await db
    .insert(shorts)
    .values(
      ordered.map((m) => ({
        videoId: m.videoId,
        momentId: m.id,
        title: body.overrides?.title ?? m.title,
        hook: body.overrides?.hook ?? m.hook,
        description: m.description,
        hashtags: m.hashtags,
        category: m.category,
        score: m.score,
        startTime: body.overrides?.startTime ?? m.startTime,
        endTime: body.overrides?.endTime ?? m.endTime,
        template: body.template ?? "default",
        subtitleMode: body.subtitleMode ?? "preserve",
        motion: body.motion ?? "ken-burns",
        crop: { layout: "fit" as const, offsetX: 0, offsetY: 0 },
        zoom: 1,
        status: body.status === "draft" ? "draft" : "waiting",
        progress: 0,
      })),
    )
    .returning();
  return Response.json(created, { status: 201 });
}
