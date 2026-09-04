import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { moments, videos } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const videoId = Number(new URL(req.url).searchParams.get("videoId") ?? 0);
  const q = db
    .select({ moment: moments, videoName: videos.name, videoThumb: videos.thumbnailPath, videoPath: videos.storagePath })
    .from(moments)
    .innerJoin(videos, eq(moments.videoId, videos.id))
    .orderBy(desc(moments.score));
  const rows = videoId ? await q.where(eq(moments.videoId, videoId)) : await q;
  return Response.json(rows.map((r) => ({ ...r.moment, videoName: r.videoName, videoThumb: r.videoThumb, videoPath: r.videoPath })));
}
