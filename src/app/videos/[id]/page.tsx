import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { moments, settings, shorts, transcripts, videos } from "@/db/schema";
import { Studio } from "@/components/Studio";

export const dynamic = "force-dynamic";

export default async function VideoStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!id) notFound();
  const [video] = await db.select().from(videos).where(eq(videos.id, id));
  if (!video) notFound();
  const momentRows = await db.select().from(moments).where(eq(moments.videoId, id)).orderBy(asc(moments.rank));
  const shortRows = await db.select().from(shorts).where(eq(shorts.videoId, id)).orderBy(asc(shorts.id));
  const [transcript] = await db.select().from(transcripts).where(eq(transcripts.videoId, id));
  const [setting] = await db.select().from(settings).where(eq(settings.key, "app"));
  const v = (setting?.value ?? {}) as Record<string, unknown>;
  return (
    <Studio
      key={video.id}
      video={video}
      moments={momentRows}
      shorts={shortRows}
      transcript={transcript ?? null}
      defaults={{
        template: (v.defaultTemplate as string) ?? "japanese-learning",
        subtitleMode: (v.defaultSubtitleMode as string) ?? "preserve",
        motion: (v.defaultMotion as string) ?? "ken-burns",
        minScore: (v.minScore as number) ?? 80,
      }}
    />
  );
}
