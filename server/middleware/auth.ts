import { Request, Response, NextFunction } from "express";

// Simple broker authentication middleware
export function requireBrokerAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && req.session.isBroker) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Broker authentication required.' });
  }
}

// Extend session type
declare module 'express-session' {
  interface SessionData {
    isBroker: boolean;
  }
}
