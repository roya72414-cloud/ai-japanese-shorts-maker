import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: parts } = await params;
    const fullPath = parts.join("/");

    // Supabase Public Storage URL
    const storagePublicUrl =
      process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ||
      "https://ylebzdcglqdbkdbhsqkw.supabase.co/storage/v1/object/public/videos";

    const targetUrl = `${storagePublicUrl.replace(/\/$/, "")}/${fullPath}`;

    // সরাসরি Supabase-এর আসল ভিডিও লিঙ্কে রিডাইরেক্ট করা
    return NextResponse.redirect(targetUrl, 307);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to resolve file" },
      { status: 500 }
    );
  }
}
