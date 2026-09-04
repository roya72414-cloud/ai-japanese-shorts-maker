import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shorts } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await props.params;
    const id = Number(rawId);
    const format = new URL(req.url).searchParams.get("format") === "webm" ? "webm" : "mp4";

    if (!req.body) {
      return Response.json({ error: "No body" }, { status: 400 });
    }

    const [existing] = await db.select().from(shorts).where(eq(shorts.id, id));
    if (!existing) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const arrayBuffer = await req.arrayBuffer();
    const size = arrayBuffer.byteLength;

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://ylebzdcglqdbkobhsqkw.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const fileName = `short-${id}-${Date.now()}.${format}`;
    const storagePath = `renders/${fileName}`;
    const targetUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/videos/${storagePath}`;

    // সরাসরি Supabase REST API ব্যবহার করে ফাইল আপলোড (কোনো এক্সটার্নাল লাইব্রেরি ছাড়াই)
    const uploadRes = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
        "Content-Type": format === "webm" ? "video/webm" : "video/mp4",
        "x-upsert": "true",
      },
      body: arrayBuffer,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("Supabase REST upload failed:", errText);
      return Response.json({ error: errText || "Failed to upload to Supabase" }, { status: 500 });
    }

    // ডাটাবেজ আপডেট
    const [row] = await db
      .update(shorts)
      .set({
        outputPath: storagePath,
        outputFormat: format,
        outputSize: size,
        status: "complete",
        progress: 100,
        updatedAt: new Date(),
      })
      .where(eq(shorts.id, id))
      .returning();

    return Response.json(row);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process render";
    return Response.json({ error: message }, { status: 500 });
  }
}
