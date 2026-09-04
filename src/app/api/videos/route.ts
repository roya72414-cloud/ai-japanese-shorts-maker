import { NextResponse } from "next/server";
import { db } from "@/db";
import { videos } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    let filename = url.searchParams.get("filename") || "lesson.mp4";
    let mimeType = url.searchParams.get("type") || "video/mp4";
    let duration = Number(url.searchParams.get("duration") || 0);
    let width = Number(url.searchParams.get("width") || 1920);
    let height = Number(url.searchParams.get("height") || 1080);
    let storageKey = url.searchParams.get("storageKey") || "";
    let size = 0;

    // বডি থেকে মেটাডাটা রিড করা
    try {
      const body = await req.json();
      if (body.storageKey) storageKey = body.storageKey;
      if (body.size) size = Number(body.size);
      if (body.filename) filename = body.filename;
    } catch {
      // JSON বডি না থাকলে কুয়েরি প্যারামস ব্যবহার হবে
    }

    if (!storageKey) {
      return NextResponse.json({ error: "Storage key is required" }, { status: 400 });
    }

    const [created] = await db
      .insert(videos)
      .values({
        name: filename.replace(/\.[^/.]+$/, ""),
        originalName: filename,
        storagePath: storageKey,
        mimeType: mimeType,
        size: size,
        duration: duration,
        width: width,
        height: height,
        status: "uploaded",
      })
      .returning();

    return NextResponse.json(created);
  } catch (error: any) {
    console.error("Video creation error:", error);
    return NextResponse.json({ error: error.message || "Failed to create video" }, { status: 500 });
  }
}
