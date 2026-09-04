import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { moments, shorts, transcripts, videos } from "@/db/schema";
import { ShortEditor } from "@/components/ShortEditor";

export const dynamic = "force-dynamic";

export default async function ShortEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!id) notFound();
  const [short] = await db.select().from(shorts).where(eq(shorts.id, id));
  if (!short) notFound();
  const [video] = await db.select().from(videos).where(eq(videos.id, short.videoId));
  if (!video) notFound();
  const [transcript] = await db.select().from(transcripts).where(eq(transcripts.videoId, short.videoId));
  const moment = short.momentId ? (await db.select().from(moments).where(eq(moments.id, short.momentId)))[0] ?? null : null;
  return <ShortEditor key={short.id} short={short} video={video} moment={moment} segments={transcript?.segments ?? []} />;
}
