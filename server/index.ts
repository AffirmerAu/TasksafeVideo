import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Validate required environment variables for production
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
    console.error("❌ Missing required environment variables:");
    requiredEnvVars.forEach(error => console.error(`   - ${error}`));
    process.exit(1);
  }
}

// Validate environment before starting the application
validateEnvironment();

// Global error handling to prevent silent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack trace:', error.stack);
  // In production, we might want to restart the process gracefully
  if (process.env.NODE_ENV === 'production') {
    console.error('Process will exit due to uncaught exception');
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, we might want to restart the process gracefully
  if (process.env.NODE_ENV === 'production') {
    console.error('Process will exit due to unhandled rejection');
    process.exit(1);
  }
});

const app = express();

// Set trust proxy in production for Autoscale compatibility
if (process.env.NODE_ENV === "production") {
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure session middleware with production-safe store
const sessionConfig: any = {
  secret: process.env.SESSION_SECRET || "tasksafe-admin-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: 'lax', // Better security for same-site admin access
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  }
};

// Use PostgreSQL session store in production for persistence and multi-instance compatibility
if (process.env.NODE_ENV === "production") {
  const PgSession = connectPgSimple(session);
  sessionConfig.store = new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: 'session',
    createTableIfMissing: true,
  });
}

app.use(session(sessionConfig));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    // Prevent double-send errors if headers were already sent
    if (res.headersSent) {
      return next(err);
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`❌ Request error:`, err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Validate port number
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(`❌ Invalid PORT environment variable: ${process.env.PORT}. Must be a number between 1 and 65535.`);
    process.exit(1);
  }
  
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  }).on('error', (error: any) => {
    console.error(`❌ Failed to start server on port ${port}:`, error.message);
    if (error.code === 'EADDRINUSE') {
      console.error(`   Port ${port} is already in use. Please set a different PORT environment variable.`);
    } else if (error.code === 'EACCES') {
      console.error(`   Permission denied to bind to port ${port}. Try using a port number above 1024.`);
    }
    process.exit(1);
  });
})();
