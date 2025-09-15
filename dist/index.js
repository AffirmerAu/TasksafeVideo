var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  accessLogs: () => accessLogs,
  accessLogsRelations: () => accessLogsRelations,
  adminCreateUserSchema: () => adminCreateUserSchema,
  adminLoginSchema: () => adminLoginSchema,
  adminUsers: () => adminUsers,
  companyTags: () => companyTags,
  insertAccessLogSchema: () => insertAccessLogSchema,
  insertAdminUserSchema: () => insertAdminUserSchema,
  insertCompanyTagSchema: () => insertCompanyTagSchema,
  insertMagicLinkSchema: () => insertMagicLinkSchema,
  insertVideoSchema: () => insertVideoSchema,
  magicLinks: () => magicLinks,
  magicLinksRelations: () => magicLinksRelations,
  requestAccessSchema: () => requestAccessSchema,
  updateProgressSchema: () => updateProgressSchema,
  videos: () => videos,
  videosRelations: () => videosRelations
});
import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var companyTags = pgTable("company_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull(),
  // 'SUPER_ADMIN' | 'ADMIN'
  companyTag: text("company_tag"),
  // null for SUPER_ADMIN
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  thumbnailUrl: text("thumbnail_url").notNull(),
  videoUrl: text("video_url").notNull(),
  duration: text("duration").notNull(),
  // e.g., "12:34"
  category: text("category").notNull(),
  companyTag: text("company_tag"),
  // for role-based access
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var magicLinks = pgTable("magic_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  videoId: varchar("video_id").notNull().references(() => videos.id),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`)
});
var accessLogs = pgTable("access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  magicLinkId: varchar("magic_link_id").notNull().references(() => magicLinks.id),
  email: text("email").notNull(),
  videoId: varchar("video_id").notNull().references(() => videos.id),
  accessedAt: timestamp("accessed_at").notNull().default(sql`now()`),
  watchDuration: integer("watch_duration").default(0),
  // in seconds
  completionPercentage: integer("completion_percentage").default(0),
  companyTag: text("company_tag"),
  // derived from email domain or video
  ipAddress: text("ip_address"),
  userAgent: text("user_agent")
});
var videosRelations = relations(videos, ({ many }) => ({
  magicLinks: many(magicLinks),
  accessLogs: many(accessLogs)
}));
var magicLinksRelations = relations(magicLinks, ({ one, many }) => ({
  video: one(videos, {
    fields: [magicLinks.videoId],
    references: [videos.id]
  }),
  accessLogs: many(accessLogs)
}));
var accessLogsRelations = relations(accessLogs, ({ one }) => ({
  magicLink: one(magicLinks, {
    fields: [accessLogs.magicLinkId],
    references: [magicLinks.id]
  }),
  video: one(videos, {
    fields: [accessLogs.videoId],
    references: [videos.id]
  })
}));
var insertCompanyTagSchema = createInsertSchema(companyTags).omit({
  id: true,
  createdAt: true
});
var insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true
});
var insertVideoSchema = createInsertSchema(videos).omit({
  id: true,
  createdAt: true
});
var insertMagicLinkSchema = createInsertSchema(magicLinks).omit({
  id: true,
  token: true,
  expiresAt: true,
  isUsed: true,
  createdAt: true
});
var insertAccessLogSchema = createInsertSchema(accessLogs).omit({
  id: true,
  accessedAt: true
});
var requestAccessSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  videoId: z.string().optional()
});
var updateProgressSchema = z.object({
  watchDuration: z.number().min(0),
  completionPercentage: z.number().min(0).max(100)
});
var adminLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required")
});
var adminCreateUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]),
  companyTag: z.string().optional()
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
var databaseUrl = process.env.NEON_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "NEON_DATABASE_URL must be set. Please configure your Neon database connection."
  );
}
console.log(`\u{1F517} Connecting to database: Neon PostgreSQL`);
var hostname = databaseUrl.match(/@([^/]+)/)?.[1] || "unknown";
console.log(`\u{1F517} Database host: ${hostname}`);
var pool = new Pool({ connectionString: databaseUrl });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, count, sum } from "drizzle-orm";
var DatabaseStorage = class {
  async getVideo(id) {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video || void 0;
  }
  async getActiveVideo() {
    const [video] = await db.select().from(videos).where(eq(videos.isActive, true)).orderBy(desc(videos.createdAt)).limit(1);
    return video || void 0;
  }
  async createVideo(insertVideo) {
    const [video] = await db.insert(videos).values(insertVideo).returning();
    return video;
  }
  async createMagicLink(magicLink) {
    const [link] = await db.insert(magicLinks).values(magicLink).returning();
    return link;
  }
  async getMagicLinkByToken(token) {
    const [link] = await db.select().from(magicLinks).where(eq(magicLinks.token, token));
    return link || void 0;
  }
  async markMagicLinkAsUsed(id) {
    await db.update(magicLinks).set({ isUsed: true }).where(eq(magicLinks.id, id));
  }
  async createAccessLog(accessLog) {
    const [log2] = await db.insert(accessLogs).values(accessLog).returning();
    return log2;
  }
  async updateAccessLog(id, updates) {
    await db.update(accessLogs).set(updates).where(eq(accessLogs.id, id));
  }
  async getAccessLogsByVideo(videoId) {
    return await db.select().from(accessLogs).where(eq(accessLogs.videoId, videoId)).orderBy(desc(accessLogs.accessedAt));
  }
  async getAllVideos(companyTag) {
    const query = db.select().from(videos);
    if (companyTag) {
      return await query.where(eq(videos.companyTag, companyTag)).orderBy(desc(videos.createdAt));
    }
    return await query.orderBy(desc(videos.createdAt));
  }
  async updateVideo(id, video) {
    const [updatedVideo] = await db.update(videos).set(video).where(eq(videos.id, id)).returning();
    return updatedVideo;
  }
  async deleteVideo(id) {
    await db.delete(videos).where(eq(videos.id, id));
  }
  async getAllAccessLogs(companyTag) {
    const query = db.select({
      id: accessLogs.id,
      magicLinkId: accessLogs.magicLinkId,
      email: accessLogs.email,
      videoId: accessLogs.videoId,
      accessedAt: accessLogs.accessedAt,
      watchDuration: accessLogs.watchDuration,
      completionPercentage: accessLogs.completionPercentage,
      companyTag: accessLogs.companyTag,
      ipAddress: accessLogs.ipAddress,
      userAgent: accessLogs.userAgent,
      videoTitle: videos.title
    }).from(accessLogs).leftJoin(videos, eq(accessLogs.videoId, videos.id));
    if (companyTag) {
      return await query.where(eq(videos.companyTag, companyTag)).orderBy(desc(accessLogs.accessedAt));
    }
    return await query.orderBy(desc(accessLogs.accessedAt));
  }
  async getVideoAnalytics(videoId) {
    const analytics = await db.select({
      totalViews: count(),
      totalWatchTime: sum(accessLogs.watchDuration),
      averageCompletion: sum(accessLogs.completionPercentage),
      uniqueViewers: count(accessLogs.email)
    }).from(accessLogs).where(eq(accessLogs.videoId, videoId));
    const result = analytics[0];
    return {
      totalViews: result.totalViews || 0,
      totalWatchTime: Number(result.totalWatchTime) || 0,
      averageCompletion: result.totalViews > 0 ? Math.round((Number(result.averageCompletion) || 0) / result.totalViews) : 0,
      uniqueViewers: result.uniqueViewers || 0
    };
  }
  // Admin user methods
  async getAdminUserByEmail(email) {
    const [user] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return user || void 0;
  }
  async createAdminUser(adminUser) {
    const [user] = await db.insert(adminUsers).values(adminUser).returning();
    return user;
  }
  async getAllAdminUsers() {
    return await db.select().from(adminUsers).where(eq(adminUsers.isActive, true)).orderBy(desc(adminUsers.createdAt));
  }
  async updateAdminUser(id, adminUser) {
    const [updatedUser] = await db.update(adminUsers).set(adminUser).where(eq(adminUsers.id, id)).returning();
    return updatedUser;
  }
  async deleteAdminUser(id) {
    await db.update(adminUsers).set({ isActive: false }).where(eq(adminUsers.id, id));
  }
  // Company tag methods
  async getAllCompanyTags() {
    return await db.select().from(companyTags).where(eq(companyTags.isActive, true)).orderBy(desc(companyTags.createdAt));
  }
  async createCompanyTag(insertCompanyTag) {
    const [companyTag] = await db.insert(companyTags).values(insertCompanyTag).returning();
    return companyTag;
  }
  async updateCompanyTag(id, companyTag) {
    const [updatedCompanyTag] = await db.update(companyTags).set(companyTag).where(eq(companyTags.id, id)).returning();
    return updatedCompanyTag;
  }
  async deleteCompanyTag(id) {
    await db.update(companyTags).set({ isActive: false }).where(eq(companyTags.id, id));
  }
};
var storage = new DatabaseStorage();

// server/services/email.ts
import { Resend } from "resend";
var resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
async function sendEmail(params) {
  try {
    if (!resend || !process.env.RESEND_API_KEY) {
      console.log("\n\u{1F517} MAGIC LINK EMAIL (Console Mode - No RESEND_API_KEY)");
      console.log("=====================================");
      console.log(`To: ${params.to}`);
      console.log(`From: ${params.from}`);
      console.log(`Subject: ${params.subject}`);
      console.log("-------------------------------------");
      console.log(params.text);
      console.log("=====================================\n");
      return true;
    }
    console.log(`\u{1F4E7} Attempting to send email from: ${params.from} to: ${params.to}`);
    const { data, error } = await resend.emails.send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html
    });
    if (error) {
      console.error("Resend email error:", error);
      return false;
    }
    console.log(`\u2705 Email sent successfully via Resend! Email ID: ${data?.id}`);
    return true;
  } catch (error) {
    console.error("Email service error:", error);
    return false;
  }
}
function generateMagicLinkEmail(email, magicLink, videoTitle) {
  const domains = process.env.REPLIT_DOMAINS?.split(",") || ["localhost:5000"];
  const baseUrl = `https://${domains[0]}`;
  const accessUrl = `${baseUrl}/access?token=${encodeURIComponent(magicLink)}`;
  return {
    to: email,
    from: "noreply@tasksafe.au",
    subject: `TaskSafe: Access Link for "${videoTitle}"`,
    text: `
Your secure access link for "${videoTitle}" is ready.

Click here to access your training video: ${accessUrl}

Important:
- This link expires in 24 hours
- The link can only be used once
- Your viewing activity will be tracked for compliance

If you didn't request this access link, please ignore this email.

TaskSafe Security Team
    `,
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaskSafe Access Link</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background-color: #3b82f6; padding: 20px; text-align: center;">
                <div style="display: inline-flex; align-items: center; gap: 8px;">
                    <div style="width: 32px; height: 32px; background-color: rgba(255,255,255,0.2); border-radius: 6px; display: inline-flex; align-items: center; justify-content: center;">
                        \u{1F6E1}\uFE0F
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">TaskSafe</h1>
                </div>
                <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Secure Training Platform</p>
            </div>

            <!-- Content -->
            <div style="padding: 32px 24px;">
                <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 20px;">Your Training Video is Ready</h2>
                
                <p style="color: #6b7280; margin: 0 0 24px 0; line-height: 1.5;">
                    Your secure access link for <strong>"${videoTitle}"</strong> has been generated and is ready for viewing.
                </p>

                <!-- CTA Button -->
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${accessUrl}" style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
                        Access Training Video
                    </a>
                </div>

                <!-- Security Notice -->
                <div style="background-color: #f3f4f6; border-radius: 6px; padding: 16px; margin: 24px 0;">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <div style="color: #3b82f6; font-size: 16px;">\u2139\uFE0F</div>
                        <div>
                            <p style="color: #1f2937; margin: 0 0 8px 0; font-weight: 500;">Security Notice</p>
                            <ul style="color: #6b7280; margin: 0; padding-left: 16px; font-size: 14px;">
                                <li>This link expires in <strong>24 hours</strong></li>
                                <li>The link can only be used <strong>once</strong></li>
                                <li>Your viewing activity will be <strong>tracked for compliance</strong></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0;">
                    If you didn't request this access link, please ignore this email.
                </p>
            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 16px 24px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
                    \xA9 2024 TaskSafe. All rights reserved.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
    `
  };
}

// server/routes.ts
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
function requireAdmin(req, res, next) {
  if (!req.session.adminUser) {
    return res.status(401).json({ message: "Admin authentication required" });
  }
  next();
}
function requireSuperAdmin(req, res, next) {
  if (!req.session.adminUser || req.session.adminUser.role !== "SUPER_ADMIN") {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
}
async function registerRoutes(app2) {
  app2.post("/api/request-access", async (req, res) => {
    try {
      const { email, videoId } = requestAccessSchema.parse(req.body);
      const video = videoId ? await storage.getVideo(videoId) : await storage.getActiveVideo();
      if (!video || !video.isActive) {
        return res.status(404).json({ message: "Training video not found or not available" });
      }
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
      const magicLink = await storage.createMagicLink({
        token,
        email,
        videoId: video.id,
        expiresAt
      });
      const emailParams = generateMagicLinkEmail(email, token, video.title);
      const emailSent = await sendEmail(emailParams);
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send email" });
      }
      res.json({
        message: "Magic link sent successfully",
        email
      });
    } catch (error) {
      console.error("Request access error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });
  app2.get("/api/access/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const magicLink = await storage.getMagicLinkByToken(token);
      if (!magicLink) {
        return res.status(404).json({ message: "Invalid access token" });
      }
      if (/* @__PURE__ */ new Date() > magicLink.expiresAt) {
        return res.status(410).json({ message: "Access token has expired" });
      }
      if (magicLink.isUsed) {
        return res.status(410).json({ message: "Access token has already been used" });
      }
      const video = await storage.getVideo(magicLink.videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }
      await storage.markMagicLinkAsUsed(magicLink.id);
      const accessLog = await storage.createAccessLog({
        magicLinkId: magicLink.id,
        email: magicLink.email,
        videoId: video.id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent")
      });
      res.json({
        video,
        accessLog: {
          id: accessLog.id,
          accessedAt: accessLog.accessedAt,
          email: magicLink.email
        },
        token: magicLink.token
      });
    } catch (error) {
      console.error("Access validation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.patch("/api/access/:accessLogId/progress", async (req, res) => {
    try {
      const { accessLogId } = req.params;
      const updates = updateProgressSchema.parse(req.body);
      await storage.updateAccessLog(accessLogId, updates);
      res.json({ message: "Progress updated successfully" });
    } catch (error) {
      console.error("Progress update error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });
  app2.get("/api/videos/:videoId/analytics", async (req, res) => {
    try {
      const { videoId } = req.params;
      const analytics = await storage.getVideoAnalytics(videoId);
      const accessLogs2 = await storage.getAccessLogsByVideo(videoId);
      res.json({
        analytics,
        recentAccess: accessLogs2.slice(0, 10)
        // Last 10 access logs
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/videos/:videoId", async (req, res) => {
    try {
      const { videoId } = req.params;
      const video = await storage.getVideo(videoId);
      if (!video || !video.isActive) {
        return res.status(404).json({ message: "Video not found" });
      }
      const publicVideoData = {
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl,
        duration: video.duration,
        category: video.category
      };
      res.json(publicVideoData);
    } catch (error) {
      console.error("Get video error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/_debug/db", async (req, res) => {
    try {
      const videos2 = await storage.getAllVideos();
      const users = await storage.getAllAdminUsers();
      const hostname2 = process.env.NEON_DATABASE_URL?.match(/@([^/]+)/)?.[1] || "unknown";
      res.json({
        database: "Neon PostgreSQL",
        hostname: hostname2,
        environment: process.env.NODE_ENV || "unknown",
        tables: {
          videos: videos2.length,
          adminUsers: users.length
        }
      });
    } catch (error) {
      console.error("Database debug error:", error);
      res.status(500).json({ error: "Database check failed", message: error });
    }
  });
  app2.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = adminLoginSchema.parse(req.body);
      const adminUser = await storage.getAdminUserByEmail(email);
      if (!adminUser || !adminUser.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const isValidPassword = await bcrypt.compare(password, adminUser.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      req.session.adminUser = adminUser;
      const { password: _, ...adminWithoutPassword } = adminUser;
      res.json({
        message: "Login successful",
        adminUser: adminWithoutPassword
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });
  app2.post("/api/admin/logout", requireAdmin, async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });
  app2.get("/api/admin/me", requireAdmin, async (req, res) => {
    const { password: _, ...adminWithoutPassword } = req.session.adminUser;
    res.json(adminWithoutPassword);
  });
  app2.get("/api/admin/videos", requireAdmin, async (req, res) => {
    try {
      const adminUser = req.session.adminUser;
      const companyTag = adminUser.role === "SUPER_ADMIN" ? void 0 : adminUser.companyTag || void 0;
      const videos2 = await storage.getAllVideos(companyTag);
      res.json(videos2);
    } catch (error) {
      console.error("Get videos error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/admin/videos", requireAdmin, async (req, res) => {
    try {
      const videoData = insertVideoSchema.parse(req.body);
      const adminUser = req.session.adminUser;
      if (adminUser.role !== "SUPER_ADMIN" && adminUser.companyTag) {
        videoData.companyTag = adminUser.companyTag;
      }
      const video = await storage.createVideo(videoData);
      res.json(video);
    } catch (error) {
      console.error("Create video error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });
  app2.patch("/api/admin/videos/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertVideoSchema.partial().parse(req.body);
      const adminUser = req.session.adminUser;
      const existingVideo = await storage.getVideo(id);
      if (!existingVideo) {
        return res.status(404).json({ message: "Video not found" });
      }
      if (adminUser.role !== "SUPER_ADMIN" && existingVideo.companyTag !== adminUser.companyTag) {
        return res.status(403).json({ message: "Access denied" });
      }
      const video = await storage.updateVideo(id, updates);
      res.json(video);
    } catch (error) {
      console.error("Update video error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });
  app2.delete("/api/admin/videos/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const adminUser = req.session.adminUser;
      const existingVideo = await storage.getVideo(id);
      if (!existingVideo) {
        return res.status(404).json({ message: "Video not found" });
      }
      if (adminUser.role !== "SUPER_ADMIN" && existingVideo.companyTag !== adminUser.companyTag) {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteVideo(id);
      res.json({ message: "Video deleted successfully" });
    } catch (error) {
      console.error("Delete video error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/admin/completions", requireAdmin, async (req, res) => {
    try {
      const adminUser = req.session.adminUser;
      const companyTag = adminUser.role === "SUPER_ADMIN" ? void 0 : adminUser.companyTag || void 0;
      const completions = await storage.getAllAccessLogs(companyTag);
      res.json(completions);
    } catch (error) {
      console.error("Get completions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/admin/users", requireSuperAdmin, async (req, res) => {
    try {
      const users = await storage.getAllAdminUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Get admin users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/admin/users", requireSuperAdmin, async (req, res) => {
    try {
      const userData = adminCreateUserSchema.parse(req.body);
      const existingUser = await storage.getAdminUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = await storage.createAdminUser({
        ...userData,
        password: hashedPassword
      });
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Create admin user error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });
  app2.patch("/api/admin/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = adminCreateUserSchema.partial().parse(req.body);
      if (updates.password) {
        updates.password = await bcrypt.hash(updates.password, 12);
      }
      const user = await storage.updateAdminUser(id, updates);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Update admin user error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });
  app2.delete("/api/admin/users/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAdminUser(id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete admin user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.get("/api/admin/company-tags", requireSuperAdmin, async (req, res) => {
    try {
      const companyTags2 = await storage.getAllCompanyTags();
      res.json(companyTags2);
    } catch (error) {
      console.error("Get company tags error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/admin/company-tags", requireSuperAdmin, async (req, res) => {
    try {
      const companyTagData = insertCompanyTagSchema.parse(req.body);
      const companyTag = await storage.createCompanyTag(companyTagData);
      res.json(companyTag);
    } catch (error) {
      console.error("Create company tag error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });
  app2.patch("/api/admin/company-tags/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertCompanyTagSchema.partial().parse(req.body);
      const companyTag = await storage.updateCompanyTag(id, updates);
      res.json(companyTag);
    } catch (error) {
      console.error("Update company tag error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });
  app2.delete("/api/admin/company-tags/:id", requireSuperAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteCompanyTag(id);
      res.json({ message: "Company tag deleted successfully" });
    } catch (error) {
      console.error("Delete company tag error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/seed", async (req, res) => {
    try {
      const existingVideo = await storage.getActiveVideo();
      if (existingVideo) {
        return res.json({ message: "Video already exists", video: existingVideo });
      }
      const video = await storage.createVideo({
        title: "Workplace Safety Training - Module 3",
        description: "Essential safety protocols and emergency procedures for manufacturing environments. This module covers personal protective equipment, hazard identification, and incident reporting.",
        thumbnailUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=450",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        duration: "12:34",
        category: "Safety Training"
      });
      res.json({ message: "Video seeded successfully", video });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/seed-admin", async (req, res) => {
    try {
      const existingAdmin = await storage.getAdminUserByEmail("admin@tasksafe.au");
      if (existingAdmin) {
        return res.json({ message: "Super admin already exists" });
      }
      const hashedPassword = await bcrypt.hash("admin123", 12);
      const admin = await storage.createAdminUser({
        email: "admin@tasksafe.au",
        password: hashedPassword,
        role: "SUPER_ADMIN",
        companyTag: null
      });
      res.json({
        message: "Super admin created successfully",
        email: admin.email,
        note: "Use email: admin@tasksafe.au, password: admin123 to login"
      });
    } catch (error) {
      console.error("Seed admin error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app2.post("/api/import-data", async (req, res) => {
    try {
      const importData = req.body;
      let importCount = 0;
      if (importData.adminUsers && importData.adminUsers.length > 0) {
        for (const user of importData.adminUsers) {
          try {
            const existingUser = await storage.getAdminUserByEmail(user.email);
            if (!existingUser) {
              await storage.createAdminUser({
                email: user.email,
                password: user.password,
                // Already hashed
                role: user.role,
                companyTag: user.companyTag || null
              });
              importCount++;
            }
          } catch (error) {
            console.log(`Skipping existing admin user: ${user.email}`);
          }
        }
      }
      if (importData.companyTags && importData.companyTags.length > 0) {
        for (const tag of importData.companyTags) {
          try {
            const allTags = await storage.getAllCompanyTags();
            const existingTag = allTags.find((t) => t.name === tag.name);
            if (!existingTag) {
              await storage.createCompanyTag({
                name: tag.name,
                description: tag.description || null
              });
              importCount++;
            }
          } catch (error) {
            console.log(`Skipping existing company tag: ${tag.name}`);
          }
        }
      }
      if (importData.videos && importData.videos.length > 0) {
        for (const video of importData.videos) {
          try {
            const existingVideo = await storage.getVideo(video.id);
            if (!existingVideo) {
              await storage.createVideo({
                title: video.title,
                description: video.description,
                thumbnailUrl: video.thumbnailUrl,
                videoUrl: video.videoUrl,
                duration: video.duration,
                category: video.category,
                companyTag: video.companyTag || null
              });
              importCount++;
            }
          } catch (error) {
            console.log(`Skipping existing video: ${video.title}`);
          }
        }
      }
      if (importData.accessLogs && importData.accessLogs.length > 0) {
        for (const log2 of importData.accessLogs) {
          try {
            const tempMagicLink = await storage.createMagicLink({
              email: log2.email,
              videoId: log2.videoId,
              token: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              expiresAt: new Date(Date.now() - 1e3)
              // Already expired
            });
            await storage.createAccessLog({
              magicLinkId: tempMagicLink.id,
              email: log2.email,
              videoId: log2.videoId,
              watchDuration: log2.watchDuration || 0,
              completionPercentage: log2.completionPercentage || 0,
              ipAddress: log2.ipAddress || "0.0.0.0",
              userAgent: log2.userAgent || "Imported",
              companyTag: log2.companyTag || null
            });
            importCount++;
          } catch (error) {
            console.log(`Error importing access log for ${log2.email}: ${error?.message || error}`);
          }
        }
      }
      res.json({
        message: `Data import completed successfully`,
        imported: importCount,
        note: "All existing data was preserved, only new records were added"
      });
    } catch (error) {
      console.error("Data import error:", error);
      res.status(500).json({ message: "Data import failed", error: error?.message || error });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
function validateEnvironment() {
  const requiredEnvVars = [];
  if (process.env.NODE_ENV === "production") {
    if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === "tasksafe-admin-secret-key-change-in-production") {
      requiredEnvVars.push("SESSION_SECRET must be set to a secure value in production");
    }
    if (!process.env.DATABASE_URL) {
      requiredEnvVars.push("DATABASE_URL is required for database connection");
    }
  }
  if (requiredEnvVars.length > 0) {
    console.error("\u274C Missing required environment variables:");
    requiredEnvVars.forEach((error) => console.error(`   - ${error}`));
    process.exit(1);
  }
}
validateEnvironment();
process.on("uncaughtException", (error) => {
  console.error("\u274C Uncaught Exception:", error);
  console.error("Stack trace:", error.stack);
  if (process.env.NODE_ENV === "production") {
    console.error("Process will exit due to uncaught exception");
    process.exit(1);
  }
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("\u274C Unhandled Rejection at:", promise, "reason:", reason);
  if (process.env.NODE_ENV === "production") {
    console.error("Process will exit due to unhandled rejection");
    process.exit(1);
  }
});
var app = express2();
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
var sessionConfig = {
  secret: process.env.SESSION_SECRET || "tasksafe-admin-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    // Better security for same-site admin access
    maxAge: 24 * 60 * 60 * 1e3
    // 24 hours
  }
};
if (process.env.NODE_ENV === "production") {
  const PgSession = connectPgSimple(session);
  sessionConfig.store = new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: "session",
    createTableIfMissing: true
  });
}
app.use(session(sessionConfig));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`\u274C Request error:`, err);
    res.status(status).json({ message });
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(`\u274C Invalid PORT environment variable: ${process.env.PORT}. Must be a number between 1 and 65535.`);
    process.exit(1);
  }
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`serving on port ${port}`);
  }).on("error", (error) => {
    console.error(`\u274C Failed to start server on port ${port}:`, error.message);
    if (error.code === "EADDRINUSE") {
      console.error(`   Port ${port} is already in use. Please set a different PORT environment variable.`);
    } else if (error.code === "EACCES") {
      console.error(`   Permission denied to bind to port ${port}. Try using a port number above 1024.`);
    }
    process.exit(1);
  });
})();
