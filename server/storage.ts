import { 
  videos, 
  magicLinks, 
  accessLogs,
  type Video, 
  type InsertVideo,
  type MagicLink,
  type InsertMagicLink,
  type AccessLog,
  type InsertAccessLog 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sum } from "drizzle-orm";

export interface IStorage {
  // Video methods
  getVideo(id: string): Promise<Video | undefined>;
  getActiveVideo(): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  
  // Magic link methods
  createMagicLink(magicLink: InsertMagicLink & { token: string; expiresAt: Date }): Promise<MagicLink>;
  getMagicLinkByToken(token: string): Promise<MagicLink | undefined>;
  markMagicLinkAsUsed(id: string): Promise<void>;
  
  // Access log methods
  createAccessLog(accessLog: InsertAccessLog): Promise<AccessLog>;
  updateAccessLog(id: string, updates: { watchDuration?: number; completionPercentage?: number }): Promise<void>;
  getAccessLogsByVideo(videoId: string): Promise<AccessLog[]>;
  getVideoAnalytics(videoId: string): Promise<{
    totalViews: number;
    totalWatchTime: number;
    averageCompletion: number;
    uniqueViewers: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getVideo(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video || undefined;
  }

  async getActiveVideo(): Promise<Video | undefined> {
    const [video] = await db.select().from(videos)
      .where(eq(videos.isActive, true))
      .orderBy(desc(videos.createdAt))
      .limit(1);
    return video || undefined;
  }

  async createVideo(insertVideo: InsertVideo): Promise<Video> {
    const [video] = await db
      .insert(videos)
      .values(insertVideo)
      .returning();
    return video;
  }

  async createMagicLink(magicLink: InsertMagicLink & { token: string; expiresAt: Date }): Promise<MagicLink> {
    const [link] = await db
      .insert(magicLinks)
      .values(magicLink)
      .returning();
    return link;
  }

  async getMagicLinkByToken(token: string): Promise<MagicLink | undefined> {
    const [link] = await db.select().from(magicLinks)
      .where(eq(magicLinks.token, token));
    return link || undefined;
  }

  async markMagicLinkAsUsed(id: string): Promise<void> {
    await db.update(magicLinks)
      .set({ isUsed: true })
      .where(eq(magicLinks.id, id));
  }

  async createAccessLog(accessLog: InsertAccessLog): Promise<AccessLog> {
    const [log] = await db
      .insert(accessLogs)
      .values(accessLog)
      .returning();
    return log;
  }

  async updateAccessLog(id: string, updates: { watchDuration?: number; completionPercentage?: number }): Promise<void> {
    await db.update(accessLogs)
      .set(updates)
      .where(eq(accessLogs.id, id));
  }

  async getAccessLogsByVideo(videoId: string): Promise<AccessLog[]> {
    return await db.select().from(accessLogs)
      .where(eq(accessLogs.videoId, videoId))
      .orderBy(desc(accessLogs.accessedAt));
  }

  async getVideoAnalytics(videoId: string): Promise<{
    totalViews: number;
    totalWatchTime: number;
    averageCompletion: number;
    uniqueViewers: number;
  }> {
    const analytics = await db.select({
      totalViews: count(),
      totalWatchTime: sum(accessLogs.watchDuration),
      averageCompletion: sum(accessLogs.completionPercentage),
      uniqueViewers: count(accessLogs.email)
    }).from(accessLogs)
    .where(eq(accessLogs.videoId, videoId));

    const result = analytics[0];
    return {
      totalViews: result.totalViews || 0,
      totalWatchTime: Number(result.totalWatchTime) || 0,
      averageCompletion: result.totalViews > 0 ? Math.round((Number(result.averageCompletion) || 0) / result.totalViews) : 0,
      uniqueViewers: result.uniqueViewers || 0,
    };
  }
}

export const storage = new DatabaseStorage();
