import { desc, eq } from "drizzle-orm";
import { Sparkles } from "lucide-react";
import { db } from "@/db";
import { moments, videos } from "@/db/schema";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { MomentsBrowser } from "@/components/MomentsBrowser";

export const dynamic = "force-dynamic";

export default async function MomentsPage() {
  const rows = await db
    .select({ moment: moments, videoName: videos.name, videoThumb: videos.thumbnailPath, videoPath: videos.storagePath })
    .from(moments)
    .innerJoin(videos, eq(moments.videoId, videos.id))
    .orderBy(desc(moments.score))
    .limit(120);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
      <PageHeader title="AI Best Moments" subtitle="Every candidate moment across your videos, ranked by the 9-KPI Japanese learning score." />
      {rows.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-6 w-6" />} title="No moments yet" body="Analyze a video to let the moment engine find teachable Japanese sentences." action={<LinkButton href="/upload" variant="primary">Upload & analyze</LinkButton>} />
      ) : (
        <MomentsBrowser rows={rows.map((r) => ({ ...r.moment, videoName: r.videoName, videoThumb: r.videoThumb, videoPath: r.videoPath }))} />
      )}
    </div>
  );
}
