import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { moments, shorts, videos } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const [counts] = await db
    .select({
      uploaded: sql<number>`(select count(*) from ${videos})`.mapWith(Number),
      analyzed: sql<number>`(select count(*) from ${videos} where ${videos.status} = 'analyzed')`.mapWith(Number),
      momentsFound: sql<number>`(select count(*) from ${moments})`.mapWith(Number),
      shortsGenerated: sql<number>`(select count(*) from ${shorts} where ${shorts.status} = 'complete')`.mapWith(Number),
    })
    .from(sql`(select 1) as one`);
  const recent = await db
    .select({
      video: videos,
      shortCount: sql<number>`(select count(*) from ${shorts} where ${shorts.videoId} = ${videos.id} and ${shorts.status} = 'complete')`.mapWith(Number),
    })
    .from(videos)
    .orderBy(desc(videos.createdAt))
    .limit(8);
  const recentShorts = await db
    .select({ short: shorts, videoName: videos.name })
    .from(shorts)
    .innerJoin(videos, eq(shorts.videoId, videos.id))
    .orderBy(desc(shorts.createdAt))
    .limit(6);
  return Response.json({
    counts,
    recent: recent.map((r) => ({ ...r.video, shortCount: r.shortCount })),
    recentShorts: recentShorts.map((r) => ({ ...r.short, videoName: r.videoName })),
  });
}
