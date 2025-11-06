import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../../server/db.js';
import { properties } from '../../../shared/schema.js';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get property ID from URL path
    const { id } = req.query;
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid property ID' });
    }

    // Get property with media
    const property = await db.query.properties.findFirst({
      where: eq(properties.id, id),
      with: {
        media: true,
      },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    return res.status(200).json(property);
  } catch (error) {
    console.error('Get property error:', error);
    return res.status(500).json({ error: 'Failed to get property' });
  }
}
