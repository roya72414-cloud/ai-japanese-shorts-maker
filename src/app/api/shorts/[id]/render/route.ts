import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shorts } from "@/db/schema";

export const dynamic = "force-dynamic";

// ১. ক্লায়েন্টকে Supabase Signed Upload URL প্রদান করে
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await props.params;
    const id = Number(rawId);
    const format = new URL(req.url).searchParams.get("format") === "webm" ? "webm" : "mp4";

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      "https://ylebzdcglqdbkobhsqkw.supabase.co";
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const fileName = `short-${id}-${Date.now()}.${format}`;
    const storagePath = `renders/${fileName}`;

    // Supabase থেকে প্রিসাইনড আপলোড URL তৈরি করা
    const signRes = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/upload/sign/videos/${storagePath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: 3600 }),
      }
    );

    if (!signRes.ok) {
      // যদি সাইন ফেইল করে তবে পাবলিক ফলব্যাক পাথ প্রদান করা
      return Response.json({
        uploadUrl: `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/videos/${storagePath}`,
        storagePath,
        useDirect: true,
      });
    }

    const signData = await signRes.json();
    const uploadUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1${signData.url}`;

    return Response.json({ uploadUrl, storagePath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to get upload url";
    return Response.json({ error: message }, { status: 500 });
  }
}

// ২. আপলোড শেষে স্ট্যাটাস কমপ্লিট হিসেবে চিহ্নিত করে
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await props.params;
    const id = Number(rawId);
    const body = await req.json();

    const [row] = await db
      .update(shorts)
      .set({
        outputPath: body.storagePath,
        outputFormat: body.format || "mp4",
        outputSize: body.size || 0,
        status: "complete",
        progress: 100,
        updatedAt: new Date(),
      })
      .where(eq(shorts.id, id))
      .returning();

    return Response.json(row);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to finish render";
    return Response.json({ error: message }, { status: 500 });
  }
}
