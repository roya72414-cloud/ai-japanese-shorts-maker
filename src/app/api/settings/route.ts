import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export const dynamic = "force-dynamic";

export const DEFAULT_SETTINGS = {
  defaultTemplate: "japanese-learning",
  defaultSubtitleMode: "preserve",
  defaultMotion: "ken-burns",
  minScore: 80,
  shortCount: 10,
  durationPreset: "auto",
  outputFormat: "mp4",
  frameRate: 30,
  videoBitrateMbps: 8,
};

export async function GET() {
  const [row] = await db.select().from(settings).where(eq(settings.key, "app"));
  return Response.json({ ...DEFAULT_SETTINGS, ...(row?.value ?? {}), sttAvailable: Boolean(process.env.OPENAI_API_KEY) });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as Record<string, unknown>;
  const [existing] = await db.select().from(settings).where(eq(settings.key, "app"));
  const value = { ...DEFAULT_SETTINGS, ...(existing?.value ?? {}), ...body };
  if (existing) {
    await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, "app"));
  } else {
    await db.insert(settings).values({ key: "app", value });
  }
  return Response.json(value);
}
