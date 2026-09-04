import { desc } from "drizzle-orm";
import { Download } from "lucide-react";
import { db } from "@/db";
import { exportsTable } from "@/db/schema";
import { EmptyState, PageHeader, ScoreBadge } from "@/components/ui";
import { formatBytes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExportsPage() {
  const rows = await db.select().from(exportsTable).orderBy(desc(exportsTable.createdAt)).limit(200);
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
      <PageHeader title="Export History" subtitle="Every download with its metadata: title, description, hashtags, original timestamp, moment score and category." />
      {rows.length === 0 ? (
        <EmptyState icon={<Download className="h-6 w-6" />} title="No exports yet" body="Download a Short or use “Download All” to see exports here." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-400">
              <tr><th className="px-4 py-2.5 font-semibold">File</th><th className="px-3 py-2.5 font-semibold">Title</th><th className="px-3 py-2.5 font-semibold">Timestamp</th><th className="px-3 py-2.5 font-semibold">Score</th><th className="px-3 py-2.5 font-semibold">Category</th><th className="px-3 py-2.5 font-semibold">Size</th><th className="px-3 py-2.5 font-semibold">Date</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const m = r.metadata as Record<string, unknown>;
                return (
                  <tr key={r.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3"><p className="font-semibold text-slate-900">{r.filename}</p><p className="text-[11px] uppercase text-slate-400">{r.kind} · {r.format}</p></td>
                    <td className="jp px-3 py-3 text-slate-700">{r.kind === "batch" ? `${m.count as number} shorts bundle` : <>{String(m.title ?? "")}<p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">{Array.isArray(m.hashtags) ? (m.hashtags as string[]).join(" ") : ""}</p></>}</td>
                    <td className="px-3 py-3 tabular-nums text-slate-600">{String(m.originalTimestamp ?? "—")}</td>
                    <td className="px-3 py-3">{typeof m.momentScore === "number" ? <ScoreBadge score={m.momentScore} size="sm" /> : "—"}</td>
                    <td className="px-3 py-3 text-slate-600">{String(m.category ?? "—")}</td>
                    <td className="px-3 py-3 tabular-nums text-slate-600">{formatBytes(r.size)}</td>
                    <td className="px-3 py-3 tabular-nums text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
