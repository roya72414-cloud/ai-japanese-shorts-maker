import type { MomentKpis, TranscriptSegment } from "@/db/schema";
import { TOPIC_LABELS } from "./corpus";

export const KPI_WEIGHTS: Record<keyof MomentKpis, number> = {
  educationalValue: 0.2,
  hookStrength: 0.2,
  standaloneContext: 0.15,
  engagement: 0.15,
  practicalJapanese: 0.1,
  conversationInterest: 0.05,
  audioQuality: 0.05,
  subtitleQuality: 0.05,
  completeness: 0.05,
};

export const KPI_LABELS: Record<keyof MomentKpis, string> = {
  educationalValue: "Educational Value",
  hookStrength: "Hook Strength",
  standaloneContext: "Standalone Context",
  engagement: "Engagement Potential",
  practicalJapanese: "Practical Japanese Value",
  conversationInterest: "Conversation Interest",
  audioQuality: "Audio Quality",
  subtitleQuality: "Subtitle Quality",
  completeness: "Sentence Completeness",
};

export type CandidateMoment = {
  startTime: number;
  endTime: number;
  segments: TranscriptSegment[];
  kpis: MomentKpis;
  score: number;
  category: string;
  level: string | null;
  reasons: string[];
  quote: TranscriptSegment;
  hook: string;
  title: string;
  description: string;
  hashtags: string[];
};

export type AnalysisContext = {
  hasBurnedSubtitles: boolean;
  transcriptEngine: "openai" | "builtin";
  minDuration?: number;
  maxDuration?: number;
};

const PRACTICAL_WORDS = [
  "すみません", "お願いします", "ください", "いくら", "どこ", "駅", "切符", "ありがとう", "大丈夫",
  "注文", "トイレ", "いらっしゃいませ", "予約", "支払", "カード", "袋", "温め", "持ち帰り", "道",
  "曲がって", "まっすぐ", "分かりました", "もしもし", "お待ちください", "円", "電車", "バス", "ホテル",
  "薬", "痛", "教えて", "はじめまして", "よろしく", "遅れて", "水", "コーヒー",
];
const GRAMMAR_PATTERNS = [
  /てもいいですか/, /てください/, /たいです/, /ましょう/, /ませんか/, /なければ/, /ないと/, /そうです/,
  /ことができ/, /たことがあ/, /ので/, /から/, /ている/, /ています/, /てしまい/, /方が/, /より/, /とき/, /時/,
];
const HOOK_WORDS = ["本当", "え？", "実は", "知って", "使えます", "便利", "ポイント", "よく使う", "覚えて", "間違"];
const CONTEXT_DEPENDENT = /^(それ|あれ|その|あの|そして|でも|だから|それで|また|次|さっき|前の)/;
const UNSAFE = /(死ね|殺|くそ|ばか|バカ|アホ|fuck|shit)/i;
const QUESTION = /[？?]|か。$|か$/;

function clamp100(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function countMatches(text: string, list: string[]) {
  return list.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0);
}

function categoryFor(segs: TranscriptSegment[], text: string): string {
  const topics = segs.map((s) => s.topic).filter(Boolean) as string[];
  if (topics.length) {
    const counts = new Map<string, number>();
    for (const t of topics) counts.set(t, (counts.get(t) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    if (TOPIC_LABELS[top]) return TOPIC_LABELS[top];
  }
  if (/駅|切符|電車|ホテル|チェックイン|道|曲が|空港/.test(text)) return "Travel Japanese";
  if (/勉強しましょう|使います|例えば|文法|表現|「.+」/.test(text)) return "JLPT Grammar";
  if (/一つ|二つ|三つ|数え|単語|言葉/.test(text)) return "Vocabulary";
  if (/いくら|注文|ください|袋|お願いします|コーヒー/.test(text)) return "Daily Japanese";
  const speakers = new Set(segs.map((s) => s.speaker));
  if (speakers.size >= 2) return "Natural Japanese Conversation";
  return "Listening Practice";
}

function computeKpis(segs: TranscriptSegment[], ctx: AnalysisContext): MomentKpis {
  const text = segs.map((s) => s.ja).join("");
  const dur = segs[segs.length - 1].end - segs[0].start;
  const speakers = new Set(segs.map((s) => s.speaker));
  const turns = segs.reduce((acc, s, i) => acc + (i > 0 && segs[i - 1].speaker !== s.speaker ? 1 : 0), 0);
  const questions = segs.filter((s) => QUESTION.test(s.ja)).length;
  const grammarHits = GRAMMAR_PATTERNS.reduce((a, r) => a + (r.test(text) ? 1 : 0), 0);
  const practicalHits = countMatches(text, PRACTICAL_WORDS);
  const hookHits = countMatches(text, HOOK_WORDS);
  const first = segs[0];
  const last = segs[segs.length - 1];
  const chars = text.replace(/[「」。、？！]/g, "").length;
  const speechRatio = Math.min(1, segs.reduce((a, s) => a + (s.end - s.start), 0) / Math.max(1, dur));
  const avgConf = segs.reduce((a, s) => a + s.confidence, 0) / segs.length;
  const hasTranslations = segs.every((s) => s.en && s.romaji);

  // Educational Value: grammar patterns, vocabulary density, explicit teaching cues
  const teachingCue = /使います|例えば|勉強|覚え|ポイント|意味/.test(text) ? 12 : 0;
  const educationalValue = clamp100(43 + Math.min(28, grammarHits * 7) + Math.min(15, practicalHits * 3) + teachingCue + (segs.length >= 3 ? 5 : 0));

  // Hook Strength: opening question, surprising/useful cues, short punchy opener
  const openerQuestion = QUESTION.test(first.ja) ? 20 : 0;
  const openerShort = first.ja.length <= 18 ? 8 : 0;
  const hookStrength = clamp100(34 + openerQuestion + openerShort + Math.min(21, hookHits * 7) + Math.min(12, questions * 4) + (speakers.size >= 2 ? 6 : 0));

  // Standalone Context: starts at dialogue boundary, no anaphoric opener, ends on a sentence end
  let standalone = 42;
  if (first.dialogueStart) standalone += 24;
  if (!CONTEXT_DEPENDENT.test(first.ja)) standalone += 12;
  if (/[。！？!?]$/.test(last.ja)) standalone += 10;
  if (dur >= 15 && dur <= 60) standalone += 5;
  if (segs.some((s) => /もう一度|リピート|次の会話/.test(s.ja))) standalone -= 8;
  const standaloneContext = clamp100(standalone);

  // Engagement: dialogue turns, Q&A pairs, duration sweet spot (30-45s)
  const durationFit = dur >= 28 && dur <= 46 ? 20 : dur >= 20 && dur <= 58 ? 12 : 4;
  const engagement = clamp100(34 + Math.min(18, turns * 4) + Math.min(12, questions * 4) + durationFit + (hookHits ? 5 : 0));

  // Practical Japanese: everyday-situation vocabulary
  const practicalJapanese = clamp100(34 + Math.min(45, practicalHits * 8) + (/ください|お願いします/.test(text) ? 8 : 0));

  // Conversation Interest: multi-speaker back-and-forth
  const conversationInterest = clamp100(25 + speakers.size * 12 + Math.min(25, turns * 5) + (questions > 0 ? 6 : 0));

  // Audio Quality: speech density + STT confidence
  const audioQuality = clamp100(40 + speechRatio * 35 + (avgConf - 0.7) * 80);

  // Subtitle Quality: burned-in subtitles present + full learner translations
  const subtitleQuality = clamp100(40 + (ctx.hasBurnedSubtitles ? 30 : 0) + (hasTranslations ? 18 : 6) + (avgConf > 0.85 ? 5 : 0));

  // Completeness: sentence boundaries respected, not truncated
  let completeness = 45;
  if (/[。！？!?」]$/.test(last.ja)) completeness += 30;
  if (first.dialogueStart || !CONTEXT_DEPENDENT.test(first.ja)) completeness += 12;
  if (chars / Math.max(1, dur) < 6) completeness += 8; // not rushed
  return {
    educationalValue,
    hookStrength,
    standaloneContext,
    engagement,
    practicalJapanese,
    conversationInterest,
    audioQuality,
    subtitleQuality,
    completeness: clamp100(completeness),
  };
}

export function weightedScore(k: MomentKpis) {
  const s = (Object.keys(KPI_WEIGHTS) as Array<keyof MomentKpis>).reduce(
    (acc, key) => acc + k[key] * KPI_WEIGHTS[key],
    0,
  );
  return clamp100(s);
}

function reasonsFor(k: MomentKpis, segs: TranscriptSegment[]): string[] {
  const out: string[] = [];
  if (k.practicalJapanese >= 70) out.push("Useful everyday Japanese");
  if (k.completeness >= 80) out.push("Complete sentence");
  if (segs.every((s) => s.ja.length <= 30)) out.push("Easy to understand");
  if (k.educationalValue >= 70) out.push("Strong learning value");
  if (k.standaloneContext >= 75) out.push("Works independently");
  if (k.hookStrength >= 75) out.push("Strong opening hook");
  if (k.conversationInterest >= 70) out.push("Natural back-and-forth dialogue");
  if (k.subtitleQuality >= 80) out.push("Clear subtitles");
  if (k.audioQuality >= 85) out.push("Clean audio");
  return out.slice(0, 5);
}

function pickQuote(segs: TranscriptSegment[]): TranscriptSegment {
  // Prefer a practical, complete, mid-length sentence.
  const scored = segs.map((s) => {
    let v = 0;
    v += countMatches(s.ja, PRACTICAL_WORDS) * 3;
    if (/[。！？]$/.test(s.ja)) v += 2;
    if (s.ja.length >= 8 && s.ja.length <= 22) v += 3;
    if (/勉強しましょう|聞いてみましょう|リピート/.test(s.ja)) v -= 5;
    return { s, v };
  });
  return scored.sort((a, b) => b.v - a.v)[0].s;
}

function hookFor(k: MomentKpis, segs: TranscriptSegment[], category: string, level: string | null): string {
  const text = segs.map((s) => s.ja).join("");
  const questions = segs.filter((s) => QUESTION.test(s.ja)).length;
  const eligible: string[] = [];
  if (category === "JLPT Grammar" && level) eligible.push(`${level} Grammar You Need to Know`);
  if (category === "JLPT Grammar") eligible.push("Learn This Useful Japanese Phrase");
  if (category === "Travel Japanese") eligible.push("Japanese You Need Before Your Trip");
  if (category === "Vocabulary") eligible.push("Can You Count in Japanese?");
  if (k.practicalJapanese >= 75) eligible.push("Japanese You'll Actually Use");
  if (questions >= 2 && k.conversationInterest >= 70) eligible.push("Can You Understand This Japanese?");
  if (/ください|お願いします/.test(text)) eligible.push("Learn This Useful Japanese Phrase");
  if (segs.every((s) => s.ja.length <= 16)) eligible.push("Beginner Japanese Listening Challenge");
  if (/どう|何と|なんて|どこ|いくら/.test(text)) eligible.push("How Would You Say This in Japanese?");
  if (k.hookStrength >= 75) eligible.push("Can You Understand This Japanese?");
  if (!eligible.length) eligible.push("Learn This Useful Japanese Phrase");
  const unique = [...new Set(eligible)];
  // Deterministic variety across moments while staying grounded in the content
  return unique[segs[0].id % unique.length];
}

const TOPIC_TITLES: Record<string, string> = {
  "train-station": "Buying a Train Ticket in Japanese",
  restaurant: "Ordering at a Japanese Restaurant",
  "convenience-store": "Japanese Convenience Store Phrases",
  directions: "Asking for Directions in Japanese",
  "self-introduction": "Introducing Yourself in Japanese",
  hotel: "Checking Into a Hotel in Japanese",
  shopping: "Shopping in Japanese: Asking the Price",
  "grammar-te-form": "How to Ask Permission: 〜てもいいですか",
  "grammar-tai": "Saying What You Want: 〜たいです",
  "weather-smalltalk": "Japanese Small Talk About the Weather",
  "phone-call": "Polite Japanese on the Phone",
  doctor: "At the Doctor in Japanese",
  counting: "Counting Things and People in Japanese",
  "apology-thanks": "Apologizing and Thanking in Japanese",
  "ordering-cafe": "Ordering Coffee in Japanese",
  "grammar-kara-node": "から vs ので: Explaining Reasons",
  "lost-item": "Lost Something? Say This in Japanese",
};

function titleFor(segs: TranscriptSegment[], category: string, quote: TranscriptSegment): string {
  const topic = segs.find((s) => s.topic && TOPIC_TITLES[s.topic])?.topic;
  if (topic) return `${TOPIC_TITLES[topic]} | ${quote.ja}`;
  return `${category}: ${quote.ja}`;
}

function descriptionFor(segs: TranscriptSegment[], category: string, level: string | null): string {
  const lines = segs
    .slice(0, 6)
    .map((s) => (s.en ? `${s.ja}\n${s.romaji ? s.romaji + "\n" : ""}${s.en}` : s.ja))
    .join("\n\n");
  const lvl = level ? ` (JLPT ${level})` : "";
  return `${category}${lvl} — real Japanese from this lesson.\n\n${lines}\n\nListen, repeat, and try using it today.`;
}

function hashtagsFor(category: string, level: string | null, segs: TranscriptSegment[]): string[] {
  const tags = ["#LearnJapanese", "#日本語", "#JapaneseLesson", "#Shorts"];
  const cat = category.replace(/[^A-Za-z]/g, "");
  if (cat) tags.push(`#${cat}`);
  if (level) tags.push(`#JLPT${level}`);
  const topic = segs.find((s) => s.topic)?.topic;
  if (topic === "train-station" || topic === "hotel" || topic === "directions") tags.push("#JapanTravel");
  if (topic?.startsWith("grammar")) tags.push("#JapaneseGrammar");
  tags.push("#NihongoStudy");
  return [...new Set(tags)].slice(0, 8);
}

function levelFor(segs: TranscriptSegment[]): string | null {
  const levels = segs.map((s) => s.level).filter(Boolean) as string[];
  if (!levels.length) return null;
  const rank = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 } as Record<string, number>;
  return levels.sort((a, b) => (rank[a] ?? 9) - (rank[b] ?? 9))[0];
}

function buildCandidate(segs: TranscriptSegment[], ctx: AnalysisContext): CandidateMoment {
  const kpis = computeKpis(segs, ctx);
  const score = weightedScore(kpis);
  const text = segs.map((s) => s.ja).join("");
  const category = categoryFor(segs, text);
  const level = levelFor(segs);
  const quote = pickQuote(segs);
  const lead = 0.6;
  const tail = 0.9;
  return {
    startTime: Math.max(0, Math.round((segs[0].start - lead) * 10) / 10),
    endTime: Math.round((segs[segs.length - 1].end + tail) * 10) / 10,
    segments: segs,
    kpis,
    score,
    category,
    level,
    reasons: reasonsFor(kpis, segs),
    quote,
    hook: hookFor(kpis, segs, category, level),
    title: titleFor(segs, category, quote),
    description: descriptionFor(segs, category, level),
    hashtags: hashtagsFor(category, level, segs),
  };
}

function passesSafety(segs: TranscriptSegment[]) {
  const text = segs.map((s) => s.ja + s.en).join(" ");
  if (UNSAFE.test(text)) return false;
  const chars = segs.reduce((a, s) => a + s.ja.length, 0);
  if (chars < 12) return false; // not enough content for a lesson short
  if (segs.every((s) => s.topic === "intro" || s.topic === "outro")) return false;
  return true;
}

function textSimilarity(a: CandidateMoment, b: CandidateMoment) {
  const A = new Set(a.segments.map((s) => s.ja));
  const B = new Set(b.segments.map((s) => s.ja));
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / Math.max(1, Math.min(A.size, B.size));
}

function overlap(a: CandidateMoment, b: CandidateMoment) {
  const inter = Math.max(0, Math.min(a.endTime, b.endTime) - Math.max(a.startTime, b.startTime));
  const shorter = Math.min(a.endTime - a.startTime, b.endTime - b.startTime);
  return shorter <= 0 ? 0 : inter / shorter;
}

/**
 * Full moment pipeline: sentence boundaries -> dialogue groups -> candidate windows
 * -> KPI scoring -> safety -> dedupe -> ranking.
 */
export function findBestMoments(
  segments: TranscriptSegment[],
  ctx: AnalysisContext,
): CandidateMoment[] {
  const minDur = ctx.minDuration ?? 15;
  const maxDur = ctx.maxDuration ?? 60;
  const segs = [...segments].sort((a, b) => a.start - b.start);
  const candidates: CandidateMoment[] = [];

  // Windows starting at each sentence, extended sentence by sentence until maxDur.
  for (let i = 0; i < segs.length; i++) {
    for (let j = i; j < segs.length; j++) {
      const dur = segs[j].end - segs[i].start;
      if (dur > maxDur) break;
      if (dur < minDur) continue;
      // Prefer windows that end at a sentence end
      if (!/[。！？!?」]$/.test(segs[j].ja) && j < segs.length - 1) continue;
      // Skip windows containing long silence (> 6s) which means topic change
      let gapBreak = false;
      for (let k = i + 1; k <= j; k++) {
        if (segs[k].start - segs[k - 1].end > 6) gapBreak = true;
      }
      if (gapBreak) continue;
      const slice = segs.slice(i, j + 1);
      // Keep windows on a single educational topic when topic info exists
      const topics = new Set(slice.map((s) => s.topic).filter((t) => t && t !== "intro" && t !== "outro"));
      if (topics.size > 1) continue;
      if (!passesSafety(slice)) continue;
      candidates.push(buildCandidate(slice, ctx));
    }
  }

  // Dedupe overlapping windows, keep the higher score
  candidates.sort((a, b) => b.score - a.score || a.startTime - b.startTime);
  const kept: CandidateMoment[] = [];
  for (const c of candidates) {
    if (kept.some((k) => overlap(k, c) > 0.45)) continue;
    // Content duplicates (same dialogue repeated later in the lesson)
    if (kept.some((k) => textSimilarity(k, c) > 0.6)) continue;
    kept.push(c);
    if (kept.length >= 40) break;
  }
  return kept;
}
