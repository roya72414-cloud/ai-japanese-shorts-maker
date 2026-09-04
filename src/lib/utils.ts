export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatTime(seconds: number, withHours = true): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  if (withHours || h > 0) return `${String(h).padStart(2, "0")}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export function formatDurationHuman(seconds: number): string {
  const s = Math.round(seconds || 0);
  if (s < 60) return `${s} seconds`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) {
    return rem === 0 ? `${m} minute${m === 1 ? "" : "s"}` : `${m} min ${rem} sec`;
  }
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h} hr ${mm} min`;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function fileUrl(path: string | null | undefined) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  
  const cleanPath = path.replace(/^\/+/, "");
  const publicBase =
    process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ||
    "https://ylebzdcglqdbkobhsqkw.supabase.co/storage/v1/object/public/videos";
  
  return `${publicBase.replace(/\/$/, "")}/${cleanPath}`;
}

export function scoreColor(score: number) {
  if (score >= 90) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (score >= 80) return "text-violet-700 bg-violet-50 border-violet-200";
  if (score >= 70) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-slate-600 bg-slate-100 border-slate-200";
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
