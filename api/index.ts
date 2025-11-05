import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from "express";
import session from "express-session";
import path from "path";

const app = express();

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

// Import routes dynamically to avoid issues
let routesRegistered = false;

async function setupRoutes() {
  if (!routesRegistered) {
    const { registerRoutes } = await import("../server/routes");
    const { analyticsMiddleware } = await import("../server/middleware/analytics");
    
    app.use(analyticsMiddleware);
    await registerRoutes(app);
    
    routesRegistered = true;
  }
}

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Vercel serverless function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  await setupRoutes();
  return app(req as any, res as any);
}
