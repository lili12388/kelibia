import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { db } from '../../../server/db';
import { visitorLogs } from '../../../shared/schema';
import { sql, gt } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const token = req.cookies?.broker_token;
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    
    let isAuthenticated = false;
    if (token) {
      try {
        const decoded = jwt.verify(token, secret) as { isBroker: boolean };
        isAuthenticated = decoded.isBroker;
      } catch (error) {
        // Token invalid
      }
    }
    
    if (!isAuthenticated) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get active visitors RIGHT NOW (last 6 seconds - heartbeat is every 3 seconds)
    const sixSecondsAgo = new Date(Date.now() - 6 * 1000);
    const activeVisitors = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${visitorLogs.sessionId})::int`,
      })
      .from(visitorLogs)
      .where(gt(visitorLogs.timestamp, sixSecondsAgo));

    return res.status(200).json({
      activeVisitors: activeVisitors[0]?.count || 0,
    });
  } catch (error) {
    console.error('Real-time analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch real-time data' });
  }
}
