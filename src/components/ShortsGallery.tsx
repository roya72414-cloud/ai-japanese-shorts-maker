"use client";

import { useCallback, useState } from "react";
import { Clapperboard, Download } from "lucide-react";
import type { Short } from "@/db/schema";
import { Button, EmptyState, LinkButton, PageHeader, Segmented } from "@/components/ui";
import { QueuePanel, useRenderQueue } from "@/components/RenderQueue";
import { ShortCard, downloadAll, type ShortRow } from "@/components/ShortCard";

export function ShortsGallery({ initial }: { initial: ShortRow[] }) {
  const [items, setItems] = useState<ShortRow[]>(initial);
  const [filter, setFilter] = useState<"all" | "complete" | "pending">("all");
  const [zip, setZip] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(false);
  const onUpdate = useCallback((s: Short) => setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...s } : x))), []);
  const queue = useRenderQueue(items, onUpdate, enabled);
  const list = items.filter((s) => (filter === "all" ? true : filter === "complete" ? s.status === "complete" : s.status !== "complete"));
  const pending = items.filter((s) => s.status === "waiting" || s.status === "rendering" || s.status === "failed");
  const completed = items.filter((s) => s.status === "complete").length;

  const del = async (id: number) => {
    await fetch(`/api/shorts/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">
      <PageHeader
        title="Generated Shorts"
        subtitle={`${completed} rendered · ${pending.length} in queue · 9:16 · 1080×1920`}
        actions={
          <>
            <Segmented size="sm" options={[{ value: "all", label: "All" }, { value: "complete", label: "Complete" }, { value: "pending", label: "In progress" }]} value={filter} onChange={setFilter} />
            <Button variant="primary" disabled={!completed || zip !== null} onClick={async () => { setZip(0); await downloadAll(items, setZip); setZip(null); }}>
              <Download className="h-4 w-4" /> {zip !== null ? `Zipping ${Math.round(zip * 100)}%` : "Download All"}
            </Button>
          </>
        }
      />
      {items.length === 0 ? (
        <EmptyState icon={<Clapperboard className="h-6 w-6" />} title="No Shorts yet" body="Analyze a video and convert its best moments to vertical Shorts." action={<LinkButton href="/videos" variant="primary">Go to My Videos</LinkButton>} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {list.map((s, i) => <ShortCard key={s.id} short={s} index={i} onDelete={del} />)}
          </div>
          <div>{pending.length > 0 && <QueuePanel items={pending} activeId={queue.activeId} progress={queue.progress} error={queue.error} onRetry={(s) => { setEnabled(true); queue.retry(s); }} onStart={() => setEnabled(true)} />}</div>
        </div>
      )}
    </div>
  );
}
