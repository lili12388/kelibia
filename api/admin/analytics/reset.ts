import type { VercelRequest, VercelResponse} from '@vercel/node';
import jwt from 'jsonwebtoken';
import { db } from '../../../server/db';
import { siteAnalytics } from '../../../shared/schema';
import { sql } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

    // Reset all statistics (set all counts to 0)
    await db.execute(sql`
      UPDATE ${siteAnalytics} 
      SET 
        total_visitors = 0,
        total_page_views = 0,
        unique_sessions = 0,
        desktop_visitors = 0,
        mobile_visitors = 0
    `);

    return res.status(200).json({ message: 'All statistics reset successfully' });
  } catch (error) {
    console.error('Reset analytics error:', error);
    return res.status(500).json({ error: 'Failed to reset statistics' });
  }
}
