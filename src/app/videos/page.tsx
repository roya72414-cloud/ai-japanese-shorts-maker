import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { Film, Upload } from "lucide-react";
import { db } from "@/db";
import { moments, shorts, videos } from "@/db/schema";
import { EmptyState, LinkButton, PageHeader, ScoreBadge, StatusPill } from "@/components/ui";
import { fileUrl, formatBytes, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VideosPage() {
  const rows = await db
    .select({
      video: videos,
      shortCount: sql<number>`(select count(*) from ${shorts} where ${shorts.videoId} = ${videos.id})`.mapWith(Number),
      momentCount: sql<number>`(select count(*) from ${moments} where ${moments.videoId} = ${videos.id})`.mapWith(Number),
    })
    .from(videos)
    .orderBy(desc(videos.createdAt));
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
      <PageHeader title="My Videos" subtitle="All uploaded lessons and their analysis status." actions={<LinkButton href="/upload" variant="primary"><Upload className="h-4 w-4" /> Upload Video</LinkButton>} />
      {rows.length === 0 ? (
        <EmptyState icon={<Film className="h-6 w-6" />} title="No videos yet" body="Upload a Japanese lesson to start finding the best learning moments." action={<LinkButton href="/upload" variant="primary">Upload Video</LinkButton>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {rows.map(({ video, shortCount, momentCount }) => (
            <Link key={video.id} href={`/videos/${video.id}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/5">
              <div className="relative aspect-video bg-ink-900">
                {video.thumbnailPath && <img src={fileUrl(video.thumbnailPath)} alt="" className="h-full w-full object-cover" />}
                <span className="absolute bottom-2 right-2 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">{formatTime(video.duration)}</span>
                <span className="absolute left-2 top-2"><StatusPill status={video.status} /></span>
              </div>
              <div className="p-4">
                <p className="line-clamp-1 text-sm font-bold text-slate-900">{video.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{video.width}×{video.height} · {formatBytes(video.size)}{video.hasBurnedSubtitles ? " · Subtitles" : ""}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                  <span>{momentCount} moments · {shortCount} shorts</span>
                  {video.bestScore ? <ScoreBadge score={video.bestScore} size="sm" /> : <span className="text-slate-400">Not analyzed</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
