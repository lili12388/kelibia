import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { db } from '../../../server/db';
import { visitorLogs, propertyAnalytics, siteAnalytics, properties } from '../../../shared/schema';
import { sql, desc, eq, gt } from 'drizzle-orm';

// Authentication helper
function checkAuth(req: VercelRequest): boolean {
  const token = req.cookies?.broker_token;
  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  
  if (!token) return false;
  
  try {
    const decoded = jwt.verify(token, secret) as { isBroker: boolean };
    return decoded.isBroker;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check authentication
    if (!checkAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { endpoint, id } = req.query;

    // GET /api/admin/analytics?endpoint=summary
    if (req.method === 'GET' && endpoint === 'summary') {
      const today = new Date().toISOString().split('T')[0];
      
      const todayStats = await db.query.siteAnalytics.findFirst({
        where: eq(siteAnalytics.date, today),
      });
      
      const totalStats = await db
        .select({
          totalVisitors: sql<number>`COALESCE(SUM(${siteAnalytics.totalVisitors}), 0)::int`,
          totalPageViews: sql<number>`COALESCE(SUM(${siteAnalytics.totalPageViews}), 0)::int`,
        })
        .from(siteAnalytics);
      
      const sixSecondsAgo = new Date(Date.now() - 6 * 1000);
      const activeVisitors = await db
        .select({
          count: sql<number>`COUNT(DISTINCT ${visitorLogs.sessionId})::int`,
        })
        .from(visitorLogs)
        .where(gt(visitorLogs.timestamp, sixSecondsAgo));
      
      const topPropertiesData = await db
        .select()
        .from(propertyAnalytics)
        .orderBy(desc(propertyAnalytics.totalViews))
        .limit(10);
      
      const topPropertiesWithDetails = await Promise.all(
        topPropertiesData.map(async (analytics) => {
          const property = await db.query.properties.findFirst({
            where: eq(properties.id, analytics.propertyId),
            columns: { id: true, title: true },
          });
          return {
            propertyId: analytics.propertyId,
            title: property?.title || `Property ${analytics.propertyId.substring(0, 8)}`,
            totalViews: analytics.totalViews || 0,
            totalClicks: analytics.totalClicks || 0,
            desktopViews: analytics.desktopViews || 0,
            mobileViews: analytics.mobileViews || 0,
            lastViewedAt: analytics.lastViewedAt?.toISOString() || new Date().toISOString(),
          };
        })
      );

      return res.status(200).json({
        totalVisitors: totalStats[0]?.totalVisitors || 0,
        totalPageViews: totalStats[0]?.totalPageViews || 0,
        todayVisitors: todayStats?.totalVisitors || 0,
        todayPageViews: todayStats?.totalPageViews || 0,
        activeVisitors: activeVisitors[0]?.count || 0,
        topProperties: topPropertiesWithDetails,
      });
    }

    // GET /api/admin/analytics?endpoint=real-time
    if (req.method === 'GET' && endpoint === 'real-time') {
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
    }

    // DELETE /api/admin/analytics?endpoint=visitors
    if (req.method === 'DELETE' && endpoint === 'visitors') {
      await db.delete(visitorLogs);
      return res.status(200).json({ message: 'All visitor logs deleted' });
    }

    // POST /api/admin/analytics?endpoint=reset
    if (req.method === 'POST' && endpoint === 'reset') {
      await db.execute(sql`
        UPDATE ${siteAnalytics} 
        SET 
          total_visitors = 0,
          total_page_views = 0,
          unique_sessions = 0,
          desktop_visitors = 0,
          mobile_visitors = 0
      `);
      return res.status(200).json({ message: 'Statistics reset' });
    }

    // DELETE /api/admin/analytics?endpoint=property&id=xxx
    if (req.method === 'DELETE' && endpoint === 'property' && id) {
      await db.delete(propertyAnalytics).where(eq(propertyAnalytics.propertyId, id as string));
      await db.delete(visitorLogs).where(eq(visitorLogs.propertyId, id as string));
      return res.status(200).json({ message: 'Property analytics deleted' });
    }

    return res.status(400).json({ error: 'Invalid endpoint' });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
