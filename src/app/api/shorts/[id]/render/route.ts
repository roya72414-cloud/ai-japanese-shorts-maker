import { createClient } from "@supabase/supabase-js";
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

    // ব্রাউজার থেকে আসা ভিডিও ডেটা রিড করা
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const size = buffer.length;

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://ylebzdcglqdbkobhsqkw.supabase.co";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileName = `short-${id}-${Date.now()}.${format}`;
    const storagePath = `renders/${fileName}`;

    // সরাসরি Supabase Storage-এর 'videos' বাকেটে আপলোড করা
    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(storagePath, buffer, {
        contentType: format === "webm" ? "video/webm" : "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase render upload error:", uploadError);
      return Response.json({ error: uploadError.message }, { status: 500 });
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
