import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { db } from '../../../../server/db';
import { propertyAnalytics, visitorLogs } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
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

    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid property ID' });
    }

    // Delete property analytics
    await db.delete(propertyAnalytics).where(eq(propertyAnalytics.propertyId, id));
    
    // Delete visitor logs for this property
    await db.delete(visitorLogs).where(eq(visitorLogs.propertyId, id));

    return res.status(200).json({ message: 'Property analytics deleted successfully' });
  } catch (error) {
    console.error('Delete property analytics error:', error);
    return res.status(500).json({ error: 'Failed to delete property analytics' });
  }
}
