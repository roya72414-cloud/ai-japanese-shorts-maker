import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { ArrowRight, Clapperboard, Film, Sparkles, Upload } from "lucide-react";
import { db } from "@/db";
import { moments, shorts, videos } from "@/db/schema";
import { LinkButton, ScoreBadge, StatusPill } from "@/components/ui";
import { fileUrl, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [counts] = await db
    .select({
      uploaded: sql<number>`(select count(*) from ${videos})`.mapWith(Number),
      analyzed: sql<number>`(select count(*) from ${videos} where ${videos.status} = 'analyzed')`.mapWith(Number),
      momentsFound: sql<number>`(select count(*) from ${moments})`.mapWith(Number),
      shortsGenerated: sql<number>`(select count(*) from ${shorts} where ${shorts.status} = 'complete')`.mapWith(Number),
    })
    .from(sql`(select 1) as one`);
  const recent = await db
    .select({ video: videos, shortCount: sql<number>`(select count(*) from ${shorts} where ${shorts.videoId} = ${videos.id} and ${shorts.status} = 'complete')`.mapWith(Number) })
    .from(videos)
    .orderBy(desc(videos.createdAt))
    .limit(8);
  const recentShorts = await db
    .select({ short: shorts, videoName: videos.name })
    .from(shorts)
    .innerJoin(videos, eq(shorts.videoId, videos.id))
    .where(eq(shorts.status, "complete"))
    .orderBy(desc(shorts.updatedAt))
    .limit(6);

  const stats = [
    { label: "Videos Uploaded", value: counts.uploaded, icon: Film, tone: "from-slate-700 to-slate-900" },
    { label: "Videos Analyzed", value: counts.analyzed, icon: Sparkles, tone: "from-brand-500 to-brand-700" },
    { label: "Best Moments Found", value: counts.momentsFound, icon: Sparkles, tone: "from-pink-500 to-rose-600" },
    { label: "Shorts Generated", value: counts.shortsGenerated, icon: Clapperboard, tone: "from-emerald-500 to-teal-600" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl bg-ink-900 p-8 text-white">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/40 blur-3xl" />
        <div className="absolute -bottom-24 right-40 h-60 w-60 rounded-full bg-pink-500/30 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-200">Long video → Shorts, for Japanese learning</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Turn one lesson into a week of high-value Shorts</h1>
            <p className="mt-2 text-sm text-white/70">Upload a Japanese lesson, let the KPI moment engine find the most teachable sentences, and export 9:16 clips with the original audio and subtitles preserved.</p>
            <div className="mt-5 flex gap-3">
              <LinkButton href="/upload" variant="primary" size="lg"><Upload className="h-4 w-4" /> Upload Video</LinkButton>
              <LinkButton href="/moments" size="lg" className="border-white/20 bg-white/10 text-white hover:bg-white/20">Browse moments</LinkButton>
            </div>
          </div>
          <div className="hidden gap-2 text-[11px] font-medium text-white/80 md:grid">
            {["Japanese speech", "Timestamped transcript", "Sentence segmentation", "Learning value analysis", "KPI scoring", "9:16 export"].map((s, i, a) => (
              <div key={s} className="flex items-center gap-2"><span className="rounded-md bg-white/10 px-2 py-1">{s}</span>{i < a.length - 1 && <ArrowRight className="h-3 w-3 text-white/40" />}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className={`grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br ${s.tone} text-white`}><s.icon className="h-4 w-4" /></div>
            <p className="mt-4 text-3xl font-bold tabular-nums text-slate-900">{s.value}</p>
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">Recent Videos</h2>
            <Link href="/videos" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">No videos yet. <Link href="/upload" className="font-semibold text-brand-700">Upload your first Japanese lesson →</Link></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-slate-400">
                <tr><th className="px-5 py-2 font-semibold">Video</th><th className="px-3 py-2 font-semibold">Duration</th><th className="px-3 py-2 font-semibold">Status</th><th className="px-3 py-2 font-semibold">Best Score</th><th className="px-3 py-2 font-semibold">Shorts</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map(({ video, shortCount }) => (
                  <tr key={video.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <Link href={`/videos/${video.id}`} className="flex items-center gap-3">
                        <div className="h-11 w-[76px] shrink-0 overflow-hidden rounded-md bg-ink-900">
                          {video.thumbnailPath && <img src={fileUrl(video.thumbnailPath)} alt="" className="h-full w-full object-cover" />}
                        </div>
                        <span className="line-clamp-1 font-semibold text-slate-900">{video.name}</span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 tabular-nums text-slate-600">{formatTime(video.duration)}</td>
                    <td className="px-3 py-3"><StatusPill status={video.status} /></td>
                    <td className="px-3 py-3">{video.bestScore ? <ScoreBadge score={video.bestScore} size="sm" /> : <span className="text-slate-400">—</span>}</td>
                    <td className="px-3 py-3 tabular-nums text-slate-700">{shortCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">Latest Shorts</h2>
            <Link href="/shorts" className="text-xs font-semibold text-brand-700 hover:underline">View all</Link>
          </div>
          {recentShorts.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">Generated Shorts will appear here.</div>
          ) : (
            <ul className="grid grid-cols-3 gap-3 p-4">
              {recentShorts.map(({ short }) => (
                <li key={short.id}>
                  <Link href={`/shorts/${short.id}`} className="block overflow-hidden rounded-xl bg-ink-900">
                    <video src={fileUrl(short.outputPath)} muted playsInline preload="metadata" className="aspect-[9/16] w-full object-cover" />
                  </Link>
                  <p className="mt-1 line-clamp-1 text-[11px] font-semibold text-slate-700">{short.hook}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
