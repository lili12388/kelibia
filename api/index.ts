import express from "express";
import session from "express-session";
import path from "path";
import { registerRoutes } from "../server/routes";
import { analyticsMiddleware } from "../server/middleware/analytics";

const app = express();

const uploadsPath = path.join(process.cwd(), "public", "uploads");
app.use("/uploads", express.static(uploadsPath));

app.use(session({
  secret: process.env.SESSION_SECRET || "rental-hub-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));

app.use(express.urlencoded({ extended: false }));
app.use(analyticsMiddleware);

// Register all API routes
registerRoutes(app);

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

export default app;
