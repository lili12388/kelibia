import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { db } from '../../../../server/db';
import { propertySubmissions } from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';

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

    // Get submission ID from URL path
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid submission ID' });
    }

    // Get the submission
    const submission = await db.query.propertySubmissions.findFirst({
      where: and(
        eq(propertySubmissions.id, id),
        eq(propertySubmissions.status, 'pending')
      ),
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found or already processed' });
    }

    // Update submission status to rejected
    await db.update(propertySubmissions)
      .set({ status: 'rejected' })
      .where(eq(propertySubmissions.id, id));

    return res.status(200).json({
      message: 'Property submission rejected',
    });
  } catch (error) {
    console.error('Reject submission error:', error);
    return res.status(500).json({ error: 'Failed to reject submission' });
  }
}
