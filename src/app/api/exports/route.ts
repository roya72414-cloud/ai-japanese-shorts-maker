import { desc } from "drizzle-orm";
import { db } from "@/db";
import { exportsTable } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(exportsTable).orderBy(desc(exportsTable.createdAt)).limit(200);
  return Response.json(rows);
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    shortId?: number;
    videoId?: number;
    filename: string;
    format: string;
    size?: number;
    kind?: string;
    metadata: Record<string, unknown>;
  };
  const [row] = await db
    .insert(exportsTable)
    .values({
      shortId: body.shortId ?? null,
      videoId: body.videoId ?? null,
      filename: body.filename,
      format: body.format,
      size: body.size ?? 0,
      kind: body.kind ?? "single",
      metadata: body.metadata ?? {},
    })
    .returning();
  return Response.json(row, { status: 201 });
}
