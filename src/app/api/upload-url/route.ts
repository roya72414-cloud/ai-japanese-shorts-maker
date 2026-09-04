import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, STORAGE_BUCKET, safeName } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { filename, contentType } = await req.json();
    const ext = filename.substring(filename.lastIndexOf(".")) || ".mp4";
    const stored = `${Date.now()}-${safeName(filename.replace(ext, ""))}${ext}`;
    const key = `uploads/${stored}`;

    const command = new PutObjectCommand({
      Bucket: STORAGE_BUCKET,
      Key: key,
      ContentType: contentType || "video/mp4",
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
    return Response.json({ uploadUrl, key, stored });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
