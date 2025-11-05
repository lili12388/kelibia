import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Express } from "express";
import session from "express-session";
import path from "path";

let app: Express | null = null;

async function getApp() {
  if (app) {
    return app;
  }

  app = express();

  // Note: File uploads and sessions may have limitations in serverless environment
  const uploadsPath = path.join(process.cwd(), "public", "uploads");
  app.use("/uploads", express.static(uploadsPath));

  app.use(session({
    secret: process.env.SESSION_SECRET || "rental-hub-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Import and setup routes
  const { registerRoutes } = await import("../server/routes");
  const { analyticsMiddleware } = await import("../server/middleware/analytics");
  
  app.use(analyticsMiddleware);
  await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  return app;
}

// Vercel serverless function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressApp = await getApp();
  
  // Handle the request with Express
  return new Promise((resolve, reject) => {
    expressApp(req as any, res as any, (err?: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });
}
