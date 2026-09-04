"use client";

import { useEffect, useRef, useState } from "react";
import { generateThumbnails } from "@/lib/client/media";
import { Segmented } from "@/components/ui";
import { clamp, formatDurationHuman, formatTime } from "@/lib/utils";

type Props = {
  src: string;
  duration: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
  markers?: Array<{ start: number; end: number; score: number }>;
  playhead?: number;
  onSeek?: (t: number) => void;
};

export function Timeline({ src, duration, start, end, onChange, markers = [], playhead, onSeek }: Props) {
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [mode, setMode] = useState<"full" | "custom">(start <= 0.01 && Math.abs(end - duration) < 0.5 ? "full" : "custom");
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<"start" | "end" | "range" | null>(null);
  const dragOrigin = useRef<{ x: number; start: number; end: number }>({ x: 0, start: 0, end: 0 });

  useEffect(() => {
    let alive = true;
    const count = 14;
    setThumbs(Array(count).fill(""));
    generateThumbnails(src, count, 120)
      .then((t) => alive && setThumbs(t))
      .catch(() => alive && setThumbs([]));
    return () => {
      alive = false;
    };
  }, [src]);

  const pct = (t: number) => (duration > 0 ? (t / duration) * 100 : 0);
  const timeFromEvent = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return clamp(((clientX - rect.left) / rect.width) * duration, 0, duration);
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragging.current || !trackRef.current) return;
      const t = timeFromEvent(e.clientX);
      if (dragging.current === "start") onChange(clamp(t, 0, end - 5), end);
      else if (dragging.current === "end") onChange(start, clamp(t, start + 5, duration));
      else {
        const rect = trackRef.current.getBoundingClientRect();
        const dt = ((e.clientX - dragOrigin.current.x) / rect.width) * duration;
        const len = dragOrigin.current.end - dragOrigin.current.start;
        const s = clamp(dragOrigin.current.start + dt, 0, duration - len);
        onChange(s, s + len);
      }
    };
    const up = () => {
      dragging.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, duration]);

  const setModeAndRange = (m: "full" | "custom") => {
    setMode(m);
    if (m === "full") onChange(0, duration);
    else if (start <= 0.01 && Math.abs(end - duration) < 0.5) {
      const len = Math.min(duration, Math.max(60, duration * 0.4));
      const s = Math.max(0, duration * 0.3);
      onChange(s, Math.min(duration, s + len));
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          options={[
            { value: "full", label: "Full Video" },
            { value: "custom", label: "Custom Range" },
          ]}
          value={mode}
          onChange={setModeAndRange}
        />
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-brand-50 px-3 py-1 font-semibold text-brand-700">{formatDurationHuman(end - start)} selected</span>
          <span className="tabular-nums text-slate-500">{formatTime(start)} → {formatTime(end)}</span>
        </div>
      </div>
      <div
        ref={trackRef}
        className="relative h-24 select-none overflow-hidden rounded-xl bg-ink-800 ring-1 ring-slate-200"
        onClick={(e) => {
          if (onSeek && !dragging.current) onSeek(timeFromEvent(e.clientX));
        }}
      >
        <div className="absolute inset-0 flex">
          {thumbs.map((t, i) =>
            t ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={t} alt="" className="h-full min-w-0 flex-1 object-cover" draggable={false} />
            ) : (
              <div key={i} className="shimmer h-full min-w-0 flex-1 opacity-30" />
            ),
          )}
        </div>
        {/* moment markers */}
        {markers.map((m, i) => (
          <div
            key={i}
            className="absolute bottom-0 h-1.5 rounded-t"
            style={{ left: `${pct(m.start)}%`, width: `${Math.max(0.4, pct(m.end) - pct(m.start))}%`, background: m.score >= 85 ? "#34d399" : m.score >= 75 ? "#a78bfa" : "#fbbf24" }}
            title={`Score ${m.score}`}
          />
        ))}
        {/* dimmed outside range */}
        <div className="pointer-events-none absolute inset-y-0 left-0 bg-ink-900/70" style={{ width: `${pct(start)}%` }} />
        <div className="pointer-events-none absolute inset-y-0 right-0 bg-ink-900/70" style={{ width: `${100 - pct(end)}%` }} />
        {/* selected range */}
        <div
          className={`absolute inset-y-0 border-y-[3px] border-brand-400 ${mode === "custom" ? "cursor-grab" : ""}`}
          style={{ left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%` }}
          onPointerDown={(e) => {
            if (mode !== "custom") return;
            e.stopPropagation();
            dragging.current = "range";
            dragOrigin.current = { x: e.clientX, start, end };
          }}
        />
        {mode === "custom" && (
          <>
            <Handle side="start" left={pct(start)} label="START" onDown={() => (dragging.current = "start")} />
            <Handle side="end" left={pct(end)} label="END" onDown={() => (dragging.current = "end")} />
          </>
        )}
        {playhead !== undefined && (
          <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pct(playhead)}%` }}>
            <div className="absolute -top-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 bg-white" />
          </div>
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] tabular-nums text-slate-400">
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <span key={f}>{formatTime(duration * f)}</span>
        ))}
      </div>
    </div>
  );
}

function Handle({ side, left, label, onDown }: { side: "start" | "end"; left: number; label: string; onDown: () => void }) {
  return (
    <div
      className="absolute inset-y-0 z-10 flex w-4 cursor-ew-resize items-center justify-center bg-brand-400"
      style={{ left: `${left}%`, transform: side === "start" ? "translateX(-100%)" : "none", borderRadius: side === "start" ? "8px 0 0 8px" : "0 8px 8px 0" }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onDown();
      }}
    >
      <div className="h-8 w-0.5 rounded bg-white/80" />
      <span className={`absolute -top-0 ${side === "start" ? "right-full mr-1.5" : "left-full ml-1.5"} rounded bg-ink-900 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white`}>{label}</span>
    </div>
  );
}
