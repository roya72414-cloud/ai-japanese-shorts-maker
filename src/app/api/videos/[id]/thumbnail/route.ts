import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { ensureDir } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const { dataUrl } = (await req.json()) as { dataUrl: string };
  const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(dataUrl ?? "");
  if (!m) return Response.json({ error: "Invalid image" }, { status: 400 });
  const dir = ensureDir("thumbs");
  const file = `video-${id}.${m[1] === "png" ? "png" : "jpg"}`;
  fs.writeFileSync(path.join(dir, file), Buffer.from(m[2], "base64"));
  const [row] = await db.update(videos).set({ thumbnailPath: `thumbs/${file}` }).where(eq(videos.id, id)).returning();
  return Response.json(row);
}
