import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Express } from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import path from "path";

let app: Express | null = null;

async function getApp() {
  if (app) {
    return app;
  }

  app = express();

  // Disable x-powered-by header
  app.disable('x-powered-by');

  // Note: File uploads and sessions may have limitations in serverless environment
  const uploadsPath = path.join(process.cwd(), "public", "uploads");
  app.use("/uploads", express.static(uploadsPath));

  // Cookie parser for JWT tokens
  app.use(cookieParser());

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

  // IMPORTANT: Parse body for serverless
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: false, limit: '50mb' }));

  // Import and setup routes
  const { registerRoutes } = await import("../server/routes.js");
  const { analyticsMiddleware } = await import("../server/middleware/analytics.js");
  
  app.use(analyticsMiddleware);
  await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error('Express error:', err);
    res.status(status).json({ message });
  });

  return app;
}

// Vercel serverless function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[CATCH-ALL] Request:', req.method, req.url);
  try {
    const expressApp = await getApp();
    console.log('[CATCH-ALL] Express app loaded successfully');
    
    // Set CORS headers for API requests
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    // Handle the request with Express
    return new Promise((resolve, reject) => {
      expressApp(req as any, res as any, (err?: any) => {
        if (err) {
          console.error('Express handler error:', err);
          reject(err);
        } else {
          resolve(undefined);
        }
      });
    });
  } catch (error) {
    console.error('[CATCH-ALL] Serverless function error:', error);
    console.error('[CATCH-ALL] Error stack:', error instanceof Error ? error.stack : 'No stack');
    res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
  }
}
