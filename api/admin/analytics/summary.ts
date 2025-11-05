import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { db } from '../../../server/db';
import { visitorLogs, propertyAnalytics, siteAnalytics, properties } from '../../../shared/schema';
import { sql, desc, eq, gt } from 'drizzle-orm';

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

    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's site analytics
    const todayStats = await db.query.siteAnalytics.findFirst({
      where: eq(siteAnalytics.date, today),
    });
    
    // Get total visitors (sum of all days)
    const totalStats = await db
      .select({
        totalVisitors: sql<number>`COALESCE(SUM(${siteAnalytics.totalVisitors}), 0)::int`,
        totalPageViews: sql<number>`COALESCE(SUM(${siteAnalytics.totalPageViews}), 0)::int`,
      })
      .from(siteAnalytics);
    
    // Get active visitors RIGHT NOW (last 6 seconds)
    const sixSecondsAgo = new Date(Date.now() - 6 * 1000);
    const activeVisitors = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${visitorLogs.sessionId})::int`,
      })
      .from(visitorLogs)
      .where(gt(visitorLogs.timestamp, sixSecondsAgo));
    
    // Get top 10 most viewed properties
    const topPropertiesData = await db
      .select()
      .from(propertyAnalytics)
      .orderBy(desc(propertyAnalytics.totalViews))
      .limit(10);
    
    // Fetch property details for top properties
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
  } catch (error) {
    console.error('Analytics summary error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
}
