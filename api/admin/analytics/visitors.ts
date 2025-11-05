import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { db } from '../../../server/db';
import { visitorLogs } from '../../../shared/schema';

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

    // Delete all visitor logs
    await db.delete(visitorLogs);

    return res.status(200).json({ message: 'All visitor logs deleted successfully' });
  } catch (error) {
    console.error('Delete visitors error:', error);
    return res.status(500).json({ error: 'Failed to delete visitor logs' });
  }
}
