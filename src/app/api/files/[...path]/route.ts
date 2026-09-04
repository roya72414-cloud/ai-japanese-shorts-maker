import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const fullPath = Array.isArray(path) ? path.join("/") : "";

    const storagePublicUrl =
      process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ||
      "https://ylebzdcglqdbkdbhsqkw.supabase.co/storage/v1/object/public/videos";

    const targetUrl = `${storagePublicUrl.replace(/\/$/, "")}/${fullPath}`;

    return NextResponse.redirect(new URL(targetUrl), 307);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to resolve file" },
      { status: 500 }
    );
  }
}
