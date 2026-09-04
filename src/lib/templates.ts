export type CaptionTemplate = {
  id: string;
  name: string;
  description: string;
  jaFont: string;
  jaSize: number; // px at 1080 width
  jaColor: string;
  jaStroke: string;
  romajiColor: string;
  enColor: string;
  bg: string; // background gradient colors for letterbox
  bg2: string;
  hookBg: string;
  hookColor: string;
  accent: string;
  badge?: string;
  pillStyle: "rounded" | "square" | "none";
  weight: number;
};

export const CAPTION_TEMPLATES: CaptionTemplate[] = [
  {
    id: "default",
    name: "Default",
    description: "Clean white captions with soft shadow",
    jaFont: "'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif",
    jaSize: 62,
    jaColor: "#ffffff",
    jaStroke: "rgba(0,0,0,0.85)",
    romajiColor: "#e2e8f0",
    enColor: "#cbd5e1",
    bg: "#0b0b12",
    bg2: "#1a1a2e",
    hookBg: "rgba(255,255,255,0.95)",
    hookColor: "#0b0b12",
    accent: "#7c5cff",
    pillStyle: "rounded",
    weight: 700,
  },
  {
    id: "japanese-learning",
    name: "Japanese Learning",
    description: "Japanese, romaji and English stacked for learners",
    jaFont: "'Hiragino Sans', 'Noto Sans JP', sans-serif",
    jaSize: 66,
    jaColor: "#fff7d6",
    jaStroke: "rgba(20,10,0,0.9)",
    romajiColor: "#ffd166",
    enColor: "#ffffff",
    bg: "#14121f",
    bg2: "#2a1f4a",
    hookBg: "#ffd166",
    hookColor: "#1a1200",
    accent: "#ffd166",
    badge: "日本語",
    pillStyle: "rounded",
    weight: 800,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Small, understated captions",
    jaFont: "'Hiragino Sans', 'Noto Sans JP', sans-serif",
    jaSize: 48,
    jaColor: "#ffffff",
    jaStroke: "rgba(0,0,0,0.6)",
    romajiColor: "#d4d4d8",
    enColor: "#a1a1aa",
    bg: "#09090b",
    bg2: "#18181b",
    hookBg: "rgba(0,0,0,0.55)",
    hookColor: "#ffffff",
    accent: "#ffffff",
    pillStyle: "none",
    weight: 500,
  },
  {
    id: "bold",
    name: "Bold",
    description: "Large high-impact captions",
    jaFont: "'Hiragino Sans', 'Noto Sans JP', sans-serif",
    jaSize: 80,
    jaColor: "#ffffff",
    jaStroke: "#000000",
    romajiColor: "#fde047",
    enColor: "#ffffff",
    bg: "#000000",
    bg2: "#1c1917",
    hookBg: "#fde047",
    hookColor: "#000000",
    accent: "#fde047",
    pillStyle: "square",
    weight: 900,
  },
  {
    id: "jlpt",
    name: "JLPT",
    description: "Exam-style with level badge",
    jaFont: "'Hiragino Mincho ProN', 'Noto Serif JP', serif",
    jaSize: 62,
    jaColor: "#ffffff",
    jaStroke: "rgba(0,0,0,0.85)",
    romajiColor: "#93c5fd",
    enColor: "#e0f2fe",
    bg: "#0c1a3a",
    bg2: "#1e3a8a",
    hookBg: "#3b82f6",
    hookColor: "#ffffff",
    accent: "#60a5fa",
    badge: "JLPT",
    pillStyle: "rounded",
    weight: 700,
  },
  {
    id: "vocabulary",
    name: "Vocabulary",
    description: "Highlights key words with a flashcard feel",
    jaFont: "'Hiragino Sans', 'Noto Sans JP', sans-serif",
    jaSize: 70,
    jaColor: "#0f172a",
    jaStroke: "rgba(255,255,255,0)",
    romajiColor: "#475569",
    enColor: "#0f172a",
    bg: "#f8fafc",
    bg2: "#e2e8f0",
    hookBg: "#0f172a",
    hookColor: "#ffffff",
    accent: "#e11d48",
    badge: "単語",
    pillStyle: "rounded",
    weight: 800,
  },
  {
    id: "conversation",
    name: "Conversation",
    description: "Chat-bubble style dialogue captions",
    jaFont: "'Hiragino Sans', 'Noto Sans JP', sans-serif",
    jaSize: 58,
    jaColor: "#ffffff",
    jaStroke: "rgba(0,0,0,0)",
    romajiColor: "#c7d2fe",
    enColor: "#e0e7ff",
    bg: "#111827",
    bg2: "#312e81",
    hookBg: "#a5b4fc",
    hookColor: "#111827",
    accent: "#818cf8",
    badge: "会話",
    pillStyle: "rounded",
    weight: 700,
  },
  {
    id: "listening-challenge",
    name: "Listening Challenge",
    description: "Hides English until the end for a quiz feel",
    jaFont: "'Hiragino Sans', 'Noto Sans JP', sans-serif",
    jaSize: 64,
    jaColor: "#ffffff",
    jaStroke: "rgba(0,0,0,0.9)",
    romajiColor: "#fca5a5",
    enColor: "#fecaca",
    bg: "#1a0b0b",
    bg2: "#7f1d1d",
    hookBg: "#ef4444",
    hookColor: "#ffffff",
    accent: "#f87171",
    badge: "聞き取り",
    pillStyle: "rounded",
    weight: 800,
  },
  {
    id: "travel",
    name: "Travel Japanese",
    description: "Warm travel-friendly style",
    jaFont: "'Hiragino Sans', 'Noto Sans JP', sans-serif",
    jaSize: 62,
    jaColor: "#fffbeb",
    jaStroke: "rgba(60,20,0,0.85)",
    romajiColor: "#fdba74",
    enColor: "#ffedd5",
    bg: "#1c1007",
    bg2: "#9a3412",
    hookBg: "#fb923c",
    hookColor: "#1c1007",
    accent: "#fb923c",
    badge: "旅行",
    pillStyle: "rounded",
    weight: 700,
  },
];

export function getTemplate(id: string): CaptionTemplate {
  return CAPTION_TEMPLATES.find((t) => t.id === id) ?? CAPTION_TEMPLATES[0];
}

export const SUBTITLE_MODES = [
  { id: "preserve", label: "Preserve Original", desc: "Keep burned-in subtitles, add nothing" },
  { id: "ja", label: "Japanese", desc: "Japanese caption only" },
  { id: "ja-romaji", label: "Japanese + Romaji", desc: "Japanese with romaji reading" },
  { id: "ja-en", label: "Japanese + English", desc: "Japanese with English meaning" },
  { id: "ja-romaji-en", label: "Japanese + Romaji + English", desc: "Full learner stack" },
] as const;

export type SubtitleMode = (typeof SUBTITLE_MODES)[number]["id"];

export const MOTION_OPTIONS = [
  { id: "ken-burns", label: "Ken Burns" },
  { id: "slow-pan", label: "Slow Pan" },
  { id: "subtle-scale", label: "Subtle Scale" },
  { id: "none", label: "None" },
] as const;
