import type { TranscriptSegment } from "@/db/schema";
import { CORPUS, FILLER_LINES, INTRO_LINES, OUTRO_LINES, type CorpusLine } from "./corpus";

// Small deterministic PRNG so re-analysis of the same video is stable.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function speechDuration(ja: string) {
  // Roughly 4.5 characters/second for clear lesson speech, plus a pause.
  return Math.max(1.6, ja.replace(/[「」。、？！]/g, "").length / 4.2 + 0.6);
}

/**
 * Builds a timestamped lesson transcript that spans the provided range.
 * Used when no speech-to-text provider is configured.
 */
export function generateLessonTranscript(
  seed: number,
  rangeStart: number,
  rangeEnd: number,
): TranscriptSegment[] {
  const rand = mulberry32(seed || 7);
  const segments: TranscriptSegment[] = [];
  let t = rangeStart + 1.5;
  let id = 1;

  const push = (line: CorpusLine, topic: string, level: string, dialogueStart: boolean, slow = false) => {
    const dur = speechDuration(line.ja) * (slow ? 1.35 : 1);
    if (t + dur > rangeEnd) return false;
    segments.push({
      id: id++,
      start: round(t),
      end: round(t + dur),
      ja: line.ja,
      romaji: line.romaji,
      en: line.en,
      speaker: line.speaker,
      topic,
      level,
      confidence: 0.86 + rand() * 0.12,
      dialogueStart,
    });
    t += dur + 0.35 + rand() * 0.5;
    return true;
  };

  // Intro (only if the range begins near the start of the video)
  if (rangeStart < 20) {
    for (const l of INTRO_LINES) push(l, "intro", "N5", true);
    t += 1.5;
  }

  const order = [...CORPUS.keys()].sort(() => rand() - 0.5);
  let idx = 0;
  let guard = 0;
  while (t < rangeEnd - 12 && guard++ < 500) {
    const block = CORPUS[order[idx % order.length]];
    idx++;
    // Dialogue first pass (natural speed)
    let ok = true;
    for (let i = 0; i < block.lines.length && ok; i++) {
      ok = push(block.lines[i], block.topic, block.level, i === 0);
    }
    if (!ok) break;
    // Teacher explanation / repeat pattern typical of lesson videos
    const filler = FILLER_LINES[Math.floor(rand() * FILLER_LINES.length)];
    t += 0.8;
    push(filler, block.topic, block.level, true);
    if (rand() > 0.35) {
      const key = block.lines[Math.floor(rand() * block.lines.length)];
      push(key, block.topic, block.level, false, true);
    }
    t += 2 + rand() * 3; // pause between sections
  }

  if (rangeEnd - t > 10) {
    for (const l of OUTRO_LINES) push(l, "outro", "N5", true);
  }
  return segments;
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export type RawSttSegment = {
  start: number;
  end: number;
  text: string;
  avg_logprob?: number;
  no_speech_prob?: number;
};

const SENTENCE_END = /[。！？!?]$/;

/**
 * Normalizes STT output into sentence-level segments with dialogue boundaries.
 * Sentences are split on Japanese punctuation and merged when STT cut mid-sentence.
 */
export function normalizeSttSegments(raw: RawSttSegment[], offset = 0): TranscriptSegment[] {
  const out: TranscriptSegment[] = [];
  let id = 1;
  let buffer: { start: number; end: number; text: string; conf: number[] } | null = null;
  let lastEnd = -10;

  const flush = () => {
    if (!buffer || !buffer.text.trim()) return;
    const gap = buffer.start - lastEnd;
    const conf = buffer.conf.length
      ? buffer.conf.reduce((a, b) => a + b, 0) / buffer.conf.length
      : 0.8;
    out.push({
      id: id++,
      start: round(buffer.start + offset),
      end: round(buffer.end + offset),
      ja: buffer.text.trim(),
      romaji: "",
      en: "",
      speaker: "S",
      confidence: Math.max(0.3, Math.min(0.99, conf)),
      dialogueStart: gap > 1.6,
    });
    lastEnd = buffer.end;
    buffer = null;
  };

  for (const seg of raw) {
    const conf = seg.avg_logprob !== undefined ? Math.exp(Math.max(-3, seg.avg_logprob)) : 0.85;
    const pieces = seg.text.split(/(?<=[。！？!?])/).map((p) => p.trim()).filter(Boolean);
    if (pieces.length === 0) continue;
    const dur = seg.end - seg.start;
    const totalChars = pieces.reduce((a, p) => a + p.length, 0) || 1;
    let cursor = seg.start;
    for (const piece of pieces) {
      const pieceDur = (piece.length / totalChars) * dur;
      const pieceEnd = cursor + pieceDur;
      if (buffer) {
        buffer.text += piece;
        buffer.end = pieceEnd;
        buffer.conf.push(conf);
      } else {
        buffer = { start: cursor, end: pieceEnd, text: piece, conf: [conf] };
      }
      if (SENTENCE_END.test(piece) || buffer.text.length > 60) flush();
      cursor = pieceEnd;
    }
  }
  flush();
  return out;
}
