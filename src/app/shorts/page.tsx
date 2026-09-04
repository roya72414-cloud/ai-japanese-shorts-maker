import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { shorts, videos } from "@/db/schema";
import { ShortsGallery } from "@/components/ShortsGallery";

export const dynamic = "force-dynamic";

export default async function ShortsPage() {
  const rows = await db
    .select({ short: shorts, videoName: videos.name, videoThumb: videos.thumbnailPath })
    .from(shorts)
    .innerJoin(videos, eq(shorts.videoId, videos.id))
    .orderBy(desc(shorts.createdAt));
  return <ShortsGallery initial={rows.map((r) => ({ ...r.short, videoName: r.videoName, videoThumb: r.videoThumb }))} />;
}
