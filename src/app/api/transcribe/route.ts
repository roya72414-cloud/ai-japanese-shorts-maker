export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Reports whether a speech-to-text provider is configured.
export async function GET() {
  return Response.json({ available: Boolean(process.env.OPENAI_API_KEY), provider: process.env.OPENAI_API_KEY ? "openai-whisper" : "builtin" });
}

// Proxies a WAV audio chunk to OpenAI Whisper and returns timestamped segments.
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return Response.json({ available: false, segments: null });
  const offset = Number(new URL(req.url).searchParams.get("offset") ?? 0);
  const audio = await req.blob();
  const form = new FormData();
  form.append("file", audio, "chunk.wav");
  form.append("model", "whisper-1");
  form.append("language", "ja");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    return Response.json({ error: text }, { status: 502 });
  }
  const data = (await res.json()) as { segments?: Array<{ start: number; end: number; text: string; avg_logprob?: number; no_speech_prob?: number }> };
  const segments = (data.segments ?? []).map((s) => ({
    start: s.start + offset,
    end: s.end + offset,
    text: s.text,
    avg_logprob: s.avg_logprob,
    no_speech_prob: s.no_speech_prob,
  }));
  return Response.json({ available: true, segments });
}
