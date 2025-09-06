import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  videoUrl: text("video_url").notNull(),
  duration: text("duration").notNull(), // e.g., "12:34"
  category: text("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const magicLinks = pgTable("magic_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  videoId: varchar("video_id").notNull().references(() => videos.id),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const accessLogs = pgTable("access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  magicLinkId: varchar("magic_link_id").notNull().references(() => magicLinks.id),
  email: text("email").notNull(),
  videoId: varchar("video_id").notNull().references(() => videos.id),
  accessedAt: timestamp("accessed_at").notNull().default(sql`now()`),
  watchDuration: integer("watch_duration").default(0), // in seconds
  completionPercentage: integer("completion_percentage").default(0),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const videosRelations = relations(videos, ({ many }) => ({
  magicLinks: many(magicLinks),
  accessLogs: many(accessLogs),
}));

export const magicLinksRelations = relations(magicLinks, ({ one, many }) => ({
  video: one(videos, {
    fields: [magicLinks.videoId],
    references: [videos.id],
  }),
  accessLogs: many(accessLogs),
}));

export const accessLogsRelations = relations(accessLogs, ({ one }) => ({
  magicLink: one(magicLinks, {
    fields: [accessLogs.magicLinkId],
    references: [magicLinks.id],
  }),
  video: one(videos, {
    fields: [accessLogs.videoId],
    references: [videos.id],
  }),
}));

export const insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  createdAt: true,
});

export const insertMagicLinkSchema = createInsertSchema(magicLinks).omit({
  id: true,
  token: true,
  expiresAt: true,
  isUsed: true,
  createdAt: true,
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({
  id: true,
  accessedAt: true,
});

export const requestAccessSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const updateProgressSchema = z.object({
  watchDuration: z.number().min(0),
  completionPercentage: z.number().min(0).max(100),
});

export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type MagicLink = typeof magicLinks.$inferSelect;
export type InsertMagicLink = z.infer<typeof insertMagicLinkSchema>;
export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;
export type RequestAccess = z.infer<typeof requestAccessSchema>;
export type UpdateProgress = z.infer<typeof updateProgressSchema>;
