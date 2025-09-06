import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendEmail, generateMagicLinkEmail } from "./services/email";
import { requestAccessSchema, updateProgressSchema } from "@shared/schema";
import { randomBytes } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Request access via email
  app.post("/api/request-access", async (req: Request, res: Response) => {
    try {
      const { email } = requestAccessSchema.parse(req.body);
      
      // Get the active video (for demo, we'll use the first active video)
      const video = await storage.getActiveVideo();
      if (!video) {
        return res.status(404).json({ message: "No training video available" });
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

  // Seed initial video (for demo purposes)
  app.post("/api/seed", async (req: Request, res: Response) => {
    try {
      const existingVideo = await storage.getActiveVideo();
      if (existingVideo) {
        return res.json({ message: "Video already exists", video: existingVideo });
      }

      const video = await storage.createVideo({
        title: "Use of Aircraft Wheel Chocks and Safety Cones",
        description: "This video demonstrates the safe use of aircraft wheel chocks and the correct positioning of safety cones around aircraft.",
        thumbnailUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=450",
        videoUrl: "https://vimeo.com/887830582/45ac7f1f05",
        duration: "8:45",
        category: "Aircraft Safety Training",
      });

      res.json({ message: "Video seeded successfully", video });

    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
