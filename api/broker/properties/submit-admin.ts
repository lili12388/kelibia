import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { db } from '../../../server/db.js';
import { properties, propertyMedia, insertPropertySchema } from '../../../shared/schema.js';

// Enable JSON body parsing with larger limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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
  console.log('[ADMIN-SUBMIT-API] Handler invoked:', req.method, req.url);
  console.log('[ADMIN-SUBMIT-API] Has cookies:', !!req.cookies);
  console.log('[ADMIN-SUBMIT-API] Has body:', !!req.body);
  
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    console.log('[ADMIN-SUBMIT-API] Handling OPTIONS');
    return res.status(200).end();
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    if (!checkAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[ADMIN-SUBMIT] Starting admin property submission...');
    
    // Get data from JSON body (frontend will send base64 images)
    const { propertyData, mediaFiles } = req.body;
    
    console.log('[ADMIN-SUBMIT] Validating property data...');
    // Validate and create property directly (admin posts are auto-approved)
    const validatedData = insertPropertySchema.parse({
      ...propertyData,
      submissionId: null, // Admin posts don't have a submission
      publishedAt: new Date(),
    });

    // Insert property directly
    console.log('[ADMIN-SUBMIT] Inserting property...');
    const [property] = await db.insert(properties).values(validatedData).returning();
    console.log('[ADMIN-SUBMIT] Property created:', property.id);

    // Insert media files (already base64 from frontend)
    if (mediaFiles && Array.isArray(mediaFiles) && mediaFiles.length > 0) {
      console.log(`[ADMIN-SUBMIT] Inserting ${mediaFiles.length} media files...`);
      
      for (let i = 0; i < mediaFiles.length; i++) {
        const media = mediaFiles[i];
        await db.insert(propertyMedia).values({
          propertyId: property.id,
          filename: media.filename || `image-${i}`,
          mimeType: media.mimeType || 'image/jpeg',
          url: media.dataUrl, // Already base64 from frontend
          isPrimary: i === 0,
        });
      }
      console.log('[ADMIN-SUBMIT] All media files inserted');
    }

    console.log('[ADMIN-SUBMIT] Admin property submission completed successfully!');
    return res.status(200).json({
      success: true,
      propertyId: property.id,
    });
  } catch (error) {
    console.error('[ADMIN-SUBMIT] Error:', error);
    return res.status(500).json({
      error: 'Failed to submit property',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}
