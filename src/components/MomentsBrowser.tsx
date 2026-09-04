"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Moment } from "@/db/schema";
import { MomentCard, KpiBreakdown } from "@/components/MomentTools";
import { Modal, ScoreBadge, Segmented } from "@/components/ui";
import { fileUrl, formatTime } from "@/lib/utils";

type Row = Moment & { videoName: string; videoThumb: string | null; videoPath: string };

export function MomentsBrowser({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [minScore, setMinScore] = useState(70);
  const [category, setCategory] = useState("all");
  const [preview, setPreview] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const categories = useMemo(() => ["all", ...Array.from(new Set(rows.map((r) => r.category)))], [rows]);
  const list = rows.filter((r) => r.score >= minScore && (category === "all" || r.category === category));

  const create = async (m: Row, draft = false) => {
    const res = await fetch("/api/shorts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ momentIds: [m.id], template: "japanese-learning", subtitleMode: "preserve", status: draft ? "draft" : undefined }) });
    const [row] = await res.json();
    router.push(draft ? `/shorts/${row.id}` : `/videos/${m.videoId}`);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Segmented size="sm" options={[60, 70, 80, 85, 90].map((v) => ({ value: v, label: `≥ ${v}` }))} value={minScore} onChange={setMinScore} />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700">
          {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All categories" : c}</option>)}
        </select>
        <span className="text-xs text-slate-500">{list.length} moments</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((m, i) => (
          <div key={m.id}>
            <Link href={`/videos/${m.videoId}`} className="mb-1.5 flex items-center gap-2 px-1 text-[11px] font-medium text-slate-500 hover:text-brand-700">
              {m.videoThumb && <img src={fileUrl(m.videoThumb)} alt="" className="h-5 w-8 rounded object-cover" />}
              <span className="truncate">{m.videoName}</span>
            </Link>
            <MomentCard moment={m} index={i + 1} onPreview={() => setPreview(m)} onEdit={() => create(m, true)} onCreate={() => create(m)} />
          </div>
        ))}
      </div>
      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.category} wide>
        {preview && (
          <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
            <video src={`${fileUrl(preview.videoPath)}#t=${preview.startTime},${preview.endTime}`} controls autoPlay className="aspect-video w-full rounded-xl bg-black" onTimeUpdate={(e) => { if (e.currentTarget.currentTime >= preview.endTime) e.currentTarget.pause(); }} />
            <div className="space-y-3">
              <ScoreBadge score={preview.score} size="lg" />
              <p className="jp text-lg font-bold">「{preview.quoteJa}」</p>
              <p className="text-xs text-slate-500">{preview.quoteRomaji} · {preview.quoteEn}</p>
              <p className="text-xs tabular-nums text-slate-500">{formatTime(preview.startTime)} — {formatTime(preview.endTime)}</p>
              <button onClick={() => { setDetail(preview); setPreview(null); }} className="text-xs font-semibold text-brand-700 hover:underline">KPI breakdown →</button>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Score breakdown">{detail && <KpiBreakdown kpis={detail.kpis} />}</Modal>
    </div>
  );
}
