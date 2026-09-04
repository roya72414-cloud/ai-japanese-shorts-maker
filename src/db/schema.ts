import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export type SubtitleArea = {
  detected: boolean;
  top: number; // fraction of height (0-1)
  bottom: number; // fraction of height (0-1)
  confidence: number;
};

export type TranscriptSegment = {
  id: number;
  start: number;
  end: number;
  ja: string;
  romaji: string;
  en: string;
  speaker: string;
  topic?: string;
  level?: string;
  confidence: number;
  dialogueStart?: boolean;
};

export type MomentKpis = {
  educationalValue: number;
  hookStrength: number;
  standaloneContext: number;
  engagement: number;
  practicalJapanese: number;
  conversationInterest: number;
  audioQuality: number;
  subtitleQuality: number;
  completeness: number;
};

export type CropSettings = {
  layout: "fit" | "fill" | "top";
  offsetX: number; // -1..1 horizontal pan for fill layout
  offsetY: number; // -1..1 vertical placement of video in fit layout
};

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull().default(0),
  duration: doublePrecision("duration").notNull().default(0),
  width: integer("width").notNull().default(0),
  height: integer("height").notNull().default(0),
  thumbnailPath: text("thumbnail_path"),
  status: text("status").notNull().default("uploaded"), // uploaded | analyzing | analyzed
  hasBurnedSubtitles: boolean("has_burned_subtitles").notNull().default(false),
  subtitleArea: jsonb("subtitle_area").$type<SubtitleArea>(),
  isStaticImage: boolean("is_static_image").notNull().default(false),
  rangeStart: doublePrecision("range_start").notNull().default(0),
  rangeEnd: doublePrecision("range_end").notNull().default(0),
  bestScore: integer("best_score").notNull().default(0),
  momentCount: integer("moment_count").notNull().default(0),
  transcriptEngine: text("transcript_engine"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  analyzedAt: timestamp("analyzed_at"),
});

export const transcripts = pgTable("transcripts", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  engine: text("engine").notNull(),
  language: text("language").notNull().default("ja"),
  segments: jsonb("segments").$type<TranscriptSegment[]>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const moments = pgTable("moments", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  rank: integer("rank").notNull(),
  score: integer("score").notNull(),
  startTime: doublePrecision("start_time").notNull(),
  endTime: doublePrecision("end_time").notNull(),
  category: text("category").notNull(),
  quoteJa: text("quote_ja").notNull(),
  quoteRomaji: text("quote_romaji").notNull(),
  quoteEn: text("quote_en").notNull(),
  reasons: jsonb("reasons").$type<string[]>().notNull(),
  kpis: jsonb("kpis").$type<MomentKpis>().notNull(),
  hook: text("hook").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  hashtags: jsonb("hashtags").$type<string[]>().notNull(),
  level: text("level"),
  segmentIds: jsonb("segment_ids").$type<number[]>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const shorts = pgTable("shorts", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  momentId: integer("moment_id").references(() => moments.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  hook: text("hook").notNull(),
  description: text("description").notNull(),
  hashtags: jsonb("hashtags").$type<string[]>().notNull(),
  category: text("category").notNull(),
  score: integer("score").notNull(),
  startTime: doublePrecision("start_time").notNull(),
  endTime: doublePrecision("end_time").notNull(),
  template: text("template").notNull().default("default"),
  subtitleMode: text("subtitle_mode").notNull().default("preserve"),
  crop: jsonb("crop").$type<CropSettings>().notNull(),
  zoom: doublePrecision("zoom").notNull().default(1),
  motion: text("motion").notNull().default("ken-burns"),
  status: text("status").notNull().default("waiting"), // waiting | rendering | complete | failed
  progress: integer("progress").notNull().default(0),
  outputPath: text("output_path"),
  outputFormat: text("output_format"),
  outputSize: integer("output_size"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const exportsTable = pgTable("exports", {
  id: serial("id").primaryKey(),
  shortId: integer("short_id").references(() => shorts.id, {
    onDelete: "set null",
  }),
  videoId: integer("video_id").references(() => videos.id, {
    onDelete: "set null",
  }),
  filename: text("filename").notNull(),
  format: text("format").notNull(),
  size: integer("size").notNull().default(0),
  kind: text("kind").notNull().default("single"), // single | batch
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Video = typeof videos.$inferSelect;
export type Transcript = typeof transcripts.$inferSelect;
export type Moment = typeof moments.$inferSelect;
export type Short = typeof shorts.$inferSelect;
export type ExportRecord = typeof exportsTable.$inferSelect;
