import { Request, Response, NextFunction } from "express";
import { db } from "../db.js";
import { visitorLogs, propertyAnalytics, siteAnalytics } from "../../shared/schema.js";
import { sql, eq } from "drizzle-orm";

// Extend Express Request to include our custom properties
declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
    }
  }
}

// Track contact click
export async function trackContactClick(propertyId: string, sessionId?: string) {
  try {
    if (sessionId) {
      // Update the most recent visitor log for this session and property
      await db.execute(sql`
        UPDATE visitor_logs
        SET contact_clicked = true
        WHERE session_id = ${sessionId}
          AND property_id = ${propertyId}
          AND id = (
            SELECT id FROM visitor_logs
            WHERE session_id = ${sessionId} AND property_id = ${propertyId}
            ORDER BY timestamp DESC
            LIMIT 1
          )
      `);
    }

    // Increment total clicks in property analytics
    await db.update(propertyAnalytics)
      .set({
        totalClicks: sql`${propertyAnalytics.totalClicks} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(propertyAnalytics.propertyId, propertyId));
  } catch (error) {
    console.error("Error tracking contact click:", error);
  }
}
