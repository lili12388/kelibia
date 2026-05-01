import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Simple broker authentication middleware
export function requireBrokerAuth(req: Request, res: Response, next: NextFunction) {
  // Check JWT token first (for serverless compatibility)
  const token = req.cookies?.broker_token;
  const secret = process.env.JWT_SECRET;
  
  if (token && secret) {
    try {
      const decoded = jwt.verify(token, secret) as { isBroker: boolean };
      if (decoded.isBroker) {
        next();
        return;
      }
    } catch (error) {
      // Token invalid or expired, fall through to session check
    }
  }
  
  // Fall back to session check
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
