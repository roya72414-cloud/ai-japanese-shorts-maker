import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await props.params;
    const fullPath = Array.isArray(path) ? path.join("/") : "";

    const storagePublicUrl =
      process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ||
      "https://ylebzdcglqdbkobhsqkw.supabase.co/storage/v1/object/public/videos";

    const targetUrl = `${storagePublicUrl.replace(/\/$/, "")}/${fullPath}`;

    return NextResponse.redirect(new URL(targetUrl), 307);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to resolve file";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
