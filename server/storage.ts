import { 
  videos, 
  magicLinks, 
  accessLogs,
  adminUsers,
  companyTags,
  type Video, 
  type InsertVideo,
  type MagicLink,
  type InsertMagicLink,
  type AccessLog,
  type InsertAccessLog,
  type AdminUser,
  type InsertAdminUser,
  type CompanyTag,
  type InsertCompanyTag
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sum, or, sql } from "drizzle-orm";

export interface IStorage {
  // Video methods
  getVideo(id: string): Promise<Video | undefined>;
  getActiveVideo(): Promise<Video | undefined>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: string, video: Partial<InsertVideo>): Promise<Video>;
  getAllVideos(companyTag?: string): Promise<Video[]>;
  deleteVideo(id: string): Promise<void>;
  
  // Magic link methods
  createMagicLink(magicLink: InsertMagicLink & { token: string; expiresAt: Date }): Promise<MagicLink>;
  getMagicLinkByToken(token: string): Promise<MagicLink | undefined>;
  markMagicLinkAsUsed(id: string): Promise<void>;
  
  // Access log methods
  createAccessLog(accessLog: InsertAccessLog): Promise<AccessLog>;
  updateAccessLog(id: string, updates: { watchDuration?: number; completionPercentage?: number }): Promise<void>;
  getAccessLogsByVideo(videoId: string): Promise<AccessLog[]>;
  getAccessLogById(id: string): Promise<(AccessLog & { videoTitle: string | null; videoDuration: string | null; videoCategory: string | null }) | undefined>;
  getAllAccessLogs(companyTag?: string): Promise<(AccessLog & { videoTitle: string | null })[]>;
  getVideoAnalytics(videoId: string): Promise<{
    totalViews: number;
    totalWatchTime: number;
    averageCompletion: number;
    uniqueViewers: number;
  }>;
  
  // Admin user methods
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser>;
  getAllAdminUsers(): Promise<AdminUser[]>;
  updateAdminUser(id: string, adminUser: Partial<InsertAdminUser>): Promise<AdminUser>;
  deleteAdminUser(id: string): Promise<void>;
  
  // Company tag methods
  getAllCompanyTags(): Promise<CompanyTag[]>;
  createCompanyTag(companyTag: InsertCompanyTag): Promise<CompanyTag>;
  updateCompanyTag(id: string, companyTag: Partial<InsertCompanyTag>): Promise<CompanyTag>;
  deleteCompanyTag(id: string): Promise<void>;
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

  async getAccessLogById(id: string): Promise<(AccessLog & { videoTitle: string | null; videoDuration: string | null; videoCategory: string | null }) | undefined> {
    const [result] = await db.select({
      id: accessLogs.id,
      magicLinkId: accessLogs.magicLinkId,
      email: accessLogs.email,
      userName: accessLogs.userName,
      videoId: accessLogs.videoId,
      accessedAt: accessLogs.accessedAt,
      watchDuration: accessLogs.watchDuration,
      completionPercentage: accessLogs.completionPercentage,
      companyTag: accessLogs.companyTag,
      ipAddress: accessLogs.ipAddress,
      userAgent: accessLogs.userAgent,
      videoTitle: videos.title,
      videoDuration: videos.duration,
      videoCategory: videos.category,
    })
    .from(accessLogs)
    .leftJoin(videos, eq(accessLogs.videoId, videos.id))
    .where(eq(accessLogs.id, id));
    
    return result || undefined;
  }

  async getAllVideos(companyTag?: string): Promise<Video[]> {
    const query = db.select().from(videos);
    if (companyTag) {
      return await query.where(eq(videos.companyTag, companyTag)).orderBy(desc(videos.createdAt));
    }
    return await query.orderBy(desc(videos.createdAt));
  }

  async updateVideo(id: string, video: Partial<InsertVideo>): Promise<Video> {
    const [updatedVideo] = await db
      .update(videos)
      .set(video)
      .where(eq(videos.id, id))
      .returning();
    return updatedVideo;
  }

  async deleteVideo(id: string): Promise<void> {
    await db.delete(videos).where(eq(videos.id, id));
  }

  async getAllAccessLogs(companyTag?: string): Promise<(AccessLog & { videoTitle: string | null })[]> {
    const query = db.select({
      id: accessLogs.id,
      magicLinkId: accessLogs.magicLinkId,
      email: accessLogs.email,
      userName: accessLogs.userName,
      videoId: accessLogs.videoId,
      accessedAt: accessLogs.accessedAt,
      watchDuration: accessLogs.watchDuration,
      completionPercentage: accessLogs.completionPercentage,
      companyTag: accessLogs.companyTag,
      ipAddress: accessLogs.ipAddress,
      userAgent: accessLogs.userAgent,
      videoTitle: videos.title,
    })
    .from(accessLogs)
    .leftJoin(videos, eq(accessLogs.videoId, videos.id));

    if (companyTag) {
      return await query.where(eq(videos.companyTag, companyTag)).orderBy(desc(accessLogs.accessedAt));
    }
    return await query.orderBy(desc(accessLogs.accessedAt));
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

  // Admin user methods
  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return user || undefined;
  }

  async createAdminUser(adminUser: InsertAdminUser): Promise<AdminUser> {
    const [user] = await db
      .insert(adminUsers)
      .values(adminUser)
      .returning();
    return user;
  }

  async getAllAdminUsers(): Promise<AdminUser[]> {
    return await db.select().from(adminUsers)
      .where(eq(adminUsers.isActive, true))
      .orderBy(desc(adminUsers.createdAt));
  }

  async updateAdminUser(id: string, adminUser: Partial<InsertAdminUser>): Promise<AdminUser> {
    const [updatedUser] = await db
      .update(adminUsers)
      .set(adminUser)
      .where(eq(adminUsers.id, id))
      .returning();
    return updatedUser;
  }

  async deleteAdminUser(id: string): Promise<void> {
    await db.update(adminUsers)
      .set({ isActive: false })
      .where(eq(adminUsers.id, id));
  }

  // Company tag methods
  async getAllCompanyTags(): Promise<CompanyTag[]> {
    return await db.select().from(companyTags)
      .where(eq(companyTags.isActive, true))
      .orderBy(desc(companyTags.createdAt));
  }

  async createCompanyTag(insertCompanyTag: InsertCompanyTag): Promise<CompanyTag> {
    const [companyTag] = await db
      .insert(companyTags)
      .values(insertCompanyTag)
      .returning();
    return companyTag;
  }

  async updateCompanyTag(id: string, companyTag: Partial<InsertCompanyTag>): Promise<CompanyTag> {
    const [updatedCompanyTag] = await db
      .update(companyTags)
      .set(companyTag)
      .where(eq(companyTags.id, id))
      .returning();
    return updatedCompanyTag;
  }

  async deleteCompanyTag(id: string): Promise<void> {
    await db.update(companyTags)
      .set({ isActive: false })
      .where(eq(companyTags.id, id));
  }
}

export const storage = new DatabaseStorage();
