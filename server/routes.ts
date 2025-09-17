import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendEmail, generateMagicLinkEmail } from "./services/email";
import { requestAccessSchema, updateProgressSchema, adminLoginSchema, adminCreateUserSchema, insertVideoSchema, insertCompanyTagSchema } from "@shared/schema";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import type { AdminUser } from "@shared/schema";

// Extend Express Session to include admin
declare module 'express-session' {
  interface SessionData {
    adminUser?: AdminUser;
  }
}

// Admin authentication middleware
function requireAdmin(req: Request, res: Response, next: Function) {
  if (!req.session.adminUser) {
    return res.status(401).json({ message: "Admin authentication required" });
  }
  next();
}

function requireSuperAdmin(req: Request, res: Response, next: Function) {
  if (!req.session.adminUser || req.session.adminUser.role !== "SUPER_ADMIN") {
    return res.status(403).json({ message: "Super admin access required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Request access via email
  app.post("/api/request-access", async (req: Request, res: Response) => {
    try {
      const { email, videoId } = requestAccessSchema.parse(req.body);
      
      // Get specific video if videoId provided, otherwise get active video
      const video = videoId 
        ? await storage.getVideo(videoId)
        : await storage.getActiveVideo();
        
      if (!video || !video.isActive) {
        return res.status(404).json({ message: "Training video not found or not available" });
      }

      // Generate magic link token
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create magic link
      const magicLink = await storage.createMagicLink({
        token,
        email,
        videoId: video.id,
        expiresAt,
      });

      // Send email
      const emailParams = generateMagicLinkEmail(email, token, video.title);
      const emailSent = await sendEmail(emailParams);

      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send email" });
      }

      res.json({ 
        message: "Magic link sent successfully",
        email: email
      });

    } catch (error) {
      console.error("Request access error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Validate magic link and get video access
  app.get("/api/access/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      const magicLink = await storage.getMagicLinkByToken(token);
      if (!magicLink) {
        return res.status(404).json({ message: "Invalid access token" });
      }

      // Check if expired
      if (new Date() > magicLink.expiresAt) {
        return res.status(410).json({ message: "Access token has expired" });
      }

      // Check if already used
      if (magicLink.isUsed) {
        return res.status(410).json({ message: "Access token has already been used" });
      }

      // Get video
      const video = await storage.getVideo(magicLink.videoId);
      if (!video) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Mark magic link as used
      await storage.markMagicLinkAsUsed(magicLink.id);

      // Create access log
      const accessLog = await storage.createAccessLog({
        magicLinkId: magicLink.id,
        email: magicLink.email,
        videoId: video.id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        video,
        accessLog: {
          id: accessLog.id,
          accessedAt: accessLog.accessedAt,
          email: magicLink.email,
        },
        token: magicLink.token
      });

    } catch (error) {
      console.error("Access validation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get access log details by ID for completion page
  app.get("/api/access-logs/:accessLogId", async (req: Request, res: Response) => {
    try {
      const { accessLogId } = req.params;
      
      const accessLog = await storage.getAccessLogById(accessLogId);
      if (!accessLog) {
        return res.status(404).json({ message: "Access log not found" });
      }

      res.json(accessLog);

    } catch (error) {
      console.error("Get access log error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update viewing progress
  app.patch("/api/access/:accessLogId/progress", async (req: Request, res: Response) => {
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

  // Get video analytics
  app.get("/api/videos/:videoId/analytics", async (req: Request, res: Response) => {
    try {
      const { videoId } = req.params;

      const analytics = await storage.getVideoAnalytics(videoId);
      const accessLogs = await storage.getAccessLogsByVideo(videoId);

      res.json({
        analytics,
        recentAccess: accessLogs.slice(0, 10) // Last 10 access logs
      });

    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get individual video by ID (public endpoint for share URLs)
  app.get("/api/videos/:videoId", async (req: Request, res: Response) => {
    try {
      const { videoId } = req.params;

      const video = await storage.getVideo(videoId);
      if (!video || !video.isActive) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Return basic video info (excluding sensitive data)
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

  // ===== ADMIN ROUTES =====

  // Debug endpoint (temporary) - to diagnose deployment database connection
  app.get("/api/_debug/db", async (req: Request, res: Response) => {
    try {
      const videos = await storage.getAllVideos();
      const users = await storage.getAllAdminUsers();
      const hostname = process.env.NEON_DATABASE_URL?.match(/@([^/]+)/)?.[1] || 'unknown';
      
      res.json({
        database: 'Neon PostgreSQL',
        hostname: hostname,
        environment: process.env.NODE_ENV || 'unknown',
        tables: {
          videos: videos.length,
          adminUsers: users.length
        }
      });
    } catch (error) {
      console.error("Database debug error:", error);
      res.status(500).json({ error: 'Database check failed', message: error });
    }
  });
  
  // Admin login
  app.post("/api/admin/login", async (req: Request, res: Response) => {
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

      // Store admin user in session
      req.session.adminUser = adminUser;

      // Don't return password
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

  // Admin logout
  app.post("/api/admin/logout", requireAdmin, async (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Get current admin user
  app.get("/api/admin/me", requireAdmin, async (req: Request, res: Response) => {
    const { password: _, ...adminWithoutPassword } = req.session.adminUser!;
    res.json(adminWithoutPassword);
  });

  // Get all videos (admin)
  app.get("/api/admin/videos", requireAdmin, async (req: Request, res: Response) => {
    try {
      const adminUser = req.session.adminUser!;
      const companyTag = adminUser.role === "SUPER_ADMIN" ? undefined : adminUser.companyTag || undefined;
      
      const videos = await storage.getAllVideos(companyTag);
      res.json(videos);

    } catch (error) {
      console.error("Get videos error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create video (admin)
  app.post("/api/admin/videos", requireAdmin, async (req: Request, res: Response) => {
    try {
      const videoData = insertVideoSchema.parse(req.body);
      const adminUser = req.session.adminUser!;
      
      // If admin is not super admin, assign their company tag
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

  // Update video (admin)
  app.patch("/api/admin/videos/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = insertVideoSchema.partial().parse(req.body);
      const adminUser = req.session.adminUser!;

      // Check if admin has access to this video
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

  // Delete video (admin)
  app.delete("/api/admin/videos/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminUser = req.session.adminUser!;

      // Check if admin has access to this video
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

  // Get completion logs (admin)
  app.get("/api/admin/completions", requireAdmin, async (req: Request, res: Response) => {
    try {
      const adminUser = req.session.adminUser!;
      const companyTag = adminUser.role === "SUPER_ADMIN" ? undefined : adminUser.companyTag || undefined;
      
      const completions = await storage.getAllAccessLogs(companyTag);
      res.json(completions);

    } catch (error) {
      console.error("Get completions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all admin users (super admin only)
  app.get("/api/admin/users", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllAdminUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);

    } catch (error) {
      console.error("Get admin users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create admin user (super admin only)
  app.post("/api/admin/users", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const userData = adminCreateUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getAdminUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const user = await storage.createAdminUser({
        ...userData,
        password: hashedPassword,
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);

    } catch (error) {
      console.error("Create admin user error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Update admin user (super admin only)
  app.patch("/api/admin/users/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = adminCreateUserSchema.partial().parse(req.body);
      
      // Hash password if provided
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

  // Delete admin user (super admin only)
  app.delete("/api/admin/users/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteAdminUser(id);
      res.json({ message: "User deleted successfully" });

    } catch (error) {
      console.error("Delete admin user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all company tags (super admin only)
  app.get("/api/admin/company-tags", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const companyTags = await storage.getAllCompanyTags();
      res.json(companyTags);

    } catch (error) {
      console.error("Get company tags error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create company tag (super admin only)
  app.post("/api/admin/company-tags", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const companyTagData = insertCompanyTagSchema.parse(req.body);
      const companyTag = await storage.createCompanyTag(companyTagData);
      res.json(companyTag);

    } catch (error) {
      console.error("Create company tag error:", error);
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // Update company tag (super admin only)
  app.patch("/api/admin/company-tags/:id", requireSuperAdmin, async (req: Request, res: Response) => {
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

  // Delete company tag (super admin only)
  app.delete("/api/admin/company-tags/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteCompanyTag(id);
      res.json({ message: "Company tag deleted successfully" });

    } catch (error) {
      console.error("Delete company tag error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Seed initial video (for demo purposes)
  app.post("/api/seed", async (req: Request, res: Response) => {
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
        category: "Safety Training",
      });

      res.json({ message: "Video seeded successfully", video });

    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Seed super admin (for demo purposes - remove in production)
  app.post("/api/seed-admin", async (req: Request, res: Response) => {
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
        companyTag: null,
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

  // Data import endpoint for transferring data to deployed database
  app.post("/api/import-data", async (req: Request, res: Response) => {
    try {
      const importData = req.body;
      let importCount = 0;

      // Import admin users
      if (importData.adminUsers && importData.adminUsers.length > 0) {
        for (const user of importData.adminUsers) {
          try {
            const existingUser = await storage.getAdminUserByEmail(user.email);
            if (!existingUser) {
              await storage.createAdminUser({
                email: user.email,
                password: user.password, // Already hashed
                role: user.role,
                companyTag: user.companyTag || null,
              });
              importCount++;
            }
          } catch (error) {
            console.log(`Skipping existing admin user: ${user.email}`);
          }
        }
      }

      // Import company tags
      if (importData.companyTags && importData.companyTags.length > 0) {
        for (const tag of importData.companyTags) {
          try {
            const allTags = await storage.getAllCompanyTags();
            const existingTag = allTags.find(t => t.name === tag.name);
            if (!existingTag) {
              await storage.createCompanyTag({
                name: tag.name,
                description: tag.description || null,
              });
              importCount++;
            }
          } catch (error) {
            console.log(`Skipping existing company tag: ${tag.name}`);
          }
        }
      }

      // Import videos
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
                companyTag: video.companyTag || null,
              });
              importCount++;
            }
          } catch (error) {
            console.log(`Skipping existing video: ${video.title}`);
          }
        }
      }

      // Import access logs (completions)
      if (importData.accessLogs && importData.accessLogs.length > 0) {
        for (const log of importData.accessLogs) {
          try {
            // Create a temporary magic link first (needed for foreign key)
            const tempMagicLink = await storage.createMagicLink({
              email: log.email,
              videoId: log.videoId,
              token: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              expiresAt: new Date(Date.now() - 1000), // Already expired
            });

            // Create the access log
            await storage.createAccessLog({
              magicLinkId: tempMagicLink.id,
              email: log.email,
              videoId: log.videoId,
              watchDuration: log.watchDuration || 0,
              completionPercentage: log.completionPercentage || 0,
              ipAddress: log.ipAddress || "0.0.0.0",
              userAgent: log.userAgent || "Imported",
              companyTag: log.companyTag || null,
            });
            importCount++;
          } catch (error: any) {
            console.log(`Error importing access log for ${log.email}: ${error?.message || error}`);
          }
        }
      }

      res.json({ 
        message: `Data import completed successfully`,
        imported: importCount,
        note: "All existing data was preserved, only new records were added"
      });

    } catch (error: any) {
      console.error("Data import error:", error);
      res.status(500).json({ message: "Data import failed", error: error?.message || error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
