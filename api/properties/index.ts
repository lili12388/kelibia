import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../server/db';
import { properties } from '../../shared/schema';
import { desc } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all published properties with media
    const allProperties = await db.query.properties.findMany({
      with: {
        media: true,
      },
      orderBy: desc(properties.publishedAt),
    });

    return res.status(200).json(allProperties);
  } catch (error) {
    console.error('Get properties error:', error);
    return res.status(500).json({ error: 'Failed to get properties' });
  }
}
