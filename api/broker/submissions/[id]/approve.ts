import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { db } from '../../../../server/db.js';
import { propertySubmissions, properties, submissionMedia, propertyMedia } from '../../../../shared/schema.js';
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

    // Get the submission with media
    const submission = await db.query.propertySubmissions.findFirst({
      where: and(
        eq(propertySubmissions.id, id),
        eq(propertySubmissions.status, 'pending')
      ),
      with: {
        media: true,
      },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found or already processed' });
    }

    // Create property from submission
    const [property] = await db.insert(properties).values({
      submissionId: submission.id,
      title: submission.title,
      propertyType: submission.propertyType,
      floorLevel: submission.floorLevel,
      isFurnished: submission.isFurnished,
      hasLivingRoom: submission.hasLivingRoom,
      hasFridge: submission.hasFridge,
      hasGasStove: submission.hasGasStove,
      description: submission.description,
      rooms: submission.rooms,
      bathrooms: submission.bathrooms,
      sizeM2: submission.sizeM2,
      location: submission.location,
      googleMapsUrl: submission.googleMapsUrl,
      price: submission.price,
      requiresDeposit: submission.requiresDeposit,
      neighborhoodMapUrl: submission.neighborhoodMapUrl,
      showOwnerContact: submission.showOwnerContact,
      showGoogleMaps: submission.showGoogleMaps,
      showExactLocation: submission.showExactLocation,
      showNeighborhoodMap: submission.showNeighborhoodMap,
      showPrice: submission.showPrice,
      showRooms: submission.showRooms,
      showBathrooms: submission.showBathrooms,
      showSize: submission.showSize,
      showDescription: submission.showDescription,
      showDeposit: submission.showDeposit,
    }).returning();

    // Copy media to property
    if (submission.media && submission.media.length > 0) {
      await db.insert(propertyMedia).values(
        submission.media.map((media: any) => ({
          propertyId: property.id,
          filename: media.filename,
          mimeType: media.mimeType,
          url: media.url,
          isPrimary: media.isPrimary,
        }))
      );
    }

    // Update submission status
    await db.update(propertySubmissions)
      .set({ status: 'approved', approvedAt: new Date() })
      .where(eq(propertySubmissions.id, id));

    return res.status(200).json({
      message: 'Property approved and published',
      property,
    });
  } catch (error) {
    console.error('Approve submission error:', error);
    return res.status(500).json({ error: 'Failed to approve submission' });
  }
}
