import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { db } from '../../../server/db.js';
import { propertySubmissions } from '../../../shared/schema.js';
import { eq, desc } from 'drizzle-orm';

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

    // Get status from URL path: /api/broker/submissions/pending or /api/broker/submissions/approved
    const { status } = req.query;
    
    if (!status || (status !== 'pending' && status !== 'approved' && status !== 'rejected')) {
      return res.status(400).json({ error: 'Invalid status parameter' });
    }

    // Get submissions with media
    const submissions = await db.query.propertySubmissions.findMany({
      where: eq(propertySubmissions.status, status as string),
      with: {
        media: true,
      },
      orderBy: desc(propertySubmissions.createdAt),
    });

    return res.status(200).json(submissions);
  } catch (error) {
    console.error('Get submissions error:', error);
    return res.status(500).json({ error: 'Failed to get submissions' });
  }
}
